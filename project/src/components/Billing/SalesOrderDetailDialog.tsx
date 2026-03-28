import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { salesOrdersApi } from '@/lib/api/sales-orders';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { InvoiceTotalsDisplay } from '../Accounting/TaxBreakdown';
import { CheckCircle2, ShoppingCart, FileText, Truck, Clock, XCircle, Circle, AlertCircle, Loader2, Package } from 'lucide-react';
import type { SalesOrder } from '@/hooks/useSalesOrders';
import { useSalesOrder, useConvertOrderToInvoice, useIssueStock } from '@/hooks/useSalesOrders';
import { useWarehouses } from '@/hooks/useWarehouses';
import { formatCurrency } from '@/lib/taxCalculations';
import { SectionLoader } from '@/components/ui/loader';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

// Types for timeline
type TimelineStepKey = 'confirmed' | 'processing' | 'delivered' | 'invoiced';
type StepState = 'completed' | 'current' | 'upcoming' | 'cancelled';

const statusOrder: TimelineStepKey[] = ['confirmed', 'processing', 'delivered', 'invoiced'];

const timelineStepConfig: Record<TimelineStepKey, { label: string; description: string }> = {
  confirmed: { label: 'Order Confirmed', description: 'Order has been confirmed and is ready for processing' },
  processing: { label: 'Processing', description: 'Order is being prepared for shipment' },
  delivered: { label: 'Delivered', description: 'Order has been delivered to the customer' },
  invoiced: { label: 'Invoiced', description: 'Invoice has been generated for this order' },
};

