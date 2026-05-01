import { useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import {
  useCreateShift,
  useDeleteShift,
  useShifts,
  useUpdateShift,
} from '@/hooks/useShifts';
import type { CreateShiftInput, Shift } from '@/lib/api/shifts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/shifts')({
  component: withRouteProtection(ShiftsPage, 'manage', 'Shift'),
});

function ShiftsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [editing, setEditing] = useState<Shift | null>(null);
  const [creating, setCreating] = useState(false);

  const query = useShifts(orgId);
  const create = useCreateShift();
  const update = useUpdateShift();
  const remove = useDeleteShift();

  if (!orgId) return null;

  const shifts = query.data ?? [];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('shifts.title', 'Shifts')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t(
              'shifts.subtitle',
              'Define daily working schedules — start/end time, grace period, auto-attendance rules.',
            )}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('common.create', 'Create')}
        </Button>
      </header>

      {query.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : shifts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('shifts.empty', 'No shifts yet — create one to start scheduling.')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shifts.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: s.color }} />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  {s.is_active ? (
                    <Badge>{t('common.active', 'Active')}</Badge>
                  ) : (
                    <Badge variant="secondary">{t('common.inactive', 'Inactive')}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row
                  label={<span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t('shifts.timing', 'Timing')}</span>}
                  value={`${s.start_time.slice(0,5)} → ${s.end_time.slice(0,5)} (${s.working_hours}h)`}
                />
                <Row
                  label={t('shifts.gracePeriod', 'Grace period')}
                  value={`${s.grace_period_minutes} min`}
                />
                <Row
                  label={t('shifts.autoAttendance', 'Auto attendance')}
                  value={s.enable_auto_attendance ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled')}
                />
                {s.description && (
                  <p className="text-xs text-gray-500 pt-1">{s.description}</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                    <Pencil className="w-3 h-3 mr-1" />
                    {t('common.edit', 'Edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!confirm(t('shifts.confirmDelete', 'Delete this shift?'))) return;
                      remove.mutate(
                        { orgId, id: s.id },
                        { onSuccess: () => toast.success(t('common.deleted', 'Deleted')) },
                      );
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {t('common.delete', 'Delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ShiftFormDialog
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
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

function ShiftFormDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial: Shift | null;
  onClose: () => void;
  onSubmit: (data: CreateShiftInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CreateShiftInput>(() =>
    initial
      ? {
          name: initial.name,
          description: initial.description ?? undefined,
          start_time: initial.start_time.slice(0, 5),
          end_time: initial.end_time.slice(0, 5),
          grace_period_minutes: initial.grace_period_minutes,
          enable_auto_attendance: initial.enable_auto_attendance,
          mark_late_after_minutes: initial.mark_late_after_minutes ?? undefined,
          early_exit_before_minutes: initial.early_exit_before_minutes ?? undefined,
          is_active: initial.is_active,
          color: initial.color,
        }
      : {
          name: '',
          start_time: '08:00',
          end_time: '17:00',
          grace_period_minutes: 15,
          enable_auto_attendance: false,
          is_active: true,
          color: '#3B82F6',
        },
  );
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateShiftInput>(key: K, value: CreateShiftInput[K]) =>
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
      size="lg"
      title={initial ? t('shifts.edit', 'Edit shift') : t('shifts.create', 'Create shift')}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={t('common.name', 'Name')}>
            <Input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Morning, Day, Night..." />
          </Field>
          <Field label={t('shifts.color', 'Color')}>
            <div className="flex gap-1 items-center h-9">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-full border-2 ${draft.color === c ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </Field>
        </div>

        <Field label={t('common.description', 'Description')}>
          <Input
            value={draft.description ?? ''}
            onChange={(e) => set('description', e.target.value || undefined)}
          />
        </Field>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label={t('shifts.startTime', 'Start time')}>
            <Input
              type="time"
              value={draft.start_time}
              onChange={(e) => set('start_time', e.target.value)}
            />
          </Field>
          <Field label={t('shifts.endTime', 'End time')}>
            <Input
              type="time"
              value={draft.end_time}
              onChange={(e) => set('end_time', e.target.value)}
            />
          </Field>
          <Field label={t('shifts.gracePeriodMinutes', 'Grace period (min)')}>
            <Input
              type="number"
              min="0"
              value={draft.grace_period_minutes ?? 0}
              onChange={(e) => set('grace_period_minutes', Number(e.target.value))}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <ToggleRow
            label={t('shifts.enableAutoAttendance', 'Enable auto-attendance')}
            checked={!!draft.enable_auto_attendance}
            onChange={(v) => set('enable_auto_attendance', v)}
          />
          {draft.enable_auto_attendance && (
            <div className="grid grid-cols-2 gap-3 pl-4">
              <Field label={t('shifts.markLateAfter', 'Mark late after (min)')}>
                <Input
                  type="number"
                  min="0"
                  value={draft.mark_late_after_minutes ?? ''}
                  onChange={(e) =>
                    set('mark_late_after_minutes', e.target.value === '' ? undefined : Number(e.target.value))
                  }
                />
              </Field>
              <Field label={t('shifts.earlyExitBefore', 'Early exit before (min)')}>
                <Input
                  type="number"
                  min="0"
                  value={draft.early_exit_before_minutes ?? ''}
                  onChange={(e) =>
                    set('early_exit_before_minutes', e.target.value === '' ? undefined : Number(e.target.value))
                  }
                />
              </Field>
            </div>
          )}
          <ToggleRow
            label={t('common.active', 'Active')}
            checked={!!draft.is_active}
            onChange={(v) => set('is_active', v)}
          />
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
