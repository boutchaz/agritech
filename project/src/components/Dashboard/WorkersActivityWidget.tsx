import {  useMemo  } from "react";
import { useNavigate } from '@tanstack/react-router';
import { Users, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useWorkers } from '../../hooks/useWorkers';
import { useTasks } from '../../hooks/useTasks';
import { isToday } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const WorkersActivityWidget = () => {
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
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 h-full flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <Skeleton className="h-5 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="space-y-3 mt-auto">
          <div className="flex items-center justify-between px-1 mb-3">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-px flex-1 mx-3 rounded" />
          </div>
          {[1, 2, 3].map((_, skIdx) => (
            <Skeleton key={"sk-" + skIdx} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-500 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-500">
            <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight uppercase">
            {t('dashboard.widgets.workers.title')}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewWorkers}
          className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 h-8 rounded-xl px-2 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 overflow-hidden group/card border border-slate-100 dark:border-slate-700/50">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-700"></div>
          <div className="relative">
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('dashboard.widgets.workers.active')}</span>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{stats.active}</div>
            <div className="text-[9px] font-bold text-purple-600 dark:text-purple-400 mt-1 uppercase tracking-tighter">{t('dashboard.widgets.workers.outOfTotal', { total: stats.total })}</div>
          </div>
        </div>

        <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 overflow-hidden group/card border border-slate-100 dark:border-slate-700/50">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-700"></div>
          <div className="relative">
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('dashboard.widgets.workers.today')}</span>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{stats.workingToday}</div>
            <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 mt-1 uppercase tracking-tighter">{t('dashboard.widgets.workers.activeToday')}</div>
          </div>
        </div>
      </div>

      {/* Active Tasks Card */}
      <div className="mb-6 p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 group/active transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl group-hover/active:scale-110 transition-transform duration-500">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">
              {t('dashboard.widgets.workers.tasksInProgress')}
            </span>
          </div>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
            {stats.activeTasks}
          </span>
        </div>
        <div className="h-px w-full bg-emerald-100 dark:bg-emerald-900/30 my-3"></div>
        <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-tight">
          {t('dashboard.widgets.workers.tasksScheduledToday', { count: stats.tasksToday })}
        </div>
      </div>

      {/* Top Workers */}
      {topWorkers.length > 0 ? (
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('dashboard.widgets.workers.mostActive')}
            </h4>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-3"></div>
          </div>
          <div className="space-y-2">
            {topWorkers.map((worker, index) => (
              <div
                key={worker.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 shadow-sm hover:shadow group/item"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 border border-purple-100 dark:border-purple-800">
                    <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate uppercase tracking-tight">
                      {worker.first_name} {worker.last_name}
                    </p>
                    {worker.position && (
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase truncate">
                        {worker.position}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 tabular-nums leading-none">
                    {worker.taskCount}
                  </div>
                  <div className="text-[8px] font-medium text-slate-400 uppercase tracking-widest mt-1">
                    {t('dashboard.widgets.workers.tasks')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 mt-auto">
          <Users className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
            {t('dashboard.widgets.workers.empty')}
          </p>
          <Button
            size="sm"
            onClick={handleViewWorkers}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl px-4"
          >
            {t('dashboard.widgets.workers.addWorkers')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorkersActivityWidget;
