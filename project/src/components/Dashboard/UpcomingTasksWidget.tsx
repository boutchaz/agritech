import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
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
import { useAuth } from '../../hooks/useAuth';
import type { Task } from '../../types/tasks';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
      <div className="bg-white dark:bg-slate-800 p-6 flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <Skeleton className="h-5 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="space-y-4 flex-1">
          <div className="flex items-center justify-between px-1 mb-4">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-px flex-1 mx-3 rounded" />
          </div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
            <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
            {t('dashboard.widgets.tasks.title')}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewAllTasks}
          className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 h-8 rounded-xl px-2 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Mini Calendar */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-700/50">
        <MiniCalendar
          value={selectedDate}
          onValueChange={(date) => date && setSelectedDate(date)}
          days={7}
          className="w-full"
        >
          <MiniCalendarNavigation direction="prev" className="hover:bg-white dark:hover:bg-slate-800 rounded-xl" />
          <MiniCalendarDays>
            {(date) => (
              <div key={date.toISOString()} className="relative flex-1">
                <MiniCalendarDay 
                  date={date} 
                  className={cn(
                    "w-full transition-all duration-300 rounded-xl",
                    isSameDay(date, selectedDate) ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20" : "hover:bg-white dark:hover:bg-slate-800"
                  )} 
                />
                {getTaskCountForDate(date) > 0 && !isSameDay(date, selectedDate) && (
                  <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center border-2 border-slate-50 dark:border-slate-900">
                    {getTaskCountForDate(date)}
                  </div>
                )}
              </div>
            )}
          </MiniCalendarDays>
          <MiniCalendarNavigation direction="next" className="hover:bg-white dark:hover:bg-slate-800 rounded-xl" />
        </MiniCalendar>
      </div>

      {/* Tasks for selected date */}
      <div className="space-y-4 flex-1 min-h-0">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: getLocale() })}
          </h4>
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-3"></div>
        </div>

        {tasksForSelectedDate.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-slate-200 dark:text-slate-700" />
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('dashboard.widgets.tasks.noTasks')}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
            {tasksForSelectedDate.map((task) => {
              const priority = getPriorityBadge(task.priority);
              return (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-all duration-300 shadow-sm hover:shadow group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h5 className="font-black text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase tracking-tight line-clamp-1 flex-1">
                      {task.title}
                    </h5>
                    <Badge className={cn("border-none font-black text-[8px] tracking-widest px-2 py-0 h-5", getStatusColor(task.status))}>
                      {getStatusLabel(task.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2">
                    {task.scheduled_start && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {format(new Date(task.scheduled_start), 'HH:mm')}
                      </div>
                    )}

                    {(task as any).worker && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                        <User className="h-3 w-3 text-slate-400" />
                        <span className="truncate">{`${(task as any).worker.first_name} ${(task as any).worker.last_name}`}</span>
                      </div>
                    )}

                    {task.parcel_name && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span className="truncate">{task.parcel_name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                      <div className={cn("w-2 h-2 rounded-full", priority.color)}></div>
                      <span>{priority.label}</span>
                    </div>
                  </div>

                  {task.description && (
                    <p className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/50 text-[10px] text-slate-400 dark:text-slate-500 font-medium italic line-clamp-1">
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
        <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('dashboard.widgets.tasks.upcomingSummary', { count: upcomingTasks.length }).split(' ')[1]} tasks</span>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg">
            {upcomingTasks.length}
          </span>
        </div>
      )}
    </div>
  );
};

export default UpcomingTasksWidget;
