import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { BulkAllocateDto, CreateLeaveAllocationDto } from './dto';
import {
  paginatedResponse,
  type PaginatedResponse,
} from '../../common/dto/paginated-query.dto';

@Injectable()
export class LeaveAllocationsService {
  constructor(private readonly db: DatabaseService) {}

  async list(
    organizationId: string,
    filters: {
      worker_id?: string;
      leave_type_id?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<PaginatedResponse<any>> {
    const supabase = this.db.getAdminClient();
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(filters.pageSize) || 100));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const apply = (q: any) => {
      q = q.eq('organization_id', organizationId);
      if (filters.worker_id) q = q.eq('worker_id', filters.worker_id);
      if (filters.leave_type_id) q = q.eq('leave_type_id', filters.leave_type_id);
      return q;
    };

    const { count } = await apply(
      supabase.from('leave_allocations').select('id', { count: 'exact', head: true }),
    );

    const { data, error } = await apply(
      supabase
        .from('leave_allocations')
        .select(
          `*, worker:workers(id, first_name, last_name, cin), leave_type:leave_types(id, name)`,
        ),
    )
      .order('period_start', { ascending: false })
      .range(from, to);
    if (error) throw new BadRequestException(error.message);
    return paginatedResponse(data ?? [], count ?? 0, page, pageSize);
  }

  async forWorker(organizationId: string, workerId: string) {
    return this.list(organizationId, { worker_id: workerId });
  }

  async create(
    organizationId: string,
    userId: string | null,
    dto: CreateLeaveAllocationDto,
  ) {
    await this.assertWorkerInOrg(organizationId, dto.worker_id);
    await this.assertLeaveTypeInOrg(organizationId, dto.leave_type_id);

    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_allocations')
      .insert({
        organization_id: organizationId,
        worker_id: dto.worker_id,
        leave_type_id: dto.leave_type_id,
        total_days: dto.total_days,
        carry_forwarded_days: dto.carry_forwarded_days ?? 0,
        period_start: dto.period_start,
        period_end: dto.period_end,
        created_by: userId,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async bulkCreate(
    organizationId: string,
    userId: string | null,
    dto: BulkAllocateDto,
  ) {
    await this.assertLeaveTypeInOrg(organizationId, dto.leave_type_id);
    const supabase = this.db.getAdminClient();
    const rows = dto.worker_ids.map((wid) => ({
      organization_id: organizationId,
      worker_id: wid,
      leave_type_id: dto.leave_type_id,
      total_days: dto.total_days,
      period_start: dto.period_start,
      period_end: dto.period_end,
      created_by: userId,
    }));
    const { data, error } = await supabase
      .from('leave_allocations')
      .upsert(rows, { onConflict: 'worker_id,leave_type_id,period_start' })
      .select('*');
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  private async assertWorkerInOrg(organizationId: string, workerId: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Worker not found in organization');
  }

  private async assertLeaveTypeInOrg(organizationId: string, leaveTypeId: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_types')
      .select('id')
      .eq('id', leaveTypeId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Leave type not found in organization');
  }
}
