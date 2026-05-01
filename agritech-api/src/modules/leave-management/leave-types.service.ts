import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto';

@Injectable()
export class LeaveTypesService {
  constructor(private readonly db: DatabaseService) {}

  async list(organizationId: string, includeInactive = false) {
    const supabase = this.db.getAdminClient();
    let query = supabase
      .from('leave_types')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
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
