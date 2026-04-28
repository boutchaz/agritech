import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, RotateCcw } from 'lucide-react';
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
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCreateCreditNote } from '@/hooks/useInvoices';
import { cn } from '@/lib/utils';

// Local structural types — the generated database.types is currently empty
// (regenerated only when `supabase start` is running). Keep this dialog
// independent of that to avoid coupling.
interface InvoiceItem {
  id: string;
  item_name: string;
  unit_of_measure: string | null;
  unit_price: number | string;
  quantity: number | string;
  tax_rate?: number | string | null;
  item_id?: string | null;
}

interface InvoiceCore {
  id: string;
  invoice_number: string;
  invoice_type: 'sales' | 'purchase';
  grand_total: number | string;
  credited_amount?: number | string | null;
  currency_code?: string | null;
}

const REASONS = [
  { value: 'return', labelKey: 'creditNote.reason.return', label: 'Return' },
  { value: 'damage', labelKey: 'creditNote.reason.damage', label: 'Damage' },
  { value: 'weight_dispute', labelKey: 'creditNote.reason.weight', label: 'Weight dispute' },
  { value: 'price_adjustment', labelKey: 'creditNote.reason.price', label: 'Price adjustment' },
  { value: 'other', labelKey: 'creditNote.reason.other', label: 'Other' },
] as const;

interface InvoiceWithItems extends InvoiceCore {
  invoice_items?: Partial<InvoiceItem>[];
  items?: Partial<InvoiceItem>[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Loose type — useInvoice returns a generic Invoice that lacks our extra
  // fields; we read defensively via numeric coercion at call sites.
  invoice: Partial<InvoiceWithItems> & { id?: string };
}

interface LineState {
  original_item_id: string;
  item_name: string;
  unit_of_measure: string | null;
  unit_price: number;
  original_quantity: number;
  quantity: number;
  hasItemId: boolean;
  selected: boolean;
  tax_rate: number;
}

const formatMoney = (n: number, currency = 'MAD') =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);

