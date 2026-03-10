import React from 'react';
import {
  CreditCard,
  Calendar,
  Users,
  MapPin,
  Building2,
  AlertCircle,
  ExternalLink,
  Loader2,
  LandPlot,
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSubscription } from '../hooks/useSubscription';
import {
  SUBSCRIPTION_PLANS,
  type PlanType,
  normalizePlanType,
  type BillingInterval,
  PLAN_HIERARCHY,
  normalizeBillingInterval,
  getEstimatedPricing,
  getDefaultHectaresForPlan,
} from '../lib/polar';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import { addonsApi } from '@/lib/api/addons';
import { subscriptionsService } from '@/services/subscriptionsService';

const SubscriptionSettings: React.FC = () => {
  const { data: subscription, isLoading } = useSubscription();
  const { currentOrganization } = useAuth();
  const { t } = useTranslation();
  const [showPlans, setShowPlans] = React.useState(false);
  const [selectedFormula, setSelectedFormula] = React.useState<PlanType | null>(
    null,
  );
  const [billingInterval, setBillingInterval] = React.useState<BillingInterval>(
    normalizeBillingInterval(subscription?.billing_cycle || subscription?.billing_interval),
  );
  const [contractedHectares, setContractedHectares] = React.useState<number>(
    subscription?.contracted_hectares || 50,
  );
  const { data: moduleConfig } = useModuleConfig();

  const normalizedPlanType = normalizePlanType(
    subscription?.formula || subscription?.plan_type || null,
  );

  React.useEffect(() => {
    if (subscription?.contracted_hectares) {
      setContractedHectares(subscription.contracted_hectares);
    }

    if (subscription?.billing_cycle || subscription?.billing_interval) {
      setBillingInterval(
        normalizeBillingInterval(
          subscription.billing_cycle || subscription.billing_interval,
        ),
      );
    }
  }, [subscription?.billing_cycle, subscription?.billing_interval, subscription?.contracted_hectares]);

  const { data: usage } = useQuery({
    queryKey: ['usage-counts', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null;
      return subscriptionsService.getUsage(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30 * 1000,
  });

  const purchaseAddon = useMutation({
    mutationFn: async (moduleId: string) => {
      if (!currentOrganization?.id) {
        throw new Error(t('subscription.errors.noOrganization'));
      }
      return addonsApi.purchase(currentOrganization.id, { module_id: moduleId });
    },
    onSuccess: (result) => {
      window.location.href = result.checkout_url;
    },
    onError: (error: Error) => {
      toast.error(error.message || t('subscription.errors.checkoutFailed'));
    },
  });

  const purchasePlan = useMutation({
    mutationFn: async (formula: PlanType) => {
      if (!currentOrganization?.id) {
        throw new Error(t('subscription.errors.noOrganization'));
      }

      setSelectedFormula(formula);
      const { checkoutUrl } = await subscriptionsService.createCheckout(
        formula,
        contractedHectares,
        currentOrganization.id,
        billingInterval,
      );
      return checkoutUrl;
    },
    onSuccess: (checkoutUrl) => {
      window.location.href = checkoutUrl;
    },
    onError: (error: Error) => {
      toast.error(error.message || t('subscription.errors.checkoutFailed'));
      setSelectedFormula(null);
    },
  });

  const coreModules =
    moduleConfig?.modules.filter((module) => module.isRequired) || [];
  const addonModules =
    moduleConfig?.modules.filter((module) => module.isAddonEligible) || [];

  const addonsOverviewQuery = useQuery({
    queryKey: ['addons-overview', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null;
      return addonsApi.getOverview(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60 * 1000,
  });

  const activeAddons = addonsOverviewQuery.data?.active_addons || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  const shouldShowPlans = showPlans || !normalizedPlanType;

  if (shouldShowPlans) {
    return (
      <div className="p-6 space-y-6">
        {showPlans && (
          <button
            onClick={() => setShowPlans(false)}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            ← {t('subscription.backToDetails', 'Back to details')}
          </button>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Contract Inputs
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Contracted hectares
              </label>
              <input
                type="number"
                min={1}
                value={contractedHectares}
                onChange={(event) =>
                  setContractedHectares(Math.max(1, Number(event.target.value || 1)))
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Billing cycle
              </label>
              <select
                value={billingInterval}
                onChange={(event) =>
                  setBillingInterval(event.target.value as BillingInterval)
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="monthly">Monthly</option>
                <option value="semiannual">Semiannual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
            const isCurrentPlan = normalizedPlanType === plan.id;
            const currentTier = normalizedPlanType
              ? PLAN_HIERARCHY[normalizedPlanType]
              : 0;
            const planTier = PLAN_HIERARCHY[plan.id];
            const isUpgrade = planTier > currentTier;
            const isDowngrade = planTier < currentTier;
            const estimate = getEstimatedPricing(
              plan.id,
              contractedHectares || getDefaultHectaresForPlan(plan.id),
              billingInterval,
            );

            return (
              <div
                key={plan.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border relative flex flex-col ${
                  plan.highlighted
                    ? 'border-green-500 ring-1 ring-green-500'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold rounded-full">
                    Current Plan
                  </div>
                )}

                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {plan.name}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 min-h-[40px]">
                  {plan.description}
                </p>

                <div className="mt-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {estimate.cycleTtc.toLocaleString()} MAD
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {estimate.cycleHt.toLocaleString()} HT + {estimate.cycleTva.toLocaleString()} TVA
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {plan.pricePerHaYearHt} MAD/ha/year (HT)
                  </p>
                </div>

                <button
                  onClick={() => purchasePlan.mutate(plan.id)}
                  disabled={(purchasePlan.isPending && selectedFormula === plan.id) || isCurrentPlan}
                  className={`w-full mt-5 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : plan.highlighted
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                  }`}
                >
                  {purchasePlan.isPending && selectedFormula === plan.id
                    ? t('subscription.processing', 'Processing...')
                    : isCurrentPlan
                      ? 'Current Plan'
                      : isUpgrade
                        ? 'Upgrade'
                        : isDowngrade
                          ? 'Downgrade'
                          : t('subscription.plans.getStarted', 'Get Started')}
                </button>

                <div className="mt-5 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <p>
                    Hectares:{' '}
                    {plan.limits.maxHectaresInclusive
                      ? `up to ${plan.limits.maxHectaresInclusive}`
                      : `>${plan.limits.minHectaresExclusive || 0}`}
                  </p>
                  <p>
                    Users:{' '}
                    {plan.limits.includedUsers === null
                      ? 'Unlimited'
                      : plan.limits.includedUsers}
                  </p>
                  <p>Support: {plan.supportLevel}</p>
                  <p>SLA: {plan.slaAvailable ? 'Included' : 'Not included'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const plan = normalizedPlanType ? SUBSCRIPTION_PLANS[normalizedPlanType] : null;
  const effectiveHectares = subscription?.contracted_hectares || contractedHectares;
  const effectiveCycle = normalizeBillingInterval(
    subscription?.billing_cycle || subscription?.billing_interval,
  );
  const pricingPreview = plan
    ? getEstimatedPricing(plan.id, effectiveHectares || getDefaultHectaresForPlan(plan.id), effectiveCycle)
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CreditCard className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('subscription.title', 'Subscription')}
          </h2>
        </div>

        <button
          onClick={() => setShowPlans(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          {t('subscription.changePlan', 'Change plan')}
        </button>
      </div>

      {subscription?.status === 'trialing' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                {t('subscription.trial.active', 'Trial active')}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {t('subscription.trial.description', {
                  endDate: subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString()
                    : 'N/A',
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Contract
          </h3>

          {plan && (
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {plan.name}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  {plan.description}
                </p>
              </div>

              {pricingPreview && (
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-green-600">
                    {pricingPreview.cycleTtc.toLocaleString()} MAD
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    HT: {pricingPreview.cycleHt.toLocaleString()} + TVA: {pricingPreview.cycleTva.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    Billed {effectiveCycle}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status</span>
                  <span className="font-medium capitalize text-gray-900 dark:text-white">
                    {subscription?.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Contracted hectares</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {subscription?.contracted_hectares ?? '-'} ha
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Included users</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {subscription?.included_users === null
                      ? 'Unlimited'
                      : subscription?.included_users ?? '-'}
                  </span>
                </div>
                {subscription?.contract_end_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Contract end</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(subscription.contract_end_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {subscription?.next_billing_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Next billing</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(subscription.next_billing_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Usage and Limits
          </h3>

          <div className="space-y-4">
            <UsageBar
              icon={<LandPlot className="h-5 w-5 text-gray-500" />}
              label="Hectares"
              current={usage?.hectares_count || 0}
              limit={subscription?.contracted_hectares || 0}
            />

            <UsageBar
              icon={<Users className="h-5 w-5 text-gray-500" />}
              label={t('subscription.usage.users', 'Users')}
              current={usage?.users_count || 0}
              limit={subscription?.included_users || 0}
              unlimited={subscription?.included_users === null}
            />

            <UsageBar
              icon={<Building2 className="h-5 w-5 text-gray-500" />}
              label={t('subscription.usage.farms', 'Farms')}
              current={usage?.farms_count || 0}
              limit={subscription?.max_farms || 0}
            />

            <UsageBar
              icon={<MapPin className="h-5 w-5 text-gray-500" />}
              label={t('subscription.usage.parcels', 'Parcels')}
              current={usage?.parcels_count || 0}
              limit={subscription?.max_parcels || 0}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Contract Timeline
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <TimelineItem
              icon={<Calendar className="h-4 w-4" />}
              label="Start"
              value={
                subscription?.contract_start_at
                  ? new Date(subscription.contract_start_at).toLocaleDateString()
                  : 'N/A'
              }
            />
            <TimelineItem
              icon={<Calendar className="h-4 w-4" />}
              label="End"
              value={
                subscription?.contract_end_at
                  ? new Date(subscription.contract_end_at).toLocaleDateString()
                  : 'N/A'
              }
            />
            <TimelineItem
              icon={<Calendar className="h-4 w-4" />}
              label="Renewal notice"
              value={`${subscription?.renewal_notice_days || 60} days before end`}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Billing Management
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Open checkout with your current contract context to update payment and invoice settings.
          </p>

          <button
            onClick={() => {
              const targetPlan = normalizedPlanType || 'standard';
              purchasePlan.mutate(targetPlan);
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            disabled={purchasePlan.isPending}
          >
            <span>
              {purchasePlan.isPending
                ? t('subscription.processing', 'Processing...')
                : 'Manage Billing'}
            </span>
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Add-ons
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {addonModules.map((module) => {
              const isActive = activeAddons.some(
                (addon) => addon.module_id === module.id,
              );
              return (
                <div
                  key={module.id}
                  className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {module.name}
                    </p>
                    <p className="text-xs text-gray-500">${module.priceMonthly || 0}/mo</p>
                  </div>
                  {isActive ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={() => purchaseAddon.mutate(module.id)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Buy
                    </button>
                  )}
                </div>
              );
            })}
            {addonModules.length === 0 && (
              <p className="text-sm text-gray-500">No addon modules configured.</p>
            )}
          </div>

          {coreModules.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Included core modules
              </h4>
              <div className="flex flex-wrap gap-2">
                {coreModules.map((module) => (
                  <span
                    key={module.slug}
                    className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700"
                  >
                    {module.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface UsageBarProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  limit: number;
  unlimited?: boolean;
}

const UsageBar: React.FC<UsageBarProps> = ({
  icon,
  label,
  current,
  limit,
  unlimited = false,
}) => {
  const hasLimit = !unlimited && limit > 0;
  const percentage = hasLimit ? (current / limit) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {current} / {unlimited ? '∞' : limit}
        </span>
      </div>

      {hasLimit && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              percentage >= 90
                ? 'bg-red-600'
                : percentage >= 70
                  ? 'bg-yellow-600'
                  : 'bg-green-600'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

const TimelineItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
    <div className="flex items-center gap-2 text-gray-500 mb-1">{icon}<span>{label}</span></div>
    <div className="font-medium text-gray-900 dark:text-white">{value}</div>
  </div>
);

export default SubscriptionSettings;
