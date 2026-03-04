import React from 'react';
import {
  CreditCard,
  Calendar,
  Users,
  MapPin,
  Building2,
  Satellite,
  AlertCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSubscription } from '../hooks/useSubscription';
import { SUBSCRIPTION_PLANS, type PlanType, normalizePlanType, type BillingInterval, PLAN_HIERARCHY } from '../lib/polar';
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
  const { data: moduleConfig } = useModuleConfig();
  const [selectedPlan, setSelectedPlan] = React.useState<PlanType | 'core' | null>(null);
  const [billingInterval, setBillingInterval] = React.useState<BillingInterval>('month');

  // Query actual usage counts from NestJS API
  const { data: usage } = useQuery({
    queryKey: ['usage-counts', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null;
      return subscriptionsService.getUsage(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30 * 1000, // 30 seconds
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
    mutationFn: async (planType: PlanType | 'core') => {
      if (!currentOrganization?.id) {
        throw new Error(t('subscription.errors.noOrganization'));
      }
      setSelectedPlan(planType);
      const { checkoutUrl } = await subscriptionsService.createCheckout(planType, currentOrganization.id, billingInterval);
      return checkoutUrl;
    },
    onSuccess: (checkoutUrl) => {
      window.location.href = checkoutUrl;
    },
    onError: (error: Error) => {
      toast.error(error.message || t('subscription.errors.checkoutFailed'));
      setSelectedPlan(null);
    },
  });

  const handlePurchaseCore = async () => {
    if (!currentOrganization?.id) {
      toast.error(t('subscription.errors.noOrganization'));
      return;
    }

    try {
      const { checkoutUrl } = await subscriptionsService.createCheckout('core', currentOrganization.id);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Failed to get checkout URL:', error);
      toast.error(t('subscription.errors.checkoutFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  const normalizedPlanType = normalizePlanType(subscription?.plan_type ?? null);
  const shouldShowPlans = showPlans || !normalizedPlanType;
  const coreModules = moduleConfig?.modules.filter((module) => module.isRequired) || [];
  const addonModules = moduleConfig?.modules.filter((module) => module.isAddonEligible) || [];

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

  if (shouldShowPlans) {
    return (
      <div className="p-6">
        {showPlans && (
          <button
            onClick={() => setShowPlans(false)}
            className="mb-6 text-green-600 hover:text-green-700 font-medium"
          >
            ← {t('subscription.backToDetails')}
          </button>
        )}
        <div className="space-y-6">
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex relative">
              <button
                onClick={() => setBillingInterval('month')}
                className={`relative z-10 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  billingInterval === 'month'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('year')}
                className={`relative z-10 px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${
                  billingInterval === 'year'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>Yearly</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full">
                  Save ~17%
                </span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
              const isCurrentPlan = normalizedPlanType === plan.id;
              const currentTier = normalizedPlanType ? PLAN_HIERARCHY[normalizedPlanType as keyof typeof PLAN_HIERARCHY] || 0 : 0;
              const planTier = PLAN_HIERARCHY[plan.id as keyof typeof PLAN_HIERARCHY] || 0;
              const isUpgrade = planTier > currentTier;
              const isDowngrade = planTier < currentTier;
              
              return (
              <div key={plan.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border ${plan.highlighted ? 'border-green-500 dark:border-green-500 ring-1 ring-green-500' : 'border-gray-200 dark:border-gray-700'} relative flex flex-col`}>
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold rounded-full">
                    Current Plan
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h4>
                  {plan.highlighted && !isCurrentPlan && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Popular</span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 min-h-[40px]">{plan.description}</p>
                <div className="flex items-baseline space-x-2 mb-6">
                  {plan.priceAmount === 0 ? (
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">Contact Us</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        ${billingInterval === 'year' ? plan.priceYearly : plan.priceAmount}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        /{billingInterval === 'year' ? 'year' : 'month'}
                      </span>
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => purchasePlan.mutate(plan.id)}
                  disabled={(purchasePlan.isPending && selectedPlan === plan.id) || isCurrentPlan}
                  className={`w-full px-4 py-2.5 rounded-lg font-medium transition-colors mb-6 ${
                    isCurrentPlan
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : plan.highlighted
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                  }`}
                >
                  {purchasePlan.isPending && selectedPlan === plan.id 
                    ? t('subscription.processing') 
                    : isCurrentPlan 
                    ? 'Current Plan' 
                    : plan.priceAmount === 0
                    ? 'Contact Sales'
                    : isUpgrade
                    ? 'Upgrade'
                    : isDowngrade
                    ? 'Downgrade'
                    : t('subscription.plans.getStarted')}
                </button>

                <div className="space-y-4 flex-grow">
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Limits</p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center justify-between">
                        <span>Farms</span>
                        <span className="font-medium text-gray-900 dark:text-white">{plan.limits.farms >= 999999 ? 'Unlimited' : plan.limits.farms}</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Parcels</span>
                        <span className="font-medium text-gray-900 dark:text-white">{plan.limits.parcels >= 999999 ? 'Unlimited' : plan.limits.parcels}</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Users</span>
                        <span className="font-medium text-gray-900 dark:text-white">{plan.limits.users >= 999999 ? 'Unlimited' : plan.limits.users}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Features</p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start space-x-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )})}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Core Plan</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Base subscription for required modules.
            </p>
            <div className="mt-4 flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-green-600">
                {moduleConfig?.pricing ? `$${moduleConfig.pricing.basePriceMonthly}` : '$0'}
              </span>
              <span className="text-gray-600 dark:text-gray-400">{t('subscription.perMonth')}</span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Included modules:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {coreModules.length === 0 && (
                  <span className="text-sm text-gray-500">No core modules configured.</span>
                )}
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

            {!subscription && (
              <button
                onClick={handlePurchaseCore}
                className="mt-6 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {t('subscription.plans.getStarted')}
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add-on Modules</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Purchase additional modules whenever you need more capabilities.
            </p>

            <div className="mt-4 space-y-3">
              {addonModules.map((module) => {
                const isActive = activeAddons.some((addon) => addon.module_id === module.id);
                const price = module.priceMonthly || 0;
                return (
                  <div
                    key={module.id}
                    className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{module.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{module.description}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        ${price}/mo
                      </span>
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
                  </div>
                );
              })}
              {addonModules.length === 0 && (
                <p className="text-sm text-gray-500">No addon modules configured.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const plan = normalizedPlanType ? { name: normalizedPlanType } : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CreditCard className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('subscription.title')}
          </h2>
        </div>

        <button
          onClick={() => setShowPlans(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          {t('subscription.changePlan')}
        </button>
      </div>

      {subscription?.status === 'trialing' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                {t('subscription.trial.active')}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {t('subscription.trial.description', {
                  endDate: subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString()
                    : 'N/A'
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('subscription.currentPlan')}
          </h3>

          {(plan || moduleConfig) && (
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {plan?.name ? `${plan.name} Plan` : 'Core Plan'}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  {moduleConfig?.pricing
                    ? `Base subscription for ${coreModules.length} required modules.`
                    : 'Base subscription for required modules.'}
                </p>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-green-600">
                  {plan ? (
                    subscription?.billing_interval === 'year' 
                      ? `$${Math.round((SUBSCRIPTION_PLANS[plan.name as keyof typeof SUBSCRIPTION_PLANS]?.priceYearly || 0) / 12)}`
                      : `$${SUBSCRIPTION_PLANS[plan.name as keyof typeof SUBSCRIPTION_PLANS]?.priceAmount || 0}`
                  ) : (
                    moduleConfig?.pricing ? `$${moduleConfig.pricing.basePriceMonthly}` : '$0'
                  )}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {t('subscription.perMonth')}
                  {subscription?.billing_interval === 'year' && ' (Billed yearly)'}
                </span>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t('subscription.status')}:{' '}
                    <span className="font-medium capitalize">{t(`subscription.statuses.${subscription?.status || 'unknown'}`)}</span>
                  </span>
                </div>

                {subscription?.current_period_end && (
                  <div className="flex items-center space-x-2 text-sm mt-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {t('subscription.renewsOn')}:{' '}
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Usage Limits */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('subscription.usageAndLimits')}
          </h3>

          <div className="space-y-4">
            <UsageBar
              icon={<Building2 className="h-5 w-5 text-gray-500" />}
              label={t('subscription.usage.farms')}
              current={usage?.farms_count || 0}
              limit={subscription?.max_farms || 0}
            />

            <UsageBar
              icon={<MapPin className="h-5 w-5 text-gray-500" />}
              label={t('subscription.usage.parcels')}
              current={usage?.parcels_count || 0}
              limit={subscription?.max_parcels || 0}
            />

            <UsageBar
              icon={<Users className="h-5 w-5 text-gray-500" />}
              label={t('subscription.usage.users')}
              current={usage?.users_count || 0}
              limit={subscription?.max_users || 0}
            />

            {subscription && (subscription.max_satellite_reports ?? 0) > 0 && (
              <UsageBar
                icon={<Satellite className="h-5 w-5 text-gray-500" />}
                label={t('subscription.usage.satelliteReports')}
                current={usage?.satellite_reports_count || 0}
                limit={subscription.max_satellite_reports ?? 0}
              />
            )}
          </div>
        </div>

        {/* Addons */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Add-ons
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {addonModules.map((module) => {
              const isActive = activeAddons.some((addon) => addon.module_id === module.id);
              return (
                <div
                  key={module.id}
                  className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{module.name}</p>
                    <p className="text-xs text-gray-500">${module.priceMonthly || 0}/mo</p>
                  </div>
                  {isActive ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
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
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('subscription.features')}
          </h3>

          {(moduleConfig || plan) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(coreModules.length > 0 ? coreModules.map((module) => module.name) : []).map((feature, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="mt-1 h-2 w-2 rounded-full bg-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Billing Portal */}
        {subscription && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('subscription.billingManagement')}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('subscription.billingDescription')}
            </p>

          <button
            onClick={() => purchasePlan.mutate(normalizedPlanType || 'professional')}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            disabled={purchasePlan.isPending}
          >
            <span>{purchasePlan.isPending ? t('subscription.processing') : 'Manage Billing'}</span>
            <ExternalLink className="h-4 w-4" />
          </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface UsageBarProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  limit: number;
}

const UsageBar: React.FC<UsageBarProps> = ({ icon, label, current, limit }) => {
  const percentage = limit > 0 ? (current / limit) * 100 : 0;
  const isUnlimited = limit >= 999999;

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
          {current} / {isUnlimited ? '∞' : limit}
        </span>
      </div>

      {!isUnlimited && (
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

export default SubscriptionSettings;
