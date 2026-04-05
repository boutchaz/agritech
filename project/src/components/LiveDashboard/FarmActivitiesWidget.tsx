
import { Activity, Clock, MapPin, User, Zap, CheckCircle, AlertCircle, FileText, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import type { FarmActivity } from '../../services/liveDashboardService';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FarmActivitiesWidgetProps {
  activities: FarmActivity[];
  total: number;
  isLoading?: boolean;
}

const FarmActivitiesWidget = ({
  activities,
  total,
  isLoading = false,
}: FarmActivitiesWidgetProps) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 h-full flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <Skeleton className="h-5 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
        <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-4 w-48 mt-2 rounded-md" />
        </div>
        <div className="space-y-4 mt-auto">
          <div className="flex items-center justify-between px-1 mb-4">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-px flex-1 mx-3 rounded" />
          </div>
          {[1, 2, 3].map((skIdx) => (
            <Skeleton key={"sk-" + skIdx} className="h-20 w-full rounded-2xl" />
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
    <div className="group bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-500">
            <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
            {t('liveDashboard.activities.title')}
          </h3>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            {t('liveDashboard.live')}
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 mb-6 overflow-hidden group/card border border-slate-100 dark:border-slate-700/50">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover/card:scale-150 transition-transform duration-700"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('liveDashboard.activities.recentActivities')}
            </span>
            <div className="text-4xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
              {total}
            </div>
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-tighter">
              {t('liveDashboard.activities.lastHour')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {activities.length > 0 ? Math.round((total / activities.length) * 10) / 10 : 0}
            </div>
            <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
              {t('liveDashboard.activities.perFarm')}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      {activities.length > 0 ? (
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('liveDashboard.activities.activityFeed')}
            </h4>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-3"></div>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-1">
            {activities.map((activity, index) => {
              const Icon = getActivityIcon(activity.activityType);
              const colors = getActivityColor(activity.activityType);
              return (
                <div key={activity.id} className="relative pl-6">
                  {/* Timeline connector */}
                  {index < activities.length - 1 && (
                    <div className="absolute left-2.5 top-8 bottom-0 w-px bg-slate-100 dark:bg-slate-800"></div>
                  )}
                  {/* Dot */}
                  <div className={cn("absolute left-1.5 top-3.5 w-2 h-2 rounded-full ring-4 ring-white dark:ring-slate-800 z-10", colors.text.replace('text-', 'bg-'))}></div>
                  
                  <div className={cn("flex items-start gap-3 p-3 rounded-2xl border transition-all duration-300 hover:shadow-sm group/item", colors.bg, "border-transparent hover:border-slate-100 dark:hover:border-slate-700")}>
                    <div className={cn("p-2 rounded-xl flex-shrink-0 border shadow-sm", colors.icon, colors.text.replace('text-', 'border-').replace('700', '200').replace('400', '800'))}>
                      <Icon className={cn("h-3.5 w-3.5", colors.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest truncate", colors.text)}>
                          {activity.activityType}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1 shrink-0">
                          <Clock className="h-2.5 w-2.5" />
                          {formatActivityTime(activity.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 leading-relaxed">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white/50 dark:bg-slate-900/50 rounded-md border border-slate-100 dark:border-slate-800">
                          <MapPin className="h-2.5 w-2.5 opacity-50" />
                          {activity.farmName}
                        </span>
                        {activity.userName && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white/50 dark:bg-slate-900/50 rounded-md border border-slate-100 dark:border-slate-800">
                            <User className="h-2.5 w-2.5 opacity-50" />
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
      ) : (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 mt-auto">
          <Activity className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {t('liveDashboard.activities.noActivities')}
          </p>
        </div>
      )}
    </div>
  );
};

export default FarmActivitiesWidget;
