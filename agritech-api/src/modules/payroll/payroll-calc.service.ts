import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { HrComplianceService } from '../hr-compliance/hr-compliance.service';
import { IrBracketsService } from './ir-brackets.service';

export interface ComputedSlipLine {
  name: string;
  category: string;
  amount: number;
}

export interface ComputedSlip {
  worker_id: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_frequency: string;
  working_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  holiday_days: number;
  payment_days: number;
  gross_pay: number;
  earnings: ComputedSlipLine[];
  total_deductions: number;
  deductions: ComputedSlipLine[];
  employer_contributions: ComputedSlipLine[];
  net_pay: number;
  taxable_income: number | null;
  income_tax: number | null;
  salary_structure_assignment_id: string | null;
  farm_id: string | null;
}

interface AttendanceSummary {
  working_days: number;
  present_days: number;
  leave_days: number;
  holiday_days: number;
  absent_days: number;
  payment_days: number;
}

@Injectable()
export class PayrollCalcService {
  constructor(
    private readonly db: DatabaseService,
    private readonly compliance: HrComplianceService,
    private readonly irBrackets: IrBracketsService,
  ) {}

  /**
   * Compute a salary slip in-memory. Caller is responsible for persisting
   * the result. Pure function modulo IO for compliance/brackets/structure.
   */
  async computeSlip(params: {
    organizationId: string;
    workerId: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    payFrequency: 'monthly' | 'biweekly' | 'weekly' | 'daily';
  }): Promise<ComputedSlip> {
    const { organizationId, workerId, payPeriodStart, payPeriodEnd, payFrequency } = params;

    const supabase = this.db.getAdminClient();

    const { data: worker, error: werr } = await supabase
      .from('workers')
      .select('id, organization_id, monthly_salary, daily_rate, farm_id, number_of_children')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .single();
    if (werr || !worker) throw new NotFoundException('Worker not found');

    const compliance = await this.compliance.get(organizationId);

    const assignment = await this.findActiveAssignment(workerId, payPeriodStart);
    const components = assignment
      ? await this.loadComponents(assignment.salary_structure_id)
      : [];

    const baseAmount = assignment?.base_amount
      ?? worker.monthly_salary
      ?? worker.daily_rate
      ?? 0;

    const attendance = await this.summariseAttendance({
      organizationId,
      workerId,
      payPeriodStart,
      payPeriodEnd,
    });

    // ── Earnings ────────────────────────────────────────────
    const proratedBasic = this.prorateBasic(Number(baseAmount), attendance, payFrequency);
    const earnings: ComputedSlipLine[] = [
      { name: 'Basic Salary', category: 'basic_salary', amount: round2(proratedBasic) },
    ];

    for (const c of components) {
      if (c.component_type !== 'earning') continue;
      if (c.category === 'basic_salary') continue; // already added
      const amount = this.computeComponentAmount(c, proratedBasic, attendance);
      if (amount > 0) {
        earnings.push({ name: c.name, category: c.category, amount: round2(amount) });
      }
    }

    const grossPay = earnings.reduce((sum, e) => sum + e.amount, 0);

    // ── Statutory deductions (driven by compliance flags, not components) ─
    const deductions: ComputedSlipLine[] = [];
    const employerContribs: ComputedSlipLine[] = [];

    let cnssEmployee = 0;
    if (compliance.cnss_enabled) {
      const cap = compliance.cnss_salary_cap ?? Infinity;
      const cnssBase = Math.min(grossPay, Number(cap));
      cnssEmployee = (cnssBase * Number(compliance.cnss_employee_rate)) / 100;
      const cnssEmployer = (cnssBase * Number(compliance.cnss_employer_rate)) / 100;
      if (cnssEmployee > 0)
        deductions.push({ name: 'CNSS', category: 'cnss_employee', amount: round2(cnssEmployee) });
      if (cnssEmployer > 0)
        employerContribs.push({ name: 'CNSS (employer)', category: 'cnss_employer', amount: round2(cnssEmployer) });
    }

    let amoEmployee = 0;
    if (compliance.amo_enabled) {
      const cap = compliance.amo_salary_cap ?? Infinity;
      const amoBase = Math.min(grossPay, Number(cap));
      amoEmployee = (amoBase * Number(compliance.amo_employee_rate)) / 100;
      const amoEmployer = (amoBase * Number(compliance.amo_employer_rate)) / 100;
      if (amoEmployee > 0)
        deductions.push({ name: 'AMO', category: 'amo_employee', amount: round2(amoEmployee) });
      if (amoEmployer > 0)
        employerContribs.push({ name: 'AMO (employer)', category: 'amo_employer', amount: round2(amoEmployer) });
    }

    let cisEmployee = 0;
    if (compliance.cis_enabled) {
      const cap = compliance.cis_salary_cap ?? Infinity;
      const cisBase = Math.min(grossPay, Number(cap));
      cisEmployee = (cisBase * Number(compliance.cis_employee_rate)) / 100;
      const cisEmployer = (cisBase * Number(compliance.cis_employer_rate)) / 100;
      if (cisEmployee > 0)
        deductions.push({ name: 'CIS/RCAR', category: 'cis_employee', amount: round2(cisEmployee) });
      if (cisEmployer > 0)
        employerContribs.push({ name: 'CIS/RCAR (employer)', category: 'cis_employer', amount: round2(cisEmployer) });
    }

    // ── Income tax ─────────────────────────────────────────
    let taxableIncome: number | null = null;
    let incomeTax: number | null = null;
    if (compliance.income_tax_enabled) {
      let taxable = grossPay - cnssEmployee - amoEmployee - cisEmployee;
      if (compliance.professional_expenses_deduction_enabled) {
        const monthlyCap = compliance.professional_expenses_cap
          ? Number(compliance.professional_expenses_cap) / 12
          : Infinity;
        const proExpense = Math.min(
          (grossPay * Number(compliance.professional_expenses_rate)) / 100,
          monthlyCap,
        );
        taxable -= proExpense;
      }
      taxable = Math.max(0, taxable);
      taxableIncome = round2(taxable);

      const brackets = await this.irBrackets.resolveBrackets(
        organizationId,
        compliance.compliance_country ?? 'MA',
      );
      let monthlyTax = this.irBrackets.computeMonthlyTax(taxable, brackets);

      if (compliance.family_deduction_enabled) {
        const claimedChildren = Math.min(
          Number(worker.number_of_children ?? 0),
          Number(compliance.family_deduction_max_children ?? 0),
        );
        if (claimedChildren > 0) {
          // family_deduction_per_child is annual; convert to monthly.
          const monthlyDeduction =
            (Number(compliance.family_deduction_per_child) * claimedChildren) / 12;
          monthlyTax = Math.max(0, monthlyTax - monthlyDeduction);
        }
      }

      incomeTax = round2(monthlyTax);
      if (incomeTax > 0)
        deductions.push({ name: 'IR', category: 'income_tax', amount: incomeTax });
    }

    // ── Non-statutory deductions from components ────────────
    for (const c of components) {
      if (c.component_type !== 'deduction') continue;
      if (c.is_statutory) continue;
      const amount = this.computeComponentAmount(c, proratedBasic, attendance);
      if (amount > 0)
        deductions.push({ name: c.name, category: c.category, amount: round2(amount) });
    }

    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    let netPay = grossPay - totalDeductions;
    if (compliance.round_net_pay) netPay = round2(netPay);

    return {
      worker_id: workerId,
      pay_period_start: payPeriodStart,
      pay_period_end: payPeriodEnd,
      pay_frequency: payFrequency,
      working_days: attendance.working_days,
      present_days: attendance.present_days,
      absent_days: attendance.absent_days,
      leave_days: attendance.leave_days,
      holiday_days: attendance.holiday_days,
      payment_days: attendance.payment_days,
      gross_pay: round2(grossPay),
      earnings,
      total_deductions: round2(totalDeductions),
      deductions,
      employer_contributions: employerContribs,
      net_pay: round2(netPay),
      taxable_income: taxableIncome,
      income_tax: incomeTax,
      salary_structure_assignment_id: assignment?.id ?? null,
      farm_id: worker.farm_id ?? null,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private prorateBasic(
    baseAmount: number,
    attendance: AttendanceSummary,
    frequency: string,
  ): number {
    if (frequency === 'daily') return baseAmount * attendance.payment_days;
    if (attendance.working_days === 0) return baseAmount;
    return (baseAmount * attendance.payment_days) / attendance.working_days;
  }

  private computeComponentAmount(
    c: any,
    basicSalary: number,
    attendance: AttendanceSummary,
  ): number {
    let amount = 0;
    if (c.calculation_type === 'fixed') {
      amount = Number(c.amount ?? 0);
    } else if (c.calculation_type === 'percentage_of_basic') {
      amount = (basicSalary * Number(c.percentage ?? 0)) / 100;
    } else {
      // formula path is unsupported in this slice; admin can use 'fixed'
      amount = 0;
    }
    if (c.depends_on_payment_days && attendance.working_days > 0) {
      amount = (amount * attendance.payment_days) / attendance.working_days;
    }
    return Math.max(0, amount);
  }

  private async findActiveAssignment(workerId: string, asOf: string) {
    const supabase = this.db.getAdminClient();
    const { data } = await supabase
      .from('salary_structure_assignments')
      .select('id, salary_structure_id, base_amount, variable_amount, effective_from, effective_to')
      .eq('worker_id', workerId)
      .lte('effective_from', asOf)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    if (data.effective_to && data.effective_to < asOf) return null;
    return data;
  }

  private async loadComponents(structureId: string) {
    const supabase = this.db.getAdminClient();
    const { data } = await supabase
      .from('salary_components')
      .select('*')
      .eq('salary_structure_id', structureId)
      .order('sort_order', { ascending: true });
    return data ?? [];
  }

  private async summariseAttendance(params: {
    organizationId: string;
    workerId: string;
    payPeriodStart: string;
    payPeriodEnd: string;
  }): Promise<AttendanceSummary> {
    const { organizationId, workerId, payPeriodStart, payPeriodEnd } = params;
    const supabase = this.db.getAdminClient();

    // Working days = number of non-weekend dates in the period.
    const workingDays = countWeekdays(payPeriodStart, payPeriodEnd);

    // Present days = distinct dates with at least one check_in.
    const { data: checkIns } = await supabase
      .from('attendance_records')
      .select('occurred_at')
      .eq('organization_id', organizationId)
      .eq('worker_id', workerId)
      .eq('type', 'check_in')
      .gte('occurred_at', payPeriodStart)
      .lte('occurred_at', `${payPeriodEnd}T23:59:59`);
    const presentDates = new Set<string>(
      (checkIns ?? []).map((r: any) => String(r.occurred_at).slice(0, 10)),
    );
    const presentDays = presentDates.size;

    // Approved leave overlap with the period.
    const { data: leaves } = await supabase
      .from('leave_applications')
      .select('from_date, to_date')
      .eq('organization_id', organizationId)
      .eq('worker_id', workerId)
      .eq('status', 'approved')
      .lte('from_date', payPeriodEnd)
      .gte('to_date', payPeriodStart);
    let leaveDays = 0;
    for (const lv of leaves ?? []) {
      leaveDays += countDaysOverlap(lv.from_date, lv.to_date, payPeriodStart, payPeriodEnd);
    }

    // Holiday days falling in period (any active holiday list for the org).
    const { data: holidays } = await supabase
      .from('holidays')
      .select('date, holiday_lists!inner(organization_id, is_active)')
      .eq('holiday_lists.organization_id', organizationId)
      .eq('holiday_lists.is_active', true)
      .gte('date', payPeriodStart)
      .lte('date', payPeriodEnd);
    const holidayDays = (holidays ?? []).length;

    const paymentDays = Math.min(workingDays, presentDays + leaveDays + holidayDays);
    const absentDays = Math.max(0, workingDays - paymentDays);

    return {
      working_days: workingDays,
      present_days: presentDays,
      leave_days: leaveDays,
      holiday_days: holidayDays,
      absent_days: absentDays,
      payment_days: paymentDays,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function countWeekdays(from: string, to: string): number {
  const start = new Date(from);
  const end = new Date(to);
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++; // exclude Sat/Sun
  }
  return count;
}

function countDaysOverlap(
  aFrom: string,
  aTo: string,
  bFrom: string,
  bTo: string,
): number {
  const start = aFrom > bFrom ? aFrom : bFrom;
  const end = aTo < bTo ? aTo : bTo;
  if (start > end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}
