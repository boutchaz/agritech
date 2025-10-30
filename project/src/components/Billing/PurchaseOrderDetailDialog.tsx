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
import { CheckCircle2, Package, FileText, Truck, Send } from 'lucide-react';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useConvertPOToBill } from '@/hooks/usePurchaseOrders';
import { formatCurrency } from '@/lib/taxCalculations';
import { toast } from 'sonner';

interface PurchaseOrderDetailDialogProps {
  purchaseOrder: PurchaseOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PurchaseOrderDetailDialog: React.FC<PurchaseOrderDetailDialogProps> = ({
  purchaseOrder,
  open,
  onOpenChange,
}) => {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const convertToBill = useConvertPOToBill();

  // Update order status mutation
  const updateStatus = useMutation({
    mutationFn: async (status: PurchaseOrder['status']) => {
      if (!purchaseOrder) throw new Error('No purchase order selected');

      const { error } = await supabase
        .from('purchase_orders')
        .update({ status })
        .eq('id', purchaseOrder.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order status updated');
    },
    onError: (error) => {
      toast.error('Failed to update purchase order status: ' + error.message);
    },
  });

  const handleSubmit = () => {
    updateStatus.mutate('submitted');
  };

  const handleApprove = () => {
    updateStatus.mutate('approved');
  };

  const handleMarkInTransit = () => {
    updateStatus.mutate('in_transit');
  };

  const handleMarkReceived = () => {
    updateStatus.mutate('received');
  };

  const handleCreateBill = () => {
    if (!purchaseOrder) return;

    convertToBill.mutate(
      { purchaseOrderId: purchaseOrder.id },
      {
        onSuccess: (bill) => {
          toast.success(`Bill #${bill.invoice_number} created from Purchase Order`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error('Failed to create bill: ' + error.message);
        },
      }
    );
  };

  const getStatusColor = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in_transit':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'received':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'billed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!purchaseOrder) return null;

  const canSubmit = purchaseOrder.status === 'draft';
  const canApprove = purchaseOrder.status === 'submitted';
  const canMarkInTransit = purchaseOrder.status === 'approved';
  const canMarkReceived = purchaseOrder.status === 'in_transit';
  const canCreateBill = ['approved', 'in_transit', 'received'].includes(purchaseOrder.status);

  const remainingToBill = Number(purchaseOrder.grand_total) - Number(purchaseOrder.billed_amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Purchase Order #{purchaseOrder.order_number}
              </DialogTitle>
              <DialogDescription>
                View purchase order details and manage receipt
              </DialogDescription>
            </div>
            <Badge className={getStatusColor(purchaseOrder.status)}>
              {purchaseOrder.status}
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
                <span className="text-gray-600 dark:text-gray-400">Supplier:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {purchaseOrder.supplier_name}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Order Date:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(purchaseOrder.order_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Expected Delivery:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(purchaseOrder.expected_delivery_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Currency:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {purchaseOrder.currency_code}
                </p>
              </div>
              {purchaseOrder.payment_terms && (
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Payment Terms:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {purchaseOrder.payment_terms}
                  </p>
                </div>
              )}
              {purchaseOrder.shipping_address && (
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Delivery Address:</span>
                  <p className="font-medium text-gray-900 dark:text-white whitespace-pre-wrap">
                    {purchaseOrder.shipping_address}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Status */}
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
                  {formatCurrency(Number(purchaseOrder.grand_total), purchaseOrder.currency_code)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount Billed:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(Number(purchaseOrder.billed_amount), purchaseOrder.currency_code)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium text-gray-900 dark:text-white">Remaining to Bill:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(remainingToBill, purchaseOrder.currency_code)}
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
                        Received
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Billed
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
                    {purchaseOrder.items?.map((item: any, index: number) => (
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
                          {formatCurrency(Number(item.rate), purchaseOrder.currency_code)}
                        </td>
                        <td className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(Number(item.amount), purchaseOrder.currency_code)}
                        </td>
                        <td className="py-2 px-2 text-sm text-right text-gray-600 dark:text-gray-400">
                          {formatCurrency(Number(item.tax_amount), purchaseOrder.currency_code)}
                        </td>
                        <td className="py-2 px-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(
                            Number(item.amount) + Number(item.tax_amount),
                            purchaseOrder.currency_code
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
                subtotal={Number(purchaseOrder.subtotal)}
                taxTotal={Number(purchaseOrder.tax_total)}
                grandTotal={Number(purchaseOrder.grand_total)}
                currency={purchaseOrder.currency_code}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          {purchaseOrder.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Internal Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {purchaseOrder.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            {canSubmit && (
              <Button
                onClick={handleSubmit}
                disabled={updateStatus.isPending}
                variant="outline"
              >
                <Send className="mr-2 h-4 w-4" />
                Submit for Approval
              </Button>
            )}
            {canApprove && (
              <Button
                onClick={handleApprove}
                disabled={updateStatus.isPending}
                variant="outline"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve Order
              </Button>
            )}
            {canMarkInTransit && (
              <Button
                onClick={handleMarkInTransit}
                disabled={updateStatus.isPending}
                variant="outline"
              >
                <Truck className="mr-2 h-4 w-4" />
                Mark In Transit
              </Button>
            )}
            {canMarkReceived && (
              <Button
                onClick={handleMarkReceived}
                disabled={updateStatus.isPending}
                variant="outline"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark as Received
              </Button>
            )}
            {canCreateBill && remainingToBill > 0 && (
              <Button
                onClick={handleCreateBill}
                disabled={convertToBill.isPending}
              >
                <FileText className="mr-2 h-4 w-4" />
                Create Bill
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
