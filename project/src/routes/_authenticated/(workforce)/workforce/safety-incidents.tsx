import { useMemo, useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, AlertTriangle, ListTodo, Building2, Users } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import { useFarms } from '@/hooks/useParcelsQuery';
import { useWorkers } from '@/hooks/useWorkers';
import {
  useCreateSafetyIncident,
  useSafetyIncidents,
  useUpdateSafetyIncident,
} from '@/hooks/useAgroHr';
import { useSyncSafetyTasks } from '@/hooks/useHrAdvanced';
import type {
  CreateIncidentInput,
  IncidentStatus,
  IncidentType,
  SafetyIncident,
  Severity,
} from '@/lib/api/agro-hr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/safety-incidents')({
  component: withRouteProtection(SafetyIncidentsPage, 'manage', 'SafetyIncident'),
});

const TYPES: IncidentType[] = [
  'injury', 'near_miss', 'chemical_exposure', 'equipment_damage', 'fire', 'environmental', 'other',
];
const SEVERITIES: Severity[] = ['minor', 'moderate', 'serious', 'fatal'];
const STATUSES: IncidentStatus[] = ['reported', 'investigating', 'resolved', 'closed'];

const SEVERITY_VARIANT: Record<Severity, 'default' | 'secondary' | 'destructive'> = {
  minor: 'secondary',
  moderate: 'default',
  serious: 'destructive',
  fatal: 'destructive',
};

function SafetyIncidentsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SafetyIncident | null>(null);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');

  const farms = useFarms(orgId ?? undefined);
  const workers = useWorkers(orgId);
  const query = useSafetyIncidents(orgId, statusFilter === 'all' ? {} : { status: statusFilter });
  const create = useCreateSafetyIncident();
  const update = useUpdateSafetyIncident();
  const syncTasks = useSyncSafetyTasks();

  const items = query.data ?? [];
  const farmList = (farms.data ?? []).map((f) => ({ id: f.id, name: f.name }));
  const workerList = (workers.data ?? []).map((w) => ({ id: w.id, name: `${w.first_name} ${w.last_name}` }));

  const stats = useMemo(() => {
    const total = items.length;
    const open = items.filter((i) => i.status !== 'closed').length;
    const serious = items.filter((i) => i.severity === 'serious' || i.severity === 'fatal').length;
    return { total, open, serious };
  }, [items]);

  if (!orgId) return null;

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization?.name ?? '', path: '/dashboard' },
          { icon: Users, label: t('nav.workforce', 'Workforce'), path: '/workforce/employees' },
          { icon: AlertTriangle, label: t('safety.title', 'Safety Incidents'), isActive: true },
        ]}
        title={t('safety.title', 'Safety Incidents')}
        subtitle={t('safety.subtitle', 'Log injuries, near-misses, chemical exposure. Track CNSS declarations.')}
        actions={
          <>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setCreating(true)} disabled={!farmList.length || !workerList.length}>
              <Plus className="w-4 h-4 mr-2" />
              {t('safety.report', 'Report incident')}
            </Button>
          </>
        }
      />
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t('safety.total', 'Total')} value={stats.total} />
        <StatCard label={t('safety.open', 'Open')} value={stats.open} />
        <StatCard label={t('safety.serious', 'Serious / fatal')} value={stats.serious} accent />
      </div>

      {query.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !items.length ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('safety.empty', 'No incidents recorded.')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <Card key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant={SEVERITY_VARIANT[i.severity]}>
                      {i.severity === 'fatal' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {i.severity}
                    </Badge>
                    <Badge variant="secondary">{i.incident_type}</Badge>
                    <Badge variant="outline">{i.status}</Badge>
                    {i.cnss_declaration && <Badge>CNSS</Badge>}
                  </div>
                  <div className="text-sm font-medium mt-1 truncate">{i.description}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(i.incident_date).toLocaleString()} · {i.worker_ids.length} {t('safety.workers', 'workers')}
                    {Array.isArray(i.corrective_actions) && i.corrective_actions.length > 0 && (
                      <> · {i.corrective_actions.length} {t('safety.actions', 'actions')}</>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      syncTasks.mutate(
                        { orgId, incidentId: i.id },
                        {
                          onSuccess: (res) =>
                            toast.success(
                              res.created
                                ? t('safety.tasksCreated', `${res.created} tasks created`)
                                : t('safety.tasksUpToDate', 'Tasks already in sync'),
                            ),
                          onError: (err: any) => toast.error(err?.message ?? 'Error'),
                        },
                      )
                    }
                    disabled={syncTasks.isPending || !Array.isArray(i.corrective_actions) || i.corrective_actions.length === 0}
                    title={t('safety.syncTasks', 'Sync corrective actions to tasks')}
                  >
                    <ListTodo className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(i)}>
                    {t('common.edit', 'Edit')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {creating && (
        <FormDialog
          farms={farmList}
          workers={workerList}
          initial={null}
          onClose={() => setCreating(false)}
          onSubmit={async (data) => {
            await create.mutateAsync({ orgId, data });
            toast.success(t('common.created', 'Created'));
          }}
        />
      )}

      {editing && (
        <FormDialog
          farms={farmList}
          workers={workerList}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            await update.mutateAsync({ orgId, id: editing.id, data });
            toast.success(t('common.saved', 'Saved'));
          }}
        />
      )}
      </div>
    </>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-gray-500 font-normal">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${accent ? 'text-red-600' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function FormDialog({
  farms,
  workers,
  initial,
  onClose,
  onSubmit,
}: {
  farms: Array<{ id: string; name: string }>;
  workers: Array<{ id: string; name: string }>;
  initial: SafetyIncident | null;
  onClose: () => void;
  onSubmit: (data: CreateIncidentInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CreateIncidentInput>(() =>
    initial
      ? {
          farm_id: initial.farm_id,
          parcel_id: initial.parcel_id ?? undefined,
          incident_date: initial.incident_date,
          incident_type: initial.incident_type,
          severity: initial.severity,
          worker_ids: initial.worker_ids,
          supervisor_id: initial.supervisor_id ?? undefined,
          description: initial.description,
          location_description: initial.location_description ?? undefined,
          root_cause: initial.root_cause ?? undefined,
          corrective_actions: initial.corrective_actions,
          preventive_measures: initial.preventive_measures ?? undefined,
        }
      : {
          farm_id: farms[0]?.id ?? '',
          incident_date: new Date().toISOString().slice(0, 16),
          incident_type: 'injury',
          severity: 'minor',
          worker_ids: [],
          description: '',
          corrective_actions: [],
        },
  );
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateIncidentInput>(k: K, v: CreateIncidentInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const toggleWorker = (id: string) =>
    setDraft((d) => ({
      ...d,
      worker_ids: d.worker_ids.includes(id) ? d.worker_ids.filter((x) => x !== id) : [...d.worker_ids, id],
    }));

  const handleSubmit = async () => {
    if (!draft.description.trim() || !draft.worker_ids.length) {
      toast.error(t('safety.validationFailed', 'Description and at least one worker required'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(draft);
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="xl"
      title={initial ? t('safety.edit', 'Edit incident') : t('safety.report', 'Report incident')}
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
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('safety.farm', 'Farm')}>
            <Select value={draft.farm_id} onValueChange={(v) => set('farm_id', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('safety.date', 'Date / time')}>
            <Input
              type="datetime-local"
              value={draft.incident_date.slice(0, 16)}
              onChange={(e) => set('incident_date', e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('safety.type', 'Type')}>
            <Select value={draft.incident_type} onValueChange={(v) => set('incident_type', v as IncidentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('safety.severity', 'Severity')}>
            <Select value={draft.severity} onValueChange={(v) => set('severity', v as Severity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label={t('safety.description', 'Description')}>
          <Input value={draft.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label={t('safety.workers', 'Workers involved')}>
          <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto border rounded-md p-2">
            {workers.map((w) => {
              const sel = draft.worker_ids.includes(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggleWorker(w.id)}
                  className={`px-2 py-1 rounded text-xs border ${
                    sel ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input'
                  }`}
                >
                  {w.name}
                </button>
              );
            })}
            {!workers.length && (
              <span className="text-xs text-gray-500">{t('safety.noWorkers', 'No workers available.')}</span>
            )}
          </div>
        </Field>
        <Field label={t('safety.location', 'Location')}>
          <Input
            value={draft.location_description ?? ''}
            onChange={(e) => set('location_description', e.target.value || undefined)}
          />
        </Field>
        <Field label={t('safety.rootCause', 'Root cause')}>
          <Input
            value={draft.root_cause ?? ''}
            onChange={(e) => set('root_cause', e.target.value || undefined)}
          />
        </Field>
        <Field label={t('safety.preventive', 'Preventive measures')}>
          <Input
            value={draft.preventive_measures ?? ''}
            onChange={(e) => set('preventive_measures', e.target.value || undefined)}
          />
        </Field>
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
