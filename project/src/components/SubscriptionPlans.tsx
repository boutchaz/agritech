import {  useMemo, useState  } from "react";
import { Check, Building2, TrendingUp, Sprout } from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
  type PlanType,
  type BillingInterval,
  normalizePlanType,
  getDefaultHectaresForPlan,
  getEstimatedPricing,
} from '../lib/polar';
import { useSubscription } from '../hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface SubscriptionPlansProps {
  onSelectPlan: (
    planType: PlanType,
    billingInterval: BillingInterval,
    contractedHectares: number,
  ) => void;
}

const SubscriptionPlans = ({ onSelectPlan }: SubscriptionPlansProps) => {
  const { data: subscription } = useSubscription();
  const normalizedPlanType = normalizePlanType(
    subscription?.formula || subscription?.plan_type || null,
  );
  const { t } = useTranslation();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [contractedHectares, setContractedHectares] = useState<number>(
    subscription?.contracted_hectares || 50,
  );

  const getPlanIcon = (planType: PlanType) => {
    if (planType === 'starter') {
      return <Sprout className="h-8 w-8 text-green-600" />;
    }
    if (planType === 'standard') {
      return <TrendingUp className="h-8 w-8 text-blue-600" />;
    }
    if (planType === 'premium') {
      return <Building2 className="h-8 w-8 text-amber-600" />;
    }
    return <Building2 className="h-8 w-8 text-gray-800" />;
  };

  const intervalLabel = useMemo(() => {
    if (billingInterval === 'monthly') return 'month';
    if (billingInterval === 'semiannual') return 'semester';
    return 'year';
  }, [billingInterval]);

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {t('subscription.plans.title', 'Subscription Plans')}
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          {t(
            'subscription.plans.subtitle',
            'Choose a formula based on your hectares and required users.',
          )}
        </p>

        <div className="mb-4 flex items-center justify-center gap-3">
          <label htmlFor="contracted-hectares" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Contracted hectares
          </label>
          <input
            id="contracted-hectares"
            type="number"
            min={1}
            value={contractedHectares}
            onChange={(event) => setContractedHectares(Math.max(1, Number(event.target.value || 1)))}
            className="w-36 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
          <Button
            onClick={() => setBillingInterval('monthly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              billingInterval === 'monthly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Monthly
          </Button>
          <Button
            onClick={() => setBillingInterval('semiannual')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              billingInterval === 'semiannual'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Semiannual
          </Button>
          <Button
            onClick={() => setBillingInterval('annual')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              billingInterval === 'annual'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Annual
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 max-w-7xl mx-auto px-4">
        {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
          const isCurrentPlan = normalizedPlanType === plan.id;
          const estimate = getEstimatedPricing(
            plan.id,
            contractedHectares || getDefaultHectaresForPlan(plan.id),
            billingInterval,
          );

          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden ${
                plan.highlighted ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute top-0 left-0 bg-green-500 text-white px-4 py-1 text-xs font-semibold">
                  Current
                </div>
              )}

              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  {getPlanIcon(plan.id)}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                  {plan.description}
                </p>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${estimate.cycleTtc.toLocaleString()}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2 text-sm">
                    / {intervalLabel} TTC
                  </span>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    ${estimate.cycleHt.toLocaleString()} HT + ${estimate.cycleTva.toLocaleString()} TVA
                  </div>
                </div>

                <Button variant={!(isCurrentPlan) ? 'green' : undefined}
                  onClick={() => onSelectPlan(plan.id, billingInterval, contractedHectares)}
                  disabled={isCurrentPlan}
                  className={`w-full py-2.5 px-4 rounded-lg font-semibold transition-colors ${ isCurrentPlan ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : ''}`}
                >
                  {isCurrentPlan ? 'Current plan' : 'Select plan'}
                </Button>

                <div className="mt-6 space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start space-x-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
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
