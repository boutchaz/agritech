import React, { useState, useMemo } from 'react';
import {
  CalendarBody,
  CalendarDate,
  CalendarDatePagination,
  CalendarHeader,
  CalendarItem,
  CalendarMonthPicker,
  CalendarProvider,
  CalendarYearPicker,
  useCalendarMonth,
  useCalendarYear,
  type Feature,
} from '../kibo-ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  Plus,
  Clock,
  User,
  MapPin,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Wheat,
  Timer,
  Calendar,
  Flame,
  CalendarClock,
  ChevronRight,
} from 'lucide-react';
import { useTasks, useUpdateTask } from '../../hooks/useTasks';
import { tasksApi } from '../../lib/api/tasks';
import { useQueryClient } from '@tanstack/react-query';
import TaskForm from './TaskForm';
import TaskDetailDialog from './TaskDetailDialog';
import type { Task, TaskSummary } from '../../types/tasks';
import {
  getTaskStatusLabel,
  getTaskPriorityLabel,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
} from '../../types/tasks';
import { format, parseISO, startOfMonth, endOfMonth, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns';
import { fr, enUS, ar } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { SectionLoader } from '@/components/ui/loader';
import { StatusDot } from '@/components/ui/status-dot';

interface TasksCalendarProps {
  organizationId: string;
  farms: Array<{ id: string; name: string }>;
}

// Task status colors matching Kibo UI Feature structure
const getTaskStatus = (task: Task) => {
  const statusColors: Record<string, string> = {
    pending: '#94a3b8',      // gray
    assigned: '#3b82f6',     // blue
    in_progress: '#f59e0b',  // amber
    paused: '#6b7280',       // gray
    completed: '#10b981',    // green
    cancelled: '#ef4444',    // red
    overdue: '#dc2626',      // red
  };

  const priorityColors: Record<string, string> = {
    low: '#10b981',      // green
    medium: '#f59e0b',   // amber
    high: '#f97316',     // orange
    urgent: '#ef4444',   // red
  };

  // Use priority color if in progress or pending, otherwise use status color
  const color = task.status === 'pending' || task.status === 'assigned'
    ? priorityColors[task.priority] || statusColors[task.status]
    : statusColors[task.status];

  return {
    id: task.status,
    name: task.status,
    color,
  };
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
    return { label: 'Tomorrow', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: CalendarClock };
  }
  const daysUntil = differenceInDays(due, today);
  if (daysUntil <= 7) {
    return { label: `${daysUntil}d`, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Calendar };
  }
  return null;
};

