import { apiClient } from '../api-client';

const BASE = (orgId: string) => `/api/v1/organizations/${orgId}`;

export type ComponentType = 'earning' | 'deduction';
export type CalculationType = 'fixed' | 'percentage_of_basic' | 'formula';
export type ComponentCategory =
  | 'basic_salary' | 'housing_allowance' | 'transport_allowance' | 'family_allowance'
  | 'overtime' | 'bonus' | 'commission' | 'other_earning'
  | 'cnss_employee' | 'cnss_employer' | 'amo_employee' | 'amo_employer'
  | 'cis_employee' | 'cis_employer'
  | 'income_tax' | 'professional_tax'
  | 'advance_deduction' | 'loan_deduction' | 'other_deduction';

export interface SalaryComponent {
  id?: string;
  name: string;
  name_fr?: string | null;
  name_ar?: string | null;
  component_type: ComponentType;
  category: ComponentCategory;
  calculation_type: CalculationType;
  amount?: number | null;
  percentage?: number | null;
  formula?: string | null;
  is_statutory?: boolean;
  is_taxable?: boolean;
  depends_on_payment_days?: boolean;
  condition_formula?: string | null;
  sort_order?: number;
}

export interface SalaryStructure {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  applicable_worker_types: string[];
  is_default: boolean;
  is_active: boolean;
  currency: string;
  created_at: string;
  updated_at: string;
  components?: SalaryComponent[];
}

export type CreateSalaryStructureInput = {
  name: string;
  description?: string;
  applicable_worker_types?: string[];
  is_default?: boolean;
  is_active?: boolean;
  currency?: string;
  components?: SalaryComponent[];
};
export type UpdateSalaryStructureInput = Partial<CreateSalaryStructureInput>;

export interface StructureAssignment {
  id: string;
  organization_id: string;
  worker_id: string;
  salary_structure_id: string;
  base_amount: number;
  variable_amount: number;
  cost_center_farm_id: string | null;
  effective_from: string;
  effective_to: string | null;
  worker?: { id: string; first_name: string; last_name: string };
  structure?: { id: string; name: string };
}

export interface CreateAssignmentInput {
  worker_id: string;
  salary_structure_id: string;
  base_amount: number;
  variable_amount?: number;
  effective_from: string;
  effective_to?: string;
  cost_center_farm_id?: string;
}

export type PayFrequency = 'monthly' | 'biweekly' | 'weekly' | 'daily';
export type RunStatus = 'draft' | 'processing' | 'submitted' | 'paid' | 'cancelled';

export interface PayrollRun {
  id: string;
  organization_id: string;
  name: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_frequency: PayFrequency;
  posting_date: string;
  farm_id: string | null;
  worker_type: string | null;
  total_workers: number;
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  total_employer_contributions: number;
  status: RunStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  slips?: SalarySlip[];
}

export interface CreatePayrollRunInput {
  name: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_frequency: PayFrequency;
  posting_date?: string;
  farm_id?: string;
  worker_type?: string;
}

export type SlipStatus = 'draft' | 'submitted' | 'paid' | 'cancelled';

export interface SlipLine { name: string; category: string; amount: number; }

export interface SalarySlip {
  id: string;
  organization_id: string;
  worker_id: string;
  farm_id: string | null;
  salary_structure_assignment_id: string | null;
  payroll_run_id: string | null;
  pay_period_start: string;
  pay_period_end: string;
  pay_frequency: PayFrequency;
  working_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  holiday_days: number;
  payment_days: number;
  gross_pay: number;
  earnings: SlipLine[];
  total_deductions: number;
  deductions: SlipLine[];
  employer_contributions: SlipLine[];
  net_pay: number;
  taxable_income: number | null;
  income_tax: number | null;
  status: SlipStatus;
  created_at: string;
  worker?: { id: string; first_name: string; last_name: string; cin: string | null; cnss_number?: string | null };
}

export interface GenerateSlipInput {
  worker_id: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_frequency: PayFrequency;
  payroll_run_id?: string;
}

// ── API ────────────────────────────────────────────────────────────

