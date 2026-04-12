import { createFileRoute } from '@tanstack/react-router';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import {
  normalizePlanType,
  normalizeBillingInterval,
  getEstimatedPricing,
  type BackendBillingInterval,
} from '@/lib/polar';
import {
  CreditCard,
  Receipt,
  Calendar,
  FileText,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

function BillingPage() {
  const { data: subscription, isLoading } = useSubscription();
  const { currentOrganization } = useAuth();
  const { t } = useTranslation();

  const normalizedPlan = normalizePlanType(
    subscription?.formula || subscription?.plan_type || null,
  );
  const billingInterval = normalizeBillingInterval(
    subscription?.billing_cycle as BackendBillingInterval | null | undefined,
  );

  const pricing =
    normalizedPlan && subscription?.contracted_hectares
      ? getEstimatedPricing(
          normalizedPlan,
          subscription.contracted_hectares,
          billingInterval,
        )
      : null;

  const statusColor: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    trialing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    past_due: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    canceled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    pending_renewal: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('billing.title', 'Billing & Invoices')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('billing.description', 'Manage your billing information, payment method, and view invoice history.')}
        </p>
      </div>

      {/* Billing Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('billing.currentPlan', 'Current Plan')}
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
              {normalizedPlan || t('billing.noPlan', 'No plan')}
            </div>
            {subscription?.status && (
              <Badge
                className={cn(
                  'mt-2 text-xs font-medium',
                  statusColor[subscription.status] || 'bg-slate-100 text-slate-700',
                )}
              >
                {subscription.status === 'active' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {subscription.status === 'past_due' && <AlertCircle className="h-3 w-3 mr-1" />}
                {subscription.status}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('billing.amountPerCycle', 'Amount / Cycle')}
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {pricing ? (
                <>
                  {pricing.cycleTtc.toLocaleString('fr-MA', { minimumFractionDigits: 2 })}
                  <span className="text-sm font-normal text-slate-400 ml-1">
                    USD TTC
                  </span>
                </>
              ) : (
                '—'
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 capitalize">
              {billingInterval}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('billing.nextBilling', 'Next Billing')}
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {subscription?.next_billing_at
                ? format(new Date(subscription.next_billing_at), 'dd MMM yyyy')
                : subscription?.current_period_end
                  ? format(new Date(subscription.current_period_end), 'dd MMM yyyy')
                  : '—'}
            </div>
            {subscription?.cancel_at_period_end && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {t('billing.cancelAtEnd', 'Cancels at period end')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Billing Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-slate-500" />
            {t('billing.billingDetails', 'Billing Details')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {t('billing.organization', 'Organization')}
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {currentOrganization?.name || '—'}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {t('billing.currency', 'Currency')}
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {subscription?.currency?.toUpperCase() || 'USD'}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {t('billing.contractedHectares', 'Contracted Hectares')}
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {subscription?.contracted_hectares ? `${subscription.contracted_hectares} ha` : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                {t('billing.billingCycle', 'Billing Cycle')}
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                {billingInterval}
              </div>
            </div>
            {subscription?.contract_start_at && (
              <div>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  {t('billing.contractStart', 'Contract Start')}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {format(new Date(subscription.contract_start_at), 'dd MMM yyyy')}
                </div>
              </div>
            )}
            {subscription?.contract_end_at && (
              <div>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  {t('billing.contractEnd', 'Contract End')}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {format(new Date(subscription.contract_end_at), 'dd MMM yyyy')}
                </div>
              </div>
            )}
            {pricing && (
              <>
                <div>
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                    {t('billing.amountHT', 'Amount HT')}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {pricing.cycleHt.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                    {t('billing.vat', 'TVA (20%)')}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {pricing.cycleTva.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-slate-500" />
            {t('billing.invoiceHistory', 'Invoice History')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 border rounded-lg border-dashed border-slate-200 dark:border-slate-700">
            <Clock className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('billing.noInvoices', 'No invoices yet')}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {t('billing.invoicesWillAppear', 'Invoices will appear here after your first billing cycle.')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BillingSettingsPage() {
  return (
    <RoleProtectedRoute allowedRoles={['system_admin', 'organization_admin']}>
      <BillingPage />
    </RoleProtectedRoute>
  );
}

export const Route = createFileRoute('/_authenticated/(settings)/settings/billing')({
  component: BillingSettingsPage,
});
