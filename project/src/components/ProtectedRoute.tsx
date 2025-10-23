import React from 'react';
import { useAuth } from './MultiTenantAuthProvider';
import { useSubscription } from '../hooks/useSubscription';
import { isSubscriptionValid } from '../lib/polar';
import Auth from './Auth';
import SubscriptionRequired from './SubscriptionRequired';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireSubscription = true
}) => {
  const { user, loading, currentOrganization } = useAuth();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();

  // Show loading spinner while checking auth or subscription
  if (loading || (requireSubscription && subscriptionLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Check authentication first
  if (!user) {
    // Redirect to login page instead of showing inline auth form
    window.location.href = '/login';
    return null;
  }

  // Check subscription if required
  if (requireSubscription && currentOrganization) {
    const hasValidSubscription = isSubscriptionValid(subscription);

    if (!hasValidSubscription) {
      const reason = !subscription
        ? 'no_subscription'
        : subscription.status === 'canceled'
        ? 'canceled'
        : subscription.status === 'past_due'
        ? 'past_due'
        : 'expired';

      return <SubscriptionRequired reason={reason} />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute