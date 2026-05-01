import { useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Check, X, Trash2 } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useFarms } from '@/hooks/useParcelsQuery';
import { useWorkers } from '@/hooks/useWorkers';
import {
  useApproveExpenseClaim,
  useCreateExpenseClaim,
  useDeleteExpenseClaim,
  useExpenseClaims,
  useRejectExpenseClaim,
} from '@/hooks/useHrAdmin';
import type {
  CreateExpenseClaimInput,
  ExpenseClaim,
  ExpenseClaimStatus,
} from '@/lib/api/hr-admin';
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

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/expense-claims')({
  component: withRouteProtection(ExpenseClaimsPage, 'manage', 'ExpenseClaim'),
});

const STATUSES: ExpenseClaimStatus[] = [
  'pending', 'approved', 'partially_approved', 'rejected', 'paid', 'cancelled',
];

const STATUS_VARIANT: Record<ExpenseClaimStatus, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  partially_approved: 'default',
  rejected: 'destructive',
  paid: 'default',
  cancelled: 'secondary',
};

function ExpenseClaimsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ExpenseClaimStatus | 'all'>('all');

  const farms = useFarms(orgId ?? undefined);
  const workers = useWorkers(orgId);
  const query = useExpenseClaims(orgId, statusFilter === 'all' ? {} : { status: statusFilter });
  const create = useCreateExpenseClaim();
  const approve = useApproveExpenseClaim();
  const reject = useRejectExpenseClaim();
  const remove = useDeleteExpenseClaim();

  if (!orgId) return null;

  const claims = query.data ?? [];
  const farmList = (farms.data ?? []).map((f) => ({ id: f.id, name: f.name }));
  const workerList = (workers.data ?? []).map((w) => ({ id: w.id, name: `${w.first_name} ${w.last_name}` }));

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('expenses.title', 'Expense Claims')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('expenses.subtitle', 'Worker expense reimbursements with approval workflow.')}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            {t('expenses.create', 'New claim')}
          </Button>
        </div>
      </header>

      {query.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !claims.length ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('expenses.empty', 'No expense claims yet.')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {claims.map((c) => (
            <ClaimRow
              key={c.id}
              claim={c}
              onApprove={() =>
                approve.mutate(
                  { orgId, id: c.id },
                  { onSuccess: () => toast.success(t('common.approved', 'Approved')) },
                )
              }
              onReject={() => {
                const reason = prompt(t('expenses.rejectReason', 'Rejection reason:'));
                if (!reason) return;
                reject.mutate(
                  { orgId, id: c.id, reason },
                  { onSuccess: () => toast.success(t('common.rejected', 'Rejected')) },
                );
              }}
              onDelete={() => {
                if (!confirm(t('expenses.confirmDelete', 'Delete claim?'))) return;
                remove.mutate(
                  { orgId, id: c.id },
                  { onSuccess: () => toast.success(t('common.deleted', 'Deleted')) },
                );
              }}
            />
          ))}
        </div>
      )}

      {creating && (
        <ClaimDialog
          farms={farmList}
          workers={workerList}
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

function ClaimRow({
  claim,
  onApprove,
  onReject,
  onDelete,
}: {
  claim: ExpenseClaim;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent className="py-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium truncate">{claim.title}</span>
            <Badge variant={STATUS_VARIANT[claim.status]}>{claim.status}</Badge>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {claim.worker?.first_name} {claim.worker?.last_name} · {claim.expense_date} ·{' '}
            <strong className="text-gray-900 dark:text-white">{claim.grand_total.toLocaleString()} MAD</strong>
          </div>
          {claim.rejection_reason && (
            <div className="text-xs text-red-600 mt-0.5">{claim.rejection_reason}</div>
          )}
        </div>
        <div className="flex gap-1">
          {claim.status === 'pending' && (
            <>
              <Button variant="outline" size="sm" onClick={onReject}>
                <X className="w-3 h-3 mr-1" />
                {t('common.reject', 'Reject')}
              </Button>
              <Button size="sm" onClick={onApprove}>
                <Check className="w-3 h-3 mr-1" />
                {t('common.approve', 'Approve')}
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimDialog({
  farms,
  workers,
  onClose,
  onSubmit,
}: {
  farms: Array<{ id: string; name: string }>;
  workers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (data: CreateExpenseClaimInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState<CreateExpenseClaimInput>({
    worker_id: '',
    title: '',
    expense_date: today,
    items: [],
    total_amount: 0,
    total_tax: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateExpenseClaimInput>(k: K, v: CreateExpenseClaimInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const updateItem = (i: number, patch: Record<string, unknown>) =>
    set('items', draft.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => set('items', [...draft.items, { description: '', amount: 0, tax: 0 }]);
  const removeItem = (i: number) => set('items', draft.items.filter((_, idx) => idx !== i));

  const totalAmount = draft.items.reduce((acc, it: any) => acc + Number(it.amount || 0), 0);
  const totalTax = draft.items.reduce((acc, it: any) => acc + Number(it.tax || 0), 0);

  const handleSubmit = async () => {
    if (!draft.worker_id || !draft.title.trim() || draft.items.length === 0) {
      toast.error(t('expenses.validationFailed', 'Worker, title and at least one item required'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        ...draft,
        total_amount: totalAmount,
        total_tax: totalTax,
        grand_total: totalAmount + totalTax,
      });
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
      title={t('expenses.create', 'New claim')}
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
          <Field label={t('expenses.worker', 'Worker')}>
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
          <Field label={t('expenses.farm', 'Farm')}>
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
        <Field label={t('common.title', 'Title')}>
          <Input value={draft.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('expenses.date', 'Expense date')}>
            <Input type="date" value={draft.expense_date} onChange={(e) => set('expense_date', e.target.value)} />
          </Field>
          <Field label={t('common.description', 'Description')}>
            <Input
              value={draft.description ?? ''}
              onChange={(e) => set('description', e.target.value || undefined)}
            />
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>{t('expenses.items', 'Line items')}</Label>
            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus className="w-3 h-3 mr-1" />
              {t('common.add', 'Add')}
            </Button>
          </div>
          <div className="space-y-2">
            {draft.items.map((it: any, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder={t('expenses.itemDescription', 'Description')}
                  value={it.description ?? ''}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                />
                <Input
                  className="w-28"
                  type="number"
                  step="0.01"
                  placeholder="amount"
                  value={it.amount ?? ''}
                  onChange={(e) => updateItem(i, { amount: Number(e.target.value) })}
                />
                <Input
                  className="w-24"
                  type="number"
                  step="0.01"
                  placeholder="tax"
                  value={it.tax ?? ''}
                  onChange={(e) => updateItem(i, { tax: Number(e.target.value) })}
                />
                <Button variant="ghost" size="sm" onClick={() => removeItem(i)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
            {!draft.items.length && (
              <p className="text-xs text-gray-500">{t('expenses.noItems', 'No items.')}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm border-t pt-3">
          <Total label={t('expenses.totalAmount', 'Subtotal')} value={totalAmount} />
          <Total label={t('expenses.totalTax', 'Tax')} value={totalTax} />
          <Total label={t('expenses.grandTotal', 'Grand total')} value={totalAmount + totalTax} highlight />
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function Total({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`p-2 rounded-md border ${highlight ? 'bg-primary/5 border-primary/30' : ''}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-semibold ${highlight ? 'text-primary' : ''}`}>
        {value.toLocaleString()}
      </div>
    </div>
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
