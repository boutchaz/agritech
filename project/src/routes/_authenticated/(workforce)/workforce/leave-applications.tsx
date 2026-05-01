import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Check, X, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useWorkers } from '@/hooks/useWorkers';
import {
  useApproveApplication,
  useCancelApplication,
  useCreateApplication,
  useLeaveApplications,
  useLeaveTypes,
  useRejectApplication,
} from '@/hooks/useLeaveManagement';
import type {
  CreateApplicationInput,
  LeaveApplication,
  LeaveStatus,
} from '@/lib/api/leave-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { format } from 'date-fns';

export const Route = createFileRoute(
  '/_authenticated/(workforce)/workforce/leave-applications',
)({
  component: withRouteProtection(LeaveApplicationsPage, 'manage', 'LeaveApplication'),
});

const STATUS_FILTERS: Array<{ value: 'all' | LeaveStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];

function LeaveApplicationsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [status, setStatus] = useState<'all' | LeaveStatus>('pending');
  const [creating, setCreating] = useState(false);
  const [rejecting, setRejecting] = useState<LeaveApplication | null>(null);

  const filters = status === 'all' ? {} : { status };
  const query = useLeaveApplications(orgId, filters);
  const approve = useApproveApplication();
  const reject = useRejectApplication();
  const cancel = useCancelApplication();

  if (!orgId) return null;
  const apps = query.data ?? [];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            {t('leaveApplications.title', 'Leave Applications')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t(
              'leaveApplications.subtitle',
              'Review and approve worker leave requests. Approving an application deducts days from the matching allocation.',
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {t(`leaveApplications.status.${s.value}`, s.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('leaveApplications.apply', 'Apply')}
          </Button>
        </div>
      </header>

      {query.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : apps.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('leaveApplications.empty', 'No applications match the current filter.')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <ApplicationRow
              key={a.id}
              app={a}
              onApprove={() =>
                approve.mutate(
                  { orgId, id: a.id },
                  { onSuccess: () => toast.success(t('leaveApplications.approved', 'Approved')) },
                )
              }
              onReject={() => setRejecting(a)}
              onCancel={() => {
                if (!confirm(t('leaveApplications.confirmCancel', 'Cancel this application?'))) return;
                cancel.mutate(
                  { orgId, id: a.id },
                  { onSuccess: () => toast.success(t('common.cancelled', 'Cancelled')) },
                );
              }}
            />
          ))}
        </div>
      )}

      {creating && (
        <ApplicationDialog
          orgId={orgId}
          onClose={() => setCreating(false)}
        />
      )}

      {rejecting && (
        <RejectDialog
          orgId={orgId}
          application={rejecting}
          onClose={() => setRejecting(null)}
          onSubmit={async (reason) => {
            await reject.mutateAsync({ orgId, id: rejecting.id, reason });
            toast.success(t('leaveApplications.rejected', 'Rejected'));
            setRejecting(null);
          }}
        />
      )}
    </div>
  );
}

