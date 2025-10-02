import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { useSubscription } from '../hooks/useSubscription';

export const Route = createFileRoute('/checkout-success')({
  component: CheckoutSuccess,
});

function CheckoutSuccess() {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const { data: subscription, refetch } = useSubscription();
  const [checkCount, setCheckCount] = useState(0);
  const [isActivating, setIsActivating] = useState(true);

  // Poll for subscription activation
  useEffect(() => {
    if (!currentOrganization) return;

    // Check every 2 seconds for up to 30 seconds
    const interval = setInterval(async () => {
      await refetch();
      setCheckCount((prev) => prev + 1);
    }, 2000);

    // Stop checking after 15 attempts (30 seconds)
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsActivating(false);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [currentOrganization, refetch]);

  // Check if subscription is active
  useEffect(() => {
    if (subscription?.status === 'active') {
      setIsActivating(false);
    }
  }, [subscription]);

  const handleContinue = () => {
    navigate({ to: '/dashboard' });
  };

  const handleViewSubscription = () => {
    navigate({ to: '/settings/subscription' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {isActivating ? (
              <div className="relative">
                <Loader2 className="h-20 w-20 text-green-600 animate-spin" />
                <CheckCircle className="h-20 w-20 text-green-600 absolute inset-0 opacity-20" />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full animate-ping" />
                <CheckCircle className="h-20 w-20 text-green-600 relative" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {isActivating ? 'Activating Your Subscription...' : 'Payment Successful!'}
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            {isActivating ? (
              <>
                We're setting up your subscription. This usually takes just a few seconds.
                <br />
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 block">
                  Checking status... ({checkCount}/15)
                </span>
              </>
            ) : subscription?.status === 'active' ? (
              <>
                Thank you for subscribing to {' '}
                <span className="font-semibold text-green-600 capitalize">
                  {subscription.plan_type} Plan
                </span>
                !<br />
                Your account has been upgraded and all features are now available.
              </>
            ) : (
              <>
                Your payment was successful! Your subscription is being processed and will be
                activated shortly.
                <br />
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 block">
                  If it doesn't activate automatically, please refresh the page or contact support.
                </span>
              </>
            )}
          </p>

          {/* Subscription Details */}
          {subscription && !isActivating && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-8 text-left">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Subscription Details
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {subscription.plan_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span
                    className={`font-medium capitalize ${
                      subscription.status === 'active'
                        ? 'text-green-600'
                        : 'text-yellow-600'
                    }`}
                  >
                    {subscription.status}
                  </span>
                </div>
                {subscription.current_period_end && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Renews on:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">Limits:</span>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {subscription.max_farms} farms • {subscription.max_parcels} parcels
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {subscription.max_users} team members
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleContinue}
              disabled={isActivating}
              className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isActivating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Please wait...
                </>
              ) : (
                <>
                  Continue to Dashboard
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </button>

            {!isActivating && (
              <button
                onClick={handleViewSubscription}
                className="inline-flex items-center justify-center px-6 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                View Subscription Details
              </button>
            )}
          </div>

          {/* Help Text */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">
            Need help?{' '}
            <a
              href="mailto:support@agritech.com"
              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 underline"
            >
              Contact Support
            </a>
          </p>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            A confirmation email has been sent to your email address.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CheckoutSuccess;
