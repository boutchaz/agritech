import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateLeaveApplicationDto, RejectLeaveApplicationDto } from './dto';

@Injectable()
export class LeaveApplicationsService {
  constructor(private readonly db: DatabaseService) {}

  async list(
    organizationId: string,
    filters: { worker_id?: string; status?: string; from?: string; to?: string },
  ) {
    const supabase = this.db.getAdminClient();
    let query = supabase
      .from('leave_applications')
      .select(
        `*, worker:workers(id, first_name, last_name, cin, user_id), leave_type:leave_types(id, name)`,
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (filters.worker_id) query = query.eq('worker_id', filters.worker_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.from) query = query.gte('to_date', filters.from);
    if (filters.to) query = query.lte('from_date', filters.to);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  /**
   * Apply for leave. If userId is provided and the worker is linked to that
   * auth user (workers.user_id), it counts as a self-service application.
   * Otherwise the caller must have manage permission on LEAVE_APPLICATION
   * (enforced at controller level).
   */
  async create(
    organizationId: string,
    userId: string | null,
    dto: CreateLeaveApplicationDto,
  ) {
    const supabase = this.db.getAdminClient();

    const { data: worker, error: werr } = await supabase
      .from('workers')
      .select('id, user_id, organization_id')
      .eq('id', dto.worker_id)
      .eq('organization_id', organizationId)
      .single();
    if (werr || !worker) throw new NotFoundException('Worker not found');

    if (dto.from_date > dto.to_date) {
      throw new BadRequestException('from_date must be on or before to_date');
    }
    if ((dto.half_day ?? false) && dto.from_date !== dto.to_date) {
      throw new BadRequestException('Half-day leave must be a single date');
    }

    const totalDays = computeTotalDays(dto.from_date, dto.to_date, dto.half_day ?? false);
    const isBlockDay = await this.overlapsBlockDate(organizationId, dto.from_date, dto.to_date);
    if (isBlockDay) {
      throw new BadRequestException(
        'Leave dates overlap a blackout period; contact admin to override',
      );
    }

    // Reject if worker already has a pending or approved leave overlapping
    // this range — duplicate / over-counted leave once approved.
    const { data: overlap, error: overlapErr } = await supabase
      .from('leave_applications')
      .select('id, from_date, to_date, status')
      .eq('organization_id', organizationId)
      .eq('worker_id', dto.worker_id)
      .in('status', ['pending', 'approved'])
      .lte('from_date', dto.to_date)
      .gte('to_date', dto.from_date)
      .limit(1);
    if (overlapErr) throw new BadRequestException(overlapErr.message);
    if ((overlap?.length ?? 0) > 0) {
      throw new BadRequestException(
        `Worker already has a ${overlap![0].status} leave overlapping ${overlap![0].from_date}..${overlap![0].to_date}`,
      );
    }

    // Reject if total_days exceed remaining allocation across covering periods.
    const remaining = await this.remainingAllocation(
      organizationId,
      dto.worker_id,
      dto.leave_type_id,
      dto.from_date,
      dto.to_date,
    );
    if (remaining !== null && totalDays > remaining + 1e-6) {
      throw new BadRequestException(
        `Insufficient leave balance: requesting ${totalDays} day(s), ${remaining} remaining`,
      );
    }

    const { data, error } = await supabase
      .from('leave_applications')
      .insert({
        organization_id: organizationId,
        worker_id: dto.worker_id,
        leave_type_id: dto.leave_type_id,
        from_date: dto.from_date,
        to_date: dto.to_date,
        total_days: totalDays,
        half_day: dto.half_day ?? false,
        half_day_period: dto.half_day_period ?? null,
        reason: dto.reason,
        attachment_urls: dto.attachment_urls ?? null,
        is_block_day: isBlockDay,
        created_by: userId,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async approve(
    organizationId: string,
    userId: string | null,
    applicationId: string,
  ) {
    const application = await this.getOne(organizationId, applicationId);
    if (application.status !== 'pending')
      throw new BadRequestException(`Cannot approve application in status ${application.status}`);

    // Atomicity: both the status flip and the leave-balance update must commit
    // together or not at all. Using executeInPgTransaction ensures a single
    // PG transaction wraps both, so a failure mid-flow leaves the application
    // pending AND the allocations untouched.
    const data = await this.db.executeInPgTransaction(async (pg) => {
      const now = new Date().toISOString();
      const updateRes = await pg.query(
        `UPDATE leave_applications
         SET status = 'approved', approved_by = $1, approved_at = $2, updated_at = $2
         WHERE id = $3 AND organization_id = $4
         RETURNING *`,
        [userId, now, applicationId, organizationId],
      );
      if (updateRes.rowCount === 0) {
        throw new BadRequestException('Failed to approve leave application');
      }

      await this.distributeAllocationUsedDaysPg(pg, {
        organizationId,
        workerId: application.worker_id,
        leaveTypeId: application.leave_type_id,
        fromDate: application.from_date,
        toDate: application.to_date,
        delta: Number(application.total_days),
        halfDay: application.half_day ?? false,
      });

      return updateRes.rows[0];
    });

    return data;
  }

  async reject(
    organizationId: string,
    userId: string | null,
    applicationId: string,
    dto: RejectLeaveApplicationDto,
  ) {
    const application = await this.getOne(organizationId, applicationId);
    if (application.status !== 'pending')
      throw new BadRequestException(`Cannot reject application in status ${application.status}`);

    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_applications')
      .update({
        status: 'rejected',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        rejection_reason: dto.rejection_reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /**
   * Cancel: an applicant may cancel their own pending application; admins
   * may cancel any. Caller's user_id must match worker.user_id when not admin.
   */
  async cancel(
    organizationId: string,
    userId: string | null,
    applicationId: string,
    isAdmin: boolean,
  ) {
    const application = await this.getOne(organizationId, applicationId);
    if (!['pending', 'approved'].includes(application.status))
      throw new BadRequestException(`Cannot cancel application in status ${application.status}`);

    if (!isAdmin) {
      const supabase = this.db.getAdminClient();
      const { data: worker } = await supabase
        .from('workers')
        .select('user_id')
        .eq('id', application.worker_id)
        .single();
      if (!worker || worker.user_id !== userId) {
        throw new ForbiddenException('You can only cancel your own application');
      }
    }

    // Atomicity: refund balance + flip status to cancelled in one PG tx.
    // If only the refund had run before, a failure on status update would
    // leave used_days reduced AND the application still marked approved,
    // letting the same window be re-approved or refunded twice.
    const data = await this.db.executeInPgTransaction(async (pg) => {
      if (application.status === 'approved') {
        await this.distributeAllocationUsedDaysPg(pg, {
          organizationId,
          workerId: application.worker_id,
          leaveTypeId: application.leave_type_id,
          fromDate: application.from_date,
          toDate: application.to_date,
          delta: -Number(application.total_days),
          halfDay: application.half_day ?? false,
        });
      }

      const updateRes = await pg.query(
        `UPDATE leave_applications
         SET status = 'cancelled', updated_at = $1
         WHERE id = $2 AND organization_id = $3
         RETURNING *`,
        [new Date().toISOString(), applicationId, organizationId],
      );
      if (updateRes.rowCount === 0) {
        throw new BadRequestException('Failed to cancel leave application');
      }
      return updateRes.rows[0];
    });
    return data;
  }

  async getOne(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_applications')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();
    if (error || !data) throw new NotFoundException('Leave application not found');
    return data;
  }

  /**
   * Calendar view: all approved applications overlapping [from, to].
   */
  async calendar(organizationId: string, from: string, to: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_applications')
      .select(
        `id, worker_id, leave_type_id, from_date, to_date, total_days, status,
         worker:workers(id, first_name, last_name),
         leave_type:leave_types(id, name)`,
      )
      .eq('organization_id', organizationId)
      .eq('status', 'approved')
      .lte('from_date', to)
      .gte('to_date', from);
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  private async overlapsBlockDate(organizationId: string, from: string, to: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_block_dates')
      .select('id')
      .eq('organization_id', organizationId)
      .gte('block_date', from)
      .lte('block_date', to)
      .limit(1);
    if (error) return false;
    return (data?.length ?? 0) > 0;
  }

  /**
   * Distribute a leave's total_days across every allocation period that
   * overlaps the leave range. Each allocation is incremented by the number
   * of leave days that fall inside its period (half-day handled). `delta`
   * sign drives both apply (+) and refund (-).
   */
  /**
   * pg/tx-bound version of distributeAllocationUsedDays. Locks the relevant
   * leave_allocations rows FOR UPDATE so two concurrent approvals on
   * overlapping windows can't double-spend the balance.
   */
  private async distributeAllocationUsedDaysPg(
    pg: import('pg').PoolClient,
    params: {
      organizationId: string;
      workerId: string;
      leaveTypeId: string;
      fromDate: string;
      toDate: string;
      delta: number;
      halfDay: boolean;
    },
  ) {
    const { organizationId, workerId, leaveTypeId, fromDate, toDate, delta, halfDay } = params;
    if (delta === 0) return;
    const allocsRes = await pg.query(
      `SELECT id, used_days, period_start, period_end
         FROM leave_allocations
        WHERE organization_id = $1
          AND worker_id = $2
          AND leave_type_id = $3
          AND period_start <= $4
          AND period_end >= $5
        FOR UPDATE`,
      [organizationId, workerId, leaveTypeId, toDate, fromDate],
    );
    const allocs = allocsRes.rows;
    if (allocs.length === 0) return;

    const sign = delta < 0 ? -1 : 1;
    for (const alloc of allocs) {
      const overlap = countDateOverlap(
        fromDate,
        toDate,
        alloc.period_start instanceof Date
          ? alloc.period_start.toISOString().slice(0, 10)
          : alloc.period_start,
        alloc.period_end instanceof Date
          ? alloc.period_end.toISOString().slice(0, 10)
          : alloc.period_end,
      );
      if (overlap <= 0) continue;
      const portion = halfDay && fromDate === toDate ? 0.5 : overlap;
      const newUsed = Math.max(0, Number(alloc.used_days) + sign * portion);
      await pg.query(
        `UPDATE leave_allocations
            SET used_days = $1, updated_at = $2
          WHERE id = $3`,
        [newUsed, new Date().toISOString(), alloc.id],
      );
    }
  }

  private async remainingAllocation(
    organizationId: string,
    workerId: string,
    leaveTypeId: string,
    fromDate: string,
    toDate: string,
  ): Promise<number | null> {
    const supabase = this.db.getAdminClient();
    const { data: allocs } = await supabase
      .from('leave_allocations')
      .select('remaining_days, period_start, period_end')
      .eq('organization_id', organizationId)
      .eq('worker_id', workerId)
      .eq('leave_type_id', leaveTypeId)
      .lte('period_start', toDate)
      .gte('period_end', fromDate);
    if (!allocs?.length) return null;
    return allocs.reduce((sum, a) => sum + Number(a.remaining_days ?? 0), 0);
  }
}

function computeTotalDays(from: string, to: string, halfDay: boolean): number {
  const start = new Date(from);
  const end = new Date(to);
  const ms = end.getTime() - start.getTime();
  const days = Math.floor(ms / 86_400_000) + 1;
  if (halfDay && days === 1) return 0.5;
  return days;
}

function countDateOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): number {
  const start = aFrom > bFrom ? aFrom : bFrom;
  const end = aTo < bTo ? aTo : bTo;
  if (start > end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}
