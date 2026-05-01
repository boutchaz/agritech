import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentRecords, useApprovePayment, useProcessPayment } from '@/hooks/usePaymentRecords';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { DollarSign, Plus, Building2 } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { PaymentMethod } from '@/types/payments';

function PaymentsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const { data: payments = [], isLoading, isError } = usePaymentRecords();
  const approveMutation = useApprovePayment();
  const processMutation = useProcessPayment();

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleApprove = async (paymentId: string) => {
    try {
      await approveMutation.mutateAsync({ paymentId });
      toast.success(t('payments.approveSuccess', 'Payment approved'));
    } catch {
      toast.error(t('payments.approveError', 'Failed to approve payment'));
    }
  };

  const handleProcess = async (paymentId: string) => {
    try {
      await processMutation.mutateAsync({
        paymentId,
        data: { payment_method: 'bank_transfer' as PaymentMethod },
      });
      toast.success(t('payments.processSuccess', 'Payment processed'));
    } catch {
      toast.error(t('payments.processError', 'Failed to process payment'));
    }
  };

  if (!currentOrganization) {
    return <PageLoader />;
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          { icon: DollarSign, label: t('payments.pageTitle', 'Payment Records'), isActive: true },
        ]}
        title={t('payments.pageTitle', 'Payment Records')}
        subtitle={t('payments.description', 'Track worker payments, advances, and approvals.')}
        actions={
          <Button variant="green" onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('payments.newPayment', 'New Payment')}
          </Button>
        }
      />

      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-lg p-6 h-48" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-red-500">{t('common.error', 'An error occurred while loading data.')}</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <DollarSign className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('payments.noPayments', 'No payment records yet')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('payments.noPaymentsDescription', 'Payment records will appear here once created.')}
            </p>
            <Button variant="green" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('payments.newPayment', 'New Payment')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {payments.map((payment) => (
              <Card key={payment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {payment.worker_name || t('payments.unnamedWorker', 'Worker')}
                    </CardTitle>
                    {payment.status && (
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {payment.payment_type && (
                      <p><span className="font-medium">{t('payments.type', 'Type')}:</span> {payment.payment_type}</p>
                    )}
                    {payment.period_start && (
                      <p><span className="font-medium">{t('payments.period', 'Period')}:</span> {format(new Date(payment.period_start), 'dd MMM')} - {payment.period_end ? format(new Date(payment.period_end), 'dd MMM yyyy') : '...'}</p>
                    )}
                    {payment.net_amount !== undefined && payment.net_amount !== null && (
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {Number(payment.net_amount).toLocaleString()} MAD
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    {payment.status === 'pending' && (
                      <Button variant="outline" size="sm" onClick={() => handleApprove(payment.id)}>
                        {t('payments.approve', 'Approve')}
                      </Button>
                    )}
                    {payment.status === 'approved' && (
                      <Button variant="outline" size="sm" onClick={() => handleProcess(payment.id)}>
                        {t('payments.process', 'Process')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{t('payments.newPayment', 'New Payment')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('payments.formComingSoon', 'Full payment form with worker selection and period calculation coming soon.')}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/payments')({
  component: withRouteProtection(PaymentsPage, 'read', 'Payment'),
});
