import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { useInvoicesByType } from '@/hooks/useInvoices';
import type { Payment } from '@/hooks/useAccountingPayments';
import { useAllocatePayment } from '@/hooks/useAccountingPayments';
import { Loader2, AlertCircle } from 'lucide-react';
import { DEFAULT_CURRENCY } from '@/utils/currencies';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

interface PaymentAllocationDialogProps {
  payment: Payment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllocated?: () => void;
}

export const PaymentAllocationDialog = ({
  payment,
  open,
  onOpenChange,
  onAllocated,
}: PaymentAllocationDialogProps) => {
  const { t } = useTranslation('accounting');
  const invoiceType = payment.payment_type === 'receive' ? 'sales' : 'purchase';
  const { data: invoices = [], isLoading } = useInvoicesByType(invoiceType);
  const allocatePayment = useAllocatePayment();
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string>('');
  const [allocationAmount, setAllocationAmount] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setSelectedInvoiceId('');
      setAllocationAmount(0);
      setError(null);
    }
  }, [open]);

  const eligibleInvoices = React.useMemo(() => {
    return invoices
      .filter((invoice) => {
        const outstanding = Number(invoice.outstanding_amount ?? invoice.grand_total ?? 0);
        if (outstanding <= 0) return false;
        if (!['submitted', 'partially_paid', 'overdue'].includes(invoice.status)) return false;
        return true;
      })
      .sort((a, b) => Number(b.outstanding_amount ?? 0) - Number(a.outstanding_amount ?? 0));
  }, [invoices]);

  const selectedInvoice = eligibleInvoices.find((invoice) => invoice.id === selectedInvoiceId);

  const maxAllocatable = selectedInvoice
    ? Math.min(
        Number(selectedInvoice.outstanding_amount ?? 0),
        Number(payment.amount)
      )
    : 0;

  const handleAllocate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedInvoice) {
      setError(t('dialogs.paymentAllocation.selectInvoiceError'));
      return;
    }

    if (!allocationAmount || allocationAmount <= 0) {
      setError(t('dialogs.paymentAllocation.amountError'));
      return;
    }

    if (allocationAmount - maxAllocatable > 0.01) {
      setError(t('dialogs.paymentAllocation.exceedsBalanceError'));
      return;
    }

    try {
      setError(null);
      await allocatePayment.mutateAsync({
        payment_id: payment.id,
        allocations: [
          {
            invoice_id: selectedInvoice.id,
            allocated_amount: allocationAmount,
          },
        ],
      });
      onOpenChange(false);
      onAllocated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dialogs.paymentAllocation.allocationFailed'));
    }
  };

  const isSubmitting = allocatePayment.isPending;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('dialogs.paymentAllocation.title')}
      description={t('dialogs.paymentAllocation.description')}
      size="2xl"
    >

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : eligibleInvoices.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-muted-foreground dark:border-gray-700">
              <AlertCircle className="h-6 w-6 text-emerald-500" />
              <div>
                {t('dialogs.paymentAllocation.noInvoicesFound')}
                {invoiceType === 'sales'
                  ? ` ${t('dialogs.paymentAllocation.ensureSalesInvoice')}`
                  : ` ${t('dialogs.paymentAllocation.ensurePurchaseInvoice')}`}
              </div>
            </div>
        ) : (
          <form className="space-y-4" onSubmit={handleAllocate}>
            <FormField label={t('dialogs.paymentAllocation.invoiceToSettle')} htmlFor="invoice-select" required>
              <select
                id="invoice-select"
                value={selectedInvoiceId}
                onChange={(event) => {
                  const newId = event.target.value;
                  setSelectedInvoiceId(newId);
                  const invoice = eligibleInvoices.find((inv) => inv.id === newId);
                  if (invoice) {
                    const suggested = Math.min(
                      Number(invoice.outstanding_amount ?? 0),
                      Number(payment.amount)
                    );
                    setAllocationAmount(suggested);
                  } else {
                    setAllocationAmount(0);
                  }
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <option value="">{t('dialogs.paymentAllocation.selectInvoice')}</option>
                {eligibleInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} — {t('dialogs.paymentAllocation.remaining')} {Number(invoice.outstanding_amount ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: invoice.currency_code || DEFAULT_CURRENCY })}
                  </option>
                ))}
              </select>
            </FormField>

            {selectedInvoice && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>{t('dialogs.paymentAllocation.invoiceBalance')}</span>
                  <span>
                    {Number(selectedInvoice.outstanding_amount ?? 0).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: selectedInvoice.currency_code || DEFAULT_CURRENCY,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dialogs.paymentAllocation.paymentAmount')}</span>
                  <span>
                    {Number(payment.amount).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: payment.currency_code || DEFAULT_CURRENCY,
                    })}
                  </span>
                </div>
              </div>
            )}

            {selectedInvoice && (
              <FormField label={t('dialogs.paymentAllocation.amountToAllocate')} required>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxAllocatable}
                  value={allocationAmount}
                  onChange={(e) => setAllocationAmount(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('dialogs.paymentAllocation.maxAllocatable')}: {maxAllocatable.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: selectedInvoice.currency_code || DEFAULT_CURRENCY,
                  })}
                </p>
              </FormField>
            )}

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('app.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedInvoice}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('dialogs.paymentAllocation.posting')}
                  </span>
                ) : (
                  t('dialogs.paymentAllocation.allocateAndPost')
                )}
              </Button>
            </div>
          </form>
        )}
    </ResponsiveDialog>
  );
};
