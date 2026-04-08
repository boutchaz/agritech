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

export interface NotificationTypeFilter {
  value: string;
  label: string;
}

export interface NotificationStatusFilter {
  value: 'all' | 'unread' | 'important';
  label: string;
}

export interface NotificationTimeFilter {
  value: 'all' | 'today' | 'week' | 'month' | 'older';
  label: string;
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
  // New: Filters and pagination
  typeFilter: string;
  setTypeFilter: (filter: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  timeFilter: string;
  setTimeFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  // New: Sound controls
  isSoundEnabled: boolean;
  toggleSound: (enabled?: boolean) => void;
  // New: Important notifications
  importantNotifications: Set<string>;
  toggleImportant: (id: string) => void;
}

export const NOTIFICATIONS_QUERY_KEY = 'notifications';
export const UNREAD_COUNT_QUERY_KEY = 'notifications-unread-count';
const PAGE_SIZE = 20;

export function useNotifications(filters: NotificationFilters = {}): UseNotificationsReturn {
  const { user, currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');

  // Filter states
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination states
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Sound control state
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('notification-sound-enabled');
    return stored !== 'false'; // Default to true
  });

  // Important notifications state
  const [importantNotifications, setImportantNotifications] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('important-notifications');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const organizationId = currentOrganization?.id;

  // WebSocket connect + realtime cache updates live in NotificationRealtimeBridge (single subscriber).

  // Subscribe to socket status changes
  useEffect(() => {
    const unsubscribe = socketManager.onStatusChange(setSocketStatus);
    return unsubscribe;
  }, []);

  // Toggle sound
  const toggleSound = useCallback((enabled?: boolean) => {
    const newValue = enabled ?? !isSoundEnabled;
    setIsSoundEnabled(newValue);
    localStorage.setItem('notification-sound-enabled', String(newValue));
  }, [isSoundEnabled]);

  // Toggle important
  const toggleImportant = useCallback((id: string) => {
    setImportantNotifications((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem('important-notifications', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Build query params from filters
  const queryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));
    if (filters.type && filters.type !== 'all') params.append('type', filters.type);
    const limit = filters.limit || PAGE_SIZE;
    params.append('limit', String(limit));
    const offset = filters.offset || (page * limit);
    params.append('offset', String(offset));
    return { queryString: params.toString(), limit, offset };
  }, [filters, page]);

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
    isFetching: isFetchingNextPage,
  } = useQuery<NotificationData[], Error>({
    queryKey: [NOTIFICATIONS_QUERY_KEY, organizationId, filters, page],
    queryFn: async () => {
      const { queryString, limit } = queryParams();

      const url = `/api/v1/notifications${queryString ? `?${queryString}` : ''}`;

      const result = await apiClient.get<{ data: NotificationData[] }>(url, {}, organizationId!);

      // Handle paginated response
      const items = Array.isArray(result) ? result : result?.data || [];

      // Check if there's a next page
      setHasNextPage(items.length === limit);

      return items;
    },
    enabled: !!organizationId && !!user,
    staleTime: 30000, // 30 seconds
  });

  // Fetch next page
  const fetchNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      setPage((prev) => prev + 1);
    }
  }, [hasNextPage, isFetchingNextPage]);

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery<number, Error>({
    queryKey: [UNREAD_COUNT_QUERY_KEY, organizationId],
    queryFn: async () => {
      const response = await apiClient.get<{ count: number }>(
        '/api/v1/notifications/unread/count',
        {},
        organizationId!
      );
      return response.count;
    },
    enabled: !!organizationId && !!user,
    staleTime: 30000, // 30 seconds
  });

  // Mark as read mutation
  // Note: The backend already broadcasts socket events on API completion,
  // so we don't need to also send socket events from the frontend.
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch(`/api/v1/notifications/${notificationId}/read`, {}, {}, organizationId!);
    },
    onMutate: async (notificationId: string) => {
      // Cancel in-flight queries to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, organizationId] });

      // Save previous state for rollback
      const previousNotifications: Array<[readonly unknown[], NotificationData[] | undefined]> = [];
      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll({ queryKey: [NOTIFICATIONS_QUERY_KEY, organizationId] });
      for (const query of queries) {
        previousNotifications.push([
          query.queryKey,
          queryClient.getQueryData<NotificationData[]>(query.queryKey),
        ]);
        queryClient.setQueryData<NotificationData[]>(
          query.queryKey,
          (old = []) =>
            old.map((n) =>
              n.id === notificationId
                ? { ...n, is_read: true, read_at: new Date().toISOString() }
                : n
            )
        );
      }

      const previousCount = queryClient.getQueryData<number>(
        [UNREAD_COUNT_QUERY_KEY, organizationId]
      );
      queryClient.setQueryData<number>(
        [UNREAD_COUNT_QUERY_KEY, organizationId],
        (old = 0) => Math.max(0, old - 1)
      );

      return { previousNotifications, previousCount };
    },
    onError: (_err, _vars, context) => {
      // Restore previous data on error
      if (context?.previousNotifications) {
        for (const [key, data] of context.previousNotifications) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(
          [UNREAD_COUNT_QUERY_KEY, organizationId],
          context.previousCount,
        );
      }
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/notifications/read-all', {}, {}, organizationId!);
    },
    onMutate: async () => {
      // Optimistic update: mark all as read in cache immediately
      await queryClient.cancelQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, organizationId] });

      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll({ queryKey: [NOTIFICATIONS_QUERY_KEY, organizationId] });
      for (const query of queries) {
        queryClient.setQueryData<NotificationData[]>(
          query.queryKey,
          (old = []) =>
            old.map((n) =>
              !n.is_read ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
            )
        );
      }

      queryClient.setQueryData<number>([UNREAD_COUNT_QUERY_KEY, organizationId], 0);
    },
    onError: () => {
      // Revert on error
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
    // New: Filters
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    timeFilter,
    setTimeFilter,
    searchQuery,
    setSearchQuery,
    // New: Pagination
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    // New: Sound controls
    isSoundEnabled,
    toggleSound,
    // New: Important notifications
    importantNotifications,
    toggleImportant,
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
        '/api/v1/notifications/unread/count',
        {},
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
