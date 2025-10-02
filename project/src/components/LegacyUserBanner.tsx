import { Info, Sparkles, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from './MultiTenantAuthProvider';
import { useSubscription } from '../hooks/useSubscription';

const LegacyUserBanner = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const { data: subscription } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // This banner is disabled - all users require subscriptions
  // Keeping the component for potential future use
  return null;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-purple-200 dark:border-purple-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="relative">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                  Welcome back, valued user! 🎉
                </p>
                <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs font-medium rounded-full">
                  Legacy Access
                </span>
              </div>
              <p className="text-sm text-purple-800 dark:text-purple-200 mt-0.5">
                You have unlimited access as an existing customer. Consider upgrading to unlock
                premium features and support our platform!
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => navigate({ to: '/settings/subscription' })}
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm hover:shadow-md flex items-center space-x-1"
            >
              <Sparkles className="h-4 w-4" />
              <span>View Plans</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegacyUserBanner;
