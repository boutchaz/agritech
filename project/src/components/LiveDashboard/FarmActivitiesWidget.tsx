import React from 'react';
import { Activity, Clock, MapPin, User, Zap, CheckCircle, AlertCircle, FileText, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import type { FarmActivity } from '../../services/liveDashboardService';
import { Skeleton } from '@/components/ui/skeleton';

interface FarmActivitiesWidgetProps {
  activities: FarmActivity[];
  total: number;
  isLoading?: boolean;
}

const FarmActivitiesWidget: React.FC<FarmActivitiesWidgetProps> = ({
  activities,
  total,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
        <Skeleton className="h-28 rounded-xl mb-5" />
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    const iconMap: Record<string, typeof Activity> = {
      'Task Started': Zap,
      'Harvest Recorded': CheckCircle,
      'Inventory Updated': Package,
      'Worker Checked In': User,
      'Report Generated': FileText,
      'Alert Triggered': AlertCircle,
    };
    return iconMap[type] || Activity;
  };

  const getActivityColor = (type: string) => {
    const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
      'Task Started': {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-700 dark:text-green-400',
        icon: 'bg-green-100 dark:bg-green-900/40',
      },
      'Harvest Recorded': {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-700 dark:text-orange-400',
        icon: 'bg-orange-100 dark:bg-orange-900/40',
      },
      'Inventory Updated': {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-400',
        icon: 'bg-blue-100 dark:bg-blue-900/40',
      },
      'Worker Checked In': {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: 'text-purple-700 dark:text-purple-400',
        icon: 'bg-purple-100 dark:bg-purple-900/40',
      },
      'Report Generated': {
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        text: 'text-indigo-700 dark:text-indigo-400',
        icon: 'bg-indigo-100 dark:bg-indigo-900/40',
      },
      'Alert Triggered': {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-400',
        icon: 'bg-red-100 dark:bg-red-900/40',
      },
    };
    return colorMap[type] || {
      bg: 'bg-gray-50 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-400',
      icon: 'bg-gray-100 dark:bg-gray-700',
    };
  };

  const formatActivityTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7 hover:shadow-md hover:border-green-200 dark:hover:border-green-700 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-900/20 rounded-xl">
            <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('liveDashboard.activities.title')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            {t('liveDashboard.live')}
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="relative bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-900/30 dark:to-emerald-900/10 rounded-xl p-4 mb-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-green-200/20 dark:bg-green-400/10 rounded-full blur-2xl"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
              {t('liveDashboard.activities.recentActivities')}
            </span>
            <div className="text-4xl font-bold text-gray-900 dark:text-white mt-1">
              {total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {t('liveDashboard.activities.lastHour')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {activities.length > 0 ? Math.round((total / activities.length) * 10) / 10 : 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('liveDashboard.activities.perFarm')}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {t('liveDashboard.activities.activityFeed')}
        </h4>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {activities.map((activity, index) => {
            const Icon = getActivityIcon(activity.activityType);
            const colors = getActivityColor(activity.activityType);
            return (
              <div key={activity.id} className="relative">
                {/* Timeline connector */}
                {index < activities.length - 1 && (
                  <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                )}
                <div className={`flex items-start gap-3 p-3 rounded-lg ${colors.bg} transition-all duration-200 hover:scale-[1.01]`}>
                  <div className={`p-2 ${colors.icon} rounded-lg flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold ${colors.text}`}>
                        {activity.activityType}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatActivityTime(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {activity.farmName}
                      </span>
                      {activity.userName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {activity.userName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activities.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl flex items-center justify-center">
            <Activity className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('liveDashboard.activities.noActivities')}
          </p>
        </div>
      )}
    </div>
  );
};

export default FarmActivitiesWidget;
