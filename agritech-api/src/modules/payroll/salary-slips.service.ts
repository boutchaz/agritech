import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ComputedSlip, PayrollCalcService } from './payroll-calc.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';

@Injectable()
export class SalarySlipsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly calc: PayrollCalcService,
    private readonly accounting: AccountingAutomationService,
  ) {}

  async list(
    organizationId: string,
    filters: {
      worker_id?: string;
      payroll_run_id?: string;
      from?: string;
      to?: string;
      status?: string;
    },
  ) {
    const supabase = this.db.getAdminClient();
    let query = supabase
      .from('salary_slips')
      .select(
        `*, worker:workers(id, first_name, last_name, cin)`,
      )
      .eq('organization_id', organizationId)
      .order('pay_period_start', { ascending: false });
    if (filters.worker_id) query = query.eq('worker_id', filters.worker_id);
    if (filters.payroll_run_id) query = query.eq('payroll_run_id', filters.payroll_run_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.from) query = query.gte('pay_period_end', filters.from);
    if (filters.to) query = query.lte('pay_period_start', filters.to);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async getOne(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('salary_slips')
      .select(
        `*, worker:workers(id, first_name, last_name, cin, cnss_number)`,
      )
      .eq('organization_id', organizationId)
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Salary slip not found');
    return data;
  }

  /**
   * Generate a slip in draft status. Caller may then submit/pay it.
   * Idempotent only when the existing slip is still a draft of the same
   * payroll run (or unattached). Submitted/paid/cancelled slips are NEVER
   * overwritten, and a draft already attached to a different run is not
   * pulled into a new run.
   */
  async generate(
    organizationId: string,
    userId: string | null,
    params: {
      worker_id: string;
      pay_period_start: string;
      pay_period_end: string;
      pay_frequency: 'monthly' | 'biweekly' | 'weekly' | 'daily';
      payroll_run_id?: string;
    },
  ) {
    const computed = await this.calc.computeSlip({
      organizationId,
      workerId: params.worker_id,
      payPeriodStart: params.pay_period_start,
      payPeriodEnd: params.pay_period_end,
      payFrequency: params.pay_frequency,
    });

    return this.upsertSlip(organizationId, userId, computed, params.payroll_run_id);
  }

  private async upsertSlip(
    organizationId: string,
    userId: string | null,
    slip: ComputedSlip,
    payrollRunId?: string,
  ) {
    const supabase = this.db.getAdminClient();

    const { data: existing, error: existingErr } = await supabase
      .from('salary_slips')
      .select('id, status, payroll_run_id, journal_entry_id')
      .eq('organization_id', organizationId)
      .eq('worker_id', slip.worker_id)
      .eq('pay_period_start', slip.pay_period_start)
      .eq('pay_period_end', slip.pay_period_end)
      .maybeSingle();
    if (existingErr) throw new BadRequestException(existingErr.message);

    if (existing) {
      if (existing.status !== 'draft') {
        throw new BadRequestException(
          `Cannot regenerate slip for worker ${slip.worker_id} in period ${slip.pay_period_start}..${slip.pay_period_end}: status is ${existing.status}`,
        );
      }
      if (
        payrollRunId &&
        existing.payroll_run_id &&
        existing.payroll_run_id !== payrollRunId
      ) {
        throw new BadRequestException(
          `Slip already attached to payroll run ${existing.payroll_run_id}; cancel that run before regenerating in another`,
        );
      }
    }

    const computedPayload = {
      organization_id: organizationId,
      worker_id: slip.worker_id,
      farm_id: slip.farm_id,
      salary_structure_assignment_id: slip.salary_structure_assignment_id,
      pay_period_start: slip.pay_period_start,
      pay_period_end: slip.pay_period_end,
      pay_frequency: slip.pay_frequency,
      working_days: slip.working_days,
      present_days: slip.present_days,
      absent_days: slip.absent_days,
      leave_days: slip.leave_days,
      holiday_days: slip.holiday_days,
      payment_days: slip.payment_days,
      gross_pay: slip.gross_pay,
      earnings: slip.earnings,
      total_deductions: slip.total_deductions,
      deductions: slip.deductions,
      employer_contributions: slip.employer_contributions,
      net_pay: slip.net_pay,
      taxable_income: slip.taxable_income,
      income_tax: slip.income_tax,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { data, error } = await supabase
        .from('salary_slips')
        .update({
          ...computedPayload,
          payroll_run_id: payrollRunId ?? existing.payroll_run_id ?? null,
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw new BadRequestException(error.message);
      return data;
    }

    const { data, error } = await supabase
      .from('salary_slips')
      .insert({
        ...computedPayload,
        payroll_run_id: payrollRunId ?? null,
        status: 'draft',
        created_by: userId,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async setStatus(
    organizationId: string,
    id: string,
    status: 'submitted' | 'paid' | 'cancelled',
    userId: string | null = null,
  ) {
    const supabase = this.db.getAdminClient();

    if (status === 'paid') {
      const { data: slip, error: fetchErr } = await supabase
        .from('salary_slips')
        .select(
          'id, farm_id, worker_id, pay_period_start, pay_period_end, gross_pay, total_deductions, net_pay, journal_entry_id, worker:workers(first_name, last_name)',
        )
        .eq('organization_id', organizationId)
        .eq('id', id)
        .single();
      if (fetchErr || !slip) throw new NotFoundException('Salary slip not found');

      if (!slip.journal_entry_id) {
        const w = (slip as any).worker;
        const workerName = `${w?.first_name ?? ''} ${w?.last_name ?? ''}`.trim() || 'Worker';
        try {
          await this.accounting.createJournalEntryFromSalarySlip(
            organizationId,
            slip as any,
            workerName,
            userId ?? slip.worker_id,
          );
        } catch (err: any) {
          // Fail closed: never mark a slip paid without a journal entry —
          // breaks reconciliation and period-close controls.
          throw new BadRequestException(
            `Cannot mark slip ${slip.id} paid: journal entry creation failed (${err?.message ?? 'unknown error'})`,
          );
        }
      }
    }

    const { data, error } = await supabase
      .from('salary_slips')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new NotFoundException('Salary slip not found');
    return data;
  }
}
