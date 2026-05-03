import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateLeaveBlockDateDto, UpdateLeaveBlockDateDto } from './dto';
import {
  paginatedResponse,
  type PaginatedResponse,
} from '../../common/dto/paginated-query.dto';

@Injectable()
export class LeaveBlockDatesService {
  constructor(private readonly db: DatabaseService) {}

  async list(
    organizationId: string,
    filters: {
      from?: string;
      to?: string;
      leave_type_id?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<PaginatedResponse<any>> {
    const supabase = this.db.getAdminClient();
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(filters.pageSize) || 100));
    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    const apply = (q: any) => {
      q = q.eq('organization_id', organizationId);
      if (filters.from) q = q.gte('block_date', filters.from);
      if (filters.to) q = q.lte('block_date', filters.to);
      if (filters.leave_type_id) q = q.eq('leave_type_id', filters.leave_type_id);
      return q;
    };

    const { count } = await apply(
      supabase.from('leave_block_dates').select('id', { count: 'exact', head: true }),
    );

    const { data, error } = await apply(
      supabase.from('leave_block_dates').select('*, leave_type:leave_types(id, name)'),
    )
      .order('block_date', { ascending: false })
      .range(fromIdx, toIdx);
    if (error) throw new BadRequestException(error.message);
    return paginatedResponse(data ?? [], count ?? 0, page, pageSize);
  }

  async create(organizationId: string, userId: string | null, dto: CreateLeaveBlockDateDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_block_dates')
      .insert({
        organization_id: organizationId,
        block_date: dto.block_date,
        reason: dto.reason,
        leave_type_id: dto.leave_type_id ?? null,
        created_by: userId,
      })
      .select('*, leave_type:leave_types(id, name)')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(organizationId: string, id: string, dto: UpdateLeaveBlockDateDto) {
    const supabase = this.db.getAdminClient();
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dto.block_date !== undefined) row.block_date = dto.block_date;
    if (dto.reason !== undefined) row.reason = dto.reason;
    if (dto.leave_type_id !== undefined) row.leave_type_id = dto.leave_type_id;

    const { data, error } = await supabase
      .from('leave_block_dates')
      .update(row)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*, leave_type:leave_types(id, name)')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Leave block date not found');
    return data;
  }

  async remove(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('leave_block_dates')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);
    if (error) throw new BadRequestException(error.message);
  }

  async overlapsBlockDate(organizationId: string, from: string, to: string): Promise<boolean> {
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
}
