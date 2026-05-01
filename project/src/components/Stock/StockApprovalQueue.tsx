import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { SectionLoader } from '@/components/ui/loader';
import { EmptyState } from '@/components/ui/empty-state';
import {
  usePendingApprovals,
  useApproveEntry,
  useRejectEntry,
} from '@/hooks/useApprovals';
import { ClipboardCheck, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function StockApprovalQueue() {
  const { t } = useTranslation('stock');
  const { data: approvals = [], isLoading, error } = usePendingApprovals();
  const approveEntry = useApproveEntry();
  const rejectEntry = useRejectEntry();

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async (approvalId: string) => {
    try {
      await approveEntry.mutateAsync(approvalId);
      toast.success(t('stockApprovals.approveSuccess', 'Entry approved successfully'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      toast.error(`${t('stockApprovals.approveError', 'Failed to approve entry')}: ${message}`);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error(t('stockApprovals.rejectReasonRequired', 'Rejection reason is required'));
      return;
    }

    try {
      await rejectEntry.mutateAsync({ approvalId: rejectingId, reason });
      toast.success(t('stockApprovals.rejectSuccess', 'Entry rejected'));
      setRejectingId(null);
      setRejectReason('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      toast.error(`${t('stockApprovals.rejectError', 'Failed to reject entry')}: ${message}`);
    }
  };

  if (isLoading) {
    return <SectionLoader />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed dark:border-gray-700">
        <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-gray-600 dark:text-gray-400">
          {t('stockApprovals.error', 'Failed to load approval queue')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('stockApprovals.title', 'Approval Queue')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('stockApprovals.subtitle', 'Review and approve stock entries')}
        </p>
      </div>

      {approvals.length === 0 ? (
        <EmptyState
          variant="card"
          icon={ClipboardCheck}
          title={t('stockApprovals.noApprovals', 'No pending approvals')}
          description={t('stockApprovals.noApprovalsHint', 'All stock entries have been reviewed')}
        />
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <Card key={approval.id} className="dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {approval.entryNumber}
                      </h3>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {approval.entryType}
                      </Badge>
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        {t('stockApprovals.requestedBy', 'Requested By')}: {approval.requestedByName}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block">
                          {t('stockApprovals.warehouse', 'Warehouse')}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {approval.warehouseName}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block">
                          {t('stockApprovals.entryDate', 'Entry Date')}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(approval.entryDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block">
                          {t('stockApprovals.totalItems', 'Items')}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {approval.totalItems}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block">
                          {t('stockApprovals.totalValue', 'Total Value')}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {approval.totalValue.toLocaleString()} MAD
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      {t('stockApprovals.requestedAt', 'Requested At')}: {new Date(approval.requestedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(approval.id)}
                      disabled={approveEntry.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {t('stockApprovals.approve', 'Approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setRejectingId(approval.id);
                        setRejectReason('');
                      }}
                      disabled={rejectEntry.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      {t('stockApprovals.reject', 'Reject')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <DialogContent className="sm:max-w-md dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>{t('stockApprovals.rejectTitle', 'Reject Entry')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('stockApprovals.rejectDescription', 'Please provide a reason for rejecting this entry')}
          </p>
          <div className="py-2">
            <label htmlFor="reject-reason" className="sr-only">
              {t('stockApprovals.rejectReason', 'Rejection Reason')}
            </label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('stockApprovals.rejectReasonPlaceholder', 'Enter reason for rejection...')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>
              {t('stockApprovals.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {t('stockApprovals.confirmReject', 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
