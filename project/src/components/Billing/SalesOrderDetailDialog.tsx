import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../MultiTenantAuthProvider';
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
  ShoppingCart,
  FileText,
  Truck,
  Download,
  Loader2,
  Clock as ClockIcon,
  Circle,
  AlertCircle,
  Package
} from 'lucide-react';
import type { SalesOrder } from '@/hooks/useSalesOrders';
import { useConvertOrderToInvoice, useSalesOrder } from '@/hooks/useSalesOrders';
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

interface SalesOrderDetailDialogProps {
  salesOrder: SalesOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadPDF?: (order: SalesOrder) => void;
}

type TimelineStepKey = 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'invoiced';
type NormalizedStatus = TimelineStepKey | 'draft' | 'cancelled' | 'partially_delivered' | 'partially_invoiced';
type StepState = 'completed' | 'current' | 'upcoming' | 'cancelled';
type StatusActionKey = 'confirmed' | 'processing' | 'shipped' | 'delivered';

const statusOrder: TimelineStepKey[] = ['confirmed', 'processing', 'shipped', 'delivered', 'invoiced'];

const timelineStepConfig: Record<TimelineStepKey, { label: string; description: string }> = {
  confirmed: {
    label: 'Confirmed',
    description: 'Order confirmed and ready for fulfillment.',
  },
  processing: {
    label: 'Processing',
    description: 'Items being prepared for shipment.',
  },
  shipped: {
    label: 'Shipped',
    description: 'Order shipped to customer.',
  },
  delivered: {
    label: 'Delivered',
    description: 'Customer received the order.',
  },
  invoiced: {
    label: 'Invoiced',
    description: 'Customer invoice generated.',
  },
};

const statusActionCopy: Record<
  StatusActionKey,
  { title: string; body: string; confirmLabel: string }
