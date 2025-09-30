import React from 'react';
import { AlertTriangle, Zap, X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useSubscription } from '../hooks/useSubscription';

const SubscriptionBanner: React.FC = () => {
  const { data: subscription } = useSubscription();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = React.useState(false);

  if (!subscription || dismissed) return null;

  const isTrialing = subscription.status === 'trialing';
  const isPastDue = subscription.status === 'past_due';
  const isCanceled = subscription.status === 'canceled';

  // Calculate days remaining for trial
  const daysRemaining = subscription.current_period_end
    ? Math.ceil(
        (new Date(subscription.current_period_end).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  if (!isTrialing && !isPastDue && !isCanceled) return null;

  return (
    <div
      className={`relative ${
        isTrialing
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      } border-b px-4 py-3`}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          {isTrialing ? (
            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          )}

          <div>
            {isTrialing && (
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                You're on a trial period.{' '}
                {daysRemaining > 0 ? (
                  <>
                    <span className="font-bold">{daysRemaining} days</span> remaining.
                  </>
                ) : (
                  <span className="font-bold">Trial ending soon!</span>
                )}
              </p>
            )}

            {isPastDue && (
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Your subscription payment is past due. Please update your payment method.
              </p>
            )}

            {isCanceled && (
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Your subscription has been canceled. Reactivate to continue using premium
                features.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate({ to: '/settings/subscription' })}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              isTrialing
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            {isTrialing ? 'Upgrade Now' : 'Manage Subscription'}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBanner;
