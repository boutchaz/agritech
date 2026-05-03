import { useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, AlertCircle, ShieldAlert, Building2, Users, AlertTriangle } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import { useWorkers } from '@/hooks/useWorkers';
import {
  useCreateGrievance,
  useGrievances,
  useUpdateGrievance,
} from '@/hooks/useHrAdvanced';
import type {
  CreateGrievanceInput,
  Grievance,
  GrievancePriority,
  GrievanceStatus,
  GrievanceType,
} from '@/lib/api/hr-advanced';
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

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/grievances')({
  component: withRouteProtection(GrievancesPage, 'manage', 'Grievance'),
});

const TYPES: GrievanceType[] = [
  'workplace', 'colleague', 'department', 'policy', 'harassment', 'safety', 'other',
];
const PRIORITIES: GrievancePriority[] = ['low', 'medium', 'high', 'urgent'];
const STATUSES: GrievanceStatus[] = [
  'submitted', 'acknowledged', 'investigating', 'resolved', 'escalated', 'closed',
];

const PRIORITY_VARIANT: Record<GrievancePriority, 'default' | 'secondary' | 'destructive'> = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
  urgent: 'destructive',
};

function GrievancesPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Grievance | null>(null);
  const [statusFilter, setStatusFilter] = useState<GrievanceStatus | 'all'>('all');

  const workers = useWorkers(orgId);
  const query = useGrievances(orgId, statusFilter === 'all' ? {} : { status: statusFilter });
  const create = useCreateGrievance();
  const update = useUpdateGrievance();

  if (!orgId) return null;

  const items = query.data ?? [];
  const workerList = (workers.data ?? []).map((w) => ({ id: w.id, name: `${w.first_name} ${w.last_name}` }));

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization?.name ?? '', path: '/dashboard' },
          { icon: Users, label: t('nav.workforce', 'Workforce'), path: '/workforce/employees' },
          { icon: AlertTriangle, label: t('grievances.title', 'Grievances'), isActive: true },
        ]}
        title={t('grievances.title', 'Grievances')}
        subtitle={t('grievances.subtitle', 'Confidential channel for worker complaints, harassment, safety concerns.')}
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
            <Button onClick={() => setCreating(true)} disabled={!workerList.length}>
              <Plus className="w-4 h-4 mr-2" />
              {t('grievances.create', 'New grievance')}
            </Button>
          </>
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
            {t('grievances.empty', 'No grievances filed.')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((g) => (
            <Card
              key={g.id}
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40"
              onClick={() => setEditing(g)}
            >
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    {g.priority === 'urgent' && <ShieldAlert className="w-4 h-4 text-red-600" />}
                    <span className="font-medium truncate">{g.subject}</span>
                    <Badge variant={PRIORITY_VARIANT[g.priority]}>{g.priority}</Badge>
                    <Badge variant="secondary">{g.grievance_type}</Badge>
                    <Badge variant="outline">{g.status}</Badge>
                    {g.is_anonymous && <Badge variant="secondary">Anonymous</Badge>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {!g.is_anonymous && g.raised_by && `${g.raised_by.first_name} ${g.raised_by.last_name} · `}
                    {new Date(g.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {creating && (
        <FormDialog
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
        <DetailDialog
          grievance={editing}
          onClose={() => setEditing(null)}
          onUpdate={async (data) => {
            await update.mutateAsync({ orgId, id: editing.id, data });
            toast.success(t('common.saved', 'Saved'));
          }}
        />
      )}
      </div>
    </>
  );
}

function FormDialog({
  workers,
  initial,
  onClose,
  onSubmit,
}: {
  workers: Array<{ id: string; name: string }>;
  initial: Grievance | null;
  onClose: () => void;
  onSubmit: (data: CreateGrievanceInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CreateGrievanceInput>(() =>
    initial
      ? {
          raised_by_worker_id: initial.raised_by_worker_id,
          against_worker_id: initial.against_worker_id ?? undefined,
          against_department: initial.against_department ?? undefined,
          subject: initial.subject,
          description: initial.description,
          grievance_type: initial.grievance_type,
          priority: initial.priority,
          is_anonymous: initial.is_anonymous,
        }
      : {
          raised_by_worker_id: '',
          subject: '',
          description: '',
          grievance_type: 'workplace',
          priority: 'medium',
          is_anonymous: false,
        },
  );
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateGrievanceInput>(k: K, v: CreateGrievanceInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleSubmit = async () => {
    if (!draft.raised_by_worker_id || !draft.subject.trim() || !draft.description.trim()) {
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
      title={t('grievances.create', 'New grievance')}
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
          <Field label={t('grievances.raisedBy', 'Raised by')}>
            <Select value={draft.raised_by_worker_id} onValueChange={(v) => set('raised_by_worker_id', v)}>
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
          <Field label={t('grievances.against', 'Against (worker)')}>
            <Select
              value={draft.against_worker_id ?? '_none'}
              onValueChange={(v) => set('against_worker_id', v === '_none' ? undefined : v)}
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
        </div>
        <Field label={t('grievances.againstDept', 'Against (department)')}>
          <Input
            value={draft.against_department ?? ''}
            onChange={(e) => set('against_department', e.target.value || undefined)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('grievances.type', 'Type')}>
            <Select value={draft.grievance_type} onValueChange={(v) => set('grievance_type', v as GrievanceType)}>
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
          <Field label={t('grievances.priority', 'Priority')}>
            <Select value={draft.priority ?? 'medium'} onValueChange={(v) => set('priority', v as GrievancePriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label={t('grievances.subject', 'Subject')}>
          <Input value={draft.subject} onChange={(e) => set('subject', e.target.value)} />
        </Field>
        <Field label={t('grievances.description', 'Description')}>
          <Input value={draft.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="flex items-center gap-2">
          <input
            id="anon"
            type="checkbox"
            checked={!!draft.is_anonymous}
            onChange={(e) => set('is_anonymous', e.target.checked)}
          />
          <Label htmlFor="anon" className="cursor-pointer">
            {t('grievances.anonymous', 'Anonymous (hide raiser identity)')}
          </Label>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function DetailDialog({
  grievance,
  onClose,
  onUpdate,
}: {
  grievance: Grievance;
  onClose: () => void;
  onUpdate: (data: { status?: GrievanceStatus; resolution?: string; resolution_date?: string }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<GrievanceStatus>(grievance.status);
  const [resolution, setResolution] = useState(grievance.resolution ?? '');
  const [submitting, setSubmitting] = useState(false);

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={grievance.subject}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.close', 'Close')}
          </Button>
          <Button
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onUpdate({
                  status,
                  resolution: resolution || undefined,
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
        <div className="flex flex-wrap gap-2">
          <Badge variant={PRIORITY_VARIANT[grievance.priority]}>{grievance.priority}</Badge>
          <Badge variant="secondary">{grievance.grievance_type}</Badge>
          {grievance.is_anonymous && <Badge>{t('grievances.anonymousBadge', 'Anonymous')}</Badge>}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap border rounded-md p-3">
          {grievance.description}
        </div>
        {!grievance.is_anonymous && grievance.raised_by && (
          <p className="text-xs text-gray-500">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            {t('grievances.raisedBy', 'Raised by')}: {grievance.raised_by.first_name} {grievance.raised_by.last_name}
          </p>
        )}
        <Field label={t('common.status', 'Status')}>
          <Select value={status} onValueChange={(v) => setStatus(v as GrievanceStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('grievances.resolution', 'Resolution')}>
          <Input value={resolution} onChange={(e) => setResolution(e.target.value)} />
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
