import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, filesApi, type Task } from '@/lib/api';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Record<string, string | undefined>) => [...taskKeys.lists(), filters] as const,
  myTasks: () => [...taskKeys.all, 'my-tasks'] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  statistics: () => [...taskKeys.all, 'statistics'] as const,
  timeLogs: (taskId: string) => [...taskKeys.all, 'time-logs', taskId] as const,
};

export function useMyTasks() {
  return useQuery({
    queryKey: taskKeys.myTasks(),
    queryFn: () => tasksApi.getMyTasks(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTasks(filters?: { status?: string; farmId?: string; parcelId?: string }) {
  return useQuery({
    queryKey: taskKeys.list(filters || {}),
    queryFn: () => tasksApi.getTasks(filters),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => tasksApi.getTask(taskId),
    enabled: !!taskId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTaskStatistics() {
  return useQuery({
    queryKey: taskKeys.statistics(),
    queryFn: () => tasksApi.getStatistics(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTaskTimeLogs(taskId: string) {
  return useQuery({
    queryKey: taskKeys.timeLogs(taskId),
    queryFn: () => tasksApi.getTimeLogs(taskId),
    enabled: !!taskId,
    staleTime: 1 * 60 * 1000,
  });
}

export function useUploadTaskPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uri, folder }: { uri: string; folder?: string }) =>
      filesApi.uploadImage(uri, folder || 'tasks'),
    onSuccess: () => {
      // Invalidate relevant queries if needed
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: Task['status'] }) =>
      tasksApi.updateTaskStatus(taskId, status),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
      queryClient.invalidateQueries({ queryKey: taskKeys.statistics() });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string;
      data: { notes?: string; completion_data?: unknown };
    }) => tasksApi.completeTask(taskId, data),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
      queryClient.invalidateQueries({ queryKey: taskKeys.statistics() });
    },
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      location,
    }: {
      taskId: string;
      location?: { lat: number; lng: number };
    }) => tasksApi.clockIn(taskId, { location }),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.timeLogs(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      timeLogId,
      location,
      notes,
    }: {
      timeLogId: string;
      taskId: string;
      location?: { lat: number; lng: number };
      notes?: string;
    }) => tasksApi.clockOut(timeLogId, { location, notes }),
    onSuccess: (_, variables) => {
      const { taskId } = variables;
      queryClient.invalidateQueries({ queryKey: taskKeys.timeLogs(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}

export function useAddTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      tasksApi.addComment(taskId, content),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}
