import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, isPast, isToday } from 'date-fns';
import { fr, enUS, ar } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useTasksFilters, priorityFilterToTaskPriority } from '@/contexts/TasksFiltersContext';
import { cn } from '@/lib/utils';
import type { TaskSummary, TaskPriority, TaskStatus } from '@/types/tasks';

const COLUMNS: Array<{ status: TaskStatus; label: string; dot: string }> = [
  { status: 'pending', label: 'En attente', dot: 'bg-gray-400' },
  { status: 'assigned', label: 'Assignée', dot: 'bg-blue-500' },
  { status: 'in_progress', label: 'En cours', dot: 'bg-purple-500' },
  { status: 'completed', label: 'Terminée', dot: 'bg-green-500' },
];

const PRIORITY_ACCENT: Record<TaskPriority, string> = {
  urgent: 'bg-red-500',
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
};

const PRIORITY_PILL: Record<TaskPriority, { bg: string; text: string; border: string; label: string }> = {
  urgent: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Urgente' },
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Haute' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Moyenne' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Basse' },
};

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const palette = [
    'bg-emerald-100 text-emerald-700',
    'bg-blue-100 text-blue-700',
    'bg-amber-100 text-amber-700',
    'bg-purple-100 text-purple-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
  ];
  return palette[Math.abs(hash) % palette.length];
}

function TasksKanbanPage() {
  const { t, i18n } = useTranslation();
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const { filters } = useTasksFilters();

  const dateLocale = i18n.language.startsWith('fr')
    ? fr
    : i18n.language.startsWith('ar')
      ? ar
      : enUS;

  const { data: tasks = [], isLoading } = useTasks(currentOrganization?.id ?? '', {});

  const filtered = useMemo(() => {
    let result = tasks.slice();
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (task) =>
          task.title?.toLowerCase().includes(q) ||
          task.description?.toLowerCase().includes(q),
      );
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

  const grouped = useMemo(() => {
    const out: Record<TaskStatus, TaskSummary[]> = {
      pending: [],
      assigned: [],
      in_progress: [],
      completed: [],
      paused: [],
      cancelled: [],
      overdue: [],
    };
    for (const task of filtered) {
      if (out[task.status]) out[task.status].push(task);
    }
    return out;
  }, [filtered]);

  if (!currentOrganization) return null;

  const handleSelectTask = (taskId: string) => {
    navigate({ to: '/tasks/$taskId', params: { taskId } });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const colTasks = grouped[col.status] ?? [];
        return (
          <div
            key={col.status}
            className="flex min-h-[300px] flex-col rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', col.dot)} />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t(`tasks.kanbanColumn.${col.status}`, col.label)}
                </h3>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
                {colTasks.length}
              </span>
            </div>

            <div className="flex-1 space-y-3 px-3 pb-4">
              {colTasks.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-sm text-gray-400">
                  {t('tasks.kanban.empty', 'Aucune tâche')}
                </div>
              ) : (
                colTasks.map((task) => {
                  const priority = PRIORITY_PILL[task.priority];
                  const overdue =
                    task.due_date &&
                    isPast(new Date(task.due_date)) &&
                    !isToday(new Date(task.due_date)) &&
                    task.status !== 'completed';

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => handleSelectTask(task.id)}
                      className="group relative w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-3 text-start shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                    >
                      <span
                        className={cn(
                          'absolute inset-y-0 start-0 w-1',
                          PRIORITY_ACCENT[task.priority],
                        )}
                      />
                      <div className="ps-2">
                        <h4 className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                          {task.title}
                        </h4>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                              priority.bg,
                              priority.text,
                              priority.border,
                            )}
                          >
                            {priority.label}
                          </span>
                          {(task.parcel_name || task.farm_name) && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              {task.parcel_name ?? task.farm_name}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {task.worker_name ? (
                              <span
                                className={cn(
                                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold',
                                  avatarColor(task.worker_id ?? task.worker_name),
                                )}
                                title={task.worker_name}
                              >
                                {getInitials(task.worker_name)}
                              </span>
                            ) : null}
                          </div>
                          {task.due_date && (
                            <span
                              className={cn(
                                'text-xs',
                                overdue
                                  ? 'font-semibold text-red-600 dark:text-red-400'
                                  : 'text-gray-500 dark:text-gray-400',
                              )}
                            >
                              {format(new Date(task.due_date), 'dd MMM', { locale: dateLocale })}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/tasks/kanban')({
  component: TasksKanbanPage,
});
