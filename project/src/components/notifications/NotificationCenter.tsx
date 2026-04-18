import { useState, useMemo, useCallback } from 'react';
import { Loader2, Inbox, Clock, Filter } from 'lucide-react';
import { FilterBar } from '@/components/ui/data-table';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { NotificationItem } from './NotificationItem';
import { NotificationFilters, NotificationTypeFilter, NotificationStatusFilter, NotificationTimeFilter } from './NotificationFilters';
import { NotificationBulkActions } from './NotificationQuickActions';
import { NotificationData } from '@/lib/socket';
import { getNotificationRedirect } from '@/lib/notification-routes';
import { useNotifications } from '@/hooks/useNotifications';
import { Checkbox } from '../ui/checkbox';

interface NotificationCenterProps {
  standalone?: boolean;
}

// Group notifications by time period
function groupNotificationsByTime(notifications: NotificationData[]): Record<string, NotificationData[]> {
  const groups: Record<string, NotificationData[]> = {
    today: [],
    yesterday: [],
    week: [],
    month: [],
    older: [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  notifications.forEach((notification) => {
    const date = new Date(notification.created_at);

    if (date >= today) {
      groups.today.push(notification);
    } else if (date >= yesterday) {
      groups.yesterday.push(notification);
    } else if (date >= weekAgo) {
      groups.week.push(notification);
    } else if (date >= monthAgo) {
      groups.month.push(notification);
    } else {
      groups.older.push(notification);
    }
  });

  return groups;
}

// Group notifications by type
function groupNotificationsByType(notifications: NotificationData[]): Record<string, NotificationData[]> {
  const groups: Record<string, NotificationData[]> = {};

  notifications.forEach((notification) => {
    if (!groups[notification.type]) {
      groups[notification.type] = [];
    }
    groups[notification.type].push(notification);
  });

  return groups;
}

/**
 * NotificationCenter - Full page notification center with filtering, grouping, and bulk actions
 */
export function NotificationCenter({ standalone = false }: NotificationCenterProps) {
  const navigate = useNavigate();

  // Filter states
  const [typeFilter, setTypeFilter] = useState<NotificationTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<NotificationStatusFilter>('all');
  const [timeFilter, setTimeFilter] = useState<NotificationTimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'time' | 'type' | 'none'>('time');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get notifications from hook
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
  } = useNotifications({ limit: 100 });

  // State for important notifications (stored in localStorage)
  const [importantNotifications, setImportantNotifications] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('important-notifications');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((n) => n.type === typeFilter);
    }

    // Status filter
    if (statusFilter === 'unread') {
      filtered = filtered.filter((n) => !n.is_read);
    } else if (statusFilter === 'important') {
      filtered = filtered.filter((n) => importantNotifications.has(n.id));
    }

    // Time filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    if (timeFilter === 'today') {
      filtered = filtered.filter((n) => new Date(n.created_at) >= today);
    } else if (timeFilter === 'week') {
      filtered = filtered.filter((n) => new Date(n.created_at) >= weekAgo);
    } else if (timeFilter === 'month') {
      filtered = filtered.filter((n) => new Date(n.created_at) >= monthAgo);
    } else if (timeFilter === 'older') {
      filtered = filtered.filter((n) => new Date(n.created_at) < monthAgo);
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          (n.message && n.message.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [notifications, typeFilter, statusFilter, timeFilter, searchQuery, importantNotifications]);

  // Group notifications
  const groupedNotifications = useMemo(() => {
    if (groupBy === 'time') {
      return groupNotificationsByTime(filteredNotifications);
    } else if (groupBy === 'type') {
      return groupNotificationsByType(filteredNotifications);
    }
    return { all: filteredNotifications };
  }, [filteredNotifications, groupBy]);

  // Calculate counts for filters
  const filterCounts = useMemo(() => {
    const counts: Partial<Record<NotificationTypeFilter, number>> = {};
    counts.all = notifications.length;
    notifications.forEach((n) => {
      counts[n.type as NotificationTypeFilter] = (counts[n.type as NotificationTypeFilter] || 0) + 1;
    });
    return counts;
  }, [notifications]);

  const importantCount = importantNotifications.size;

  // Handle notification click
  const handleNotificationClick = useCallback((notification: NotificationData) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    const redirect = getNotificationRedirect(notification);
    if (redirect) {
      navigate(redirect);
    }

    // Deselect if selected
    if (selectedIds.has(notification.id)) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  }, [markAsRead, navigate, selectedIds]);

  // Handle mark as read
  const handleMarkRead = useCallback((id: string) => {
    markAsRead(id);
  }, [markAsRead]);

  // Handle dismiss (archive)
  const handleDismiss = useCallback((_id: string) => {
    // TODO: Call API to archive the notification when backend supports it
    toast.success('Notification dismissed');
  }, []);

  // Handle toggle important
  const handleToggleImportant = useCallback((id: string) => {
    setImportantNotifications((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success('Removed from important');
      } else {
        next.add(id);
        toast.success('Marked as important');
      }
      localStorage.setItem('important-notifications', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Handle mark all as read
  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setTypeFilter('all');
    setStatusFilter('all');
    setTimeFilter('all');
    setSearchQuery('');
  }, []);

  // Bulk actions
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  }, [selectedIds.size, filteredNotifications]);

  const handleBulkMarkRead = useCallback(async () => {
    await Promise.all([...selectedIds].map((id) => markAsRead(id)));
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} notifications marked as read`);
  }, [selectedIds, markAsRead]);

  const handleBulkMarkImportant = useCallback(() => {
    const next = new Set(importantNotifications);
    selectedIds.forEach((id) => {
      next.add(id);
    });
    setImportantNotifications(next);
    localStorage.setItem('important-notifications', JSON.stringify([...next]));
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} notifications marked as important`);
  }, [selectedIds, importantNotifications]);

  const handleBulkRemoveImportant = useCallback(() => {
    const next = new Set(importantNotifications);
    selectedIds.forEach((id) => {
      next.delete(id);
    });
    setImportantNotifications(next);
    localStorage.setItem('important-notifications', JSON.stringify([...next]));
    setSelectedIds(new Set());
    toast.success(`Removed important status from ${selectedIds.size} notifications`);
  }, [selectedIds, importantNotifications]);

  const handleBulkDelete = useCallback(() => {
    // In a real app, this would call an API to delete notifications
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} notifications deleted`);
  }, [selectedIds.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleToggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  // Render group label
  const renderGroupLabel = (groupKey: string) => {
    const labels: Record<string, string> = {
      today: 'Today',
      yesterday: 'Yesterday',
      week: 'This Week',
      month: 'This Month',
      older: 'Older',
      all: 'All Notifications',
    };
    return labels[groupKey] || groupKey;
  };

  // Check if filters are active
  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all' || timeFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <div className={cn('flex flex-col lg:flex-row gap-6', standalone && 'p-6')}>
      {/* Sidebar filters */}
      <aside className={cn('w-full lg:w-64 flex-shrink-0', standalone && 'lg:sticky lg:top-6 lg:h-[calc(100vh-6rem)]')}>
        <Card className="p-4">
          <NotificationFilters
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            timeFilter={timeFilter}
            onTypeChange={setTypeFilter}
            onStatusChange={setStatusFilter}
            onTimeChange={setTimeFilter}
            unreadCount={unreadCount}
            importantCount={importantCount}
            counts={filterCounts}
          />
        </Card>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Notifications</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGroupBy(groupBy === 'time' ? 'type' : groupBy === 'type' ? 'none' : 'time')}
              >
                <Filter className="h-4 w-4 mr-1" />
                {groupBy === 'time' ? 'By Time' : groupBy === 'type' ? 'By Type' : 'No Grouping'}
              </Button>
              {selectedIds.size === 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={filteredNotifications.length === 0}
                >
                  Select All
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Deselect All
                </Button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="mb-4">
            <FilterBar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search notifications..."
            />
          </div>

          {/* Active filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClearFilters}>
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Notifications list */}
        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              {searchQuery || hasActiveFilters ? (
                <>
                  <Filter className="h-12 w-12 mb-3 opacity-50" />
                  <p className="font-medium">No notifications match your filters</p>
                  <Button variant="link" className="mt-2" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <Inbox className="h-12 w-12 mb-3 opacity-50" />
                  <p className="font-medium">No notifications yet</p>
                  <p className="text-sm mt-1">You're all caught up!</p>
                </>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <div className="divide-y">
                {Object.entries(groupedNotifications).map(([groupKey, groupNotifications]) => {
                  if (groupNotifications.length === 0) return null;

                  return (
                    <div key={groupKey}>
                      {groupBy !== 'none' && (
                        <div className={cn(
                          'sticky top-0 z-10 px-4 py-2 bg-muted/50 backdrop-blur-sm',
                          'text-xs font-semibold text-muted-foreground uppercase tracking-wider',
                          'flex items-center gap-2'
                        )}>
                          {groupBy === 'time' && <Clock className="h-3 w-3" />}
                          {renderGroupLabel(groupKey)}
                          <span className="px-1.5 py-0.5 rounded-full bg-muted-foreground/20">
                            {groupNotifications.length}
                          </span>
                        </div>
                      )}
                      {groupNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            'flex items-start gap-3 p-3 transition-colors',
                            selectedIds.has(notification.id) && 'bg-primary/5'
                          )}
                        >
                          <Checkbox
                            checked={selectedIds.has(notification.id)}
                            onCheckedChange={(checked) => handleToggleSelect(notification.id, checked as boolean)}
                            className="mt-3"
                          />
                          <div className="flex-1 min-w-0">
                            <NotificationItem
                              notification={notification}
                              onMarkRead={handleMarkRead}
                              onDismiss={handleDismiss}
                              onToggleImportant={handleToggleImportant}
                              onClick={() => handleNotificationClick(notification)}
                              isImportant={importantNotifications.has(notification.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </Card>
      </main>

      {/* Bulk actions bar */}
      <NotificationBulkActions
        selectedCount={selectedIds.size}
        onMarkRead={selectedIds.size > 0 ? handleBulkMarkRead : undefined}
        onMarkImportant={selectedIds.size > 0 ? handleBulkMarkImportant : undefined}
        onRemoveImportant={selectedIds.size > 0 && Array.from(selectedIds).some((id) => importantNotifications.has(id)) ? handleBulkRemoveImportant : undefined}
        onDelete={selectedIds.size > 0 ? handleBulkDelete : undefined}
        onClearSelection={handleClearSelection}
      />
    </div>
  );
}

export default NotificationCenter;
