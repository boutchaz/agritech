import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { useInvoices } from '@/hooks/useInvoices';
import type { Payment } from '@/hooks/useAccountingPayments';
import { useAllocatePayment } from '@/hooks/useAccountingPayments';
import { Loader2, AlertCircle } from 'lucide-react';

interface PaymentAllocationDialogProps {
  payment: Payment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllocated?: () => void;
}

export const PaymentAllocationDialog: React.FC<PaymentAllocationDialogProps> = ({
  payment,
  open,
  onOpenChange,
  onAllocated,
}) => {
  const invoiceType = payment.payment_type === 'receive' ? 'sales' : 'purchase';
  const { data: invoices = [], isLoading } = useInvoices();
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
    const paymentAmount = Number(payment.amount);
    return invoices
      .filter((invoice) => invoice.invoice_type === invoiceType)
      .filter((invoice) => {
        const outstanding = Number(invoice.outstanding_amount ?? 0);
        if (outstanding <= 0) return false;
        if (!['submitted', 'partially_paid', 'overdue'].includes(invoice.status)) return false;
        return Math.abs(outstanding - paymentAmount) <= 0.01;
      });
  }, [invoices, invoiceType, payment.amount]);

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
      setError('Veuillez sélectionner une facture à régler.');
      return;
    }

    if (!allocationAmount || allocationAmount <= 0) {
      setError('Le montant alloué doit être supérieur à zéro.');
      return;
    }

    if (allocationAmount - maxAllocatable > 0.01) {
      setError('Le montant dépasse le solde restant pour cette facture ou le montant du paiement.');
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
      setError(err instanceof Error ? err.message : 'Échec de l’allocation du paiement.');
    }
  };

  const isSubmitting = allocatePayment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Allouer et comptabiliser le paiement</DialogTitle>
          <DialogDescription>
            Sélectionnez une facture en attente et indiquez le montant à lui affecter. L’écriture comptable sera générée automatiquement.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : eligibleInvoices.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-muted-foreground dark:border-gray-700">
              <AlertCircle className="h-6 w-6 text-emerald-500" />
              <div>
              Aucune facture dont le solde correspond exactement au montant du paiement n’a été trouvée.
              {invoiceType === 'sales'
                ? ' Assurez-vous qu’une facture de vente en attente possède le même solde restant.'
                : ' Assurez-vous qu’une facture d’achat en attente possède le même solde restant.'}
              </div>
            </div>
        ) : (
          <form className="space-y-4" onSubmit={handleAllocate}>
            <FormField label="Facture à régler" htmlFor="invoice-select" required>
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
                <option value="">Sélectionnez une facture…</option>
                {eligibleInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} — reste dû {Number(invoice.outstanding_amount ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: invoice.currency_code || 'MAD' })}
                  </option>
                ))}
              </select>
            </FormField>

            {selectedInvoice && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Solde de la facture</span>
                  <span>
                    {Number(selectedInvoice.outstanding_amount ?? 0).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: selectedInvoice.currency_code || 'MAD',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Montant du paiement</span>
                  <span>
                    {Number(payment.amount).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: payment.currency_code || 'MAD',
                    })}
                  </span>
                </div>
              </div>
            )}

            {selectedInvoice && (
              <FormField label="Montant à comptabiliser" required>
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {allocationAmount.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: selectedInvoice.currency_code || 'MAD',
                  })}
                </div>
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
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedInvoice}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Comptabilisation…
                  </span>
                ) : (
                  'Allouer et comptabiliser'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
