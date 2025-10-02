import { AlertTriangle, CreditCard, Lock } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from './MultiTenantAuthProvider';

interface SubscriptionRequiredProps {
  reason?: 'no_subscription' | 'expired' | 'canceled' | 'past_due';
  message?: string;
}

const SubscriptionRequired: React.FC<SubscriptionRequiredProps> = ({
  reason = 'no_subscription',
  message,
}) => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();

  const defaultMessages = {
    no_subscription: 'Your organization does not have an active subscription.',
    expired: 'Your subscription has expired.',
    canceled: 'Your subscription has been canceled.',
    past_due: 'Your subscription payment is past due.',
  };

  const displayMessage = message || defaultMessages[reason];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <div className="relative bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
                <Lock className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Subscription Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-2">{displayMessage}</p>
            {currentOrganization && (
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Organization: {currentOrganization.name}
              </p>
            )}
          </div>

          {/* Warning Box */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Access Restricted
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  To continue using the platform, please subscribe to one of our plans or contact
                  your organization administrator.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate({ to: '/settings/subscription' })}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <CreditCard className="h-5 w-5" />
              <span>View Subscription Plans</span>
            </button>

            <button
              onClick={() => navigate({ to: '/settings/organization' })}
              className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Organization Settings
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Need help? Contact your organization administrator or{' '}
              <a href="mailto:support@agritech.com" className="text-blue-600 hover:text-blue-700">
                support@agritech.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequired;
