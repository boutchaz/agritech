import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateInterviewDto,
  CreateJobApplicantDto,
  CreateJobOpeningDto,
  UpdateInterviewDto,
  UpdateJobApplicantDto,
  UpdateJobOpeningDto,
} from './dto';

@Injectable()
export class RecruitmentService {
  constructor(private readonly db: DatabaseService) {}

  // ── Openings ──────────────────────────────────────────────────
  async listOpenings(orgId: string, filters: { status?: string; farm_id?: string }) {
    const supabase = this.db.getAdminClient();
    let q = supabase
      .from('job_openings')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.farm_id) q = q.eq('farm_id', filters.farm_id);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createOpening(orgId: string, userId: string | null, dto: CreateJobOpeningDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('job_openings')
      .insert({ organization_id: orgId, created_by: userId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateOpening(orgId: string, id: string, dto: UpdateJobOpeningDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('job_openings')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException();
    return data;
  }

  async deleteOpening(orgId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('job_openings')
      .delete()
      .eq('organization_id', orgId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  // ── Applicants ────────────────────────────────────────────────
  async listApplicants(
    orgId: string,
    filters: { job_opening_id?: string; status?: string },
  ) {
    const supabase = this.db.getAdminClient();
    let q = supabase
      .from('job_applicants')
      .select('*, opening:job_openings(id, title)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (filters.job_opening_id) q = q.eq('job_opening_id', filters.job_opening_id);
    if (filters.status) q = q.eq('status', filters.status);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createApplicant(orgId: string, dto: CreateJobApplicantDto) {
    const supabase = this.db.getAdminClient();
    // Verify the job_opening belongs to this org BEFORE inserting + bumping
    // its counter. Without this check a foreign job_opening_id would create
    // an applicant for another org's opening and tick its application_count.
    const { data: opening } = await supabase
      .from('job_openings')
      .select('id, application_count')
      .eq('id', dto.job_opening_id)
      .eq('organization_id', orgId)
      .maybeSingle();
    if (!opening) {
      throw new BadRequestException(
        `Job opening ${dto.job_opening_id} does not belong to this organization`,
      );
    }

    const { data, error } = await supabase
      .from('job_applicants')
      .insert({ organization_id: orgId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);

    await supabase
      .from('job_openings')
      .update({ application_count: (opening.application_count ?? 0) + 1 })
      .eq('id', dto.job_opening_id)
      .eq('organization_id', orgId);

    return data;
  }

  async updateApplicant(orgId: string, id: string, dto: UpdateJobApplicantDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('job_applicants')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException();
    return data;
  }

  async deleteApplicant(orgId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('job_applicants')
      .delete()
      .eq('organization_id', orgId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  // ── Interviews ────────────────────────────────────────────────
  async listInterviews(orgId: string, filters: { applicant_id?: string }) {
    const supabase = this.db.getAdminClient();
    let q = supabase
      .from('interviews')
      .select('*')
      .eq('organization_id', orgId)
      .order('scheduled_at', { ascending: false });
    if (filters.applicant_id) q = q.eq('applicant_id', filters.applicant_id);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createInterview(orgId: string, dto: CreateInterviewDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('interviews')
      .insert({ organization_id: orgId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateInterview(orgId: string, id: string, dto: UpdateInterviewDto) {
    const supabase = this.db.getAdminClient();
    let avgRating: number | null | undefined;
    if (dto.feedback && Array.isArray(dto.feedback) && dto.feedback.length > 0) {
      const ratings = (dto.feedback as Array<{ rating?: number }>)
        .map((f) => f.rating)
        .filter((r): r is number => typeof r === 'number');
      avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    }
    const { data, error } = await supabase
      .from('interviews')
      .update({ ...dto, ...(avgRating !== undefined ? { average_rating: avgRating } : {}) })
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException();
    return data;
  }
}
