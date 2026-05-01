import { useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Play, Check, ListTodo } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useWorkers } from '@/hooks/useWorkers';
import {
  useCreateOnboardingTemplate,
  useDeleteOnboardingTemplate,
  useOnboardingRecords,
  useOnboardingTemplates,
  useStartOnboarding,
  useUpdateOnboardingRecord,
  useUpdateOnboardingTemplate,
} from '@/hooks/useEmployeeLifecycle';
import { useSyncOnboardingTasks } from '@/hooks/useHrAdvanced';
import type {
  CreateOnboardingTemplateInput,
  OnboardingActivity,
  OnboardingRecord,
  OnboardingRecordActivity,
  OnboardingTemplate,
} from '@/lib/api/employee-lifecycle';
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

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/onboarding')({
  component: withRouteProtection(OnboardingPage, 'manage', 'Onboarding'),
});

function OnboardingPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [tab, setTab] = useState<'records' | 'templates'>('records');
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OnboardingTemplate | null>(null);
  const [starting, setStarting] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<OnboardingRecord | null>(null);

  const templates = useOnboardingTemplates(orgId);
  const records = useOnboardingRecords(orgId);
  const workers = useWorkers(orgId);

  const createTemplate = useCreateOnboardingTemplate();
  const updateTemplate = useUpdateOnboardingTemplate();
  const deleteTemplate = useDeleteOnboardingTemplate();
  const startOnboarding = useStartOnboarding();
  const updateRecord = useUpdateOnboardingRecord();
  const syncTasks = useSyncOnboardingTasks();

  if (!orgId) return null;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('onboarding.title', 'Onboarding')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t(
              'onboarding.subtitle',
              'Build templates of activities, then run them for each new hire.',
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {tab === 'records' && (
            <Button onClick={() => setStarting(true)} disabled={!templates.data?.length}>
              <Play className="w-4 h-4 mr-2" />
              {t('onboarding.start', 'Start onboarding')}
            </Button>
          )}
          {tab === 'templates' && (
            <Button onClick={() => setCreatingTemplate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('onboarding.newTemplate', 'New template')}
            </Button>
          )}
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="records">{t('onboarding.records', 'Active onboardings')}</TabsTrigger>
          <TabsTrigger value="templates">{t('onboarding.templates', 'Templates')}</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4">
          {records.isLoading ? (
            <Loading />
          ) : !records.data?.length ? (
            <Empty msg={t('onboarding.noRecords', 'No active onboardings yet.')} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {records.data.map((r) => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        {r.worker?.first_name} {r.worker?.last_name}
                      </CardTitle>
                      <StatusBadge status={r.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <Row label={t('onboarding.template', 'Template')} value={r.template?.name ?? '—'} />
                    <Row label={t('onboarding.started', 'Started')} value={new Date(r.started_at).toLocaleDateString()} />
                    <Row
                      label={t('onboarding.activities', 'Activities')}
                      value={`${r.activities.filter((a) => a.status === 'completed').length} / ${r.activities.length}`}
                    />
                    <div className="pt-2 flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setViewingRecord(r)}>
                        {t('common.view', 'View')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          syncTasks.mutate(
                            { orgId, recordId: r.id },
                            {
                              onSuccess: (res) =>
                                toast.success(
                                  res.created
                                    ? t('onboarding.tasksCreated', `${res.created} tasks created`)
                                    : t('onboarding.tasksUpToDate', 'Tasks already in sync'),
                                ),
                              onError: (err: any) => toast.error(err?.message ?? 'Error'),
                            },
                          )
                        }
                        disabled={syncTasks.isPending}
                      >
                        <ListTodo className="w-3 h-3 mr-1" />
                        {t('onboarding.syncTasks', 'Sync tasks')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          {templates.isLoading ? (
            <Loading />
          ) : !templates.data?.length ? (
            <Empty msg={t('onboarding.noTemplates', 'No templates yet — create one to start onboardings.')} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {templates.data.map((tpl) => (
                <Card key={tpl.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">{tpl.name}</CardTitle>
                      {tpl.is_active ? (
                        <Badge>{t('common.active', 'Active')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('common.inactive', 'Inactive')}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {tpl.department && <Row label={t('onboarding.department', 'Department')} value={tpl.department} />}
                    {tpl.designation && <Row label={t('onboarding.designation', 'Designation')} value={tpl.designation} />}
                    <Row label={t('onboarding.activitiesCount', 'Activities')} value={String(tpl.activities.length)} />
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(tpl)}>
                        <Pencil className="w-3 h-3 mr-1" />
                        {t('common.edit', 'Edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!confirm(t('onboarding.confirmDelete', 'Delete this template?'))) return;
                          deleteTemplate.mutate(
                            { orgId, id: tpl.id },
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
        </TabsContent>
      </Tabs>

      {(creatingTemplate || editingTemplate) && (
        <TemplateDialog
          initial={editingTemplate}
          onClose={() => {
            setCreatingTemplate(false);
            setEditingTemplate(null);
          }}
          onSubmit={async (data) => {
            if (editingTemplate) {
              await updateTemplate.mutateAsync({ orgId, id: editingTemplate.id, data });
              toast.success(t('common.saved', 'Saved'));
            } else {
              await createTemplate.mutateAsync({ orgId, data });
              toast.success(t('common.created', 'Created'));
            }
          }}
        />
      )}

      {starting && (
        <StartDialog
          templates={templates.data ?? []}
          workers={(workers.data ?? []).map((w) => ({ id: w.id, name: `${w.first_name} ${w.last_name}` }))}
          onClose={() => setStarting(false)}
          onSubmit={async (worker_id, template_id) => {
            await startOnboarding.mutateAsync({ orgId, data: { worker_id, template_id } });
            toast.success(t('common.created', 'Created'));
          }}
        />
      )}

      {viewingRecord && (
        <RecordDialog
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
          onUpdate={async (activities, status) => {
            await updateRecord.mutateAsync({
              orgId,
              id: viewingRecord.id,
              data: { activities, status },
            });
            toast.success(t('common.saved', 'Saved'));
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: OnboardingRecord['status'] }) {
  const variantMap: Record<OnboardingRecord['status'], 'default' | 'secondary' | 'destructive'> = {
    pending: 'secondary',
    in_progress: 'default',
    completed: 'default',
    overdue: 'destructive',
  };
  return <Badge variant={variantMap[status]}>{status}</Badge>;
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right">{value}</span>
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

function TemplateDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial: OnboardingTemplate | null;
  onClose: () => void;
  onSubmit: (data: CreateOnboardingTemplateInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CreateOnboardingTemplateInput>(() =>
    initial
      ? {
          name: initial.name,
          description: initial.description ?? undefined,
          department: initial.department ?? undefined,
          designation: initial.designation ?? undefined,
          activities: initial.activities,
          is_active: initial.is_active,
        }
      : { name: '', activities: [], is_active: true },
  );
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateOnboardingTemplateInput>(
    k: K,
    v: CreateOnboardingTemplateInput[K],
  ) => setDraft((d) => ({ ...d, [k]: v }));

  const addActivity = () =>
    set('activities', [...(draft.activities ?? []), { title: '', duration_days: 1 }]);
  const updateActivity = (i: number, patch: Partial<OnboardingActivity>) =>
    set(
      'activities',
      (draft.activities ?? []).map((a, idx) => (idx === i ? { ...a, ...patch } : a)),
    );
  const removeActivity = (i: number) =>
    set('activities', (draft.activities ?? []).filter((_, idx) => idx !== i));

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
      title={initial ? t('onboarding.editTemplate', 'Edit template') : t('onboarding.newTemplate', 'New template')}
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
          <Field label={t('onboarding.department', 'Department')}>
            <Input
              value={draft.department ?? ''}
              onChange={(e) => set('department', e.target.value || undefined)}
            />
          </Field>
          <Field label={t('onboarding.designation', 'Designation')}>
            <Input
              value={draft.designation ?? ''}
              onChange={(e) => set('designation', e.target.value || undefined)}
            />
          </Field>
        </div>
        <Field label={t('common.description', 'Description')}>
          <Input
            value={draft.description ?? ''}
            onChange={(e) => set('description', e.target.value || undefined)}
          />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>{t('onboarding.activities', 'Activities')}</Label>
            <Button size="sm" variant="outline" onClick={addActivity}>
              <Plus className="w-3 h-3 mr-1" />
              {t('common.add', 'Add')}
            </Button>
          </div>
          <div className="space-y-2">
            {(draft.activities ?? []).map((a, i) => (
              <div key={i} className="flex items-center gap-2 border rounded-md p-2">
                <Input
                  className="flex-1"
                  placeholder={t('onboarding.activityTitle', 'Title (e.g. Issue laptop)')}
                  value={a.title}
                  onChange={(e) => updateActivity(i, { title: e.target.value })}
                />
                <Input
                  className="w-32"
                  placeholder={t('onboarding.role', 'Role')}
                  value={a.role ?? ''}
                  onChange={(e) => updateActivity(i, { role: e.target.value || undefined })}
                />
                <Input
                  className="w-24"
                  type="number"
                  min="1"
                  placeholder="days"
                  value={a.duration_days ?? ''}
                  onChange={(e) =>
                    updateActivity(i, {
                      duration_days: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
                <Button variant="ghost" size="sm" onClick={() => removeActivity(i)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
            {!(draft.activities ?? []).length && (
              <p className="text-xs text-gray-500">
                {t('onboarding.noActivitiesYet', 'No activities yet — add some.')}
              </p>
            )}
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function StartDialog({
  templates,
  workers,
  onClose,
  onSubmit,
}: {
  templates: OnboardingTemplate[];
  workers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (worker_id: string, template_id: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [workerId, setWorkerId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('onboarding.start', 'Start onboarding')}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            disabled={submitting || !workerId || !templateId}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onSubmit(workerId, templateId);
                onClose();
              } catch (err: any) {
                toast.error(err?.message ?? 'Error');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.start', 'Start')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('onboarding.worker', 'Worker')}>
          <Select value={workerId} onValueChange={setWorkerId}>
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
        <Field label={t('onboarding.template', 'Template')}>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder={t('common.select', 'Select')} />
            </SelectTrigger>
            <SelectContent>
              {templates.filter((t) => t.is_active).map((tpl) => (
                <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </ResponsiveDialog>
  );
}

function RecordDialog({
  record,
  onClose,
  onUpdate,
}: {
  record: OnboardingRecord;
  onClose: () => void;
  onUpdate: (activities: OnboardingRecordActivity[], status?: OnboardingRecord['status']) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<OnboardingRecordActivity[]>(record.activities);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (i: number) =>
    setActivities((cur) =>
      cur.map((a, idx) =>
        idx === i
          ? {
              ...a,
              status: a.status === 'completed' ? 'pending' : 'completed',
              completed_date: a.status === 'completed' ? undefined : new Date().toISOString().slice(0, 10),
            }
          : a,
      ),
    );

  const save = async (markComplete?: boolean) => {
    setSubmitting(true);
    try {
      const allDone = activities.every((a) => a.status === 'completed');
      await onUpdate(activities, markComplete && allDone ? 'completed' : undefined);
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
      title={`${record.worker?.first_name} ${record.worker?.last_name} — ${record.template?.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.close', 'Close')}
          </Button>
          <Button onClick={() => save(true)} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save', 'Save')}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {activities.map((a, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-md border ${
              a.status === 'completed' ? 'bg-green-50 dark:bg-green-950/30' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                a.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-gray-300'
              }`}
            >
              {a.status === 'completed' && <Check className="w-3 h-3 text-white" />}
            </button>
            <div className="flex-1">
              <div className={`text-sm ${a.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                {a.title}
              </div>
              {a.due_date && (
                <div className="text-xs text-gray-500">
                  {t('onboarding.due', 'Due')}: {a.due_date}
                </div>
              )}
            </div>
          </div>
        ))}
        {!activities.length && (
          <p className="text-sm text-gray-500 py-4 text-center">
            {t('onboarding.noActivities', 'No activities to track.')}
          </p>
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
