import React from 'react';
import { AlertTriangle, Zap } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useSubscription, useSubscriptionUsage } from '../hooks/useSubscription';

interface UsageLimitWarningProps {
  limitType: 'farms' | 'parcels' | 'users' | 'satelliteReports';
  onUpgrade?: () => void;
}

const UsageLimitWarning: React.FC<UsageLimitWarningProps> = ({ limitType, onUpgrade }) => {
  const { data: subscription } = useSubscription();
  const { data: usage } = useSubscriptionUsage();
  const navigate = useNavigate();

  if (!subscription || !usage) return null;

  const limitMapping = {
    farms: {
      current: usage.farms_count,
      max: subscription.max_farms,
      label: 'farms',
    },
    parcels: {
      current: usage.parcels_count,
      max: subscription.max_parcels,
      label: 'parcels',
    },
    users: {
      current: usage.users_count,
      max: subscription.max_users,
      label: 'users',
    },
    satelliteReports: {
      current: usage.satellite_reports_count,
      max: subscription.max_satellite_reports,
      label: 'satellite reports',
    },
  };

  const limit = limitMapping[limitType];
  const percentage = (limit.current / limit.max) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  if (!isNearLimit && !isAtLimit) return null;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate({ to: '/settings/subscription' });
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border ${
        isAtLimit
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      }`}
    >
      <div className="flex items-start space-x-3">
        <AlertTriangle
          className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
            isAtLimit
              ? 'text-red-600 dark:text-red-400'
              : 'text-yellow-600 dark:text-yellow-400'
          }`}
        />

        <div className="flex-1">
          <h4
            className={`font-medium ${
              isAtLimit
                ? 'text-red-900 dark:text-red-100'
                : 'text-yellow-900 dark:text-yellow-100'
            }`}
          >
            {isAtLimit ? 'Limit Reached' : 'Approaching Limit'}
          </h4>

          <p
            className={`text-sm mt-1 ${
              isAtLimit
                ? 'text-red-700 dark:text-red-300'
                : 'text-yellow-700 dark:text-yellow-300'
            }`}
          >
            You've used <strong>{limit.current}</strong> out of{' '}
            <strong>{limit.max}</strong> {limit.label} in your current plan.
            {isAtLimit
              ? ' You need to upgrade to add more.'
              : ' Consider upgrading to avoid interruptions.'}
          </p>

          <button
            onClick={handleUpgrade}
            className={`mt-3 inline-flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm ${
              isAtLimit
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Upgrade Plan</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsageLimitWarning;
