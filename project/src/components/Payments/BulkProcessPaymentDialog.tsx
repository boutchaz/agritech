import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useBulkProcessPayments } from '@/hooks/usePayments';
import {
  formatCurrency,
  type PaymentMethod,
  type PaymentSummary,
} from '@/types/payments';

interface BulkProcessPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Payments eligible for bulk processing (status='approved'). */
  payments: PaymentSummary[];
}

export function BulkProcessPaymentDialog({ open, onOpenChange, payments }: BulkProcessPaymentDialogProps) {
  const { t } = useTranslation();
  const bulk = useBulkProcessPayments();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [referencePrefix, setReferencePrefix] = useState<string>('');

  const eligible = useMemo(
    () => payments.filter((p) => p.status === 'approved'),
    [payments],
  );

  const selectedIds = useMemo(
    () => eligible.filter((p) => selected[p.id]).map((p) => p.id),
    [eligible, selected],
  );
  const totalSelectedAmount = useMemo(
    () => eligible.filter((p) => selected[p.id]).reduce((s, p) => s + Number(p.net_amount || 0), 0),
    [eligible, selected],
  );
  const allChecked = selectedIds.length > 0 && selectedIds.length === eligible.length;

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error(t('payments.bulk.selectNone', 'Sélectionnez au moins un paiement.'));
      return;
    }
    const requests = selectedIds.map((payment_id, idx) => ({
      payment_id,
      payment_method: paymentMethod,
      payment_reference: referencePrefix ? `${referencePrefix}-${idx + 1}` : undefined,
    }));
    const { succeeded, failed } = await bulk.mutateAsync(requests);
    if (failed === 0) {
      toast.success(
        t('payments.bulk.successAll', '{{count}} paiements traités', { count: succeeded }),
      );
    } else if (succeeded === 0) {
      toast.error(t('payments.bulk.allFailed', 'Aucun paiement n\'a pu être traité.'));
    } else {
      toast.warning(
        t('payments.bulk.partial', '{{succeeded}} traités, {{failed}} échoués', {
          succeeded,
          failed,
        }),
      );
    }
    onOpenChange(false);
    setSelected({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('payments.bulk.title', 'Paiement groupé des employés')}</DialogTitle>
          <DialogDescription>
            {t(
              'payments.bulk.description',
              'Sélectionnez les paiements approuvés à traiter en une seule action.',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bulk_method">{t('payments.bulk.method', 'Mode de paiement')}</Label>
              <NativeSelect
                id="bulk_method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                <option value="bank_transfer">{t('payments.methods.bankTransfer', 'Virement bancaire')}</option>
                <option value="cash">{t('payments.methods.cash', 'Espèces')}</option>
                <option value="check">{t('payments.methods.check', 'Chèque')}</option>
                <option value="mobile_money">{t('payments.methods.mobileMoney', 'Mobile money')}</option>
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="bulk_ref">{t('payments.bulk.referencePrefix', 'Préfixe référence')}</Label>
              <Input
                id="bulk_ref"
                value={referencePrefix}
                onChange={(e) => setReferencePrefix(e.target.value)}
                placeholder="VIR-2026-05"
              />
            </div>
          </div>

          <div className="border rounded-md max-h-[40vh] overflow-y-auto">
            <div className="px-3 py-2 border-b flex items-center gap-2 bg-muted/40 sticky top-0">
              <Checkbox
                checked={allChecked}
                onCheckedChange={(checked) => {
                  const next: Record<string, boolean> = {};
                  if (checked) eligible.forEach((p) => (next[p.id] = true));
                  setSelected(next);
                }}
              />
              <span className="text-sm font-medium">
                {t('payments.bulk.selectedSummary', '{{count}} sélectionnés — {{total}}', {
                  count: selectedIds.length,
                  total: formatCurrency(totalSelectedAmount, 'MAD'),
                })}
              </span>
            </div>
            {eligible.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">
                {t('payments.bulk.noEligible', 'Aucun paiement approuvé en attente.')}
              </p>
            ) : (
              <ul className="divide-y">
                {eligible.map((p) => (
                  <li key={p.id} className="px-3 py-2 flex items-center gap-2">
                    <Checkbox
                      checked={!!selected[p.id]}
                      onCheckedChange={(checked) =>
                        setSelected((prev) => ({ ...prev, [p.id]: !!checked }))
                      }
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.worker_name || p.worker_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.period_start} → {p.period_end}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatCurrency(Number(p.net_amount || 0), 'MAD')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={bulk.isPending}>
            {t('app.cancel', 'Annuler')}
          </Button>
          <Button onClick={handleSubmit} disabled={bulk.isPending || selectedIds.length === 0}>
            {bulk.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('payments.bulk.submit', 'Traiter {{count}} paiement(s)', { count: selectedIds.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
