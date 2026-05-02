import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type TasksPriorityFilter = 'all' | 'haute' | 'moyenne' | 'basse';
export type TasksSortBy = 'due_date' | 'created_at' | 'priority' | 'status';

export interface TasksFiltersState {
  search: string;
  priority: TasksPriorityFilter;
  assigneeId: string | 'all';
  sortBy: TasksSortBy;
}

interface TasksFiltersContextValue {
  filters: TasksFiltersState;
  setFilters: (partial: Partial<TasksFiltersState>) => void;
}

const DEFAULT_FILTERS: TasksFiltersState = {
  search: '',
  priority: 'all',
  assigneeId: 'all',
  sortBy: 'due_date',
};

const TasksFiltersContext = createContext<TasksFiltersContextValue | null>(null);

export function TasksFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<TasksFiltersState>(DEFAULT_FILTERS);

  const value = useMemo<TasksFiltersContextValue>(
    () => ({
      filters,
      setFilters: (partial) => setFiltersState((prev) => ({ ...prev, ...partial })),
    }),
    [filters],
  );

  return <TasksFiltersContext.Provider value={value}>{children}</TasksFiltersContext.Provider>;
}

export function useTasksFilters(): TasksFiltersContextValue {
  const ctx = useContext(TasksFiltersContext);
  if (!ctx) {
    // Safe fallback: return defaults so child components don't crash if rendered outside provider.
    return {
      filters: DEFAULT_FILTERS,
      setFilters: () => undefined,
    };
  }
  return ctx;
}

/** Map our French priority filter labels to backend TaskPriority values. */
export function priorityFilterToTaskPriority(p: TasksPriorityFilter): 'high' | 'medium' | 'low' | null {
  if (p === 'haute') return 'high';
  if (p === 'moyenne') return 'medium';
  if (p === 'basse') return 'low';
  return null;
}
