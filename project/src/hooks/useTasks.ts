import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { tasksApi, type PaginatedTaskQuery } from "../lib/api/tasks";
import { useAuth } from "../hooks/useAuth";
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
  
  return useQuery({
    queryKey: ["tasks", organizationId, filterKey],
    queryFn: async () => {
      if (!organizationId) return [];
      const res = await tasksApi.getAll(organizationId, filters);
      return res.data;
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function usePaginatedTasks(
  organizationId: string,
  query: PaginatedTaskQuery,
) {
  // Stable queryKey: serialize object to prevent re-render loops (TanStack uses reference equality)
  const queryKey = JSON.stringify(query);

  return useQuery({
    queryKey: ["tasks", "paginated", organizationId, queryKey],
    queryFn: async (): Promise<PaginatedResponse<TaskSummary>> => {
      if (!organizationId) {
        return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
      }
      return tasksApi.getPaginated(organizationId, query);
    },
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useTask(organizationId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: ["task", organizationId, taskId],
    queryFn: async () => {
      if (!organizationId || !taskId) return null;
      return tasksApi.getById(organizationId, taskId);
    },
    enabled: !!organizationId && !!taskId,
  });
}

export function useTaskCategories(organizationId: string) {
  return useQuery({
    queryKey: ["task-categories", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return tasksApi.getCategories(organizationId);
    },
    enabled: !!organizationId,
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
      request: CreateTaskRequest & { organization_id: string },
    ) => {
      const { organization_id, ...taskData } = request;
      return tasksApi.create(taskData, organization_id);
    },
    onSuccess: (_data, variables) => {
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
    }: {
      taskId: string;
      organizationId: string;
      updates: UpdateTaskRequest;
    }) => {
      return tasksApi.update(taskId, updates, organizationId);
    },
    onSuccess: (_data, variables) => {
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
      await tasksApi.delete(taskId, organizationId);
      return { taskId, organizationId };
    },
    onSuccess: (_data, variables) => {
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
      return tasksApi.assign(organizationId, taskId, workerId);
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

      return tasksApi.clockIn(currentOrganization.id, request.task_id, {
        worker_id: request.worker_id,
        location_lat: request.location_lat,
        location_lng: request.location_lng,
        notes: request.notes,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["task", currentOrganization?.id, data.task.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-time-logs", data.task.id],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (request: ClockOutRequest) => {
      if (!currentOrganization) {
        throw new Error("No organization selected");
      }

      return tasksApi.clockOut(currentOrganization.id, request.time_log_id, {
        break_duration: request.break_duration,
        notes: request.notes,
      });
    },
    onSuccess: (data) => {
      if (data.task) {
        queryClient.invalidateQueries({
          queryKey: ["task", currentOrganization?.id, data.task.id],
        });
        queryClient.invalidateQueries({
          queryKey: ["task-time-logs", data.task.id],
        });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
    },
  });
}

export function useAddTaskComment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (
      comment: Omit<TaskComment, "id" | "created_at" | "updated_at">,
    ) => {
      if (!currentOrganization) {
        throw new Error("No organization selected");
      }

      return tasksApi.addComment(currentOrganization.id, comment.task_id, {
        comment: comment.comment,
        worker_id: comment.worker_id,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["task-comments", data.task_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task", currentOrganization?.id, data.task_id],
      });
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
      return tasksApi.complete(organizationId, taskId, {
        quality_rating: qualityRating,
        actual_cost: actualCost,
        notes,
      });
    },
    onSuccess: (_data, variables) => {
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
      queryClient.invalidateQueries({
        queryKey: ["task-categories", currentOrganization?.id],
      });
    },
  });
}
