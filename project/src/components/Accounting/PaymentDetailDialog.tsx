import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Payment, useSubmitPayment, useDeletePayment } from '@/hooks/useAccountingPayments';
import { CreditCard, Calendar, Building2, FileText, CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react';
import { PaymentForm } from './PaymentForm';

interface PaymentDetailDialogProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'view' | 'edit';
}

export const PaymentDetailDialog: React.FC<PaymentDetailDialogProps> = ({
  payment,
  open,
  onOpenChange,
  mode: initialMode = 'view',
}) => {
  const [mode, setMode] = React.useState<'view' | 'edit'>(initialMode);
  const submitPayment = useSubmitPayment();
  const deletePayment = useDeletePayment();

  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  if (!payment) return null;

  const handleSubmit = async () => {
    if (window.confirm('Are you sure you want to submit this payment? This action cannot be undone.')) {
      try {
        await submitPayment.mutateAsync(payment.id);
        onOpenChange(false);
      } catch (error) {
        console.error('Failed to submit payment:', error);
        alert('Failed to submit payment. Please try again.');
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      try {
        await deletePayment.mutateAsync(payment.id);
        onOpenChange(false);
      } catch (error) {
        console.error('Failed to delete payment:', error);
        alert('Failed to delete payment. Please try again.');
      }
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{mode === 'edit' ? 'Edit Payment' : 'Payment Details'}</span>
            {mode === 'view' && (
              <Badge className={`${getStatusColor(payment.status)} flex items-center gap-1`}>
                {getStatusIcon(payment.status)}
                {payment.status || 'draft'}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update payment information below' : `Payment ${payment.payment_number}`}
          </DialogDescription>
        </DialogHeader>

        {mode === 'edit' ? (
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
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Payment Number</p>
                  <p className="font-semibold">{payment.payment_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Payment Date</p>
                  <p className="font-semibold">{new Date(payment.payment_date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Amount</p>
              <p className={`text-3xl font-bold ${payment.payment_type === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                {payment.payment_type === 'received' ? '+' : '-'} {payment.currency_code} {Number(payment.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Party Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Payment Type</p>
                <Badge variant={payment.payment_type === 'received' ? 'default' : 'secondary'}>
                  {payment.payment_type === 'received' ? 'Payment Received' : 'Payment Made'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Party</p>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Payment Method</p>
                <p className="font-medium capitalize">{payment.payment_method.replace('_', ' ')}</p>
              </div>
              {payment.reference_number && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Reference Number</p>
                  <p className="font-medium">{payment.reference_number}</p>
                </div>
              )}
            </div>

            {/* Remarks */}
            {payment.remarks && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Remarks
                </p>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">{payment.remarks}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t pt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>Created: {new Date(payment.created_at || '').toLocaleString('fr-FR')}</p>
              {payment.updated_at && payment.updated_at !== payment.created_at && (
                <p>Updated: {new Date(payment.updated_at).toLocaleString('fr-FR')}</p>
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
                      Edit
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSubmit}
                      disabled={submitPayment.isPending}
                    >
                      {submitPayment.isPending ? 'Submitting...' : 'Submit Payment'}
                    </Button>
                  </>
                )}
                {payment.status === 'submitted' && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Payment Submitted
                  </Badge>
                )}
              </div>
              {payment.status === 'draft' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deletePayment.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deletePayment.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
