import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

// Get the base URL for WebSocket connection
// Use VITE_SOCKET_URL if set, otherwise derive from VITE_API_URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/v\d+\/?$/, '');

export interface NotificationData {
  id: string;
  user_id: string;
  organization_id: string;
  type: string;
  title: string;
  message?: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

type SocketEventHandler = (data: any) => void;

class SocketManager {
  private socket: Socket | null = null;
  private status: SocketStatus = 'disconnected';
  private organizationId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventHandlers: Map<string, Set<SocketEventHandler>> = new Map();
  private statusHandlers: Set<(status: SocketStatus) => void> = new Set();

  async connect(organizationId: string): Promise<void> {
    // Disconnect existing connection if any
    if (this.socket?.connected) {
      if (this.organizationId === organizationId) {
        return;
      }
      this.disconnect();
    }

    this.organizationId = organizationId;
    this.setStatus('connecting');

    try {
      // Get auth token from auth store (NestJS auth)
      const accessToken = useAuthStore.getState().getAccessToken();

      if (!accessToken) {
        console.warn('[Socket] No access token available, skipping connection');
        this.setStatus('disconnected');
        return;
      }

      const socketUrl = `${SOCKET_URL}/notifications`;

      this.socket = io(socketUrl, {
        query: {
          token: accessToken,
          organizationId,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        // Add path explicitly if needed
        // path: '/socket.io',
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('[Socket] Connection error:', error);
      this.setStatus('error');
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
    });

    this.socket.on('connected', (_data) => {
    });

    this.socket.on('disconnect', () => {
      this.setStatus('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.setStatus('error');
      }
    });

    // Handle notification events
    this.socket.on('notification:new', (notification: NotificationData) => {
      this.emit('notification:new', notification);
    });

    this.socket.on('notification:read', (data: { notificationId: string; readAt: string }) => {
      this.emit('notification:read', data);
    });

    this.socket.on('notification:read-all', (data: { count: number; readAt: string }) => {
      this.emit('notification:read-all', data);
    });

    this.socket.on('calibration:phase-changed', (data: any) => {
      this.emit('calibration:phase-changed', data);
    });

    this.socket.on('calibration:failed', (data: any) => {
      this.emit('calibration:failed', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.organizationId = null;
    this.setStatus('disconnected');
  }

  private setStatus(status: SocketStatus): void {
    this.status = status;
    this.statusHandlers.forEach((handler) => {
      handler(status);
    });
  }

  getStatus(): SocketStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Event subscription methods
  on(event: string, handler: SocketEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  off(event: string, handler: SocketEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: any): void {
    this.eventHandlers.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[Socket] Error in event handler for ${event}:`, error);
      }
    });
  }

  // Status subscription
  onStatusChange(handler: (status: SocketStatus) => void): () => void {
    this.statusHandlers.add(handler);
    // Immediately call with current status
    handler(this.status);

    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  // Send messages to server
  sendMarkRead(notificationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('mark-read', { notificationId });
    }
  }

  sendMarkAllRead(): void {
    if (this.socket?.connected) {
      this.socket.emit('mark-all-read');
    }
  }

  joinOrganization(organizationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-organization', { organizationId });
      this.organizationId = organizationId;
    }
  }
}

// Singleton instance
export const socketManager = new SocketManager();

// React hook for socket status
export function useSocketStatus(): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>('disconnected');

  useEffect(() => {
    const unsubscribe = socketManager.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return status;
}
