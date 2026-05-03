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
    await this.assertInterviewRefsInOrg(orgId, {
      applicantId: dto.applicant_id,
      jobOpeningId: dto.job_opening_id,
      interviewerIds: dto.interviewer_ids,
    });

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

    // Re-validate FKs if the patch touches any of them.
    if (dto.applicant_id || dto.job_opening_id || dto.interviewer_ids) {
      await this.assertInterviewRefsInOrg(orgId, {
        applicantId: dto.applicant_id,
        jobOpeningId: dto.job_opening_id,
        interviewerIds: dto.interviewer_ids,
      });
    }

    let avgRating: number | null | undefined;
    if (dto.feedback && Array.isArray(dto.feedback) && dto.feedback.length > 0) {
      // Pull the row's interviewer_ids so we can verify each feedback entry
      // belongs to a real interviewer on this interview. Without this the
      // average_rating compute could include ratings from non-participants.
      const { data: existing } = await supabase
        .from('interviews')
        .select('interviewer_ids')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();

      const allowedInterviewerIds: Set<string> = new Set([
        ...((existing?.interviewer_ids as string[] | null) ?? []),
        ...((dto.interviewer_ids as string[] | undefined) ?? []),
      ]);

      const seen = new Set<string>();
      for (const entry of dto.feedback) {
        const e = entry as { interviewer_id?: string; rating?: number };
        if (!e.interviewer_id || !Number.isInteger(e.rating) || (e.rating ?? 0) < 1 || (e.rating ?? 0) > 5) {
          throw new BadRequestException(
            `Invalid feedback entry: interviewer_id required, rating must be integer 1-5`,
          );
        }
        if (allowedInterviewerIds.size > 0 && !allowedInterviewerIds.has(e.interviewer_id)) {
          throw new BadRequestException(
            `Feedback interviewer_id ${e.interviewer_id} is not assigned to this interview`,
          );
        }
        if (seen.has(e.interviewer_id)) {
          throw new BadRequestException(
            `Duplicate feedback for interviewer ${e.interviewer_id}`,
          );
        }
        seen.add(e.interviewer_id);
      }

      const ratings = (dto.feedback as Array<{ rating: number }>).map((f) => f.rating);
      avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
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

  /**
   * Cross-tenant FK guard for interview create/update. Validates that
   * applicant_id, job_opening_id, and every interviewer_id belong to the
   * caller's organization before any write — without this, a foreign UUID
   * stored on the row leaks data into another org's recruitment view.
   */
  private async assertInterviewRefsInOrg(
    orgId: string,
    refs: { applicantId?: string; jobOpeningId?: string; interviewerIds?: string[] },
  ): Promise<void> {
    const supabase = this.db.getAdminClient();

    if (refs.applicantId) {
      const { data } = await supabase
        .from('job_applicants')
        .select('id')
        .eq('id', refs.applicantId)
        .eq('organization_id', orgId)
        .maybeSingle();
      if (!data) {
        throw new BadRequestException(
          `Applicant ${refs.applicantId} does not belong to this organization`,
        );
      }
    }

    if (refs.jobOpeningId) {
      const { data } = await supabase
        .from('job_openings')
        .select('id')
        .eq('id', refs.jobOpeningId)
        .eq('organization_id', orgId)
        .maybeSingle();
      if (!data) {
        throw new BadRequestException(
          `Job opening ${refs.jobOpeningId} does not belong to this organization`,
        );
      }
    }

    if (refs.interviewerIds && refs.interviewerIds.length > 0) {
      const unique = Array.from(new Set(refs.interviewerIds));
      const { data: members } = await supabase
        .from('organization_users')
        .select('user_id')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .in('user_id', unique);
      const found = new Set((members ?? []).map((m: { user_id: string }) => m.user_id));
      const missing = unique.filter((id) => !found.has(id));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Interviewers not in this organization: ${missing.join(', ')}`,
        );
      }
    }
  }
}
