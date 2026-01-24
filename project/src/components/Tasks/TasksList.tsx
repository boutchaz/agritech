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
  Play,
  Pause,
  CheckSquare,
  MoreVertical,
  Timer,
  Wheat,
  MessageSquare,
  CalendarClock,
  Flame,
  Target,
} from 'lucide-react';
import { usePaginatedTasks, useTasks, useUpdateTask } from '../../hooks/useTasks';
import { tasksApi } from '../../lib/api/tasks';
import { useQueryClient } from '@tanstack/react-query';
import type { TaskStatus, TaskSummary } from '../../types/tasks';
import {
  getTaskStatusLabel,
  getTaskPriorityLabel,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
} from '../../types/tasks';
import { formatDistance, differenceInDays, isToday, isTomorrow, isPast } from 'date-fns';
import { fr, enUS, ar } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useServerTableState, DataTablePagination } from '@/components/ui/data-table';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Checkbox } from '../ui/checkbox';

interface TasksListProps {
  organizationId: string;
  onSelectTask?: (taskId: string) => void;
  onCreateTask?: () => void;
}

// Helper to get due date urgency indicator
const getDueDateStatus = (dueDate: string | null | undefined) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  if (isPast(due) && !isToday(due)) {
    return { label: 'Overdue', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle };
  }
  if (isToday(due)) {
    return { label: 'Due Today', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Flame };
  }
  if (isTomorrow(due)) {
    return { label: 'Due Tomorrow', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: CalendarClock };
  }
  const daysUntil = differenceInDays(due, today);
  if (daysUntil <= 7) {
    return { label: `${daysUntil}d left`, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Calendar };
  }
  return null;
};

