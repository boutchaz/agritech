import React, { useState, useMemo } from 'react';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import type { TaskFilters, TaskStatus } from '../../types/tasks';
import {
  getTaskStatusLabel,
  getTaskPriorityLabel,
  getTaskTypeLabel,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
} from '../../types/tasks';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

const ITEMS_PER_PAGE = 10;

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
  const [filters, setFilters] = useState<TaskFilters>({
    sort_by: 'scheduled_start',
    sort_order: 'desc', // Latest dates first by default
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: tasks = [], isLoading } = useTasks(organizationId, {
    ...filters,
    search: searchTerm,
  });

  // Sort tasks locally (until backend supports sorting)
  const sortedTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      const sortBy = filters.sort_by || 'scheduled_start';
      const sortOrder = filters.sort_order || 'desc';

      let aVal: any;
      let bVal: any;

      if (sortBy === 'scheduled_start') {
        aVal = a.scheduled_start ? new Date(a.scheduled_start).getTime() : 0;
        bVal = b.scheduled_start ? new Date(b.scheduled_start).getTime() : 0;
      } else if (sortBy === 'created_at') {
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else if (sortBy === 'due_date') {
        aVal = a.due_date ? new Date(a.due_date).getTime() : 0;
        bVal = b.due_date ? new Date(b.due_date).getTime() : 0;
      } else if (sortBy === 'priority') {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        aVal = priorityOrder[a.priority] || 0;
        bVal = priorityOrder[b.priority] || 0;
      }

      if (sortOrder === 'desc') {
        return bVal - aVal;
      }
      return aVal - bVal;
    });
    return sorted;
  }, [tasks, filters.sort_by, filters.sort_order]);

  // Paginate tasks
  const totalPages = Math.ceil(sortedTasks.length / ITEMS_PER_PAGE);
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedTasks.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedTasks, currentPage]);

  const handleStatusFilter = (status: TaskStatus | 'all') => {
    setFilters(prev => ({
      ...prev,
      status: status === 'all' ? undefined : status,
    }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleSortChange = (sortBy: TaskFilters['sort_by']) => {
    setFilters(prev => ({
      ...prev,
      sort_by: sortBy,
      sort_order: prev.sort_by === sortBy && prev.sort_order === 'desc' ? 'asc' : 'desc',
    }));
    setCurrentPage(1);
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
            {t('tasks.listPage.tasksCount', { count: tasks.length })}
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
            {tasks.filter(t => t.status === 'pending').length}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">{t('tasks.stats.inProgress')}</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {tasks.filter(t => t.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">{t('tasks.stats.completed')}</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {tasks.filter(t => t.status === 'completed').length}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400 mb-1">{t('tasks.stats.overdue')}</p>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">
            {tasks.filter(t => t.status === 'overdue').length}
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              !filters.status
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
                filters.status === status
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
            onClick={() => handleSortChange('scheduled_start')}
            className={`flex items-center gap-1 px-2 py-1 rounded ${
              filters.sort_by === 'scheduled_start'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            {t('tasks.listPage.sortOptions.scheduledStart')}
            {filters.sort_by === 'scheduled_start' && (
              <ArrowUpDown className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={() => handleSortChange('priority')}
            className={`flex items-center gap-1 px-2 py-1 rounded ${
              filters.sort_by === 'priority'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t('tasks.listPage.sortOptions.priority')}
            {filters.sort_by === 'priority' && (
              <ArrowUpDown className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={() => handleSortChange('created_at')}
            className={`flex items-center gap-1 px-2 py-1 rounded ${
              filters.sort_by === 'created_at'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t('tasks.listPage.sortOptions.createdAt')}
            {filters.sort_by === 'created_at' && (
              <ArrowUpDown className="w-3 h-3" />
            )}
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
          <p className="text-gray-600 dark:text-gray-400">{t('tasks.listPage.empty.title')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">{t('tasks.listPage.empty.description')}</p>
        </div>
      ) : (
        <div className="space-y-3" data-tour="task-list">
          {paginatedTasks.map((task) => (
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
      {!isLoading && sortedTasks.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('tasks.listPage.pagination.displaying', {
              from: ((currentPage - 1) * ITEMS_PER_PAGE) + 1,
              to: Math.min(currentPage * ITEMS_PER_PAGE, sortedTasks.length),
              total: sortedTasks.length
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages around current page
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksList;

