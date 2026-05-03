import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { trackEntityCreate, trackEntityUpdate, trackEntityDelete } from '../lib/analytics';
import { tasksApi, type PaginatedTaskQuery } from "../lib/api/tasks";
import { runOrQueue as runOrQueueOffline } from "../lib/offline/runOrQueue";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "../hooks/useAuth";
import { useModuleEnabled } from './useModuleEnabled';
import type { PaginatedResponse } from "../lib/api/types";
import type {
  TaskFilters,
  TaskSummary,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskCategory,
  TaskComment,
  ClockInRequest,
  ClockOutRequest,
  WorkerAvailability,
} from "../types/tasks";

export type { PaginatedTaskQuery };

// =====================================================
// TASK QUERIES
// =====================================================

export function useTasks(organizationId: string, filters?: TaskFilters) {
  // Flatten filters into queryKey to avoid object reference issues
  const filterKey = filters ? JSON.stringify(filters) : undefined;
  const personnelEnabled = useModuleEnabled('personnel');

  return useQuery({
    queryKey: ["tasks", organizationId, filterKey],
    queryFn: async () => {
      if (!organizationId) return [];
      const res = await tasksApi.getAll(
        organizationId,
        filters as any,
      );
      return res.data;
    },
    enabled: personnelEnabled && !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function usePaginatedTasks(
  organizationId: string,
  query: PaginatedTaskQuery,
) {
  // Stable queryKey: serialize object to prevent re-render loops (TanStack uses reference equality)
  const queryKey = JSON.stringify(query);
  const personnelEnabled = useModuleEnabled('personnel');

  return useQuery({
    queryKey: ["tasks", "paginated", organizationId, queryKey],
    queryFn: async (): Promise<PaginatedResponse<TaskSummary>> => {
      if (!organizationId) {
        return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
      }
      return tasksApi.getPaginated(organizationId, query);
    },
    enabled: personnelEnabled && !!organizationId,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useTask(organizationId: string | null, taskId: string | null) {
  const personnelEnabled = useModuleEnabled('personnel');
  return useQuery({
    queryKey: ["task", organizationId, taskId],
    queryFn: async () => {
      if (!organizationId || !taskId) return null;
      return tasksApi.getById(organizationId, taskId);
    },
    enabled: personnelEnabled && !!organizationId && !!taskId,
  });
}

export function useTaskCategories(organizationId: string) {
  const personnelEnabled = useModuleEnabled('personnel');
  return useQuery({
    queryKey: ["task-categories", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return tasksApi.getCategories(organizationId);
    },
    enabled: personnelEnabled && !!organizationId,
  });
}

export function useTaskComments(taskId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      if (!taskId || !currentOrganization) return [];
      return tasksApi.getComments(currentOrganization.id, taskId);
    },
    enabled: !!taskId && !!currentOrganization,
  });
}

export function useTaskTimeLogs(taskId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ["task-time-logs", taskId],
    queryFn: async () => {
      if (!taskId || !currentOrganization) return [];
      return tasksApi.getTimeLogs(currentOrganization.id, taskId);
    },
    enabled: !!taskId && !!currentOrganization,
  });
}

// TODO: Add worker availability endpoint to NestJS API when needed
// Currently this hook is not being used in the application
export function useWorkerAvailability(_workerId: string | null, _date: string) {
  return useQuery({
    queryKey: ["worker-availability", _workerId, _date],
    queryFn: async () => {
      // Placeholder - needs NestJS API endpoint implementation
      return null as WorkerAvailability | null;
    },
    enabled: false, // Disabled until API endpoint is implemented
  });
}

export function useTaskStatistics(organizationId: string) {
  return useQuery({
    queryKey: ["task-statistics", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      return tasksApi.getStatistics(organizationId);
    },
    enabled: !!organizationId,
  });
}

// =====================================================
// TASK MUTATIONS
// =====================================================

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateTaskRequest & { organization_id: string; client_id?: string },
    ) => {
      const { organization_id, client_id, ...taskData } = request;
      const cid = client_id ?? uuidv4();
      const payload: CreateTaskRequest & { client_id: string } = {
        ...(taskData as CreateTaskRequest),
        client_id: cid,
      };
      const outcome = await runOrQueueOffline(
        {
          organizationId: organization_id,
          resource: 'task',
          method: 'POST',
          url: '/api/v1/tasks',
          payload,
          clientId: cid,
        },
        () => tasksApi.create(payload, organization_id),
      );
      if (outcome.status === 'queued') {
        // Optimistic stub the UI can render with (pending) badge
        return {
          ...payload,
          id: cid,
          _pending: true,
        } as unknown as Awaited<ReturnType<typeof tasksApi.create>>;
      }
      return outcome.result;
    },
    onSuccess: (_data, variables) => {
      trackEntityCreate('task');
      const orgId = variables.organization_id;
      // Invalidate all tasks queries (both paginated and non-paginated)
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-statistics", orgId] });
      // Also invalidate workers queries as tasks can affect worker data
      queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      organizationId,
      updates,
      version,
    }: {
      taskId: string;
      organizationId: string;
      updates: UpdateTaskRequest;
      version?: number;
    }) => {
      const cid = uuidv4();
      const outcome = await runOrQueueOffline(
        {
          organizationId,
          resource: 'task',
          method: 'PATCH',
          url: `/api/v1/tasks/${taskId}`,
          payload: updates,
          ifMatchVersion: version ?? null,
          clientId: cid,
        },
        () => tasksApi.update(taskId, updates, organizationId),
      );
      if (outcome.status === 'queued') {
        return { id: taskId, _pending: true, ...updates } as unknown as Awaited<
          ReturnType<typeof tasksApi.update>
        >;
      }
      return outcome.result;
    },
    onSuccess: (_data, variables) => {
      trackEntityUpdate('task');
      const orgId = variables.organizationId;
      queryClient.invalidateQueries({
        queryKey: ["task", orgId, variables.taskId],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-statistics", orgId] });
      queryClient.invalidateQueries({
        queryKey: ["task-comments", variables.taskId],
      });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      organizationId,
    }: {
      taskId: string;
      organizationId: string;
    }) => {
      const cid = uuidv4();
      const outcome = await runOrQueueOffline(
        {
          organizationId,
          resource: 'task',
          method: 'DELETE',
          url: `/api/v1/tasks/${taskId}`,
          payload: {},
          clientId: cid,
        },
        () => tasksApi.delete(taskId, organizationId),
      );
      void outcome;
      return { taskId, organizationId };
    },
    onSuccess: (_data, variables) => {
      trackEntityDelete('task');
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({
        queryKey: ["task-statistics", variables.organizationId],
      });
    },
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      organizationId,
      workerId,
    }: {
      taskId: string;
      organizationId: string;
      workerId: string;
    }) => {
      const cid = uuidv4();
      const outcome = await runOrQueueOffline(
        {
          organizationId,
          resource: 'task-assignment',
          method: 'PATCH',
          url: `/api/v1/tasks/${taskId}/assign`,
          payload: { worker_id: workerId },
          clientId: cid,
        },
        () => tasksApi.assign(organizationId, taskId, workerId),
      );
      if (outcome.status === 'queued') {
        return { id: taskId, organization_id: organizationId, _pending: true } as unknown as Awaited<
          ReturnType<typeof tasksApi.assign>
        >;
      }
      return outcome.result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["task", data.organization_id, data.id],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (request: ClockInRequest) => {
      if (!currentOrganization) {
        throw new Error("No organization selected");
      }

      const payload = {
        worker_id: request.worker_id,
        location_lat: request.location_lat,
        location_lng: request.location_lng,
        notes: request.notes,
      };
      const cid = uuidv4();
      const outcome = await runOrQueueOffline(
        {
          organizationId: currentOrganization.id,
          resource: 'task-time-log',
          method: 'POST',
          url: `/api/v1/tasks/${request.task_id}/clock-in`,
          payload,
          clientId: cid,
        },
        () => tasksApi.clockIn(currentOrganization.id, request.task_id, payload),
      );
      if (outcome.status === 'queued') {
        return { queued: true, taskId: request.task_id } as const;
      }
      return outcome.result;
    },
    onSuccess: (data) => {
      // When queued we don't have a task id on the response shape,
      // so invalidate broadly in that case.
      if ('queued' in data) {
        queryClient.invalidateQueries({ queryKey: ['task-time-logs', data.taskId] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        return;
      }
      queryClient.invalidateQueries({
        queryKey: ['task', currentOrganization?.id, data.task.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['task-time-logs', data.task.id],
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (request: ClockOutRequest & { units_completed?: number; photo_url?: string }) => {
      if (!currentOrganization) {
        throw new Error("No organization selected");
      }

      const payload = {
        break_duration: request.break_duration,
        notes: request.notes,
        units_completed: request.units_completed,
        photo_url: request.photo_url,
      };
      const cid = uuidv4();
      const outcome = await runOrQueueOffline(
        {
          organizationId: currentOrganization.id,
          resource: 'task-time-log',
          method: 'POST',
          url: `/api/v1/tasks/time-logs/${request.time_log_id}/clock-out`,
          payload,
          clientId: cid,
        },
        () => tasksApi.clockOut(currentOrganization.id, request.time_log_id, payload),
      );
      if (outcome.status === 'queued') {
        return { queued: true } as const;
      }
      return outcome.result;
    },
    onSuccess: (data) => {
      if ('queued' in data) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        return;
      }
      if (data.task) {
        queryClient.invalidateQueries({
          queryKey: ['task', currentOrganization?.id, data.task.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['task-time-logs', data.task.id],
        });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    },
  });
}

export function useAddTaskComment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (
      comment: Omit<TaskComment, "id" | "created_at" | "updated_at"> & { type?: string },
    ) => {
      if (!currentOrganization) {
        throw new Error("No organization selected");
      }

      const payload = {
        comment: comment.comment,
        worker_id: comment.worker_id,
        type: comment.type,
      };
      const cid = uuidv4();
      const outcome = await runOrQueueOffline(
        {
          organizationId: currentOrganization.id,
          resource: 'task-comment',
          method: 'POST',
          url: `/api/v1/tasks/${comment.task_id}/comments`,
          payload,
          clientId: cid,
        },
        () => tasksApi.addComment(currentOrganization.id, comment.task_id, payload),
      );
      if (outcome.status === 'queued') {
        return { queued: true, task_id: comment.task_id } as const;
      }
      return outcome.result;
    },
    onSuccess: (data) => {
      trackEntityCreate('task');
      queryClient.invalidateQueries({
        queryKey: ['task-comments', data.task_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['task', currentOrganization?.id, data.task_id],
      });
    },
  });
}

export function useUpdateTaskComment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, commentId, comment }: { taskId: string; commentId: string; comment: string }) => {
      if (!currentOrganization) throw new Error('No organization selected');
      return tasksApi.updateComment(currentOrganization.id, taskId, commentId, { comment });
    },
    onSuccess: (_data, variables) => {
      trackEntityUpdate('task');
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
    },
  });
}

