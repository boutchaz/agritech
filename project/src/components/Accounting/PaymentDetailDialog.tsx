import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { type Payment, useDeletePayment } from '@/hooks/useAccountingPayments';
import { CreditCard, Calendar, Building2, FileText, CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react';
import { PaymentForm } from './PaymentForm';
import { PaymentAllocationDialog } from './PaymentAllocationDialog';

interface PaymentDetailDialogProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'view' | 'edit';
}

export const PaymentDetailDialog = ({
  payment,
  open,
  onOpenChange,
  mode: initialMode = 'view',
}: PaymentDetailDialogProps) => {
  const { t } = useTranslation();
  const [mode, setMode] = React.useState<'view' | 'edit'>(initialMode);
  const deletePayment = useDeletePayment();
  const [allocationOpen, setAllocationOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  React.useEffect(() => {
    if (!open) {
      setAllocationOpen(false);
      setConfirmOpen(false);
    }
  }, [open]);

  if (!payment) return null;

  const handleDelete = async () => {
    try {
      await deletePayment.mutateAsync(payment.id);
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete payment:', error);
      toast.error(t('dialogs.paymentDetail.deleteFailed'));
    }
  };

  const confirmAction = {
    title: t('dialogs.paymentDetail.confirmDeleteTitle', 'Delete payment'),
    description: t('dialogs.paymentDetail.confirmDelete'),
    variant: 'destructive' as const,
    onConfirm: handleDelete,
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'submitted':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'draft':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'submitted':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Header content shared between mobile and desktop
  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <span>{mode === 'edit' ? t('dialogs.paymentDetail.editTitle') : t('dialogs.paymentDetail.title')}</span>
      {mode === 'view' && (
        <Badge className={`${getStatusColor(payment.status)} flex items-center gap-1`}>
          {getStatusIcon(payment.status)}
          {payment.status || 'draft'}
        </Badge>
      )}
    </div>
  );

  const descriptionText = mode === 'edit'
    ? t('dialogs.paymentDetail.editDescription')
    : `${t('dialogs.paymentDetail.paymentNumber')} ${payment.payment_number}`;

  // Main content shared between mobile and desktop
  const mainContent = mode === 'edit' ? (
    <PaymentForm
      payment={payment}
      onSuccess={() => {
        onOpenChange(false);
        setMode('view');
      }}
      onCancel={() => setMode('view')}
    />
  ) : (
    <div className="space-y-6">
            {/* Payment Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('dialogs.paymentDetail.paymentNumber')}</p>
                  <p className="font-semibold">{payment.payment_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('dialogs.paymentDetail.paymentDate')}</p>
                  <p className="font-semibold">{new Date(payment.payment_date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('dialogs.paymentDetail.amount')}</p>
              <p className={`text-3xl font-bold ${payment.payment_type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                {payment.payment_type === 'receive' ? '+' : '-'} {payment.currency_code} {Number(payment.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Party Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('dialogs.paymentDetail.paymentType')}</p>
                <Badge variant={payment.payment_type === 'receive' ? 'default' : 'secondary'}>
                  {payment.payment_type === 'receive' ? t('dialogs.paymentDetail.paymentReceived') : t('dialogs.paymentDetail.paymentMade')}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('dialogs.paymentDetail.party')}</p>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <p className="font-medium">{payment.party_name}</p>
                </div>
                {payment.party_type && (
                  <p className="text-sm text-gray-500 mt-1">({payment.party_type})</p>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('dialogs.paymentDetail.paymentMethod')}</p>
                <p className="font-medium capitalize">{payment.payment_method.replace('_', ' ')}</p>
              </div>
              {payment.reference_number && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('dialogs.paymentDetail.referenceNumber')}</p>
                  <p className="font-medium">{payment.reference_number}</p>
                </div>
              )}
            </div>

            {/* Remarks */}
            {payment.remarks && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('dialogs.paymentDetail.remarks')}
                </p>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">{payment.remarks}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t pt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>{t('dialogs.paymentDetail.created')}: {new Date(payment.created_at || '').toLocaleString('fr-FR')}</p>
              {payment.updated_at && payment.updated_at !== payment.created_at && (
                <p>{t('dialogs.paymentDetail.updated')}: {new Date(payment.updated_at).toLocaleString('fr-FR')}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex gap-2">
                {payment.status === 'draft' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMode('edit')}
                    >
                      {t('app.edit')}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setAllocationOpen(true)}
                    >
                      {t('dialogs.paymentDetail.allocateAndPost')}
                    </Button>
                  </>
                )}
                {payment.status === 'submitted' && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('dialogs.paymentDetail.paymentSubmitted')}
                  </Badge>
                )}
              </div>
              {payment.status === 'draft' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                  disabled={deletePayment.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deletePayment.isPending ? t('dialogs.paymentDetail.deleting') : t('app.delete')}
                </Button>
              )}
            </div>
    </div>
  );

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title={headerContent}
        description={descriptionText}
        size="2xl"
        contentClassName="max-h-[90vh] overflow-y-auto"
      >
        {mainContent}
      </ResponsiveDialog>
      <PaymentAllocationDialog
        payment={payment}
        open={allocationOpen}
        onOpenChange={setAllocationOpen}
        onAllocated={() => onOpenChange(false)}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </>
  );
};
