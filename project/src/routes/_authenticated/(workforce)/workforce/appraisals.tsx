import { useMemo, useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Users } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useWorkers } from '@/hooks/useWorkers';
import {
  useAppraisalCycles,
  useAppraisals,
  useBulkCreateAppraisals,
  useCreateCycle,
  useUpdateAppraisal,
  useUpdateCycle,
} from '@/hooks/useHrAdmin';
import type {
  Appraisal,
  AppraisalCycle,
  CreateCycleInput,
  CycleStatus,
  UpdateAppraisalInput,
} from '@/lib/api/hr-admin';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/appraisals')({
  component: withRouteProtection(AppraisalsPage, 'manage', 'AppraisalCycle'),
});

const CYCLE_STATUSES: CycleStatus[] = [
  'draft', 'self_assessment', 'manager_review', 'calibration', 'completed',
];

function AppraisalsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;
  const [tab, setTab] = useState<'cycles' | 'appraisals'>('cycles');
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [editingCycle, setEditingCycle] = useState<AppraisalCycle | null>(null);
  const [bulkAssignCycle, setBulkAssignCycle] = useState<AppraisalCycle | null>(null);
  const [editingAppraisal, setEditingAppraisal] = useState<Appraisal | null>(null);
  const [cycleFilter, setCycleFilter] = useState<string | 'all'>('all');

  const cycles = useAppraisalCycles(orgId);
  const workers = useWorkers(orgId);
  const appraisals = useAppraisals(orgId, cycleFilter === 'all' ? {} : { cycle_id: cycleFilter });
  const createCycle = useCreateCycle();
  const updateCycle = useUpdateCycle();
  const bulkCreate = useBulkCreateAppraisals();
  const updateAppraisal = useUpdateAppraisal();

  if (!orgId) return null;

  const cycleList = cycles.data ?? [];
  const workerList = (workers.data ?? []).map((w) => ({ id: w.id, name: `${w.first_name} ${w.last_name}` }));

  return (
    <>
      <div className="flex justify-end mb-2">{tab === 'cycles' ? (
            <Button onClick={() => setCreatingCycle(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('appraisals.newCycle', 'New cycle')}
            </Button>
          ) : undefined}</div>
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="cycles">{t('appraisals.cycles', 'Cycles')}</TabsTrigger>
          <TabsTrigger value="appraisals">{t('appraisals.appraisals', 'Appraisals')}</TabsTrigger>
        </TabsList>

        <TabsContent value="cycles" className="mt-4">
          {cycles.isLoading ? (
            <Loading />
          ) : !cycleList.length ? (
            <Empty msg={t('appraisals.noCycles', 'No appraisal cycles yet.')} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {cycleList.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">{c.name}</CardTitle>
                      <Badge>{c.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <Row label={t('appraisals.dates', 'Dates')} value={`${c.start_date} → ${c.end_date}`} />
                    {c.self_assessment_deadline && (
                      <Row label={t('appraisals.selfDeadline', 'Self deadline')} value={c.self_assessment_deadline} />
                    )}
                    {c.manager_assessment_deadline && (
                      <Row label={t('appraisals.mgrDeadline', 'Manager deadline')} value={c.manager_assessment_deadline} />
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => setBulkAssignCycle(c)}>
                        <Users className="w-3 h-3 mr-1" />
                        {t('appraisals.assign', 'Assign')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingCycle(c)}>
                        <Pencil className="w-3 h-3 mr-1" />
                        {t('common.edit', 'Edit')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="appraisals" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Select value={cycleFilter} onValueChange={setCycleFilter}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('appraisals.allCycles', 'All cycles')}</SelectItem>
                {cycleList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {appraisals.isLoading ? (
            <Loading />
          ) : !appraisals.data?.length ? (
            <Empty msg={t('appraisals.noAppraisals', 'No appraisals yet.')} />
          ) : (
            <div className="space-y-2">
              {appraisals.data.map((a) => (
                <Card key={a.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40" onClick={() => setEditingAppraisal(a)}>
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {a.worker?.first_name} {a.worker?.last_name}
                        </span>
                        <Badge variant="secondary">{a.status}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {a.cycle?.name}
                        {a.manager && ` · Mgr: ${a.manager.first_name} ${a.manager.last_name}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {a.self_rating != null && <Stat label={t('appraisals.self', 'Self')} value={a.self_rating} />}
                      {a.manager_rating != null && <Stat label={t('appraisals.manager', 'Mgr')} value={a.manager_rating} />}
                      {a.final_score != null && <Stat label={t('appraisals.final', 'Final')} value={a.final_score} highlight />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {(creatingCycle || editingCycle) && (
        <CycleDialog
          initial={editingCycle}
          onClose={() => {
            setCreatingCycle(false);
            setEditingCycle(null);
          }}
          onSubmit={async (data, status) => {
            if (editingCycle) {
              await updateCycle.mutateAsync({ orgId, id: editingCycle.id, data: { ...data, ...(status ? { status } : {}) } });
              toast.success(t('common.saved', 'Saved'));
            } else {
              await createCycle.mutateAsync({ orgId, data });
              toast.success(t('common.created', 'Created'));
            }
          }}
        />
      )}

      {bulkAssignCycle && (
        <BulkAssignDialog
          cycle={bulkAssignCycle}
          workers={workerList}
          onClose={() => setBulkAssignCycle(null)}
          onSubmit={async (worker_ids) => {
            await bulkCreate.mutateAsync({ orgId, cycleId: bulkAssignCycle.id, worker_ids });
            toast.success(t('appraisals.assigned', 'Workers assigned'));
          }}
        />
      )}

      {editingAppraisal && (
        <AppraisalDialog
          appraisal={editingAppraisal}
          managers={workerList}
          onClose={() => setEditingAppraisal(null)}
          onSubmit={async (data) => {
            await updateAppraisal.mutateAsync({ orgId, id: editingAppraisal.id, data });
            toast.success(t('common.saved', 'Saved'));
          }}
        />
      )}
      </div>
    </>
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

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`text-center px-2 ${highlight ? 'text-primary font-semibold' : ''}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div>{Number(value).toFixed(1)}</div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-gray-500">{msg}</CardContent>
    </Card>
  );
}

function CycleDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial: AppraisalCycle | null;
  onClose: () => void;
  onSubmit: (data: CreateCycleInput, status?: CycleStatus) => Promise<void>;
}) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState<CreateCycleInput>(() =>
    initial
      ? {
          name: initial.name,
          description: initial.description ?? undefined,
          start_date: initial.start_date,
          end_date: initial.end_date,
          self_assessment_deadline: initial.self_assessment_deadline ?? undefined,
          manager_assessment_deadline: initial.manager_assessment_deadline ?? undefined,
          applicable_worker_types: initial.applicable_worker_types,
        }
      : {
          name: '',
          start_date: today,
          end_date: today,
          applicable_worker_types: ['fixed_salary'],
        },
  );
  const [status, setStatus] = useState<CycleStatus>(initial?.status ?? 'draft');
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateCycleInput>(k: K, v: CreateCycleInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleSubmit = async () => {
    if (!draft.name.trim()) {
      toast.error(t('validation.nameRequired', 'Name required'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(draft, initial ? status : undefined);
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
      title={initial ? t('appraisals.editCycle', 'Edit cycle') : t('appraisals.newCycle', 'New cycle')}
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
        <Field label={t('common.name', 'Name')}>
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="2026 Annual Review" />
        </Field>
        <Field label={t('common.description', 'Description')}>
          <Input
            value={draft.description ?? ''}
            onChange={(e) => set('description', e.target.value || undefined)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('appraisals.startDate', 'Start date')}>
            <Input type="date" value={draft.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </Field>
          <Field label={t('appraisals.endDate', 'End date')}>
            <Input type="date" value={draft.end_date} onChange={(e) => set('end_date', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('appraisals.selfDeadline', 'Self deadline')}>
            <Input
              type="date"
              value={draft.self_assessment_deadline ?? ''}
              onChange={(e) => set('self_assessment_deadline', e.target.value || undefined)}
            />
          </Field>
          <Field label={t('appraisals.mgrDeadline', 'Manager deadline')}>
            <Input
              type="date"
              value={draft.manager_assessment_deadline ?? ''}
              onChange={(e) => set('manager_assessment_deadline', e.target.value || undefined)}
            />
          </Field>
        </div>
        {initial && (
          <Field label={t('common.status', 'Status')}>
            <Select value={status} onValueChange={(v) => setStatus(v as CycleStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CYCLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>
    </ResponsiveDialog>
  );
}

function BulkAssignDialog({
  cycle,
  workers,
  onClose,
  onSubmit,
}: {
  cycle: AppraisalCycle;
  workers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (worker_ids: string[]) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${t('appraisals.assignTo', 'Assign workers to')} ${cycle.name}`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            disabled={submitting || !selected.length}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onSubmit(selected);
                onClose();
              } catch (err: any) {
                toast.error(err?.message ?? 'Error');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `${t('common.assign', 'Assign')} (${selected.length})`}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto">
        {workers.map((w) => {
          const sel = selected.includes(w.id);
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => toggle(w.id)}
              className={`px-3 py-1.5 rounded-md border text-xs ${
                sel ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input'
              }`}
            >
              {w.name}
            </button>
          );
        })}
      </div>
    </ResponsiveDialog>
  );
}

function AppraisalDialog({
  appraisal,
  managers,
  onClose,
  onSubmit,
}: {
  appraisal: Appraisal;
  managers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (data: UpdateAppraisalInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<UpdateAppraisalInput>({
    self_rating: appraisal.self_rating ?? undefined,
    self_reflections: appraisal.self_reflections ?? undefined,
    manager_id: appraisal.manager_id ?? undefined,
    manager_rating: appraisal.manager_rating ?? undefined,
    manager_feedback: appraisal.manager_feedback ?? undefined,
    final_score: appraisal.final_score ?? undefined,
    final_feedback: appraisal.final_feedback ?? undefined,
    status: appraisal.status,
  });
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof UpdateAppraisalInput>(k: K, v: UpdateAppraisalInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const computedFinal = useMemo(() => {
    if (draft.self_rating != null && draft.manager_rating != null) {
      return Number(((Number(draft.self_rating) + Number(draft.manager_rating) * 2) / 3).toFixed(2));
    }
    return null;
  }, [draft.self_rating, draft.manager_rating]);

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="xl"
      title={`${appraisal.worker?.first_name} ${appraisal.worker?.last_name} — ${appraisal.cycle?.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onSubmit(draft);
                onClose();
              } catch (err: any) {
                toast.error(err?.message ?? 'Error');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save', 'Save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('appraisals.manager', 'Manager')}>
          <Select
            value={draft.manager_id ?? '_none'}
            onValueChange={(v) => set('manager_id', v === '_none' ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">—</SelectItem>
              {managers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="border rounded-md p-3 space-y-2">
          <h3 className="text-sm font-semibold">{t('appraisals.selfSection', 'Self assessment')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('appraisals.selfRating', 'Self rating (0-5)')}>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={draft.self_rating ?? ''}
                onChange={(e) => set('self_rating', e.target.value === '' ? undefined : Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label={t('appraisals.selfReflections', 'Reflections')}>
            <Input
              value={draft.self_reflections ?? ''}
              onChange={(e) => set('self_reflections', e.target.value || undefined)}
            />
          </Field>
        </div>

        <div className="border rounded-md p-3 space-y-2">
          <h3 className="text-sm font-semibold">{t('appraisals.managerSection', 'Manager review')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('appraisals.managerRating', 'Manager rating (0-5)')}>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={draft.manager_rating ?? ''}
                onChange={(e) => set('manager_rating', e.target.value === '' ? undefined : Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label={t('appraisals.managerFeedback', 'Feedback')}>
            <Input
              value={draft.manager_feedback ?? ''}
              onChange={(e) => set('manager_feedback', e.target.value || undefined)}
            />
          </Field>
        </div>

        <div className="border rounded-md p-3 space-y-2 bg-primary/5">
          <h3 className="text-sm font-semibold">{t('appraisals.finalSection', 'Final')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('appraisals.finalScore', 'Final score')}>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                placeholder={computedFinal != null ? `auto: ${computedFinal}` : ''}
                value={draft.final_score ?? ''}
                onChange={(e) => set('final_score', e.target.value === '' ? undefined : Number(e.target.value))}
              />
            </Field>
            <Field label={t('common.status', 'Status')}>
              <Select
                value={draft.status ?? 'pending'}
                onValueChange={(v) => set('status', v as Appraisal['status'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">pending</SelectItem>
                  <SelectItem value="self_assessment">self_assessment</SelectItem>
                  <SelectItem value="manager_review">manager_review</SelectItem>
                  <SelectItem value="completed">completed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label={t('appraisals.finalFeedback', 'Final feedback')}>
            <Input
              value={draft.final_feedback ?? ''}
              onChange={(e) => set('final_feedback', e.target.value || undefined)}
            />
          </Field>
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
