import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useInvoice, useUpdateInvoiceStatus, usePostInvoice } from '@/hooks/useInvoices';
import { Receipt, Calendar, User, FileText, CheckCircle2, XCircle, Mail, Loader2, DollarSign, Send, MapPin, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFarms } from '@/hooks/useParcelsQuery';
import { useParcelById } from '@/hooks/useParcelsQuery';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { invoiceStatus, renderStatusIcon } from '@/lib/statusUtils';
import { invoicesApi } from '@/lib/api/invoices';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { SectionLoader } from '@/components/ui/loader';


interface InvoiceDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string | null;
}

export const InvoiceDetailDialog: React.FC<InvoiceDetailDialogProps> = ({
  isOpen,
  onClose,
  invoiceId,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const { data: invoice, isLoading, error } = useInvoice(invoiceId);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const updateInvoiceStatus = useUpdateInvoiceStatus();
  const postInvoice = usePostInvoice();
  
  // Fetch farm and parcel details
  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const farm = invoice?.farm_id ? farms.find(f => f.id === invoice.farm_id) : null;
  const { data: parcel } = useParcelById(invoice?.parcel_id || null);

  const handleSendEmail = async () => {
    if (!invoiceId) return;
    
    setIsSendingEmail(true);
    try {
      const result = await invoicesApi.sendEmail(invoiceId);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error('Error sending invoice email:', err);
      toast.error(err instanceof Error ? err.message : t('invoices.email.error', 'Failed to send email'));
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoiceId || !invoice) return;
    
    if (!confirm(t('invoices.markAsPaid.confirm', 'Are you sure you want to mark this invoice as paid?'))) {
      return;
    }

    try {
      await updateInvoiceStatus.mutateAsync({
        invoice_id: invoiceId,
        status: 'paid',
        remarks: invoice.remarks || undefined,
      });
      toast.success(t('invoices.markAsPaid.success', 'Invoice marked as paid successfully'));
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      toast.error(err instanceof Error ? err.message : t('invoices.markAsPaid.error', 'Failed to mark invoice as paid'));
    }
  };

  const canMarkAsPaid = invoice && (invoice.status === 'submitted' || invoice.status === 'partially_paid' || invoice.status === 'overdue');
  const canSubmit = invoice && invoice.status === 'draft';

  const handleSubmitInvoice = async () => {
    if (!invoiceId || !invoice) return;
    
    if (!confirm(t('invoices.submit.confirm', 'Are you sure you want to submit this invoice? This will create a journal entry and update stock.'))) {
      return;
    }

    try {
      await postInvoice.mutateAsync({
        invoice_id: invoiceId,
        posting_date: invoice.invoice_date,
      });
      toast.success(t('invoices.submit.success', 'Invoice submitted successfully'));
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
    } catch (err) {
      console.error('Error submitting invoice:', err);
      toast.error(err instanceof Error ? err.message : t('invoices.submit.error', 'Failed to submit invoice'));
    }
  };

  if (!invoiceId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-green-600" />
            {t('dialogs.invoiceDetail.title')}
          </DialogTitle>
          <DialogDescription>
            {t('dialogs.invoiceDetail.description')}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <SectionLoader />
        )}

        {error && (
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400">{t('dialogs.invoiceDetail.errorLoading')}</p>
            <p className="text-sm text-gray-500 mt-2">{error instanceof Error ? error.message : t('app.unknownError')}</p>
          </div>
        )}

        {invoice && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Receipt className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('dialogs.invoiceDetail.invoiceNumber')}</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{invoice.invoice_number}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('dialogs.invoiceDetail.type')}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                        invoice.invoice_type === 'sales'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                        {invoice.invoice_type === 'sales' ? t('dialogs.invoiceDetail.salesInvoice') : t('dialogs.invoiceDetail.purchaseInvoice')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {invoice.invoice_type === 'sales' ? t('dialogs.invoiceDetail.customer') : t('dialogs.invoiceDetail.supplier')}
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">{invoice.party_name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('dialogs.invoiceDetail.invoiceDate')}</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('dialogs.invoiceDetail.dueDate')}</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('dialogs.invoiceDetail.status')}</p>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${invoiceStatus.getColor(invoice.status)}`}>
                        {renderStatusIcon(invoice.status)}
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {invoice.farm_id && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('dialogs.invoiceDetail.farm', 'Farm')}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{farm?.name || invoice.farm_id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {invoice.parcel_id && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('dialogs.invoiceDetail.parcel', 'Parcel')}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{parcel?.name || invoice.parcel_id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Line Items */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('dialogs.invoiceDetail.lineItems')}</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('dialogs.invoiceDetail.item')}
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('dialogs.invoiceDetail.quantity')}
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('dialogs.invoiceDetail.rate')}
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('dialogs.invoiceDetail.amount')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900">
                    {invoice.items?.map((item, index) => (
                      <tr key={item.id} className={index !== (invoice.items?.length ?? 0) - 1 ? 'border-b border-gray-200 dark:border-gray-800' : ''}>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{item.item_name}</p>
                            {item.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                          {invoice.currency_code} {Number(item.rate).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                          {invoice.currency_code} {Number(item.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="max-w-xs ml-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('dialogs.invoiceDetail.subtotal')}:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {invoice.currency_code} {Number(invoice.subtotal).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('dialogs.invoiceDetail.tax')}:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {invoice.currency_code} {Number(invoice.tax_total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-900 dark:text-white">{t('dialogs.invoiceDetail.grandTotal')}:</span>
                  <span className="text-green-600 dark:text-green-500">
                    {invoice.currency_code} {Number(invoice.grand_total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('dialogs.invoiceDetail.outstanding')}:</span>
                  <span className="text-red-600 dark:text-red-500 font-medium">
                    {invoice.currency_code} {Number(invoice.outstanding_amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Remarks */}
            {invoice.remarks && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('dialogs.invoiceDetail.remarks')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  {invoice.remarks}
                </p>
              </div>
            )}

            {/* Actions */}
            <DialogFooter className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                {canSubmit && (
                  <Button
                    variant="default"
                    onClick={handleSubmitInvoice}
                    disabled={postInvoice.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {postInvoice.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {t('invoices.submit.button', 'Submit Invoice')}
                  </Button>
                )}
                {canMarkAsPaid && (
                  <Button
                    variant="default"
                    onClick={handleMarkAsPaid}
                    disabled={updateInvoiceStatus.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {updateInvoiceStatus.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <DollarSign className="h-4 w-4 mr-2" />
                    )}
                    {t('invoices.markAsPaid.button', 'Mark as Paid')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                >
                  {isSendingEmail ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {t('invoices.actions.sendEmail', 'Send Email')}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