export const salaryStructuresApi = {
  list: (orgId: string) =>
    apiClient.get<SalaryStructure[]>(`${BASE(orgId)}/salary-structures`, {}, orgId),
  getOne: (orgId: string, id: string) =>
    apiClient.get<SalaryStructure>(`${BASE(orgId)}/salary-structures/${id}`, {}, orgId),
  create: (orgId: string, data: CreateSalaryStructureInput) =>
    apiClient.post<SalaryStructure>(`${BASE(orgId)}/salary-structures`, data, {}, orgId),
  update: (orgId: string, id: string, data: UpdateSalaryStructureInput) =>
    apiClient.put<SalaryStructure>(`${BASE(orgId)}/salary-structures/${id}`, data, {}, orgId),
  remove: (orgId: string, id: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/salary-structures/${id}`, {}, orgId),
  replaceComponents: (orgId: string, id: string, components: SalaryComponent[]) =>
    apiClient.put<SalaryComponent[]>(
      `${BASE(orgId)}/salary-structures/${id}/components`,
      { components },
      {},
      orgId,
    ),
  listAssignments: (orgId: string, workerId?: string) =>
    apiClient.get<StructureAssignment[]>(
      `${BASE(orgId)}/salary-structures/assignments${workerId ? `?worker_id=${workerId}` : ''}`,
      {},
      orgId,
    ),
  createAssignment: (orgId: string, data: CreateAssignmentInput) =>
    apiClient.post<StructureAssignment>(
      `${BASE(orgId)}/salary-structures/assignments`,
      data,
      {},
      orgId,
    ),
};

export const payrollRunsApi = {
  list: (orgId: string) =>
    apiClient.get<PayrollRun[]>(`${BASE(orgId)}/payroll-runs`, {}, orgId),
  getOne: (orgId: string, id: string) =>
    apiClient.get<PayrollRun>(`${BASE(orgId)}/payroll-runs/${id}`, {}, orgId),
  create: (orgId: string, data: CreatePayrollRunInput) =>
    apiClient.post<PayrollRun>(`${BASE(orgId)}/payroll-runs`, data, {}, orgId),
  generate: (orgId: string, id: string) =>
    apiClient.post<{ run_id: string; generated_count: number; skipped: any[]; total_gross_pay: number; total_deductions: number; total_net_pay: number }>(
      `${BASE(orgId)}/payroll-runs/${id}/generate`,
      {},
      {},
      orgId,
    ),
  submit: (orgId: string, id: string) =>
    apiClient.put<PayrollRun>(`${BASE(orgId)}/payroll-runs/${id}/submit`, {}, {}, orgId),
  cancel: (orgId: string, id: string) =>
    apiClient.put<PayrollRun>(`${BASE(orgId)}/payroll-runs/${id}/cancel`, {}, {}, orgId),
};

export const salarySlipsApi = {
  list: (orgId: string, filters: { worker_id?: string; payroll_run_id?: string; from?: string; to?: string; status?: SlipStatus } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    const q = qs.toString();
    return apiClient.get<SalarySlip[]>(
      `${BASE(orgId)}/salary-slips${q ? `?${q}` : ''}`,
      {},
      orgId,
    );
  },
  getOne: (orgId: string, id: string) =>
    apiClient.get<SalarySlip>(`${BASE(orgId)}/salary-slips/${id}`, {}, orgId),
  generate: (orgId: string, data: GenerateSlipInput) =>
    apiClient.post<SalarySlip>(`${BASE(orgId)}/salary-slips/generate`, data, {}, orgId),
  submit: (orgId: string, id: string) =>
    apiClient.put<SalarySlip>(`${BASE(orgId)}/salary-slips/${id}/submit`, {}, {}, orgId),
  pay: (orgId: string, id: string) =>
    apiClient.put<SalarySlip>(`${BASE(orgId)}/salary-slips/${id}/pay`, {}, {}, orgId),
  cancel: (orgId: string, id: string) =>
    apiClient.put<SalarySlip>(`${BASE(orgId)}/salary-slips/${id}/cancel`, {}, {}, orgId),
};