export function useDeleteTaskComment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, commentId }: { taskId: string; commentId: string }) => {
      if (!currentOrganization) throw new Error('No organization selected');
      return tasksApi.deleteComment(currentOrganization.id, taskId, commentId);
    },
    onSuccess: (_data, variables) => {
      trackEntityDelete('task');
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
    },
  });
}

export function useResolveTaskComment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, commentId, resolved }: { taskId: string; commentId: string; resolved: boolean }) => {
      if (!currentOrganization) throw new Error('No organization selected');
      return tasksApi.resolveComment(currentOrganization.id, taskId, commentId, resolved);
    },
    onSuccess: (_data, variables) => {
      trackEntityUpdate('task');
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
    },
  });
}

// =====================================================
// WATCHERS HOOKS
// =====================================================

export function useTaskWatchers(taskId: string | null) {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['task-watchers', currentOrganization?.id, taskId],
    queryFn: () => tasksApi.getWatchers(currentOrganization!.id, taskId!),
    enabled: !!currentOrganization?.id && !!taskId,
  });
}

export function useFollowTask() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!currentOrganization) throw new Error('No organization selected');
      return tasksApi.followTask(currentOrganization.id, taskId);
    },
    onSuccess: (_data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['task-watchers', currentOrganization?.id, taskId] });
    },
  });
}

