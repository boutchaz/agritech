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
import { authSupabase } from '../lib/auth-supabase';
import { useSubscription } from '../hooks/useSubscription';
import { normalizePlanType } from '../lib/polar';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import { addonsApi } from '@/lib/api/addons';
import { subscriptionsService } from '@/services/subscriptionsService';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const SubscriptionSettings: React.FC = () => {
  const { data: subscription, isLoading } = useSubscription();
  const { currentOrganization } = useAuth();
  const { t } = useTranslation();
  const [showPlans, setShowPlans] = React.useState(false);
  const { data: moduleConfig } = useModuleConfig();

  // Query actual usage counts from NestJS API
  const { data: usage } = useQuery({
    queryKey: ['usage-counts', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null;

      const { data: { session } } = await authSupabase.auth.getSession();
      if (!session?.access_token) return null;

      const response = await fetch(`${apiUrl}/api/v1/subscriptions/usage`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-organization-id': currentOrganization.id,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch usage counts');
      }

      return response.json();
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
                  {moduleConfig?.pricing ? `$${moduleConfig.pricing.basePriceMonthly}` : '$0'}
                </span>
                {moduleConfig?.pricing && moduleConfig.pricing.basePriceMonthly > 0 && (
                  <span className="text-gray-600 dark:text-gray-400">{t('subscription.perMonth')}</span>
                )}
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

            {subscription && subscription.max_satellite_reports > 0 && (
              <UsageBar
                icon={<Satellite className="h-5 w-5 text-gray-500" />}
                label={t('subscription.usage.satelliteReports')}
                current={usage?.satellite_reports_count || 0}
                limit={subscription.max_satellite_reports}
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('subscription.billingManagement')}
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('subscription.billingDescription')}
          </p>

          <a
            href={import.meta.env.VITE_POLAR_CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <span>{t('subscription.openBillingPortal')}</span>
            <ExternalLink className="h-4 w-4" />
          </a>
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
