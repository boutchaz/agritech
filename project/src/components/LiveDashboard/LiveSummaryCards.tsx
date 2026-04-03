import React from 'react';
import { cn } from '@/lib/utils';
import { Users, Activity, Building2, Clock, TrendingUp, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatsGridSkeleton } from '@/components/ui/skeleton';
import type { LiveDashboardSummary } from '../../services/liveDashboardService';

interface LiveSummaryCardsProps {
  summary: LiveDashboardSummary | undefined;
  isLoading?: boolean;
}

const LiveSummaryCards: React.FC<LiveSummaryCardsProps> = ({
  summary,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return <StatsGridSkeleton count={6} />;
  }

  const cards = [
    {
      icon: Users,
      value: summary?.concurrentUsersCount || 0,
      label: t('liveDashboard.summary.concurrentUsers'),
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'from-cyan-50 to-cyan-100/50',
      darkBgColor: 'dark:from-cyan-900/30 dark:to-cyan-900/10',
      textColor: 'text-cyan-600 dark:text-cyan-400',
      isLive: true,
    },
    {
      icon: Activity,
      value: summary?.activeOperationsCount || 0,
      label: t('liveDashboard.summary.activeOperations'),
      color: 'from-orange-500 to-amber-500',
      bgColor: 'from-orange-50 to-orange-100/50',
      darkBgColor: 'dark:from-orange-900/30 dark:to-orange-900/10',
      textColor: 'text-orange-600 dark:text-orange-400',
      isLive: true,
    },
    {
      icon: Building2,
      value: summary?.activeFarmsCount || 0,
      label: t('liveDashboard.summary.activeFarms'),
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-50 to-green-100/50',
      darkBgColor: 'dark:from-green-900/30 dark:to-green-900/10',
      textColor: 'text-green-600 dark:text-green-400',
      isLive: true,
    },
    {
      icon: Zap,
      value: summary?.totalActivitiesLast24h || 0,
      label: t('liveDashboard.summary.activitiesLast24h'),
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-50 to-purple-100/50',
      darkBgColor: 'dark:from-purple-900/30 dark:to-purple-900/10',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: Clock,
      value: summary?.peakUsageTime || '-',
      label: t('liveDashboard.summary.peakUsage'),
      color: 'from-indigo-500 to-violet-500',
      bgColor: 'from-indigo-50 to-indigo-100/50',
      darkBgColor: 'dark:from-indigo-900/30 dark:to-indigo-900/10',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      isText: true,
    },
    {
      icon: TrendingUp,
      value: summary?.mostActiveFeature || '-',
      label: t('liveDashboard.summary.mostActiveFeature'),
      color: 'from-teal-500 to-green-500',
      bgColor: 'from-teal-50 to-teal-100/50',
      darkBgColor: 'dark:from-teal-900/30 dark:to-teal-900/10',
      textColor: 'text-teal-600 dark:text-teal-400',
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`group relative bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all duration-500 hover:-translate-y-1`}
          >
            {/* Background decoration */}
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${card.color} opacity-[0.03] group-hover:opacity-[0.08] rounded-full -mr-10 -mt-10 transition-all duration-700 group-hover:scale-150`}></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 bg-gradient-to-br ${card.color} rounded-2xl shadow-lg shadow-gray-200 dark:shadow-none`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                
                {/* Live indicator */}
                {card.isLive && (
                  <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live</span>
                  </div>
                )}
              </div>

              {/* Value */}
              <div className={cn(
                "font-black text-slate-900 dark:text-white tabular-nums tracking-tighter",
                card.isText ? 'text-base uppercase truncate' : 'text-3xl'
              )}>
                {card.value}
              </div>

              {/* Label */}
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest leading-tight">
                {card.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LiveSummaryCards;
