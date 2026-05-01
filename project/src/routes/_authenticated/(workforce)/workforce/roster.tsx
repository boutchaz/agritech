import { useMemo, useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, X, Check } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useWorkers } from '@/hooks/useWorkers';
import {
  useCreateAssignment,
  useDeactivateAssignment,
  useResolveShiftRequest,
  useShiftAssignments,
  useShiftRequests,
  useShifts,
} from '@/hooks/useShifts';
import type { CreateAssignmentInput, Shift } from '@/lib/api/shifts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/roster')({
  component: withRouteProtection(RosterPage, 'manage', 'ShiftAssignment'),
});

const WEEKDAYS = [
  { v: 1, k: 'mon' },
  { v: 2, k: 'tue' },
  { v: 3, k: 'wed' },
  { v: 4, k: 'thu' },
  { v: 5, k: 'fri' },
  { v: 6, k: 'sat' },
  { v: 0, k: 'sun' },
];

function RosterPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<'assignments' | 'requests'>('assignments');

  const shifts = useShifts(orgId);
  const workers = useWorkers(orgId);
  const assignments = useShiftAssignments(orgId, { status: 'active' });
  const requests = useShiftRequests(orgId, { status: 'pending' });
  const createAssignment = useCreateAssignment();
  const deactivateAssignment = useDeactivateAssignment();
  const resolveRequest = useResolveShiftRequest();

  const shiftMap = useMemo(() => {
    const m = new Map<string, Shift>();
    (shifts.data ?? []).forEach((s) => m.set(s.id, s));
    return m;
  }, [shifts.data]);

  if (!orgId) return null;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('roster.title', 'Roster')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t(
              'roster.subtitle',
              'Assign workers to shifts. Manage shift change requests.',
            )}
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={!shifts.data?.length || !workers.data?.length}>
          <Plus className="w-4 h-4 mr-2" />
          {t('roster.assign', 'Assign shift')}
        </Button>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="assignments">
            {t('roster.assignments', 'Assignments')}
            {assignments.data?.length ? (
              <Badge variant="secondary" className="ml-2">{assignments.data.length}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="requests">
            {t('roster.requests', 'Pending requests')}
            {requests.data?.length ? (
              <Badge className="ml-2">{requests.data.length}</Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-4">
          {assignments.isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : !assignments.data?.length ? (
            <Card>
              <CardContent className="py-10 text-center text-gray-500">
                {t('roster.noAssignments', 'No active shift assignments yet.')}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {assignments.data.map((a) => {
                const shift = shiftMap.get(a.shift_id);
                return (
                  <Card key={a.id} className="overflow-hidden">
                    <div className="h-1" style={{ backgroundColor: shift?.color ?? '#999' }} />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm">
                          {a.worker?.first_name} {a.worker?.last_name}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!confirm(t('roster.confirmEnd', 'End this assignment?'))) return;
                            deactivateAssignment.mutate(
                              { orgId, id: a.id },
                              { onSuccess: () => toast.success(t('common.deactivated', 'Deactivated')) },
                            );
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <Row label={t('roster.shift', 'Shift')} value={shift?.name ?? '—'} />
                      <Row
                        label={t('roster.timing', 'Timing')}
                        value={shift ? `${shift.start_time.slice(0,5)} – ${shift.end_time.slice(0,5)}` : '—'}
                      />
                      <Row
                        label={t('roster.from', 'From')}
                        value={a.effective_from}
                      />
                      {a.effective_to && (
                        <Row label={t('roster.to', 'To')} value={a.effective_to} />
                      )}
                      {a.is_recurring && (
                        <Row
                          label={t('roster.recurring', 'Recurring')}
                          value={a.recurring_days
                            .map((d) => t(`weekday.${WEEKDAYS.find((w) => w.v === d)?.k ?? d}`, WEEKDAYS.find((w) => w.v === d)?.k ?? '?'))
                            .join(', ')}
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          {requests.isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : !requests.data?.length ? (
            <Card>
              <CardContent className="py-10 text-center text-gray-500">
                {t('roster.noRequests', 'No pending shift requests.')}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {requests.data.map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div className="text-sm">
                      <div className="font-medium">
                        {r.worker?.first_name} {r.worker?.last_name}
                      </div>
                      <div className="text-gray-500">
                        {r.date} — {r.current_shift?.name ?? '—'} → <strong>{r.requested_shift?.name}</strong>
                      </div>
                      {r.reason && <div className="text-xs text-gray-500 mt-1">{r.reason}</div>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          resolveRequest.mutate(
                            { orgId, id: r.id, status: 'rejected' },
                            { onSuccess: () => toast.success(t('common.rejected', 'Rejected')) },
                          )
                        }
                      >
                        <X className="w-3 h-3 mr-1" />
                        {t('common.reject', 'Reject')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          resolveRequest.mutate(
                            { orgId, id: r.id, status: 'approved' },
                            { onSuccess: () => toast.success(t('common.approved', 'Approved')) },
                          )
                        }
                      >
                        <Check className="w-3 h-3 mr-1" />
                        {t('common.approve', 'Approve')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {creating && (
        <AssignmentDialog
          orgId={orgId}
          shifts={shifts.data ?? []}
          workers={(workers.data ?? []).map((w) => ({
            id: w.id,
            name: `${w.first_name} ${w.last_name}`,
          }))}
          onClose={() => setCreating(false)}
          onSubmit={async (data) => {
            await createAssignment.mutateAsync({ orgId, data });
            toast.success(t('common.created', 'Created'));
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function AssignmentDialog({
  orgId: _orgId,
  shifts,
  workers,
  onClose,
  onSubmit,
}: {
  orgId: string;
  shifts: Shift[];
  workers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (data: CreateAssignmentInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CreateAssignmentInput>({
    worker_id: '',
    shift_id: '',
    effective_from: new Date().toISOString().slice(0, 10),
    is_recurring: false,
    recurring_days: [1, 2, 3, 4, 5],
  });
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateAssignmentInput>(k: K, v: CreateAssignmentInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const toggleDay = (day: number) =>
    setDraft((d) => {
      const cur = d.recurring_days ?? [];
      return {
        ...d,
        recurring_days: cur.includes(day) ? cur.filter((x) => x !== day) : [...cur, day].sort(),
      };
    });

  const handleSubmit = async () => {
    if (!draft.worker_id || !draft.shift_id || !draft.effective_from) {
      toast.error(t('validation.allRequired', 'All required fields must be filled'));
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
      title={t('roster.assign', 'Assign shift')}
      size="lg"
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
        <Field label={t('roster.worker', 'Worker')}>
          <Select value={draft.worker_id} onValueChange={(v) => set('worker_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder={t('common.select', 'Select')} />
            </SelectTrigger>
            <SelectContent>
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={t('roster.shift', 'Shift')}>
          <Select value={draft.shift_id} onValueChange={(v) => set('shift_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder={t('common.select', 'Select')} />
            </SelectTrigger>
            <SelectContent>
              {shifts.filter((s) => s.is_active).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('roster.effectiveFrom', 'Effective from')}>
            <Input
              type="date"
              value={draft.effective_from}
              onChange={(e) => set('effective_from', e.target.value)}
            />
          </Field>
          <Field label={t('roster.effectiveTo', 'Effective to (optional)')}>
            <Input
              type="date"
              value={draft.effective_to ?? ''}
              onChange={(e) => set('effective_to', e.target.value || undefined)}
            />
          </Field>
        </div>

        <div className="flex items-center justify-between">
          <Label className="cursor-pointer flex-1">{t('roster.recurring', 'Recurring')}</Label>
          <Switch
            checked={!!draft.is_recurring}
            onCheckedChange={(v) => set('is_recurring', v)}
          />
        </div>

        {draft.is_recurring && (
          <div>
            <Label className="text-sm">{t('roster.weekdays', 'Weekdays')}</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {WEEKDAYS.map((d) => {
                const sel = (draft.recurring_days ?? []).includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => toggleDay(d.v)}
                    className={`px-3 py-1.5 rounded-md border text-xs ${
                      sel
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input'
                    }`}
                  >
                    {t(`weekday.${d.k}`, d.k)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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

