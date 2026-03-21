// Notifications API Client for Mobile App
import { api } from '../api';
import type {
  Notification,
  NotificationFilters,
  ApprovalRequest,
  ApprovalFilters,
} from '@/types/notification';

const BASE_URL = '/notifications';

export const notificationsApi = {
  // Get notifications with filters
  async getNotifications(filters?: NotificationFilters): Promise<Notification[]> {
    const params = new URLSearchParams();
    if (filters?.isRead !== undefined) params.append('isRead', String(filters.isRead));
    if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    const query = params.toString();
    const res = await api.get<{ data: Notification[] }>(`${BASE_URL}${query ? `?${query}` : ''}`);
    return res?.data || [];
  },

  // Get unread count
  async getUnreadCount(): Promise<{ count: number }> {
    return api.get<{ count: number }>(`${BASE_URL}/unread/count`);
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<Notification> {
    return api.patch<Notification>(`${BASE_URL}/${notificationId}/read`, {});
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<{ count: number }> {
    return api.post<{ count: number }>(`${BASE_URL}/read-all`, {});
  },

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    return api.delete(`${BASE_URL}/${notificationId}`);
  },
};

export const approvalsApi = {
  // Get approval requests
  async getApprovals(filters?: ApprovalFilters): Promise<ApprovalRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    const query = params.toString();
    return api.get<ApprovalRequest[]>(`/approvals${query ? `?${query}` : ''}`);
  },

  // Get pending approvals count
  async getPendingCount(): Promise<{ count: number }> {
    return api.get<{ count: number }>('/approvals/pending/count');
  },

  // Get single approval
  async getApproval(approvalId: string): Promise<ApprovalRequest> {
    return api.get<ApprovalRequest>(`/approvals/${approvalId}`);
  },

  // Approve request
  async approve(approvalId: string, notes?: string): Promise<ApprovalRequest> {
    return api.patch<ApprovalRequest>(`/approvals/${approvalId}/approve`, { notes });
  },

  // Reject request
  async reject(approvalId: string, reason: string): Promise<ApprovalRequest> {
    return api.patch<ApprovalRequest>(`/approvals/${approvalId}/reject`, { reason });
  },
};
