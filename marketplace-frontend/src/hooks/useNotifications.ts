'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Notification {
  id: string;
  type: 'order' | 'quote' | 'review' | 'system';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export function useNotifications() {
  const { user, getToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      setConnected(false);
      return;
    }

    let socketInstance: Socket;
    let cancelled = false;

    const connectSocket = async () => {
      try {
        const token = await getToken();
        if (cancelled || !token) return;

        socketInstance = io(`${API_URL}/notifications`, {
          query: { token },
          transports: ['websocket'],
        });

        socketInstance.on('connect', () => {
          if (!cancelled) {
            console.log('Notifications connected');
            setConnected(true);
          }
        });

        socketInstance.on('disconnect', () => {
          if (!cancelled) {
            console.log('Notifications disconnected');
            setConnected(false);
          }
        });

        socketInstance.on('notification', (notification: Notification) => {
          if (!cancelled) {
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        });

        socketInstance.on('unread-count', (count: number) => {
          if (!cancelled) {
            setUnreadCount(count);
          }
        });

        if (!cancelled) {
          setSocket(socketInstance);
        }
      } catch (error) {
        console.error('Failed to connect to notifications:', error);
      }
    };

    connectSocket();

    return () => {
      cancelled = true;
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [user, getToken]);

  const markAsRead = useCallback(
    (notificationId: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      socket?.emit('mark-read', notificationId);
    },
    [socket]
  );

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    socket?.emit('mark-all-read');
  }, [socket]);

  return {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
  };
}
