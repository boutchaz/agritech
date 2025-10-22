import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  Task,
  TaskSummary,
  TaskFilters,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskCategory,
  TaskComment,
  TaskTimeLog,
  ClockInRequest,
  ClockOutRequest,
  TaskStatistics,
  WorkerAvailability,
} from '../types/tasks';

// =====================================================
// TASK QUERIES
// =====================================================

export function useTasks(organizationId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', organizationId, filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          worker:workers!assigned_to(first_name, last_name),
          farm:farms!farm_id(name),
          parcel:parcels!parcel_id(name)
        `)
        .eq('organization_id', organizationId);

      if (filters?.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        query = query.in('status', statuses);
      }

      if (filters?.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
        query = query.in('priority', priorities);
      }

      if (filters?.task_type) {
        const types = Array.isArray(filters.task_type) ? filters.task_type : [filters.task_type];
        query = query.in('task_type', types);
      }

      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      if (filters?.farm_id) {
        query = query.eq('farm_id', filters.farm_id);
      }

      if (filters?.parcel_id) {
        query = query.eq('parcel_id', filters.parcel_id);
      }

      if (filters?.date_from) {
        query = query.gte('scheduled_start', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('scheduled_start', filters.date_to);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      query = query.order('scheduled_start', { ascending: false, nullsFirst: false });

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as TaskSummary[];
    },
    enabled: !!organizationId,
  });
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          worker:workers!assigned_to(first_name, last_name),
          farm:farms!farm_id(name),
          parcel:parcels!parcel_id(name)
        `)
        .eq('id', taskId!)
        .single();

      if (error) throw error;
      return data as TaskSummary;
    },
    enabled: !!taskId,
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
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:auth.users!user_id(email),
          worker:workers!worker_id(first_name, last_name)
        `)
        .eq('task_id', taskId!)
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
      const { data, error } = await supabase
        .from('task_time_logs')
        .select(`
          *,
          worker:workers!worker_id(first_name, last_name)
        `)
        .eq('task_id', taskId!)
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

export function useTaskStatistics(organizationId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: ['task-statistics', organizationId, filters],
    queryFn: async () => {
      // Fetch tasks for statistics
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          *,
          worker:workers!assigned_to(first_name, last_name)
        `)
        .eq('organization_id', organizationId);

      if (error) throw error;

      // Calculate statistics
      const total_tasks = tasks?.length || 0;
      const completed_tasks = tasks?.filter(t => t.status === 'completed').length || 0;
      const in_progress_tasks = tasks?.filter(t => t.status === 'in_progress').length || 0;
      const overdue_tasks = tasks?.filter(t => t.status === 'overdue').length || 0;
      
      const stats: TaskStatistics = {
        total_tasks,
        completed_tasks,
        in_progress_tasks,
        overdue_tasks,
        completion_rate: total_tasks > 0 ? (completed_tasks / total_tasks) * 100 : 0,
        average_completion_time: 0, // Would need to calculate from time logs
        total_cost: tasks?.reduce((sum, t) => sum + (t.actual_cost || 0), 0) || 0,
        tasks_by_type: {},
        tasks_by_priority: {},
        tasks_by_worker: [],
      };

      return stats;
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
      const { data, error } = await supabase
        .from('tasks')
        .insert(request)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
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
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: UpdateTaskRequest }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['task-statistics', data.organization_id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      // Get task first to know organization_id
      const { data: task } = await supabase
        .from('tasks')
        .select('organization_id')
        .eq('id', taskId)
        .single();

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return { taskId, organizationId: task?.organization_id };
    },
    onSuccess: (data) => {
      if (data.organizationId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', data.organizationId] });
        queryClient.invalidateQueries({ queryKey: ['task-statistics', data.organizationId] });
      }
    },
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, workerId }: { taskId: string; workerId: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          assigned_to: workerId,
          status: 'assigned',
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
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
      qualityRating, 
      actualCost, 
      notes 
    }: { 
      taskId: string; 
      qualityRating?: number; 
      actualCost?: number; 
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString(),
          actual_end: new Date().toISOString(),
          completion_percentage: 100,
          quality_rating: qualityRating,
          actual_cost: actualCost,
          notes: notes,
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
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

