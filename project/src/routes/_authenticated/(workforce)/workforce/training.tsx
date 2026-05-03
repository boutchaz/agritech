import { useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Users, GraduationCap, Building2 } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import { useWorkers } from '@/hooks/useWorkers';
import {
  useBulkEnroll,
  useCreateTrainingProgram,
  useDeleteTrainingProgram,
  useTrainingEnrollments,
  useTrainingPrograms,
  useUpdateEnrollment,
  useUpdateTrainingProgram,
} from '@/hooks/useHrAdvanced';
import type {
  CreateProgramInput,
  EnrollmentStatus,
  Recurrence,
  TrainingEnrollment,
  TrainingProgram,
  TrainingType,
} from '@/lib/api/hr-advanced';
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

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/training')({
  component: withRouteProtection(TrainingPage, 'manage', 'TrainingProgram'),
});

const TYPES: TrainingType[] = ['safety', 'technical', 'certification', 'onboarding', 'other'];
const RECURRENCES: Recurrence[] = ['annual', 'biannual', 'one_time'];
const ENROLLMENT_STATUSES: EnrollmentStatus[] = [
  'enrolled', 'in_progress', 'completed', 'failed', 'cancelled',
];

function TrainingPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;
  const [tab, setTab] = useState<'programs' | 'enrollments'>('programs');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TrainingProgram | null>(null);
  const [enrolling, setEnrolling] = useState<TrainingProgram | null>(null);
  const [editingEnrollment, setEditingEnrollment] = useState<TrainingEnrollment | null>(null);
  const [programFilter, setProgramFilter] = useState<string | 'all'>('all');

  const programs = useTrainingPrograms(orgId, true);
  const enrollments = useTrainingEnrollments(orgId, programFilter === 'all' ? {} : { program_id: programFilter });
  const workers = useWorkers(orgId);
  const create = useCreateTrainingProgram();
  const update = useUpdateTrainingProgram();
  const remove = useDeleteTrainingProgram();
  const bulk = useBulkEnroll();
  const updateEnrollment = useUpdateEnrollment();

  if (!orgId) return null;

  const programList = programs.data ?? [];
  const workerList = (workers.data ?? []).map((w) => ({ id: w.id, name: `${w.first_name} ${w.last_name}` }));

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization?.name ?? '', path: '/dashboard' },
          { icon: Users, label: t('nav.workforce', 'Workforce'), path: '/workforce/employees' },
          { icon: GraduationCap, label: t('training.title', 'Training'), isActive: true },
        ]}
        title={t('training.title', 'Training')}
        subtitle={t('training.subtitle', 'Manage programs (safety, technical, certifications) and worker enrollments.')}
        actions={
          tab === 'programs' ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('training.newProgram', 'New program')}
            </Button>
          ) : undefined
        }
      />
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="programs">{t('training.programs', 'Programs')}</TabsTrigger>
          <TabsTrigger value="enrollments">{t('training.enrollments', 'Enrollments')}</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="mt-4">
          {programs.isLoading ? (
            <Loading />
          ) : !programList.length ? (
            <Empty msg={t('training.noPrograms', 'No training programs yet.')} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {programList.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        {p.name}
                      </CardTitle>
                      <div className="flex gap-1">
                        {p.is_mandatory && <Badge variant="destructive">{t('training.mandatory', 'Required')}</Badge>}
                        {!p.is_active && <Badge variant="secondary">{t('common.inactive', 'Inactive')}</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {p.training_type && <Row label={t('training.type', 'Type')} value={p.training_type} />}
                    {p.provider && <Row label={t('training.provider', 'Provider')} value={p.provider} />}
                    {p.duration_hours != null && <Row label={t('training.duration', 'Duration')} value={`${p.duration_hours}h`} />}
                    {p.cost_per_participant != null && (
                      <Row label={t('training.cost', 'Cost / participant')} value={`${p.cost_per_participant.toLocaleString()} MAD`} />
                    )}
                    {p.recurrence && <Row label={t('training.recurrence', 'Recurrence')} value={p.recurrence} />}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => setEnrolling(p)}>
                        <Users className="w-3 h-3 mr-1" />
                        {t('training.enroll', 'Enroll')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!confirm(t('training.confirmDelete', 'Delete program?'))) return;
                          remove.mutate(
                            { orgId, id: p.id },
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
        </TabsContent>

        <TabsContent value="enrollments" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('training.allPrograms', 'All programs')}</SelectItem>
                {programList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {enrollments.isLoading ? (
            <Loading />
          ) : !enrollments.data?.length ? (
            <Empty msg={t('training.noEnrollments', 'No enrollments yet.')} />
          ) : (
            <div className="space-y-2">
              {enrollments.data.map((e) => (
                <Card
                  key={e.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40"
                  onClick={() => setEditingEnrollment(e)}
                >
                  <CardContent className="py-3 flex items-center justify-between gap-4 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {e.worker?.first_name} {e.worker?.last_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {e.program?.name} · {t('training.enrolled', 'Enrolled')} {e.enrolled_date}
                        {e.completion_date && ` · ${t('training.completed', 'Completed')} ${e.completion_date}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{e.status}</Badge>
                      {e.score != null && <span className="text-xs">{e.score}/100</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {(creating || editing) && (
        <ProgramDialog
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

      {enrolling && (
        <EnrollDialog
          program={enrolling}
          workers={workerList}
          onClose={() => setEnrolling(null)}
          onSubmit={async (worker_ids, enrolled_date) => {
            await bulk.mutateAsync({
              orgId,
              program_id: enrolling.id,
              worker_ids,
              enrolled_date,
            });
            toast.success(t('training.enrolled', 'Enrolled'));
          }}
        />
      )}

      {editingEnrollment && (
        <EnrollmentDialog
          enrollment={editingEnrollment}
          onClose={() => setEditingEnrollment(null)}
          onSubmit={async (data) => {
            await updateEnrollment.mutateAsync({ orgId, id: editingEnrollment.id, data });
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

function ProgramDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial: TrainingProgram | null;
  onClose: () => void;
  onSubmit: (data: CreateProgramInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CreateProgramInput>(() =>
    initial
      ? {
          name: initial.name,
          description: initial.description ?? undefined,
          training_type: initial.training_type ?? undefined,
          provider: initial.provider ?? undefined,
          duration_hours: initial.duration_hours ?? undefined,
          cost_per_participant: initial.cost_per_participant ?? undefined,
          is_mandatory: initial.is_mandatory,
          recurrence: initial.recurrence ?? undefined,
          applicable_worker_types: initial.applicable_worker_types ?? undefined,
        }
      : { name: '', is_mandatory: false },
  );
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateProgramInput>(k: K, v: CreateProgramInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleSubmit = async () => {
    if (!draft.name.trim()) {
      toast.error(t('validation.nameRequired', 'Name required'));
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
      title={initial ? t('training.editProgram', 'Edit program') : t('training.newProgram', 'New program')}
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
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label={t('common.description', 'Description')}>
          <Input
            value={draft.description ?? ''}
            onChange={(e) => set('description', e.target.value || undefined)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('training.type', 'Type')}>
            <Select
              value={draft.training_type ?? '_none'}
              onValueChange={(v) => set('training_type', v === '_none' ? undefined : (v as TrainingType))}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {TYPES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('training.recurrence', 'Recurrence')}>
            <Select
              value={draft.recurrence ?? '_none'}
              onValueChange={(v) => set('recurrence', v === '_none' ? undefined : (v as Recurrence))}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {RECURRENCES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label={t('training.provider', 'Provider')}>
          <Input
            value={draft.provider ?? ''}
            onChange={(e) => set('provider', e.target.value || undefined)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('training.duration', 'Duration (hours)')}>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={draft.duration_hours ?? ''}
              onChange={(e) =>
                set('duration_hours', e.target.value === '' ? undefined : Number(e.target.value))
              }
            />
          </Field>
          <Field label={t('training.cost', 'Cost / participant')}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.cost_per_participant ?? ''}
              onChange={(e) =>
                set('cost_per_participant', e.target.value === '' ? undefined : Number(e.target.value))
              }
            />
          </Field>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="mand"
            type="checkbox"
            checked={!!draft.is_mandatory}
            onChange={(e) => set('is_mandatory', e.target.checked)}
          />
          <Label htmlFor="mand" className="cursor-pointer">
            {t('training.markMandatory', 'Mandatory for applicable workers')}
          </Label>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function EnrollDialog({
  program,
  workers,
  onClose,
  onSubmit,
}: {
  program: TrainingProgram;
  workers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (worker_ids: string[], enrolled_date: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${t('training.enrollIn', 'Enroll in')} ${program.name}`}
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
                await onSubmit(selected, date);
                onClose();
              } catch (err: any) {
                toast.error(err?.message ?? 'Error');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `${t('training.enroll', 'Enroll')} (${selected.length})`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('training.enrolledDate', 'Enrolled date')}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div>
          <Label className="text-sm">{t('training.workers', 'Workers')}</Label>
          <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto mt-2">
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
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function EnrollmentDialog({
  enrollment,
  onClose,
  onSubmit,
}: {
  enrollment: TrainingEnrollment;
  onClose: () => void;
  onSubmit: (data: {
    status?: EnrollmentStatus;
    completion_date?: string;
    score?: number;
    certificate_url?: string;
    feedback?: string;
  }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<EnrollmentStatus>(enrollment.status);
  const [completionDate, setCompletionDate] = useState(enrollment.completion_date ?? '');
  const [score, setScore] = useState<number | undefined>(enrollment.score ?? undefined);
  const [certUrl, setCertUrl] = useState(enrollment.certificate_url ?? '');
  const [feedback, setFeedback] = useState(enrollment.feedback ?? '');
  const [submitting, setSubmitting] = useState(false);

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${enrollment.worker?.first_name} ${enrollment.worker?.last_name} — ${enrollment.program?.name}`}
      size="md"
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
                await onSubmit({
                  status,
                  completion_date: completionDate || undefined,
                  score,
                  certificate_url: certUrl || undefined,
                  feedback: feedback || undefined,
                });
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
        <Field label={t('common.status', 'Status')}>
          <Select value={status} onValueChange={(v) => setStatus(v as EnrollmentStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENROLLMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('training.completionDate', 'Completion date')}>
            <Input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
            />
          </Field>
          <Field label={t('training.score', 'Score (0-100)')}>
            <Input
              type="number"
              min="0"
              max="100"
              value={score ?? ''}
              onChange={(e) => setScore(e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label={t('training.certificateUrl', 'Certificate URL')}>
          <Input value={certUrl} onChange={(e) => setCertUrl(e.target.value)} />
        </Field>
        <Field label={t('training.feedback', 'Feedback')}>
          <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} />
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
