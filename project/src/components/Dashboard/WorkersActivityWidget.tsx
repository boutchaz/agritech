import React, { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Users, UserCheck, Clock, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '../MultiTenantAuthProvider';
import { useWorkers } from '../../hooks/useWorkers';
import { useTasks } from '../../hooks/useTasks';
import { startOfDay, isToday } from 'date-fns';

const WorkersActivityWidget: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-600" />
          Activité Travailleurs
        </h3>
        <button
          onClick={handleViewWorkers}
          className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
        >
          Voir tout
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Actifs</span>
            <UserCheck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.active}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            sur {stats.total} total
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Aujourd'hui</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.workingToday}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            en activité
          </div>
        </div>
      </div>

      {/* Active Tasks */}
      <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tâches en cours
            </span>
          </div>
          <span className="text-lg font-bold text-green-600 dark:text-green-400">
            {stats.activeTasks}
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {stats.tasksToday} tâches prévues aujourd'hui
        </div>
      </div>

      {/* Top Workers */}
      {topWorkers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Plus actifs
          </h4>
          <div className="space-y-2">
            {topWorkers.map((worker, index) => (
              <div
                key={worker.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {worker.first_name} {worker.last_name}
                    </p>
                    {worker.position && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {worker.position}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    {worker.taskCount}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    tâches
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {workers.length === 0 && (
        <div className="text-center py-6">
          <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aucun travailleur enregistré
          </p>
          <button
            onClick={handleViewWorkers}
            className="mt-2 text-sm text-green-600 hover:text-green-700 dark:text-green-400"
          >
            Ajouter des travailleurs
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkersActivityWidget;
