import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Coins, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useApplyAdvance, useOpenAdvances } from '@/hooks/useAccountingAdvances';
import { cn } from '@/lib/utils';

interface InvoiceLite {
  id: string;
  invoice_number: string;
  invoice_type: 'sales' | 'purchase';
  party_id: string | null;
  outstanding_amount: number | string;
  currency_code?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceLite;
}

const formatMoney = (n: number, currency = 'MAD') =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);

export function ApplyAdvanceDialog({ open, onOpenChange, invoice }: Props) {
  const { t } = useTranslation();
  const partyType = invoice.invoice_type === 'sales' ? 'customer' : 'supplier';
  const { data: advances = [], isLoading } = useOpenAdvances(
    open && invoice.party_id
      ? { party_id: invoice.party_id, party_type: partyType }
      : undefined,
  );
  const applyMutation = useApplyAdvance();

  // amounts keyed by advance.id
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  const outstanding = Number(invoice.outstanding_amount) || 0;
  const totalApply = useMemo(
    () => Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0),
    [amounts],
  );
  const exceedsOutstanding = totalApply > outstanding + 0.01;
  const currency = invoice.currency_code || 'MAD';

  const onSubmit = async () => {
    const entries = Object.entries(amounts).filter(([, v]) => Number(v) > 0);
    if (entries.length === 0) {
      toast.error(t('advance.errors.noAmount', 'Enter an amount to apply'));
      return;
    }
    if (exceedsOutstanding) {
      toast.error(t('advance.errors.exceeds', 'Total exceeds invoice outstanding'));
      return;
    }

    try {
      // Apply each advance one at a time (simpler than batching)
      for (const [advanceId, amount] of entries) {
        await applyMutation.mutateAsync({
          advanceId,
          data: {
            allocations: [{ invoice_id: invoice.id, amount: Number(amount) }],
          },
        });
      }
      toast.success(t('advance.toast.applied', 'Advance applied'));
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(`${t('advance.toast.error', 'Failed')}: ${msg}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            {t('advance.dialog.applyTitle', 'Apply advance to invoice')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'advance.dialog.applyDescription',
              'Allocate one or more open advances against {{invoice}}. Outstanding: {{amount}}.',
              { invoice: invoice.invoice_number, amount: formatMoney(outstanding, currency) },
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-4">
              {t('common.loading', 'Loading…')}
            </div>
          ) : advances.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {t(
                'advance.empty',
                'No open advances for this party. Record one first from the customer/supplier detail page.',
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('advance.cols.number', 'Advance')}</TableHead>
                  <TableHead>{t('advance.cols.date', 'Date')}</TableHead>
                  <TableHead className="text-right">
                    {t('advance.cols.remaining', 'Remaining')}
                  </TableHead>
                  <TableHead className="w-[140px] text-right">
                    {t('advance.cols.applyAmount', 'Apply')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advances.map((adv) => {
                  const remaining = Number(adv.remaining_amount ?? adv.amount) || 0;
                  return (
                    <TableRow key={adv.id}>
                      <TableCell className="font-mono text-sm">{adv.payment_number}</TableCell>
                      <TableCell className="text-sm">{adv.payment_date}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(remaining, adv.currency_code || currency)}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={remaining}
                          step="0.01"
                          value={amounts[adv.id] || ''}
                          onChange={(e) =>
                            setAmounts((prev) => ({
                              ...prev,
                              [adv.id]: Number(e.target.value) || 0,
                            }))
                          }
                          placeholder="0"
                          className="text-right"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {advances.length > 0 && (
          <div className="border-t pt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('advance.totals.label', 'Total to apply')}
            </span>
            <span
              className={cn(
                'font-semibold',
                exceedsOutstanding && 'text-red-600 dark:text-red-400',
              )}
            >
              {formatMoney(totalApply, currency)}
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={
              applyMutation.isPending
              || advances.length === 0
              || totalApply <= 0
              || exceedsOutstanding
            }
          >
            {applyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('advance.dialog.applySubmit', 'Apply advance')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RecordProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partyKind: 'customer' | 'supplier';
  partyId: string;
  partyName: string;
}

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateAdvance } from '@/hooks/useAccountingAdvances';

interface RecordAdvanceFormData {
  amount: number;
  payment_date: string;
  reference_number?: string;
  notes?: string;
}

export function RecordAdvanceDialog({ open, onOpenChange, partyKind, partyId, partyName }: RecordProps) {
  const { t } = useTranslation();
  const createMutation = useCreateAdvance();
  const today = new Date().toISOString().split('T')[0];
  const form = useForm<RecordAdvanceFormData>({
    defaultValues: { amount: 0, payment_date: today, reference_number: '', notes: '' },
  });

  // Reset on open
  useEffect(() => {
    if (open) form.reset({ amount: 0, payment_date: today, reference_number: '', notes: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (data: RecordAdvanceFormData) => {
    if (!data.amount || data.amount <= 0) {
      toast.error(t('advance.errors.amountRequired', 'Amount must be > 0'));
      return;
    }
    try {
      await createMutation.mutateAsync({
        party_kind: partyKind,
        party_id: partyId,
        party_name: partyName,
        amount: Number(data.amount),
        payment_date: data.payment_date,
        reference_number: data.reference_number || undefined,
        notes: data.notes || undefined,
      });
      toast.success(t('advance.toast.recorded', 'Advance recorded'));
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(`${t('advance.toast.error', 'Failed')}: ${msg}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            {partyKind === 'customer'
              ? t('advance.dialog.recordCustomerTitle', 'Record customer prepayment')
              : t('advance.dialog.recordSupplierTitle', 'Record supplier advance')}
          </DialogTitle>
          <DialogDescription>
            {partyKind === 'customer'
              ? t('advance.dialog.recordCustomerDesc',
                  'Cash received from {{name}} before invoicing. Posts to customer-advance account (CGNC 4421).',
                  { name: partyName })
              : t('advance.dialog.recordSupplierDesc',
                  'Cash paid to {{name}} before receiving the invoice. Posts to supplier-advance account (CGNC 3421).',
                  { name: partyName })}
          </DialogDescription>
        </DialogHeader>

        <form id="record-advance-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="advance-amount">{t('advance.dialog.amount', 'Amount (MAD)')}</Label>
              <Input
                id="advance-amount"
                type="number"
                step="0.01"
                min={0}
                {...form.register('amount', { valueAsNumber: true })}
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="advance-date">{t('advance.dialog.date', 'Date')}</Label>
              <Input
                id="advance-date"
                type="date"
                {...form.register('payment_date')}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="advance-ref">{t('advance.dialog.reference', 'Reference (optional)')}</Label>
            <Input
              id="advance-ref"
              {...form.register('reference_number')}
              placeholder={t('advance.dialog.referencePlaceholder', 'Check #, transfer ref…')}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="advance-notes">{t('advance.dialog.notes', 'Notes (optional)')}</Label>
            <Input
              id="advance-notes"
              {...form.register('notes')}
              className="mt-1"
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            form="record-advance-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('advance.dialog.recordSubmit', 'Record advance')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
