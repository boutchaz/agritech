import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { socketManager, NotificationData, SocketStatus } from '../lib/socket';
import { apiClient } from '../lib/api-client';

export interface NotificationFilters {
  isRead?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface UseNotificationsReturn {
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  socketStatus: SocketStatus;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => void;
}

const NOTIFICATIONS_QUERY_KEY = 'notifications';
const UNREAD_COUNT_QUERY_KEY = 'notifications-unread-count';

export function useNotifications(filters: NotificationFilters = {}): UseNotificationsReturn {
  const { user, currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');

  const organizationId = currentOrganization?.id;

  // Connect to WebSocket when organization is available
  useEffect(() => {
    console.log('[useNotifications] Effect triggered', {
      organizationId,
      userId: user?.id,
      hasUser: !!user,
      hasOrg: !!organizationId
    });

    if (organizationId && user) {
      console.log('[useNotifications] Connecting to WebSocket...');
      socketManager.connect(organizationId);
    } else {
      console.log('[useNotifications] Skipping WebSocket - missing user or org');
    }

    return () => {
      // Don't disconnect on unmount - keep connection for other components
    };
  }, [organizationId, user]);

  // Subscribe to socket status changes
  useEffect(() => {
    const unsubscribe = socketManager.onStatusChange(setSocketStatus);
    return unsubscribe;
  }, []);

  // Subscribe to real-time notifications
  useEffect(() => {
    const handleNewNotification = (notification: NotificationData) => {
      // Add to cache
      queryClient.setQueryData<NotificationData[]>(
        [NOTIFICATIONS_QUERY_KEY, organizationId, filters],
        (old = []) => [notification, ...old]
      );

      // Increment unread count
      queryClient.setQueryData<number>(
        [UNREAD_COUNT_QUERY_KEY, organizationId],
        (old = 0) => old + 1
      );
    };

    const handleNotificationRead = (data: { notificationId: string; readAt: string }) => {
      // Update in cache
      queryClient.setQueryData<NotificationData[]>(
        [NOTIFICATIONS_QUERY_KEY, organizationId, filters],
        (old = []) =>
          old.map((n) =>
            n.id === data.notificationId
              ? { ...n, is_read: true, read_at: data.readAt }
              : n
          )
      );

      // Decrement unread count
      queryClient.setQueryData<number>(
        [UNREAD_COUNT_QUERY_KEY, organizationId],
        (old = 0) => Math.max(0, old - 1)
      );
    };

    const handleAllRead = (data: { count: number; readAt: string }) => {
      // Mark all as read in cache
      queryClient.setQueryData<NotificationData[]>(
        [NOTIFICATIONS_QUERY_KEY, organizationId, filters],
        (old = []) =>
          old.map((n) =>
            !n.is_read ? { ...n, is_read: true, read_at: data.readAt } : n
          )
      );

      // Reset unread count
      queryClient.setQueryData<number>([UNREAD_COUNT_QUERY_KEY, organizationId], 0);
    };

    const unsubNew = socketManager.on('notification:new', handleNewNotification);
    const unsubRead = socketManager.on('notification:read', handleNotificationRead);
    const unsubAllRead = socketManager.on('notification:read-all', handleAllRead);

    return () => {
      unsubNew();
      unsubRead();
      unsubAllRead();
    };
  }, [organizationId, filters, queryClient]);

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery<NotificationData[], Error>({
    queryKey: [NOTIFICATIONS_QUERY_KEY, organizationId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));
      if (filters.type) params.append('type', filters.type);
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.offset) params.append('offset', String(filters.offset));

      const queryString = params.toString();
      const url = `/notifications${queryString ? `?${queryString}` : ''}`;

      return apiClient.get(url, organizationId!);
    },
    enabled: !!organizationId && !!user,
    staleTime: 30000, // 30 seconds
  });

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery<number, Error>({
    queryKey: [UNREAD_COUNT_QUERY_KEY, organizationId],
    queryFn: async () => {
      const response = await apiClient.get<{ count: number }>(
        '/notifications/unread/count',
        organizationId!
      );
      return response.count;
    },
    enabled: !!organizationId && !!user,
    staleTime: 30000, // 30 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch(`/notifications/${notificationId}/read`, {}, organizationId!);
      // Also notify via socket for other connected clients
      socketManager.sendMarkRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, organizationId] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_QUERY_KEY, organizationId] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/notifications/read-all', {}, organizationId!);
      // Also notify via socket for other connected clients
      socketManager.sendMarkAllRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, organizationId] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_QUERY_KEY, organizationId] });
    },
  });

  const markAsRead = useCallback(
    async (notificationId: string) => {
      await markAsReadMutation.mutateAsync(notificationId);
    },
    [markAsReadMutation]
  );

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isConnected: socketStatus === 'connected',
    socketStatus,
    error: error || null,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}

// Lightweight hook just for unread count (for header badge)
export function useUnreadNotificationCount(): number {
  const { user, currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  const { data: count = 0 } = useQuery<number, Error>({
    queryKey: [UNREAD_COUNT_QUERY_KEY, organizationId],
    queryFn: async () => {
      const response = await apiClient.get<{ count: number }>(
        '/notifications/unread/count',
        organizationId!
      );
      return response.count;
    },
    enabled: !!organizationId && !!user,
    staleTime: 30000,
    refetchInterval: 60000, // Refetch every minute as backup
  });

  return count;
}
