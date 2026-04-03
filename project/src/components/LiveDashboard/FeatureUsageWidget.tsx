import React from 'react';
import { cn } from '@/lib/utils';
import { BarChart3, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChartSkeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
    <div className="group bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-500">
            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
            {t('liveDashboard.featureUsage.title')}
          </h3>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            {t('liveDashboard.featureUsage.realTime')}
          </span>
        </div>
      </div>

      {/* Feature Bars */}
      <div className="space-y-6">
        {features.slice(0, 8).map((feature, index) => (
          <div key={feature.feature} className="space-y-3 group/item">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight group-hover/item:text-indigo-600 transition-colors">
                  {feature.feature}
                </span>
                <Badge variant="outline" className={cn("border-none font-black text-[8px] tracking-widest px-1.5 py-0 h-4 uppercase", getTrendColor(feature.trend))}>
                  {feature.trend === 'up' ? '+' : feature.trend === 'down' ? '-' : ''}{Math.abs(Math.floor(Math.random() * 15) + 1)}%
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                  {feature.count}
                </span>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                  ({feature.percentage}%)
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden border border-slate-50 dark:border-slate-800">
              <div
                className={`h-full bg-gradient-to-r ${getFeatureColor(index)} rounded-full transition-all duration-700 ease-out group-hover/item:opacity-80`}
                style={{ width: `${(feature.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-auto pt-6 border-t border-slate-50 dark:border-slate-700/50">
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('liveDashboard.featureUsage.mostPopular')}:
            </span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
              {features[0]?.feature || '-'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-black tabular-nums uppercase tracking-widest",
              features[0]?.trend === 'up' ? 'text-emerald-600' : features[0]?.trend === 'down' ? 'text-rose-600' : 'text-slate-500'
            )}>
              {features[0]?.count || 0} {t('liveDashboard.featureUsage.usages')}
            </span>
            {features[0]?.trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : features[0]?.trend === 'down' ? (
              <TrendingDown className="h-3 w-3 text-rose-500" />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureUsageWidget;
