import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto';
import {
  paginatedResponse,
  type PaginatedResponse,
} from '../../common/dto/paginated-query.dto';

@Injectable()
export class LeaveTypesService {
  constructor(private readonly db: DatabaseService) {}

  async list(
    organizationId: string,
    includeInactive = false,
    pagination: { page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<any>> {
    const supabase = this.db.getAdminClient();
    const page = Math.max(1, Number(pagination.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(pagination.pageSize) || 100));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const apply = (q: any) => {
      q = q.eq('organization_id', organizationId);
      if (!includeInactive) q = q.eq('is_active', true);
      return q;
    };

    const { count } = await apply(
      supabase.from('leave_types').select('id', { count: 'exact', head: true }),
    );

    const { data, error } = await apply(supabase.from('leave_types').select('*'))
      .order('name')
      .range(from, to);
    if (error) throw new BadRequestException(error.message);
    return paginatedResponse(data ?? [], count ?? 0, page, pageSize);
  }

  async getOne(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException(error.message);
    return data;
  }

  async create(organizationId: string, dto: CreateLeaveTypeDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_types')
      .insert({ organization_id: organizationId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(organizationId: string, id: string, dto: UpdateLeaveTypeDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_types')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Leave type not found');
    return data;
  }

  /** Soft-disable: flip is_active=false rather than hard-delete (preserve history). */
  async deactivate(organizationId: string, id: string) {
    return this.update(organizationId, id, { is_active: false } as UpdateLeaveTypeDto);
  }
}
