// Notification Types for Mobile App

export type NotificationType =
  | 'task'
  | 'harvest'
  | 'alert'
  | 'system'
  | 'approval'
  | 'calibration'
  | 'weather'
  | 'inventory';

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  data?: {
    taskId?: string;
    harvestId?: string;
    parcelId?: string;
    farmId?: string;
    orderId?: string;
    quoteRequestId?: string;
    calibrationId?: string;
    alertId?: string;
    [key: string]: unknown;
  };
}

export interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationType | 'all';
  limit?: number;
  offset?: number;
}

export interface NotificationTypeFilter {
  value: NotificationType | 'all';
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

// Approval Types
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalType = 'task_completion' | 'harvest_validation' | 'time_log' | 'expense';

export interface ApprovalRequest {
  id: string;
  organization_id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  title: string;
  description: string | null;
  requester_id: string;
  requester?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  approver_id: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  data?: {
    taskId?: string;
    harvestId?: string;
    timeLogId?: string;
    expenseId?: string;
    [key: string]: unknown;
  };
}

export interface ApprovalFilters {
  status?: ApprovalStatus;
  type?: ApprovalType;
  limit?: number;
  offset?: number;
}
