import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { fr, enUS, ar } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useTasksFilters, priorityFilterToTaskPriority } from '@/contexts/TasksFiltersContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TaskSummary, TaskPriority } from '@/types/tasks';

const PRIORITY_BAR: Record<TaskPriority, { border: string; bg: string; text: string }> = {
  urgent: { border: 'border-l-red-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300' },
  high: { border: 'border-l-red-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300' },
  medium: { border: 'border-l-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300' },
  low: { border: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300' },
};

function TasksCalendarPage() {
  const { t, i18n } = useTranslation();
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const { filters } = useTasksFilters();

  const dateLocale = i18n.language.startsWith('fr')
    ? fr
    : i18n.language.startsWith('ar')
      ? ar
      : enUS;

  const [cursor, setCursor] = useState<Date>(new Date());
  const today = new Date();

  const { data: tasks = [], isLoading } = useTasks(currentOrganization?.id ?? '', {});

  const filteredTasks = useMemo(() => {
    let result = tasks.slice();
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter((task) => task.title?.toLowerCase().includes(q));
    }
    const priorityValue = priorityFilterToTaskPriority(filters.priority);
    if (priorityValue) {
      result = result.filter(
        (task) =>
          task.priority === priorityValue ||
          (priorityValue === 'high' && task.priority === 'urgent'),
      );
    }
    if (filters.assigneeId !== 'all') {
      result = result.filter((task) => task.worker_id === filters.assigneeId);
    }
    return result;
  }, [tasks, filters]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskSummary[]>();
    for (const task of filteredTasks) {
      if (!task.due_date) continue;
      const key = format(new Date(task.due_date), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [filteredTasks]);

  const weekdays = useMemo(() => {
    const baseMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(baseMonday);
      d.setDate(baseMonday.getDate() + i);
      return format(d, 'EEE', { locale: dateLocale }).slice(0, 3).toUpperCase();
    });
  }, [dateLocale]);

  if (!currentOrganization) return null;

  const handleSelectTask = (taskId: string) => {
    navigate({ to: '/tasks/$taskId', params: { taskId } });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold capitalize text-gray-900 dark:text-white sm:text-2xl">
          {format(cursor, 'LLLL yyyy', { locale: dateLocale })}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label={t('common.previous', 'Précédent')}
            onClick={() => setCursor((d) => subMonths(d, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => setCursor(new Date())}
          >
            {t('tasks.calendar.today', "Aujourd'hui")}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t('common.next', 'Suivant')}
            onClick={() => setCursor((d) => addMonths(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div>
          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {weekdays.map((wd) => (
              <div
                key={wd}
                className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDate.get(key) ?? [];
              const inMonth = isSameMonth(day, cursor);
              const isCurrentDay = isSameDay(day, today);

              return (
                <div
                  key={key}
                  className={cn(
                    'min-h-[120px] border-b border-e border-gray-100 p-2 dark:border-gray-700',
                    !inMonth && 'bg-gray-50 dark:bg-gray-900/30',
                    isCurrentDay && 'bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:ring-emerald-700',
                  )}
                >
                  <div
                    className={cn(
                      'mb-1 text-xs font-medium',
                      inMonth
                        ? 'text-gray-700 dark:text-gray-200'
                        : 'text-gray-400 dark:text-gray-500',
                      isCurrentDay && 'text-emerald-700 dark:text-emerald-300',
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => {
                      const palette = PRIORITY_BAR[task.priority];
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => handleSelectTask(task.id)}
                          className={cn(
                            'block w-full truncate rounded-sm border-l-4 px-1.5 py-0.5 text-start text-xs',
                            palette.border,
                            palette.bg,
                            palette.text,
                            'hover:opacity-90',
                          )}
                          title={task.title}
                        >
                          {task.title}
                        </button>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <div className="px-1 text-xs text-gray-500 dark:text-gray-400">
                        +{dayTasks.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/tasks/calendar')({
  component: TasksCalendarPage,
});
