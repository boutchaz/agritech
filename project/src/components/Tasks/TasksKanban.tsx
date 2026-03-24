import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  User,
  MapPin,
  Calendar,
  MessageSquare,
  AlertCircle,
  Flame,
  CalendarClock,
  GripVertical,
  Loader2,
  ListChecks,
  Repeat,
  GitBranch,
  Paperclip,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isToday, isTomorrow, isPast, format } from 'date-fns';
import { fr, enUS, ar } from 'date-fns/locale';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import type { TaskStatus, TaskSummary } from '@/types/tasks';
import {
  getTaskStatusLabel,
  getTaskPriorityLabel,
  getTaskTypeLabel,
  TASK_PRIORITY_COLORS,
} from '@/types/tasks';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// --- Constants ---

const KANBAN_COLUMNS: TaskStatus[] = ['pending', 'assigned', 'in_progress', 'completed'];

const COLUMN_BORDER_COLORS: Record<string, string> = {
  pending: 'border-t-gray-400',
  assigned: 'border-t-blue-500',
  in_progress: 'border-t-purple-500',
  completed: 'border-t-green-500',
};

const COLUMN_DOT_COLORS: Record<string, string> = {
  pending: 'bg-gray-400',
  assigned: 'bg-blue-500',
  in_progress: 'bg-purple-500',
  completed: 'bg-green-500',
};

const COLUMN_COUNT_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

// Valid status transitions: source -> allowed targets
const VALID_TRANSITIONS: Record<string, TaskStatus[]> = {
  pending: ['assigned', 'in_progress'],
  assigned: ['pending', 'in_progress'],
  in_progress: ['assigned', 'completed'],
  completed: [],
};

// --- Props ---

interface TasksKanbanProps {
  organizationId: string;
  onSelectTask?: (taskId: string) => void;
}

// --- Due date helper ---

function getDueDateIndicator(dueDate: string | undefined | null, t: (key: string, fallback?: string) => string) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  if (isPast(due) && !isToday(due)) {
    return {
      label: t('tasks.kanbanDueOverdue'),
      colorClass: 'text-red-600 dark:text-red-400',
      bgClass: 'bg-red-50 dark:bg-red-900/20',
      Icon: AlertCircle,
    };
  }
  if (isToday(due)) {
    return {
      label: t('tasks.kanbanDueToday'),
      colorClass: 'text-orange-600 dark:text-orange-400',
      bgClass: 'bg-orange-50 dark:bg-orange-900/20',
      Icon: Flame,
    };
  }
  if (isTomorrow(due)) {
    return {
      label: t('tasks.kanbanDueTomorrow'),
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-900/20',
      Icon: CalendarClock,
    };
  }
  return null;
}

// --- Kanban Skeleton ---

function KanbanSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-8 w-48 mb-1" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KANBAN_COLUMNS.map((status) => (
          <div
            key={status}
            className={cn(
              'flex flex-col bg-gray-50 dark:bg-gray-900/50 rounded-lg border-t-4 min-h-[400px]',
              COLUMN_BORDER_COLORS[status],
            )}
          >
            <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            <div className="flex-1 p-2 space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-14 rounded" />
                    <Skeleton className="h-5 w-16 rounded" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-3.5 w-3.5 rounded" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-3.5 w-3.5 rounded" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Sortable Task Card ---

interface SortableTaskCardProps {
  task: TaskSummary;
  lang: string;
  t: (key: string, options?: any) => string;
  onSelect?: (taskId: string) => void;
  isDragOverlay?: boolean;
}

