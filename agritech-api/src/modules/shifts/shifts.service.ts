import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateShiftAssignmentDto,
  CreateShiftDto,
  CreateShiftRequestDto,
  ResolveShiftRequestDto,
  UpdateShiftDto,
} from './dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly db: DatabaseService) {}

  // ── Shifts ─────────────────────────────────────────────────────

  async list(organizationId: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('start_time');
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async create(organizationId: string, dto: CreateShiftDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('shifts')
      .insert({ organization_id: organizationId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(organizationId: string, id: string, dto: UpdateShiftDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('shifts')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Shift not found');
    return data;
  }

  async remove(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  // ── Assignments ───────────────────────────────────────────────

  async listAssignments(
    organizationId: string,
    filters: { worker_id?: string; shift_id?: string; status?: 'active' | 'inactive' },
  ) {
    const supabase = this.db.getAdminClient();
    let query = supabase
      .from('shift_assignments')
      .select(
        `*, worker:workers(id, first_name, last_name), shift:shifts(id, name, start_time, end_time, color)`,
      )
      .eq('organization_id', organizationId)
      .order('effective_from', { ascending: false });
    if (filters.worker_id) query = query.eq('worker_id', filters.worker_id);
    if (filters.shift_id) query = query.eq('shift_id', filters.shift_id);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createAssignment(
    organizationId: string,
    userId: string | null,
    dto: CreateShiftAssignmentDto,
  ) {
    const supabase = this.db.getAdminClient();
    // Close any open assignment for this worker that starts before the new one.
    const { data: prev } = await supabase
      .from('shift_assignments')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('worker_id', dto.worker_id)
      .is('effective_to', null)
      .lt('effective_from', dto.effective_from)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev) {
      const close = new Date(dto.effective_from);
      close.setDate(close.getDate() - 1);
      await supabase
        .from('shift_assignments')
        .update({ effective_to: close.toISOString().slice(0, 10) })
        .eq('id', prev.id);
    }
    const { data, error } = await supabase
      .from('shift_assignments')
      .insert({ organization_id: organizationId, assigned_by: userId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deactivateAssignment(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('shift_assignments')
      .update({ status: 'inactive', effective_to: new Date().toISOString().slice(0, 10) })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new NotFoundException('Shift assignment not found');
    return data;
  }

  // ── Requests ──────────────────────────────────────────────────

  async listRequests(
    organizationId: string,
    filters: { worker_id?: string; status?: 'pending' | 'approved' | 'rejected' },
  ) {
    const supabase = this.db.getAdminClient();
    let query = supabase
      .from('shift_requests')
      .select(
        `*, worker:workers(id, first_name, last_name),
         requested_shift:shifts!shift_requests_requested_shift_id_fkey(id, name),
         current_shift:shifts!shift_requests_current_shift_id_fkey(id, name)`,
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (filters.worker_id) query = query.eq('worker_id', filters.worker_id);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createRequest(organizationId: string, dto: CreateShiftRequestDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('shift_requests')
      .insert({ organization_id: organizationId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async resolveRequest(
    organizationId: string,
    userId: string | null,
    id: string,
    dto: ResolveShiftRequestDto,
  ) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('shift_requests')
      .update({
        status: dto.status,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new NotFoundException('Shift request not found');
    return data;
  }
}
