import React, { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Users, UserCheck, Clock, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '../MultiTenantAuthProvider';
import { useWorkers } from '../../hooks/useWorkers';
import { useTasks } from '../../hooks/useTasks';
import { isToday } from 'date-fns';
import { useTranslation } from 'react-i18next';

const WorkersActivityWidget: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const { t } = useTranslation();
  const { data: workers = [], isLoading: workersLoading } = useWorkers(currentOrganization?.id || '');
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(currentOrganization?.id || '');

  // Calculate worker statistics
  const stats = useMemo(() => {
    const activeWorkers = workers.filter(w => w.is_active).length;
    const totalWorkers = workers.length;

    // Tasks assigned today
    const tasksToday = tasks.filter(task => {
      if (!task.scheduled_start) return false;
      return isToday(new Date(task.scheduled_start));
    });

    const workersWithTasksToday = new Set(
      tasksToday.filter(t => t.assigned_to).map(t => t.assigned_to)
    ).size;

    // Active tasks (in_progress status)
    const activeTasks = tasks.filter(t => t.status === 'in_progress').length;

    return {
      total: totalWorkers,
      active: activeWorkers,
      workingToday: workersWithTasksToday,
      activeTasks,
      tasksToday: tasksToday.length
    };
  }, [workers, tasks]);

  // Get top workers by task count
  const topWorkers = useMemo(() => {
    const workerTaskCount = tasks.reduce((acc, task) => {
      if (task.assigned_to) {
        acc[task.assigned_to] = (acc[task.assigned_to] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return workers
      .filter(w => workerTaskCount[w.user_id])
      .map(w => ({
        ...w,
        taskCount: workerTaskCount[w.user_id] || 0
      }))
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, 3);
  }, [workers, tasks]);

  const handleViewWorkers = () => {
    navigate({ to: '/workers' });
  };

  if (workersLoading || tasksLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-700 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-900/20 rounded-xl">
            <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('dashboard.widgets.workers.title')}
          </h3>
        </div>
        <button
          onClick={handleViewWorkers}
          className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1 transition-colors"
        >
          {t('dashboard.widgets.viewAll')}
          <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="relative bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/30 dark:to-purple-900/10 rounded-xl p-4 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/20 dark:bg-purple-400/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">{t('dashboard.widgets.workers.active')}</span>
              <UserCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-0.5">
              {stats.active}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {t('dashboard.widgets.workers.outOfTotal', { total: stats.total })}
            </div>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-900/10 rounded-xl p-4 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/20 dark:bg-blue-400/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">{t('dashboard.widgets.workers.today')}</span>
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-0.5">
              {stats.workingToday}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {t('dashboard.widgets.workers.activeToday')}
            </div>
          </div>
        </div>
      </div>

      {/* Active Tasks */}
      <div className="mb-5 p-4 bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-900/30 dark:to-emerald-900/10 rounded-xl border border-green-100 dark:border-green-800">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {t('dashboard.widgets.workers.tasksInProgress')}
            </span>
          </div>
          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.activeTasks}
          </span>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium ml-9">
          {t('dashboard.widgets.workers.tasksScheduledToday', { count: stats.tasksToday })}
        </div>
      </div>

      {/* Top Workers */}
      {topWorkers.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
            {t('dashboard.widgets.workers.mostActive')}
          </h4>
          <div className="space-y-2">
            {topWorkers.map((worker, index) => (
              <div
                key={worker.id}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-gray-900/50 dark:to-gray-900/20 rounded-lg hover:from-purple-50 hover:to-purple-50/50 dark:hover:from-purple-900/20 dark:hover:to-purple-900/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-900/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {worker.first_name} {worker.last_name}
                    </p>
                    {worker.position && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium">
                        {worker.position}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {worker.taskCount}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t('dashboard.widgets.workers.tasks')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {workers.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl flex items-center justify-center">
            <Users className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            {t('dashboard.widgets.workers.empty')}
          </p>
          <button
            onClick={handleViewWorkers}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded-lg transition-colors"
          >
            <Users className="h-4 w-4" />
            {t('dashboard.widgets.workers.addWorkers')}
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkersActivityWidget;
