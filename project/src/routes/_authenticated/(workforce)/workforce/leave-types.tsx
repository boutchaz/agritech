import { useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Power, PowerOff, Building2, Users, Calendar } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import {
  useCreateLeaveType,
  useDeactivateLeaveType,
  useLeaveTypes,
  useUpdateLeaveType,
} from '@/hooks/useLeaveManagement';
import type { CreateLeaveTypeInput, LeaveType } from '@/lib/api/leave-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

export const Route = createFileRoute(
  '/_authenticated/(workforce)/workforce/leave-types',
)({
  component: withRouteProtection(LeaveTypesPage, 'manage', 'LeaveType'),
});

function LeaveTypesPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [includeInactive, setIncludeInactive] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [creating, setCreating] = useState(false);

  const query = useLeaveTypes(orgId, includeInactive);
  const create = useCreateLeaveType();
  const update = useUpdateLeaveType();
  const deactivate = useDeactivateLeaveType();

  if (!orgId) return null;

  const types = query.data?.data ?? [];

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization?.name ?? '', path: '/dashboard' },
          { icon: Users, label: t('nav.workforce', 'Workforce'), path: '/workforce/employees' },
          { icon: Calendar, label: t('leaveTypes.title', 'Leave Types'), isActive: true },
        ]}
        title={t('leaveTypes.title', 'Leave Types')}
        subtitle={t(
          'leaveTypes.subtitle',
          'Configure the leave categories your organization grants — annual, sick, maternity, etc.',
        )}
        actions={
          <>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
              {t('common.showInactive', 'Show inactive')}
            </label>
            <Button onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('common.create', 'Create')}
            </Button>
          </>
        }
      />
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {query.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : types.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('leaveTypes.empty', 'No leave types yet — create one to get started.')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {types.map((lt) => (
            <Card key={lt.id} className={lt.is_active ? '' : 'opacity-60'}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-base">{lt.name}</CardTitle>
                  {lt.description && (
                    <p className="text-xs text-gray-500 mt-1">{lt.description}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {lt.is_paid ? (
                    <Badge variant="default">{t('common.paid', 'Paid')}</Badge>
                  ) : (
                    <Badge variant="outline">{t('common.unpaid', 'Unpaid')}</Badge>
                  )}
                  {lt.is_carry_forward && (
                    <Badge variant="secondary">{t('leaveTypes.carryForward', 'Carry forward')}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row
                  label={t('leaveTypes.annualAllocation', 'Annual allocation')}
                  value={`${lt.annual_allocation} ${t('common.days', 'days')}`}
                />
                <Row
                  label={t('leaveTypes.maxConsecutive', 'Max consecutive')}
                  value={lt.maximum_consecutive_days ? `${lt.maximum_consecutive_days} ${t('common.days', 'days')}` : '—'}
                />
                <Row
                  label={t('leaveTypes.advanceNotice', 'Advance notice')}
                  value={`${lt.minimum_advance_notice_days} ${t('common.days', 'days')}`}
                />
                <Row
                  label={t('leaveTypes.requiresApproval', 'Requires approval')}
                  value={lt.requires_approval ? t('common.yes', 'Yes') : t('common.no', 'No')}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(lt)}>
                    <Pencil className="w-3 h-3 mr-1" />
                    {t('common.edit', 'Edit')}
                  </Button>
                  {lt.is_active ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!confirm(t('leaveTypes.confirmDeactivate', 'Deactivate this leave type?'))) return;
                        deactivate.mutate(
                          { orgId, id: lt.id },
                          { onSuccess: () => toast.success(t('common.deactivated', 'Deactivated')) },
                        );
                      }}
                    >
                      <PowerOff className="w-3 h-3 mr-1" />
                      {t('common.deactivate', 'Deactivate')}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        update.mutate(
                          { orgId, id: lt.id, data: { is_active: true } },
                          { onSuccess: () => toast.success(t('common.activated', 'Activated')) },
                        )
                      }
                    >
                      <Power className="w-3 h-3 mr-1" />
                      {t('common.activate', 'Activate')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <LeaveTypeFormDialog
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={async (data) => {
            if (editing) {
              await update.mutateAsync({ orgId, id: editing.id, data });
              toast.success(t('common.saved', 'Saved'));
            } else {
              await create.mutateAsync({ orgId, data });
              toast.success(t('common.created', 'Created'));
            }
          }}
        />
      )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function LeaveTypeFormDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial: LeaveType | null;
  onClose: () => void;
  onSubmit: (data: CreateLeaveTypeInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CreateLeaveTypeInput>(() =>
    initial
      ? {
          name: initial.name,
          name_fr: initial.name_fr,
          name_ar: initial.name_ar,
          description: initial.description,
          annual_allocation: initial.annual_allocation,
          is_carry_forward: initial.is_carry_forward,
          maximum_carry_forward_days: initial.maximum_carry_forward_days,
          carry_forward_expiry_months: initial.carry_forward_expiry_months,
          is_paid: initial.is_paid,
          requires_approval: initial.requires_approval,
          maximum_consecutive_days: initial.maximum_consecutive_days,
          minimum_advance_notice_days: initial.minimum_advance_notice_days,
          is_encashable: initial.is_encashable,
          encashment_amount_per_day: initial.encashment_amount_per_day,
          applicable_worker_types: initial.applicable_worker_types,
          is_active: initial.is_active,
        }
      : {
          name: '',
          annual_allocation: 0,
          is_paid: true,
          requires_approval: true,
          minimum_advance_notice_days: 1,
          applicable_worker_types: ['fixed_salary', 'daily_worker', 'metayage'],
          is_active: true,
        },
  );
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateLeaveTypeInput>(key: K, value: CreateLeaveTypeInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSubmit = async () => {
    if (!draft.name.trim()) {
      toast.error(t('validation.nameRequired', 'Name is required'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(draft);
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? t('common.errorOccurred', 'An error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="xl"
      title={initial ? t('leaveTypes.edit', 'Edit leave type') : t('leaveTypes.create', 'Create leave type')}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save', 'Save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={t('common.name', 'Name')}>
            <Input value={draft.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label={`${t('common.name', 'Name')} (FR)`}>
            <Input value={draft.name_fr ?? ''} onChange={(e) => set('name_fr', e.target.value || null)} />
          </Field>
          <Field label={`${t('common.name', 'Name')} (AR)`}>
            <Input value={draft.name_ar ?? ''} onChange={(e) => set('name_ar', e.target.value || null)} dir="rtl" />
          </Field>
        </div>
        <Field label={t('common.description', 'Description')}>
          <Input value={draft.description ?? ''} onChange={(e) => set('description', e.target.value || null)} />
        </Field>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label={t('leaveTypes.annualAllocation', 'Annual allocation')}>
            <Input
              type="number"
              min="0"
              value={draft.annual_allocation ?? 0}
              onChange={(e) => set('annual_allocation', Number(e.target.value))}
            />
          </Field>
          <Field label={t('leaveTypes.advanceNotice', 'Advance notice (days)')}>
            <Input
              type="number"
              min="0"
              value={draft.minimum_advance_notice_days ?? 1}
              onChange={(e) => set('minimum_advance_notice_days', Number(e.target.value))}
            />
          </Field>
          <Field label={t('leaveTypes.maxConsecutive', 'Max consecutive (days)')}>
            <Input
              type="number"
              min="0"
              value={draft.maximum_consecutive_days ?? ''}
              onChange={(e) =>
                set('maximum_consecutive_days', e.target.value === '' ? null : Number(e.target.value))
              }
            />
          </Field>
        </div>

        <div className="space-y-2">
          <ToggleRow
            label={t('common.paid', 'Paid')}
            checked={!!draft.is_paid}
            onChange={(v) => set('is_paid', v)}
          />
          <ToggleRow
            label={t('leaveTypes.requiresApproval', 'Requires approval')}
            checked={!!draft.requires_approval}
            onChange={(v) => set('requires_approval', v)}
          />
          <ToggleRow
            label={t('leaveTypes.carryForward', 'Carry forward unused days')}
            checked={!!draft.is_carry_forward}
            onChange={(v) => set('is_carry_forward', v)}
          />
          {draft.is_carry_forward && (
            <div className="grid grid-cols-2 gap-3 pl-4">
              <Field label={t('leaveTypes.maxCarryForward', 'Max carry forward')}>
                <Input
                  type="number"
                  min="0"
                  value={draft.maximum_carry_forward_days ?? 0}
                  onChange={(e) => set('maximum_carry_forward_days', Number(e.target.value))}
                />
              </Field>
              <Field label={t('leaveTypes.carryExpiryMonths', 'Expires after (months)')}>
                <Input
                  type="number"
                  min="0"
                  value={draft.carry_forward_expiry_months ?? 3}
                  onChange={(e) => set('carry_forward_expiry_months', Number(e.target.value))}
                />
              </Field>
            </div>
          )}
          <ToggleRow
            label={t('leaveTypes.encashable', 'Encashable')}
            checked={!!draft.is_encashable}
            onChange={(v) => set('is_encashable', v)}
          />
          {draft.is_encashable && (
            <div className="pl-4">
              <Field label={t('leaveTypes.encashmentRate', 'Amount per day')}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.encashment_amount_per_day ?? 0}
                  onChange={(e) => set('encashment_amount_per_day', Number(e.target.value))}
                />
              </Field>
            </div>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
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
    <div className="flex items-center justify-between">
      <Label className="cursor-pointer flex-1">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
