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

  // Quiet, single-line strip. Trial = neutral muted; past_due/canceled = amber.
  const isUrgent = isPastDue || isCanceled;

  return (
    <div
      className={cn(
        'relative border-b px-4 py-1.5 text-xs',
        isUrgent
          ? 'border-amber-200/80 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20'
          : 'border-slate-200/70 bg-slate-50/70 dark:border-slate-700/60 dark:bg-slate-800/40',
        isRTL && 'text-right'
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
      role="status"
    >
      <div
        className={cn(
          'mx-auto flex max-w-7xl items-center gap-3',
          isRTL && 'flex-row-reverse'
        )}
      >
        <div className={cn('flex min-w-0 flex-1 items-center gap-2', isRTL && 'flex-row-reverse')}>
          {isUrgent ? (
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          ) : (
            <Zap className="h-3.5 w-3.5 flex-shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
          )}

          <div className={cn('min-w-0 flex-1 truncate', isRTL ? 'text-right' : 'text-left')}>
            {isTrialing && (
              <span className="text-slate-700 dark:text-slate-300" title={trialEndLabel ?? undefined}>
                {t('subscriptionBanner.trialPeriod')}{' '}
                {daysRemaining > 0 ? (
                  <>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {daysRemaining} {t('subscriptionBanner.days')}
                    </span>{' '}
                    {t('subscriptionBanner.remaining')}
                    {trialEndLabel ? ` (${trialEndLabel})` : ''}
                  </>
                ) : (
                  <span className="font-medium">{t('subscriptionBanner.trialEndingSoon')}</span>
                )}
              </span>
            )}

            {isPastDue && (
              <span className="text-amber-900 dark:text-amber-100">
                {t('subscriptionBanner.pastDue')}
              </span>
            )}

            {isCanceled && (
              <span className="text-amber-900 dark:text-amber-100">
                {t('subscriptionBanner.canceled')}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: '/settings/subscription' })}
          className={cn(
            'shrink-0 text-xs font-medium underline-offset-2 hover:underline transition-colors',
            isUrgent
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-emerald-700 dark:text-emerald-400'
          )}
        >
          {isTrialing ? t('subscriptionBanner.upgradeNow') : t('subscriptionBanner.manageSubscription')}
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          className="h-6 w-6 shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={t('app.close')}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionBanner;
