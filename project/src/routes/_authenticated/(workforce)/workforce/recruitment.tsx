import { useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Star, MapPin, Video, Phone } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useFarms } from '@/hooks/useParcelsQuery';
import { useWorkers } from '@/hooks/useWorkers';
import {
  useCreateApplicant,
  useCreateInterview,
  useCreateJobOpening,
  useDeleteJobOpening,
  useInterviews,
  useJobApplicants,
  useJobOpenings,
  useUpdateInterview,
  useUpdateJobOpening,
  useUpdateApplicant,
} from '@/hooks/useHrAdmin';
import type {
  ApplicantStatus,
  CreateApplicantInput,
  CreateInterviewInput,
  CreateOpeningInput,
  EmploymentType,
  Interview,
  InterviewFeedbackEntry,
  InterviewStatus,
  InterviewType,
  JobApplicant,
  JobOpening,
  OpeningStatus,
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

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/recruitment')({
  component: withRouteProtection(RecruitmentPage, 'manage', 'JobOpening'),
});

const OPENING_STATUSES: OpeningStatus[] = ['draft', 'open', 'on_hold', 'closed', 'cancelled'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'contract', 'seasonal'];
const APPLICANT_STATUSES: ApplicantStatus[] = [
  'applied', 'screening', 'interview_scheduled', 'interviewed',
  'offered', 'hired', 'rejected', 'withdrawn',
];
const INTERVIEW_TYPES: InterviewType[] = ['phone', 'video', 'in_person'];
const INTERVIEW_STATUSES: InterviewStatus[] = ['scheduled', 'completed', 'cancelled', 'no_show'];

function RecruitmentPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;
  const [tab, setTab] = useState<'openings' | 'applicants' | 'interviews'>('openings');
  const [creatingOpening, setCreatingOpening] = useState(false);
  const [editingOpening, setEditingOpening] = useState<JobOpening | null>(null);
  const [creatingApplicant, setCreatingApplicant] = useState(false);
  const [editingApplicant, setEditingApplicant] = useState<JobApplicant | null>(null);
  const [creatingInterview, setCreatingInterview] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [openingFilter, setOpeningFilter] = useState<string | 'all'>('all');

  const farms = useFarms(orgId ?? undefined);
  const openings = useJobOpenings(orgId);
  const applicants = useJobApplicants(orgId, openingFilter === 'all' ? {} : { job_opening_id: openingFilter });
  const createOpening = useCreateJobOpening();
  const updateOpening = useUpdateJobOpening();
  const deleteOpening = useDeleteJobOpening();
  const createApplicant = useCreateApplicant();
  const updateApplicant = useUpdateApplicant();
  const interviews = useInterviews(orgId);
  const workers = useWorkers(orgId);
  const createInterview = useCreateInterview();
  const updateInterview = useUpdateInterview();

  if (!orgId) return null;

  const farmList = (farms.data ?? []).map((f) => ({ id: f.id, name: f.name }));
  const openingList = openings.data ?? [];

  return (
    <>
      <div className="flex justify-end mb-2">{<>
            {tab === 'openings' && (
              <Button onClick={() => setCreatingOpening(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('recruitment.newOpening', 'New opening')}
              </Button>
            )}
            {tab === 'applicants' && (
              <Button onClick={() => setCreatingApplicant(true)} disabled={!openingList.length}>
                <Plus className="w-4 h-4 mr-2" />
                {t('recruitment.newApplicant', 'New applicant')}
              </Button>
            )}
            {tab === 'interviews' && (
              <Button onClick={() => setCreatingInterview(true)} disabled={!openingList.length}>
                <Plus className="w-4 h-4 mr-2" />
                {t('recruitment.newInterview', 'New interview')}
              </Button>
            )}
          </>}</div>
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="openings">{t('recruitment.openings', 'Openings')}</TabsTrigger>
          <TabsTrigger value="applicants">{t('recruitment.applicants', 'Applicants')}</TabsTrigger>
          <TabsTrigger value="interviews">{t('recruitment.interviews', 'Interviews')}</TabsTrigger>
        </TabsList>

        <TabsContent value="openings" className="mt-4">
          {openings.isLoading ? (
            <Loading />
          ) : !openingList.length ? (
            <Empty msg={t('recruitment.noOpenings', 'No job openings yet.')} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {openingList.map((o) => (
                <Card key={o.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">{o.title}</CardTitle>
                      <Badge>{o.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {o.designation && <Row label={t('recruitment.designation', 'Designation')} value={o.designation} />}
                    {o.employment_type && <Row label={t('recruitment.employmentType', 'Type')} value={o.employment_type} />}
                    <Row label={t('recruitment.vacancies', 'Vacancies')} value={o.vacancies} />
                    <Row label={t('recruitment.applications', 'Applications')} value={o.application_count} />
                    {(o.salary_range_min || o.salary_range_max) && (
                      <Row
                        label={t('recruitment.salary', 'Salary')}
                        value={`${o.salary_range_min ?? '?'} – ${o.salary_range_max ?? '?'} ${o.currency}`}
                      />
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingOpening(o)}>
                        <Pencil className="w-3 h-3 mr-1" />
                        {t('common.edit', 'Edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!confirm(t('recruitment.confirmDeleteOpening', 'Delete opening?'))) return;
                          deleteOpening.mutate(
                            { orgId, id: o.id },
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

        <TabsContent value="applicants" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Select value={openingFilter} onValueChange={setOpeningFilter}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('recruitment.allOpenings', 'All openings')}</SelectItem>
                {openingList.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {applicants.isLoading ? (
            <Loading />
          ) : !applicants.data?.length ? (
            <Empty msg={t('recruitment.noApplicants', 'No applicants yet.')} />
          ) : (
            <div className="space-y-2">
              {applicants.data.map((a) => (
                <Card key={a.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40" onClick={() => setEditingApplicant(a)}>
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{a.first_name} {a.last_name}</span>
                        <Badge variant="secondary">{a.status}</Badge>
                        {a.rating && (
                          <span className="text-xs flex items-center text-amber-600">
                            <Star className="w-3 h-3 mr-0.5 fill-current" />{a.rating}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {a.opening?.title} · {a.source}
                        {a.email && ` · ${a.email}`}
                        {a.phone && ` · ${a.phone}`}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="interviews" className="mt-4">
          {interviews.isLoading ? (
            <Loading />
          ) : !interviews.data?.length ? (
            <Empty msg={t('recruitment.noInterviews', 'No interviews scheduled yet.')} />
          ) : (
            <div className="space-y-2">
              {interviews.data.map((iv) => {
                const applicant = applicants.data?.find((a) => a.id === iv.applicant_id);
                const opening = openingList.find((o) => o.id === iv.job_opening_id);
                return (
                  <Card
                    key={iv.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40"
                    onClick={() => setEditingInterview(iv)}
                  >
                    <CardContent className="py-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">
                            {applicant ? `${applicant.first_name} ${applicant.last_name}` : t('recruitment.unknownApplicant', 'Unknown')}
                          </span>
                          <InterviewStatusBadge status={iv.status} />
                          <InterviewTypeBadge type={iv.interview_type} />
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {opening?.title ?? t('recruitment.unknownOpening', 'Unknown opening')}
                          {' · '}
                          {t('recruitment.round', 'Round {{n}}', { n: iv.round })}
                          {' · '}
                          {new Date(iv.scheduled_at).toLocaleString()}
                          {' · '}
                          {iv.duration_minutes}min
                          {iv.location && ` · ${iv.location}`}
                        </div>
                      </div>
                      {iv.average_rating != null && (
                        <span className="text-xs flex items-center text-amber-600 shrink-0">
                          <Star className="w-3 h-3 mr-0.5 fill-current" />
                          {iv.average_rating.toFixed(1)}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {(creatingOpening || editingOpening) && (
        <OpeningDialog
          farms={farmList}
          initial={editingOpening}
          onClose={() => {
            setCreatingOpening(false);
            setEditingOpening(null);
          }}
          onSubmit={async (data) => {
            if (editingOpening) {
              await updateOpening.mutateAsync({ orgId, id: editingOpening.id, data });
              toast.success(t('common.saved', 'Saved'));
            } else {
              await createOpening.mutateAsync({ orgId, data });
              toast.success(t('common.created', 'Created'));
            }
          }}
        />
      )}

      {(creatingApplicant || editingApplicant) && (
        <ApplicantDialog
          openings={openingList.map((o) => ({ id: o.id, title: o.title }))}
          initial={editingApplicant}
          onClose={() => {
            setCreatingApplicant(false);
            setEditingApplicant(null);
          }}
          onSubmit={async (data, status, rating) => {
            if (editingApplicant) {
              await updateApplicant.mutateAsync({ orgId, id: editingApplicant.id, data: { ...data, status, rating } });
              toast.success(t('common.saved', 'Saved'));
            } else {
              await createApplicant.mutateAsync({ orgId, data });
              toast.success(t('common.created', 'Created'));
            }
          }}
        />
      )}

      {(creatingInterview || editingInterview) && (
        <InterviewDialog
          openings={openingList.map((o) => ({ id: o.id, title: o.title }))}
          applicants={applicants.data ?? []}
          workers={(workers.data ?? []).map((w) => ({ id: w.id, name: `${w.first_name} ${w.last_name}` }))}
          initial={editingInterview}
          onClose={() => {
            setCreatingInterview(false);
            setEditingInterview(null);
          }}
          onSubmit={async (data) => {
            if (editingInterview) {
              await updateInterview.mutateAsync({ orgId, id: editingInterview.id, data });
              toast.success(t('common.saved', 'Saved'));
            } else {
              await createInterview.mutateAsync({ orgId, data });
              toast.success(t('common.created', 'Created'));
            }
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

function OpeningDialog({
  farms,
  initial,
  onClose,
  onSubmit,
}: {
  farms: Array<{ id: string; name: string }>;
  initial: JobOpening | null;
  onClose: () => void;
  onSubmit: (data: CreateOpeningInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CreateOpeningInput>(() =>
    initial
      ? {
          farm_id: initial.farm_id ?? undefined,
          title: initial.title,
          description: initial.description,
          designation: initial.designation ?? undefined,
          department: initial.department ?? undefined,
          employment_type: initial.employment_type ?? undefined,
          vacancies: initial.vacancies,
          salary_range_min: initial.salary_range_min ?? undefined,
          salary_range_max: initial.salary_range_max ?? undefined,
          currency: initial.currency,
          publish_date: initial.publish_date ?? undefined,
          closing_date: initial.closing_date ?? undefined,
          status: initial.status,
          is_published: initial.is_published,
        }
      : { title: '', description: '', vacancies: 1, currency: 'MAD', status: 'draft' },
  );
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateOpeningInput>(k: K, v: CreateOpeningInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleSubmit = async () => {
    if (!draft.title.trim() || !draft.description.trim()) {
      toast.error(t('validation.allRequired', 'Title and description required'));
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
      title={initial ? t('recruitment.editOpening', 'Edit opening') : t('recruitment.newOpening', 'New opening')}
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
        <Field label={t('common.title', 'Title')}>
          <Input value={draft.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label={t('common.description', 'Description')}>
          <Input value={draft.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('recruitment.designation', 'Designation')}>
            <Input
              value={draft.designation ?? ''}
              onChange={(e) => set('designation', e.target.value || undefined)}
            />
          </Field>
          <Field label={t('recruitment.department', 'Department')}>
            <Input
              value={draft.department ?? ''}
              onChange={(e) => set('department', e.target.value || undefined)}
            />
          </Field>
          <Field label={t('recruitment.farm', 'Farm')}>
            <Select
              value={draft.farm_id ?? '_none'}
              onValueChange={(v) => set('farm_id', v === '_none' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('recruitment.employmentType', 'Type')}>
            <Select
              value={draft.employment_type ?? '_none'}
              onValueChange={(v) =>
                set('employment_type', v === '_none' ? undefined : (v as EmploymentType))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {EMPLOYMENT_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('recruitment.vacancies', 'Vacancies')}>
            <Input
              type="number"
              min="1"
              value={draft.vacancies ?? 1}
              onChange={(e) => set('vacancies', Number(e.target.value))}
            />
          </Field>
          <Field label={t('common.status', 'Status')}>
            <Select value={draft.status ?? 'draft'} onValueChange={(v) => set('status', v as OpeningStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPENING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('recruitment.salaryMin', 'Salary min')}>
            <Input
              type="number"
              min="0"
              value={draft.salary_range_min ?? ''}
              onChange={(e) =>
                set('salary_range_min', e.target.value === '' ? undefined : Number(e.target.value))
              }
            />
          </Field>
          <Field label={t('recruitment.salaryMax', 'Salary max')}>
            <Input
              type="number"
              min="0"
              value={draft.salary_range_max ?? ''}
              onChange={(e) =>
                set('salary_range_max', e.target.value === '' ? undefined : Number(e.target.value))
              }
            />
          </Field>
          <Field label={t('common.currency', 'Currency')}>
            <Input
              value={draft.currency ?? 'MAD'}
              onChange={(e) => set('currency', e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('recruitment.publishDate', 'Publish date')}>
            <Input
              type="date"
              value={draft.publish_date ?? ''}
              onChange={(e) => set('publish_date', e.target.value || undefined)}
            />
          </Field>
          <Field label={t('recruitment.closingDate', 'Closing date')}>
            <Input
              type="date"
              value={draft.closing_date ?? ''}
              onChange={(e) => set('closing_date', e.target.value || undefined)}
            />
          </Field>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function ApplicantDialog({
  openings,
  initial,
  onClose,
  onSubmit,
}: {
  openings: Array<{ id: string; title: string }>;
  initial: JobApplicant | null;
  onClose: () => void;
  onSubmit: (
    data: CreateApplicantInput,
    status?: ApplicantStatus,
    rating?: number,
  ) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CreateApplicantInput>(() =>
    initial
      ? {
          job_opening_id: initial.job_opening_id,
          first_name: initial.first_name,
          last_name: initial.last_name,
          email: initial.email ?? undefined,
          phone: initial.phone ?? undefined,
          cin: initial.cin ?? undefined,
          resume_url: initial.resume_url ?? undefined,
          source: initial.source,
          notes: initial.notes ?? undefined,
        }
      : {
          job_opening_id: openings[0]?.id ?? '',
          first_name: '',
          last_name: '',
          source: 'direct',
        },
  );
  const [status, setStatus] = useState<ApplicantStatus>(initial?.status ?? 'applied');
  const [rating, setRating] = useState<number | undefined>(initial?.rating ?? undefined);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateApplicantInput>(k: K, v: CreateApplicantInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleSubmit = async () => {
    if (!draft.first_name.trim() || !draft.last_name.trim() || !draft.job_opening_id) {
      toast.error(t('validation.allRequired', 'Name + opening required'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(draft, status, rating);
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
      title={initial ? t('recruitment.editApplicant', 'Edit applicant') : t('recruitment.newApplicant', 'New applicant')}
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
        <Field label={t('recruitment.opening', 'Opening')}>
          <Select value={draft.job_opening_id} onValueChange={(v) => set('job_opening_id', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {openings.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('recruitment.firstName', 'First name')}>
            <Input value={draft.first_name} onChange={(e) => set('first_name', e.target.value)} />
          </Field>
          <Field label={t('recruitment.lastName', 'Last name')}>
            <Input value={draft.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('common.email', 'Email')}>
            <Input value={draft.email ?? ''} onChange={(e) => set('email', e.target.value || undefined)} />
          </Field>
          <Field label={t('common.phone', 'Phone')}>
            <Input value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value || undefined)} />
          </Field>
          <Field label="CIN">
            <Input value={draft.cin ?? ''} onChange={(e) => set('cin', e.target.value || undefined)} />
          </Field>
        </div>
        <Field label={t('recruitment.resumeUrl', 'Resume URL')}>
          <Input
            value={draft.resume_url ?? ''}
            onChange={(e) => set('resume_url', e.target.value || undefined)}
          />
        </Field>
        {initial && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('recruitment.applicantStatus', 'Status')}>
              <Select value={status} onValueChange={(v) => setStatus(v as ApplicantStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLICANT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('recruitment.rating', 'Rating (1-5)')}>
              <Input
                type="number"
                min="1"
                max="5"
                value={rating ?? ''}
                onChange={(e) => setRating(e.target.value === '' ? undefined : Number(e.target.value))}
              />
            </Field>
          </div>
        )}
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

function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  const { t } = useTranslation();
  const map: Record<InterviewStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    scheduled: 'default',
    completed: 'secondary',
    cancelled: 'destructive',
    no_show: 'outline',
  };
  return <Badge variant={map[status]}>{t(`recruitment.interviewStatus.${status}`, status)}</Badge>;
}

function InterviewTypeBadge({ type }: { type: InterviewType }) {
  const { t } = useTranslation();
  const icons: Record<InterviewType, ReactNode> = {
    phone: <Phone className="w-3 h-3" />,
    video: <Video className="w-3 h-3" />,
    in_person: <MapPin className="w-3 h-3" />,
  };
  return (
    <Badge variant="outline" className="gap-1">
      {icons[type]}
      {t(`recruitment.interviewType.${type}`, type.replace('_', ' '))}
    </Badge>
  );
}

function InterviewDialog({
  openings,
  applicants,
  workers,
  initial,
  onClose,
  onSubmit,
}: {
  openings: Array<{ id: string; title: string }>;
  applicants: JobApplicant[];
  workers: Array<{ id: string; name: string }>;
  initial: Interview | null;
  onClose: () => void;
  onSubmit: (data: Partial<CreateInterviewInput> & { status?: InterviewStatus; feedback?: InterviewFeedbackEntry[] }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Partial<CreateInterviewInput> & { status?: InterviewStatus }>(() =>
    initial
      ? {
          applicant_id: initial.applicant_id,
          job_opening_id: initial.job_opening_id,
          round: initial.round,
          interview_type: initial.interview_type,
          scheduled_at: initial.scheduled_at.slice(0, 16),
          duration_minutes: initial.duration_minutes,
          location: initial.location ?? undefined,
          interviewer_ids: initial.interviewer_ids,
          status: initial.status,
        }
      : {
          round: 1,
          interview_type: 'in_person',
          scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
          duration_minutes: 60,
          interviewer_ids: [],
        },
  );
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const toggleInterviewer = (id: string) => {
    const current = draft.interviewer_ids ?? [];
    set(
      'interviewer_ids',
      current.includes(id) ? current.filter((i) => i !== id) : [...current.slice(0, 9), id],
    );
  };

  const handleSubmit = async () => {
    if (!draft.applicant_id || !draft.job_opening_id || !draft.scheduled_at) {
      toast.error(t('recruitment.interviewRequired', 'Applicant, opening, and date are required'));
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
      title={initial ? t('recruitment.editInterview', 'Edit interview') : t('recruitment.newInterview', 'New interview')}
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
          <Field label={t('recruitment.opening', 'Opening')}>
            <Select value={draft.job_opening_id ?? ''} onValueChange={(v) => set('job_opening_id', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {openings.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('recruitment.applicant', 'Applicant')}>
            <Select value={draft.applicant_id ?? ''} onValueChange={(v) => set('applicant_id', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {applicants.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('recruitment.interviewRound', 'Round')}>
            <Input
              type="number"
              min={1}
              value={draft.round ?? 1}
              onChange={(e) => set('round', Number(e.target.value))}
            />
          </Field>
          <Field label={t('recruitment.interviewType', 'Type')}>
            <Select value={draft.interview_type ?? 'in_person'} onValueChange={(v) => set('interview_type', v as InterviewType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('recruitment.duration', 'Duration (min)')}>
            <Input
              type="number"
              min={15}
              value={draft.duration_minutes ?? 60}
              onChange={(e) => set('duration_minutes', Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('recruitment.scheduledAt', 'Scheduled at')}>
            <Input
              type="datetime-local"
              value={draft.scheduled_at ?? ''}
              onChange={(e) => set('scheduled_at', e.target.value)}
            />
          </Field>
          <Field label={t('recruitment.location', 'Location')}>
            <Input
              value={draft.location ?? ''}
              onChange={(e) => set('location', e.target.value || undefined)}
              placeholder={t('recruitment.locationPlaceholder', 'Room, link, address...')}
            />
          </Field>
        </div>
        {initial && (
          <Field label={t('common.status', 'Status')}>
            <Select value={draft.status ?? 'scheduled'} onValueChange={(v) => set('status', v as InterviewStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label={t('recruitment.interviewers', 'Interviewers (max 10)')}>
          <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto border rounded-md p-2">
            {workers.map((w) => (
              <label key={w.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={(draft.interviewer_ids ?? []).includes(w.id)}
                  onChange={() => toggleInterviewer(w.id)}
                  className="rounded"
                />
                <span className="truncate">{w.name}</span>
              </label>
            ))}
          </div>
        </Field>
      </div>
    </ResponsiveDialog>
  );
}
