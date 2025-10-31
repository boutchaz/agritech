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
import { Send, CheckCircle2, XCircle, FileText, ArrowRight, Download, Edit } from 'lucide-react';
import type { Quote } from '@/hooks/useQuotes';
import { useConvertQuoteToOrder } from '@/hooks/useQuotes';
import { formatCurrency } from '@/lib/taxCalculations';
import { toast } from 'sonner';

interface QuoteDetailDialogProps {
  quote: Quote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (quote: Quote) => void;
  onDownloadPDF?: (quote: Quote) => void;
}

export const QuoteDetailDialog: React.FC<QuoteDetailDialogProps> = ({
  quote,
  open,
  onOpenChange,
  onEdit,
  onDownloadPDF,
}) => {
  const { currentOrganization: _currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const convertToOrder = useConvertQuoteToOrder();

  // Update quote status mutation
  const updateStatus = useMutation({
    mutationFn: async (status: Quote['status']) => {
      if (!quote) throw new Error('No quote selected');

      const { error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', quote.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote status updated');
    },
    onError: (error) => {
      toast.error('Failed to update quote status: ' + error.message);
    },
  });

  const handleSendToCustomer = () => {
    updateStatus.mutate('sent');
  };

  const handleMarkAsAccepted = () => {
    updateStatus.mutate('accepted');
  };

  const handleMarkAsRejected = () => {
    updateStatus.mutate('rejected');
  };

  const handleConvertToOrder = () => {
    if (!quote) return;

    convertToOrder.mutate(quote.id, {
      onSuccess: (salesOrder) => {
        toast.success(`Quote converted to Sales Order #${salesOrder.order_number}`);
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error('Failed to convert quote: ' + error.message);
      },
    });
  };

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'converted':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'expired':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!quote) return null;

  const canSend = quote.status === 'draft';
  const canAccept = quote.status === 'sent';
  const canReject = quote.status === 'sent';
  const canConvert = quote.status === 'accepted';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Quote #{quote.quote_number}
              </DialogTitle>
              <DialogDescription>
                View quote details and manage status
              </DialogDescription>
            </div>
            <Badge className={getStatusColor(quote.status)}>
              {quote.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quote Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Quote Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {quote.customer_name}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Quote Date:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(quote.quote_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Valid Until:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(quote.valid_until).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Currency:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {quote.currency_code}
                </p>
              </div>
              {quote.payment_terms && (
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Payment Terms:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {quote.payment_terms}
                  </p>
                </div>
              )}
              {quote.delivery_terms && (
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Delivery Terms:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {quote.delivery_terms}
                  </p>
                </div>
              )}
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
                    {quote.items?.map((item: any, index: number) => (
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
                        <td className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(Number(item.rate), quote.currency_code)}
                        </td>
                        <td className="py-2 px-2 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(Number(item.amount), quote.currency_code)}
                        </td>
                        <td className="py-2 px-2 text-sm text-right text-gray-600 dark:text-gray-400">
                          {formatCurrency(Number(item.tax_amount), quote.currency_code)}
                        </td>
                        <td className="py-2 px-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(
                            Number(item.amount) + Number(item.tax_amount),
                            quote.currency_code
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
                subtotal={Number(quote.subtotal)}
                taxTotal={Number(quote.tax_total)}
                grandTotal={Number(quote.grand_total)}
                currency={quote.currency_code}
              />
            </CardContent>
          </Card>

          {/* Terms & Conditions */}
          {quote.terms_conditions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Terms & Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {quote.terms_conditions}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t">
            {/* Left side - Edit and Download */}
            <div className="flex items-center gap-2">
              {onDownloadPDF && (
                <Button
                  onClick={() => onDownloadPDF(quote)}
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              )}
              {onEdit && quote.status !== 'converted' && quote.status !== 'cancelled' && (
                <Button
                  onClick={() => onEdit(quote)}
                  variant="outline"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Quote
                </Button>
              )}
            </div>

            {/* Right side - Status actions and Close */}
            <div className="flex items-center gap-2">
              {canSend && (
                <Button
                  onClick={handleSendToCustomer}
                  disabled={updateStatus.isPending}
                  variant="outline"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send to Customer
                </Button>
              )}
              {canReject && (
                <Button
                  onClick={handleMarkAsRejected}
                  disabled={updateStatus.isPending}
                  variant="outline"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Mark as Rejected
                </Button>
              )}
              {canAccept && (
                <Button
                  onClick={handleMarkAsAccepted}
                  disabled={updateStatus.isPending}
                  variant="outline"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Accepted
                </Button>
              )}
              {canConvert && (
                <Button
                  onClick={handleConvertToOrder}
                  disabled={convertToOrder.isPending}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Convert to Sales Order
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