export function CreditNoteDialog({ open, onOpenChange, invoice }: Props) {
  const { t } = useTranslation();
  const createMutation = useCreateCreditNote();

  // Component is conditionally mounted by the parent when `open` becomes true,
  // so lazy initializers run once per credit-note session — no reset effect.
  const originalItems = useMemo<Partial<InvoiceItem>[]>(
    () => invoice.invoice_items || invoice.items || [],
    [invoice],
  );

  const [reasonKey, setReasonKey] = useState<string>('return');
  const [reasonText, setReasonText] = useState<string>('');
  const [restoreStock, setRestoreStock] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [lines, setLines] = useState<LineState[]>(() =>
    originalItems
      .filter((it): it is Partial<InvoiceItem> & { id: string } => !!it.id)
      .map((it) => ({
        original_item_id: it.id,
        item_name: it.item_name ?? '—',
        unit_of_measure: it.unit_of_measure ?? null,
        unit_price: Number(it.unit_price) || 0,
        original_quantity: Number(it.quantity) || 0,
        quantity: Number(it.quantity) || 0,
        hasItemId: !!it.item_id,
        selected: true,
        tax_rate: Number(it.tax_rate ?? 0),
      })),
  );

  const hasAnyStockItem = lines.some((l) => l.hasItemId && l.selected);

  const subtotal = useMemo(
    () => lines.filter((l) => l.selected).reduce((s, l) => s + l.unit_price * l.quantity, 0),
    [lines],
  );
  const taxTotal = useMemo(
    () => lines
      .filter((l) => l.selected)
      .reduce((s, l) => s + l.unit_price * l.quantity * (l.tax_rate / 100), 0),
    [lines],
  );
  const grandTotal = subtotal + taxTotal;

  const uncreditedBalance =
    Number(invoice.grand_total ?? 0) - (Number(invoice.credited_amount) || 0);
  const exceedsBalance = grandTotal > uncreditedBalance + 0.01;

  const updateLine = (idx: number, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const onSubmit = async () => {
    if (lines.filter((l) => l.selected).length === 0) {
      toast.error(t('creditNote.errors.noLines', 'Select at least one line to credit'));
      return;
    }
    if (grandTotal <= 0) {
      toast.error(t('creditNote.errors.zeroTotal', 'Credit total must be greater than zero'));
      return;
    }
    if (exceedsBalance) {
      toast.error(
        t('creditNote.errors.exceeds', 'Credit exceeds the uncredited balance of this invoice'),
      );
      return;
    }

    const reason =
      reasonKey === 'other' && reasonText
        ? reasonText
        : (REASONS.find((r) => r.value === reasonKey)?.label ?? 'Other');

    if (!invoice.id) {
      toast.error(t('creditNote.errors.noInvoice', 'Missing invoice ID'));
      return;
    }
    const invoiceId = invoice.id;
    try {
      await createMutation.mutateAsync({
        originalInvoiceId: invoiceId,
        data: {
          credit_reason: reason,
          restore_stock: hasAnyStockItem ? restoreStock : false,
          notes: notes || undefined,
          lines: lines
            .filter((l) => l.selected)
            .map((l) => ({
              original_item_id: l.original_item_id,
              quantity: l.quantity,
              unit_price: l.unit_price,
            })),
        },
      });
      toast.success(t('creditNote.toast.created', 'Credit note created'));
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      toast.error(`${t('creditNote.toast.error', 'Failed')}: ${message}`);
    }
  };

  const currency = invoice.currency_code || 'MAD';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            {t('creditNote.dialog.title', 'Create credit note')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'creditNote.dialog.description',
              'Credits {{number}}. Posts an inverse journal entry; uncredited balance is {{balance}}.',
              {
                number: invoice.invoice_number,
                balance: formatMoney(uncreditedBalance, currency),
              },
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Reason */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="credit-reason">{t('creditNote.dialog.reason', 'Reason')}</Label>
              <Select value={reasonKey} onValueChange={setReasonKey}>
                <SelectTrigger id="credit-reason" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {t(r.labelKey, r.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reasonKey === 'other' && (
              <div>
                <Label htmlFor="credit-reason-text">
                  {t('creditNote.dialog.reasonText', 'Specify reason')}
                </Label>
                <Input
                  id="credit-reason-text"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  className="mt-1"
                  placeholder={t('creditNote.dialog.reasonTextPlaceholder', 'Free text…')}
                />
              </div>
            )}
          </div>

          {/* Lines */}
          <div>
            <Label>{t('creditNote.dialog.lines', 'Lines to credit')}</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>{t('creditNote.cols.item', 'Item')}</TableHead>
                  <TableHead className="text-right">
                    {t('creditNote.cols.origQty', 'Orig. qty')}
                  </TableHead>
                  <TableHead className="w-[120px] text-right">
                    {t('creditNote.cols.creditQty', 'Credit qty')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('creditNote.cols.unitPrice', 'Unit price')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('creditNote.cols.lineTotal', 'Line total')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l, idx) => (
                  <TableRow
                    key={l.original_item_id}
                    className={cn(!l.selected && 'opacity-50')}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={l.selected}
                        onChange={(e) => updateLine(idx, { selected: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{l.item_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.unit_of_measure || 'unit'}
                        {l.hasItemId && ` · ${t('creditNote.stockItem', 'Stock item')}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {l.original_quantity}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={l.original_quantity}
                        step="0.01"
                        value={l.quantity}
                        onChange={(e) =>
                          updateLine(idx, { quantity: Number(e.target.value) || 0 })
                        }
                        disabled={!l.selected}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatMoney(l.unit_price, currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(l.unit_price * l.quantity, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Stock toggle */}
          {hasAnyStockItem && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={restoreStock}
                onChange={(e) => setRestoreStock(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span>
                {invoice.invoice_type === 'sales'
                  ? t('creditNote.dialog.restoreStockSales', 'Restore items to warehouse')
                  : t('creditNote.dialog.restoreStockPurchase', 'Return items to supplier (issue from warehouse)')}
              </span>
            </label>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="credit-notes">
              {t('creditNote.dialog.notes', 'Notes (optional)')}
            </Label>
            <Textarea
              id="credit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1"
              placeholder={t('creditNote.dialog.notesPlaceholder', 'Internal notes…')}
            />
          </div>

          {/* Totals */}
          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('creditNote.totals.subtotal', 'Subtotal')}
              </span>
              <span>{formatMoney(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('creditNote.totals.tax', 'Tax')}
              </span>
              <span>{formatMoney(taxTotal, currency)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t">
              <span>{t('creditNote.totals.grand', 'Credit total')}</span>
              <span className={cn(exceedsBalance && 'text-red-600 dark:text-red-400')}>
                {formatMoney(grandTotal, currency)}
              </span>
            </div>
            {exceedsBalance && (
              <div className="text-xs text-red-600 dark:text-red-400 pt-1">
                {t(
                  'creditNote.errors.exceedsHint',
                  'Exceeds uncredited balance of {{balance}}',
                  { balance: formatMoney(uncreditedBalance, currency) },
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={createMutation.isPending || exceedsBalance || grandTotal <= 0}
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('creditNote.dialog.submit', 'Create credit note')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
