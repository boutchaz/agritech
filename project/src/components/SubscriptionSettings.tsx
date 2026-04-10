import React from 'react';
import {
  CreditCard,
  Calendar,
  Users,
  MapPin,
  Building2,
  AlertCircle,
  ExternalLink,
  Loader2,
  LandPlot,
  RefreshCw,
  Zap,
  Package,
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSubscription } from '../hooks/useSubscription';
import {
  SUBSCRIPTION_PLANS,
  type PlanType,
  normalizePlanType,
  type BillingInterval,
  type BackendBillingInterval,
  PLAN_HIERARCHY,
  normalizeBillingInterval,
  getEstimatedPricing,
  getDefaultHectaresForPlan,
  BASE_MODULE_IDS,
  ERP_MODULES,
  DEFAULT_DISCOUNT_PERCENT,
  computeModularQuote,
} from '../lib/polar';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import { addonsApi } from '@/lib/api/addons';
import { subscriptionsService } from '@/services/subscriptionsService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import SubscriptionModulePicker from './subscription/SubscriptionModulePicker';
import HectarePricingCalculator from './subscription/HectarePricingCalculator';
import SubscriptionQuoteSummary from './subscription/SubscriptionQuoteSummary';

const SubscriptionSettings = () => {
  const { data: subscription, isLoading } = useSubscription();
  const { currentOrganization } = useAuth();
  const { t } = useTranslation();
  const { data: moduleConfig } = useModuleConfig();

  const [showPlans, setShowPlans] = React.useState(false);
  const [selectedFormula, setSelectedFormula] = React.useState<PlanType | null>(null);
  const [billingInterval, setBillingInterval] = React.useState<BillingInterval>(
    normalizeBillingInterval(subscription?.billing_cycle as BackendBillingInterval | null | undefined),
  );
  const [contractedHectares, setContractedHectares] = React.useState<number>(
    subscription?.contracted_hectares || 50,
  );

  const [showModularPicker, setShowModularPicker] = React.useState(false);
  const [selectedModules, setSelectedModules] = React.useState<string[]>(BASE_MODULE_IDS);
  const [modularHectares, setModularHectares] = React.useState<number>(
    subscription?.contracted_hectares || 50,
  );
  const [modularBillingCycle, setModularBillingCycle] = React.useState<BillingInterval>(
    normalizeBillingInterval(subscription?.billing_cycle as BackendBillingInterval | null | undefined),
  );

  const normalizedPlanType = normalizePlanType(
    subscription?.formula || subscription?.plan_type || null,
  );

  const isModular = !!(
    subscription?.selected_modules &&
    Array.isArray(subscription.selected_modules) &&
    subscription.selected_modules.length > 0
  );
  const hasSubscription = !!normalizedPlanType || isModular;

  React.useEffect(() => {
    if (subscription?.contracted_hectares) {
      setContractedHectares(subscription.contracted_hectares);
      setModularHectares(subscription.contracted_hectares);
    }

    if (subscription?.billing_cycle || subscription?.billing_interval) {
      const cycle = normalizeBillingInterval(
        (subscription.billing_cycle || subscription.billing_interval) as BackendBillingInterval | null | undefined,
      );
      setBillingInterval(cycle);
      setModularBillingCycle(cycle);
    }
  }, [subscription?.billing_cycle, subscription?.billing_interval, subscription?.contracted_hectares]);

  React.useEffect(() => {
    if (subscription?.selected_modules && Array.isArray(subscription.selected_modules)) {
      const moduleIds = subscription.selected_modules.map(
        (m: { id: string; name: string; pricePerMonth: number }) => m.id,
      );
      if (moduleIds.length > 0) {
        setSelectedModules(moduleIds);
      }
    }
  }, [subscription?.selected_modules]);

  const { data: usage } = useQuery({
    queryKey: ['usage-counts', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null;
      return subscriptionsService.getUsage(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30 * 1000,
  });

  const purchaseAddon = useMutation({
    mutationFn: async (moduleId: string) => {
      if (!currentOrganization?.id) {
        throw new Error(t('subscription.errors.noOrganization'));
      }
      return addonsApi.purchase(currentOrganization.id, { module_id: moduleId });
    },
    onSuccess: (result) => {
      window.location.href = result.checkout_url;
    },
    onError: (error: Error) => {
      toast.error(error.message || t('subscription.errors.checkoutFailed'));
    },
  });

  const purchasePlan = useMutation({
    mutationFn: async (formula: PlanType) => {
      if (!currentOrganization?.id) {
        throw new Error(t('subscription.errors.noOrganization'));
      }

      setSelectedFormula(formula);
      const { checkoutUrl } = await subscriptionsService.createCheckout(
        formula,
        contractedHectares,
        currentOrganization.id,
        billingInterval,
      );
      return checkoutUrl;
    },
    onSuccess: (checkoutUrl) => {
      window.location.href = checkoutUrl;
    },
    onError: (error: Error) => {
      toast.error(error.message || t('subscription.errors.checkoutFailed'));
      setSelectedFormula(null);
    },
  });

  const modularCheckout = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error(t('subscription.errors.noOrganization'));
      }
      const { checkoutUrl } = await subscriptionsService.createModularCheckout(
        selectedModules,
        modularHectares,
        modularBillingCycle,
        currentOrganization.id,
      );
      return checkoutUrl;
    },
    onSuccess: (checkoutUrl) => {
      window.location.href = checkoutUrl;
    },
    onError: (error: Error) => {
      toast.error(error.message || t('subscription.errors.checkoutFailed'));
    },
  });

  const coreModules =
    moduleConfig?.modules.filter((module) => module.isRequired) || [];
  const addonModules =
    moduleConfig?.modules.filter((module) => module.isAddonEligible) || [];

  const addonsOverviewQuery = useQuery({
    queryKey: ['addons-overview', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return null;
      return addonsApi.getOverview(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60 * 1000,
  });

  const activeAddons = addonsOverviewQuery.data?.active_addons || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!hasSubscription || showModularPicker) {
    return (
      <div className="min-w-0 max-w-full space-y-8 overflow-x-hidden p-4 animate-in fade-in duration-500 sm:p-8">
        <div className="flex flex-col gap-6 border-b border-slate-100 pb-8 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-2xl bg-emerald-50 p-2.5 dark:bg-emerald-900/30">
                <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="break-words text-2xl font-bold uppercase tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {t('subscription.modular.title', 'Choose Your Modules')}
              </h2>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('subscription.modular.subtitle', 'Select the ERP modules and hectares for your farm')}
            </p>
          </div>
          {showModularPicker && hasSubscription && (
            <Button
              variant="ghost"
              onClick={() => setShowModularPicker(false)}
              className="text-slate-500 hover:text-slate-700 font-medium"
            >
              {t('subscription.backToDetails', 'Back to details')}
            </Button>
          )}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-5">
            <SubscriptionModulePicker
              selectedModules={selectedModules}
              onChange={setSelectedModules}
            />
          </div>

          <div className="min-w-0 lg:col-span-3">
            <HectarePricingCalculator
              hectares={modularHectares}
              onChange={setModularHectares}
            />
          </div>

          <div className="min-w-0 lg:col-span-4">
            <SubscriptionQuoteSummary
              selectedModules={selectedModules}
              hectares={modularHectares}
              billingCycle={modularBillingCycle}
              onBillingCycleChange={setModularBillingCycle}
              onCheckout={() => modularCheckout.mutate()}
              isLoading={modularCheckout.isPending}
            />
          </div>
        </div>
      </div>
    );
  }

  const shouldShowLegacyPlans = showPlans && !isModular;

  if (shouldShowLegacyPlans) {
    return (
      <div className="p-6 space-y-6">
        <Button
          onClick={() => setShowPlans(false)}
          className="text-green-600 hover:text-green-700 font-medium"
        >
          ← {t('subscription.backToDetails', 'Back to details')}
        </Button>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('subscription.contractInputs')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('subscription.contractedHectares')}
              </span>
              <input
                type="number"
                min={1}
                value={contractedHectares}
                onChange={(event) =>
                  setContractedHectares(Math.max(1, Number(event.target.value || 1)))
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <span className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('subscription.billingCycle')}
              </span>
              <select
                value={billingInterval}
                onChange={(event) =>
                  setBillingInterval(event.target.value as BillingInterval)
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="monthly">{t('subscription.billingCycles.monthly')}</option>
                <option value="semiannual">{t('subscription.billingCycles.semiannual')}</option>
                <option value="annual">{t('subscription.billingCycles.annual')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
            const isCurrentPlan = normalizedPlanType === plan.id;
            const currentTier = normalizedPlanType
              ? PLAN_HIERARCHY[normalizedPlanType]
              : 0;
            const planTier = PLAN_HIERARCHY[plan.id];
            const isUpgrade = planTier > currentTier;
            const isDowngrade = planTier < currentTier;
            const estimate = getEstimatedPricing(
              plan.id,
              contractedHectares || getDefaultHectaresForPlan(plan.id),
              billingInterval,
            );

            return (
              <div
                key={plan.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border relative flex flex-col ${
                  plan.highlighted
                    ? 'border-green-500 ring-1 ring-green-500'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold rounded-full">
                    {t('subscription.plans.currentPlan')}
                  </div>
                )}

                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {plan.name}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 min-h-[40px]">
                  {plan.description}
                </p>

                <div className="mt-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {estimate.cycleTtc.toLocaleString()} MAD
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {estimate.cycleHt.toLocaleString()} HT + {estimate.cycleTva.toLocaleString()} TVA
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {plan.pricePerHaYearHt} MAD/ha/year (HT)
                  </p>
                </div>

                <Button
                  onClick={() => purchasePlan.mutate(plan.id)}
                  disabled={(purchasePlan.isPending && selectedFormula === plan.id) || isCurrentPlan}
                  className={`w-full mt-5 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : plan.highlighted
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                  }`}
                >
                  {purchasePlan.isPending && selectedFormula === plan.id
                    ? t('subscription.processing', 'Processing...')
                    : isCurrentPlan
                      ? t('subscription.plans.currentPlan')
                      : isUpgrade
                        ? t('subscription.plans.upgrade')
                        : isDowngrade
                          ? t('subscription.plans.downgrade')
                          : t('subscription.plans.getStarted')}
                </Button>

                <div className="mt-5 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <p>
                    {t('subscription.plans.hectares')}:{' '}
                    {plan.limits.maxHectaresInclusive
                      ? t('subscription.plans.hectaresUpTo', { max: plan.limits.maxHectaresInclusive })
                      : t('subscription.plans.hectaresAbove', { min: plan.limits.minHectaresExclusive || 0 })}
                  </p>
                  <p>
                    {t('subscription.plans.users')}:{' '}
                    {plan.limits.includedUsers === null
                      ? t('subscription.details.unlimited')
                      : plan.limits.includedUsers}
                  </p>
                  <p>{t('subscription.plans.support')}: {plan.supportLevel}</p>
                  <p>{t('subscription.plans.sla')}: {plan.slaAvailable ? t('subscription.plans.slaIncluded') : t('subscription.plans.slaNotIncluded')}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const plan = normalizedPlanType ? SUBSCRIPTION_PLANS[normalizedPlanType] : null;
  const effectiveHectares = subscription?.contracted_hectares || contractedHectares;
  const effectiveCycle = normalizeBillingInterval(
    (subscription?.billing_cycle || subscription?.billing_interval) as BackendBillingInterval | null | undefined,
  );
  const pricingPreview = plan
    ? getEstimatedPricing(plan.id, effectiveHectares || getDefaultHectaresForPlan(plan.id), effectiveCycle)
    : null;

  const modularPricing = isModular
    ? computeModularQuote({
        selectedModules: subscription!.selected_modules!.map((m: { id: string }) => m.id),
        hectares: effectiveHectares,
        billingCycle: effectiveCycle,
        discountPercent: subscription!.discount_pct ?? DEFAULT_DISCOUNT_PERCENT,
      })
    : null;

  return (
    <div className="min-w-0 max-w-full space-y-8 overflow-x-hidden p-4 animate-in fade-in duration-500 sm:p-8">
      <div className="flex flex-col gap-6 border-b border-slate-100 pb-8 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-2xl bg-emerald-50 p-2.5 dark:bg-emerald-900/30">
              <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="break-words text-2xl font-bold uppercase tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {t('subscription.title', 'Subscription')}
            </h2>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t('subscription.subtitle', 'Manage your plan, billing cycle and usage limits')}
          </p>
        </div>

        <div className="flex gap-3">
          {isModular ? (
            <Button
              variant="default"
              onClick={() => setShowModularPicker(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-widest h-12 px-8 rounded-2xl shadow-lg shadow-emerald-100 dark:shadow-none transition-all duration-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('subscription.modular.changeModules', 'Change modules')}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setShowModularPicker(true)}
                className="h-12 px-6 rounded-2xl font-semibold text-xs uppercase tracking-widest border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-all duration-300"
              >
                <Package className="h-4 w-4 mr-2" />
                {t('subscription.modular.switchToModular', 'Switch to modular')}
              </Button>
              <Button
                variant="default"
                onClick={() => setShowPlans(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-widest h-12 px-8 rounded-2xl shadow-lg shadow-emerald-100 dark:shadow-none transition-all duration-300"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('subscription.changePlan', 'Change plan')}
              </Button>
            </>
          )}
        </div>
      </div>

      {subscription?.status === 'trialing' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-800/50 flex items-start gap-5">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none">
            <AlertCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-tight">
              {t('subscription.trial.active', 'Trial Period Active')}
            </h3>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mt-1">
              {t('subscription.trial.description', {
                endDate: subscription.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString()
                  : 'N/A',
              })}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
          {isModular && subscription?.selected_modules ? (
            <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                    <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white uppercase tracking-tight">
                    {t('subscription.modular.activeModules', 'Active Modules')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <div className="space-y-6">
                  {modularPricing && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                            {t('subscription.modular.customPlan', 'Custom Plan')}
                          </h3>
                          <Badge className="bg-emerald-500 text-white border-none font-semibold text-[8px] tracking-widest uppercase py-0.5">ACTIVE</Badge>
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          {subscription.selected_modules.length} {t('subscription.modular.modulesLabel', 'modules')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                          {modularPricing.cycleTtc.toLocaleString()} <span className="text-sm font-bold">MAD</span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">
                          {t('subscription.billedCycle', {
                            cycle: t(`subscription.billingCycles.${effectiveCycle}`),
                            defaultValue: `Billed ${effectiveCycle}`,
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {subscription.selected_modules.map(
                      (mod: { id: string; name: string; pricePerMonth: number }) => {
                        const moduleDef = ERP_MODULES.find((m) => m.id === mod.id);
                        const isBase = moduleDef?.isBase ?? false;
                        return (
                          <Badge
                            key={mod.id}
                            className={cn(
                              'px-4 py-1.5 font-semibold text-[9px] tracking-widest uppercase border-none',
                              isBase
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
                            )}
                          >
                            {mod.name}
                          </Badge>
                        );
                      },
                    )}
                  </div>

                  {modularPricing && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                      <PricingLine
                        label={t('subscription.modular.erpMonthly', 'ERP/mo')}
                        value={`${modularPricing.erpMonthly.toLocaleString()} DH`}
                      />
                      <PricingLine
                        label={t('subscription.modular.haAnnual', 'Ha/an')}
                        value={`${modularPricing.haAnnual.toLocaleString()} DH`}
                      />
                      <PricingLine
                        label={`-${modularPricing.discountPercent}%`}
                        value={`-${modularPricing.discountAmount.toLocaleString()} DH`}
                        valueColor="text-emerald-600"
                      />
                      <PricingLine
                        label={t('subscription.modular.annualHt', 'Annual HT')}
                        value={`${modularPricing.annualHt.toLocaleString()} DH`}
                        bold
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : plan ? (
            <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                    <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white uppercase tracking-tight">
                    {t('subscription.currentContract')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                          {plan.name}
                        </h3>
                        <Badge className="bg-emerald-500 text-white border-none font-semibold text-[8px] tracking-widest uppercase py-0.5">ACTIVE</Badge>
                      </div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {plan.description}
                      </p>
                    </div>
                    {pricingPreview && (
                      <div className="text-right">
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                          {pricingPreview.cycleTtc.toLocaleString()} <span className="text-sm font-bold">MAD</span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">
                          {t('subscription.billedCycle', { cycle: t(`subscription.billingCycles.${effectiveCycle}`) })}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 pt-4 border-t border-slate-50 dark:border-slate-800">
                    {[
                      { label: t('subscription.details.status'), value: subscription?.status, color: 'text-emerald-600' },
                      { label: t('subscription.details.contractedHectares'), value: `${subscription?.contracted_hectares ?? '-'} HA` },
                      { label: t('subscription.details.includedUsers'), value: subscription?.included_users === null ? t('subscription.details.unlimited') : subscription?.included_users ?? '-' },
                      { label: t('subscription.details.nextBilling'), value: subscription?.next_billing_at ? new Date(subscription.next_billing_at).toLocaleDateString() : '-' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between group">
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">{item.label}</span>
                        <span className={cn("text-xs font-semibold uppercase tracking-tight", item.color || "text-slate-700 dark:text-slate-300")}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white uppercase tracking-tight">
                  {t('subscription.contractTimeline')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <TimelineItem
                  icon={<Calendar className="h-4 w-4" />}
                  label={t('subscription.timeline.start')}
                  value={
                    subscription?.contract_start_at
                      ? new Date(subscription.contract_start_at).toLocaleDateString()
                      : 'N/A'
                  }
                />
                <TimelineItem
                  icon={<Calendar className="h-4 w-4" />}
                  label={t('subscription.timeline.end')}
                  value={
                    subscription?.contract_end_at
                      ? new Date(subscription.contract_end_at).toLocaleDateString()
                      : 'N/A'
                  }
                />
                <TimelineItem
                  icon={<AlertCircle className="h-4 w-4" />}
                  label="Notice Period"
                  value={t('subscription.timeline.daysBeforeEnd', { days: subscription?.renewal_notice_days || 60 })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden h-full">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                  <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white uppercase tracking-tight">
                  {t('subscription.usageLimits')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-8">
              <UsageBar
                icon={<LandPlot className="h-4 w-4 text-slate-400" />}
                label={t('subscription.plans.hectares')}
                current={usage?.hectares_count || 0}
                limit={subscription?.contracted_hectares || 0}
                color="emerald"
              />

              <UsageBar
                icon={<Users className="h-4 w-4 text-slate-400" />}
                label={t('subscription.usage.users', 'Users')}
                current={usage?.users_count || 0}
                limit={subscription?.included_users || 0}
                unlimited={subscription?.included_users === null}
                color="blue"
              />

              <UsageBar
                icon={<Building2 className="h-4 w-4 text-slate-400" />}
                label={t('subscription.usage.farms', 'Farms')}
                current={usage?.farms_count || 0}
                limit={subscription?.max_farms || 0}
                color="purple"
              />

              <UsageBar
                icon={<MapPin className="h-4 w-4 text-slate-400" />}
                label={t('subscription.usage.parcels', 'Parcels')}
                current={usage?.parcels_count || 0}
                limit={subscription?.max_parcels || 0}
                color="indigo"
              />

              <div className="pt-8 border-t border-slate-50 dark:border-slate-800">
                <h4 className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Billing Portal</h4>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  {t('subscription.billingManagementDescription')}
                </p>
                <Button
                  onClick={() => {
                    if (isModular) {
                      modularCheckout.mutate();
                    } else {
                      const targetPlan = normalizedPlanType || 'standard';
                      purchasePlan.mutate(targetPlan);
                    }
                  }}
                  className="w-full h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl"
                  disabled={purchasePlan.isPending || modularCheckout.isPending}
                >
                  {purchasePlan.isPending || modularCheckout.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  {t('subscription.manageBilling')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-12 space-y-8">
          <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                  <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white uppercase tracking-tight">
                  {t('subscription.addons.title')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {addonModules.map((module) => {
                  const isActive = activeAddons.some(
                    (addon) => addon.module_id === module.id,
                  );
                  return (
                    <div
                      key={module.id}
                      className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-700/50 group hover:border-orange-200 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-tight truncate">
                          {module.name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                          {t('subscription.addons.perMonth', { price: module.priceMonthly || 0 })}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {isActive ? (
                          <Badge className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-none font-semibold text-[9px] tracking-widest px-3 py-1">
                            {t('subscription.addons.active').toUpperCase()}
                          </Badge>
                        ) : (
                          <Button
                            variant="default"
                            onClick={() => purchaseAddon.mutate(module.id)}
                            className="h-10 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-[10px] uppercase tracking-widest shadow-md transition-all"
                          >
                            {t('subscription.addons.buy')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {coreModules.length > 0 && (
                <div className="pt-8 border-t border-slate-50 dark:border-slate-800">
                  <h4 className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">
                    {t('subscription.addons.coreModules')}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {coreModules.map((module) => (
                      <Badge
                        key={module.slug}
                        variant="secondary"
                        className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-none font-semibold text-[9px] tracking-widest px-4 py-1.5 uppercase"
                      >
                        {module.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

interface PricingLineProps {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
}

const PricingLine = ({ label, value, valueColor, bold }: PricingLineProps) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
      {label}
    </span>
    <span className={cn(
      'text-sm tabular-nums',
      bold ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300',
      valueColor,
    )}>
      {value}
    </span>
  </div>
);

interface UsageBarProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  limit: number;
  unlimited?: boolean;
  color?: 'emerald' | 'blue' | 'purple' | 'indigo' | 'rose';
}

const UsageBar = ({
  icon,
  label,
  current,
  limit,
  unlimited = false,
  color = 'emerald'
}: UsageBarProps) => {
  const hasLimit = !unlimited && limit > 0;
  const percentage = hasLimit ? (current / limit) * 100 : 0;

  const colorClasses = {
    emerald: 'bg-emerald-500 shadow-emerald-100',
    blue: 'bg-blue-500 shadow-blue-100',
    purple: 'bg-purple-500 shadow-purple-100',
    indigo: 'bg-indigo-500 shadow-indigo-100',
    rose: 'bg-rose-500 shadow-rose-100',
  };

  return (
    <div className="space-y-3 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-widest">
            {label}
          </span>
        </div>
        <span className="text-xs font-semibold text-slate-900 dark:text-white tabular-nums">
          {current} <span className="text-slate-400 mx-1">/</span> {unlimited ? '∞' : limit}
        </span>
      </div>

      {hasLimit && (
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000 ease-out shadow-sm",
              percentage >= 90 ? 'bg-rose-500' : percentage >= 70 ? 'bg-amber-500' : colorClasses[color]
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

const TimelineItem = ({
  icon,
  label,
  value,
}: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 flex flex-col gap-2">
    <div className="flex items-center gap-2 text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums uppercase tracking-tight">{value}</div>
  </div>
);

export default SubscriptionSettings;
