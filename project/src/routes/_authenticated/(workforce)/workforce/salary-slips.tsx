import { useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Send, CheckCircle2, X } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useSalarySlips, useSalarySlip, useSlipAction } from '@/hooks/usePayroll';
import type { SalarySlip, SlipStatus } from '@/lib/api/payroll';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  '/_authenticated/(workforce)/workforce/salary-slips',
)({
  component: withRouteProtection(SalarySlipsPage, 'read', 'SalarySlip'),
});

function SalarySlipsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [status, setStatus] = useState<'all' | SlipStatus>('all');
  const [openSlipId, setOpenSlipId] = useState<string | null>(null);

  const filters = status === 'all' ? {} : { status };
  const query = useSalarySlips(orgId, filters);

  if (!orgId) return null;
  const slips = query.data ?? [];

  return (
    <>
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      <div className="flex justify-end">
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
            <SelectItem value="draft">draft</SelectItem>
            <SelectItem value="submitted">submitted</SelectItem>
            <SelectItem value="paid">paid</SelectItem>
            <SelectItem value="cancelled">cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {query.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : slips.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('salarySlips.empty', 'No salary slips match the current filter.')}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t('common.worker', 'Worker')}</th>
                <th className="px-3 py-2 font-medium">{t('common.period', 'Period')}</th>
                <th className="px-3 py-2 font-medium">{t('common.status', 'Status')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('payrollRuns.netPay', 'Net pay')}</th>
              </tr>
            </thead>
            <tbody>
              {slips.map((s) => (
                <tr
                  key={s.id}
                  className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => setOpenSlipId(s.id)}
                >
                  <td className="px-3 py-2">
                    {s.worker ? `${s.worker.first_name} ${s.worker.last_name}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {format(new Date(s.pay_period_start), 'PP')} → {format(new Date(s.pay_period_end), 'PP')}
                  </td>
                  <td className="px-3 py-2"><SlipStatusBadge status={s.status} /></td>
                  <td className="px-3 py-2 text-right font-medium">{Number(s.net_pay).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openSlipId && (
        <SlipDetailDialog
          orgId={orgId}
          slipId={openSlipId}
          onClose={() => setOpenSlipId(null)}
        />
      )}
      </div>
    </>
  );
}

function SlipStatusBadge({ status }: { status: SlipStatus }) {
  const variants: Record<SlipStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'outline',
    submitted: 'secondary',
    paid: 'default',
    cancelled: 'destructive',
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
}

function SlipDetailDialog({
  orgId,
  slipId,
  onClose,
}: {
  orgId: string;
  slipId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const query = useSalarySlip(orgId, slipId);
  const submit = useSlipAction('submit');
  const pay = useSlipAction('pay');
  const cancel = useSlipAction('cancel');

  const slip = query.data as SalarySlip | undefined;

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="2xl"
      title={t('salarySlips.detailTitle', 'Salary slip')}
      description={
        slip?.worker
          ? `${slip.worker.first_name} ${slip.worker.last_name} · ${format(new Date(slip.pay_period_start), 'PP')} → ${format(new Date(slip.pay_period_end), 'PP')}`
          : undefined
      }
      footer={
        slip ? (
          <div className="flex gap-2 w-full justify-end">
            {slip.status === 'draft' && (
              <Button
                size="sm"
                onClick={() =>
                  submit.mutate(
                    { orgId, id: slip.id },
                    { onSuccess: () => toast.success(t('common.submitted', 'Submitted')) },
                  )
                }
              >
                <Send className="w-3 h-3 mr-1" />
                {t('common.submit', 'Submit')}
              </Button>
            )}
            {slip.status === 'submitted' && (
              <Button
                size="sm"
                onClick={() =>
                  pay.mutate(
                    { orgId, id: slip.id },
                    { onSuccess: () => toast.success(t('common.paid', 'Marked paid')) },
                  )
                }
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {t('common.markPaid', 'Mark paid')}
              </Button>
            )}
            {slip.status !== 'cancelled' && slip.status !== 'paid' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  cancel.mutate(
                    { orgId, id: slip.id },
                    { onSuccess: () => toast.success(t('common.cancelled', 'Cancelled')) },
                  )
                }
              >
                <X className="w-3 h-3 mr-1" />
                {t('common.cancel', 'Cancel')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common.close', 'Close')}
            </Button>
          </div>
        ) : null
      }
    >
      {!slip ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={t('salarySlips.workingDays', 'Working days')} value={slip.working_days} />
            <Stat label={t('salarySlips.presentDays', 'Present')} value={slip.present_days} />
            <Stat label={t('salarySlips.leaveDays', 'Leave')} value={slip.leave_days} />
            <Stat label={t('salarySlips.holidayDays', 'Holiday')} value={slip.holiday_days} />
          </div>

          <Section title={t('salarySlips.earnings', 'Earnings')}>
            <Lines lines={slip.earnings} />
            <Total label={t('salarySlips.gross', 'Gross pay')} value={slip.gross_pay} positive />
          </Section>

          {slip.deductions.length > 0 && (
            <Section title={t('salarySlips.deductions', 'Deductions')}>
              <Lines lines={slip.deductions} />
              <Total label={t('salarySlips.totalDeductions', 'Total deductions')} value={slip.total_deductions} />
            </Section>
          )}

          {(slip.employer_contributions ?? []).length > 0 && (
            <Section title={t('salarySlips.employerContrib', 'Employer contributions')}>
              <Lines lines={slip.employer_contributions} />
            </Section>
          )}

          <div className="pt-2 border-t dark:border-gray-700">
            <Total label={t('salarySlips.netPay', 'Net pay')} value={slip.net_pay} positive bold />
          </div>

          {slip.taxable_income !== null && (
            <div className="text-xs text-gray-500">
              {t('salarySlips.taxableIncome', 'Taxable income')}: {Number(slip.taxable_income).toFixed(2)}
              {' · '}
              {t('salarySlips.incomeTax', 'IR')}: {Number(slip.income_tax ?? 0).toFixed(2)}
            </div>
          )}
        </div>
      )}
    </ResponsiveDialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded p-2 dark:border-gray-700">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="font-medium">{title}</h3>
      {children}
    </div>
  );
}

function Lines({ lines }: { lines: { name: string; category: string; amount: number }[] }) {
  return (
    <div className="space-y-1">
      {lines.map((l, i) => (
        <div key={i} className="flex justify-between border-b last:border-b-0 dark:border-gray-700 py-1">
          <span>
            {l.name}{' '}
            <span className="text-xs text-gray-500">{l.category}</span>
          </span>
          <span>{Number(l.amount).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

function Total({
  label, value, positive = false, bold = false,
}: { label: string; value: number; positive?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'text-base font-semibold' : 'text-sm font-medium'}`}>
      <span>{label}</span>
      <span className={positive ? 'text-emerald-700 dark:text-emerald-400' : ''}>
        {Number(value).toFixed(2)}
      </span>
    </div>
  );
}
