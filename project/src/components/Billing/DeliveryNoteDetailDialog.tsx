import { useTranslation } from 'react-i18next';
import { useDeliveryNote, useSubmitDeliveryNote, useCancelDeliveryNote, type DeliveryNote } from '@/hooks/useDeliveryNotes';
import { useWarehouses } from '@/hooks/useWarehouses';
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
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { SectionLoader } from '@/components/ui/loader';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface DeliveryNoteDetailDialogProps {
  deliveryNote: DeliveryNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (deliveryNote: DeliveryNote) => void;
  onCancel?: (deliveryNote: DeliveryNote) => void;
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

const DeliveryNoteContent = ({
  deliveryNote,
  onSubmit,
  onCancel,
}: {
  deliveryNote: DeliveryNote;
  onSubmit?: (note: DeliveryNote) => void;
  onCancel?: (note: DeliveryNote) => void;
}) => {
  const { t } = useTranslation();
  const submitMutation = useSubmitDeliveryNote();
  const cancelMutation = useCancelDeliveryNote();
  const { data: warehouses = [] } = useWarehouses();

  const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]));

  const handleSubmit = () => {
    if (!onSubmit) return;
    onSubmit(deliveryNote);
  };

  const handleCancel = () => {
    if (!onCancel) return;
    onCancel(deliveryNote);
  };

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString('fr-FR') : '-';

  const items = deliveryNote.items ?? [];
  const totalQty = Number(deliveryNote.total_qty) || items.reduce((sum, item) => sum + Number(item.quantity), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.deliveryNotes.detail.deliveryNoteNumber', 'Delivery Note Number')}</p>
          <p className="font-semibold text-gray-900 dark:text-white">{deliveryNote.delivery_note_number}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.deliveryNotes.detail.status', 'Status')}</p>
          <Badge className={`${getStatusColor(deliveryNote.status)} mt-0.5 flex w-fit items-center gap-1`}>
            {getStatusIcon(deliveryNote.status)}
            {deliveryNote.status}
          </Badge>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.deliveryNotes.detail.deliveryDate', 'Delivery Date')}</p>
          <p className="font-medium text-gray-900 dark:text-white">{formatDate(deliveryNote.delivery_date)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.deliveryNotes.detail.customer', 'Customer')}</p>
          <p className="font-medium text-gray-900 dark:text-white">{deliveryNote.customer_name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.deliveryNotes.detail.salesOrder', 'Sales Order')}</p>
          <p className="font-medium text-gray-900 dark:text-white">{deliveryNote.sales_order?.order_number || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.deliveryNotes.detail.totalQty', 'Total Qty')}</p>
          <p className="font-medium text-gray-900 dark:text-white">{totalQty}</p>
        </div>
        {deliveryNote.customer_address && (
          <div className="col-span-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.deliveryNotes.detail.customerAddress', 'Customer Address')}</p>
            <p className="font-medium text-gray-900 dark:text-white">{deliveryNote.customer_address}</p>
          </div>
        )}
        {deliveryNote.notes && (
          <div className="col-span-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.deliveryNotes.detail.notes', 'Notes')}</p>
            <p className="font-medium text-gray-900 dark:text-white">{deliveryNote.notes}</p>
          </div>
        )}
        {deliveryNote.submitted_at && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.deliveryNotes.detail.submittedAt', 'Submitted At')}</p>
            <p className="font-medium text-gray-900 dark:text-white">{new Date(deliveryNote.submitted_at).toLocaleString('fr-FR')}</p>
          </div>
        )}
        {deliveryNote.cancelled_at && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('billingModule.deliveryNotes.detail.cancelledAt', 'Cancelled At')}</p>
            <p className="font-medium text-gray-900 dark:text-white">{new Date(deliveryNote.cancelled_at).toLocaleString('fr-FR')}</p>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{t('billingModule.deliveryNotes.detail.items', 'Delivered Items')}</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('billingModule.deliveryNotes.detail.item', 'Item')}</TableHead>
                  <TableHead className="text-xs text-right">{t('billingModule.deliveryNotes.detail.qty', 'Qty')}</TableHead>
                  <TableHead className="text-xs">{t('billingModule.deliveryNotes.detail.batch', 'Batch')}</TableHead>
                  <TableHead className="text-xs">{t('billingModule.deliveryNotes.detail.warehouse', 'Warehouse')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell className="py-2 text-sm">{item.item_name || '-'}</TableCell>
                    <TableCell className="py-2 text-right text-sm font-medium">{Number(item.quantity)}</TableCell>
                    <TableCell className="py-2 text-sm">{item.batch_number || '-'}</TableCell>
                    <TableCell className="py-2 text-sm">{(item.warehouse_id && warehouseMap.get(item.warehouse_id)) || item.warehouse_id || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between border-t pt-1 font-bold text-gray-900 dark:text-white">
                <span>{t('billingModule.deliveryNotes.detail.totalQty', 'Total Qty')}</span>
                <span>{totalQty}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {(deliveryNote.status === 'draft' || deliveryNote.status === 'submitted') && (
        <div className="flex gap-3 border-t pt-2">
          {deliveryNote.status === 'draft' && onSubmit && (
            <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="flex-1">
              {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t('billingModule.deliveryNotes.actions.submit', 'Submit Delivery Note')}
            </Button>
          )}
          {deliveryNote.status === 'submitted' && onCancel && (
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending} className="flex-1">
              {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <XCircle className="mr-2 h-4 w-4" />
              {t('billingModule.deliveryNotes.actions.cancel', 'Cancel Delivery Note')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export function DeliveryNoteDetailDialog({
  deliveryNote,
  open,
  onOpenChange,
  onSubmit,
  onCancel,
}: DeliveryNoteDetailDialogProps) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { data: fullDeliveryNote, isLoading } = useDeliveryNote(deliveryNote?.id ?? null);

  const resolvedDeliveryNote = fullDeliveryNote || deliveryNote;

  const title = resolvedDeliveryNote
    ? `${resolvedDeliveryNote.delivery_note_number} - ${resolvedDeliveryNote.customer_name || t('billingModule.deliveryNotes.detail.unknownCustomer', 'Unknown Customer')}`
    : t('billingModule.deliveryNotes.detail.title', 'Delivery Note Details');

  const content = isLoading ? (
    <SectionLoader />
  ) : resolvedDeliveryNote ? (
    <DeliveryNoteContent deliveryNote={resolvedDeliveryNote} onSubmit={onSubmit} onCancel={onCancel} />
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
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
