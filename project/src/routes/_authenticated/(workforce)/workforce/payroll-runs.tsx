import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Play, Send, X, Building2, Users, DollarSign } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import {
  useCancelPayrollRun,
  useMarkPayrollRunPaid,
  useCreatePayrollRun,
  useGeneratePayrollRun,
  usePayrollRuns,
  useSubmitPayrollRun,
} from '@/hooks/usePayroll';
import type { CreatePayrollRunInput, PayFrequency, RunStatus } from '@/lib/api/payroll';
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
  '/_authenticated/(workforce)/workforce/payroll-runs',
)({
  component: withRouteProtection(PayrollRunsPage, 'manage', 'PayrollRun'),
});

function PayrollRunsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const query = usePayrollRuns(orgId);
  const create = useCreatePayrollRun();
  const generate = useGeneratePayrollRun();
  const submit = useSubmitPayrollRun();
  const cancel = useCancelPayrollRun();
  const markPaid = useMarkPayrollRunPaid();

  const [creating, setCreating] = useState(false);

  if (!orgId) return null;
  const runs = query.data ?? [];

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization?.name ?? '', path: '/dashboard' },
          { icon: Users, label: t('nav.workforce', 'Workforce'), path: '/workforce/employees' },
          { icon: DollarSign, label: t('payrollRuns.title', 'Payroll Runs'), isActive: true },
        ]}
        title={t('payrollRuns.title', 'Payroll Runs')}
        subtitle={t(
          'payrollRuns.subtitle',
          'Process payroll for a period: create a run, generate slips for matching workers, then submit when ready.',
        )}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('common.create', 'Create')}
          </Button>
        }
      />
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {query.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('payrollRuns.empty', 'No payroll runs yet.')}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t('common.name', 'Name')}</th>
                <th className="px-3 py-2 font-medium">{t('common.period', 'Period')}</th>
                <th className="px-3 py-2 font-medium">{t('payrollRuns.frequency', 'Frequency')}</th>
                <th className="px-3 py-2 font-medium">{t('common.status', 'Status')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('payrollRuns.workers', 'Workers')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('payrollRuns.netPay', 'Net pay')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t dark:border-gray-700">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {format(new Date(r.pay_period_start), 'PP')} → {format(new Date(r.pay_period_end), 'PP')}
                  </td>
                  <td className="px-3 py-2">{r.pay_frequency}</td>
                  <td className="px-3 py-2"><RunStatusBadge status={r.status} /></td>
                  <td className="px-3 py-2 text-right">{r.total_workers}</td>
                  <td className="px-3 py-2 text-right">
                    {r.total_net_pay > 0 ? Number(r.total_net_pay).toFixed(2) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      {(r.status === 'draft' || r.status === 'processing') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            generate.mutate(
                              { orgId, id: r.id },
                              {
                                onSuccess: (res) =>
                                  toast.success(
                                    t('payrollRuns.generated', 'Generated {{count}} slips ({{skipped}} skipped)', {
                                      count: res.generated_count,
                                      skipped: res.skipped.length,
                                    }),
                                  ),
                                onError: (err: any) => toast.error(err?.message ?? 'Error'),
                              },
                            );
                          }}
                          disabled={generate.isPending}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          {t('payrollRuns.generate', 'Generate')}
                        </Button>
                      )}
                      {r.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!confirm(t('payrollRuns.confirmSubmit', 'Submit run? Slips will be marked submitted.')))
                              return;
                            submit.mutate(
                              { orgId, id: r.id },
                              { onSuccess: () => toast.success(t('common.submitted', 'Submitted')) },
                            );
                          }}
                          disabled={submit.isPending || r.total_workers === 0}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          {t('common.submit', 'Submit')}
                        </Button>
                      )}
                      {r.status === 'submitted' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!confirm(t('payrollRuns.confirmMarkPaid', 'Mark as paid? Journal entries will be posted to the GL.')))
                              return;
                            markPaid.mutate(
                              { orgId, id: r.id },
                              {
                                onSuccess: (res) =>
                                  toast.success(
                                    t('payrollRuns.paidWithJe', `Paid · ${res.journal_entries_created} JE posted`),
                                  ),
                                onError: (err: any) => toast.error(err?.message ?? 'Error'),
                              },
                            );
                          }}
                          disabled={markPaid.isPending}
                        >
                          {t('payrollRuns.markPaid', 'Mark paid')}
                        </Button>
                      )}
                      {r.status !== 'paid' && r.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (!confirm(t('payrollRuns.confirmCancel', 'Cancel run? Slips will be cancelled.'))) return;
                            cancel.mutate(
                              { orgId, id: r.id },
                              { onSuccess: () => toast.success(t('common.cancelled', 'Cancelled')) },
                            );
                          }}
                        >
                          <X className="w-3 h-3 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreateRunDialog
          onClose={() => setCreating(false)}
          onSubmit={async (data) => {
            await create.mutateAsync({ orgId, data });
            toast.success(t('common.created', 'Created'));
            setCreating(false);
          }}
        />
      )}
      </div>
    </>
  );
}

function RunStatusBadge({ status }: { status: RunStatus }) {
  const variants: Record<RunStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'outline',
    processing: 'secondary',
    submitted: 'default',
    paid: 'default',
    cancelled: 'destructive',
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
}

function CreateRunDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: CreatePayrollRunInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [draft, setDraft] = useState<CreatePayrollRunInput>({
    name: `Payroll ${format(monthStart, 'MMM yyyy')}`,
    pay_period_start: monthStart.toISOString().slice(0, 10),
    pay_period_end: monthEnd.toISOString().slice(0, 10),
    pay_frequency: 'monthly',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreatePayrollRunInput>(key: K, v: CreatePayrollRunInput[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={t('payrollRuns.create', 'New payroll run')}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={async () => {
              if (!draft.name.trim()) {
                toast.error(t('validation.nameRequired', 'Name is required'));
                return;
              }
              setSubmitting(true);
              try { await onSubmit(draft); } catch (err: any) {
                toast.error(err?.message ?? t('common.errorOccurred', 'An error occurred'));
              } finally { setSubmitting(false); }
            }}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.create', 'Create')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>{t('common.name', 'Name')}</Label>
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t('common.from', 'From')}</Label>
            <Input
              type="date"
              value={draft.pay_period_start}
              onChange={(e) => set('pay_period_start', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t('common.to', 'To')}</Label>
            <Input
              type="date"
              value={draft.pay_period_end}
              onChange={(e) => set('pay_period_end', e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>{t('payrollRuns.frequency', 'Frequency')}</Label>
          <Select
            value={draft.pay_frequency}
            onValueChange={(v) => set('pay_frequency', v as PayFrequency)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">monthly</SelectItem>
              <SelectItem value="biweekly">biweekly</SelectItem>
              <SelectItem value="weekly">weekly</SelectItem>
              <SelectItem value="daily">daily</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
