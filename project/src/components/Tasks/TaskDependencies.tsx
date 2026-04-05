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

interface TaskDependenciesProps {
  taskId: string;
  organizationId: string;
  disabled?: boolean;
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

export default function TaskDependencies({ taskId, organizationId, disabled }: TaskDependenciesProps) {
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
    return deps.filter((d: any) => d.task_id === taskId);
  }, [dependenciesData, taskId]);

  const requiredBy = useMemo(() => {
    if (!dependenciesData) return [];
    const deps = Array.isArray(dependenciesData) ? dependenciesData : dependenciesData.required_by || [];
    return deps.filter((d: any) => d.depends_on_task_id === taskId);
  }, [dependenciesData, taskId]);

  // Filter tasks for the add form: exclude current task and already-linked tasks
  const existingDepTaskIds = useMemo(() => {
    const ids = new Set<string>();
    ids.add(taskId);
    dependsOn.forEach((d: any) => ids.add(d.depends_on_task_id));
    requiredBy.forEach((d: any) => ids.add(d.task_id));
    return ids;
  }, [taskId, dependsOn, requiredBy]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task: any) => !existingDepTaskIds.has(task.id));
  }, [allTasks, existingDepTaskIds]);

  // Blocked status
  const blockerCount = useMemo(() => {
    if (!blockedData) return 0;
    if (typeof blockedData === 'object' && 'blocked' in blockedData) {
      return blockedData.blocked ? (blockedData.blockers?.length || 0) : 0;
    }
    // Fallback: count unfinished finish_to_start deps
    return dependsOn.filter(
      (d: any) => d.dependency_type === 'finish_to_start' && d.depends_on_task_status !== 'completed'
    ).length;
  }, [blockedData, dependsOn]);

  const blockerNames = useMemo(() => {
    if (blockedData && typeof blockedData === 'object' && 'blockers' in blockedData) {
      return (blockedData.blockers || []).map((b: any) => b.title || b.depends_on_task_title);
    }
    return dependsOn
      .filter((d: any) => d.dependency_type === 'finish_to_start' && d.depends_on_task_status !== 'completed')
      .map((d: any) => d.depends_on_task_title || 'Untitled task');
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          {t('tasks.detail.dependencies', 'Dependencies')}
          {(dependsOn.length + requiredBy.length) > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({dependsOn.length + requiredBy.length})
            </span>
          )}
        </h2>
        {!disabled && !showAddForm && (
          <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            {t('tasks.detail.addDependency', 'Add')}
          </Button>
        )}
      </div>

      {/* Blocked Banner */}
      {blockerCount > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('tasks.detail.blockedBy', 'This task is blocked by {{count}} incomplete task(s)', { count: blockerCount })}
            </p>
            <ul className="mt-1 text-sm text-amber-700 dark:text-amber-400 list-disc list-inside">
              {blockerNames.map((name: string, i: number) => (
                <li key={name}>{name}</li>
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
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('tasks.detail.dependsOn', 'Depends On')}
            </h3>
            {dependsOn.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic py-2">
                {t('tasks.detail.noDependencies', 'No dependencies')}
              </p>
            ) : (
              <div className="space-y-2">
                {dependsOn.map((dep: any) => (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[dep.depends_on_task_status] || 'bg-gray-400'}`} />
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
                            {STATUS_LABELS[dep.depends_on_task_status] || dep.depends_on_task_status}
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
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5" />
              {t('tasks.detail.requiredBy', 'Required By')}
            </h3>
            {requiredBy.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic py-2">
                {t('tasks.detail.noDownstream', 'No downstream tasks')}
              </p>
            ) : (
              <div className="space-y-2">
                {requiredBy.map((dep: any) => (
                  <div
                    key={dep.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[dep.task_status] || 'bg-gray-400'}`} />
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
                          {STATUS_LABELS[dep.task_status] || dep.task_status}
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
        <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-3">
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
              {filteredTasks.slice(0, 10).map((task: any) => (
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
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                {t('tasks.detail.dependencyType', 'Type')}
              </label>
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
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                {t('tasks.detail.lagDays', 'Lag (days)')}
              </label>
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
    </div>
  );
}
