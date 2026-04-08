import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  NOTIFICATIONS_QUERY_KEY,
  UNREAD_COUNT_QUERY_KEY,
} from '@/hooks/useNotifications';
import { getNotificationRedirect } from '@/lib/notification-routes';
import { apiClient } from '@/lib/api-client';
import { socketManager, type NotificationData } from '@/lib/socket';

const BELL_EVENT = 'agritech-notification-new';

/**
 * Single WebSocket subscriber + toast + cache updates for the whole app.
 * Prevents duplicate handlers when NotificationBell and NotificationCenter both mount
 * (each calls useNotifications).
 */
export function NotificationRealtimeBridge() {
  const { user, currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id ?? null;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!organizationId || !user) return;
    void socketManager.connect(organizationId);
  }, [organizationId, user]);

  useEffect(() => {
    if (!organizationId) return;

    const playSound = () => {
      if (localStorage.getItem('notification-sound-enabled') === 'false') return;
      try {
        const AudioContextCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) return;
        const audioContext = new AudioContextCtor();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
      } catch {
        /* ignore */
      }
    };

    const handleNew = (raw: unknown) => {
      const notification = raw as NotificationData;
      if (!notification?.id || !notification?.title) return;

      const existing = queryClient.getQueriesData<NotificationData[]>({
        queryKey: [NOTIFICATIONS_QUERY_KEY, organizationId],
      });
      const alreadyInCache = existing.some(([, data]) =>
        data?.some((n) => n.id === notification.id),
      );

      if (!alreadyInCache) {
        queryClient.setQueriesData<NotificationData[]>(
          { queryKey: [NOTIFICATIONS_QUERY_KEY, organizationId] },
          (old = []) => {
            if (old.some((n) => n.id === notification.id)) return old;
            return [notification, ...old];
          },
        );
        queryClient.setQueryData<number>(
          [UNREAD_COUNT_QUERY_KEY, organizationId],
          (old = 0) => old + 1,
        );
      }

      playSound();
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      window.dispatchEvent(
        new CustomEvent(BELL_EVENT, { detail: { id: notification.id } }),
      );

      const redirect = getNotificationRedirect(notification);
      toast.info(notification.title, {
        id: `notification-${notification.id}`,
        description: notification.message || undefined,
        duration: 5000,
        action: redirect
          ? {
              label: 'View',
              onClick: async () => {
                try {
                  await apiClient.patch(
                    `/api/v1/notifications/${notification.id}/read`,
                    {},
                    {},
                    organizationId,
                  );
                  queryClient.setQueriesData<NotificationData[]>(
                    { queryKey: [NOTIFICATIONS_QUERY_KEY, organizationId] },
                    (old = []) =>
                      old.map((n) =>
                        n.id === notification.id
                          ? { ...n, is_read: true, read_at: new Date().toISOString() }
                          : n,
                      ),
                  );
                  queryClient.setQueryData<number>(
                    [UNREAD_COUNT_QUERY_KEY, organizationId],
                    (old = 0) => Math.max(0, old - 1),
                  );
                } catch {
                  /* best-effort */
                }
                navigate(redirect);
              },
            }
          : undefined,
      });
    };

    const handleRead = (raw: unknown) => {
      const data = raw as { notificationId: string; readAt: string };
      queryClient.setQueriesData<NotificationData[]>(
        { queryKey: [NOTIFICATIONS_QUERY_KEY, organizationId] },
        (old = []) =>
          old.map((n) =>
            n.id === data.notificationId
              ? { ...n, is_read: true, read_at: data.readAt }
              : n,
          ),
      );
      queryClient.setQueryData<number>([UNREAD_COUNT_QUERY_KEY, organizationId], (old = 0) =>
        Math.max(0, old - 1),
      );
    };

    const handleReadAll = (raw: unknown) => {
      const data = raw as { readAt?: string };
      const readAt = data.readAt ?? new Date().toISOString();
      queryClient.setQueriesData<NotificationData[]>(
        { queryKey: [NOTIFICATIONS_QUERY_KEY, organizationId] },
        (old = []) =>
          old.map((n) =>
            !n.is_read ? { ...n, is_read: true, read_at: readAt } : n,
          ),
      );
      queryClient.setQueryData<number>([UNREAD_COUNT_QUERY_KEY, organizationId], 0);
    };

    const u1 = socketManager.on('notification:new', handleNew);
    const u2 = socketManager.on('notification:read', handleRead);
    const u3 = socketManager.on('notification:read-all', handleReadAll);

    return () => {
      u1();
      u2();
      u3();
    };
  }, [organizationId, queryClient, navigate]);

  return null;
}

export { BELL_EVENT };