const TasksList: React.FC<TasksListProps> = ({
  organizationId,
  onSelectTask,
  onCreateTask,
}) => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Get locale for date-fns
  const getLocale = () => {
    if (i18n.language.startsWith('fr')) return fr;
    if (i18n.language.startsWith('ar')) return ar;
    return enUS;
  };

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

  // Calculate enhanced stats
  const stats = {
    pending: allTasksForStats.filter(t => t.status === 'pending').length,
    in_progress: allTasksForStats.filter(t => t.status === 'in_progress').length,
    completed: allTasksForStats.filter(t => t.status === 'completed').length,
    overdue: allTasksForStats.filter(t => t.status === 'overdue').length,
    dueToday: allTasksForStats.filter(t => t.due_date && isToday(new Date(t.due_date))).length,
    completionRate: allTasksForStats.length > 0
      ? Math.round((allTasksForStats.filter(t => t.status === 'completed').length / allTasksForStats.length) * 100)
      : 0,
    totalHoursLogged: allTasksForStats.reduce((sum, t) => sum + (t.actual_duration || 0), 0),
  };

  const handleStatusFilter = (status: TaskStatus | 'all') => {
    setFilterStatus(status);
    tableState.setPage(1);
  };

  // Quick action handlers
  const handleQuickStart = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    try {
      await updateTask.mutateAsync({
        taskId,
        organizationId,
        updates: { status: 'in_progress', actual_start: new Date().toISOString() },
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Failed to start task:', error);
    }
  };

  const handleQuickPause = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    try {
      await updateTask.mutateAsync({
        taskId,
        organizationId,
        updates: { status: 'paused' },
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Failed to pause task:', error);
    }
  };

  const handleQuickComplete = async (e: React.MouseEvent, task: TaskSummary) => {
    e.stopPropagation();
    // For harvest tasks, open the detail dialog instead
    if (task.task_type === 'harvesting') {
      onSelectTask?.(task.id);
      return;
    }
    try {
      await tasksApi.complete(organizationId, task.id, {});
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  // Bulk action handlers
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const toggleAllTasks = () => {
    if (selectedTaskIds.size === tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasks.map(t => t.id)));
    }
  };

  const handleBulkStatusChange = async (newStatus: TaskStatus) => {
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedTaskIds).map(taskId =>
        updateTask.mutateAsync({
          taskId,
          organizationId,
          updates: { status: newStatus },
        })
      );
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTaskIds(new Set());
    } catch (error) {
      console.error('Failed to update tasks:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'paused':
        return <Pause className="w-5 h-5 text-amber-600" />;
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

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Pending */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border-l-4 border-gray-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('tasks.stats.pending')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
            </div>
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Clock className="w-5 h-5 text-gray-500" />
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t('tasks.stats.inProgress')}</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.in_progress}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Play className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide">{t('tasks.stats.completed')}</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.completed}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wide">{t('tasks.stats.overdue')}</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.overdue}</p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        {/* Due Today */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wide">{t('tasks.stats.dueToday', 'Due Today')}</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.dueToday}</p>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">{t('tasks.stats.completionRate', 'Completion')}</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{stats.completionRate}%</p>
            </div>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          {/* Mini progress bar */}
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedTaskIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedTaskIds.size} {t('tasks.selected', 'task(s) selected')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedTaskIds(new Set())}
              disabled={bulkActionLoading}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" disabled={bulkActionLoading}>
                  {bulkActionLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {t('tasks.changeStatus', 'Change Status')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkStatusChange('in_progress')}>
                  <Play className="w-4 h-4 mr-2 text-blue-600" />
                  {t('tasks.status.inProgress', 'Start')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusChange('paused')}>
                  <Pause className="w-4 h-4 mr-2 text-amber-600" />
                  {t('tasks.status.paused', 'Pause')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusChange('completed')}>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  {t('tasks.status.completed', 'Complete')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkStatusChange('cancelled')} className="text-red-600">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {t('tasks.status.cancelled', 'Cancel')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

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
          {onCreateTask && (
            <Button onClick={onCreateTask} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              {t('tasks.listPage.newTask')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3" data-tour="task-list">
          {/* Select All Row */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <Checkbox
              checked={selectedTaskIds.size === tasks.length && tasks.length > 0}
              onCheckedChange={toggleAllTasks}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('tasks.selectAll', 'Select all')}
            </span>
          </div>

          {tasks.map((task) => {
            const dueDateStatus = getDueDateStatus(task.due_date);
            const canStart = task.status === 'pending' || task.status === 'assigned';
            const canPause = task.status === 'in_progress';
            const canComplete = task.status === 'in_progress' || task.status === 'paused';
            const isSelected = selectedTaskIds.has(task.id);

            return (
              <div
                key={task.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all cursor-pointer ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-stretch">
                  {/* Checkbox Column */}
                  <div
                    className="flex items-center px-4 border-r dark:border-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskSelection(task.id);
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleTaskSelection(task.id)}
                    />
                  </div>

                  {/* Main Content */}
                  <div
                    className="flex-1 p-4"
                    onClick={() => onSelectTask?.(task.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getStatusIcon(task.status)}
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {task.title}
                          </h3>
                          {task.task_type === 'harvesting' && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <Wheat className="w-3 h-3 mr-1" />
                              {t('tasks.type.harvesting', 'Harvest')}
                            </span>
                          )}
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TASK_PRIORITY_COLORS[task.priority]}`}>
                            {getTaskPriorityLabel(task.priority, i18n.language)}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TASK_STATUS_COLORS[task.status]}`}>
                            {getTaskStatusLabel(task.status, i18n.language)}
                          </span>
                          {/* Due Date Indicator */}
                          {dueDateStatus && task.status !== 'completed' && task.status !== 'cancelled' && (
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${dueDateStatus.color}`}>
                              <dueDateStatus.icon className="w-3 h-3 mr-1" />
                              {dueDateStatus.label}
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
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
                                  locale: getLocale(),
                                })}
                              </span>
                            </div>
                          )}

                          {task.estimated_duration && (
                            <div className="flex items-center gap-1">
                              <Timer className="w-4 h-4" />
                              <span>{task.estimated_duration}h {t('tasks.estimated', 'est.')}</span>
                            </div>
                          )}

                          {task.actual_duration && task.actual_duration > 0 && (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <Clock className="w-4 h-4" />
                              <span>{task.actual_duration}h {t('tasks.logged', 'logged')}</span>
                            </div>
                          )}

                          {/* Comment count */}
                          {task.comment_count && task.comment_count > 0 && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              <span>{task.comment_count}</span>
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
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${task.completion_percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                        {canStart && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={(e) => handleQuickStart(e, task.id)}
                            disabled={updateTask.isPending}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            {t('tasks.start', 'Start')}
                          </Button>
                        )}

                        {canPause && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-600 border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            onClick={(e) => handleQuickPause(e, task.id)}
                            disabled={updateTask.isPending}
                          >
                            <Pause className="w-4 h-4 mr-1" />
                            {t('tasks.pause', 'Pause')}
                          </Button>
                        )}

                        {canComplete && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={(e) => handleQuickComplete(e, task)}
                            disabled={updateTask.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {task.task_type === 'harvesting'
                              ? t('tasks.completeHarvest', 'Harvest')
                              : t('tasks.complete', 'Complete')}
                          </Button>
                        )}

                        {/* More Actions Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onSelectTask?.(task.id)}>
                              {t('tasks.viewDetails', 'View Details')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {task.status !== 'cancelled' && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await updateTask.mutateAsync({
                                    taskId: task.id,
                                    organizationId,
                                    updates: { status: 'cancelled' },
                                  });
                                  queryClient.invalidateQueries({ queryKey: ['tasks'] });
                                }}
                              >
                                <AlertCircle className="w-4 h-4 mr-2" />
                                {t('tasks.cancel', 'Cancel Task')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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

