import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateSafetyIncidentDto,
  CreateSeasonalCampaignDto,
  CreateWorkerQualificationDto,
  CreateWorkerTransportDto,
  UpdateSafetyIncidentDto,
  UpdateSeasonalCampaignDto,
  UpdateWorkerQualificationDto,
  UpdateWorkerTransportDto,
} from './dto';

@Injectable()
export class AgroHrService {
  constructor(private readonly db: DatabaseService) {}

  // ── Seasonal Campaigns ─────────────────────────────────────────

  async listCampaigns(
    organizationId: string,
    filters: { farm_id?: string; status?: string; season_type?: string },
  ) {
    const supabase = this.db.getAdminClient();
    let q = supabase
      .from('seasonal_campaigns')
      .select('*')
      .eq('organization_id', organizationId)
      .order('start_date', { ascending: false });
    if (filters.farm_id) q = q.eq('farm_id', filters.farm_id);
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.season_type) q = q.eq('season_type', filters.season_type);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createCampaign(organizationId: string, userId: string | null, dto: CreateSeasonalCampaignDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('seasonal_campaigns')
      .insert({ organization_id: organizationId, created_by: userId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateCampaign(organizationId: string, id: string, dto: UpdateSeasonalCampaignDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('seasonal_campaigns')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Seasonal campaign not found');
    return data;
  }

  async deleteCampaign(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('seasonal_campaigns')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  // ── Worker Qualifications ──────────────────────────────────────

  async listQualifications(
    organizationId: string,
    filters: { worker_id?: string; expiring_within_days?: number; type?: string },
  ) {
    const supabase = this.db.getAdminClient();
    let q = supabase
      .from('worker_qualifications')
      .select('*, worker:workers(id, first_name, last_name, cin)')
      .eq('organization_id', organizationId)
      .order('expiry_date', { ascending: true, nullsFirst: false });
    if (filters.worker_id) q = q.eq('worker_id', filters.worker_id);
    if (filters.type) q = q.eq('qualification_type', filters.type);
    if (filters.expiring_within_days && filters.expiring_within_days > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + filters.expiring_within_days);
      q = q.lte('expiry_date', cutoff.toISOString().slice(0, 10));
    }
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createQualification(organizationId: string, dto: CreateWorkerQualificationDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('worker_qualifications')
      .insert({ organization_id: organizationId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateQualification(
    organizationId: string,
    id: string,
    dto: UpdateWorkerQualificationDto,
  ) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('worker_qualifications')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Qualification not found');
    return data;
  }

  async verifyQualification(organizationId: string, id: string, userId: string | null) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('worker_qualifications')
      .update({
        verified_by: userId,
        verified_at: new Date().toISOString(),
        is_valid: true,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Qualification not found');
    return data;
  }

  async deleteQualification(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('worker_qualifications')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  // ── Safety Incidents ───────────────────────────────────────────

  async listIncidents(
    organizationId: string,
    filters: { farm_id?: string; status?: string; severity?: string; from?: string; to?: string },
  ) {
    const supabase = this.db.getAdminClient();
    let q = supabase
      .from('safety_incidents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('incident_date', { ascending: false });
    if (filters.farm_id) q = q.eq('farm_id', filters.farm_id);
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.severity) q = q.eq('severity', filters.severity);
    if (filters.from) q = q.gte('incident_date', filters.from);
    if (filters.to) q = q.lte('incident_date', filters.to);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async getIncident(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('safety_incidents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException(error.message);
    return data;
  }

  async createIncident(organizationId: string, userId: string | null, dto: CreateSafetyIncidentDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('safety_incidents')
      .insert({
        organization_id: organizationId,
        reported_by: userId,
        corrective_actions: dto.corrective_actions ?? [],
        ...dto,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateIncident(organizationId: string, id: string, dto: UpdateSafetyIncidentDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('safety_incidents')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Incident not found');
    return data;
  }

  // ── Worker Transport ───────────────────────────────────────────

  async listTransport(
    organizationId: string,
    filters: { farm_id?: string; from?: string; to?: string },
  ) {
    const supabase = this.db.getAdminClient();
    let q = supabase
      .from('worker_transport')
      .select('*, driver:workers!worker_transport_driver_worker_id_fkey(id, first_name, last_name)')
      .eq('organization_id', organizationId)
      .order('date', { ascending: false });
    if (filters.farm_id) q = q.eq('farm_id', filters.farm_id);
    if (filters.from) q = q.gte('date', filters.from);
    if (filters.to) q = q.lte('date', filters.to);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createTransport(organizationId: string, userId: string | null, dto: CreateWorkerTransportDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('worker_transport')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        actual_count: dto.actual_count ?? dto.worker_ids.length,
        ...dto,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateTransport(organizationId: string, id: string, dto: UpdateWorkerTransportDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('worker_transport')
      .update(dto)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Transport record not found');
    return data;
  }

  async deleteTransport(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('worker_transport')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }
}
