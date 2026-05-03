import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateOnboardingTemplateDto,
  CreateSeparationDto,
  StartOnboardingDto,
  UpdateFnfDto,
  UpdateOnboardingRecordDto,
  UpdateOnboardingTemplateDto,
  UpdateSeparationDto,
} from './dto';

@Injectable()
export class EmployeeLifecycleService {
  constructor(private readonly db: DatabaseService) {}

  // ── Onboarding Templates ──────────────────────────────────────

  async listTemplates(orgId: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('onboarding_templates')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createTemplate(orgId: string, dto: CreateOnboardingTemplateDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('onboarding_templates')
      .insert({ organization_id: orgId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateTemplate(orgId: string, id: string, dto: UpdateOnboardingTemplateDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('onboarding_templates')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new NotFoundException('Onboarding template not found');
    return data;
  }

  async deleteTemplate(orgId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('onboarding_templates')
      .delete()
      .eq('organization_id', orgId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  // ── Onboarding Records ────────────────────────────────────────

  async listRecords(
    orgId: string,
    filters: { worker_id?: string; status?: string },
  ) {
    const supabase = this.db.getAdminClient();
    let query = supabase
      .from('onboarding_records')
      .select(
        `*, worker:workers(id, first_name, last_name),
         template:onboarding_templates(id, name)`,
      )
      .eq('organization_id', orgId)
      .order('started_at', { ascending: false });
    if (filters.worker_id) query = query.eq('worker_id', filters.worker_id);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async start(orgId: string, userId: string | null, dto: StartOnboardingDto) {
    const supabase = this.db.getAdminClient();
    // Copy template activities to the record so per-record progress is independent.
    const { data: tmpl } = await supabase
      .from('onboarding_templates')
      .select('id, organization_id, activities')
      .eq('id', dto.template_id)
      .eq('organization_id', orgId)
      .maybeSingle();
    if (!tmpl) throw new NotFoundException('Template not found');
    const activities = (tmpl.activities as any[] | null) ?? [];
    const seeded = activities.map((a) => ({
      ...a,
      status: 'pending',
      completed_date: null,
    }));
    const { data, error } = await supabase
      .from('onboarding_records')
      .insert({
        organization_id: orgId,
        worker_id: dto.worker_id,
        template_id: dto.template_id,
        activities: seeded,
        created_by: userId,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateRecord(orgId: string, id: string, dto: UpdateOnboardingRecordDto) {
    const supabase = this.db.getAdminClient();
    const update: Record<string, unknown> = {
      ...dto,
      updated_at: new Date().toISOString(),
    };
    if (dto.status === 'completed') {
      update.completed_at = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from('onboarding_records')
      .update(update)
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new NotFoundException('Onboarding record not found');
    return data;
  }

  // ── Separations ───────────────────────────────────────────────

  async listSeparations(
    orgId: string,
    filters: { status?: string; worker_id?: string },
  ) {
    const supabase = this.db.getAdminClient();
    let query = supabase
      .from('separations')
      .select(
        `*, worker:workers(id, first_name, last_name, hire_date)`,
      )
      .eq('organization_id', orgId)
      .order('relieving_date', { ascending: false });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.worker_id) query = query.eq('worker_id', filters.worker_id);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async getSeparation(orgId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('separations')
      .select(
        `*, worker:workers(id, first_name, last_name, hire_date, monthly_salary)`,
      )
      .eq('organization_id', orgId)
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Separation not found');
    return data;
  }

  async createSeparation(orgId: string, userId: string | null, dto: CreateSeparationDto) {
    const supabase = this.db.getAdminClient();
    // Verify the worker belongs to this org before creating a separation that
    // could later be promoted to "relieved" and used to deactivate them.
    const { data: worker } = await supabase
      .from('workers')
      .select('id')
      .eq('id', dto.worker_id)
      .eq('organization_id', orgId)
      .maybeSingle();
    if (!worker) {
      throw new BadRequestException(`Worker ${dto.worker_id} does not belong to this organization`);
    }

    const { data, error } = await supabase
      .from('separations')
      .insert({ organization_id: orgId, created_by: userId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateSeparation(orgId: string, id: string, dto: UpdateSeparationDto) {
    const supabase = this.db.getAdminClient();
    const update: Record<string, unknown> = {
      ...dto,
      updated_at: new Date().toISOString(),
    };
    if (dto.status === 'relieved') {
      // Mark worker inactive when relieved (admin can override later).
      const { data: sep } = await supabase
        .from('separations')
        .select('worker_id')
        .eq('id', id)
        .eq('organization_id', orgId)
        .maybeSingle();
      if (sep) {
        // Scope the worker mutation by organization. Without this guard a
        // separation row planted with a foreign worker_id (defense in depth
        // beyond createSeparation's check) could deactivate another org's
        // worker by id alone.
        await supabase
          .from('workers')
          .update({ is_active: false, status: 'terminated', end_date: new Date().toISOString().slice(0, 10) })
          .eq('id', sep.worker_id)
          .eq('organization_id', orgId);
      }
    }
    const { data, error } = await supabase
      .from('separations')
      .update(update)
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new NotFoundException('Separation not found');
    return data;
  }

  async updateFnf(orgId: string, id: string, dto: UpdateFnfDto) {
    const supabase = this.db.getAdminClient();
    const update: Record<string, unknown> = {
      ...dto,
      updated_at: new Date().toISOString(),
    };
    if (dto.fnf_total_payable !== undefined || dto.fnf_total_receivable !== undefined) {
      const sep = await this.getSeparation(orgId, id);
      const payable = dto.fnf_total_payable ?? Number(sep.fnf_total_payable);
      const receivable = dto.fnf_total_receivable ?? Number(sep.fnf_total_receivable);
      update.fnf_net_amount = payable - receivable;
    }
    if (dto.fnf_status === 'settled') {
      update.fnf_settled_at = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from('separations')
      .update(update)
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new NotFoundException('Separation not found');
    return data;
  }
}
