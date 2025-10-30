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
import { CheckCircle2, ShoppingCart, FileText, Truck } from 'lucide-react';
import type { SalesOrder } from '@/hooks/useSalesOrders';
import { useConvertOrderToInvoice } from '@/hooks/useSalesOrders';
import { formatCurrency } from '@/lib/taxCalculations';
import { toast } from 'sonner';

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
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const convertToInvoice = useConvertOrderToInvoice();

  // Update order status mutation
  const updateStatus = useMutation({
    mutationFn: async (status: SalesOrder['status']) => {
      if (!salesOrder) throw new Error('No sales order selected');

      const { error } = await supabase
        .from('sales_orders')
        .update({ status })
        .eq('id', salesOrder.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      toast.success('Sales order status updated');
    },
    onError: (error) => {
      toast.error('Failed to update sales order status: ' + error.message);
    },
  });

  const handleConfirm = () => {
    updateStatus.mutate('confirmed');
  };

  const handleMarkProcessing = () => {
    updateStatus.mutate('processing');
  };

  const handleMarkPartiallyDelivered = () => {
    updateStatus.mutate('partially_delivered');
  };

  const handleMarkDelivered = () => {
    updateStatus.mutate('delivered');
  };

  const handleCreateInvoice = () => {
    if (!salesOrder) return;

    // Use today as invoice date and 30 days later as due date
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

  const getStatusColor = (status: SalesOrder['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'partially_delivered':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'partially_invoiced':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'invoiced':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!salesOrder) return null;

  const canConfirm = salesOrder.status === 'draft';
  const canMarkProcessing = salesOrder.status === 'confirmed';
  const canMarkPartiallyDelivered = salesOrder.status === 'processing';
  const canMarkDelivered = salesOrder.status === 'processing' || salesOrder.status === 'partially_delivered';
  const canCreateInvoice = ['confirmed', 'processing', 'partially_delivered', 'delivered'].includes(salesOrder.status);

  const remainingToInvoice = Number(salesOrder.grand_total) - Number(salesOrder.invoiced_amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Sales Order #{salesOrder.order_number}
              </DialogTitle>
              <DialogDescription>
                View sales order details and manage fulfillment
              </DialogDescription>
            </div>
            <Badge className={getStatusColor(salesOrder.status)}>
              {salesOrder.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information */}
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
                  {salesOrder.customer_name}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Order Date:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(salesOrder.order_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Expected Delivery:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(salesOrder.expected_delivery_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Currency:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {salesOrder.currency_code}
                </p>
              </div>
              {salesOrder.quote_id && (
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Converted from Quote:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Yes (Quote linked)
                  </p>
                </div>
              )}
              {salesOrder.payment_terms && (
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Payment Terms:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {salesOrder.payment_terms}
                  </p>
                </div>
              )}
              {salesOrder.shipping_address && (
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Shipping Address:</span>
                  <p className="font-medium text-gray-900 dark:text-white whitespace-pre-wrap">
                    {salesOrder.shipping_address}
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
                  {formatCurrency(Number(salesOrder.grand_total), salesOrder.currency_code)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount Invoiced:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(Number(salesOrder.invoiced_amount), salesOrder.currency_code)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium text-gray-900 dark:text-white">Remaining to Invoice:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(remainingToInvoice, salesOrder.currency_code)}
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
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Item
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Description
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Qty
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Delivered
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Invoiced
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Rate
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Amount
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Tax
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesOrder.items?.map((item: any, index: number) => (
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
                          {formatCurrency(Number(item.rate), salesOrder.currency_code)}
                        </td>
                        <td className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(Number(item.amount), salesOrder.currency_code)}
                        </td>
                        <td className="py-2 px-2 text-sm text-right text-gray-600 dark:text-gray-400">
                          {formatCurrency(Number(item.tax_amount), salesOrder.currency_code)}
                        </td>
                        <td className="py-2 px-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(
                            Number(item.amount) + Number(item.tax_amount),
                            salesOrder.currency_code
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                subtotal={Number(salesOrder.subtotal)}
                taxTotal={Number(salesOrder.tax_total)}
                grandTotal={Number(salesOrder.grand_total)}
                currency={salesOrder.currency_code}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          {salesOrder.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {salesOrder.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            {canConfirm && (
              <Button
                onClick={handleConfirm}
                disabled={updateStatus.isPending}
                variant="outline"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm Order
              </Button>
            )}
            {canMarkProcessing && (
              <Button
                onClick={handleMarkProcessing}
                disabled={updateStatus.isPending}
                variant="outline"
              >
                Start Processing
              </Button>
            )}
            {canMarkPartiallyDelivered && (
              <Button
                onClick={handleMarkPartiallyDelivered}
                disabled={updateStatus.isPending}
                variant="outline"
              >
                <Truck className="mr-2 h-4 w-4" />
                Mark Partially Delivered
              </Button>
            )}
            {canMarkDelivered && (
              <Button
                onClick={handleMarkDelivered}
                disabled={updateStatus.isPending}
                variant="outline"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark as Delivered
              </Button>
            )}
            {canCreateInvoice && remainingToInvoice > 0 && (
              <Button
                onClick={handleCreateInvoice}
                disabled={convertToInvoice.isPending}
              >
                <FileText className="mr-2 h-4 w-4" />
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
