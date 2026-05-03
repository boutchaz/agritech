import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, DollarSign, CheckCircle2, XCircle, Building2, Users } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import ModernPageHeader from '@/components/ModernPageHeader';
import {
  useLeaveEncashments,
  useApproveLeaveEncashment,
  useMarkPaidLeaveEncashment,
  useCancelLeaveEncashment,
} from '@/hooks/useLeaveManagement';
import type { EncashmentStatus } from '@/lib/api/leave-management';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_COLORS: Record<EncashmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export const Route = createFileRoute(
  '/_authenticated/(workforce)/workforce/leave-encashments',
)({
  component: withRouteProtection(LeaveEncashmentsPage, 'manage', 'LeaveEncashment'),
});

function LeaveEncashmentsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const orgId = currentOrganization?.id ?? null;

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const encashmentsQuery = useLeaveEncashments(orgId, statusFilter ? { status: statusFilter } : {});
  const approveMutation = useApproveLeaveEncashment();
  const markPaidMutation = useMarkPaidLeaveEncashment();
  const cancelMutation = useCancelLeaveEncashment();

  if (!orgId) return null;

  const encashments = encashmentsQuery.data?.data ?? [];
  const totalPending = encashments
    .filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + Number(e.total_amount), 0);

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization?.name ?? '', path: '/dashboard' },
          { icon: Users, label: t('nav.workforce', 'Workforce'), path: '/workforce/employees' },
          { icon: DollarSign, label: t('leaveEncashments.title', 'Leave Encashments'), isActive: true },
        ]}
        title={t('leaveEncashments.title', 'Leave Encashments')}
        subtitle={t(
          'leaveEncashments.subtitle',
          'Convert unused leave days into cash payouts.',
        )}
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-2">
          {['', 'pending', 'approved', 'paid', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                statusFilter === s
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              )}
            >
              {s === '' ? t('common.all', 'All')
                : t(`leaveEncashments.statuses.${s}`, s)}
            </button>
          ))}
        </div>
        {totalPending > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            {t('leaveEncashments.pendingTotal', 'Pending')}: <strong>{formatCurrency(totalPending)}</strong>
          </span>
        )}
      </div>

      {encashmentsQuery.isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : encashments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
          <DollarSign className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">{t('leaveEncashments.empty', 'No encashments found')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {encashments.map((e) => (
            <div
              key={e.id}
              className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {e.worker
                      ? `${e.worker.first_name} ${e.worker.last_name}`
                      : '—'}
                  </span>
                  <Badge className={cn('text-xs', STATUS_COLORS[e.status])}>
                    {t(`leaveEncashments.statuses.${e.status}`, e.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span>{e.leave_type?.name ?? '—'}</span>
                  <span>{e.days_encashed} {t('leaveEncashments.days', 'days')}</span>
                  <span>{formatCurrency(Number(e.total_amount))}</span>
                  <span>{format(new Date(e.created_at), 'd MMM yyyy', { locale: fr })}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {e.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() =>
                      approveMutation.mutate(
                        { orgId, id: e.id },
                        {
                          onSuccess: () => toast.success(t('leaveEncashments.approved', 'Encashment approved')),
                          onError: () => toast.error(t('leaveEncashments.approveError', 'Failed to approve')),
                        },
                      )
                    }
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 me-1.5" />
                    {t('common.approve', 'Approve')}
                  </Button>
                )}
                {e.status === 'approved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      markPaidMutation.mutate(
                        { orgId, id: e.id },
                        {
                          onSuccess: () => toast.success(t('leaveEncashments.markedPaid', 'Marked as paid')),
                          onError: () => toast.error(t('leaveEncashments.payError', 'Failed to mark as paid')),
                        },
                      )
                    }
                    disabled={markPaidMutation.isPending}
                  >
                    <DollarSign className="h-3.5 w-3.5 me-1.5" />
                    {t('leaveEncashments.markPaid', 'Mark Paid')}
                  </Button>
                )}
                {e.status !== 'cancelled' && e.status !== 'paid' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setCancelling(e.id)}
                  >
                    <XCircle className="h-3.5 w-3.5 me-1.5" />
                    {t('common.cancel', 'Cancel')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelling && (
        <ResponsiveDialog
          open
          onOpenChange={() => setCancelling(null)}
          size="sm"
          title={t('leaveEncashments.cancelTitle', 'Cancel Encashment')}
          footer={
            <>
              <Button variant="outline" onClick={() => setCancelling(null)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  cancelMutation.mutate(
                    { orgId, id: cancelling },
                    {
                      onSuccess: () => {
                        setCancelling(null);
                        toast.success(t('leaveEncashments.cancelled', 'Encashment cancelled'));
                      },
                      onError: () => toast.error(t('leaveEncashments.cancelError', 'Failed to cancel')),
                    },
                  );
                }}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.confirm', 'Confirm')}
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('leaveEncashments.cancelConfirm', 'The encashed days will be returned to the allocation. This action cannot be undone for paid encashments.')}
          </p>
        </ResponsiveDialog>
      )}
    </>
  );
}
