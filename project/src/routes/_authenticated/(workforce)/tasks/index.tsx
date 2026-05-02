import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import {
  Eye,
  MoreHorizontal,
  MapPin,
  ClipboardList,
  Loader2,
  CheckCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, isPast, isToday } from 'date-fns';
import { fr, enUS, ar } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useTasks, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useTasksFilters, priorityFilterToTaskPriority } from '@/contexts/TasksFiltersContext';
import { tasksApi } from '@/lib/api/tasks';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TaskSummary, TaskPriority, TaskStatus } from '@/types/tasks';

// Status -> color tokens
const STATUS_PILL: Record<TaskStatus, { bg: string; text: string; border: string; dot: string; label: string }> = {
  pending: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-400', label: 'En attente' },
  assigned: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: 'Assignée' },
  in_progress: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', label: 'En cours' },
  paused: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'En pause' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500', label: 'Terminée' },
  cancelled: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-300', label: 'Annulée' },
  overdue: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'En retard' },
};

const PRIORITY_PILL: Record<TaskPriority, { bg: string; text: string; border: string; dot: string; label: string }> = {
  urgent: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'Urgente' },
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'Haute' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Moyenne' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: 'Basse' },
};

const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

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
  // Stable color from string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const palette = [
    'bg-emerald-100 text-emerald-700',
    'bg-blue-100 text-blue-700',
    'bg-amber-100 text-amber-700',
    'bg-purple-100 text-purple-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-indigo-100 text-indigo-700',
  ];
  return palette[Math.abs(hash) % palette.length];
}

function isOverdue(task: TaskSummary): boolean {
  if (!task.due_date) return false;
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  const due = new Date(task.due_date);
  return isPast(due) && !isToday(due);
}

function TasksListPage() {
  const { t, i18n } = useTranslation();
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { filters } = useTasksFilters();

  const dateLocale = i18n.language.startsWith('fr')
    ? fr
    : i18n.language.startsWith('ar')
      ? ar
      : enUS;

  const { data: tasks = [], isLoading } = useTasks(currentOrganization?.id ?? '', {});

  const filteredSorted = useMemo(() => {
    let result = tasks.slice();

    // Search
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (task) =>
          task.title?.toLowerCase().includes(q) ||
          task.description?.toLowerCase().includes(q) ||
          task.worker_name?.toLowerCase().includes(q) ||
          task.parcel_name?.toLowerCase().includes(q),
      );
    }

    // Priority
    const priorityValue = priorityFilterToTaskPriority(filters.priority);
    if (priorityValue) {
      result = result.filter(
        (task) =>
          task.priority === priorityValue ||
          (priorityValue === 'high' && task.priority === 'urgent'),
      );
    }

    // Assignee
    if (filters.assigneeId !== 'all') {
      result = result.filter((task) => task.worker_id === filters.assigneeId);
    }

    // Sort
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'due_date': {
          const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
          return aDate - bDate;
        }
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'priority':
          return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        case 'status':
          return (a.status ?? '').localeCompare(b.status ?? '');
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, filters]);

  if (!currentOrganization) return null;

  const handleSelectTask = (taskId: string) => {
    navigate({ to: '/tasks/$taskId', params: { taskId } });
  };

  const handleEdit = (taskId: string) => {
    navigate({ to: '/tasks/$taskId', params: { taskId } });
  };

  const handleComplete = async (task: TaskSummary) => {
    try {
      await tasksApi.complete(currentOrganization.id, task.id, {});
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync({ taskId, organizationId: currentOrganization.id });
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const headers: Array<{ key: string; label: string; className?: string }> = [
    { key: 'title', label: t('tasks.col.task', 'TÂCHE') },
    { key: 'status', label: t('tasks.col.status', 'STATUT') },
    { key: 'priority', label: t('tasks.col.priority', 'PRIORITÉ') },
    { key: 'due', label: t('tasks.col.due', 'ÉCHÉANCE') },
    { key: 'parcel', label: t('tasks.col.parcel', 'PARCELLE') },
    { key: 'assignee', label: t('tasks.col.assignee', 'ASSIGNÉE À') },
    { key: 'actions', label: t('tasks.col.actions', 'ACTIONS'), className: 'text-end' },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : filteredSorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300" />
          <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {t('tasks.empty.title', 'Aucune tâche')}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('tasks.empty.description', 'Aucune tâche ne correspond à vos filtres.')}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="w-12 px-4 py-3" />
                {headers.map((h) => (
                  <th
                    key={h.key}
                    className={cn(
                      'px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400',
                      h.className,
                    )}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {filteredSorted.map((task) => {
                const overdue = isOverdue(task);
                const status = STATUS_PILL[task.status];
                const priority = PRIORITY_PILL[task.priority];
                return (
                  <tr
                    key={task.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30"
                    onClick={() => handleSelectTask(task.id)}
                  >
                    <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                      <Checkbox aria-label={t('tasks.selectRow', 'Sélectionner')} />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-start font-semibold text-gray-900 dark:text-white">
                        {task.title}
                      </span>
                      {task.description && (
                        <p className="mt-0.5 max-w-md truncate text-xs text-gray-500 dark:text-gray-400">
                          {task.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
                          status.bg,
                          status.text,
                          status.border,
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
                          priority.bg,
                          priority.text,
                          priority.border,
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', priority.dot)} />
                        {priority.label}
                      </span>
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3 align-middle text-sm',
                        overdue
                          ? 'font-semibold text-red-600 dark:text-red-400'
                          : 'text-gray-700 dark:text-gray-200',
                      )}
                    >
                      {task.due_date
                        ? format(new Date(task.due_date), 'dd MMM yyyy', { locale: dateLocale })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {task.parcel_name || task.farm_name ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {task.parcel_name ?? task.farm_name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {task.worker_name ? (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                              avatarColor(task.worker_id ?? task.worker_name),
                            )}
                          >
                            {getInitials(task.worker_name)}
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-200">
                            {task.worker_name}
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-end" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t('tasks.viewDetails', 'Voir détails')}
                          onClick={() => handleSelectTask(task.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="More">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(task.id)}>
                              <Pencil className="me-2 h-4 w-4" />
                              {t('common.edit', 'Modifier')}
                            </DropdownMenuItem>
                            {task.status !== 'completed' && task.status !== 'cancelled' && (
                              <DropdownMenuItem
                                onClick={() => handleComplete(task)}
                                disabled={updateTask.isPending}
                              >
                                <CheckCircle className="me-2 h-4 w-4 text-green-600" />
                                {t('tasks.markComplete', 'Marquer comme terminée')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(task.id)}
                              disabled={deleteTask.isPending}
                            >
                              <Trash2 className="me-2 h-4 w-4" />
                              {t('common.delete', 'Supprimer')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/tasks/')({
  component: TasksListPage,
});
