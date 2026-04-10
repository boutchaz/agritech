import React from 'react';
import { AlertTriangle, Zap, X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useSubscription } from '../hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { Button } from '@/components/ui/button';

const SubscriptionBanner = () => {
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
        'relative border-b px-4 py-3',
        isTrialing
          ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
          : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20',
        isRTL && 'text-right'
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className={cn(
          'mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4',
          isRTL && 'md:flex-row-reverse'
        )}
      >
        <div
          className={cn(
            'flex min-w-0 flex-1 items-start gap-3 md:items-center',
            isRTL && 'flex-row-reverse'
          )}
        >
          {isTrialing ? (
            <Zap
              className={cn(
                'h-5 w-5 flex-shrink-0',
                isTrialing ? 'text-blue-600 dark:text-blue-400' : ''
              )}
            />
          ) : (
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
          )}

          <div className={cn('min-w-0 flex-1', isRTL ? 'text-right' : 'text-left')}>
            {isTrialing && (
              <p className="text-pretty text-sm font-medium leading-snug text-blue-900 dark:text-blue-100">
                {t('subscriptionBanner.trialPeriod')}{' '}
                {daysRemaining > 0 ? (
                  <>
                    <span className="font-bold">
                      {daysRemaining} {t('subscriptionBanner.days')}
                    </span>{' '}
                    {t('subscriptionBanner.remaining')}.
                  </>
                ) : (
                  <span className="font-bold">{t('subscriptionBanner.trialEndingSoon')}</span>
                )}
              </p>
            )}

            {isPastDue && (
              <p className="text-pretty text-sm font-medium leading-snug text-yellow-900 dark:text-yellow-100">
                {t('subscriptionBanner.pastDue')}
              </p>
            )}

            {isCanceled && (
              <p className="text-pretty text-sm font-medium leading-snug text-yellow-900 dark:text-yellow-100">
                {t('subscriptionBanner.canceled')}
              </p>
            )}
          </div>
        </div>

        <div
          className={cn(
            'flex w-full shrink-0 items-center gap-2 md:w-auto md:justify-end',
            isRTL && 'flex-row-reverse'
          )}
        >
          <Button
            type="button"
            onClick={() => navigate({ to: '/settings/subscription' })}
            className={cn(
              'h-10 flex-1 rounded-md px-4 text-sm font-medium md:flex-initial',
              isTrialing
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            )}
          >
            {isTrialing ? t('subscriptionBanner.upgradeNow') : t('subscriptionBanner.manageSubscription')}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setDismissed(true)}
            className="h-10 w-10 shrink-0 text-slate-500 hover:bg-accent hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label={t('app.close')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBanner;
