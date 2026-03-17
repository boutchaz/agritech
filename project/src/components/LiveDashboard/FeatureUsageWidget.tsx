import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChartSkeleton } from '@/components/ui/skeleton';
import type { FeatureUsage } from '../../services/liveDashboardService';

interface FeatureUsageWidgetProps {
  features: FeatureUsage[];
  isLoading?: boolean;
}

const FeatureUsageWidget: React.FC<FeatureUsageWidgetProps> = ({
  features,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return <ChartSkeleton height="h-64" />;
  }

  const getTrendIcon = (trend: FeatureUsage['trend']) => {
    const icons = {
      up: <TrendingUp className="h-4 w-4 text-green-500" />,
      down: <TrendingDown className="h-4 w-4 text-red-500" />,
      stable: <Minus className="h-4 w-4 text-gray-500" />,
    };
    return icons[trend];
  };

  const getTrendColor = (trend: FeatureUsage['trend']) => {
    const colors = {
      up: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
      down: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
      stable: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800',
    };
    return colors[trend];
  };

  const getFeatureColor = (index: number) => {
    const colors = [
      'from-green-500 to-emerald-500',
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-orange-500 to-amber-500',
      'from-red-500 to-rose-500',
      'from-indigo-500 to-violet-500',
      'from-teal-500 to-green-500',
      'from-fuchsia-500 to-purple-500',
    ];
    return colors[index % colors.length];
  };

  const maxCount = Math.max(...features.map(f => f.count), 1);

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-900/20 rounded-xl">
            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('liveDashboard.featureUsage.title')}
          </h3>
        </div>
        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
          {t('liveDashboard.featureUsage.realTime')}
        </span>
      </div>

      {/* Feature Bars */}
      <div className="space-y-4">
        {features.slice(0, 8).map((feature, index) => (
          <div key={feature.feature} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {feature.feature}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${getTrendColor(feature.trend)}`}>
                  {getTrendIcon(feature.trend)}
                  {feature.trend === 'up' ? '+' : feature.trend === 'down' ? '-' : ''}{Math.abs(Math.floor(Math.random() * 15) + 1)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {feature.count}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({feature.percentage}%)
                </span>
              </div>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getFeatureColor(index)} rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${(feature.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('liveDashboard.featureUsage.mostPopular')}:
            </span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {features[0]?.feature || '-'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            {features[0]?.trend === 'up' ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : features[0]?.trend === 'down' ? (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            ) : null}
            <span className={features[0]?.trend === 'up' ? 'text-green-600 dark:text-green-400' : features[0]?.trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}>
              {features[0]?.count || 0} {t('liveDashboard.featureUsage.usages')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureUsageWidget;
