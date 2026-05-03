import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  CheckSquare,
  Calendar as CalendarIcon,
  Building2,
  Columns3,
  List,
  Filter,
  Plus,
  Search,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAutoStartTour } from '@/contexts/TourContext';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLayout } from '@/components/PageLayout';
import { withLicensedRouteProtection } from '@/components/authorization/withLicensedRouteProtection';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '@/components/ui/loader';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { cn } from '@/lib/utils';
import { useTasks } from '@/hooks/useTasks';
import { isPast, isToday } from 'date-fns';
import {
  TasksFiltersProvider,
  useTasksFilters,
  type TasksPriorityFilter,
  type TasksSortBy,
} from '@/contexts/TasksFiltersContext';
import TaskForm from '@/components/Tasks/TaskForm';
import { farmsApi } from '@/lib/api/farms';
import { tasksApi } from '@/lib/api/tasks';
import type { Task, TaskSummary } from '@/types/tasks';

function TaskCreateModalHost({
  organizationId,
  open,
  taskId,
  onClose,
}: {
  organizationId: string;
  open: boolean;
  taskId: string | null;
  onClose: () => void;
}) {
  const { data: farms = [] } = useQuery({
    queryKey: ['farms', organizationId],
    queryFn: async () => {
      const data = await farmsApi.getAll({ organization_id: organizationId }, organizationId);
      return (data || []).map(
        (f: { farm_id?: string; id?: string; farm_name?: string; name?: string }) => ({
          id: f.farm_id || f.id || '',
          name: f.farm_name || f.name || '',
        }),
      );
    },
    enabled: !!organizationId && open,
  });

  const { data: editingTask } = useQuery({
    queryKey: ['task', organizationId, taskId],
    queryFn: async () => {
      if (!taskId) return null;
      return tasksApi.getById(organizationId, taskId) as Promise<Task>;
    },
    enabled: !!taskId && open,
  });

  if (!open) return null;
  return (
    <TaskForm
      task={editingTask ?? undefined}
      organizationId={organizationId}
      farms={farms}
      onClose={onClose}
      onSuccess={onClose}
    />
  );
}

