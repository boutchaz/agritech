import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { tasksApi } from '../lib/api/tasks';
import type {
  TaskFilters,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskCategory,
  TaskComment,
  TaskTimeLog,
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
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data || []) as TaskCategory[];
    },
    enabled: !!organizationId,
  });
}

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:auth.users!user_id(email),
          worker:workers!worker_id(first_name, last_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(comment => ({
        ...comment,
        user_name: comment.user?.email,
        worker_name: comment.worker
          ? `${comment.worker.first_name} ${comment.worker.last_name}`
          : undefined,
      })) as TaskComment[];
    },
    enabled: !!taskId,
  });
}

export function useTaskTimeLogs(taskId: string | null) {
  return useQuery({
    queryKey: ['task-time-logs', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_time_logs')
        .select(`
          *,
          worker:workers!worker_id(first_name, last_name)
        `)
        .eq('task_id', taskId)
        .order('start_time', { ascending: false });

      if (error) throw error;

      return (data || []).map(log => ({
        ...log,
        worker_name: log.worker
          ? `${log.worker.first_name} ${log.worker.last_name}`
          : undefined,
      })) as TaskTimeLog[];
    },
    enabled: !!taskId,
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

  return useMutation({
    mutationFn: async (request: ClockInRequest) => {
      // Create time log
      const { data: timeLog, error: timeLogError } = await supabase
        .from('task_time_logs')
        .insert({
          task_id: request.task_id,
          worker_id: request.worker_id,
          start_time: new Date().toISOString(),
          location_lat: request.location_lat,
          location_lng: request.location_lng,
          notes: request.notes,
        })
        .select()
        .single();

      if (timeLogError) throw timeLogError;

      // Update task status to in_progress
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .update({ 
          status: 'in_progress',
          actual_start: new Date().toISOString(),
        })
        .eq('id', request.task_id)
        .select()
        .single();

      if (taskError) throw taskError;

      return { timeLog, task };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.task.id] });
      queryClient.invalidateQueries({ queryKey: ['task-time-logs', data.task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', data.task.organization_id] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ClockOutRequest) => {
      const { data, error } = await supabase
        .from('task_time_logs')
        .update({
          end_time: new Date().toISOString(),
          break_duration: request.break_duration || 0,
          notes: request.notes,
        })
        .eq('id', request.time_log_id)
        .select('*, task:tasks!task_id(id, organization_id)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.task) {
        queryClient.invalidateQueries({ queryKey: ['task', data.task.id] });
        queryClient.invalidateQueries({ queryKey: ['task-time-logs', data.task.id] });
        queryClient.invalidateQueries({ queryKey: ['tasks', data.task.organization_id] });
      }
    },
  });
}

export function useAddTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: Omit<TaskComment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('task_comments')
        .insert(comment)
        .select()
        .single();

      if (error) throw error;
      return data as TaskComment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.task_id] });
      queryClient.invalidateQueries({ queryKey: ['task', data.task_id] });
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

  return useMutation({
    mutationFn: async (category: Omit<TaskCategory, 'id' | 'created_at' | 'updated_at' | 'is_active'>) => {
      const { data, error } = await supabase
        .from('task_categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data as TaskCategory;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-categories', data.organization_id] });
    },
  });
}

