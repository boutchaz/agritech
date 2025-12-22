import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskAssignmentsApi, TaskAssignment, CreateTaskAssignmentDto, BulkCreateTaskAssignmentsDto, UpdateTaskAssignmentDto } from '../lib/api/task-assignments';
import { useAuth } from '../components/MultiTenantAuthProvider';

export function useTaskAssignments(taskId: string | undefined) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['task-assignments', taskId, organizationId],
    queryFn: () => taskAssignmentsApi.getTaskAssignments(organizationId!, taskId!),
    enabled: !!organizationId && !!taskId,
  });
}

export function useCreateTaskAssignment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: CreateTaskAssignmentDto }) =>
      taskAssignmentsApi.createAssignment(organizationId!, taskId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignments', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useBulkCreateTaskAssignments() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: BulkCreateTaskAssignmentsDto }) =>
      taskAssignmentsApi.bulkCreateAssignments(organizationId!, taskId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignments', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTaskAssignment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useMutation({
    mutationFn: ({
      taskId,
      assignmentId,
      data,
    }: {
      taskId: string;
      assignmentId: string;
      data: UpdateTaskAssignmentDto;
    }) => taskAssignmentsApi.updateAssignment(organizationId!, taskId, assignmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignments', variables.taskId] });
    },
  });
}

export function useRemoveTaskAssignment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useMutation({
    mutationFn: ({ taskId, assignmentId }: { taskId: string; assignmentId: string }) =>
      taskAssignmentsApi.removeAssignment(organizationId!, taskId, assignmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignments', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