function SortableTaskCard({ task, lang, t, onSelect, isDragOverlay }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-pointer transition-all',
        'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600',
        isDragging && 'opacity-30',
        isDragOverlay && 'shadow-xl ring-2 ring-blue-500 rotate-2',
      )}
      onClick={() => onSelect?.(task.id)}
    >
      {/* Drag handle + Title */}
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 flex-1">
          {task.title}
        </h4>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {/* Priority */}
        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded', TASK_PRIORITY_COLORS[task.priority])}>
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            task.priority === 'urgent' ? 'bg-red-500' :
            task.priority === 'high' ? 'bg-orange-500' :
            task.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-500'
          )} />
          {getTaskPriorityLabel(task.priority, lang as 'en' | 'fr')}
        </span>

        {/* Task type */}
        <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {getTaskTypeLabel(task.task_type, lang as 'en' | 'fr')}
        </span>
      </div>

      {/* Meta info */}
      <div className="mt-2.5 space-y-1.5">
        {/* Worker */}
        {task.worker_name && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{task.worker_name}</span>
          </div>
        )}

        {/* Farm / Parcel */}
        {task.farm_name && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {task.farm_name}
              {task.parcel_name ? ` - ${task.parcel_name}` : ''}
            </span>
          </div>
        )}

        {/* Due date */}
        {task.due_date && task.status !== 'completed' && (() => {
          const indicator = getDueDateIndicator(task.due_date, t);
          const locale = lang.startsWith('fr') ? fr : lang.startsWith('ar') ? ar : enUS;
          return (
            <div className={cn(
              'flex items-center gap-1.5 text-xs',
              indicator ? indicator.colorClass : 'text-gray-500 dark:text-gray-400',
            )}>
              {indicator ? (
                <indicator.Icon className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              <span>
                {indicator?.label ?? format(new Date(task.due_date), 'dd MMM', { locale })}
              </span>
            </div>
          );
        })()}

        {/* Comment count */}
        {task.comment_count > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{task.comment_count}</span>
          </div>
        )}
      </div>

      {/* Extra indicators row */}
      {(
        (task.checklist && task.checklist.length > 0) ||
        (task.attachments && task.attachments.length > 0) ||
        task.repeat_pattern ||
        task.parent_task_id
      ) && (
        <div className="flex flex-wrap items-center gap-2.5 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          {/* Checklist indicator */}
          {task.checklist && task.checklist.length > 0 && (
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <ListChecks className="w-3.5 h-3.5" />
              <span className="text-xs">
                {task.checklist.filter((item: any) => item.completed).length}/{task.checklist.length}
              </span>
            </div>
          )}

          {/* Attachment count */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Paperclip className="w-3.5 h-3.5" />
              <span className="text-xs">{task.attachments.length}</span>
            </div>
          )}

          {/* Recurring indicator */}
          {task.repeat_pattern && (
            <div className="flex items-center gap-1 text-purple-500" title={t('tasks.kanbanRecurring', { frequency: task.repeat_pattern.frequency })}>
              <Repeat className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Parent task indicator */}
          {task.parent_task_id && (
            <div className="flex items-center gap-1 text-indigo-500" title={t('tasks.kanbanSubtask')}>
              <GitBranch className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Static card for DragOverlay ---

function TaskCardOverlay({ task, lang }: { task: TaskSummary; lang: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-500 p-3 shadow-xl rotate-2 w-[280px]">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
        {task.title}
      </h4>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded', TASK_PRIORITY_COLORS[task.priority])}>
          {getTaskPriorityLabel(task.priority, lang as 'en' | 'fr')}
        </span>
      </div>
      {task.worker_name && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mt-2">
          <User className="w-3.5 h-3.5" />
          <span>{task.worker_name}</span>
        </div>
      )}
    </div>
  );
}

// --- Kanban Column ---

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskSummary[];
  lang: string;
  t: (key: string, options?: any) => string;
  onSelectTask?: (taskId: string) => void;
  isDropTarget: boolean;
  isInvalidDrop: boolean;
}

function KanbanColumn({ status, tasks, lang, t, onSelectTask, isDropTarget, isInvalidDrop }: KanbanColumnProps) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div
      className={cn(
        'flex flex-col bg-gray-50 dark:bg-gray-900/50 rounded-lg border-t-4 min-h-[400px] transition-colors',
        COLUMN_BORDER_COLORS[status],
        isDropTarget && !isInvalidDrop && 'bg-blue-50/50 dark:bg-blue-900/10 ring-2 ring-blue-300 dark:ring-blue-700',
        isInvalidDrop && 'bg-red-50/50 dark:bg-red-900/10 ring-2 ring-red-300 dark:ring-red-700',
      )}
      data-status={status}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className={cn('w-2.5 h-2.5 rounded-full', COLUMN_DOT_COLORS[status])} />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {getTaskStatusLabel(status, lang as 'en' | 'fr')}
          </h3>
        </div>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', COLUMN_COUNT_COLORS[status])}>
          {tasks.length}
        </span>
      </div>

      {/* Scrollable task list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400 dark:text-gray-500">
              {t('tasks.kanbanEmpty')}
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                lang={lang}
                t={t}
                onSelect={onSelectTask}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// --- Main Kanban Component ---

const TasksKanban: React.FC<TasksKanbanProps> = ({ organizationId, onSelectTask }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('fr') ? 'fr' : i18n.language?.startsWith('ar') ? 'fr' : 'en';

  const { data: allTasks = [], isLoading, isError, error } = useTasks(organizationId, {});
  const updateTask = useUpdateTask();

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [overColumnStatus, setOverColumnStatus] = useState<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Filter out cancelled tasks, group by status
  const columnData = useMemo(() => {
    const filtered = allTasks.filter(
      (t) => t.status !== 'cancelled' && t.status !== 'overdue' && t.status !== 'paused',
    );

    const grouped: Record<TaskStatus, TaskSummary[]> = {
      pending: [],
      assigned: [],
      in_progress: [],
      completed: [],
      paused: [],
      cancelled: [],
      overdue: [],
    };

    for (const task of filtered) {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    }

    return grouped;
  }, [allTasks]);

  const activeTask = useMemo(
    () => (activeTaskId ? allTasks.find((t) => t.id === activeTaskId) ?? null : null),
    [activeTaskId, allTasks],
  );

  const isValidTransition = useCallback(
    (fromStatus: TaskStatus, toStatus: TaskStatus): boolean => {
      if (fromStatus === toStatus) return true;
      return VALID_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
    },
    [],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverColumnStatus(null);
      return;
    }

    // Determine which column we're over
    const overData = over.data?.current as { status?: TaskStatus } | undefined;
    if (overData?.status) {
      setOverColumnStatus(overData.status);
    } else {
      const overTask = allTasks.find((t) => t.id === over.id);
      if (overTask) {
        setOverColumnStatus(overTask.status);
      }
    }
  }, [allTasks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTaskId(null);
      setOverColumnStatus(null);

      if (!over) return;

      const draggedTask = allTasks.find((t) => t.id === active.id);
      if (!draggedTask) return;

      // Determine target status
      let targetStatus: TaskStatus | null = null;

      const overTask = allTasks.find((t) => t.id === over.id);
      if (overTask) {
        targetStatus = overTask.status;
      }

      const overData = over.data?.current as { status?: TaskStatus } | undefined;
      if (overData?.status) {
        targetStatus = overData.status;
      }

      if (!targetStatus || targetStatus === draggedTask.status) return;

      // Validate transition
      if (!isValidTransition(draggedTask.status, targetStatus)) return;

      // Optimistically update
      try {
        await updateTask.mutateAsync({
          taskId: draggedTask.id,
          organizationId,
          updates: {
            status: targetStatus,
            ...(targetStatus === 'in_progress' && !draggedTask.actual_start
              ? { actual_start: new Date().toISOString() }
              : {}),
            ...(targetStatus === 'completed'
              ? { completion_percentage: 100 }
              : {}),
          },
        });
      } catch (err) {
        console.error('Failed to update task status:', err);
      }
    },
    [allTasks, organizationId, updateTask, isValidTransition],
  );

  const handleDragCancel = useCallback(() => {
    setActiveTaskId(null);
    setOverColumnStatus(null);
  }, []);

  // --- Render ---

  if (isLoading) {
    return <KanbanSkeleton />;
  }

  if (isError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          {t('tasks.kanbanError')}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          {(error as Error)?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('tasks.kanbanTitle')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('tasks.kanbanSubtitle')}
          </p>
        </div>
        {updateTask.isPending && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('tasks.kanbanSaving')}
          </div>
        )}
      </div>

      {/* Kanban Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((status) => {
            const isDropTarget = overColumnStatus === status && activeTaskId !== null;
            const activeTaskStatus = activeTask?.status;
            const isInvalidDrop =
              isDropTarget &&
              activeTaskStatus !== undefined &&
              activeTaskStatus !== status &&
              !isValidTransition(activeTaskStatus, status);

            return (
              <KanbanColumn
                key={status}
                status={status}
                tasks={columnData[status]}
                lang={lang}
                t={t}
                onSelectTask={onSelectTask}
                isDropTarget={isDropTarget}
                isInvalidDrop={isInvalidDrop}
              />
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskCardOverlay task={activeTask} lang={lang} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default TasksKanban;
