/**
 * Compliance presets — service-layer constants. Applying a preset overwrites
 * the related fields on hr_compliance_settings. Rates reflect Moroccan
 * statutory norms as of 2026; admins may override via 'custom'.
 */
export type CompliancePreset =
  | 'morocco_standard'
  | 'morocco_basic'
  | 'morocco_none'
  | 'custom';

export interface CompliancePresetDef {
  label: string;
  description: string;
  values: Record<string, unknown>;
}

export const COMPLIANCE_PRESETS: Record<CompliancePreset, CompliancePresetDef> = {
  morocco_standard: {
    label: 'Maroc — Conformité complète',
    description: 'CNSS + AMO + IR + congés légaux',
    values: {
      compliance_country: 'MA',
      compliance_preset: 'morocco_standard',
      cnss_enabled: true,
      cnss_employee_rate: 4.48,
      cnss_employer_rate: 8.6,
      cnss_salary_cap: 6000,
      cnss_auto_declare: true,
      cnss_declaration_frequency: 'monthly',
      amo_enabled: true,
      amo_employee_rate: 2.52,
      amo_employer_rate: 4.11,
      amo_salary_cap: null,
      cis_enabled: false,
      income_tax_enabled: true,
      professional_expenses_deduction_enabled: true,
      professional_expenses_rate: 20,
      professional_expenses_cap: 30000,
      family_deduction_enabled: true,
      family_deduction_per_child: 300,
      family_deduction_max_children: 3,
      leave_compliance_mode: 'morocco_legal',
      enforce_minimum_leave: true,
      auto_allocate_annual_leave: true,
      annual_leave_days_per_month: 1.5,
      sick_leave_days: 4,
      maternity_leave_weeks: 14,
      paternity_leave_days: 3,
      minimum_wage_check_enabled: true,
      minimum_daily_wage: 88.26,
      minimum_monthly_wage: 3111,
      default_pay_frequency: 'monthly',
      default_currency: 'MAD',
      overtime_enabled: true,
      standard_working_hours: 8,
      overtime_rate_multiplier: 1.5,
      overtime_rate_multiplier_weekend: 2,
    },
  },
  morocco_basic: {
    label: 'Maroc — CNSS uniquement',
    description: 'CNSS + AMO, sans IR (petites exploitations)',
    values: {
      compliance_country: 'MA',
      compliance_preset: 'morocco_basic',
      cnss_enabled: true,
      cnss_employee_rate: 4.48,
      cnss_employer_rate: 8.6,
      cnss_salary_cap: 6000,
      amo_enabled: true,
      amo_employee_rate: 2.52,
      amo_employer_rate: 4.11,
      cis_enabled: false,
      income_tax_enabled: false,
      professional_expenses_deduction_enabled: false,
      family_deduction_enabled: false,
      leave_compliance_mode: 'custom',
      enforce_minimum_leave: false,
      auto_allocate_annual_leave: false,
      minimum_wage_check_enabled: false,
      default_pay_frequency: 'monthly',
      default_currency: 'MAD',
      overtime_enabled: false,
    },
  },
  morocco_none: {
    label: 'Maroc — Sans déductions',
    description: 'Aucune déduction légale (très petites exploitations)',
    values: {
      compliance_country: 'MA',
      compliance_preset: 'morocco_none',
      cnss_enabled: false,
      cnss_employee_rate: 0,
      cnss_employer_rate: 0,
      amo_enabled: false,
      amo_employee_rate: 0,
      amo_employer_rate: 0,
      cis_enabled: false,
      income_tax_enabled: false,
      professional_expenses_deduction_enabled: false,
      family_deduction_enabled: false,
      leave_compliance_mode: 'custom',
      enforce_minimum_leave: false,
      auto_allocate_annual_leave: false,
      minimum_wage_check_enabled: false,
      default_pay_frequency: 'monthly',
      default_currency: 'MAD',
      overtime_enabled: false,
    },
  },
  custom: {
    label: 'Personnalisé',
    description: 'Configurer manuellement tous les paramètres',
    values: {
      compliance_preset: 'custom',
    },
  },
};

export function getPreset(name: CompliancePreset): CompliancePresetDef | undefined {
  return COMPLIANCE_PRESETS[name];
}

export function listPresets() {
  return (Object.keys(COMPLIANCE_PRESETS) as CompliancePreset[]).map((key) => ({
    key,
    label: COMPLIANCE_PRESETS[key].label,
    description: COMPLIANCE_PRESETS[key].description,
  }));
}
