import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Zap, Infinity as InfinityIcon } from 'lucide-react';

interface AiUsageBarProps {
  currentCount: number;
  monthlyLimit: number;
  periodEnd: string;
  isByok: boolean;
  isUnlimited: boolean;
}

export function AiUsageBar({
  currentCount,
  monthlyLimit,
  periodEnd,
  isByok,
  isUnlimited,
}: AiUsageBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isUnlimited) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('ai.quota.usage', 'Usage')}</span>
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <InfinityIcon className="w-3 h-3 mr-1" />
            {t('ai.quota.unlimited', 'Unlimited')}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {isByok
            ? t('ai.quota.byokNote', 'Using your own API key — no limits.')
            : t('ai.quota.enterpriseNote', 'Enterprise plan — unlimited AI requests.')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('ai.quota.usedThisMonth', '{{count}} requests this month', { count: currentCount })}
        </p>
      </div>
    );
  }

  const percentage = monthlyLimit > 0 ? Math.min((currentCount / monthlyLimit) * 100, 100) : 0;
  const color = percentage < 70 ? 'bg-green-500' : percentage < 90 ? 'bg-orange-500' : 'bg-red-500';
  const resetDate = new Date(periodEnd).toLocaleDateString();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {currentCount} / {monthlyLimit} {t('ai.quota.requests', 'requests')}
        </span>
        <span className="text-xs text-muted-foreground">
          {t('ai.quota.resetsOn', 'Resets {{date}}', { date: resetDate })}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-3">
        <div
          className={`${color} h-3 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{Math.round(percentage)}% {t('ai.quota.used', 'used')}</span>
        <span>{monthlyLimit - currentCount} {t('ai.quota.remaining', 'remaining')}</span>
      </div>

      {/* Upsell CTAs when at limit */}
      {percentage >= 100 && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => navigate({ to: '/settings/subscription' })}
          >
            <Zap className="w-4 h-4 mr-1" />
            {t('ai.quota.upgradeAction', 'Upgrade Plan')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ to: '/settings/ai' })}
          >
            {t('ai.quota.byokAction', 'Add Your Own Key')}
          </Button>
        </div>
      )}
    </div>
  );
}
