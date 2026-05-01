import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateAppraisalCycleDto,
  CreateAppraisalDto,
  CreateFeedbackDto,
  UpdateAppraisalCycleDto,
  UpdateAppraisalDto,
} from './dto';

@Injectable()
export class PerformanceService {
  constructor(private readonly db: DatabaseService) {}

  // ── Cycles ────────────────────────────────────────────────────
  async listCycles(orgId: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('appraisal_cycles')
      .select('*')
      .eq('organization_id', orgId)
      .order('start_date', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createCycle(orgId: string, userId: string | null, dto: CreateAppraisalCycleDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('appraisal_cycles')
      .insert({ organization_id: orgId, created_by: userId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateCycle(orgId: string, id: string, dto: UpdateAppraisalCycleDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('appraisal_cycles')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException();
    return data;
  }

  async deleteCycle(orgId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('appraisal_cycles')
      .delete()
      .eq('organization_id', orgId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  // ── Appraisals ────────────────────────────────────────────────
  async listAppraisals(orgId: string, filters: { cycle_id?: string; worker_id?: string; status?: string }) {
    const supabase = this.db.getAdminClient();
    let q = supabase
      .from('appraisals')
      .select('*, worker:workers!appraisals_worker_id_fkey(id, first_name, last_name), manager:workers!appraisals_manager_id_fkey(id, first_name, last_name), cycle:appraisal_cycles(id, name, status)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (filters.cycle_id) q = q.eq('cycle_id', filters.cycle_id);
    if (filters.worker_id) q = q.eq('worker_id', filters.worker_id);
    if (filters.status) q = q.eq('status', filters.status);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createAppraisal(orgId: string, dto: CreateAppraisalDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('appraisals')
      .insert({ organization_id: orgId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateAppraisal(orgId: string, id: string, dto: UpdateAppraisalDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('appraisals')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException();
    return data;
  }

  async bulkCreateForCycle(orgId: string, cycleId: string, workerIds: string[]) {
    const supabase = this.db.getAdminClient();
    const rows = workerIds.map((worker_id) => ({
      organization_id: orgId,
      worker_id,
      cycle_id: cycleId,
    }));
    const { data, error } = await supabase
      .from('appraisals')
      .upsert(rows, { onConflict: 'worker_id,cycle_id', ignoreDuplicates: true })
      .select('*');
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  // ── Feedback ──────────────────────────────────────────────────
  async listFeedback(orgId: string, workerId?: string) {
    const supabase = this.db.getAdminClient();
    let q = supabase
      .from('performance_feedback')
      .select('*, reviewer:workers!performance_feedback_reviewer_id_fkey(id, first_name, last_name), worker:workers!performance_feedback_worker_id_fkey(id, first_name, last_name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (workerId) q = q.eq('worker_id', workerId);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createFeedback(orgId: string, dto: CreateFeedbackDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('performance_feedback')
      .insert({ organization_id: orgId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