function TasksHeroAndFilters({
  organizationId,
  onCreateTask,
}: {
  organizationId: string;
  onCreateTask: () => void;
}) {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();
  const location = useLocation();
  const { filters, setFilters } = useTasksFilters();

  const { data: tasks = [] } = useTasks(organizationId, {});

  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((task) => task.status === 'pending').length;
    const assigned = tasks.filter((task) => task.status === 'assigned').length;
    const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const paused = tasks.filter((task) => task.status === 'paused').length;
    const overdue = tasks.filter((task) => {
      if (!task.due_date) return false;
      const due = new Date(task.due_date);
      return (
        isPast(due) &&
        !isToday(due) &&
        task.status !== 'completed' &&
        task.status !== 'cancelled'
      );
    }).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, pending, assigned, inProgress, completed, paused, overdue, percent };
  }, [tasks]);

  // Build assignee list from tasks (distinct workers)
  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((task: TaskSummary) => {
      if (task.worker_id && task.worker_name) {
        map.set(task.worker_id, task.worker_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const orgScope =
    currentFarm?.name ?? currentOrganization?.name ?? '';

  const activeView: 'list' | 'calendar' | 'kanban' = location.pathname.startsWith(
    '/tasks/kanban',
  )
    ? 'kanban'
    : location.pathname.startsWith('/tasks/calendar')
      ? 'calendar'
      : 'list';

  const statCards: Array<{ key: string; label: string; value: number; danger?: boolean }> = [
    { key: 'total', label: t('tasks.stats.total', 'Total'), value: stats.total },
    { key: 'pending', label: t('tasks.stats.pending', 'En attente'), value: stats.pending },
    { key: 'assigned', label: t('tasks.stats.assigned', 'Assignée'), value: stats.assigned },
    { key: 'in_progress', label: t('tasks.stats.inProgress', 'En cours'), value: stats.inProgress },
    { key: 'completed', label: t('tasks.stats.completed', 'Terminée'), value: stats.completed },
    { key: 'paused', label: t('tasks.stats.paused', 'En pause'), value: stats.paused },
    { key: 'overdue', label: t('tasks.stats.overdue', 'En retard'), value: stats.overdue, danger: true },
  ];

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-white/80">
              {t('tasks.heroTag', 'TÂCHES')}
              {orgScope ? ` · ${orgScope}` : ''}
            </div>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              {t('tasks.title', 'Plan de travail')}
            </h1>
            <p className="mt-2 text-sm text-white/90">
              {stats.total} {t('tasks.stats.totalLabel', 'tâches')} ·{' '}
              <span className={stats.overdue > 0 ? 'font-semibold text-rose-100' : ''}>
                {stats.overdue} {t('tasks.stats.overdueLabel', 'en retard')}
              </span>{' '}
              · {stats.percent}% {t('tasks.stats.completedLabel', 'terminé')}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="border border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <Filter className="h-4 w-4" />
              {t('tasks.filters.button', 'Filtres')}
            </Button>
            <Button
              type="button"
              data-tour="task-create"
              onClick={onCreateTask}
              className="bg-white font-medium text-emerald-700 hover:bg-white/90"
            >
              <Plus className="h-4 w-4" />
              {t('tasks.newTask', 'Nouvelle tâche')}
            </Button>
          </div>
        </div>

        {/* Stat strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {statCards.map((card) => (
            <div
              key={card.key}
              className={cn(
                'rounded-lg bg-white/10 p-3 backdrop-blur',
                card.danger && 'bg-rose-500/30 ring-1 ring-rose-300/40',
              )}
            >
              <div className="text-xs uppercase tracking-wide text-white/80">{card.label}</div>
              <div className="mt-1 text-2xl font-bold text-white">{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900">
          {([
            { to: '/tasks', value: 'list', label: t('tasks.views.list', 'Liste'), Icon: List },
            { to: '/tasks/calendar', value: 'calendar', label: t('tasks.views.calendar', 'Calendrier'), Icon: CalendarIcon },
            { to: '/tasks/kanban', value: 'kanban', label: t('tasks.views.kanban', 'Tableau'), Icon: Columns3 },
          ] as const).map((item) => {
            const isActive = activeView === item.value;
            return (
              <Link
                key={item.value}
                to={item.to}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white',
                )}
              >
                <item.Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            placeholder={t('tasks.filters.searchPlaceholder', 'Rechercher une tâche...')}
            className="ps-9"
          />
        </div>

        <Select
          value={filters.priority}
          onValueChange={(value) => setFilters({ priority: value as TasksPriorityFilter })}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder={t('tasks.filters.allPriorities', 'Toutes priorités')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('tasks.filters.allPriorities', 'Toutes priorités')}</SelectItem>
            <SelectItem value="haute">{t('tasks.priority.haute', 'Haute')}</SelectItem>
            <SelectItem value="moyenne">{t('tasks.priority.moyenne', 'Moyenne')}</SelectItem>
            <SelectItem value="basse">{t('tasks.priority.basse', 'Basse')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.assigneeId}
          onValueChange={(value) => setFilters({ assigneeId: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('tasks.filters.allAssignees', 'Tous assignés')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('tasks.filters.allAssignees', 'Tous assignés')}</SelectItem>
            {assignees.map((assignee) => (
              <SelectItem key={assignee.id} value={assignee.id}>
                {assignee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sortBy}
          onValueChange={(value) => setFilters({ sortBy: value as TasksSortBy })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due_date">
              {t('tasks.filters.sort.dueDate', 'Trier : Échéance')}
            </SelectItem>
            <SelectItem value="created_at">
              {t('tasks.filters.sort.createdAt', 'Trier : Date de création')}
            </SelectItem>
            <SelectItem value="priority">
              {t('tasks.filters.sort.priority', 'Trier : Priorité')}
            </SelectItem>
            <SelectItem value="status">
              {t('tasks.filters.sort.status', 'Trier : Statut')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function TasksLayout() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const location = useLocation();

  useAutoStartTour('tasks', 1500);

  const isTaskDetailPage = /^\/tasks\/[a-f0-9-]{36}/.test(location.pathname);

  const [showTaskForm, setShowTaskForm] = useState(false);

  if (!currentOrganization) {
    return <PageLoader />;
  }

  const handleCreate = () => {
    setShowTaskForm(true);
  };

  const header = isTaskDetailPage ? (
    <ModernPageHeader
      breadcrumbs={[
        { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
        { icon: CheckSquare, label: t('nav.tasks'), path: '/tasks' },
        { label: t('tasks.detail.breadcrumb', 'Détail'), isActive: true },
      ]}
      title={t('tasks.detail.title', 'Tâche')}
      subtitle={t('tasks.detail.subtitle', 'Suivi et activité de la tâche')}
    />
  ) : (
    <ModernPageHeader
      breadcrumbs={[
        { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
        { icon: CheckSquare, label: t('nav.tasks'), isActive: true },
      ]}
      title={t('tasks.title', 'Plan de travail')}
      subtitle={t('tasks.subtitle', 'Organisez et suivez vos tâches agricoles')}
    />
  );

  return (
    <PageLayout activeModule="tasks" header={header}>
      <div className="p-3 sm:p-4 lg:p-6">
        <TasksFiltersProvider>
          {!isTaskDetailPage && (
            <div className="mb-6">
              <TasksHeroAndFilters
                organizationId={currentOrganization.id}
                onCreateTask={handleCreate}
              />
            </div>
          )}

          <Outlet />
        </TasksFiltersProvider>

        <TaskCreateModalHost
          organizationId={currentOrganization.id}
          open={showTaskForm}
          taskId={null}
          onClose={() => setShowTaskForm(false)}
        />
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/tasks')({
  component: withLicensedRouteProtection(TasksLayout, 'read', 'Task'),
});