function formatDateTime(dateString: string | null): string | null {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

interface SalesOrderDetailDialogProps {
  salesOrder: SalesOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SalesOrderDetailDialog: React.FC<SalesOrderDetailDialogProps> = ({
  salesOrder,
  open,
  onOpenChange,
}) => {
  useTranslation();
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const convertToInvoice = useConvertOrderToInvoice();
  const issueStockMutation = useIssueStock();
  const { data: warehouses = [] } = useWarehouses();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  const salesOrderId = salesOrder?.id ?? null;
  const {
    data: salesOrderWithItems,
    isLoading: isDetailLoading,
    error: detailError,
  } = useSalesOrder(open ? salesOrderId : null);
  const resolvedSalesOrder: SalesOrder | null = salesOrderWithItems ?? salesOrder ?? null;

  const updateStatus = useMutation({
    mutationFn: async (status: SalesOrder['status']) => {
      if (!salesOrder) throw new Error('No sales order selected');
      if (!currentOrganization?.id) throw new Error('No organization selected');

      await salesOrdersApi.updateSalesOrderStatus(
        salesOrder.id,
        { status },
        currentOrganization.id
      );
    },
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      if (resolvedSalesOrder?.id) {
        queryClient.invalidateQueries({ queryKey: ['sales_order', resolvedSalesOrder.id] });
      }
      toast.success(`Sales order marked as ${status}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to update sales order status: ' + error.message);
    },
  });

  const handleCreateInvoice = () => {
    if (!salesOrder) return;

    const invoiceDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    convertToInvoice.mutate(
      {
        orderId: salesOrder.id,
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

  const handleMarkProcessing = () => updateStatus.mutate('processing');
  const handleMarkDelivered = () => updateStatus.mutate('delivered');

  const handleIssueStock = () => {
    if (!salesOrder || !selectedWarehouseId) return;

    issueStockMutation.mutate(
      {
        orderId: salesOrder.id,
        warehouseId: selectedWarehouseId,
      },
      {
        onSuccess: () => {
          toast.success('Stock issued successfully. Inventory updated and COGS recorded.');
          setSelectedWarehouseId('');
        },
        onError: (error) => {
          toast.error('Failed to issue stock: ' + error.message);
        },
      }
    );
  };

  const getStatusColor = (status: SalesOrder['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'invoiced':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!salesOrderId || !open) return null;

  if (isDetailLoading || !resolvedSalesOrder) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <SectionLoader className="py-10" />
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const so = resolvedSalesOrder;

  // Determine current step in timeline
  const getStepState = (step: TimelineStepKey): StepState => {
    if (so.status === 'cancelled') {
      if (step === 'confirmed' && so.status !== 'draft') return 'completed';
      return 'cancelled';
    }

    const currentStatuses: Record<string, number> = {
      draft: -1,
      confirmed: 0,
      processing: 1,
      shipped: 2,
      delivered: 2,
      completed: 3,
      invoiced: 3,
    };

    const stepIndexes: Record<TimelineStepKey, number> = {
      confirmed: 0,
      processing: 1,
      delivered: 2,
      invoiced: 3,
    };

    const currentIndex = currentStatuses[so.status] ?? -1;
    const stepIndex = stepIndexes[step];

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  const getTimelineTimestamp = (step: TimelineStepKey) => {
    switch (step) {
      case 'confirmed':
        return so.created_at;
      case 'processing':
      case 'delivered':
      case 'invoiced':
        return getStepState(step) === 'completed' ? so.updated_at : null;
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

  const canMarkProcessing = so.status === 'confirmed';
  const canMarkDelivered = ['processing', 'shipped'].includes(so.status);
  const canCreateInvoice = ['confirmed', 'processing', 'shipped', 'delivered', 'completed'].includes(so.status);
  // Stock can be issued for confirmed/processing orders that haven't issued stock yet
  const canIssueStock = ['confirmed', 'processing'].includes(so.status) && !so.stock_issued;

  const remainingToInvoice = Math.max(0, Number(so.grand_total) - Number(so.invoiced_amount));

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
              <DialogDescription>
                View sales order details and manage fulfillment
              </DialogDescription>
            </div>
            <Badge className={getStatusColor(so.status)}>
              {so.status}
            </Badge>
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
                    const nextState = timelineSteps[index + 1] ? getStepState(timelineSteps[index + 1].key) : null;
                    const circleClasses = (() => {
                      switch (state) {
                        case 'completed': return 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300';
                        case 'current': return 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300';
                        case 'cancelled': return 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300';
                        default: return 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500';
                      }
                    })();
                    const lineClasses = (() => {
                      if (state === 'cancelled' || nextState === 'cancelled') return 'bg-red-200 dark:bg-red-900/40';
                      if (state === 'completed') return 'bg-emerald-200 dark:bg-emerald-900/40';
                      return 'bg-gray-200 dark:bg-gray-800';
                    })();
                    const icon = (() => {
                      switch (state) {
                        case 'completed': return <CheckCircle2 className="h-4 w-4" />;
                        case 'current': return <Clock className="h-4 w-4" />;
                        case 'cancelled': return <XCircle className="h-4 w-4" />;
                        default: return <Circle className="h-3 w-3" />;
                      }
                    })();

                    return (
                      <div key={step.key} className="grid grid-cols-[auto,1fr] gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`flex size-9 items-center justify-center rounded-full border ${circleClasses}`}>
                            {icon}
                          </div>
                          {index < timelineSteps.length - 1 && (
                            <div className={`mt-1 w-px flex-1 ${lineClasses}`} style={{ minHeight: '2.5rem' }} />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{step.label}</p>
                            {timestampLabel && <span className="text-xs text-gray-500 dark:text-gray-400">{timestampLabel}</span>}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {so.status === 'cancelled' && (
                  <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <span>This sales order was cancelled.</span>
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
                  Perform the next step for this order.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {canMarkProcessing && (
                  <Button
                    onClick={handleMarkProcessing}
                    disabled={updateStatus.isPending}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Start Processing
                  </Button>
                )}
                {canMarkDelivered && (
                  <Button
                    onClick={handleMarkDelivered}
                    disabled={updateStatus.isPending}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    Mark as Delivered
                  </Button>
                )}
                {/* Issue Stock Section */}
                {canIssueStock && (
                  <div className="flex flex-col gap-2 p-3 border rounded-md bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                      <Package className="h-4 w-4" />
                      Issue Stock
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Deduct inventory and record COGS journal entry.
                    </p>
                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select warehouse..." />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>
                            {wh.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleIssueStock}
                      disabled={!selectedWarehouseId || issueStockMutation.isPending}
                      variant="default"
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      {issueStockMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Package className="mr-2 h-4 w-4" />
                      )}
                      Issue Stock
                    </Button>
                  </div>
                )}
                {so.stock_issued && (
                  <div className="flex items-center gap-2 p-2 text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                    <CheckCircle2 className="h-4 w-4" />
                    Stock issued on {so.stock_issued_date ? new Date(so.stock_issued_date).toLocaleDateString('fr-FR') : 'N/A'}
                  </div>
                )}
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
                      ? 'Generate an invoice for the customer.'
                      : 'This order has been fully invoiced.'}
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
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {so.customer_name}
                </p>
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
                  {so.expected_delivery_date ? new Date(so.expected_delivery_date).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Currency:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {so.currency_code}
                </p>
              </div>
              {so.shipping_address && (
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Shipping Address:</span>
                  <p className="font-medium text-gray-900 dark:text-white whitespace-pre-wrap">
                    {so.shipping_address}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoicing Status */}
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

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Line Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700">
                      <TableHead className="text-left py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Item
                      </TableHead>
                      <TableHead className="text-left py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Description
                      </TableHead>
                      <TableHead className="text-right py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Qty
                      </TableHead>
                      <TableHead className="text-right py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Rate
                      </TableHead>
                      <TableHead className="text-right py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Amount
                      </TableHead>
                      <TableHead className="text-right py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Tax
                      </TableHead>
                      <TableHead className="text-right py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {so.items?.map((item) => (
                      <TableRow key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                        <TableCell className="py-2 px-2 text-sm font-medium text-gray-900 dark:text-white">
                          {item.item_name}
                        </TableCell>
                        <TableCell className="py-2 px-2 text-sm text-gray-600 dark:text-gray-400">
                          {item.description || '-'}
                        </TableCell>
                        <TableCell className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(Number(item.unit_price), so.currency_code)}
                        </TableCell>
                        <TableCell className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(Number(item.amount), so.currency_code)}
                        </TableCell>
                        <TableCell className="py-2 px-2 text-sm text-right text-gray-600 dark:text-gray-400">
                          {formatCurrency(Number(item.tax_amount ?? 0), so.currency_code)}
                        </TableCell>
                        <TableCell className="py-2 px-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(Number(item.line_total ?? (Number(item.amount) + Number(item.tax_amount ?? 0))), so.currency_code)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!so.items || so.items.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No line items found for this sales order.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
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

          {/* Notes */}
          {so.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {so.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            {canCreateInvoice && remainingToInvoice > 0 && (
              <Button
                onClick={handleCreateInvoice}
                disabled={convertToInvoice.isPending}
              >
                {convertToInvoice.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Create Invoice
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
