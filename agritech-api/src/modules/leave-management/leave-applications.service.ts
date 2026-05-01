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

    const totalDays = computeTotalDays(dto.from_date, dto.to_date, dto.half_day ?? false);
    const isBlockDay = await this.overlapsBlockDate(organizationId, dto.from_date, dto.to_date);

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

    // Increment used_days on the matching allocation (best-effort; allocation
    // may not exist yet — in that case approval still proceeds and admin
    // is expected to allocate retroactively).
    await this.adjustAllocationUsedDays(
      organizationId,
      application.worker_id,
      application.leave_type_id,
      application.from_date,
      Number(application.total_days),
    );

    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_applications')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
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

    if (application.status === 'approved') {
      // Refund used_days
      await this.adjustAllocationUsedDays(
        organizationId,
        application.worker_id,
        application.leave_type_id,
        application.from_date,
        -Number(application.total_days),
      );
    }

    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_applications')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
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

  private async adjustAllocationUsedDays(
    organizationId: string,
    workerId: string,
    leaveTypeId: string,
    onDate: string,
    delta: number,
  ) {
    const supabase = this.db.getAdminClient();
    const { data: alloc } = await supabase
      .from('leave_allocations')
      .select('id, used_days')
      .eq('organization_id', organizationId)
      .eq('worker_id', workerId)
      .eq('leave_type_id', leaveTypeId)
      .lte('period_start', onDate)
      .gte('period_end', onDate)
      .maybeSingle();
    if (!alloc) return;
    await supabase
      .from('leave_allocations')
      .update({
        used_days: Math.max(0, Number(alloc.used_days) + delta),
        updated_at: new Date().toISOString(),
      })
      .eq('id', alloc.id);
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
