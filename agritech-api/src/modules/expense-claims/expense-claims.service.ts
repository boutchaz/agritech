import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  ApproveClaimDto,
  CreateExpenseCategoryDto,
  CreateExpenseClaimDto,
  RejectClaimDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseClaimDto,
} from './dto';

@Injectable()
export class ExpenseClaimsService {
  constructor(private readonly db: DatabaseService) {}

  // ── Categories ────────────────────────────────────────────────
  async listCategories(orgId: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createCategory(orgId: string, dto: CreateExpenseCategoryDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ organization_id: orgId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateCategory(orgId: string, id: string, dto: UpdateExpenseCategoryDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('expense_categories')
      .update(dto)
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException();
    return data;
  }

  async deleteCategory(orgId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('organization_id', orgId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  // ── Claims ────────────────────────────────────────────────────
  async listClaims(
    orgId: string,
    filters: { worker_id?: string; status?: string; from?: string; to?: string },
  ) {
    const supabase = this.db.getAdminClient();
    let q = supabase
      .from('expense_claims')
      .select('*, worker:workers(id, first_name, last_name, cin)')
      .eq('organization_id', orgId)
      .order('expense_date', { ascending: false });
    if (filters.worker_id) q = q.eq('worker_id', filters.worker_id);
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.from) q = q.gte('expense_date', filters.from);
    if (filters.to) q = q.lte('expense_date', filters.to);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createClaim(orgId: string, userId: string | null, dto: CreateExpenseClaimDto) {
    const supabase = this.db.getAdminClient();
    const grand = dto.grand_total ?? dto.total_amount + (dto.total_tax ?? 0);
    const { data, error } = await supabase
      .from('expense_claims')
      .insert({
        organization_id: orgId,
        created_by: userId,
        status: 'pending',
        grand_total: grand,
        total_tax: dto.total_tax ?? 0,
        ...dto,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateClaim(orgId: string, id: string, dto: UpdateExpenseClaimDto) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('expense_claims')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException();
    return data;
  }

  async approveClaim(orgId: string, id: string, userId: string | null, dto: ApproveClaimDto) {
    const supabase = this.db.getAdminClient();
    const now = new Date().toISOString();
    const { data: existing, error: getErr } = await supabase
      .from('expense_claims')
      .select('approval_history')
      .eq('organization_id', orgId)
      .eq('id', id)
      .single();
    if (getErr) throw new NotFoundException(getErr.message);
    const history = (existing?.approval_history as unknown[]) ?? [];
    const { data, error } = await supabase
      .from('expense_claims')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: now,
        rejection_reason: null,
        approval_history: [...history, { action: 'approved', by: userId, at: now, notes: dto.notes }],
        updated_at: now,
      })
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async rejectClaim(orgId: string, id: string, userId: string | null, dto: RejectClaimDto) {
    const supabase = this.db.getAdminClient();
    const now = new Date().toISOString();
    const { data: existing } = await supabase
      .from('expense_claims')
      .select('approval_history')
      .eq('organization_id', orgId)
      .eq('id', id)
      .single();
    const history = (existing?.approval_history as unknown[]) ?? [];
    const { data, error } = await supabase
      .from('expense_claims')
      .update({
        status: 'rejected',
        rejection_reason: dto.rejection_reason,
        approval_history: [...history, { action: 'rejected', by: userId, at: now, reason: dto.rejection_reason }],
        updated_at: now,
      })
      .eq('organization_id', orgId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException();
    return data;
  }

  async deleteClaim(orgId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('expense_claims')
      .delete()
      .eq('organization_id', orgId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }
}
