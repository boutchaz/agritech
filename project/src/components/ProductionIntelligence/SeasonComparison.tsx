import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useYieldHistory } from '@/hooks/useProductionIntelligence';

// Moroccan agricultural year: September to August (Season "2024" = Sep 2024 - Aug 2025)
function getSeasonYear(date: Date): number {
  return date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
}

function getSeasonDateRange(seasonYear: number): { fromDate: string; toDate: string } {
  return {
    fromDate: `${seasonYear}-09-01`,
    toDate: `${seasonYear + 1}-08-31`,
  };
}

function formatSeasonLabel(seasonYear: number): string {
  const short = (seasonYear + 1) % 100;
  return `${seasonYear}/${short < 10 ? '0' + short : short}`;
}

interface MetricComparison {
  label: string;
  previous: number;
  current: number;
  unit: string;
  format: 'number' | 'currency' | 'percent';
}

function computeChange(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'neutral' } {
  if (previous === 0 && current === 0) return { value: 0, direction: 'neutral' };
  if (previous === 0) return { value: 100, direction: current > 0 ? 'up' : 'down' };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.5) return { value: 0, direction: 'neutral' };
  return { value: pct, direction: pct > 0 ? 'up' : 'down' };
}

function formatMetricValue(value: number, format: MetricComparison['format']): string {
  if (format === 'currency') return value.toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MAD';
  if (format === 'percent') return value.toFixed(1) + '%';
  return value.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface SeasonComparisonProps {
  parcelId?: string;
  farmId?: string;
}

export const SeasonComparison = ({ parcelId, farmId }: SeasonComparisonProps) => {
  const { t } = useTranslation('common');
  useAuth();

  const currentSeasonYear = useMemo(() => getSeasonYear(new Date()), []);
  const [selectedCurrentSeason, setSelectedCurrentSeason] = useState(currentSeasonYear);
  const [selectedPreviousSeason, setSelectedPreviousSeason] = useState(currentSeasonYear - 1);

  const currentRange = useMemo(() => getSeasonDateRange(selectedCurrentSeason), [selectedCurrentSeason]);
  const previousRange = useMemo(() => getSeasonDateRange(selectedPreviousSeason), [selectedPreviousSeason]);

  const {
    data: currentData = [],
    isLoading: loadingCurrent,
    isError: errorCurrent,
  } = useYieldHistory({
    parcelId,
    farmId,
    fromDate: currentRange.fromDate,
    toDate: currentRange.toDate,
  });

  const {
    data: previousData = [],
    isLoading: loadingPrevious,
    isError: errorPrevious,
  } = useYieldHistory({
    parcelId,
    farmId,
    fromDate: previousRange.fromDate,
    toDate: previousRange.toDate,
  });

  const currentMetrics = useMemo(() => aggregateMetrics(currentData), [currentData]);
  const previousMetrics = useMemo(() => aggregateMetrics(previousData), [previousData]);

  const comparisons: MetricComparison[] = useMemo(() => [
    {
      label: t('seasonComparison.avgYield', 'Average Yield'),
      previous: previousMetrics.avgYield,
      current: currentMetrics.avgYield,
      unit: 't/ha',
      format: 'number',
    },
    {
      label: t('seasonComparison.totalRevenue', 'Total Revenue'),
      previous: previousMetrics.totalRevenue,
      current: currentMetrics.totalRevenue,
      unit: 'MAD',
      format: 'currency',
    },
    {
      label: t('seasonComparison.totalCosts', 'Total Costs'),
      previous: previousMetrics.totalCost,
      current: currentMetrics.totalCost,
      unit: 'MAD',
      format: 'currency',
    },
    {
      label: t('seasonComparison.netProfit', 'Net Profit'),
      previous: previousMetrics.netProfit,
      current: currentMetrics.netProfit,
      unit: 'MAD',
      format: 'currency',
    },
    {
      label: t('seasonComparison.profitMargin', 'Profit Margin'),
      previous: previousMetrics.profitMargin,
      current: currentMetrics.profitMargin,
      unit: '%',
      format: 'percent',
    },
    {
      label: t('seasonComparison.totalHarvests', 'Total Harvests'),
      previous: previousMetrics.totalHarvests,
      current: currentMetrics.totalHarvests,
      unit: '',
      format: 'number',
    },
  ], [t, currentMetrics, previousMetrics]);

  const isLoading = loadingCurrent || loadingPrevious;
  const isError = errorCurrent || errorPrevious;
  const hasNoData = currentData.length === 0 && previousData.length === 0;

  const seasonOptions = useMemo(() => {
    const options: number[] = [];
    for (let i = 0; i < 6; i++) {
      options.push(currentSeasonYear - i);
    }
    return options;
  }, [currentSeasonYear]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('seasonComparison.loading', 'Loading season comparison...')}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {['yield', 'revenue', 'costs', 'profit', 'margin', 'harvests'].map((skeletonKey) => (
            <Card key={skeletonKey} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">
            {t('seasonComparison.error', 'Failed to load season comparison data')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('seasonComparison.compareSeasons', 'Compare Seasons')}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {seasonOptions.map((year) => {
            const isCurrent = year === selectedCurrentSeason;
            const isPrevious = year === selectedPreviousSeason;
            const isDisabled = year === selectedPreviousSeason;

            return (
              <Button
                key={year}
                variant={isCurrent ? 'default' : isPrevious ? 'secondary' : 'outline'}
                size="sm"
                disabled={isDisabled && !isCurrent}
                onClick={() => {
                  if (isCurrent) {
                    setSelectedCurrentSeason(year);
                    if (year <= selectedPreviousSeason) {
                      setSelectedPreviousSeason(year - 1);
                    }
                  } else {
                    setSelectedPreviousSeason(year);
                    if (year >= selectedCurrentSeason) {
                      setSelectedCurrentSeason(year + 1);
                    }
                  }
                }}
                className="text-xs"
              >
                {formatSeasonLabel(year)}
                {isCurrent && (
                  <span className="ml-1 text-[10px] opacity-80">
                    ({t('seasonComparison.current', 'Current')})
                  </span>
                )}
                {isPrevious && (
                  <span className="ml-1 text-[10px] opacity-80">
                    ({t('seasonComparison.previous', 'Previous')})
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatSeasonLabel(selectedPreviousSeason)} → {formatSeasonLabel(selectedCurrentSeason)}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('seasonComparison.comparisonSubtitle', 'Season-over-season performance comparison')}
          </p>
        </div>
      </div>

      {hasNoData ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed border-gray-300 dark:border-gray-700">
          <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-center">
            {t('seasonComparison.noData', 'No data available for comparison')}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {t('seasonComparison.noDataHint', 'Record yield data for both seasons to see the comparison')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparisons.map((metric) => {
            const change = computeChange(metric.current, metric.previous);
            const isPositiveGood = metric.label !== t('seasonComparison.totalCosts', 'Total Costs');
            const isGoodDirection =
              change.direction === 'neutral'
                ? true
                : isPositiveGood
                  ? change.direction === 'up'
                  : change.direction === 'down';

            return (
              <ComparisonCard
                key={metric.label}
                metric={metric}
                change={change}
                isGoodDirection={isGoodDirection}
                previousSeasonLabel={formatSeasonLabel(selectedPreviousSeason)}
                currentSeasonLabel={formatSeasonLabel(selectedCurrentSeason)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

interface ComparisonCardProps {
  metric: MetricComparison;
  change: { value: number; direction: 'up' | 'down' | 'neutral' };
  isGoodDirection: boolean;
  previousSeasonLabel: string;
  currentSeasonLabel: string;
}

const ComparisonCard = ({
  metric,
  change,
  isGoodDirection,
  previousSeasonLabel,
  currentSeasonLabel,
}: ComparisonCardProps) => {
  const TrendIcon =
    change.direction === 'up'
      ? TrendingUp
      : change.direction === 'down'
        ? TrendingDown
        : Minus;

  const trendColor =
    change.direction === 'neutral'
      ? 'text-slate-500'
      : isGoodDirection
        ? 'text-green-600'
        : 'text-red-600';

  const bgColor =
    change.direction === 'neutral'
      ? 'bg-slate-50 dark:bg-slate-900/20'
      : isGoodDirection
        ? 'bg-green-50 dark:bg-green-900/10'
        : 'bg-red-50 dark:bg-red-900/10';

  return (
    <Card className={bgColor}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {metric.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatMetricValue(metric.current, metric.format)}
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="text-xs">{previousSeasonLabel}:</span>{' '}
            {formatMetricValue(metric.previous, metric.format)}
          </div>

          <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span>
              {change.direction === 'up' && '+'}
              {change.value.toFixed(1)}%
            </span>
            <span className="text-xs opacity-70">
              {change.direction === 'neutral'
                ? ''
                : change.direction === 'up'
                  ? `↑ ${currentSeasonLabel}`
                  : `↓ ${currentSeasonLabel}`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface AggregatedMetrics {
  avgYield: number;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
  totalHarvests: number;
}

function aggregateMetrics(records: { actual_yield_per_hectare: number | null; revenue_amount: number | null; cost_amount: number | null; profit_amount: number | null; profit_margin_percent: number | null }[]): AggregatedMetrics {
  if (records.length === 0) {
    return { avgYield: 0, totalRevenue: 0, totalCost: 0, netProfit: 0, profitMargin: 0, totalHarvests: 0 };
  }

  const yields = records.filter(r => r.actual_yield_per_hectare != null);
  const margins = records.filter(r => r.profit_margin_percent != null);

  const avgYield = yields.length > 0
    ? yields.reduce((sum, r) => sum + (r.actual_yield_per_hectare ?? 0), 0) / yields.length
    : 0;

  const totalRevenue = records.reduce((sum, r) => sum + (r.revenue_amount ?? 0), 0);
  const totalCost = records.reduce((sum, r) => sum + (r.cost_amount ?? 0), 0);
  const netProfit = records.reduce((sum, r) => sum + (r.profit_amount ?? 0), 0);

  const profitMargin = margins.length > 0
    ? margins.reduce((sum, r) => sum + (r.profit_margin_percent ?? 0), 0) / margins.length
    : totalRevenue > 0
      ? (netProfit / totalRevenue) * 100
      : 0;

  return {
    avgYield,
    totalRevenue,
    totalCost,
    netProfit,
    profitMargin,
    totalHarvests: records.length,
  };
}
