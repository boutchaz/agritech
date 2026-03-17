import React from 'react';
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`relative bg-gradient-to-br ${card.bgColor} ${card.darkBgColor} rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300`}
          >
            {/* Background decoration */}
            <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${card.color} opacity-10 rounded-full blur-xl`}></div>

            {/* Live indicator */}
            {card.isLive && (
              <div className="absolute top-2 right-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>
            )}

            {/* Icon */}
            <div className={`p-2 bg-gradient-to-br ${card.color} rounded-lg w-fit mb-3`}>
              <Icon className="h-4 w-4 text-white" />
            </div>

            {/* Value */}
            <div className={`text-2xl font-bold text-gray-900 dark:text-white ${card.isText ? 'text-lg' : ''}`}>
              {card.value}
            </div>

            {/* Label */}
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
              {card.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LiveSummaryCards;
