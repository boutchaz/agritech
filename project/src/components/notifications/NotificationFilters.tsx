import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

export type NotificationTypeFilter = 'all' | 'task_assigned' | 'task_status_changed' | 'order_status_changed' | 'quote_received' | 'quote_responded' | 'harvest_completed' | 'low_inventory' | 'payment_processed' | 'general';
export type NotificationStatusFilter = 'all' | 'unread' | 'important';
export type NotificationTimeFilter = 'all' | 'today' | 'week' | 'month' | 'older';

interface NotificationFiltersProps {
  typeFilter: NotificationTypeFilter;
  statusFilter: NotificationStatusFilter;
  timeFilter: NotificationTimeFilter;
  onTypeChange: (filter: NotificationTypeFilter) => void;
  onStatusChange: (filter: NotificationStatusFilter) => void;
  onTimeChange: (filter: NotificationTimeFilter) => void;
  unreadCount?: number;
  importantCount?: number;
  compact?: boolean;
  counts?: Partial<Record<NotificationTypeFilter, number>>;
}

const typeFilters: { value: NotificationTypeFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '🔔' },
  { value: 'task_assigned', label: 'Tasks', icon: '📋' },
  { value: 'task_status_changed', label: 'Task Updates', icon: '✅' },
  { value: 'order_status_changed', label: 'Orders', icon: '📦' },
  { value: 'quote_received', label: 'Quotes', icon: '💰' },
  { value: 'quote_responded', label: 'Quote Responses', icon: '✉️' },
  { value: 'harvest_completed', label: 'Harvests', icon: '🌾' },
  { value: 'low_inventory', label: 'Inventory', icon: '⚠️' },
  { value: 'payment_processed', label: 'Payments', icon: '💳' },
  { value: 'general', label: 'General', icon: 'ℹ️' },
];

const statusFilters: { value: NotificationStatusFilter; label: string; countKey?: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'important', label: 'Important' },
];

const timeFilters: { value: NotificationTimeFilter; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'older', label: 'Older' },
];

export function NotificationFilters({
  typeFilter,
  statusFilter,
  timeFilter,
  onTypeChange,
  onStatusChange,
  onTimeChange,
  unreadCount = 0,
  importantCount = 0,
  compact = false,
  counts = {},
}: NotificationFiltersProps) {
  return (
    <div className={cn('flex flex-col gap-4', compact ? 'p-2' : 'p-4')}>
      {/* Type Filters */}
      {!compact ? (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Filter by Type
          </h3>
          <ScrollArea className={compact ? '' : 'h-48'}>
            <div className="flex flex-wrap gap-1.5 pb-2">
              {typeFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={typeFilter === filter.value ? 'default' : 'outline'}
                  size={compact ? 'sm' : 'default'}
                  className={cn(
                    'relative',
                    typeFilter === filter.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => onTypeChange(filter.value)}
                >
                  <span className="mr-1">{filter.icon}</span>
                  {filter.label}
                  {counts[filter.value] !== undefined && counts[filter.value] > 0 && (
                    <span
                      className={cn(
                        'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full',
                        typeFilter === filter.value
                          ? 'bg-primary-foreground/20'
                          : 'bg-muted-foreground/20'
                      )}
                    >
                      {counts[filter.value] > 99 ? '99+' : counts[filter.value]}
                    </span>
                  )}
                  {filter.value === 'all' && unreadCount > 0 && (
                    <span
                      className={cn(
                        'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-red-500 text-white',
                        typeFilter === 'all' && 'bg-red-400'
                      )}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : (
        // Compact horizontal scroll for type filters
        <div className="border-b pb-2">
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 pb-1">
              {typeFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={typeFilter === filter.value ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'whitespace-nowrap relative',
                    typeFilter === filter.value
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => onTypeChange(filter.value)}
                >
                  <span className="mr-1">{filter.icon}</span>
                  {filter.label}
                  {filter.value === 'all' && unreadCount > 0 && (
                    <span
                      className={cn(
                        'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-red-500 text-white',
                        typeFilter === 'all' && 'bg-red-400'
                      )}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Status Filters */}
      {!compact && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Filter by Status
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'relative',
                  statusFilter === filter.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'hover:bg-muted'
                )}
                onClick={() => onStatusChange(filter.value)}
              >
                {filter.label}
                {filter.value === 'unread' && unreadCount > 0 && (
                  <span
                    className={cn(
                      'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-red-500 text-white',
                      statusFilter === 'unread' && 'bg-red-400'
                    )}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {filter.value === 'important' && importantCount > 0 && (
                  <span
                    className={cn(
                      'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500 text-white',
                      statusFilter === 'important' && 'bg-amber-400'
                    )}
                  >
                    {importantCount > 99 ? '99+' : importantCount}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Time Filters */}
      {!compact && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Filter by Time
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {timeFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={timeFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  timeFilter === filter.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'hover:bg-muted'
                )}
                onClick={() => onTimeChange(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Combined filters for compact view */}
      {compact && (
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as NotificationStatusFilter)}
            className="flex-1 px-3 py-1.5 text-sm rounded-md border border-input bg-background"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread ({unreadCount})</option>
            <option value="important">Important ({importantCount})</option>
          </select>
          <select
            value={timeFilter}
            onChange={(e) => onTimeChange(e.target.value as NotificationTimeFilter)}
            className="flex-1 px-3 py-1.5 text-sm rounded-md border border-input bg-background"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="older">Older</option>
          </select>
        </div>
      )}
    </div>
  );
}

export default NotificationFilters;
