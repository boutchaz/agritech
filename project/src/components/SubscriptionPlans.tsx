import React from 'react';
import { Check, Zap, Building2, TrendingUp } from 'lucide-react';
import { SUBSCRIPTION_PLANS, type PlanType } from '../lib/polar';
import { useSubscription } from '../hooks/useSubscription';

interface SubscriptionPlansProps {
  onSelectPlan: (planType: PlanType) => void;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onSelectPlan }) => {
  const { data: subscription } = useSubscription();

  const getPlanIcon = (planType: PlanType) => {
    switch (planType) {
      case 'essential':
        return <Zap className="h-8 w-8 text-green-600" />;
      case 'professional':
        return <TrendingUp className="h-8 w-8 text-blue-600" />;
      case 'enterprise':
        return <Building2 className="h-8 w-8 text-purple-600" />;
    }
  };

  const getPlanColor = (planType: PlanType) => {
    switch (planType) {
      case 'essential':
        return 'green';
      case 'professional':
        return 'blue';
      case 'enterprise':
        return 'purple';
    }
  };

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Choose Your Plan
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Select the perfect plan for your agricultural operations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
        {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
          const color = getPlanColor(plan.id);
          const isCurrentPlan = subscription?.plan_type === plan.id;
          const isHighlighted = plan.highlighted;

          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden ${
                isHighlighted ? 'ring-2 ring-blue-500 scale-105' : ''
              }`}
            >
              {isHighlighted && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-sm font-semibold">
                  Most Popular
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute top-0 left-0 bg-green-500 text-white px-4 py-1 text-sm font-semibold">
                  Current Plan
                </div>
              )}

              <div className="p-8">
                <div className="flex items-center space-x-3 mb-4">
                  {getPlanIcon(plan.id)}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {plan.description}
                </p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {plan.price}
                  </span>
                  {plan.priceAmount > 0 && (
                    <span className="text-gray-600 dark:text-gray-400 ml-2">/month</span>
                  )}
                </div>

                <button
                  onClick={() => onSelectPlan(plan.id)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : `bg-${color}-600 hover:bg-${color}-700 text-white`
                  }`}
                >
                  {isCurrentPlan
                    ? 'Current Plan'
                    : plan.id === 'enterprise'
                    ? 'Contact Sales'
                    : 'Get Started'}
                </button>

                <div className="mt-8 space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Check className={`h-5 w-5 text-${color}-600 flex-shrink-0 mt-0.5`} />
                      <span className="text-gray-700 dark:text-gray-300 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionPlans;
