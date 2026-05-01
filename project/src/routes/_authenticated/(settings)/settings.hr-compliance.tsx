import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import {
  useApplyCompliancePreset,
  useHrCompliancePresets,
  useHrComplianceSettings,
  useUpdateHrCompliance,
} from '@/hooks/useHrCompliance';
import type {
  CompliancePresetKey,
  HrComplianceSettings,
  UpdateHrComplianceInput,
} from '@/lib/api/hr-compliance';

export const Route = createFileRoute(
  '/_authenticated/(settings)/settings/hr-compliance',
)({
  component: withRouteProtection(
    HrComplianceSettingsPage,
    'manage',
    'HrCompliance',
  ),
});

function HrComplianceSettingsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;
  const settingsQuery = useHrComplianceSettings(orgId);

  if (!orgId) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTitle>{t('common.noOrganizationSelected', 'No organization selected')}</AlertTitle>
        </Alert>
      </div>
    );
  }

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Remount the form when server data changes so the editable draft is
  // re-seeded — avoids state-syncing inside an effect.
  return (
    <HrComplianceForm
      key={`${settingsQuery.data.id}:${settingsQuery.data.updated_at}`}
      organizationId={orgId}
      initial={settingsQuery.data}
    />
  );
}

function HrComplianceForm({
  organizationId,
  initial,
}: {
  organizationId: string;
  initial: HrComplianceSettings;
}) {
  const { t } = useTranslation();
  const presetsQuery = useHrCompliancePresets(organizationId);
  const applyPreset = useApplyCompliancePreset();
  const update = useUpdateHrCompliance();

  const [draft, setDraft] = useState<HrComplianceSettings>(initial);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initial),
    [draft, initial],
  );

  const set = <K extends keyof HrComplianceSettings>(
    key: K,
    value: HrComplianceSettings[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const handleApplyPreset = (preset: CompliancePresetKey) => {
    applyPreset.mutate(
      { organizationId, preset },
      {
        onSuccess: () => toast.success(t('hrCompliance.presetApplied', 'Preset applied')),
        onError: () => toast.error(t('common.errorOccurred', 'An error occurred')),
      },
    );
  };

  const handleSave = () => {
    const payload: UpdateHrComplianceInput = stripImmutable(draft);
    update.mutate(
      { organizationId, data: payload },
      {
        onSuccess: () => toast.success(t('common.saved', 'Saved')),
        onError: () => toast.error(t('common.errorOccurred', 'An error occurred')),
      },
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            {t('hrCompliance.title', 'HR Compliance')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t(
              'hrCompliance.subtitle',
              'Configure statutory deductions, leave rules, and payroll behavior. Every payroll run reads these settings — turn off anything that does not apply to your organization.',
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!isDirty || update.isPending}
            onClick={() => setDraft(initial)}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || update.isPending}>
            {update.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t('common.save', 'Save')
            )}
          </Button>
        </div>
      </header>

      <PresetCard
        currentPreset={draft.compliance_preset}
        presets={presetsQuery.data ?? []}
        loading={presetsQuery.isLoading}
        applying={applyPreset.isPending}
        onApply={handleApplyPreset}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('hrCompliance.cnss', 'CNSS (Social Security)')}</CardTitle>
          <CardDescription>
            {t(
              'hrCompliance.cnssDesc',
              'When enabled, CNSS employee/employer contributions are computed and deducted from gross pay (capped by the salary cap if set).',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label={t('hrCompliance.enabled', 'Enabled')}
            checked={draft.cnss_enabled}
            onChange={(v) => set('cnss_enabled', v)}
          />
          {draft.cnss_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NumberField
                label={t('hrCompliance.employeeRate', 'Employee rate (%)')}
                value={draft.cnss_employee_rate}
                onChange={(v) => set('cnss_employee_rate', v ?? 0)}
              />
              <NumberField
                label={t('hrCompliance.employerRate', 'Employer rate (%)')}
                value={draft.cnss_employer_rate}
                onChange={(v) => set('cnss_employer_rate', v ?? 0)}
              />
              <NumberField
                label={t('hrCompliance.salaryCap', 'Salary cap (monthly)')}
                value={draft.cnss_salary_cap}
                nullable
                onChange={(v) => set('cnss_salary_cap', v)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('hrCompliance.amo', 'AMO (Health Insurance)')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label={t('hrCompliance.enabled', 'Enabled')}
            checked={draft.amo_enabled}
            onChange={(v) => set('amo_enabled', v)}
          />
          {draft.amo_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NumberField
                label={t('hrCompliance.employeeRate', 'Employee rate (%)')}
                value={draft.amo_employee_rate}
                onChange={(v) => set('amo_employee_rate', v ?? 0)}
              />
              <NumberField
                label={t('hrCompliance.employerRate', 'Employer rate (%)')}
                value={draft.amo_employer_rate}
                onChange={(v) => set('amo_employer_rate', v ?? 0)}
              />
              <NumberField
                label={t('hrCompliance.salaryCap', 'Salary cap (monthly)')}
                value={draft.amo_salary_cap}
                nullable
                onChange={(v) => set('amo_salary_cap', v)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('hrCompliance.incomeTax', 'Income Tax (IR)')}</CardTitle>
          <CardDescription>
            {t(
              'hrCompliance.incomeTaxDesc',
              'Brackets are applied progressively at payroll time. Edit brackets directly in the database if you need a custom set.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label={t('hrCompliance.enabled', 'Enabled')}
            checked={draft.income_tax_enabled}
            onChange={(v) => set('income_tax_enabled', v)}
          />
          {draft.income_tax_enabled && (
            <>
              <ToggleRow
                label={t('hrCompliance.profExpenses', 'Professional expenses deduction')}
                checked={draft.professional_expenses_deduction_enabled}
                onChange={(v) => set('professional_expenses_deduction_enabled', v)}
              />
              {draft.professional_expenses_deduction_enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NumberField
                    label={t('hrCompliance.profExpensesRate', 'Rate (% of gross)')}
                    value={draft.professional_expenses_rate}
                    onChange={(v) => set('professional_expenses_rate', v ?? 0)}
                  />
                  <NumberField
                    label={t('hrCompliance.profExpensesCap', 'Annual cap')}
                    value={draft.professional_expenses_cap}
                    nullable
                    onChange={(v) => set('professional_expenses_cap', v)}
                  />
                </div>
              )}
              <ToggleRow
                label={t('hrCompliance.familyDeduction', 'Family deduction')}
                checked={draft.family_deduction_enabled}
                onChange={(v) => set('family_deduction_enabled', v)}
              />
              {draft.family_deduction_enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NumberField
                    label={t('hrCompliance.familyPerChild', 'Annual amount per child')}
                    value={draft.family_deduction_per_child}
                    onChange={(v) => set('family_deduction_per_child', v ?? 0)}
                  />
                  <NumberField
                    label={t('hrCompliance.familyMaxChildren', 'Max children')}
                    value={draft.family_deduction_max_children}
                    onChange={(v) =>
                      set('family_deduction_max_children', Math.floor(v ?? 0))
                    }
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('hrCompliance.minWage', 'Minimum Wage Check')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label={t('hrCompliance.enabled', 'Enabled')}
            checked={draft.minimum_wage_check_enabled}
            onChange={(v) => set('minimum_wage_check_enabled', v)}
          />
          {draft.minimum_wage_check_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumberField
                label={t('hrCompliance.minDaily', 'Minimum daily wage')}
                value={draft.minimum_daily_wage}
                nullable
                onChange={(v) => set('minimum_daily_wage', v)}
              />
              <NumberField
                label={t('hrCompliance.minMonthly', 'Minimum monthly wage')}
                value={draft.minimum_monthly_wage}
                nullable
                onChange={(v) => set('minimum_monthly_wage', v)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('hrCompliance.payroll', 'Payroll behavior')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('hrCompliance.defaultFrequency', 'Default pay frequency')}</Label>
              <Select
                value={draft.default_pay_frequency}
                onValueChange={(v) =>
                  set('default_pay_frequency', v as HrComplianceSettings['default_pay_frequency'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('hrCompliance.currency', 'Currency')}</Label>
              <Input
                value={draft.default_currency}
                onChange={(e) => set('default_currency', e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
          </div>
          <ToggleRow
            label={t('hrCompliance.roundNet', 'Round net pay to 2 decimals')}
            checked={draft.round_net_pay}
            onChange={(v) => set('round_net_pay', v)}
          />
          <ToggleRow
            label={t('hrCompliance.autoSlips', 'Auto-generate slips on payroll run')}
            checked={draft.auto_generate_slips_on_payroll_run}
            onChange={(v) => set('auto_generate_slips_on_payroll_run', v)}
          />
          <ToggleRow
            label={t('hrCompliance.passwordSlips', 'Password-protect payslip PDFs')}
            checked={draft.password_protect_payslips}
            onChange={(v) => set('password_protect_payslips', v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('hrCompliance.overtime', 'Overtime')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label={t('hrCompliance.enabled', 'Enabled')}
            checked={draft.overtime_enabled}
            onChange={(v) => set('overtime_enabled', v)}
          />
          {draft.overtime_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NumberField
                label={t('hrCompliance.standardHours', 'Standard daily hours')}
                value={draft.standard_working_hours}
                onChange={(v) => set('standard_working_hours', v ?? 0)}
              />
              <NumberField
                label={t('hrCompliance.otMultiplier', 'OT multiplier (weekday)')}
                value={draft.overtime_rate_multiplier}
                onChange={(v) => set('overtime_rate_multiplier', v ?? 0)}
              />
              <NumberField
                label={t('hrCompliance.otMultiplierWeekend', 'OT multiplier (weekend)')}
                value={draft.overtime_rate_multiplier_weekend}
                onChange={(v) => set('overtime_rate_multiplier_weekend', v ?? 0)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {isDirty && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('hrCompliance.unsaved', 'Unsaved changes')}</AlertTitle>
          <AlertDescription>
            {t(
              'hrCompliance.unsavedDesc',
              'Your changes will mark the active preset as "custom" once saved.',
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function stripImmutable(s: HrComplianceSettings): UpdateHrComplianceInput {
  const {
    id: _id,
    organization_id: _org,
    created_at: _ca,
    updated_at: _ua,
    last_updated_by: _lu,
    ...rest
  } = s;
  return rest;
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="flex-1 cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  nullable = false,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  nullable?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        step="0.01"
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') return onChange(nullable ? null : 0);
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : nullable ? null : 0);
        }}
      />
    </div>
  );
}

function PresetCard({
  currentPreset,
  presets,
  loading,
  applying,
  onApply,
}: {
  currentPreset: CompliancePresetKey;
  presets: { key: CompliancePresetKey; label: string; description: string }[];
  loading: boolean;
  applying: boolean;
  onApply: (preset: CompliancePresetKey) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('hrCompliance.preset', 'Compliance preset')}</CardTitle>
        <CardDescription>
          {t(
            'hrCompliance.presetDesc',
            'Pick a preset to fill all rates and toggles in one go. You can still edit individual fields afterwards — the preset will switch to "custom".',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {presets.map((p) => {
              const active = p.key === currentPreset;
              return (
                <div
                  key={p.key}
                  className={`border rounded-lg p-4 flex flex-col gap-2 dark:border-gray-700 ${
                    active ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.label}</span>
                    {active && (
                      <span className="text-xs text-primary font-semibold uppercase">
                        {t('common.active', 'Active')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex-1">
                    {p.description}
                  </p>
                  <Button
                    variant={active ? 'outline' : 'default'}
                    size="sm"
                    disabled={applying}
                    onClick={() => onApply(p.key)}
                  >
                    {active
                      ? t('hrCompliance.reapply', 'Re-apply')
                      : t('hrCompliance.apply', 'Apply')}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
