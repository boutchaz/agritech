import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/organizations';

export type CompliancePresetKey =
  | 'morocco_standard'
  | 'morocco_basic'
  | 'morocco_none'
  | 'custom';

export interface HrComplianceSettings {
  id: string;
  organization_id: string;
  compliance_country: string;
  compliance_preset: CompliancePresetKey;

  cnss_enabled: boolean;
  cnss_employee_rate: number;
  cnss_employer_rate: number;
  cnss_salary_cap: number | null;
  cnss_auto_declare: boolean;
  cnss_declaration_frequency: 'monthly' | 'quarterly' | null;

  amo_enabled: boolean;
  amo_employee_rate: number;
  amo_employer_rate: number;
  amo_salary_cap: number | null;

  cis_enabled: boolean;
  cis_employee_rate: number;
  cis_employer_rate: number;
  cis_salary_cap: number | null;

  income_tax_enabled: boolean;
  income_tax_config_id: string | null;
  professional_expenses_deduction_enabled: boolean;
  professional_expenses_rate: number;
  professional_expenses_cap: number | null;
  family_deduction_enabled: boolean;
  family_deduction_per_child: number;
  family_deduction_max_children: number;

  leave_compliance_mode: 'morocco_legal' | 'custom';
  enforce_minimum_leave: boolean;
  auto_allocate_annual_leave: boolean;
  annual_leave_days_per_month: number;
  sick_leave_days: number;
  maternity_leave_weeks: number;
  paternity_leave_days: number;

  minimum_wage_check_enabled: boolean;
  minimum_daily_wage: number | null;
  minimum_monthly_wage: number | null;

  default_pay_frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  default_currency: string;
  round_net_pay: boolean;
  auto_generate_slips_on_payroll_run: boolean;
  password_protect_payslips: boolean;

  overtime_enabled: boolean;
  standard_working_hours: number;
  overtime_rate_multiplier: number;
  overtime_rate_multiplier_weekend: number;

  last_updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompliancePresetMeta {
  key: CompliancePresetKey;
  label: string;
  description: string;
}

export interface ComplianceSummary {
  preset: CompliancePresetKey;
  country: string;
  currency: string;
  active_components: string[];
  leave_mode: 'morocco_legal' | 'custom';
  pay_frequency: string;
  preset_label: string;
}

export type UpdateHrComplianceInput = Partial<
  Omit<
    HrComplianceSettings,
    'id' | 'organization_id' | 'created_at' | 'updated_at' | 'last_updated_by'
  >
>;

export const hrComplianceApi = {
  get: (organizationId: string) =>
    apiClient.get<HrComplianceSettings>(
      `${BASE_URL}/${organizationId}/hr-compliance`,
      {},
      organizationId,
    ),
  update: (organizationId: string, data: UpdateHrComplianceInput) =>
    apiClient.put<HrComplianceSettings>(
      `${BASE_URL}/${organizationId}/hr-compliance`,
      data,
      {},
      organizationId,
    ),
  applyPreset: (organizationId: string, preset: CompliancePresetKey) =>
    apiClient.post<HrComplianceSettings>(
      `${BASE_URL}/${organizationId}/hr-compliance/apply-preset`,
      { preset },
      {},
      organizationId,
    ),
  listPresets: (organizationId: string) =>
    apiClient.get<CompliancePresetMeta[]>(
      `${BASE_URL}/${organizationId}/hr-compliance/presets`,
      {},
      organizationId,
    ),
  summary: (organizationId: string) =>
    apiClient.get<ComplianceSummary>(
      `${BASE_URL}/${organizationId}/hr-compliance/summary`,
      {},
      organizationId,
    ),
};
