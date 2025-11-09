import React, { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Calendar, Clock, User, MapPin, ChevronRight } from 'lucide-react';
import { format, isSameDay, startOfDay, addDays, isAfter, isBefore } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { fr } from 'date-fns/locale';
import { ar } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import {
  MiniCalendar,
  MiniCalendarNavigation,
  MiniCalendarDays,
  MiniCalendarDay,
} from '../kibo-ui/mini-calendar';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../MultiTenantAuthProvider';
import type { Task } from '../../types/tasks';

const UpcomingTasksWidget: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const { t, i18n } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Get locale for date formatting
  const getLocale = () => {
    switch (i18n.language) {
      case 'fr':
        return fr;
      case 'ar':
        return ar;
      default:
        return enUS;
    }
  };

  // Fetch tasks for the organization
  const { data: tasks = [], isLoading } = useTasks(currentOrganization?.id || '');

  // Filter upcoming tasks (today and future)
  const upcomingTasks = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysFromNow = addDays(today, 30);

    return tasks.filter(task => {
      if (!task.scheduled_start) return false;
      const taskDate = startOfDay(new Date(task.scheduled_start));
      return (isSameDay(taskDate, today) || isAfter(taskDate, today)) && isBefore(taskDate, thirtyDaysFromNow);
    }).sort((a, b) => {
      const dateA = new Date(a.scheduled_start!);
      const dateB = new Date(b.scheduled_start!);
      return dateA.getTime() - dateB.getTime();
    });
  }, [tasks]);

  // Tasks for the selected date
  const tasksForSelectedDate = useMemo(() => {
    return upcomingTasks.filter(task => {
      if (!task.scheduled_start) return false;
      return isSameDay(new Date(task.scheduled_start), selectedDate);
    });
  }, [upcomingTasks, selectedDate]);

  // Get tasks count per date for the mini calendar
  const getTaskCountForDate = (date: Date): number => {
    return upcomingTasks.filter(task => {
      if (!task.scheduled_start) return false;
      return isSameDay(new Date(task.scheduled_start), date);
    }).length;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      paused: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return colors[status] || colors.pending;
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      low: { color: 'bg-green-500', label: t('dashboard.widgets.tasks.priority.low') },
      medium: { color: 'bg-yellow-500', label: t('dashboard.widgets.tasks.priority.medium') },
      high: { color: 'bg-orange-500', label: t('dashboard.widgets.tasks.priority.high') },
      urgent: { color: 'bg-red-500', label: t('dashboard.widgets.tasks.priority.urgent') },
    };
    return badges[priority] || badges.medium;
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      pending: t('dashboard.widgets.tasks.status.pending'),
      assigned: t('dashboard.widgets.tasks.status.assigned'),
      in_progress: t('dashboard.widgets.tasks.status.inProgress'),
      completed: t('dashboard.widgets.tasks.status.completed'),
      cancelled: t('dashboard.widgets.tasks.status.cancelled'),
      paused: t('dashboard.widgets.tasks.status.paused'),
    };
    return statusLabels[status] || statusLabels.pending;
  };

  const handleTaskClick = (task: Task) => {
    navigate({
      to: '/tasks/calendar',
      search: { taskId: task.id }
    });
  };

  const handleViewAllTasks = () => {
    navigate({ to: '/tasks/calendar' });
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-green-600" />
          {t('dashboard.widgets.tasks.title')}
        </h3>
        <button
          onClick={handleViewAllTasks}
          className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
        >
          {t('dashboard.widgets.viewAll')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Mini Calendar */}
      <div className="mb-4">
        <MiniCalendar
          value={selectedDate}
          onValueChange={(date) => date && setSelectedDate(date)}
          days={7}
          className="w-full"
        >
          <MiniCalendarNavigation direction="prev" />
          <MiniCalendarDays>
            {(date) => (
              <div key={date.toISOString()} className="relative flex-1">
                <MiniCalendarDay date={date} className="w-full" />
                {getTaskCountForDate(date) > 0 && (
                  <div className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {getTaskCountForDate(date)}
                  </div>
                )}
              </div>
            )}
          </MiniCalendarDays>
          <MiniCalendarNavigation direction="next" />
        </MiniCalendar>
      </div>

      {/* Tasks for selected date */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {format(selectedDate, 'EEEE d MMMM yyyy', { locale: getLocale() })}
        </h4>

        {tasksForSelectedDate.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('dashboard.widgets.tasks.noTasks')}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tasksForSelectedDate.map((task) => {
              const priority = getPriorityBadge(task.priority);
              return (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h5 className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {task.title}
                    </h5>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${getStatusColor(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                    {task.scheduled_start && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.scheduled_start), 'HH:mm')}
                      </div>
                    )}

                    {(task as any).worker && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {`${(task as any).worker.first_name} ${(task as any).worker.last_name}`}
                      </div>
                    )}

                    {task.parcel_name && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {task.parcel_name}
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${priority.color}`}></div>
                      <span>{priority.label}</span>
                    </div>
                  </div>

                  {task.description && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-500 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary footer */}
      {upcomingTasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-green-600 dark:text-green-400">
              {upcomingTasks.length}
            </span>{' '}
            {t('dashboard.widgets.tasks.upcomingSummary', { count: upcomingTasks.length })}
          </p>
        </div>
      )}
    </div>
  );
};

export default UpcomingTasksWidget;
