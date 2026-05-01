import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  BulkEnrollDto,
  CreateEnrollmentDto,
  CreateGrievanceDto,
  CreateTrainingProgramDto,
  UpdateEnrollmentDto,
  UpdateGrievanceDto,
  UpdateTrainingProgramDto,
} from './dto';

@Injectable()
export class HrAdvancedService {
  constructor(private readonly db: DatabaseService) {}

  // ── Grievances ────────────────────────────────────────────────
  async listGrievances(
    orgId: string,
    filters: { status?: string; priority?: string; grievance_type?: string },
  ) {
    const supabase = this.db.getAdminClient();
    let q = supabase
      .from('grievances')
      .select('*, raised_by:workers!grievances_raised_by_worker_id_fkey(id, first_name, last_name), against:workers!grievances_against_worker_id_fkey(id, first_name, last_name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.priority) q = q.eq('priority', filters.priority);
    if (filters.grievance_type) q = q.eq('grievance_type', filters.grievance_type);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createGrievance(orgId: string, dto: CreateGrievanceDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('grievances')
      .insert({ organization_id: orgId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateGrievance(orgId: string, id: string, userId: string | null, dto: UpdateGrievanceDto) {
    const supabase = this.db.getAdminClient();
    const patch: Record<string, unknown> = { ...dto, updated_at: new Date().toISOString() };
    if (dto.status === 'resolved' || dto.status === 'closed') {
      patch.resolved_by = userId;
      patch.resolution_date = dto.resolution_date ?? new Date().toISOString().slice(0, 10);
    }
    const { data, error } = await supabase
      .from('grievances')
      .update(patch)
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException();
    return data;
  }

  // ── Training Programs ─────────────────────────────────────────
  async listPrograms(orgId: string, includeInactive = false) {
    const supabase = this.db.getAdminClient();
    let q = supabase
      .from('training_programs')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');
    if (!includeInactive) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createProgram(orgId: string, dto: CreateTrainingProgramDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('training_programs')
      .insert({ organization_id: orgId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateProgram(orgId: string, id: string, dto: UpdateTrainingProgramDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('training_programs')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException();
    return data;
  }

  async deleteProgram(orgId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('training_programs')
      .delete()
      .eq('organization_id', orgId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  // ── Enrollments ───────────────────────────────────────────────
  async listEnrollments(
    orgId: string,
    filters: { program_id?: string; worker_id?: string; status?: string },
  ) {
    const supabase = this.db.getAdminClient();
    let q = supabase
      .from('training_enrollments')
      .select('*, worker:workers(id, first_name, last_name), program:training_programs(id, name, training_type)')
      .eq('organization_id', orgId)
      .order('enrolled_date', { ascending: false });
    if (filters.program_id) q = q.eq('program_id', filters.program_id);
    if (filters.worker_id) q = q.eq('worker_id', filters.worker_id);
    if (filters.status) q = q.eq('status', filters.status);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createEnrollment(orgId: string, dto: CreateEnrollmentDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('training_enrollments')
      .insert({ organization_id: orgId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async bulkEnroll(orgId: string, dto: BulkEnrollDto) {
    const supabase = this.db.getAdminClient();
    const rows = dto.worker_ids.map((worker_id) => ({
      organization_id: orgId,
      program_id: dto.program_id,
      worker_id,
      enrolled_date: dto.enrolled_date,
    }));
    const { data, error } = await supabase
      .from('training_enrollments')
      .upsert(rows, { onConflict: 'program_id,worker_id', ignoreDuplicates: true })
      .select('*');
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async updateEnrollment(orgId: string, id: string, dto: UpdateEnrollmentDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('training_enrollments')
      .update(dto)
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException();
    return data;
  }

  // ── Analytics Views ───────────────────────────────────────────
  async workforceSummary(orgId: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('workforce_summary')
      .select('*')
      .eq('organization_id', orgId);
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async leaveBalanceSummary(orgId: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('leave_balance_summary')
      .select('*')
      .eq('organization_id', orgId);
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }
}
