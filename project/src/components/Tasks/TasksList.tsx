import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Calendar,
  User,
  MapPin,
  Loader2,
} from 'lucide-react';
import { usePaginatedTasks, useTasks } from '../../hooks/useTasks';
import type { TaskStatus } from '../../types/tasks';
import {
  getTaskStatusLabel,
  getTaskPriorityLabel,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
} from '../../types/tasks';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useServerTableState, SortableHeader, DataTablePagination } from '@/components/ui/data-table';

interface TasksListProps {
  organizationId: string;
  onSelectTask?: (taskId: string) => void;
  onCreateTask?: () => void;
}

const TasksList: React.FC<TasksListProps> = ({
  organizationId,
  onSelectTask,
  onCreateTask,
}) => {
  const { t, i18n } = useTranslation();
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'scheduled_start', direction: 'desc' },
  });

  const { data: paginatedData, isLoading, isFetching } = usePaginatedTasks(organizationId, {
    ...tableState.queryParams,
    status: filterStatus !== 'all' ? filterStatus : undefined,
  });

  const { data: allTasksForStats = [] } = useTasks(organizationId, {});

  const tasks = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const handleStatusFilter = (status: TaskStatus | 'all') => {
    setFilterStatus(status);
    tableState.setPage(1);
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('tasks.listPage.title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('tasks.listPage.tasksCount', { count: totalItems })}
          </p>
        </div>
        {onCreateTask && (
          <button
            data-tour="task-create"
            onClick={onCreateTask}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            {t('tasks.listPage.newTask')}
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('tasks.stats.pending')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {allTasksForStats.filter(t => t.status === 'pending').length}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">{t('tasks.stats.inProgress')}</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {allTasksForStats.filter(t => t.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">{t('tasks.stats.completed')}</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {allTasksForStats.filter(t => t.status === 'completed').length}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400 mb-1">{t('tasks.stats.overdue')}</p>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">
            {allTasksForStats.filter(t => t.status === 'overdue').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('tasks.listPage.searchPlaceholder')}
            value={tableState.search}
            onChange={(e) => tableState.setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('tasks.listPage.filters.all')}
          </button>
          {(['pending', 'assigned', 'in_progress', 'completed', 'overdue'] as TaskStatus[]).map(status => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {t(`tasks.listPage.filters.${status}`)}
            </button>
          ))}
        </div>

        {/* Sorting controls */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">{t('tasks.listPage.sortBy')}:</span>
          <button
            onClick={() => tableState.handleSort('scheduled_start')}
            className={`flex items-center gap-1 px-2 py-1 rounded ${
              tableState.sortConfig.key === 'scheduled_start'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            {t('tasks.listPage.sortOptions.scheduledStart')}
          </button>
          <button
            onClick={() => tableState.handleSort('priority')}
            className={`flex items-center gap-1 px-2 py-1 rounded ${
              tableState.sortConfig.key === 'priority'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t('tasks.listPage.sortOptions.priority')}
          </button>
          <button
            onClick={() => tableState.handleSort('created_at')}
            className={`flex items-center gap-1 px-2 py-1 rounded ${
              tableState.sortConfig.key === 'created_at'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t('tasks.listPage.sortOptions.createdAt')}
          </button>
        </div>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {tableState.search || filterStatus !== 'all'
              ? t('tasks.listPage.empty.filtered', 'No tasks match your filters.')
              : t('tasks.listPage.empty.title')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">{t('tasks.listPage.empty.description')}</p>
        </div>
      ) : (
        <div className="space-y-3" data-tour="task-list">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onSelectTask?.(task.id)}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(task.status)}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {task.title}
                    </h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${TASK_PRIORITY_COLORS[task.priority]}`}>
                      {getTaskPriorityLabel(task.priority, i18n.language)}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${TASK_STATUS_COLORS[task.status]}`}>
                      {getTaskStatusLabel(task.status, i18n.language)}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {task.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    {task.worker_name && (
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{task.worker_name}</span>
                      </div>
                    )}

                    {task.farm_name && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{task.farm_name}</span>
                        {task.parcel_name && <span> - {task.parcel_name}</span>}
                      </div>
                    )}

                    {task.scheduled_start && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDistance(new Date(task.scheduled_start), new Date(), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </div>
                    )}

                    {task.estimated_duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{task.estimated_duration}h</span>
                      </div>
                    )}
                  </div>

                  {task.completion_percentage > 0 && task.status !== 'completed' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>{t('tasks.listPage.progress')}</span>
                        <span>{task.completion_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${task.completion_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && totalItems > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <DataTablePagination
            page={tableState.page}
            totalPages={totalPages}
            pageSize={tableState.pageSize}
            totalItems={totalItems}
            onPageChange={tableState.setPage}
            onPageSizeChange={tableState.setPageSize}
          />
        </div>
      )}
    </div>
  );
};

export default TasksList;

