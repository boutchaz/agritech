// Notifications Hooks for Mobile App
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, approvalsApi } from '@/lib/api/notifications';
import { useAuthStore } from '@/stores/authStore';
import type {
  NotificationFilters,
  ApprovalFilters,
} from '@/types/notification';

// Query Keys
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (filters?: NotificationFilters) => [...notificationKeys.all, 'list', filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

export const approvalKeys = {
  all: ['approvals'] as const,
  list: (filters?: ApprovalFilters) => [...approvalKeys.all, 'list', filters] as const,
  pendingCount: () => [...approvalKeys.all, 'pending-count'] as const,
  detail: (id: string) => [...approvalKeys.all, 'detail', id] as const,
};

// Notifications Hooks
export function useNotifications(filters?: NotificationFilters) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => notificationsApi.getNotifications(filters),
    enabled: !!orgId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useUnreadNotificationCount() {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: !!orgId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refetch every minute
    select: (data) => data.count,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// Approvals Hooks
export function useApprovals(filters?: ApprovalFilters) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: approvalKeys.list(filters),
    queryFn: () => approvalsApi.getApprovals(filters),
    enabled: !!orgId,
    staleTime: 30 * 1000,
  });
}

export function usePendingApprovalsCount() {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: approvalKeys.pendingCount(),
    queryFn: () => approvalsApi.getPendingCount(),
    enabled: !!orgId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    select: (data) => data.count,
  });
}

export function useApproval(approvalId: string) {
  return useQuery({
    queryKey: approvalKeys.detail(approvalId),
    queryFn: () => approvalsApi.getApproval(approvalId),
    enabled: !!approvalId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ approvalId, notes }: { approvalId: string; notes?: string }) =>
      approvalsApi.approve(approvalId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ approvalId, reason }: { approvalId: string; reason: string }) =>
      approvalsApi.reject(approvalId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}