// Calendar content component (needs to be inside CalendarProvider)
const CalendarContent: React.FC<{
  tasks: Task[];
  organizationId: string;
  onTaskSelect: (task: Task) => void;
  onCreateTask: () => void;
  currentMonth: number;
  currentYear: number;
}> = ({ tasks, organizationId, onTaskSelect, onCreateTask, _currentMonth, _currentYear }) => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const [_month] = useCalendarMonth();
  const [_year] = useCalendarYear();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);

  // Get locale for date formatting
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'fr':
        return fr;
      case 'ar':
        return ar;
      default:
        return enUS;
    }
  };

  // Calculate stats for the current month
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t => t.status === 'overdue').length,
      dueToday: tasks.filter(t => t.due_date && isToday(new Date(t.due_date))).length,
      completionRate: tasks.length > 0
        ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
        : 0,
    };
  }, [tasks]);

  // Convert tasks to Kibo UI Feature format
  const features: Feature[] = useMemo(() => {
    return tasks
      .filter((task): task is Task & { scheduled_start: string } => !!task.scheduled_start)
      .map(task => {
        const startDate = parseISO(task.scheduled_start);
        const endDate = task.due_date ? parseISO(task.due_date) : startDate;

        return {
          id: task.id,
          name: task.title,
          startAt: startDate,
          endAt: endDate,
          status: getTaskStatus(task),
          // Store the full task object for later use
          _task: task,
        } as Feature & { _task: Task };
      });
  }, [tasks]);

  // Get tasks for selected date - show tasks that span across the selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    // Normalize selected date to start of day in local time
    const selectedDateNormalized = new Date(selectedDate);
    selectedDateNormalized.setHours(0, 0, 0, 0);

    return tasks.filter(task => {
      if (!task.scheduled_start) return false;

      // Parse ISO dates and compare using date strings to avoid timezone issues
      const taskStart = parseISO(task.scheduled_start);
      const taskEnd = task.due_date ? parseISO(task.due_date) : taskStart;

      // Convert all dates to YYYY-MM-DD format for comparison (timezone-safe)
      const selectedDateStr = format(selectedDateNormalized, 'yyyy-MM-dd');
      const startDateStr = format(taskStart, 'yyyy-MM-dd');
      const endDateStr = format(taskEnd, 'yyyy-MM-dd');

      // Check if selected date falls within the task's date range
      return selectedDateStr >= startDateStr && selectedDateStr <= endDateStr;
    });
  }, [selectedDate, tasks]);

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

  const handleQuickComplete = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    // For harvest tasks, open the detail dialog instead
    if (task.task_type === 'harvesting') {
      setSelectedTaskForDetail(task);
      setShowDetailDialog(true);
      return;
    }
    try {
      await tasksApi.complete(organizationId, task.id, {});
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const _handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow border-l-4 border-slate-500">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('tasks.calendarPage.stats.total', 'Total')}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>

        {/* Pending */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow border-l-4 border-gray-400">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('tasks.stats.pending')}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
        </div>

        {/* In Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow border-l-4 border-blue-500">
          <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t('tasks.stats.inProgress')}</p>
          <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{stats.in_progress}</p>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow border-l-4 border-green-500">
          <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide">{t('tasks.stats.completed')}</p>
          <p className="text-xl font-bold text-green-900 dark:text-green-100">{stats.completed}</p>
        </div>

        {/* Overdue */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow border-l-4 border-red-500">
          <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wide">{t('tasks.stats.overdue')}</p>
          <p className="text-xl font-bold text-red-900 dark:text-red-100">{stats.overdue}</p>
        </div>

        {/* Due Today */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow border-l-4 border-orange-500">
          <p className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wide">{t('tasks.stats.dueToday', 'Due Today')}</p>
          <p className="text-xl font-bold text-orange-900 dark:text-orange-100">{stats.dueToday}</p>
        </div>

        {/* Completion Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow border-l-4 border-emerald-500">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">{t('tasks.stats.completionRate', 'Completion')}</p>
          <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{stats.completionRate}%</p>
          <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div
              className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CalendarDate>
                {(date) => (
                  <CardTitle className="text-2xl font-bold">
                    {format(date, 'MMMM yyyy', { locale: getDateLocale() })}
                  </CardTitle>
                )}
              </CalendarDate>
              <div className="flex items-center gap-2">
                <CalendarDatePagination />
                <Button onClick={onCreateTask} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('tasks.calendarPage.newTask')}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {/* Month and Year Pickers */}
              <div className="flex items-center gap-2">
                <CalendarMonthPicker
                  labels={{
                    button: t('tasks.calendarPage.monthPicker.button'),
                    empty: t('tasks.calendarPage.monthPicker.empty'),
                    search: t('tasks.calendarPage.monthPicker.search'),
                  }}
                />
                <CalendarYearPicker
                  start={2020}
                  end={2030}
                  className="min-w-[120px]"
                />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-gray-500 dark:text-gray-400">{t('tasks.calendarPage.legend', 'Legend')}:</span>
                <div className="flex items-center gap-1">
                  <StatusDot color="gray" size="md" />
                  <span>{t('tasks.stats.pending')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <StatusDot color="amber" size="md" />
                  <span>{t('tasks.stats.inProgress')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <StatusDot color="green" size="md" />
                  <span>{t('tasks.stats.completed')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <StatusDot color="red" size="md" />
                  <span>{t('tasks.stats.overdue')}</span>
                </div>
              </div>

              {/* Calendar Grid */}
              <CalendarHeader className="mb-2" />
              <CalendarBody features={features} onDateClick={_handleDateClick}>
                {({ feature }) => (
                  <div
                    key={feature.id}
                    className="cursor-pointer hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Get the task from the feature
                      const task = (feature as Feature & { _task: Task })._task;
                      if (task) {
                        onTaskSelect(task);
                        // Also set the selected date
                        if (task.scheduled_start) {
                          setSelectedDate(parseISO(task.scheduled_start));
                        }
                      }
                    }}
                  >
                    <CalendarItem feature={feature} />
                  </div>
                )}
              </CalendarBody>
            </div>
          </CardContent>
        </Card>

        {/* Tasks for Selected Date */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {selectedDate ? (
                <>
                  <Calendar className="w-5 h-5 text-blue-600" />
                  {format(selectedDate, 'dd MMMM yyyy', { locale: getDateLocale() })}
                </>
              ) : (
                t('tasks.calendarPage.selectDate')
              )}
            </CardTitle>
            {selectedDate && selectedDateTasks.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedDateTasks.length} {t('tasks.calendarPage.tasksOnDateCount', 'task(s)')}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('tasks.calendarPage.clickDateToView')}</p>
              </div>
            ) : selectedDateTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm mb-4">{t('tasks.calendarPage.noTasksOnDate')}</p>
                <Button variant="outline" size="sm" onClick={onCreateTask}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('tasks.calendarPage.newTask')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {selectedDateTasks.map(task => {
                  const dueDateStatus = getDueDateStatus(task.due_date);
                  const canStart = task.status === 'pending' || task.status === 'assigned';
                  const canPause = task.status === 'in_progress';
                  const canComplete = task.status === 'in_progress' || task.status === 'paused';

                  return (
                    <div
                      key={task.id}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => onTaskSelect(task)}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-sm">{task.title}</h4>
                            {task.task_type === 'harvesting' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                <Wheat className="w-3 h-3 mr-0.5" />
                                {t('tasks.type.harvesting', 'Harvest')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: getTaskStatus(task).color }}
                        />
                      </div>

                      {/* Badges Row */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TASK_PRIORITY_COLORS[task.priority]}`}>
                          {getTaskPriorityLabel(task.priority, i18n.language)}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TASK_STATUS_COLORS[task.status]}`}>
                          {getTaskStatusLabel(task.status, i18n.language)}
                        </span>
                        {dueDateStatus && task.status !== 'completed' && task.status !== 'cancelled' && (
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${dueDateStatus.color}`}>
                            <dueDateStatus.icon className="w-3 h-3 mr-1" />
                            {dueDateStatus.label}
                          </span>
                        )}
                      </div>

                      {/* Info Row */}
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {(task as TaskSummary).worker_name && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{(task as TaskSummary).worker_name}</span>
                          </div>
                        )}

                        {(task as TaskSummary).farm_name && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{(task as TaskSummary).farm_name}</span>
                          </div>
                        )}

                        {task.estimated_duration && (
                          <div className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            <span>{task.estimated_duration}h</span>
                          </div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2">
                        {canStart && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 h-7 text-xs"
                            onClick={(e) => handleQuickStart(e, task.id)}
                            disabled={updateTask.isPending}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            {t('tasks.start', 'Start')}
                          </Button>
                        )}

                        {canPause && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-600 border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 h-7 text-xs"
                            onClick={(e) => handleQuickPause(e, task.id)}
                            disabled={updateTask.isPending}
                          >
                            <Pause className="w-3 h-3 mr-1" />
                            {t('tasks.pause', 'Pause')}
                          </Button>
                        )}

                        {canComplete && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                            onClick={(e) => handleQuickComplete(e, task)}
                            disabled={updateTask.isPending}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {task.task_type === 'harvesting'
                              ? t('tasks.completeHarvest', 'Harvest')
                              : t('tasks.complete', 'Complete')}
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs ml-auto"
                          onClick={() => onTaskSelect(task)}
                        >
                          {t('tasks.viewDetails', 'Details')}
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Detail Dialog */}
      {showDetailDialog && selectedTaskForDetail && (
        <TaskDetailDialog
          task={selectedTaskForDetail}
          organizationId={organizationId}
          onClose={() => {
            setShowDetailDialog(false);
            setSelectedTaskForDetail(null);
          }}
          onEdit={() => {
            setShowDetailDialog(false);
            onTaskSelect(selectedTaskForDetail);
          }}
        />
      )}
    </div>
  );
};

// Wrapper to track calendar month/year changes
const TasksCalendarInner: React.FC<TasksCalendarProps> = ({ organizationId, farms }) => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Read current month/year from calendar context
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();

  // Calculate date range based on current calendar month/year
  const { startDate, endDate } = useMemo(() => {
    const currentDate = new Date(year, month);
    return {
      startDate: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
    };
  }, [month, year]);

  const { data: tasks = [], isLoading } = useTasks(organizationId, {
    date_from: startDate,
    date_to: endDate,
  });

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setShowTaskForm(true);
  };

   const handleCreateTask = () => {
     setSelectedTask(null);
     setShowTaskForm(true);
   };

   useTranslation();

  if (isLoading) {
    return <SectionLoader />;
  }

  return (
    <>
      <CalendarContent
        tasks={tasks}
        organizationId={organizationId}
        onTaskSelect={handleTaskSelect}
        onCreateTask={handleCreateTask}
        currentMonth={month}
        currentYear={year}
      />

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          task={selectedTask}
          organizationId={organizationId}
          farms={farms}
          onClose={() => {
            setShowTaskForm(false);
            setSelectedTask(null);
          }}
          onSuccess={() => {
            setShowTaskForm(false);
            setSelectedTask(null);
          }}
        />
      )}
    </>
  );
};

// Main component wraps with CalendarProvider
const TasksCalendar: React.FC<TasksCalendarProps> = (props) => {
  const { i18n } = useTranslation();

  // Map i18n language to calendar locale
  const getCalendarLocale = () => {
    switch (i18n.language) {
      case 'fr':
        return 'fr-FR';
      case 'ar':
        return 'ar-SA';
      default:
        return 'en-US';
    }
  };

  return (
    <CalendarProvider locale={getCalendarLocale()} startDay={1}>
      <TasksCalendarInner {...props} />
    </CalendarProvider>
  );
};

export default TasksCalendar;