function ApplicationRow({
  app,
  onApprove,
  onReject,
  onCancel,
}: {
  app: LeaveApplication;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const w = app.worker;
  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">
              {w ? `${w.first_name} ${w.last_name}` : t('common.unknownWorker', 'Unknown worker')}
            </span>
            <Badge variant="outline">{app.leave_type?.name ?? '—'}</Badge>
            <StatusBadge status={app.status} />
            {app.is_block_day && (
              <Badge variant="destructive">{t('leaveApplications.blockDay', 'Block date')}</Badge>
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {format(new Date(app.from_date), 'PP')} → {format(new Date(app.to_date), 'PP')}
            {' · '}
            {app.total_days} {t('common.days', 'days')}
            {app.half_day && ` (${t('leaveApplications.halfDay', 'half day')})`}
          </div>
          {app.reason && <div className="text-sm mt-2">{app.reason}</div>}
          {app.rejection_reason && (
            <div className="text-sm mt-1 text-red-600 dark:text-red-400">
              {t('leaveApplications.rejectionReason', 'Reason')}: {app.rejection_reason}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {app.status === 'pending' && (
            <>
              <Button size="sm" onClick={onApprove}>
                <Check className="w-4 h-4 mr-1" />
                {t('common.approve', 'Approve')}
              </Button>
              <Button size="sm" variant="outline" onClick={onReject}>
                <X className="w-4 h-4 mr-1" />
                {t('common.reject', 'Reject')}
              </Button>
            </>
          )}
          {(app.status === 'pending' || app.status === 'approved') && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              {t('common.cancel', 'Cancel')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const { t } = useTranslation();
  const variants: Record<LeaveStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    approved: 'default',
    rejected: 'destructive',
    cancelled: 'outline',
  };
  return <Badge variant={variants[status]}>{t(`leaveApplications.status.${status}`, status)}</Badge>;
}

function ApplicationDialog({
  orgId,
  onClose,
}: {
  orgId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const workersQuery = useWorkers(orgId);
  const typesQuery = useLeaveTypes(orgId);
  const create = useCreateApplication();

  const [draft, setDraft] = useState<CreateApplicationInput>({
    worker_id: '',
    leave_type_id: '',
    from_date: new Date().toISOString().slice(0, 10),
    to_date: new Date().toISOString().slice(0, 10),
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateApplicationInput>(key: K, v: CreateApplicationInput[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const totalDays = useMemo(() => {
    if (!draft.from_date || !draft.to_date) return 0;
    const ms = new Date(draft.to_date).getTime() - new Date(draft.from_date).getTime();
    if (ms < 0) return 0;
    const days = Math.floor(ms / 86_400_000) + 1;
    return draft.half_day && days === 1 ? 0.5 : days;
  }, [draft.from_date, draft.to_date, draft.half_day]);

  const workers = Array.isArray(workersQuery.data) ? workersQuery.data : [];

  const handleSubmit = async () => {
    if (!draft.worker_id || !draft.leave_type_id || !draft.reason.trim()) {
      toast.error(t('validation.allFieldsRequired', 'All fields are required'));
      return;
    }
    setSubmitting(true);
    try {
      await create.mutateAsync({ orgId, data: draft });
      toast.success(t('leaveApplications.created', 'Application submitted'));
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
      title={t('leaveApplications.create', 'New leave application')}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.submit', 'Submit')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t('common.worker', 'Worker')}</Label>
            <Select value={draft.worker_id} onValueChange={(v) => set('worker_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.select', 'Select')} />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.first_name} {w.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('leaveTypes.title', 'Leave type')}</Label>
            <Select value={draft.leave_type_id} onValueChange={(v) => set('leave_type_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.select', 'Select')} />
              </SelectTrigger>
              <SelectContent>
                {(typesQuery.data ?? []).map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t('common.from', 'From')}</Label>
            <Input
              type="date"
              value={draft.from_date}
              onChange={(e) => set('from_date', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t('common.to', 'To')}</Label>
            <Input
              type="date"
              value={draft.to_date}
              onChange={(e) => set('to_date', e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">{t('leaveApplications.halfDay', 'Half day')}</Label>
          <Switch
            checked={!!draft.half_day}
            onCheckedChange={(v) => set('half_day', v)}
            disabled={draft.from_date !== draft.to_date}
          />
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('leaveApplications.totalDays', 'Total days')}: <strong>{totalDays}</strong>
        </div>

        <div className="space-y-1">
          <Label>{t('common.reason', 'Reason')}</Label>
          <Input value={draft.reason} onChange={(e) => set('reason', e.target.value)} />
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function RejectDialog({
  orgId: _orgId,
  application,
  onClose,
  onSubmit,
}: {
  orgId: string;
  application: LeaveApplication;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="md"
      title={t('leaveApplications.rejectTitle', 'Reject application')}
      description={`${application.worker?.first_name ?? ''} · ${application.leave_type?.name ?? ''}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onSubmit(reason);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.reject', 'Reject')}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label>{t('leaveApplications.rejectionReason', 'Reason')}</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </div>
    </ResponsiveDialog>
  );
}
