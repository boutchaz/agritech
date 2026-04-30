import { useTranslation } from 'react-i18next';
import { usePurchaseReceipt, useSubmitPurchaseReceipt, useCancelPurchaseReceipt } from '@/hooks/usePurchaseReceipts';
import { type PurchaseReceipt } from '@/hooks/usePurchaseReceipts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { SectionLoader } from '@/components/ui/loader';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface PurchaseReceiptDetailDialogProps {
  purchaseReceipt: PurchaseReceipt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (receipt: PurchaseReceipt) => void;
  onCancel?: (receipt: PurchaseReceipt) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'submitted':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'draft':
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'submitted':
      return <CheckCircle2 className="h-3 w-3" />;
    case 'cancelled':
      return <XCircle className="h-3 w-3" />;
    case 'draft':
    default:
      return <Clock className="h-3 w-3" />;
  }
};

const ReceiptContent = ({ receipt, onSubmit, onCancel }: { receipt: PurchaseReceipt; onSubmit?: (r: PurchaseReceipt) => void; onCancel?: (r: PurchaseReceipt) => void }) => {
  const { t } = useTranslation();
  const submitMutation = useSubmitPurchaseReceipt();
  const cancelMutation = useCancelPurchaseReceipt();

  const handleSubmit = () => {
    if (!onSubmit) return;
    onSubmit(receipt);
  };

  const handleCancel = () => {
    if (!onCancel) return;
    onCancel(receipt);
  };

  const formatCurrency = (amount: number) =>
    `${Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString('fr-FR') : '-';

  const items = receipt.items ?? [];
  const totalSubtotal = items.reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0);
  const totalTax = items.reduce((sum, item) => sum + Number(item.tax_amount), 0);
  const totalAmount = Number(receipt.total_amount);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.purchaseReceipts.detail.receiptNumber', 'Receipt Number')}</p>
          <p className="font-semibold text-gray-900 dark:text-white">{receipt.receipt_number}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.purchaseReceipts.detail.status', 'Status')}</p>
          <Badge className={`${getStatusColor(receipt.status)} flex items-center gap-1 w-fit mt-0.5`}>
            {getStatusIcon(receipt.status)}
            {receipt.status}
          </Badge>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.purchaseReceipts.detail.receiptDate', 'Receipt Date')}</p>
          <p className="font-medium text-gray-900 dark:text-white">{formatDate(receipt.receipt_date)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.purchaseReceipts.detail.supplier', 'Supplier')}</p>
          <p className="font-medium text-gray-900 dark:text-white">{receipt.supplier_name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.purchaseReceipts.detail.purchaseOrder', 'Purchase Order')}</p>
          <p className="font-medium text-gray-900 dark:text-white">{receipt.purchase_order?.order_number || '-'}</p>
        </div>
        {receipt.notes && (
          <div className="col-span-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.purchaseReceipts.detail.notes', 'Notes')}</p>
            <p className="font-medium text-gray-900 dark:text-white">{receipt.notes}</p>
          </div>
        )}
        {receipt.submitted_at && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.purchaseReceipts.detail.submittedAt', 'Submitted At')}</p>
            <p className="font-medium text-gray-900 dark:text-white">{new Date(receipt.submitted_at).toLocaleString('fr-FR')}</p>
          </div>
        )}
        {receipt.cancelled_at && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.purchaseReceipts.detail.cancelledAt', 'Cancelled At')}</p>
            <p className="font-medium text-gray-900 dark:text-white">{new Date(receipt.cancelled_at).toLocaleString('fr-FR')}</p>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('billingModule.purchaseReceipts.detail.items', 'Received Items')}</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('billingModule.purchaseReceipts.detail.item', 'Item')}</TableHead>
                  <TableHead className="text-xs text-right">{t('billingModule.purchaseReceipts.detail.qty', 'Qty')}</TableHead>
                  <TableHead className="text-xs text-right">{t('billingModule.purchaseReceipts.detail.rejected', 'Rejected')}</TableHead>
                  <TableHead className="text-xs text-right">{t('billingModule.purchaseReceipts.detail.accepted', 'Accepted')}</TableHead>
                  <TableHead className="text-xs text-right">{t('billingModule.purchaseReceipts.detail.unitPrice', 'Unit Price')}</TableHead>
                  <TableHead className="text-xs text-right">{t('billingModule.purchaseReceipts.detail.tax', 'Tax')}</TableHead>
                  <TableHead className="text-xs">{t('billingModule.purchaseReceipts.detail.batch', 'Batch')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell className="text-sm py-2">{item.item_name || '-'}</TableCell>
                    <TableCell className="text-sm py-2 text-right">{Number(item.quantity)}</TableCell>
                    <TableCell className="text-sm py-2 text-right text-red-600">{Number(item.rejected_quantity) > 0 ? Number(item.rejected_quantity) : '-'}</TableCell>
                    <TableCell className="text-sm py-2 text-right font-medium">{Number(item.accepted_quantity)}</TableCell>
                    <TableCell className="text-sm py-2 text-right">{formatCurrency(Number(item.unit_price))}</TableCell>
                    <TableCell className="text-sm py-2 text-right">{formatCurrency(Number(item.tax_amount))}</TableCell>
                    <TableCell className="text-sm py-2">{item.batch_number || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{t('billingModule.purchaseReceipts.detail.subtotal', 'Subtotal')}</span>
                <span>{formatCurrency(totalSubtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{t('billingModule.purchaseReceipts.detail.taxTotal', 'Tax')}</span>
                <span>{formatCurrency(totalTax)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t pt-1">
                <span>{t('billingModule.purchaseReceipts.detail.total', 'Total')}</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {(receipt.status === 'draft' || receipt.status === 'submitted') && (
        <div className="flex gap-3 pt-2 border-t">
          {receipt.status === 'draft' && onSubmit && (
            <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="flex-1">
              {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t('billingModule.purchaseReceipts.actions.submit', 'Submit Receipt')}
            </Button>
          )}
          {receipt.status === 'submitted' && onCancel && (
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending} className="flex-1">
              {cancelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <XCircle className="h-4 w-4 mr-2" />
              {t('billingModule.purchaseReceipts.actions.cancel', 'Cancel Receipt')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export function PurchaseReceiptDetailDialog({ purchaseReceipt, open, onOpenChange, onSubmit, onCancel }: PurchaseReceiptDetailDialogProps) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { data: fullReceipt, isLoading } = usePurchaseReceipt(purchaseReceipt?.id ?? null);

  const receipt = fullReceipt || purchaseReceipt;

  const title = receipt
    ? `${receipt.receipt_number} - ${receipt.supplier_name || t('billingModule.purchaseReceipts.detail.unknownSupplier', 'Unknown Supplier')}`
    : t('billingModule.purchaseReceipts.detail.title', 'Receipt Details');

  const content = isLoading ? (
    <SectionLoader />
  ) : receipt ? (
    <ReceiptContent receipt={receipt} onSubmit={onSubmit} onCancel={onCancel} />
  ) : null;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg">{title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