export function useUnfollowTask() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!currentOrganization) throw new Error('No organization selected');
      return tasksApi.unfollowTask(currentOrganization.id, taskId);
    },
    onSuccess: (_data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['task-watchers', currentOrganization?.id, taskId] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      organizationId,
      qualityRating,
      actualCost,
      notes,
    }: {
      taskId: string;
      organizationId: string;
      qualityRating?: number;
      actualCost?: number;
      notes?: string;
    }) => {
      const payload = {
        quality_rating: qualityRating,
        actual_cost: actualCost,
        notes,
      };
      const cid = uuidv4();
      const outcome = await runOrQueueOffline(
        {
          organizationId,
          resource: 'task-completion',
          method: 'POST',
          url: `/api/v1/tasks/${taskId}/complete`,
          payload,
          clientId: cid,
        },
        () => tasksApi.complete(organizationId, taskId, payload),
      );
      if (outcome.status === 'queued') {
        return { id: taskId, _pending: true } as unknown as Awaited<
          ReturnType<typeof tasksApi.complete>
        >;
      }
      return outcome.result;
    },
    onSuccess: (_data, variables) => {
      trackEntityUpdate('task');
      queryClient.invalidateQueries({
        queryKey: ["task", variables.organizationId, variables.taskId],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({
        queryKey: ["task-statistics", variables.organizationId],
      });
    },
  });
}

