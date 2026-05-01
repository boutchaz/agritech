import { useState, type ReactNode } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, ChevronRight } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useWorkers } from '@/hooks/useWorkers';
import { useCreateSeparation, useSeparations } from '@/hooks/useEmployeeLifecycle';
import type {
  CreateSeparationInput,
  Separation,
  SeparationStatus,
  SeparationType,
} from '@/lib/api/employee-lifecycle';
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

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/separations')({
  component: withRouteProtection(SeparationsPage, 'manage', 'Separation'),
});

const SEPARATION_TYPES: SeparationType[] = [
  'resignation',
  'termination',
  'end_of_contract',
  'retirement',
  'death',
  'dismissal',
];

const STATUS_VARIANT: Record<SeparationStatus, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  notice_period: 'default',
  relieved: 'default',
  settled: 'default',
};

function SeparationsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SeparationStatus | 'all'>('all');

  const query = useSeparations(orgId, statusFilter === 'all' ? {} : { status: statusFilter });
  const workers = useWorkers(orgId);
  const create = useCreateSeparation();

  if (!orgId) return null;

  const seps = query.data ?? [];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('separations.title', 'Separations')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t(
              'separations.subtitle',
              'Track resignations, terminations, end-of-contract and full & final settlements.',
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
              <SelectItem value="pending">{t('separations.status.pending', 'Pending')}</SelectItem>
              <SelectItem value="notice_period">{t('separations.status.notice_period', 'Notice period')}</SelectItem>
              <SelectItem value="relieved">{t('separations.status.relieved', 'Relieved')}</SelectItem>
              <SelectItem value="settled">{t('separations.status.settled', 'Settled')}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('separations.create', 'New separation')}
          </Button>
        </div>
      </header>

      {query.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !seps.length ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('separations.empty', 'No separations recorded.')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {seps.map((s) => (
            <SeparationRow key={s.id} sep={s} />
          ))}
        </div>
      )}

      {creating && (
        <CreateDialog
          workers={(workers.data ?? []).map((w) => ({ id: w.id, name: `${w.first_name} ${w.last_name}` }))}
          onClose={() => setCreating(false)}
          onSubmit={async (data) => {
            await create.mutateAsync({ orgId, data });
            toast.success(t('common.created', 'Created'));
          }}
        />
      )}
    </div>
  );
}

function SeparationRow({ sep }: { sep: Separation }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/workforce/separations/$separationId"
      params={{ separationId: sep.id }}
      className="block"
    >
      <Card className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="font-medium text-sm">
              {sep.worker?.first_name} {sep.worker?.last_name}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {t(`separations.type.${sep.separation_type}`, sep.separation_type)} ·{' '}
              {t('separations.notice', 'Notice')} {sep.notice_date} · {t('separations.relieving', 'Relieving')} {sep.relieving_date}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={STATUS_VARIANT[sep.status]}>
              {t(`separations.status.${sep.status}`, sep.status)}
            </Badge>
            <Badge variant="outline">FnF: {sep.fnf_status}</Badge>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CreateDialog({
  workers,
  onClose,
  onSubmit,
}: {
  workers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (data: CreateSeparationInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState<CreateSeparationInput>({
    worker_id: '',
    separation_type: 'resignation',
    notice_date: today,
    relieving_date: today,
  });
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateSeparationInput>(k: K, v: CreateSeparationInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleSubmit = async () => {
    if (!draft.worker_id) {
      toast.error(t('separations.workerRequired', 'Worker required'));
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
      title={t('separations.create', 'New separation')}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.create', 'Create')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('separations.worker', 'Worker')}>
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
        <Field label={t('separations.separationType', 'Separation type')}>
          <Select
            value={draft.separation_type}
            onValueChange={(v) => set('separation_type', v as SeparationType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEPARATION_TYPES.map((tp) => (
                <SelectItem key={tp} value={tp}>
                  {t(`separations.type.${tp}`, tp)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('separations.noticeDate', 'Notice date')}>
            <Input
              type="date"
              value={draft.notice_date}
              onChange={(e) => set('notice_date', e.target.value)}
            />
          </Field>
          <Field label={t('separations.relievingDate', 'Relieving date')}>
            <Input
              type="date"
              value={draft.relieving_date}
              onChange={(e) => set('relieving_date', e.target.value)}
            />
          </Field>
        </div>
        <Field label={t('separations.exitNotes', 'Exit interview notes')}>
          <Input
            value={draft.exit_interview_notes ?? ''}
            onChange={(e) => set('exit_interview_notes', e.target.value || undefined)}
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
