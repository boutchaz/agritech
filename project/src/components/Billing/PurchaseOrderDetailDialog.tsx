import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceTotalsDisplay } from '../Accounting/TaxBreakdown';
import {
  CheckCircle2,
  Package,
  FileText,
  Send,
  Download,
  Pencil,
  Loader2,
  Clock as ClockIcon,
  Circle,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import type { PurchaseOrder, PurchaseOrderItem } from '@/hooks/usePurchaseOrders';
import { useConvertPOToBill, usePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { formatCurrency } from '@/lib/taxCalculations';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';

type ExtendedStatus = PurchaseOrder['status'] | 'approved' | 'in_transit' | 'completed';
type StatusActionKey = 'submitted' | 'confirmed' | 'received';
type TimelineStepKey = 'draft' | 'submitted' | 'confirmed' | 'received' | 'billed';
type NormalizedStatus = TimelineStepKey | 'cancelled';
type StepState = 'completed' | 'current' | 'upcoming' | 'cancelled';

interface PurchaseOrderDetailDialogProps {
  purchaseOrder: PurchaseOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (po: PurchaseOrder) => void;
  onDownloadPDF?: (po: PurchaseOrder) => void;
}

const statusOrder: TimelineStepKey[] = [
  'draft',
  'submitted',
  'confirmed',
  'received',
  'billed',
];

const timelineStepConfig: Record<TimelineStepKey, { label: string; description: string }> = {
  draft: {
    label: 'Draft',
    description: 'Order created and stored as draft.',
  },
  submitted: {
    label: 'Submitted',
    description: 'Awaiting supplier confirmation or internal approval.',
  },
  confirmed: {
    label: 'Confirmed',
    description: 'Order confirmed and ready for fulfillment.',
  },
  received: {
    label: 'Received',
    description: 'Goods received at the farm or warehouse.',
  },
  billed: {
    label: 'Billed',
    description: 'Costs captured in the ledger through a supplier bill.',
  },
};

const statusActionCopy: Record<
  StatusActionKey,
  { title: string; body: string; confirmLabel: string }
> = {
  submitted: {
    title: 'Submit for Approval',
    body: 'This will notify approvers and lock line items until the purchase order is reviewed.',
    confirmLabel: 'Submit Purchase Order',
  },
  confirmed: {
    title: 'Confirm Purchase Order',
    body: 'Confirming confirms supplier agreement and enables goods tracking.',
    confirmLabel: 'Confirm Order',
  },
  received: {
    title: 'Confirm Goods Receipt',
    body: 'Confirming receipt updates inventory and allows billing to proceed.',
    confirmLabel: 'Mark as Received',
  },
};

const normalizeStatus = (status: ExtendedStatus): NormalizedStatus => {
  if (status === 'approved') return 'confirmed';
  if (status === 'in_transit') return 'confirmed';
  if (status === 'completed') return 'billed';
  if (status === 'partially_received') return 'confirmed';
  if (status === 'partially_billed') return 'received';
  return status as NormalizedStatus;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

const toInputDate = (value: string | null | undefined) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

export const PurchaseOrderDetailDialog: React.FC<PurchaseOrderDetailDialogProps> = ({
  purchaseOrder,
  open,
  onOpenChange,
  onEdit,
  onDownloadPDF,
}) => {
  const purchaseOrderId = purchaseOrder?.id ?? null;
  const {
    data: purchaseOrderWithItems,
    isLoading: isDetailLoading,
    error: detailError,
  } = usePurchaseOrder(open ? purchaseOrderId : null);
  const queryClient = useQueryClient();
  const convertToBill = useConvertPOToBill();
  const resolvedPurchaseOrder = purchaseOrderWithItems ?? purchaseOrder ?? null;

  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<StatusActionKey | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState<{
    expectedDeliveryDate: string;
    paymentTerms: string;
    deliveryAddress: string;
    notes: string;
  }>({
    expectedDeliveryDate: '',
    paymentTerms: '',
    deliveryAddress: '',
    notes: '',
  });

  React.useEffect(() => {
    if (!resolvedPurchaseOrder) {
      setIsEditingDetails(false);
      setEditFormData({
        expectedDeliveryDate: '',
        paymentTerms: '',
        deliveryAddress: '',
        notes: '',
      });
      return;
    }

    setEditFormData({
      expectedDeliveryDate: toInputDate(resolvedPurchaseOrder.expected_delivery_date),
      paymentTerms: resolvedPurchaseOrder.payment_terms ?? '',
      deliveryAddress:
        resolvedPurchaseOrder.delivery_address ?? resolvedPurchaseOrder.shipping_address ?? '',
      notes: resolvedPurchaseOrder.notes ?? '',
    });
    setIsEditingDetails(false);
  }, [resolvedPurchaseOrder?.id]);

  const updateStatus = useMutation({
    mutationFn: async (status: ExtendedStatus) => {
      if (!resolvedPurchaseOrder) throw new Error('No purchase order selected');

      const { error } = await supabase
        .from('purchase_orders')
        .update({ status })
        .eq('id', resolvedPurchaseOrder.id);

      if (error) throw error;
    },
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      if (resolvedPurchaseOrder?.id) {
        queryClient.invalidateQueries({ queryKey: ['purchase_order', resolvedPurchaseOrder.id] });
      }
      toast.success(`Purchase order marked as ${status}`);
    },
    onError: (error) => {
      toast.error('Failed to update purchase order status: ' + error.message);
    },
  });

  const updatePurchaseOrderDetails = useMutation({
    mutationFn: async () => {
      if (!resolvedPurchaseOrder) throw new Error('No purchase order selected');

      const { error } = await supabase
        .from('purchase_orders')
        .update({
          expected_delivery_date: editFormData.expectedDeliveryDate || null,
          payment_terms: editFormData.paymentTerms || null,
          delivery_address: editFormData.deliveryAddress || null,
          notes: editFormData.notes || null,
        })
        .eq('id', resolvedPurchaseOrder.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      if (resolvedPurchaseOrder?.id) {
        queryClient.invalidateQueries({ queryKey: ['purchase_order', resolvedPurchaseOrder.id] });
      }
      toast.success('Purchase order details updated');
      setIsEditingDetails(false);
    },
    onError: (error) => {
      toast.error('Failed to update purchase order: ' + error.message);
    },
  });

  if (!purchaseOrderId) return null;

  if (isDetailLoading || !resolvedPurchaseOrder) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-gray-500 dark:text-gray-400">
            <div className="size-8 animate-spin rounded-full border-b-2 border-emerald-500" />
            Chargement du bon de commande…
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (detailError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-red-600 dark:text-red-400">
            Impossible de charger les lignes du bon de commande.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const po = resolvedPurchaseOrder;
  const normalizedStatus = normalizeStatus(po.status as ExtendedStatus);
  const currentIndex =
    normalizedStatus === 'cancelled'
      ? statusOrder.indexOf('submitted')
      : statusOrder.indexOf(normalizedStatus as TimelineStepKey);

  const hasReachedStep = (step: TimelineStepKey) => {
    if (normalizedStatus === 'cancelled') {
      if (step === 'draft') return true;
      if (step === 'submitted') return Boolean(po.submitted_at);
      return false;
    }

    if (currentIndex === -1) {
      return step === 'draft';
    }

    return statusOrder.indexOf(step) <= currentIndex;
  };

  const getStepState = (step: TimelineStepKey): StepState => {
    if (normalizedStatus === 'cancelled') {
      if (step === 'draft') return 'completed';
      if (step === 'submitted' && po.submitted_at) return 'completed';
      return 'cancelled';
    }

    if (currentIndex === -1) {
      return step === 'draft' ? 'current' : 'upcoming';
    }

    const stepIndex = statusOrder.indexOf(step);
    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  const getTimelineTimestamp = (step: TimelineStepKey) => {
    switch (step) {
      case 'draft':
        return po.created_at;
      case 'submitted':
        return hasReachedStep('submitted') ? po.submitted_at : null;
      case 'confirmed':
        return hasReachedStep('confirmed') ? po.confirmed_at ?? po.updated_at : null;
      case 'received':
        return hasReachedStep('received') ? po.updated_at : null;
      case 'billed':
        return hasReachedStep('billed') ? po.updated_at : null;
      default:
        return null;
    }
  };

  const timelineSteps = statusOrder.map((key) => ({
    key,
    label: timelineStepConfig[key].label,
    description: timelineStepConfig[key].description,
    timestamp: getTimelineTimestamp(key),
  }));

  const canSubmit = po.status === 'draft';
  const canConfirm = po.status === 'submitted';
  const canMarkReceived = ['confirmed', 'partially_received'].includes(po.status);
  const canCreateBill = ['confirmed', 'partially_received', 'received', 'partially_billed'].includes(po.status);
  const canDownload = po.status !== 'draft';
  const canEditDetails = ['draft', 'submitted'].includes(po.status);

  const remainingToBill = Number(po.grand_total) - Number(po.billed_amount);

  const handleDownload = async () => {
    if (!canDownload) {
      toast.info('Submit the purchase order before downloading a PDF.');
      return;
    }

    try {
      setIsDownloading(true);
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        toast.error('Please sign in to download the purchase order.');
        return;
      }

      // Call backend service
      const backendUrl = import.meta.env.VITE_BACKEND_SERVICE_URL || import.meta.env.VITE_SATELLITE_SERVICE_URL || 'http://localhost:8001';
      const response = await fetch(`${backendUrl}/api/billing/purchase-orders/${po.id}/pdf`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        let errorMessage = 'Failed to generate PDF';

        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('Content-Type');

      if (contentType?.includes('text/html')) {
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast.info(
          'PDF service not configured. Opened a printable version in a new tab. Use the browser print dialog to export to PDF.',
        );
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = po.po_number
          ? `purchase-order-${po.po_number}.pdf`
          : 'purchase-order.pdf';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
        toast.success('Purchase order PDF downloaded');
      }
    } catch (error) {
      toast.error(
        'Failed to download purchase order: ' + (error instanceof Error ? error.message : 'Unknown error'),
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEditFieldChange = (field: keyof typeof editFormData) => (value: string) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCancelEdit = () => {
    setEditFormData({
      expectedDeliveryDate: toInputDate(po.expected_delivery_date),
      paymentTerms: po.payment_terms ?? '',
      deliveryAddress: po.delivery_address ?? po.shipping_address ?? '',
      notes: po.notes ?? '',
    });
    setIsEditingDetails(false);
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updatePurchaseOrderDetails.mutate();
  };

  const handleCreateBill = () => {
    if (!po) return;

    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    convertToBill.mutate(
      {
        poId: po.id,
        invoiceDate: today,
        dueDate: dueDateStr
      },
      {
        onSuccess: (bill) => {
          toast.success(`Bill #${bill.invoice_number} created from Purchase Order`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error('Failed to create bill: ' + error.message);
        },
      },
    );
  };

  const statusActions: Array<{
    key: StatusActionKey;
    label: string;
    icon: React.ReactNode;
    disabled: boolean;
  }> = [
    {
      key: 'submitted',
      label: 'Submit for Approval',
      icon: <Send className="mr-2 h-4 w-4" />,
      disabled: !canSubmit,
    },
    {
      key: 'confirmed',
      label: 'Confirm Order',
      icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
      disabled: !canConfirm,
    },
    {
      key: 'received',
      label: 'Mark as Received',
      icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
      disabled: !canMarkReceived,
    },
  ];

  const availableStatusActions = statusActions.filter((action) => !action.disabled);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Purchase Order #{po.po_number ?? po.order_number ?? ''}
              </DialogTitle>
              <DialogDescription>
                View purchase order details and manage status
              </DialogDescription>
            </div>
            <Badge className={getStatusColor(po.status)}>
              {po.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Status Timeline
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Track each step of the purchase order lifecycle.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {timelineSteps.map((step, index) => {
                    const state = getStepState(step.key);
                    const timestampLabel = formatDateTime(step.timestamp);
                    const nextState = timelineSteps[index + 1]
                      ? getStepState(timelineSteps[index + 1].key)
                      : null;
                    const circleClasses = (() => {
                      switch (state) {
                        case 'completed':
                          return 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300';
                        case 'current':
                          return 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300';
                        case 'cancelled':
                          return 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300';
                        default:
                          return 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500';
                      }
                    })();
                    const lineClasses = (() => {
                      if (state === 'cancelled' || nextState === 'cancelled') {
                        return 'bg-red-200 dark:bg-red-900/40';
                      }
                      if (state === 'completed') {
                        return 'bg-emerald-200 dark:bg-emerald-900/40';
                      }
                      return 'bg-gray-200 dark:bg-gray-800';
                    })();
                    const icon = (() => {
                      switch (state) {
                        case 'completed':
                          return <CheckCircle2 className="h-4 w-4" />;
                        case 'current':
                          return <ClockIcon className="h-4 w-4" />;
                        case 'cancelled':
                          return <XCircle className="h-4 w-4" />;
                        default:
                          return <Circle className="h-3 w-3" />;
                      }
                    })();

                    return (
                      <div key={step.key} className="grid grid-cols-[auto,1fr] gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`flex size-9 items-center justify-center rounded-full border ${circleClasses}`}>
                            {icon}
                          </div>
                          {index < timelineSteps.length - 1 && (
                            <div
                              className={`mt-1 w-px flex-1 ${lineClasses}`}
                              style={{ minHeight: '2.5rem' }}
                            />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {step.label}
                            </p>
                            {timestampLabel && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {timestampLabel}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {normalizedStatus === 'cancelled' && (
                  <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <span>
                      This purchase order was cancelled. Remaining workflow actions are locked until
                      it is re-opened from the accounting admin console.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Quick Actions
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Perform the next step based on the current order status.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-1">
                  <Button
                    onClick={handleDownload}
                    disabled={!canDownload || isDownloading}
                    variant="outline"
                    className="justify-start"
                  >
                    {isDownloading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {canDownload
                      ? 'Generate a PDF copy for approvals or supplier share.'
                      : 'Submit the purchase order before generating a PDF.'}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Button
                    onClick={() => setIsEditingDetails(true)}
                    disabled={!canEditDetails || isEditingDetails}
                    variant="outline"
                    className="justify-start"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Order Details
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {canEditDetails
                      ? 'Adjust delivery expectations, terms, or notes before approval.'
                      : 'Editing is limited to draft or submitted orders.'}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Button
                    onClick={handleCreateBill}
                    disabled={!canCreateBill || remainingToBill <= 0 || convertToBill.isPending}
                    variant="outline"
                    className="justify-start"
                  >
                    {convertToBill.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="mr-2 h-4 w-4" />
                    )}
                    Convert to Bill
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {remainingToBill > 0
                      ? 'Create a supplier bill when goods are approved for payment.'
                      : 'All costs from this order have already been billed.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Supplier:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {po.supplier_name}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Order Date:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(po.po_date ?? po.order_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Expected Delivery:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {po.expected_delivery_date
                      ? new Date(po.expected_delivery_date).toLocaleDateString('fr-FR')
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Currency:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {po.currency_code}
                  </p>
                </div>
                {po.payment_terms && (
                  <div className="md:col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">Payment Terms:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {po.payment_terms}
                    </p>
                  </div>
                )}
                {po.delivery_address || po.shipping_address ? (
                  <div className="md:col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">Delivery Address:</span>
                    <p className="whitespace-pre-wrap font-medium text-gray-900 dark:text-white">
                      {po.delivery_address || po.shipping_address}
                    </p>
                  </div>
                ) : null}
              </div>

              {isEditingDetails && (
                <form className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800" onSubmit={handleEditSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="expected-delivery">Expected Delivery Date</Label>
                      <Input
                        id="expected-delivery"
                        type="date"
                        value={editFormData.expectedDeliveryDate}
                        onChange={(event) =>
                          handleEditFieldChange('expectedDeliveryDate')(event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment-terms">Payment Terms</Label>
                      <Input
                        id="payment-terms"
                        value={editFormData.paymentTerms}
                        onChange={(event) =>
                          handleEditFieldChange('paymentTerms')(event.target.value)
                        }
                        placeholder="e.g. Net 30"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="delivery-address">Delivery Address</Label>
                    <Textarea
                      id="delivery-address"
                      value={editFormData.deliveryAddress}
                      onChange={(event) =>
                        handleEditFieldChange('deliveryAddress')(event.target.value)
                      }
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="internal-notes">Internal Notes</Label>
                    <Textarea
                      id="internal-notes"
                      value={editFormData.notes}
                      onChange={(event) => handleEditFieldChange('notes')(event.target.value)}
                      rows={4}
                      placeholder="Add any internal comments or receiving instructions"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={updatePurchaseOrderDetails.isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updatePurchaseOrderDetails.isPending}>
                      {updatePurchaseOrderDetails.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Billing Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Order Value:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(Number(po.grand_total), po.currency_code)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount Billed:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(Number(po.billed_amount), po.currency_code)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium text-gray-900 dark:text-white">Remaining to Bill:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(remainingToBill, po.currency_code)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Line Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 px-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                        Item
                      </th>
                      <th className="py-2 px-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                        Description
                      </th>
                      <th className="py-2 px-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                        Qty
                      </th>
                      <th className="py-2 px-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                        Received
                      </th>
                      <th className="py-2 px-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                        Billed
                      </th>
                      <th className="py-2 px-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                        Rate
                      </th>
                      <th className="py-2 px-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                        Amount
                      </th>
                      <th className="py-2 px-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                        Tax
                      </th>
                      <th className="py-2 px-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items?.map((item: PurchaseOrderItem, index: number) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 px-2 text-sm font-medium text-gray-900 dark:text-white">
                          {item.item_name}
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-400">
                          {item.description || '-'}
                        </td>
                        <td className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-2 text-sm text-right text-gray-600 dark:text-gray-400">
                          {item.received_quantity || 0}
                        </td>
                        <td className="py-2 px-2 text-sm text-right text-gray-600 dark:text-gray-400">
                          {item.billed_quantity || 0}
                        </td>
                        <td className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(Number(item.unit_price ?? item.rate), po.currency_code)}
                        </td>
                        <td className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(Number(item.amount), po.currency_code)}
                        </td>
                        <td className="py-2 px-2 text-sm text-right text-gray-600 dark:text-gray-400">
                          {formatCurrency(Number(item.tax_amount ?? 0), po.currency_code)}
                        </td>
                        <td className="py-2 px-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(
                            Number(item.amount) + Number(item.tax_amount ?? 0),
                            po.currency_code,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Totals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceTotalsDisplay
                subtotal={Number(po.subtotal)}
                taxTotal={Number(po.tax_total)}
                grandTotal={Number(po.grand_total)}
                currency={po.currency_code}
              />
            </CardContent>
          </Card>

          {po.notes && !isEditingDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Internal Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  {po.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions - Matching Quote Dialog Pattern */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t">
            {/* Left side - Download, Edit, Convert to Bill */}
            <div className="flex items-center gap-2">
              {onDownloadPDF ? (
                <Button
                  onClick={() => onDownloadPDF(po)}
                  variant="outline"
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              ) : (
                <Button
                  onClick={handleDownload}
                  disabled={!canDownload || isDownloading}
                  variant="outline"
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              )}
              {onEdit && canEditDetails && (
                <Button
                  onClick={() => onEdit(po)}
                  variant="outline"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Order
                </Button>
              )}
              {canCreateBill && remainingToBill > 0 && (
                <Button
                  onClick={handleCreateBill}
                  disabled={convertToBill.isPending}
                  variant="outline"
                >
                  {convertToBill.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Convert to Bill
                </Button>
              )}
            </div>

            {/* Right side - Status actions and Close */}
            <div className="flex items-center gap-2">
              {availableStatusActions.map((action) => (
                <Button
                  key={action.key}
                  variant="outline"
                  disabled={updateStatus.isPending}
                  onClick={() => setPendingStatus(action.key)}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatus(null);
          }
        }}
      >
        <AlertDialogContent>
          {pendingStatus ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{statusActionCopy[pendingStatus].title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {statusActionCopy[pendingStatus].body}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={updateStatus.isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={updateStatus.isPending}
                  onClick={() => {
                    if (!pendingStatus) return;
                    updateStatus.mutate(pendingStatus, {
                      onSettled: () => setPendingStatus(null),
                    });
                  }}
                >
                  {updateStatus.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {statusActionCopy[pendingStatus].confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

const getStatusColor = (status: PurchaseOrder['status']) => {
  switch (status) {
    case 'submitted':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    case 'confirmed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'partially_received':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'received':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'partially_billed':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    case 'billed':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'draft':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