// =====================================================
// CHECKLIST HOOKS
// =====================================================

export function useTaskChecklist(taskId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['task-checklist', currentOrganization?.id, taskId],
    queryFn: () => tasksApi.getChecklist(currentOrganization!.id, taskId!),
    enabled: !!currentOrganization?.id && !!taskId,
  });
}

export function useAddChecklistItem() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      if (!currentOrganization) throw new Error('No organization selected');
      return tasksApi.addChecklistItem(currentOrganization.id, taskId, title);
    },
    onSuccess: (_data, variables) => {
      trackEntityCreate('task');
      queryClient.invalidateQueries({ queryKey: ['task-checklist', currentOrganization?.id, variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', currentOrganization?.id, variables.taskId] });
    },
  });
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, itemId }: { taskId: string; itemId: string }) => {
      if (!currentOrganization) throw new Error('No organization selected');
      return tasksApi.toggleChecklistItem(currentOrganization.id, taskId, itemId);
    },
    onSuccess: (_data, variables) => {
      trackEntityUpdate('task');
      queryClient.invalidateQueries({ queryKey: ['task-checklist', currentOrganization?.id, variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', currentOrganization?.id, variables.taskId] });
    },
  });
}

export function useRemoveChecklistItem() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, itemId }: { taskId: string; itemId: string }) => {
      if (!currentOrganization) throw new Error('No organization selected');
      return tasksApi.removeChecklistItem(currentOrganization.id, taskId, itemId);
    },
    onSuccess: (_data, variables) => {
      trackEntityDelete('task');
      queryClient.invalidateQueries({ queryKey: ['task-checklist', currentOrganization?.id, variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', currentOrganization?.id, variables.taskId] });
    },
  });
}

// =====================================================
// DEPENDENCY HOOKS
// =====================================================

export function useTaskDependencies(taskId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['task-dependencies', currentOrganization?.id, taskId],
    queryFn: () => tasksApi.getDependencies(currentOrganization!.id, taskId!),
    enabled: !!currentOrganization?.id && !!taskId,
  });
}

export function useAddDependency() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, dependsOnTaskId, dependencyType, lagDays }: { taskId: string; dependsOnTaskId: string; dependencyType?: string; lagDays?: number }) => {
      if (!currentOrganization) throw new Error('No organization selected');
      return tasksApi.addDependency(currentOrganization.id, taskId, dependsOnTaskId, dependencyType, lagDays);
    },
    onSuccess: (_data, variables) => {
      trackEntityCreate('task');
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', currentOrganization?.id, variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', currentOrganization?.id, variables.dependsOnTaskId] });
      queryClient.invalidateQueries({ queryKey: ['task-blocked', currentOrganization?.id, variables.taskId] });
    },
  });
}

export function useRemoveDependency() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ dependencyId }: { dependencyId: string }) => {
      if (!currentOrganization) throw new Error('No organization selected');
      return tasksApi.removeDependency(currentOrganization.id, dependencyId);
    },
    onSuccess: () => {
      trackEntityDelete('task');
      queryClient.invalidateQueries({ queryKey: ['task-dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['task-blocked'] });
    },
  });
}

export function useIsTaskBlocked(taskId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['task-blocked', currentOrganization?.id, taskId],
    queryFn: () => tasksApi.isTaskBlocked(currentOrganization!.id, taskId!),
    enabled: !!currentOrganization?.id && !!taskId,
  });
}

export function useCreateTaskCategory() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (
      category: Omit<
        TaskCategory,
        "id" | "created_at" | "updated_at" | "is_active"
      >,
    ) => {
      if (!currentOrganization) {
        throw new Error("No organization selected");
      }

      return tasksApi.createCategory(currentOrganization.id, category);
    },
    onSuccess: () => {
      trackEntityCreate('task');
      queryClient.invalidateQueries({
        queryKey: ["task-categories", currentOrganization?.id],
      });
    },
  });
}
