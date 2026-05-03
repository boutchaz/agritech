import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { useAccounts } from '@/hooks/useAccounts';
import { useAuth } from '@/hooks/useAuth';
import { financialReportsApi } from '@/lib/api/financial-reports';

interface FiscalYearLite {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status?: string | null;
}

interface CloseFiscalYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fiscalYear: FiscalYearLite;
  netIncomePreview?: number;
  currencySymbol: string;
}

const formatAmount = (n: number, symbol: string) =>
  `${symbol} ${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const CloseFiscalYearDialog: React.FC<CloseFiscalYearDialogProps> = ({
  open,
  onOpenChange,
  fiscalYear,
  netIncomePreview,
  currencySymbol,
}) => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const accountsQuery = useAccounts() as unknown as {
    data?: Array<{ id: string; code: string; name: string; account_type?: string; account_subtype?: string | null; is_group?: boolean }>;
  };
  const queryClient = useQueryClient();

  const equityAccounts = useMemo(() => {
    const accounts = accountsQuery.data || [];
    return accounts.filter((a) => {
      if (a.is_group) return false;
      const type = (a.account_type || '').toLowerCase();
      if (type !== 'equity') return false;
      const sub = (a.account_subtype || '').toLowerCase();
      const name = (a.name || '').toLowerCase();
      return (
        sub.includes('retained') ||
        sub.includes('reserve') ||
        name.includes('retained') ||
        name.includes('reserve') ||
        name.includes('résultat') ||
        name.includes('report')
      );
    });
  }, [accountsQuery.data]);

  const schema = useMemo(
    () =>
      z.object({
        retained_earnings_account_id: z
          .string()
          .uuid({ message: t('fiscalYearClose.errors.selectAccount', 'Select a Retained Earnings account') }),
        closing_date: z.string().optional(),
        remarks: z.string().optional(),
      }),
    [t],
  );
  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      retained_earnings_account_id: '',
      closing_date: fiscalYear.end_date,
      remarks: '',
    },
  });

  const closeMutation = useMutation({
    mutationFn: (data: FormData) =>
      financialReportsApi.closeFiscalYear(
        {
          fiscal_year_id: fiscalYear.id,
          retained_earnings_account_id: data.retained_earnings_account_id,
          closing_date: data.closing_date || undefined,
          remarks: data.remarks || undefined,
        },
        currentOrganization?.id,
      ),
    onSuccess: (res) => {
      toast.success(
        t('fiscalYearClose.success', 'Fiscal year closed (JE: {{n}})', { n: res.entryNumber }),
      );
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || t('fiscalYearClose.error', 'Failed to close fiscal year'));
    },
  });

  const onSubmit = (data: FormData) => closeMutation.mutate(data);
  const noEquity = (accountsQuery.data?.length || 0) > 0 && equityAccounts.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('fiscalYearClose.title', 'Close Fiscal Year')}</DialogTitle>
          <DialogDescription>
            {t(
              'fiscalYearClose.description',
              'Posts a year-end closing journal entry that zeroes out income and expense accounts into a Retained Earnings account.',
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-md border p-3 bg-gray-50 dark:bg-gray-800/50 text-sm space-y-1">
            <div>
              <span className="font-medium">{t('fiscalYearClose.fiscalYear', 'Fiscal Year')}: </span>
              {fiscalYear.name}
            </div>
            <div>
              <span className="font-medium">{t('fiscalYearClose.period', 'Period')}: </span>
              {fiscalYear.start_date} → {fiscalYear.end_date}
            </div>
            {netIncomePreview !== undefined && (
              <div>
                <span className="font-medium">{t('fiscalYearClose.netIncome', 'Net Income')}: </span>
                <span className={netIncomePreview >= 0 ? 'text-blue-600' : 'text-orange-600'}>
                  {formatAmount(netIncomePreview, currencySymbol)}
                </span>
              </div>
            )}
          </div>

          {noEquity ? (
            <div className="border border-red-300 bg-red-50 dark:bg-red-900/20 rounded-md p-3 text-sm text-red-800 dark:text-red-200">
              {t(
                'fiscalYearClose.noRetainedEarnings',
                'No Retained Earnings account found. Create one first (Equity → Retained Earnings).',
              )}
            </div>
          ) : (
            <div>
              <Label htmlFor="re_account">
                {t('fiscalYearClose.retainedEarningsAccount', 'Retained Earnings Account')}
              </Label>
              <NativeSelect
                id="re_account"
                {...form.register('retained_earnings_account_id')}
                className="mt-1"
              >
                <option value="">{t('fiscalYearClose.selectAccount', 'Select an account...')}</option>
                {equityAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </NativeSelect>
              {form.formState.errors.retained_earnings_account_id && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.retained_earnings_account_id.message}
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="closing_date">
              {t('fiscalYearClose.closingDate', 'Closing Date')}
            </Label>
            <input
              id="closing_date"
              type="date"
              {...form.register('closing_date')}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="remarks">{t('fiscalYearClose.remarks', 'Remarks (optional)')}</Label>
            <textarea
              id="remarks"
              {...form.register('remarks')}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={noEquity || closeMutation.isPending}
            >
              {closeMutation.isPending
                ? t('fiscalYearClose.closing', 'Closing...')
                : t('fiscalYearClose.confirm', 'Close Fiscal Year')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
