import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CreateLeaveEncashmentDto } from './dto';
import {
  paginatedResponse,
  type PaginatedResponse,
} from '../../common/dto/paginated-query.dto';

const roundCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class LeaveEncashmentsService {
  private readonly logger = new Logger(LeaveEncashmentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async list(
    organizationId: string,
    filters: {
      worker_id?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<PaginatedResponse<any>> {
    const supabase = this.db.getAdminClient();
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(filters.pageSize) || 100));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const apply = (q: any) => {
      q = q.eq('organization_id', organizationId);
      if (filters.worker_id) q = q.eq('worker_id', filters.worker_id);
      if (filters.status) q = q.eq('status', filters.status);
      return q;
    };

    const { count } = await apply(
      supabase.from('leave_encashments').select('id', { count: 'exact', head: true }),
    );

    const { data, error } = await apply(
      supabase
        .from('leave_encashments')
        .select(
          `*, worker:workers(id, first_name, last_name, cin, user_id),
         leave_type:leave_types(id, name),
         leave_allocation:leave_allocations(id, period_start, period_end)`,
        ),
    )
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw new BadRequestException(error.message);
    return paginatedResponse(data ?? [], count ?? 0, page, pageSize);
  }

  async create(
    organizationId: string,
    userId: string | null,
    dto: CreateLeaveEncashmentDto,
  ) {
    if (dto.days_encashed <= 0) {
      throw new BadRequestException('days_encashed must be positive');
    }
    if (dto.amount_per_day < 0) {
      throw new BadRequestException('amount_per_day must be non-negative');
    }

    const totalAmount = roundCurrency(dto.days_encashed * dto.amount_per_day);

    const encashment = await this.db.executeInPgTransaction(async (pg) => {
      const allocRes = await pg.query(
        `SELECT id, remaining_days, used_days, encashed_days, total_days, worker_id
           FROM leave_allocations
          WHERE id = $1 AND organization_id = $2
          FOR UPDATE`,
        [dto.leave_allocation_id, organizationId],
      );
      if (allocRes.rowCount === 0) {
        throw new NotFoundException('Leave allocation not found');
      }
      const alloc = allocRes.rows[0];

      if (alloc.worker_id !== dto.worker_id) {
        throw new BadRequestException('Allocation does not belong to this worker');
      }

      const remaining = Number(alloc.remaining_days) - Number(alloc.encashed_days);
      if (dto.days_encashed > remaining + 1e-6) {
        throw new BadRequestException(
          `Insufficient balance: requesting ${dto.days_encashed} day(s), ${remaining.toFixed(2)} encashable`,
        );
      }

      const insertRes = await pg.query(
        `INSERT INTO leave_encashments
           (organization_id, worker_id, leave_type_id, leave_allocation_id,
            days_encashed, amount_per_day, total_amount, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)
         RETURNING *`,
        [
          organizationId,
          dto.worker_id,
          dto.leave_type_id,
          dto.leave_allocation_id,
          dto.days_encashed,
          dto.amount_per_day,
          totalAmount,
          userId,
        ],
      );

      await pg.query(
        `UPDATE leave_allocations
            SET encashed_days = encashed_days + $1, updated_at = NOW()
          WHERE id = $2 AND organization_id = $3`,
        [dto.days_encashed, dto.leave_allocation_id, organizationId],
      );

      return insertRes.rows[0];
    });

    this.notifyWorker(dto.worker_id, organizationId, {
      title: 'Leave Encashment Created',
      body: `${dto.days_encashed} day(s) encashed — ${totalAmount} MAD`,
      type: 'leave_encashment',
      entity_id: encashment.id,
    });

    return encashment;
  }

  async approve(
    organizationId: string,
    userId: string | null,
    encashmentId: string,
  ) {
    const encashment = await this.getOne(organizationId, encashmentId);
    if (encashment.status !== 'pending') {
      throw new BadRequestException(`Cannot approve encashment in status ${encashment.status}`);
    }

    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_encashments')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', encashmentId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);

    this.notifyWorker(encashment.worker_id, organizationId, {
      title: 'Leave Encashment Approved',
      body: `${encashment.days_encashed} day(s) — ${encashment.total_amount} MAD approved`,
      type: 'leave_encashment',
      entity_id: encashmentId,
    });

    return data;
  }

  async markPaid(organizationId: string, encashmentId: string) {
    const encashment = await this.getOne(organizationId, encashmentId);
    if (encashment.status !== 'approved') {
      throw new BadRequestException('Only approved encashments can be marked as paid');
    }

    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_encashments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', encashmentId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async cancel(
    organizationId: string,
    userId: string | null,
    encashmentId: string,
    userRole: string,
  ) {
    const encashment = await this.getOne(organizationId, encashmentId);

    if (encashment.status === 'approved' || encashment.status === 'paid') {
      if (!['organization_admin', 'system_admin'].includes(userRole)) {
        throw new ForbiddenException('Only admins can reverse an approved encashment');
      }
    }

    if (encashment.status === 'cancelled') {
      throw new BadRequestException('Encashment is already cancelled');
    }

    await this.db.executeInPgTransaction(async (pg) => {
      await pg.query(
        `UPDATE leave_encashments
            SET status = 'cancelled'
          WHERE id = $1 AND organization_id = $2`,
        [encashmentId, organizationId],
      );

      if (encashment.status === 'pending' || encashment.status === 'approved') {
        await pg.query(
          `UPDATE leave_allocations
              SET encashed_days = GREATEST(0, encashed_days - $1), updated_at = NOW()
            WHERE id = $2 AND organization_id = $3`,
          [encashment.days_encashed, encashment.leave_allocation_id, organizationId],
        );
      }
    });

    this.notifyWorker(encashment.worker_id, organizationId, {
      title: 'Leave Encashment Cancelled',
      body: `${encashment.days_encashed} day(s) encashment cancelled`,
      type: 'leave_encashment',
      entity_id: encashmentId,
    });
  }

  private async getOne(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_encashments')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();
    if (error || !data) throw new NotFoundException('Leave encashment not found');
    return data;
  }

  private notifyWorker(
    workerId: string,
    organizationId: string,
    payload: { title: string; body: string; type: string; entity_id: string },
  ) {
    (async () => {
      try {
        const supabase = this.db.getAdminClient();
        const { data } = await supabase
          .from('workers')
          .select('user_id')
          .eq('id', workerId)
          .single();
        if (data?.user_id) {
          this.gateway.sendToUser(data.user_id, payload, organizationId);
        }
      } catch {}
    })();
  }
}
