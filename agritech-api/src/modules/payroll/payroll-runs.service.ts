import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { HrComplianceService } from '../hr-compliance/hr-compliance.service';
import { SalarySlipsService } from './salary-slips.service';
import { CreatePayrollRunDto } from './dto';

@Injectable()
export class PayrollRunsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly slips: SalarySlipsService,
    private readonly compliance: HrComplianceService,
  ) {}

  async list(organizationId: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('pay_period_start', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async getOne(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('payroll_runs')
      .select(`*, slips:salary_slips(*)`)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Payroll run not found');
    return data;
  }

  async create(
    organizationId: string,
    userId: string | null,
    dto: CreatePayrollRunDto,
  ) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('payroll_runs')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        ...dto,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /**
   * Generate slips for every active worker matching the run's filters.
   * Workers with no monthly_salary, daily_rate, or active assignment are
   * skipped (logged in the response). Idempotent: re-running re-upserts
   * the existing draft slips.
   */
  async generate(
    organizationId: string,
    userId: string | null,
    runId: string,
  ) {
    const run = await this.getOne(organizationId, runId);
    if (!['draft', 'processing'].includes(run.status))
      throw new BadRequestException(
        `Cannot generate slips for run in status ${run.status}`,
      );

    await this.setRunStatus(runId, 'processing');

    // Resolve compliance default (used for filter fallbacks)
    await this.compliance.get(organizationId);

    const supabase = this.db.getAdminClient();
    let workersQuery = supabase
      .from('workers')
      .select('id, worker_type, farm_id, monthly_salary, daily_rate')
      .eq('organization_id', organizationId)
      .eq('is_active', true);
    if (run.farm_id) workersQuery = workersQuery.eq('farm_id', run.farm_id);
    if (run.worker_type) workersQuery = workersQuery.eq('worker_type', run.worker_type);

    const { data: workers, error: werr } = await workersQuery;
    if (werr) throw new BadRequestException(werr.message);

    const skipped: Array<{ worker_id: string; reason: string }> = [];
    const generated: string[] = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalEmployer = 0;

    for (const w of workers ?? []) {
      try {
        const slip = await this.slips.generate(organizationId, userId, {
          worker_id: w.id,
          pay_period_start: run.pay_period_start,
          pay_period_end: run.pay_period_end,
          pay_frequency: run.pay_frequency,
          payroll_run_id: runId,
        });
        generated.push(slip.id);
        totalGross += Number(slip.gross_pay);
        totalDeductions += Number(slip.total_deductions);
        totalNet += Number(slip.net_pay);
        const employerSum = ((slip.employer_contributions as any[]) ?? [])
          .reduce((s, c) => s + Number(c.amount ?? 0), 0);
        totalEmployer += employerSum;
      } catch (err: any) {
        skipped.push({ worker_id: w.id, reason: err?.message ?? 'unknown error' });
      }
    }

    await supabase
      .from('payroll_runs')
      .update({
        total_workers: generated.length,
        total_gross_pay: round2(totalGross),
        total_deductions: round2(totalDeductions),
        total_net_pay: round2(totalNet),
        total_employer_contributions: round2(totalEmployer),
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId);

    return {
      run_id: runId,
      generated_count: generated.length,
      skipped,
      total_gross_pay: round2(totalGross),
      total_deductions: round2(totalDeductions),
      total_net_pay: round2(totalNet),
    };
  }

  async submit(
    organizationId: string,
    userId: string | null,
    runId: string,
  ) {
    const run = await this.getOne(organizationId, runId);
    if (run.status !== 'draft')
      throw new BadRequestException(`Cannot submit run in status ${run.status}`);

    const supabase = this.db.getAdminClient();
    await supabase
      .from('salary_slips')
      .update({ status: 'submitted', updated_at: new Date().toISOString() })
      .eq('payroll_run_id', runId);

    const { data, error } = await supabase
      .from('payroll_runs')
      .update({
        status: 'submitted',
        submitted_by: userId,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async cancel(organizationId: string, runId: string) {
    const run = await this.getOne(organizationId, runId);
    if (run.status === 'paid')
      throw new BadRequestException('Cannot cancel a paid run');

    const supabase = this.db.getAdminClient();
    await supabase
      .from('salary_slips')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('payroll_run_id', runId);
    const { data, error } = await supabase
      .from('payroll_runs')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('id', runId)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  private async setRunStatus(runId: string, status: string) {
    const supabase = this.db.getAdminClient();
    await supabase
      .from('payroll_runs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', runId);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
