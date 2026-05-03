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
    filters: {
      status?: string;
      priority?: string;
      grievance_type?: string;
      raised_by_worker_id?: string;
    },
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
    if (filters.raised_by_worker_id) q = q.eq('raised_by_worker_id', filters.raised_by_worker_id);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    // Strip raiser identity on anonymous grievances (defence-in-depth — RLS
    // already controls access but admins listing should still not see name).
    return (data ?? []).map((g: any) =>
      g.is_anonymous ? { ...g, raised_by: null, raised_by_worker_id: null } : g,
    );
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
    await this.assertProgramAndWorkersInOrg(orgId, dto.program_id, [dto.worker_id]);
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
    await this.assertProgramAndWorkersInOrg(orgId, dto.program_id, dto.worker_ids);
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

  /**
   * Verify both the program_id and every worker_id belong to the current org
   * before any enrollment write. The bare insert/upsert below only stamps
   * organization_id; without this guard a foreign program_id (or a foreign
   * worker_id mixed into bulk enroll) would be persisted with this org's
   * organization_id, scrambling membership.
   */
  private async assertProgramAndWorkersInOrg(
    orgId: string,
    programId: string,
    workerIds: string[],
  ): Promise<void> {
    const supabase = this.db.getAdminClient();
    const uniqueWorkerIds = Array.from(new Set(workerIds));

    const [{ data: program }, { data: workers }] = await Promise.all([
      supabase
        .from('training_programs')
        .select('id')
        .eq('id', programId)
        .eq('organization_id', orgId)
        .maybeSingle(),
      supabase
        .from('workers')
        .select('id')
        .in('id', uniqueWorkerIds)
        .eq('organization_id', orgId),
    ]);

    if (!program) {
      throw new BadRequestException(
        `Training program ${programId} does not belong to this organization`,
      );
    }

    const foundIds = new Set((workers ?? []).map((w) => w.id));
    const missing = uniqueWorkerIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Workers do not belong to this organization: ${missing.join(', ')}`,
      );
    }
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

  // ── Self-Service Summary ──────────────────────────────────────
  async meSummary(orgId: string, workerId: string | null, orgRole: string | null) {
    const supabase = this.db.getAdminClient();
    if (!workerId) {
      return {
        worker: null,
        org_role: orgRole,
        leave_balances: [],
        pending_leave: 0,
        latest_slip: null,
        pending_expense_claims: 0,
        expiring_qualifications: [],
        active_appraisal: null,
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const in30Str = in30.toISOString().slice(0, 10);

    const [
      worker,
      balances,
      leaves,
      slip,
      claims,
      quals,
      appraisal,
    ] = await Promise.all([
      // Every read scopes by both worker_id AND organization_id. Without the
      // org filter a worker invited into a second org could read salary slips,
      // leave balances, and qualifications from their *other* employer by
      // hitting /organizations/:other-org/hr/me with their original workerId.
      supabase
        .from('workers')
        .select('id, first_name, last_name, cin, worker_type, farm_id, is_active, hire_date, monthly_salary, daily_rate, is_cnss_declared')
        .eq('id', workerId)
        .eq('organization_id', orgId)
        .maybeSingle(),
      supabase
        .from('leave_balance_summary')
        .select('*')
        .eq('worker_id', workerId)
        .eq('organization_id', orgId),
      supabase
        .from('leave_applications')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', workerId)
        .eq('organization_id', orgId)
        .eq('status', 'pending'),
      supabase
        .from('salary_slips')
        .select('*')
        .eq('worker_id', workerId)
        .eq('organization_id', orgId)
        .order('pay_period_end', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('expense_claims')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', workerId)
        .eq('organization_id', orgId)
        .in('status', ['pending', 'partially_approved']),
      supabase
        .from('worker_qualifications')
        .select('id, qualification_name, qualification_type, expiry_date, is_valid')
        .eq('worker_id', workerId)
        .eq('organization_id', orgId)
        .lte('expiry_date', in30Str)
        .gte('expiry_date', today)
        .order('expiry_date', { ascending: true }),
      supabase
        .from('appraisals')
        .select('*, cycle:appraisal_cycles(id, name, status, end_date)')
        .eq('worker_id', workerId)
        .eq('organization_id', orgId)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // If the worker doesn't belong to this org, return an empty summary —
    // not just empty fields with stale relation reads.
    if (!worker.data) {
      return {
        worker: null,
        org_role: orgRole,
        leave_balances: [],
        pending_leave: 0,
        latest_slip: null,
        pending_expense_claims: 0,
        expiring_qualifications: [],
        active_appraisal: null,
      };
    }

    return {
      worker: worker.data ?? null,
      org_role: orgRole,
      leave_balances: balances.data ?? [],
      pending_leave: leaves.count ?? 0,
      latest_slip: slip.data ?? null,
      pending_expense_claims: claims.count ?? 0,
      expiring_qualifications: quals.data ?? [],
      active_appraisal: appraisal.data ?? null,
    };
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
