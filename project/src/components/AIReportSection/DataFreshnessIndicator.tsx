import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataFreshnessLevel, DataSufficiencyStatus } from '@/lib/api/source-data';

interface DataFreshnessIndicatorProps {
  level: DataFreshnessLevel;
  ageDays?: number | null;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Visual indicator component for data freshness
 * Shows green for fresh, yellow for aging, red for stale data
 */
export const DataFreshnessIndicator: React.FC<DataFreshnessIndicatorProps> = ({
  level,
  ageDays,
  showLabel = true,
  size = 'md',
  className,
}) => {
  const { t } = useTranslation();

  const config = {
    fresh: {
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-200 dark:border-green-800',
      icon: CheckCircle2,
      label: t('dataTransparency.freshness.fresh', 'Fresh'),
      dotColor: 'bg-green-500',
    },
    aging: {
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      icon: AlertTriangle,
      label: t('dataTransparency.freshness.aging', 'Aging'),
      dotColor: 'bg-yellow-500',
    },
    stale: {
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      borderColor: 'border-red-200 dark:border-red-800',
      icon: XCircle,
      label: t('dataTransparency.freshness.stale', 'Stale'),
      dotColor: 'bg-red-500',
    },
  };

  const sizeConfig = {
    sm: {
      icon: 'w-3 h-3',
      text: 'text-xs',
      padding: 'px-1.5 py-0.5',
      dot: 'w-1.5 h-1.5',
    },
    md: {
      icon: 'w-4 h-4',
      text: 'text-sm',
      padding: 'px-2 py-1',
      dot: 'w-2 h-2',
    },
    lg: {
      icon: 'w-5 h-5',
      text: 'text-base',
      padding: 'px-3 py-1.5',
      dot: 'w-2.5 h-2.5',
    },
  };

  const { color, bgColor, borderColor, icon: Icon, label } = config[level];
  const { icon: iconSize, text, padding } = sizeConfig[size];

  const formatAge = (days: number | null) => {
    if (days === null) return t('dataTransparency.freshness.unknown', 'Unknown');
    if (days === 0) return t('dataTransparency.freshness.today', 'Today');
    if (days === 1) return t('dataTransparency.freshness.yesterday', 'Yesterday');
    if (days < 7) return t('dataTransparency.freshness.daysAgo', '{{days}} days ago', { days });
    if (days < 30) {
      const weeks = Math.floor(days / 7);
      return t('dataTransparency.freshness.weeksAgo', '{{weeks}} week(s) ago', { weeks });
    }
    if (days < 365) {
      const months = Math.floor(days / 30);
      return t('dataTransparency.freshness.monthsAgo', '{{months}} month(s) ago', { months });
    }
    const years = Math.floor(days / 365);
    return t('dataTransparency.freshness.yearsAgo', '{{years}} year(s) ago', { years });
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        bgColor,
        borderColor,
        padding,
        className
      )}
    >
      <Icon className={cn(iconSize, color)} />
      {showLabel && (
        <span className={cn(text, 'font-medium', color)}>
          {label}
          {ageDays !== undefined && ageDays !== null && (
            <span className="ml-1 opacity-75">({formatAge(ageDays)})</span>
          )}
        </span>
      )}
    </div>
  );
};

interface DataFreshnessDotProps {
  level: DataFreshnessLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  pulse?: boolean;
}

/**
 * Simple dot indicator for data freshness
 */
export const DataFreshnessDot: React.FC<DataFreshnessDotProps> = ({
  level,
  size = 'md',
  className,
  pulse = false,
}) => {
  const dotColors = {
    fresh: 'bg-green-500',
    aging: 'bg-yellow-500',
    stale: 'bg-red-500',
  };

  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        dotColors[level],
        sizeClasses[size],
        pulse && level === 'fresh' && 'animate-pulse',
        className
      )}
    />
  );
};

interface DataSufficiencyBadgeProps {
  status: DataSufficiencyStatus;
  score: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Badge component showing data sufficiency status
 */
export const DataSufficiencyBadge: React.FC<DataSufficiencyBadgeProps> = ({
  status,
  score,
  showScore = true,
  size = 'md',
  className,
}) => {
  const { t } = useTranslation();

  const config = {
    sufficient: {
      color: 'text-green-700 dark:text-green-300',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-200 dark:border-green-800',
      label: t('dataTransparency.sufficiency.sufficient', 'Sufficient'),
      icon: CheckCircle2,
    },
    minimal: {
      color: 'text-yellow-700 dark:text-yellow-300',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      label: t('dataTransparency.sufficiency.minimal', 'Minimal'),
      icon: AlertTriangle,
    },
    insufficient: {
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      borderColor: 'border-red-200 dark:border-red-800',
      label: t('dataTransparency.sufficiency.insufficient', 'Insufficient'),
      icon: XCircle,
    },
  };

  const sizeConfig = {
    sm: { icon: 'w-3 h-3', text: 'text-xs', padding: 'px-1.5 py-0.5' },
    md: { icon: 'w-4 h-4', text: 'text-sm', padding: 'px-2 py-1' },
    lg: { icon: 'w-5 h-5', text: 'text-base', padding: 'px-3 py-1.5' },
  };

  const { color, bgColor, borderColor, label, icon: Icon } = config[status];
  const { icon: iconSize, text, padding } = sizeConfig[size];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        bgColor,
        borderColor,
        padding,
        className
      )}
    >
      <Icon className={cn(iconSize, color)} />
      <span className={cn(text, 'font-medium', color)}>
        {label}
        {showScore && <span className="ml-1 opacity-75">({score}%)</span>}
      </span>
    </div>
  );
};

interface FreshnessProgressBarProps {
  level: DataFreshnessLevel;
  ageDays: number | null;
  maxDays: number;
  className?: string;
}

/**
 * Progress bar showing data age relative to freshness thresholds
 */
export const FreshnessProgressBar: React.FC<FreshnessProgressBarProps> = ({
  level,
  ageDays,
  maxDays,
  className,
}) => {
  const progressColors = {
    fresh: 'bg-green-500',
    aging: 'bg-yellow-500',
    stale: 'bg-red-500',
  };

  const percentage = ageDays !== null
    ? Math.min(100, (ageDays / maxDays) * 100)
    : 100;

  return (
    <div className={cn('w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full transition-all duration-300', progressColors[level])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default DataFreshnessIndicator;
