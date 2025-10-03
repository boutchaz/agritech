import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useSubscription } from '../../hooks/useSubscription';
import { getRemainingCount } from '../../lib/casl/ability';

interface LimitWarningProps {
  resourceType: 'farms' | 'parcels' | 'users' | 'satelliteReports';
  currentCount: number;
  className?: string;
}

const resourceLabels = {
  farms: 'farms',
  parcels: 'parcels',
  users: 'users',
  satelliteReports: 'satellite reports',
};

/**
 * Component to show warning when approaching or at subscription limit
 */
export const LimitWarning: React.FC<LimitWarningProps> = ({
  resourceType,
  currentCount,
  className = '',
}) => {
  const navigate = useNavigate();
  const { data: subscription } = useSubscription();

  if (!subscription) return null;

  const remaining = getRemainingCount(subscription, currentCount, resourceType);

  // Unlimited (Enterprise)
  if (remaining === null) return null;

  // At limit
  if (remaining === 0) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-red-900 dark:text-red-100">
              {resourceLabels[resourceType]} limit reached
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              You've reached your plan limit of {currentCount} {resourceLabels[resourceType]}.
              Upgrade your plan to add more.
            </p>
            <button
              onClick={() => navigate({ to: '/settings/subscription' })}
              className="mt-3 inline-flex items-center text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Upgrade Plan
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Close to limit (less than 10% remaining or less than 2)
  const limit = currentCount + remaining;
  const percentRemaining = (remaining / limit) * 100;
  const isClose = percentRemaining <= 10 || remaining <= 2;

  if (!isClose) return null;

  return (
    <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium text-yellow-900 dark:text-yellow-100">
            Approaching {resourceLabels[resourceType]} limit
            </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            You have {remaining} {resourceLabels[resourceType]} remaining out of {limit}.
            Consider upgrading your plan soon.
          </p>
          <button
            onClick={() => navigate({ to: '/settings/subscription' })}
            className="mt-3 inline-flex items-center text-sm font-medium text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300"
          >
            View Plans
            <ArrowRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LimitWarning;
