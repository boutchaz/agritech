import React from 'react';
import { Lock, Zap } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useSubscription } from '../hooks/useSubscription';
import { canAccessFeature } from '../lib/polar';
import { Button } from '@/components/ui/button';

interface FeatureGateProps {
  feature: 'analytics' | 'sensorIntegration' | 'aiRecommendations' | 'advancedReporting' | 'apiAccess' | 'prioritySupport';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children, fallback }) => {
  const { data: subscription } = useSubscription();
  const navigate = useNavigate();

  // Use centralized canAccessFeature from lib/polar
  const hasAccess = canAccessFeature(subscription, feature);

  if (!hasAccess) {
    return fallback || <FeatureLockedMessage onUpgrade={() => navigate({ to: '/settings/subscription' })} />;
  }

  return <>{children}</>;
};

interface FeatureLockedMessageProps {
  onUpgrade: () => void;
}

const FeatureLockedMessage: React.FC<FeatureLockedMessageProps> = ({ onUpgrade }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
      <Lock className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Premium Feature
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
        This feature is available on Professional and Enterprise plans.
      </p>
      <Button variant="green" onClick={onUpgrade} className="flex items-center space-x-2 px-6 py-3 rounded-md font-medium" >
        <Zap className="h-5 w-5" />
        <span>Upgrade Now</span>
      </Button>
    </div>
  );
};

export default FeatureGate;
