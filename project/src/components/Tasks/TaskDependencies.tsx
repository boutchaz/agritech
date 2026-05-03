import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  GitBranch,
  X,
  Plus,
  Search,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Clock,
} from 'lucide-react';
import {
  useTaskDependencies,
  useAddDependency,
  useRemoveDependency,
  useIsTaskBlocked,
  useTasks,
} from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import type { DependencyType } from '@/types/tasks';

type TaskDependencyLink = {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  depends_on_task_status?: string;
  depends_on_task_title?: string;
  task_status?: string;
  task_title?: string;
};

type TaskSearchResult = {
  id: string;
  title: string;
  status: string;
};

interface TaskDependenciesProps {
  taskId: string;
  organizationId: string;
  disabled?: boolean;
  embedded?: boolean;
}

const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  finish_to_start: 'Must finish first',
  start_to_start: 'Must start together',
  finish_to_finish: 'Must finish together',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-400',
  assigned: 'bg-blue-400',
  in_progress: 'bg-yellow-400',
  paused: 'bg-orange-400',
  completed: 'bg-green-500',
  cancelled: 'bg-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const getStatusColor = (status?: string) => STATUS_COLORS[status ?? ''] || 'bg-gray-400';
const getStatusLabel = (status?: string) => STATUS_LABELS[status ?? ''] || status || 'Unknown';
export default function TaskDependencies({ taskId, organizationId, disabled, embedded = false }: TaskDependenciesProps) {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [dependencyType, setDependencyType] = useState<DependencyType>('finish_to_start');
  const [lagDays, setLagDays] = useState(0);

  const { data: dependenciesData, isLoading: depsLoading } = useTaskDependencies(taskId);
  const { data: blockedData } = useIsTaskBlocked(taskId);
  const addDependency = useAddDependency();
  const removeDependency = useRemoveDependency();

  // Fetch tasks for the search dropdown
  const { data: allTasks = [] } = useTasks(organizationId, searchQuery ? { search: searchQuery } : undefined);

  // Parse dependencies into "depends on" and "required by"
  const dependsOn = useMemo(() => {
    if (!dependenciesData) return [];
    const deps = Array.isArray(dependenciesData) ? dependenciesData : dependenciesData.depends_on || [];
    return deps.filter((d: TaskDependencyLink) => d.task_id === taskId);
  }, [dependenciesData, taskId]);

  const requiredBy = useMemo(() => {
    if (!dependenciesData) return [];
    const deps = Array.isArray(dependenciesData) ? dependenciesData : dependenciesData.required_by || [];
    return deps.filter((d: TaskDependencyLink) => d.depends_on_task_id === taskId);
  }, [dependenciesData, taskId]);

  // Filter tasks for the add form: exclude current task and already-linked tasks
  const existingDepTaskIds = useMemo(() => {
    const ids = new Set<string>();
    ids.add(taskId);
    dependsOn.forEach((d: TaskDependencyLink) => {
      ids.add(d.depends_on_task_id);
    });
    requiredBy.forEach((d: TaskDependencyLink) => {
      ids.add(d.task_id);
    });
    return ids;
  }, [taskId, dependsOn, requiredBy]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task: TaskSearchResult) => !existingDepTaskIds.has(task.id));
  }, [allTasks, existingDepTaskIds]);

  // Blocked status
  const blockerCount = useMemo(() => {
    if (!blockedData) return 0;
    if (typeof blockedData === 'object' && 'blocked' in blockedData) {
      return blockedData.blocked ? (blockedData.blockers?.length || 0) : 0;
    }
    // Fallback: count unfinished finish_to_start deps
    return dependsOn.filter(
      (d: TaskDependencyLink) => d.dependency_type === 'finish_to_start' && d.depends_on_task_status !== 'completed'
    ).length;
  }, [blockedData, dependsOn]);

  const blockerNames = useMemo(() => {
    if (blockedData && typeof blockedData === 'object' && 'blockers' in blockedData) {
      return (blockedData.blockers || []).map((b: { title?: string; depends_on_task_title?: string }) => b.title || b.depends_on_task_title);
    }
    return dependsOn
      .filter((d: TaskDependencyLink) => d.dependency_type === 'finish_to_start' && d.depends_on_task_status !== 'completed')
      .map((d: TaskDependencyLink) => d.depends_on_task_title || 'Untitled task');
  }, [blockedData, dependsOn]);

  const handleAddDependency = async () => {
    if (!selectedTaskId) return;
    try {
      await addDependency.mutateAsync({
        taskId,
        dependsOnTaskId: selectedTaskId,
        dependencyType,
        lagDays: lagDays > 0 ? lagDays : undefined,
      });
      setSelectedTaskId('');
      setDependencyType('finish_to_start');
      setLagDays(0);
      setSearchQuery('');
      setShowAddForm(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    try {
      await removeDependency.mutateAsync({ dependencyId });
    } catch {
      // Error handled by mutation
    }
  };

  const headerRow = !embedded && (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <GitBranch className="h-5 w-5" />
        {t('tasks.detail.dependencies', 'Dependencies')}
        {(dependsOn.length + requiredBy.length) > 0 && (
          <span className="text-sm font-normal text-gray-500">
            ({dependsOn.length + requiredBy.length})
          </span>
        )}
      </h2>
      {!disabled && !showAddForm && (
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('tasks.detail.addDependency', 'Add')}
        </Button>
      )}
    </div>
  );

  const addDepBtn =
    embedded && !disabled && !showAddForm ? (
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('tasks.detail.addDependency', 'Add')}
        </Button>
      </div>
    ) : null;

  const body = (
    <>
      {headerRow}
      {addDepBtn}

      {/* Blocked Banner */}
      {blockerCount > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('tasks.detail.blockedBy', 'This task is blocked by {{count}} incomplete task(s)', { count: blockerCount })}
            </p>
            <ul className="mt-1 text-sm text-amber-700 dark:text-amber-400 list-disc list-inside">
              {blockerNames.map((name: string | undefined) => (
                <li key={name ?? 'blocker'}>{name ?? 'Untitled task'}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {depsLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Depends On Section */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('tasks.detail.blockedBySection', 'Bloquée par')}
            </h3>
            {dependsOn.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic py-2">
                {t('tasks.detail.noDependencies', 'No dependencies')}
              </p>
            ) : (
              <div className="space-y-2">
                {dependsOn.map((dep: TaskDependencyLink) => (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusColor(dep.depends_on_task_status)}`} />
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/tasks/$taskId"
                          params={{ taskId: dep.depends_on_task_id }}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                        >
                          {dep.depends_on_task_title || 'Untitled task'}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {getStatusLabel(dep.depends_on_task_status)}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">--</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {DEPENDENCY_TYPE_LABELS[dep.dependency_type as DependencyType] || dep.dependency_type}
                          </span>
                          {dep.lag_days > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
                              <Clock className="w-3 h-3" />
                              +{dep.lag_days} {t('tasks.detail.days', 'days')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {!disabled && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveDependency(dep.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-gray-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                        aria-label={t('tasks.detail.removeDependency', 'Remove dependency')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Required By Section */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <ArrowRight className="h-3.5 w-3.5" />
              {t('tasks.detail.blocksSection', 'Bloque')}
            </h3>
            {requiredBy.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic py-2">
                {t('tasks.detail.noDownstream', 'No downstream tasks')}
              </p>
            ) : (
              <div className="space-y-2">
                {requiredBy.map((dep: TaskDependencyLink) => (
                  <div
                    key={dep.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusColor(dep.task_status)}`} />
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/tasks/$taskId"
                        params={{ taskId: dep.task_id }}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                      >
                        {dep.task_title || 'Untitled task'}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {getStatusLabel(dep.task_status)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">--</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {DEPENDENCY_TYPE_LABELS[dep.dependency_type as DependencyType] || dep.dependency_type}
                        </span>
                        {dep.lag_days > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            +{dep.lag_days} {t('tasks.detail.days', 'days')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Dependency Form */}
      {showAddForm && !disabled && (
        <div className="mt-4 space-y-3 border-t pt-4 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('tasks.detail.addNewDependency', 'Add New Dependency')}
          </h3>

          {/* Task Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder={t('tasks.detail.searchTasks', 'Search tasks...')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedTaskId('');
              }}
              className="pl-9"
            />
          </div>

          {/* Task Dropdown */}
          {searchQuery && filteredTasks.length > 0 && !selectedTaskId && (
            <div className="max-h-40 overflow-y-auto border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
              {filteredTasks.slice(0, 10).map((task: TaskSearchResult) => (
                <Button
                  key={task.id}
                  variant="ghost"
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    setSearchQuery(task.title);
                  }}
                  className="w-full justify-start px-3 py-2 text-sm h-auto"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[task.status] || 'bg-gray-400'}`} />
                  <span className="truncate text-gray-900 dark:text-white">{task.title}</span>
                  <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                    {STATUS_LABELS[task.status] || task.status}
                  </span>
                </Button>
              ))}
            </div>
          )}

          {searchQuery && filteredTasks.length === 0 && (
            <p className="text-sm text-gray-400 italic py-1">
              {t('tasks.detail.noTasksFound', 'No matching tasks found')}
            </p>
          )}

          {/* Dependency Type & Lag */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                {t('tasks.detail.dependencyType', 'Type')}
              </span>
              <Select value={dependencyType} onValueChange={(v) => setDependencyType(v as DependencyType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finish_to_start">Finish-to-Start</SelectItem>
                  <SelectItem value="start_to_start">Start-to-Start</SelectItem>
                  <SelectItem value="finish_to_finish">Finish-to-Finish</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                {t('tasks.detail.lagDays', 'Lag (days)')}
              </span>
              <Input
                type="number"
                min="0"
                value={lagDays}
                onChange={(e) => setLagDays(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setSearchQuery('');
                setSelectedTaskId('');
                setLagDays(0);
                setDependencyType('finish_to_start');
              }}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleAddDependency}
              disabled={!selectedTaskId || addDependency.isPending}
            >
              {addDependency.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              {t('tasks.detail.addDependency', 'Add')}
            </Button>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
      {body}
    </div>
  );
}
