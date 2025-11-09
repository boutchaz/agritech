import React from 'react';
import { AlertTriangle, Zap, X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useSubscription } from '../hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

const SubscriptionBanner: React.FC = () => {
  const { data: subscription } = useSubscription();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [dismissed, setDismissed] = React.useState(false);
  const isRTL = i18n.language === 'ar';

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
      className={cn(
        "relative border-b px-4 py-3",
        isTrialing
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        isRTL && "text-right"
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className={cn("flex items-center justify-between max-w-7xl mx-auto gap-4", isRTL && "flex-row-reverse")}>
        {/* Text - on right for Arabic, on left for LTR */}
        <div className={cn("flex items-center flex-1", isRTL ? "flex-row-reverse justify-end space-x-reverse space-x-3" : "space-x-3")}>
          {isTrialing ? (
            <Zap className={cn("h-5 w-5 flex-shrink-0", isTrialing ? "text-blue-600 dark:text-blue-400" : "")} />
          ) : (
            <AlertTriangle className={cn("h-5 w-5 flex-shrink-0", "text-yellow-600 dark:text-yellow-400")} />
          )}

          <div className={isRTL ? "text-right" : ""}>
            {isTrialing && (
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t('subscriptionBanner.trialPeriod')}{' '}
                {daysRemaining > 0 ? (
                  <>
                    <span className="font-bold">{daysRemaining} {t('subscriptionBanner.days')}</span> {t('subscriptionBanner.remaining')}.
                  </>
                ) : (
                  <span className="font-bold">{t('subscriptionBanner.trialEndingSoon')}</span>
                )}
              </p>
            )}

            {isPastDue && (
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                {t('subscriptionBanner.pastDue')}
              </p>
            )}

            {isCanceled && (
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                {t('subscriptionBanner.canceled')}
              </p>
            )}
          </div>
        </div>

        {/* Actions - on left for Arabic, on right for LTR */}
        <div className={cn("flex items-center flex-shrink-0", isRTL ? "flex-row-reverse space-x-reverse space-x-3" : "space-x-3")}>
          <button
            onClick={() => navigate({ to: '/settings/subscription' })}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium",
              isTrialing
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            )}
          >
            {isTrialing ? t('subscriptionBanner.upgradeNow') : t('subscriptionBanner.manageSubscription')}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label={t('app.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBanner;
