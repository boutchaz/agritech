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

  // Calendar-day remaining, not millisecond ceiling. Previously used
  // Math.ceil on the raw ms diff, which meant the counter "flipped"
  // 24h after trial creation hour (e.g. 10:32 → 10:32 the next day),
  // and stayed on 14 for most of the first calendar day. Compare at
  // local midnight so the displayed number decrements at midnight like
  // users expect.
  const daysRemaining = subscription.current_period_end
    ? (() => {
        const end = new Date(subscription.current_period_end);
        const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
        const now = new Date();
        const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return Math.max(0, Math.round((endMidnight - nowMidnight) / (1000 * 60 * 60 * 24)));
      })()
    : 0;
  const trialEndLabel = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(i18n.language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  if (!isTrialing && !isPastDue && !isCanceled) return null;

  return (
    <div
      className={cn(
        'relative border-b px-4 py-3.5',
        isTrialing
          ? 'border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/10'
          : 'border-amber-200/80 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/25',
        isRTL && 'text-right'
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
      role="status"
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
            <Zap className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden />
          ) : (
            <AlertTriangle
              className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
          )}

          <div className={cn('min-w-0 flex-1', isRTL ? 'text-right' : 'text-left')}>
            {isTrialing && (
              <p
                className="text-pretty text-sm font-medium leading-snug text-blue-900 dark:text-blue-100"
                title={trialEndLabel ?? undefined}
              >
                {t('subscriptionBanner.trialPeriod')}{' '}
                {daysRemaining > 0 ? (
                  <>
                    <span className="font-bold">
                      {daysRemaining} {t('subscriptionBanner.days')}
                    </span>{' '}
                    {t('subscriptionBanner.remaining')}
                    {trialEndLabel ? ` (${trialEndLabel})` : ''}.
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
            variant="default"
            onClick={() => navigate({ to: '/settings/subscription' })}
            className="h-10 flex-1 rounded-md px-4 text-sm font-medium md:flex-initial"
          >
            {isTrialing ? t('subscriptionBanner.upgradeNow') : t('subscriptionBanner.manageSubscription')}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setDismissed(true)}
            className="h-10 w-10 shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground"
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
