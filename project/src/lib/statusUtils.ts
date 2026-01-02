import React from 'react';
import { CheckCircle2, Clock, XCircle, Circle, AlertCircle, Truck, Package, FileText } from 'lucide-react';

/**
 * Status color configuration for different status types
 * All colors follow a consistent pattern for light and dark modes
 */
export const STATUS_COLORS = {
  // Success states
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  submitted: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',

  // Info/Primary states
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  invoiced: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',

  // Warning/In-progress states
  processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  partially_paid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',

  // Shipped/Transit states
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  in_transit: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',

  // Neutral/Draft states
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',

  // Error states
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
} as const;

export type StatusType = keyof typeof STATUS_COLORS;

/**
 * Get the color classes for a given status
 * Falls back to gray if status is not recognized
 */
export function getStatusColor(status: string | null | undefined): string {
  if (!status) return 'bg-gray-100 text-gray-800';
  const normalizedStatus = status.toLowerCase().replace(/-/g, '_') as StatusType;
  return STATUS_COLORS[normalizedStatus] || 'bg-gray-100 text-gray-800';
}

/**
 * Status icon configuration
 */
const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  // Success icons
  paid: CheckCircle2,
  completed: CheckCircle2,
  delivered: CheckCircle2,
  submitted: CheckCircle2,
  approved: CheckCircle2,
  accepted: CheckCircle2,
  active: CheckCircle2,
  confirmed: CheckCircle2,
  invoiced: FileText,

  // In-progress icons
  processing: Clock,
  partially_paid: Clock,
  pending: Clock,
  in_progress: Clock,
  draft: Circle,

  // Transit icons
  shipped: Truck,
  in_transit: Truck,

  // Error icons
  overdue: AlertCircle,
  cancelled: XCircle,
  rejected: XCircle,
  failed: XCircle,
  expired: AlertCircle,
};

/**
 * Get the icon component for a given status
 * Returns null if no icon is configured for the status
 */
export function getStatusIcon(status: string | null | undefined): typeof CheckCircle2 | null {
  if (!status) return null;
  const normalizedStatus = status.toLowerCase().replace(/-/g, '_');
  return STATUS_ICONS[normalizedStatus] || null;
}

/**
 * Render a status icon as a React element
 */
export function renderStatusIcon(status: string | null | undefined, className = 'h-4 w-4'): React.ReactNode {
  const IconComponent = getStatusIcon(status);
  if (!IconComponent) return null;
  return React.createElement(IconComponent, { className });
}

/**
 * Invoice-specific status utilities
 */
export const invoiceStatus = {
  getColor: (status: string | null | undefined): string => {
    const statusMap: Record<string, string> = {
      paid: STATUS_COLORS.paid,
      submitted: STATUS_COLORS.submitted,
      overdue: STATUS_COLORS.overdue,
      draft: STATUS_COLORS.draft,
      partially_paid: STATUS_COLORS.partially_paid,
      cancelled: STATUS_COLORS.cancelled,
    };
    return statusMap[status || ''] || 'bg-gray-100 text-gray-800';
  },
  getIcon: (status: string | null | undefined) => getStatusIcon(status),
};

/**
 * Payment-specific status utilities
 */
export const paymentStatus = {
  getColor: (status: string | null | undefined): string => {
    const statusMap: Record<string, string> = {
      submitted: STATUS_COLORS.submitted,
      draft: STATUS_COLORS.draft,
      cancelled: STATUS_COLORS.cancelled,
    };
    return statusMap[status || ''] || 'bg-gray-100 text-gray-800';
  },
  getIcon: (status: string | null | undefined) => getStatusIcon(status),
};

/**
 * Sales order-specific status utilities
 */
export const salesOrderStatus = {
  getColor: (status: string | null | undefined): string => {
    const statusMap: Record<string, string> = {
      draft: STATUS_COLORS.draft,
      confirmed: STATUS_COLORS.confirmed,
      processing: STATUS_COLORS.processing,
      shipped: STATUS_COLORS.shipped,
      delivered: STATUS_COLORS.delivered,
      invoiced: STATUS_COLORS.invoiced,
      completed: STATUS_COLORS.completed,
      cancelled: STATUS_COLORS.cancelled,
    };
    return statusMap[status || ''] || 'bg-gray-100 text-gray-800';
  },
  getIcon: (status: string | null | undefined) => getStatusIcon(status),
};

/**
 * Purchase order-specific status utilities
 */
export const purchaseOrderStatus = {
  getColor: (status: string | null | undefined): string => {
    const statusMap: Record<string, string> = {
      draft: STATUS_COLORS.draft,
      sent: STATUS_COLORS.sent,
      confirmed: STATUS_COLORS.confirmed,
      received: STATUS_COLORS.completed,
      cancelled: STATUS_COLORS.cancelled,
    };
    return statusMap[status || ''] || 'bg-gray-100 text-gray-800';
  },
  getIcon: (status: string | null | undefined) => getStatusIcon(status),
};

/**
 * Quote-specific status utilities
 */
export const quoteStatus = {
  getColor: (status: string | null | undefined): string => {
    const statusMap: Record<string, string> = {
      draft: STATUS_COLORS.draft,
      sent: STATUS_COLORS.sent,
      accepted: STATUS_COLORS.accepted,
      rejected: STATUS_COLORS.rejected,
      expired: STATUS_COLORS.expired,
    };
    return statusMap[status || ''] || 'bg-gray-100 text-gray-800';
  },
  getIcon: (status: string | null | undefined) => getStatusIcon(status),
};

/**
 * Task-specific status utilities
 */
export const taskStatus = {
  getColor: (status: string | null | undefined): string => {
    const statusMap: Record<string, string> = {
      pending: STATUS_COLORS.pending,
      in_progress: STATUS_COLORS.in_progress,
      completed: STATUS_COLORS.completed,
      cancelled: STATUS_COLORS.cancelled,
      overdue: STATUS_COLORS.overdue,
    };
    return statusMap[status || ''] || 'bg-gray-100 text-gray-800';
  },
  getIcon: (status: string | null | undefined) => getStatusIcon(status),
};

/**
 * Harvest-specific status utilities
 */
export const harvestStatus = {
  getColor: (status: string | null | undefined): string => {
    const statusMap: Record<string, string> = {
      planned: STATUS_COLORS.draft,
      in_progress: STATUS_COLORS.in_progress,
      completed: STATUS_COLORS.completed,
      cancelled: STATUS_COLORS.cancelled,
    };
    return statusMap[status || ''] || 'bg-gray-100 text-gray-800';
  },
  getIcon: (status: string | null | undefined) => getStatusIcon(status),
};

/**
 * Quote request-specific status utilities
 */
export const quoteRequestStatus = {
  getColor: (status: string | null | undefined): string => {
    const statusMap: Record<string, string> = {
      pending: STATUS_COLORS.pending,
      responded: STATUS_COLORS.sent,
      accepted: STATUS_COLORS.accepted,
      rejected: STATUS_COLORS.rejected,
      expired: STATUS_COLORS.expired,
    };
    return statusMap[status || ''] || 'bg-gray-100 text-gray-800';
  },
  getIcon: (status: string | null | undefined) => getStatusIcon(status),
};
