import React from 'react';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WidgetSkeleton } from '@/components/ui/skeleton';
import type { ConcurrentUser } from '../../services/liveDashboardService';

interface ConcurrentUsersWidgetProps {
  users: ConcurrentUser[];
  total: number;
  isLoading?: boolean;
}

const ConcurrentUsersWidget: React.FC<ConcurrentUsersWidgetProps> = ({
  users,
  total,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return <WidgetSkeleton lines={3} />;
  }

  const getStatusColor = (lastActivity: string) => {
    const minutesAgo = (Date.now() - new Date(lastActivity).getTime()) / 60000;
    if (minutesAgo < 1) return 'bg-green-500';
    if (minutesAgo < 5) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getPageLabel = (page: string) => {
    const pageLabels: Record<string, string> = {
      '/dashboard': t('liveDashboard.pages.dashboard'),
      '/tasks': t('liveDashboard.pages.tasks'),
      '/parcels': t('liveDashboard.pages.parcels'),
      '/harvests': t('liveDashboard.pages.harvests'),
      '/inventory': t('liveDashboard.pages.inventory'),
      '/workers': t('liveDashboard.pages.workers'),
      '/analytics': t('liveDashboard.pages.analytics'),
    };
    return pageLabels[page] || page;
  };

  return (
    <div className="group bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-500 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-50 dark:bg-cyan-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-500">
            <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
            {t('liveDashboard.concurrentUsers.title')}
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

      {/* Main Stat */}
      <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 mb-6 overflow-hidden group/card border border-slate-100 dark:border-slate-700/50">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full -mr-12 -mt-12 group-hover/card:scale-150 transition-transform duration-700"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('liveDashboard.concurrentUsers.online')}
            </span>
            <div className="text-4xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
              {total}
            </div>
            <div className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 mt-1 uppercase tracking-tighter">
              {t('liveDashboard.concurrentUsers.activeNow')}
            </div>
          </div>
          <div className="flex -space-x-3">
            {users.slice(0, 4).map((user, _index) => (
              <div
                key={user.id}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-[10px] font-black border-4 border-slate-50 dark:border-slate-900 shadow-sm"
                title={user.name}
              >
                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            ))}
            {users.length > 4 && (
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-[10px] font-black border-4 border-slate-50 dark:border-slate-900 shadow-sm">
                +{users.length - 4}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User List */}
      {users.length > 0 ? (
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('liveDashboard.concurrentUsers.activeUsers')}
            </h4>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-3"></div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 shadow-sm hover:shadow group/item"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0 border border-cyan-100 dark:border-cyan-800">
                      <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className={cn("absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 shadow-sm", getStatusColor(user.lastActivity))}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                      {user.name}
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase truncate">
                      {user.role}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-[8px] font-black text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-2 py-1 rounded-lg uppercase tracking-widest border border-cyan-100 dark:border-cyan-800">
                    {getPageLabel(user.currentPage)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 mt-auto">
          <Users className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {t('liveDashboard.concurrentUsers.noUsers')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ConcurrentUsersWidget;
