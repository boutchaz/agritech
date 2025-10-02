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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../hooks/useSubscription';
import { SUBSCRIPTION_PLANS, type PlanType, getCheckoutUrl } from '../lib/polar';
import SubscriptionPlans from './SubscriptionPlans';
import { useAuth } from './MultiTenantAuthProvider';

const SubscriptionSettings: React.FC = () => {
  const { data: subscription, isLoading } = useSubscription();
  const { currentOrganization } = useAuth();
  const [showPlans, setShowPlans] = React.useState(false);

  // Query actual usage counts
  const { data: usage } = useQuery({
    queryKey: ['usage-counts', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null;

      // Get farms count
      const { count: farmsCount } = await supabase
        .from('farms')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id);

      // Get parcels count
      const { count: parcelsCount } = await supabase
        .from('parcels')
        .select('parcels.id, farms!inner(organization_id)', { count: 'exact', head: true })
        .eq('farms.organization_id', currentOrganization.id);

      // Get users count
      const { count: usersCount } = await supabase
        .from('organization_users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true);

      return {
        farms_count: farmsCount || 0,
        parcels_count: parcelsCount || 0,
        users_count: usersCount || 0,
        satellite_reports_count: 0, // TODO: Add if you have satellite reports table
      };
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30 * 1000, // 30 seconds
  });

  const handleSelectPlan = (planType: PlanType) => {
    if (planType === 'enterprise') {
      // Open contact form or email
      window.location.href = 'mailto:sales@agritech.com?subject=Enterprise Plan Inquiry';
      return;
    }

    try {
      // Get checkout URL and redirect
      const checkoutUrl = getCheckoutUrl(planType);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Failed to get checkout URL:', error);
      alert('Failed to start checkout process. Please check configuration.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (showPlans) {
    return (
      <div className="p-6">
        <button
          onClick={() => setShowPlans(false)}
          className="mb-6 text-green-600 hover:text-green-700 font-medium"
        >
          ← Back to Subscription Details
        </button>
        <SubscriptionPlans onSelectPlan={handleSelectPlan} />
      </div>
    );
  }

  const plan = subscription ? SUBSCRIPTION_PLANS[subscription.plan_type] : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CreditCard className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Subscription & Billing
          </h2>
        </div>

        <button
          onClick={() => setShowPlans(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Change Plan
        </button>
      </div>

      {subscription?.status === 'trialing' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                Trial Period Active
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Your trial ends on{' '}
                {subscription.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString()
                  : 'N/A'}
                . Upgrade to continue using premium features.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Plan
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

              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-green-600">{plan.price}</span>
                {plan.priceAmount > 0 && (
                  <span className="text-gray-600 dark:text-gray-400">/month</span>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Status:{' '}
                    <span className="font-medium capitalize">{subscription?.status}</span>
                  </span>
                </div>

                {subscription?.current_period_end && (
                  <div className="flex items-center space-x-2 text-sm mt-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Renews on:{' '}
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
            Usage & Limits
          </h3>

          <div className="space-y-4">
            <UsageBar
              icon={<Building2 className="h-5 w-5 text-gray-500" />}
              label="Farms"
              current={usage?.farms_count || 0}
              limit={subscription?.max_farms || 0}
            />

            <UsageBar
              icon={<MapPin className="h-5 w-5 text-gray-500" />}
              label="Parcels"
              current={usage?.parcels_count || 0}
              limit={subscription?.max_parcels || 0}
            />

            <UsageBar
              icon={<Users className="h-5 w-5 text-gray-500" />}
              label="Users"
              current={usage?.users_count || 0}
              limit={subscription?.max_users || 0}
            />

            {subscription && subscription.max_satellite_reports > 0 && (
              <UsageBar
                icon={<Satellite className="h-5 w-5 text-gray-500" />}
                label="Satellite Reports"
                current={usage?.satellite_reports_count || 0}
                limit={subscription.max_satellite_reports}
              />
            )}
          </div>
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Your Features
          </h3>

          {plan && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plan.features.map((feature, index) => (
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
            Billing Management
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Manage your payment methods, view invoices, and update billing information
            through our secure billing portal.
          </p>

          <a
            href={import.meta.env.VITE_POLAR_CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <span>Open Billing Portal</span>
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
