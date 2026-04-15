import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  ClipboardList,
  Plus,
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
  ListChecks,
  Repeat,
  GitBranch,
  Paperclip,
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
import {
  useServerTableState,
  DataTablePagination,
  FilterBar,
  ListPageLayout,
  ListPageHeader,
  ResponsiveList,
} from '@/components/ui/data-table';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Checkbox } from '../ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';

interface TasksListProps {
  organizationId: string;
  onSelectTask?: (taskId: string) => void;
  onCreateTask?: () => void;
}

/** Maps TaskStatus (API snake_case) to keys under tasks.listPage.filters (in_progress → inProgress). */
const TASK_LIST_FILTER_I18N_KEY: Record<TaskStatus, string> = {
  pending: 'pending',
  assigned: 'assigned',
  in_progress: 'inProgress',
  paused: 'paused',
  completed: 'completed',
  cancelled: 'cancelled',
  overdue: 'overdue',
};

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

const TasksList = ({
  organizationId,
  onSelectTask,
  onCreateTask,
}: TasksListProps) => {
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
    assigned: allTasksForStats.filter(t => t.status === 'assigned').length,
    in_progress: allTasksForStats.filter(t => t.status === 'in_progress').length,
    completed: allTasksForStats.filter(t => t.status === 'completed').length,
    on_hold: allTasksForStats.filter(t => t.status === 'paused').length,
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

  const renderTaskBadges = (task: TaskSummary, dueDateStatus: ReturnType<typeof getDueDateStatus>) => (
    <>
      {task.task_type === 'harvesting' && (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Wheat className="w-3 h-3 mr-1" />
          {t('tasks.type.harvesting', 'Harvest')}
        </span>
      )}
      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TASK_PRIORITY_COLORS[task.priority]}`}>
        {getTaskPriorityLabel(task.priority, i18n.language as 'en' | 'fr')}
      </span>
      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TASK_STATUS_COLORS[task.status]}`}>
        {getTaskStatusLabel(task.status, i18n.language as 'en' | 'fr')}
      </span>
      {dueDateStatus && task.status !== 'completed' && task.status !== 'cancelled' && (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${dueDateStatus.color}`}>
          <dueDateStatus.icon className="w-3 h-3 mr-1" />
          {dueDateStatus.label}
        </span>
      )}
    </>
  );

  const renderTaskMeta = (task: TaskSummary) => (
    <>
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

      {task.comment_count && task.comment_count > 0 && (
        <div className="flex items-center gap-1">
          <MessageSquare className="w-4 h-4" />
          <span>{task.comment_count}</span>
        </div>
      )}

      {task.checklist && task.checklist.length > 0 && (
        <div className="flex items-center gap-1 text-gray-500">
          <ListChecks className="w-3.5 h-3.5" />
          <span className="text-xs">
            {task.checklist.filter((item: { completed?: boolean }) => item.completed).length}/{task.checklist.length}
          </span>
        </div>
      )}

      {task.attachments && task.attachments.length > 0 && (
        <div className="flex items-center gap-1 text-gray-500">
          <Paperclip className="w-3.5 h-3.5" />
          <span className="text-xs">{task.attachments.length}</span>
        </div>
      )}

      {task.repeat_pattern && (
        <div className="flex items-center gap-1 text-purple-500" title={`Recurring: ${task.repeat_pattern.frequency}`}>
          <Repeat className="w-3.5 h-3.5" />
        </div>
      )}

      {task.parent_task_id && (
        <div className="flex items-center gap-1 text-indigo-500" title="Part of recurring series">
          <GitBranch className="w-3.5 h-3.5" />
        </div>
      )}
    </>
  );

  const renderTaskActions = (task: TaskSummary, compact = false) => {
    const canStart = task.status === 'pending' || task.status === 'assigned';
    const canPause = task.status === 'in_progress';
    const canComplete = task.status === 'in_progress' || task.status === 'paused';

    return (
      <div className={`flex items-center ${compact ? 'justify-end gap-2' : 'gap-2 ml-2 sm:ml-4'}`}>
        <div className={`${compact ? 'hidden xl:flex items-center gap-2' : 'hidden md:flex items-center gap-2'}`}>
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
              variant="green"
              size="sm"
              onClick={(e) => handleQuickComplete(e, task)}
              disabled={updateTask.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {task.task_type === 'harvesting'
                ? t('tasks.completeHarvest', 'Harvest')
                : t('tasks.complete', 'Complete')}
            </Button>
          )}
        </div>

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
            <div className={compact ? 'xl:hidden' : 'md:hidden'}>
              <DropdownMenuSeparator />
              {canStart && (
                <DropdownMenuItem onClick={(e) => handleQuickStart(e as unknown as React.MouseEvent, task.id)}>
                  <Play className="w-4 h-4 mr-2 text-blue-600" />
                  {t('tasks.start', 'Start')}
                </DropdownMenuItem>
              )}
              {canPause && (
                <DropdownMenuItem onClick={(e) => handleQuickPause(e as unknown as React.MouseEvent, task.id)}>
                  <Pause className="w-4 h-4 mr-2 text-amber-600" />
                  {t('tasks.pause', 'Pause')}
                </DropdownMenuItem>
              )}
              {canComplete && (
                <DropdownMenuItem onClick={(e) => handleQuickComplete(e as unknown as React.MouseEvent, task)}>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  {task.task_type === 'harvesting'
                    ? t('tasks.completeHarvest', 'Harvest')
                    : t('tasks.complete', 'Complete')}
                </DropdownMenuItem>
              )}
            </div>
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
    );
  };

  const renderTaskCard = (task: TaskSummary) => {
    const dueDateStatus = getDueDateStatus(task.due_date);
    const isSelected = selectedTaskIds.has(task.id);

    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="pt-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleTaskSelection(task.id)}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onSelectTask?.(task.id)}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {getStatusIcon(task.status)}
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white break-words">
                    {task.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {renderTaskBadges(task, dueDateStatus)}
                </div>

                {task.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-2">
                  {task.farm_name && (
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{task.farm_name}{task.parcel_name ? ` - ${task.parcel_name}` : ''}</span>
                    </div>
                  )}
                  {task.worker_name && (
                    <div className="flex items-center gap-1 min-w-0">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{task.worker_name}</span>
                    </div>
                  )}
                  {task.due_date && (
                    <div className="flex items-center gap-1 min-w-0">
                      <CalendarClock className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        {formatDistance(new Date(task.due_date), new Date(), {
                          addSuffix: true,
                          locale: getLocale(),
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                  {renderTaskMeta(task)}
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
              </button>

              {renderTaskActions(task)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTaskTableRow = (task: TaskSummary) => {
    const dueDateStatus = getDueDateStatus(task.due_date);
    const isSelected = selectedTaskIds.has(task.id);

    return (
      <>
        <td className="px-4 py-4 align-top">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleTaskSelection(task.id)}
          />
        </td>
        <td className="px-4 py-4 align-top min-w-[320px]">
          <button
            type="button"
            className="w-full text-left"
            onClick={() => onSelectTask?.(task.id)}
          >
            <div className="flex items-start gap-2 mb-2">
              {getStatusIcon(task.status)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 dark:text-white">{task.title}</span>
                  {task.task_type === 'harvesting' && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Wheat className="w-3 h-3 mr-1" />
                      {t('tasks.type.harvesting', 'Harvest')}
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {task.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {task.comment_count && task.comment_count > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{task.comment_count}</span>
                    </div>
                  )}
                  {task.checklist && task.checklist.length > 0 && (
                    <div className="flex items-center gap-1">
                      <ListChecks className="w-3.5 h-3.5" />
                      <span>
                        {task.checklist.filter((item: { completed?: boolean }) => item.completed).length}/{task.checklist.length}
                      </span>
                    </div>
                  )}
                  {task.attachments && task.attachments.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{task.attachments.length}</span>
                    </div>
                  )}
                  {task.repeat_pattern && <Repeat className="w-3.5 h-3.5 text-purple-500" />}
                  {task.parent_task_id && <GitBranch className="w-3.5 h-3.5 text-indigo-500" />}
                </div>
                {task.completion_percentage > 0 && task.status !== 'completed' && (
                  <div className="mt-3 max-w-xs">
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
            </div>
          </button>
        </td>
        <td className="px-4 py-4 align-top min-w-[220px]">
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            {task.worker_name ? (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{task.worker_name}</span>
              </div>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">—</span>
            )}
            {task.farm_name && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{task.farm_name}{task.parcel_name ? ` - ${task.parcel_name}` : ''}</span>
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
          </div>
        </td>
        <td className="px-4 py-4 align-top">
          <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className={`inline-flex w-fit px-2 py-0.5 text-xs font-medium rounded-full ${TASK_PRIORITY_COLORS[task.priority]}`}>
              {getTaskPriorityLabel(task.priority, i18n.language as 'en' | 'fr')}
            </span>
            {task.estimated_duration && <span>{task.estimated_duration}h {t('tasks.estimated', 'est.')}</span>}
            {task.actual_duration && task.actual_duration > 0 && (
              <span className="text-green-600 dark:text-green-400">{task.actual_duration}h {t('tasks.logged', 'logged')}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-4 align-top">
          <div className="flex flex-col gap-2">
            <span className={`inline-flex w-fit px-2 py-0.5 text-xs font-medium rounded-full ${TASK_STATUS_COLORS[task.status]}`}>
              {getTaskStatusLabel(task.status, i18n.language as 'en' | 'fr')}
            </span>
            {dueDateStatus && task.status !== 'completed' && task.status !== 'cancelled' && (
              <span className={`inline-flex w-fit items-center px-2 py-0.5 text-xs font-medium rounded-full ${dueDateStatus.color}`}>
                <dueDateStatus.icon className="w-3 h-3 mr-1" />
                {dueDateStatus.label}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-4 align-top min-w-[180px]">
          {task.due_date ? (
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <CalendarClock className="w-4 h-4" />
                <span>
                  {formatDistance(new Date(task.due_date), new Date(), {
                    addSuffix: true,
                    locale: getLocale(),
                  })}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
          )}
        </td>
        <td className="px-4 py-4 align-top">
          {renderTaskActions(task, true)}
        </td>
      </>
    );
  };

  const emptyMessage = tableState.search || filterStatus !== 'all'
    ? t('tasks.listPage.empty.filtered', 'No tasks match your filters.')
    : t('tasks.listPage.empty.description');

  return (
    <ListPageLayout
      header={
        <ListPageHeader
          variant="shell"
          actions={onCreateTask ? (
            <Button data-tour="task-create" onClick={onCreateTask}>
              <Plus className="w-5 h-5" />
              {t('tasks.listPage.newTask')}
            </Button>
          ) : undefined}
        />
      }
      stats={
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4">
          <div className="min-w-0 overflow-hidden rounded-lg border-l-4 border-gray-400 bg-white p-2 shadow dark:bg-gray-800 sm:p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('tasks.stats.pending')}</p>
                <p className="truncate text-xl font-bold text-gray-900 sm:text-2xl lg:text-xl xl:text-2xl dark:text-white">{stats.pending}</p>
              </div>
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 sm:flex">
                <Clock className="h-4 w-4 shrink-0 text-gray-500 xl:h-5 xl:w-5" />
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-lg border-l-4 border-blue-400 bg-white p-2 shadow dark:bg-gray-800 sm:p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs uppercase tracking-wide text-blue-500 dark:text-blue-400">{t('tasks.stats.assigned', 'Assigned')}</p>
                <p className="truncate text-xl font-bold text-blue-900 sm:text-2xl lg:text-xl xl:text-2xl dark:text-blue-100">{stats.assigned}</p>
              </div>
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 sm:flex">
                <User className="h-4 w-4 shrink-0 text-blue-500 xl:h-5 xl:w-5" />
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-lg border-l-4 border-purple-500 bg-white p-2 shadow dark:bg-gray-800 sm:p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs uppercase tracking-wide text-purple-600 dark:text-purple-400">{t('tasks.stats.inProgress')}</p>
                <p className="truncate text-xl font-bold text-purple-900 sm:text-2xl lg:text-xl xl:text-2xl dark:text-purple-100">{stats.in_progress}</p>
              </div>
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 sm:flex">
                <Play className="h-4 w-4 shrink-0 text-purple-600 xl:h-5 xl:w-5" />
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-lg border-l-4 border-green-500 bg-white p-2 shadow dark:bg-gray-800 sm:p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs uppercase tracking-wide text-green-600 dark:text-green-400">{t('tasks.stats.completed')}</p>
                <p className="truncate text-xl font-bold text-green-900 sm:text-2xl lg:text-xl xl:text-2xl dark:text-green-100">{stats.completed}</p>
              </div>
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 sm:flex">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-600 xl:h-5 xl:w-5" />
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-lg border-l-4 border-amber-500 bg-white p-2 shadow dark:bg-gray-800 sm:p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">{t('tasks.stats.onHold', 'On Hold')}</p>
                <p className="truncate text-xl font-bold text-amber-900 sm:text-2xl lg:text-xl xl:text-2xl dark:text-amber-100">{stats.on_hold}</p>
              </div>
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 sm:flex">
                <Pause className="h-4 w-4 shrink-0 text-amber-600 xl:h-5 xl:w-5" />
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-lg border-l-4 border-red-500 bg-white p-2 shadow dark:bg-gray-800 sm:p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs uppercase tracking-wide text-red-600 dark:text-red-400">{t('tasks.stats.overdue')}</p>
                <p className="truncate text-xl font-bold text-red-900 sm:text-2xl lg:text-xl xl:text-2xl dark:text-red-100">{stats.overdue}</p>
              </div>
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 sm:flex">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 xl:h-5 xl:w-5" />
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-lg border-l-4 border-emerald-500 bg-white p-2 shadow dark:bg-gray-800 sm:p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400">{t('tasks.stats.completionRate', 'Completion')}</p>
                <p className="truncate text-xl font-bold text-emerald-900 sm:text-2xl lg:text-xl xl:text-2xl dark:text-emerald-100">{stats.completionRate}%</p>
              </div>
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 sm:flex">
                <Target className="h-4 w-4 shrink-0 text-emerald-600 xl:h-5 xl:w-5" />
              </div>
            </div>
            <div className="mt-2 h-1.5 w-full min-w-0 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-1.5 rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
        </div>
      }
      filters={
        <div className="space-y-4">
          <FilterBar
            searchValue={tableState.search}
            onSearchChange={(value) => tableState.setSearch(value)}
            searchPlaceholder={t('tasks.listPage.searchPlaceholder')}
            isSearching={isFetching}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => handleStatusFilter('all')}
            >
              {t('tasks.listPage.filters.all')}
            </Button>
            {(['pending', 'assigned', 'in_progress', 'completed', 'paused', 'overdue'] as TaskStatus[]).map(status => (
              <Button
                key={status}
                size="sm"
                variant={filterStatus === status ? 'default' : 'outline'}
                onClick={() => handleStatusFilter(status)}
              >
                {t(`tasks.listPage.filters.${TASK_LIST_FILTER_I18N_KEY[status]}`)}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm overflow-x-auto pb-1">
            <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">{t('tasks.listPage.sortBy')}:</span>
            <Button
              size="sm"
              variant={tableState.sortConfig.key === 'scheduled_start' ? 'default' : 'ghost'}
              onClick={() => tableState.handleSort('scheduled_start')}
            >
              <Calendar className="w-4 h-4" />
              {t('tasks.listPage.sortOptions.scheduledStart')}
            </Button>
            <Button
              size="sm"
              variant={tableState.sortConfig.key === 'priority' ? 'default' : 'ghost'}
              onClick={() => tableState.handleSort('priority')}
            >
              {t('tasks.listPage.sortOptions.priority')}
            </Button>
            <Button
              size="sm"
              variant={tableState.sortConfig.key === 'created_at' ? 'default' : 'ghost'}
              onClick={() => tableState.handleSort('created_at')}
            >
              {t('tasks.listPage.sortOptions.createdAt')}
            </Button>
          </div>
        </div>
      }
      pagination={
        !isLoading && totalItems > 0 ? (
          <DataTablePagination
            page={tableState.page}
            totalPages={totalPages}
            pageSize={tableState.pageSize}
            totalItems={totalItems}
            onPageChange={tableState.setPage}
            onPageSizeChange={tableState.setPageSize}
          />
        ) : undefined
      }
    >
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

      <div className="space-y-3" data-tour="task-list">
        {!isLoading && tasks.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg lg:hidden">
            <Checkbox
              checked={selectedTaskIds.size === tasks.length && tasks.length > 0}
              onCheckedChange={toggleAllTasks}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('tasks.selectAll', 'Select all')}
            </span>
          </div>
        )}

        <ResponsiveList
          items={tasks}
          isLoading={isLoading}
          isFetching={isFetching}
          keyExtractor={(task) => task.id}
          renderCard={renderTaskCard}
          renderTable={renderTaskTableRow}
          renderTableHeader={(
            <tr>
              <th className="px-4 py-3 text-left w-12">
                <Checkbox
                  checked={selectedTaskIds.size === tasks.length && tasks.length > 0}
                  onCheckedChange={toggleAllTasks}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tasks.listPage.title')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tasks.assignee', 'Assignee & Farm')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tasks.priority', 'Priority')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tasks.status.label', 'Status')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('tasks.dueDate', 'Due date')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('common.actions', 'Actions')}
              </th>
            </tr>
          )}
          emptyIcon={ClipboardList}
          emptyTitle={tableState.search || filterStatus !== 'all' ? undefined : t('tasks.listPage.empty.title')}
          emptyMessage={emptyMessage}
          emptyAction={onCreateTask && !(tableState.search || filterStatus !== 'all') ? {
            label: t('tasks.listPage.newTask'),
            onClick: onCreateTask,
          } : undefined}
          emptyExtra={tableState.search || filterStatus !== 'all' ? undefined : (
            <EmptyState
              variant="inline"
              description={t('tasks.listPage.empty.description')}
              showCircularContainer={false}
              className="bg-transparent p-0"
            />
          )}
        />
      </div>
    </ListPageLayout>
  );
};

export default TasksList;