> = {
  confirmed: {
    title: 'Confirm Sales Order',
    body: 'This will confirm the order and notify relevant teams to start fulfillment.',
    confirmLabel: 'Confirm Order',
  },
  processing: {
    title: 'Start Processing',
    body: 'Mark this order as being processed. Warehouse will begin picking and packing.',
    confirmLabel: 'Start Processing',
  },
  shipped: {
    title: 'Mark as Shipped',
    body: 'Confirm that the order has been shipped to the customer.',
    confirmLabel: 'Mark as Shipped',
  },
  delivered: {
    title: 'Mark as Delivered',
    body: 'Confirm that the customer has received the order.',
    confirmLabel: 'Mark as Delivered',
  },
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

export const SalesOrderDetailDialog: React.FC<SalesOrderDetailDialogProps> = ({
  salesOrder,
  open,
  onOpenChange,
  onDownloadPDF,
}) => {
  const { currentOrganization: _currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const convertToInvoice = useConvertOrderToInvoice();

  // Fetch full order with items when dialog is open
  const orderId = salesOrder?.id ?? null;
  const {
    data: orderWithItems,
    isLoading: isDetailLoading,
    error: detailError,
  } = useSalesOrder(open ? orderId : null);

  // Use fetched order with items if available
  const resolvedOrder = orderWithItems ?? salesOrder;

  const [pendingStatus, setPendingStatus] = React.useState<StatusActionKey | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Update order status mutation
  const updateStatus = useMutation({
    mutationFn: async (status: SalesOrder['status']) => {
      if (!resolvedOrder) throw new Error('No sales order selected');

      const { error } = await supabase
        .from('sales_orders')
        .update({ status })
        .eq('id', resolvedOrder.id);

      if (error) throw error;
    },
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      toast.success(`Sales order marked as ${status}`);
    },
    onError: (error) => {
      toast.error('Failed to update sales order status: ' + error.message);
    },
  });

  const handleCreateInvoice = () => {
    if (!resolvedOrder) return;

    const invoiceDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    convertToInvoice.mutate(
      {
        orderId: resolvedOrder.id,
        invoiceDate,
        dueDate,
      },
      {
        onSuccess: (invoice) => {
          toast.success(`Invoice #${invoice.invoice_number} created from Sales Order`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error('Failed to create invoice: ' + error.message);
        },
      }
    );
  };

  const handleDownload = async () => {
    if (!resolvedOrder) return;

    try {
      setIsDownloading(true);
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        toast.error('Please sign in to download the sales order.');
        return;
      }

      const backendUrl =
        import.meta.env.VITE_BACKEND_SERVICE_URL ||
        import.meta.env.VITE_SATELLITE_SERVICE_URL ||
        'http://localhost:8001';
      const response = await fetch(`${backendUrl}/api/billing/sales-orders/${resolvedOrder.id}/pdf`, {
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
          'PDF service not configured. Opened a printable version in a new tab. Use the browser print dialog to export to PDF.'
        );
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = resolvedOrder.order_number
          ? `sales-order-${resolvedOrder.order_number}.pdf`
          : 'sales-order.pdf';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
        toast.success('Sales order PDF downloaded');
      }
    } catch (error) {
      toast.error(
        'Failed to download sales order: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (!orderId) return null;

  if (isDetailLoading || !resolvedOrder) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-gray-500 dark:text-gray-400">
            <div className="size-8 animate-spin rounded-full border-b-2 border-emerald-500" />
            Loading sales order details...
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
            Failed to load sales order details.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const so = resolvedOrder;
  const normalizedStatus = so.status as NormalizedStatus;

  // Map statuses to timeline
  const getTimelineStatus = (): TimelineStepKey => {
    if (so.status === 'invoiced' || so.status === 'partially_invoiced') return 'invoiced';
    if (so.status === 'delivered' || so.status === 'partially_delivered') return 'delivered';
    if (so.status === 'shipped' || so.status === 'ready_to_ship') return 'shipped';
    if (so.status === 'processing' || so.status === 'in_progress') return 'processing';
    if (so.status === 'confirmed') return 'confirmed';
    return 'confirmed'; // default
  };

  const currentTimelineStatus = getTimelineStatus();
  const currentIndex = statusOrder.indexOf(currentTimelineStatus);

  const hasReachedStep = (step: TimelineStepKey) => {
    if (normalizedStatus === 'cancelled') {
      return step === 'confirmed' && so.confirmed_at !== null;
    }
    if (currentIndex === -1) return false;
    return statusOrder.indexOf(step) <= currentIndex;
  };

  const getStepState = (step: TimelineStepKey): StepState => {
    if (normalizedStatus === 'cancelled') {
      if (step === 'confirmed' && so.confirmed_at) return 'completed';
      return 'cancelled';
    }

    if (currentIndex === -1) return 'upcoming';

    const stepIndex = statusOrder.indexOf(step);
    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  const getTimelineTimestamp = (step: TimelineStepKey) => {
    switch (step) {
      case 'confirmed':
        return hasReachedStep('confirmed') ? so.confirmed_at ?? so.created_at : null;
      case 'processing':
        return hasReachedStep('processing') ? so.updated_at : null;
      case 'shipped':
        return hasReachedStep('shipped') ? so.shipped_at ?? so.updated_at : null;
      case 'delivered':
        return hasReachedStep('delivered') ? so.delivered_at ?? so.updated_at : null;
      case 'invoiced':
        return hasReachedStep('invoiced') ? so.updated_at : null;
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

  const canConfirm = so.status === 'draft';
  const canMarkProcessing = so.status === 'confirmed';
  const canMarkShipped = ['processing', 'in_progress'].includes(so.status);
  const canMarkDelivered = ['shipped', 'ready_to_ship', 'partially_delivered'].includes(so.status);
  const canCreateInvoice = ['confirmed', 'processing', 'in_progress', 'shipped', 'ready_to_ship', 'partially_delivered', 'delivered'].includes(so.status);
  const canDownload = so.status !== 'draft';

  const remainingToInvoice = Number(so.grand_total) - Number(so.invoiced_amount);

  const statusActions: Array<{
    key: StatusActionKey;
    label: string;
    icon: React.ReactNode;
    disabled: boolean;
  }> = [
    {
      key: 'confirmed',
      label: 'Confirm Order',
      icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
      disabled: !canConfirm,
    },
    {
      key: 'processing',
      label: 'Start Processing',
      icon: <Package className="mr-2 h-4 w-4" />,
      disabled: !canMarkProcessing,
    },
    {
      key: 'shipped',
      label: 'Mark as Shipped',
      icon: <Truck className="mr-2 h-4 w-4" />,
      disabled: !canMarkShipped,
    },
    {
      key: 'delivered',
      label: 'Mark as Delivered',
      icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
      disabled: !canMarkDelivered,
    },
  ];

  const availableStatusActions = statusActions.filter((action) => !action.disabled);

  const getStatusColor = (status: SalesOrder['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'processing':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'shipped':
      case 'ready_to_ship':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'delivered':
      case 'partially_delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'partially_invoiced':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'invoiced':
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Sales Order #{so.order_number}
              </DialogTitle>
              <DialogDescription>View sales order details and manage fulfillment</DialogDescription>
            </div>
            <Badge className={getStatusColor(so.status)}>{so.status}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Fulfillment Timeline
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Track each step of the order fulfillment process.
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
                          return <AlertCircle className="h-4 w-4" />;
                        default:
                          return <Circle className="h-3 w-3" />;
                      }
                    })();

                    return (
                      <div key={step.key} className="grid grid-cols-[auto,1fr] gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex size-9 items-center justify-center rounded-full border ${circleClasses}`}
                          >
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
                    <span>This sales order was cancelled. Fulfillment workflow is locked.</span>
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
                  Manage fulfillment and billing based on current status.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-1">
                  <Button
                    onClick={onDownloadPDF ? () => onDownloadPDF(so) : handleDownload}
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
                      ? 'Generate packing slip or delivery note.'
                      : 'Confirm the order before generating documents.'}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Button
                    onClick={handleCreateInvoice}
                    disabled={!canCreateInvoice || remainingToInvoice <= 0 || convertToInvoice.isPending}
                    variant="outline"
                    className="justify-start"
                  >
                    {convertToInvoice.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="mr-2 h-4 w-4" />
                    )}
                    Create Invoice
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {remainingToInvoice > 0
                      ? 'Generate customer invoice for payment.'
                      : 'Order fully invoiced.'}
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
                  <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{so.customer_name}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Order Date:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(so.order_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Expected Delivery:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(so.expected_delivery_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Currency:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{so.currency_code}</p>
                </div>
                {so.quote_id && (
                  <div className="md:col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">Converted from Quote:</span>
                    <p className="font-medium text-gray-900 dark:text-white">Yes (Quote linked)</p>
                  </div>
                )}
                {so.payment_terms && (
                  <div className="md:col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">Payment Terms:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{so.payment_terms}</p>
                  </div>
                )}
                {so.shipping_address && (
                  <div className="md:col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">Shipping Address:</span>
                    <p className="whitespace-pre-wrap font-medium text-gray-900 dark:text-white">
                      {so.shipping_address}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Invoicing Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Order Value:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(Number(so.grand_total), so.currency_code)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount Invoiced:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(Number(so.invoiced_amount), so.currency_code)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium text-gray-900 dark:text-white">Remaining to Invoice:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(remainingToInvoice, so.currency_code)}
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
                        Delivered
                      </th>
                      <th className="py-2 px-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                        Invoiced
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
                    {so.items && so.items.length > 0 ? (
                      so.items.map((item: any, index: number) => (
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
                            {item.delivered_quantity || 0}
                          </td>
                          <td className="py-2 px-2 text-sm text-right text-gray-600 dark:text-gray-400">
                            {item.invoiced_quantity || 0}
                          </td>
                          <td className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(Number(item.unit_price || item.rate), so.currency_code)}
                          </td>
                          <td className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                            {formatCurrency(Number(item.amount), so.currency_code)}
                          </td>
                          <td className="py-2 px-2 text-sm text-right text-gray-600 dark:text-gray-400">
                            {formatCurrency(Number(item.tax_amount), so.currency_code)}
                          </td>
                          <td className="py-2 px-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                            {formatCurrency(
                              Number(item.amount) + Number(item.tax_amount),
                              so.currency_code
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No line items found.
                        </td>
                      </tr>
                    )}
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
                subtotal={Number(so.subtotal)}
                taxTotal={Number(so.tax_total)}
                grandTotal={Number(so.grand_total)}
                currency={so.currency_code}
              />
            </CardContent>
          </Card>

          {so.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  {so.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions - Matching Pattern */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t">
            {/* Left side - Download, Create Invoice */}
            <div className="flex items-center gap-2">
              <Button
                onClick={onDownloadPDF ? () => onDownloadPDF(so) : handleDownload}
                disabled={isDownloading}
                variant="outline"
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download PDF
              </Button>
              {canCreateInvoice && remainingToInvoice > 0 && (
                <Button
                  onClick={handleCreateInvoice}
                  disabled={convertToInvoice.isPending}
                  variant="outline"
                >
                  {convertToInvoice.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Create Invoice
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
                <AlertDialogCancel disabled={updateStatus.isPending}>Cancel</AlertDialogCancel>
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
