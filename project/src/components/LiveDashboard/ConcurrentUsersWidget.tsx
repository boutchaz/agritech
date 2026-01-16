import React from 'react';
import { Users, Clock, Circle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
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
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
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
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7 hover:shadow-md hover:border-cyan-200 dark:hover:border-cyan-700 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-900/40 dark:to-cyan-900/20 rounded-xl">
            <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('liveDashboard.concurrentUsers.title')}
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

      {/* Main Stat */}
      <div className="relative bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-900/30 dark:to-cyan-900/10 rounded-xl p-4 mb-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-200/20 dark:bg-cyan-400/10 rounded-full blur-2xl"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">
              {t('liveDashboard.concurrentUsers.online')}
            </span>
            <div className="text-4xl font-bold text-gray-900 dark:text-white mt-1">
              {total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {t('liveDashboard.concurrentUsers.activeNow')}
            </div>
          </div>
          <div className="flex -space-x-2">
            {users.slice(0, 4).map((user, index) => (
              <div
                key={user.id}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold border-2 border-white dark:border-gray-800"
                title={user.name}
              >
                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
            ))}
            {users.length > 4 && (
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-bold border-2 border-white dark:border-gray-800">
                +{users.length - 4}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {t('liveDashboard.concurrentUsers.activeUsers')}
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-gray-900/50 dark:to-gray-900/20 rounded-lg hover:from-cyan-50 hover:to-cyan-50/50 dark:hover:from-cyan-900/20 dark:hover:to-cyan-900/10 transition-all duration-200"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-900/40 dark:to-cyan-900/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${getStatusColor(user.lastActivity)}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium">
                    {user.role}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-2 py-1 rounded-md">
                  {getPageLabel(user.currentPage)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {users.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl flex items-center justify-center">
            <Users className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('liveDashboard.concurrentUsers.noUsers')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ConcurrentUsersWidget;
