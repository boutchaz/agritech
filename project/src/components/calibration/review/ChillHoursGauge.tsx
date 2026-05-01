import { useTranslation } from 'react-i18next';
import { Snowflake, AlertTriangle } from 'lucide-react';
import type { ChillHoursDisplay } from '@/types/calibration-review';
import { cn } from '@/lib/utils';

interface ChillHoursGaugeProps {
  data: ChillHoursDisplay | null;
}

const BAND_STYLES: Record<ChillHoursDisplay['band'], { bg: string; bar: string; text: string }> = {
  green: {
    bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/40',
    bar: 'bg-green-500 dark:bg-green-400',
    text: 'text-green-900 dark:text-green-100',
  },
  yellow: {
    bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40',
    bar: 'bg-amber-500 dark:bg-amber-400',
    text: 'text-amber-900 dark:text-amber-100',
  },
  red: {
    bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/40',
    bar: 'bg-orange-500 dark:bg-orange-400',
    text: 'text-orange-900 dark:text-orange-100',
  },
  critique: {
    bg: 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700/50',
    bar: 'bg-red-600 dark:bg-red-500',
    text: 'text-red-900 dark:text-red-100',
  },
};

const GAUGE_MAX = 800;

export function ChillHoursGauge({ data }: ChillHoursGaugeProps) {
  const { t } = useTranslation('ai');

  if (!data) return null;

  const styles = BAND_STYLES[data.band];
  const markerPercent = Math.min(100, Math.max(0, (data.value / GAUGE_MAX) * 100));
  const minPercent = Math.min(100, (data.reference.min / GAUGE_MAX) * 100);
  const maxPercent = Math.min(100, (data.reference.max / GAUGE_MAX) * 100);

  return (
    <div
      data-testid="chill-hours-gauge"
      data-band={data.band}
      className={cn('rounded-xl border p-4', styles.bg)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Snowflake className={cn('h-5 w-5', styles.text)} aria-hidden />
          <h3 className={cn('text-sm font-semibold', styles.text)}>
            {t('calibrationReview.chill.title', 'Heures de froid')}
          </h3>
          {data.reference.source === 'fallback' && (
            <span
              data-testid="chill-hours-fallback-badge"
              className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              {t('calibrationReview.chill.fallbackBadge', 'Réf. par défaut')}
            </span>
          )}
        </div>
        <div className={cn('text-2xl font-bold', styles.text)}>
          {data.value}
          <span className="text-sm font-normal ml-1">
            {t('calibrationReview.chill.unit', 'h')}
          </span>
        </div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">
        {data.reference.variety_label && (
          <span className="font-medium">{data.reference.variety_label} — </span>
        )}
        {t('calibrationReview.chill.referenceLabel', 'Référence')} {data.reference.min}–{data.reference.max} h
      </div>

      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div
          className="absolute h-full bg-gray-300 dark:bg-gray-600/60"
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
          aria-hidden
        />
        <div
          className={cn('absolute top-0 bottom-0 w-1', styles.bar)}
          style={{ left: `calc(${markerPercent}% - 2px)` }}
          aria-hidden
        />
      </div>

      {data.band === 'critique' && (
        <div
          data-testid="chill-hours-critique-alert"
          className="flex items-center gap-2 text-xs font-medium text-red-700 dark:text-red-300 mb-2"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden />
          <span>{t('calibrationReview.chill.bands.critique', 'Déficit critique')}</span>
        </div>
      )}

      <p className={cn('text-sm', styles.text)}>{data.phrase}</p>
    </div>
  );
}
