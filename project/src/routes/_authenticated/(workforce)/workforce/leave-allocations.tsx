import { useMemo, useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Users } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useWorkers } from '@/hooks/useWorkers';
import {
  useBulkAllocate,
  useCreateAllocation,
  useLeaveAllocations,
  useLeaveTypes,
} from '@/hooks/useLeaveManagement';
import type {
  BulkAllocateInput,
  CreateAllocationInput,
} from '@/lib/api/leave-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  '/_authenticated/(workforce)/workforce/leave-allocations',
)({
  component: withRouteProtection(LeaveAllocationsPage, 'manage', 'LeaveAllocation'),
});

function LeaveAllocationsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [creating, setCreating] = useState<'single' | 'bulk' | null>(null);

  const filters = {
    ...(workerFilter !== 'all' ? { worker_id: workerFilter } : {}),
    ...(typeFilter !== 'all' ? { leave_type_id: typeFilter } : {}),
  };

  const allocationsQuery = useLeaveAllocations(orgId, filters);
  const typesQuery = useLeaveTypes(orgId);
  const workersQuery = useWorkers(orgId);

  if (!orgId) return null;

  const allocations = allocationsQuery.data ?? [];
  const workers: any[] = Array.isArray(workersQuery.data) ? workersQuery.data : [];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">
            {t('leaveAllocations.title', 'Leave Allocations')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t(
              'leaveAllocations.subtitle',
              'Grant leave balances to workers per leave type and period. Approved applications deduct from these balances.',
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreating('bulk')}>
            <Users className="w-4 h-4 mr-2" />
            {t('leaveAllocations.bulkAllocate', 'Bulk allocate')}
          </Button>
          <Button onClick={() => setCreating('single')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('common.create', 'Create')}
          </Button>
        </div>
      </header>

      <div className="flex gap-3 flex-wrap">
        <div className="space-y-1 w-56">
          <Label>{t('common.worker', 'Worker')}</Label>
          <Select value={workerFilter} onValueChange={setWorkerFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.first_name} {w.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 w-56">
          <Label>{t('leaveTypes.title', 'Leave type')}</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
              {(typesQuery.data ?? []).map((lt) => (
                <SelectItem key={lt.id} value={lt.id}>
                  {lt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {allocationsQuery.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : allocations.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('leaveAllocations.empty', 'No allocations match the current filter.')}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-left">
              <tr>
                <Th>{t('common.worker', 'Worker')}</Th>
                <Th>{t('leaveTypes.title', 'Type')}</Th>
                <Th>{t('common.period', 'Period')}</Th>
                <Th className="text-right">{t('leaveAllocations.total', 'Total')}</Th>
                <Th className="text-right">{t('leaveAllocations.used', 'Used')}</Th>
                <Th className="text-right">{t('leaveAllocations.remaining', 'Remaining')}</Th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => (
                <tr key={a.id} className="border-t dark:border-gray-700">
                  <td className="px-3 py-2">
                    {a.worker
                      ? `${a.worker.first_name} ${a.worker.last_name}`
                      : t('common.unknownWorker', 'Unknown worker')}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{a.leave_type?.name ?? '—'}</Badge>
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                    {format(new Date(a.period_start), 'PP')} → {format(new Date(a.period_end), 'PP')}
                  </td>
                  <td className="px-3 py-2 text-right">{a.total_days}</td>
                  <td className="px-3 py-2 text-right">{a.used_days}</td>
                  <td className="px-3 py-2 text-right font-medium">{a.remaining_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating === 'single' && (
        <SingleAllocationDialog orgId={orgId} onClose={() => setCreating(null)} />
      )}
      {creating === 'bulk' && (
        <BulkAllocationDialog orgId={orgId} onClose={() => setCreating(null)} />
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th className={`px-3 py-2 font-medium ${className}`}>{children}</th>;
}

function SingleAllocationDialog({
  orgId,
  onClose,
}: {
  orgId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const workersQuery = useWorkers(orgId);
  const typesQuery = useLeaveTypes(orgId);
  const create = useCreateAllocation();

  const today = new Date();
  const yearEnd = new Date(today.getFullYear(), 11, 31);
  const yearStart = new Date(today.getFullYear(), 0, 1);

  const [draft, setDraft] = useState<CreateAllocationInput>({
    worker_id: '',
    leave_type_id: '',
    total_days: 0,
    period_start: yearStart.toISOString().slice(0, 10),
    period_end: yearEnd.toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateAllocationInput>(key: K, v: CreateAllocationInput[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const workers: any[] = Array.isArray(workersQuery.data) ? workersQuery.data : [];

  const handleSubmit = async () => {
    if (!draft.worker_id || !draft.leave_type_id || draft.total_days <= 0) {
      toast.error(t('validation.allFieldsRequired', 'All fields are required'));
      return;
    }
    setSubmitting(true);
    try {
      await create.mutateAsync({ orgId, data: draft });
      toast.success(t('common.created', 'Created'));
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
      title={t('leaveAllocations.create', 'Allocate leave')}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t('common.worker', 'Worker')}</Label>
            <Select value={draft.worker_id} onValueChange={(v) => set('worker_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.select', 'Select')} />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
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

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>{t('leaveAllocations.totalDays', 'Total days')}</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={draft.total_days}
              onChange={(e) => set('total_days', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label>{t('common.from', 'From')}</Label>
            <Input
              type="date"
              value={draft.period_start}
              onChange={(e) => set('period_start', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t('common.to', 'To')}</Label>
            <Input
              type="date"
              value={draft.period_end}
              onChange={(e) => set('period_end', e.target.value)}
            />
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function BulkAllocationDialog({
  orgId,
  onClose,
}: {
  orgId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const workersQuery = useWorkers(orgId);
  const typesQuery = useLeaveTypes(orgId);
  const bulk = useBulkAllocate();

  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearEnd = new Date(today.getFullYear(), 11, 31);

  const [draft, setDraft] = useState<BulkAllocateInput>({
    leave_type_id: '',
    worker_ids: [],
    total_days: 0,
    period_start: yearStart.toISOString().slice(0, 10),
    period_end: yearEnd.toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);

  const workers: any[] = Array.isArray(workersQuery.data) ? workersQuery.data : [];
  const allSelected = useMemo(
    () => workers.length > 0 && draft.worker_ids.length === workers.length,
    [draft.worker_ids, workers.length],
  );

  const toggleWorker = (id: string) => {
    setDraft((d) => ({
      ...d,
      worker_ids: d.worker_ids.includes(id)
        ? d.worker_ids.filter((w) => w !== id)
        : [...d.worker_ids, id],
    }));
  };

  const handleSubmit = async () => {
    if (!draft.leave_type_id || draft.worker_ids.length === 0 || draft.total_days <= 0) {
      toast.error(t('validation.allFieldsRequired', 'All fields are required'));
      return;
    }
    setSubmitting(true);
    try {
      await bulk.mutateAsync({ orgId, data: draft });
      toast.success(
        t('leaveAllocations.bulkCreated', 'Allocated to {{count}} worker(s)', {
          count: draft.worker_ids.length,
        }),
      );
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
      size="2xl"
      title={t('leaveAllocations.bulkAllocate', 'Bulk allocate leave')}
      description={t(
        'leaveAllocations.bulkDesc',
        'Allocate the same balance to multiple workers at once. Existing allocations for the same period are upserted.',
      )}
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
          <div className="space-y-1">
            <Label>{t('leaveTypes.title', 'Leave type')}</Label>
            <Select
              value={draft.leave_type_id}
              onValueChange={(v) => setDraft((d) => ({ ...d, leave_type_id: v }))}
            >
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
          <div className="space-y-1">
            <Label>{t('leaveAllocations.totalDays', 'Total days per worker')}</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={draft.total_days}
              onChange={(e) => setDraft((d) => ({ ...d, total_days: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t('common.from', 'From')}</Label>
            <Input
              type="date"
              value={draft.period_start}
              onChange={(e) => setDraft((d) => ({ ...d, period_start: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>{t('common.to', 'To')}</Label>
            <Input
              type="date"
              value={draft.period_end}
              onChange={(e) => setDraft((d) => ({ ...d, period_end: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('leaveAllocations.selectWorkers', 'Select workers')}</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  worker_ids: allSelected ? [] : workers.map((w) => w.id),
                }))
              }
            >
              {allSelected ? t('common.deselectAll', 'Deselect all') : t('common.selectAll', 'Select all')}
            </Button>
          </div>
          <div className="border rounded-lg max-h-60 overflow-y-auto dark:border-gray-700">
            {workers.map((w) => (
              <label
                key={w.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 border-b last:border-b-0 dark:border-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={draft.worker_ids.includes(w.id)}
                  onChange={() => toggleWorker(w.id)}
                />
                <span>
                  {w.first_name} {w.last_name}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {t('leaveAllocations.selectedCount', '{{count}} selected', {
              count: draft.worker_ids.length,
            })}
          </p>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
