import React, { useState } from 'react';
import { Check, Zap, Building2, TrendingUp } from 'lucide-react';
import { SUBSCRIPTION_PLANS, type PlanType, type BillingInterval, normalizePlanType } from '../lib/polar';
import { useSubscription } from '../hooks/useSubscription';
import { useTranslation } from 'react-i18next';

interface SubscriptionPlansProps {
  onSelectPlan: (planType: PlanType, billingInterval: BillingInterval) => void;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onSelectPlan }) => {
  const { data: subscription } = useSubscription();
  const normalizedPlanType = normalizePlanType(subscription?.plan_type ?? null);
  const { t } = useTranslation();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');

  const isYearly = billingInterval === 'year';

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

  const getDisplayPrice = (plan: (typeof SUBSCRIPTION_PLANS)[PlanType]) => {
    if (plan.priceAmount === 0) return plan.price;
    if (isYearly) {
      const monthlyEquiv = Math.round(plan.priceYearlyAmount / 12);
      return `$${monthlyEquiv}`;
    }
    return plan.price;
  };

  const getSavingsPercent = (plan: (typeof SUBSCRIPTION_PLANS)[PlanType]) => {
    if (plan.priceAmount === 0 || plan.priceYearlyAmount === 0) return 0;
    const monthlyTotal = plan.priceAmount * 12;
    return Math.round(((monthlyTotal - plan.priceYearlyAmount) / monthlyTotal) * 100);
  };

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {t('subscription.plans.title')}
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          {t('subscription.plans.subtitle')}
        </p>

        {/* Billing interval toggle */}
        <div className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
          <button
            onClick={() => setBillingInterval('month')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              !isYearly
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t('subscription.billing.monthly', 'Monthly')}
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              isYearly
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t('subscription.billing.yearly', 'Yearly')}
            <span className="ml-1.5 inline-block rounded-full bg-green-100 dark:bg-green-900 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300">
              {t('subscription.billing.save', 'Save {{percent}}%', { percent: 17 })}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
        {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
          const color = getPlanColor(plan.id);
          const isCurrentPlan = normalizedPlanType === plan.id;
          const isHighlighted = plan.highlighted;
          const savings = getSavingsPercent(plan);

          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden ${
                isHighlighted ? 'ring-2 ring-blue-500 scale-105' : ''
              }`}
            >
              {isHighlighted && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-sm font-semibold">
                  {t('subscription.plans.mostPopular')}
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute top-0 left-0 bg-green-500 text-white px-4 py-1 text-sm font-semibold">
                  {t('subscription.plans.currentPlan')}
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
                    {getDisplayPrice(plan)}
                  </span>
                  {plan.priceAmount > 0 && (
                    <span className="text-gray-600 dark:text-gray-400 ml-2">
                      {t('subscription.perMonth')}
                    </span>
                  )}
                  {isYearly && plan.priceYearlyAmount > 0 && (
                    <div className="mt-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ${plan.priceYearlyAmount}{t('subscription.billing.perYear', '/year')}
                      </span>
                      {savings > 0 && (
                        <span className="ml-2 text-sm font-medium text-green-600 dark:text-green-400">
                          {t('subscription.billing.save', 'Save {{percent}}%', { percent: savings })}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onSelectPlan(plan.id, billingInterval)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : `bg-${color}-600 hover:bg-${color}-700 text-white`
                  }`}
                >
                  {isCurrentPlan
                    ? t('subscription.plans.currentPlan')
                    : plan.id === 'enterprise'
                    ? t('subscription.plans.contactSales')
                    : t('subscription.plans.getStarted')}
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
