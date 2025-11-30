import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { tasksApi } from '../lib/api/tasks';
import { useAuth } from '../components/MultiTenantAuthProvider';
import type {
  TaskFilters,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskCategory,
  TaskComment,
  ClockInRequest,
  ClockOutRequest,
  WorkerAvailability,
} from '../types/tasks';

// =====================================================
// TASK QUERIES
// =====================================================

export function useTasks(organizationId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      return tasksApi.getAll(organizationId, filters);
    },
    enabled: !!organizationId,
  });
}

export function useTask(organizationId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: ['task', organizationId, taskId],
    queryFn: async () => {
      if (!organizationId || !taskId) return null;
      return tasksApi.getById(organizationId, taskId);
    },
    enabled: !!organizationId && !!taskId,
  });
}

export function useTaskCategories(organizationId: string) {
  return useQuery({
    queryKey: ['task-categories', organizationId],
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
    queryKey: ['task-comments', taskId],
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
    queryKey: ['task-time-logs', taskId],
    queryFn: async () => {
      if (!taskId || !currentOrganization) return [];
      return tasksApi.getTimeLogs(currentOrganization.id, taskId);
    },
    enabled: !!taskId && !!currentOrganization,
  });
}

export function useWorkerAvailability(workerId: string | null, date: string) {
  return useQuery({
    queryKey: ['worker-availability', workerId, date],
    queryFn: async () => {
      if (!workerId || !date) return null;

      const { data, error } = await supabase
        .rpc('get_worker_availability', {
          p_worker_id: workerId,
          p_date: date,
        });

      if (error) throw error;
      return data as WorkerAvailability;
    },
    enabled: !!workerId && !!date,
  });
}

export function useTaskStatistics(organizationId: string) {
  return useQuery({
    queryKey: ['task-statistics', organizationId],
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
    mutationFn: async (request: CreateTaskRequest & { organization_id: string }) => {
      const { organization_id, ...taskData } = request;
      return tasksApi.create(organization_id, taskData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['task-statistics', data.organization_id] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, organizationId, updates }: { taskId: string; organizationId: string; updates: UpdateTaskRequest }) => {
      return tasksApi.update(organizationId, taskId, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.organization_id, data.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['task-statistics', data.organization_id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, organizationId }: { taskId: string; organizationId: string }) => {
      await tasksApi.delete(organizationId, taskId);
      return { taskId, organizationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['task-statistics', data.organizationId] });
    },
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, organizationId, workerId }: { taskId: string; organizationId: string; workerId: string }) => {
      return tasksApi.assign(organizationId, taskId, workerId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.organization_id, data.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', data.organization_id] });
    },
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (request: ClockInRequest) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }

      return tasksApi.clockIn(currentOrganization.id, request.task_id, {
        worker_id: request.worker_id,
        location_lat: request.location_lat,
        location_lng: request.location_lng,
        notes: request.notes,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', currentOrganization?.id, data.task.id] });
      queryClient.invalidateQueries({ queryKey: ['task-time-logs', data.task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentOrganization?.id] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (request: ClockOutRequest) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }

      return tasksApi.clockOut(currentOrganization.id, request.time_log_id, {
        break_duration: request.break_duration,
        notes: request.notes,
      });
    },
    onSuccess: (data) => {
      if (data.task) {
        queryClient.invalidateQueries({ queryKey: ['task', currentOrganization?.id, data.task.id] });
        queryClient.invalidateQueries({ queryKey: ['task-time-logs', data.task.id] });
        queryClient.invalidateQueries({ queryKey: ['tasks', currentOrganization?.id] });
      }
    },
  });
}

export function useAddTaskComment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (comment: Omit<TaskComment, 'id' | 'created_at' | 'updated_at'>) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }

      return tasksApi.addComment(currentOrganization.id, comment.task_id, {
        comment: comment.comment,
        worker_id: comment.worker_id,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.task_id] });
      queryClient.invalidateQueries({ queryKey: ['task', currentOrganization?.id, data.task_id] });
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
      notes
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.organization_id, data.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['task-statistics', data.organization_id] });
    },
  });
}

export function useCreateTaskCategory() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (category: Omit<TaskCategory, 'id' | 'created_at' | 'updated_at' | 'is_active'>) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }

      return tasksApi.createCategory(currentOrganization.id, category);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-categories', currentOrganization?.id] });
    },
  });
}

