import { useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Bus, Building2, Users } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import { useFarms } from '@/hooks/useParcelsQuery';
import { useWorkers } from '@/hooks/useWorkers';
import {
  useCreateWorkerTransport,
  useDeleteWorkerTransport,
  useUpdateWorkerTransport,
  useWorkerTransport,
} from '@/hooks/useAgroHr';
import type { CreateTransportInput, WorkerTransport } from '@/lib/api/agro-hr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/worker-transport')({
  component: withRouteProtection(WorkerTransportPage, 'manage', 'WorkerTransport'),
});

function WorkerTransportPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<WorkerTransport | null>(null);

  const farms = useFarms(orgId ?? undefined);
  const workers = useWorkers(orgId);
  const query = useWorkerTransport(orgId);
  const create = useCreateWorkerTransport();
  const update = useUpdateWorkerTransport();
  const remove = useDeleteWorkerTransport();

  if (!orgId) return null;

  const items = query.data ?? [];
  const farmList = (farms.data ?? []).map((f) => ({ id: f.id, name: f.name }));
  const workerList = (workers.data ?? []).map((w) => ({ id: w.id, name: `${w.first_name} ${w.last_name}` }));
  const farmName = (id: string) => farmList.find((f) => f.id === id)?.name ?? '—';

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization?.name ?? '', path: '/dashboard' },
          { icon: Users, label: t('nav.workforce', 'Workforce'), path: '/workforce/employees' },
          { icon: Bus, label: t('transport.title', 'Worker Transport'), isActive: true },
        ]}
        title={t('transport.title', 'Worker Transport')}
        subtitle={t('transport.subtitle', 'Schedule pickup runs from villages to farms.')}
        actions={
          <Button onClick={() => setCreating(true)} disabled={!farmList.length}>
            <Plus className="w-4 h-4 mr-2" />
            {t('transport.create', 'New trip')}
          </Button>
        }
      />
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {query.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !items.length ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('transport.empty', 'No transport records yet.')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((tr) => (
            <Card key={tr.id}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Bus className="w-5 h-5 text-gray-400" />
                  <div className="text-sm flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {tr.pickup_location} → {tr.destination}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {tr.date} · {tr.pickup_time.slice(0, 5)} · {farmName(tr.farm_id)}
                      {tr.driver && ` · ${t('transport.driver', 'Driver')}: ${tr.driver.first_name} ${tr.driver.last_name}`}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {tr.actual_count ?? tr.worker_ids.length}
                    {tr.capacity ? `/${tr.capacity}` : ''}
                    {' '}
                    {t('transport.workers', 'workers')}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(tr)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!confirm(t('transport.confirmDelete', 'Delete trip?'))) return;
                      remove.mutate(
                        { orgId, id: tr.id },
                        { onSuccess: () => toast.success(t('common.deleted', 'Deleted')) },
                      );
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <FormDialog
          farms={farmList}
          workers={workerList}
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

function FormDialog({
  farms,
  workers,
  initial,
  onClose,
  onSubmit,
}: {
  farms: Array<{ id: string; name: string }>;
  workers: Array<{ id: string; name: string }>;
  initial: WorkerTransport | null;
  onClose: () => void;
  onSubmit: (data: CreateTransportInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState<CreateTransportInput>(() =>
    initial
      ? {
          farm_id: initial.farm_id,
          date: initial.date,
          vehicle_id: initial.vehicle_id ?? undefined,
          driver_worker_id: initial.driver_worker_id ?? undefined,
          pickup_location: initial.pickup_location,
          pickup_time: initial.pickup_time.slice(0, 5),
          destination: initial.destination,
          worker_ids: initial.worker_ids,
          capacity: initial.capacity ?? undefined,
          actual_count: initial.actual_count ?? undefined,
          notes: initial.notes ?? undefined,
        }
      : {
          farm_id: farms[0]?.id ?? '',
          date: today,
          pickup_location: '',
          pickup_time: '06:30',
          destination: '',
          worker_ids: [],
        },
  );
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateTransportInput>(k: K, v: CreateTransportInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const toggleWorker = (id: string) =>
    setDraft((d) => ({
      ...d,
      worker_ids: d.worker_ids.includes(id) ? d.worker_ids.filter((x) => x !== id) : [...d.worker_ids, id],
    }));

  const handleSubmit = async () => {
    if (!draft.pickup_location.trim() || !draft.destination.trim()) {
      toast.error(t('validation.allRequired', 'All fields required'));
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
      size="lg"
      title={initial ? t('transport.edit', 'Edit trip') : t('transport.create', 'New trip')}
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
          <Field label={t('transport.farm', 'Farm')}>
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
          <Field label={t('transport.date', 'Date')}>
            <Input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('transport.pickup', 'Pickup location')}>
            <Input
              value={draft.pickup_location}
              onChange={(e) => set('pickup_location', e.target.value)}
              placeholder="Village…"
            />
          </Field>
          <Field label={t('transport.pickupTime', 'Pickup time')}>
            <Input type="time" value={draft.pickup_time} onChange={(e) => set('pickup_time', e.target.value)} />
          </Field>
        </div>
        <Field label={t('transport.destination', 'Destination')}>
          <Input
            value={draft.destination}
            onChange={(e) => set('destination', e.target.value)}
            placeholder="Farm gate, parcel…"
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('transport.vehicle', 'Vehicle')}>
            <Input
              value={draft.vehicle_id ?? ''}
              onChange={(e) => set('vehicle_id', e.target.value || undefined)}
              placeholder="Plate / ID"
            />
          </Field>
          <Field label={t('transport.driver', 'Driver')}>
            <Select
              value={draft.driver_worker_id ?? '_none'}
              onValueChange={(v) => set('driver_worker_id', v === '_none' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('transport.capacity', 'Capacity')}>
            <Input
              type="number"
              min="0"
              value={draft.capacity ?? ''}
              onChange={(e) => set('capacity', e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label={t('transport.workers', 'Workers')}>
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
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {draft.worker_ids.length} {t('transport.selected', 'selected')}
          </p>
        </Field>
        <Field label={t('common.notes', 'Notes')}>
          <Input value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} />
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
