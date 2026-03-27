import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Loader2,
  Wifi,
  WifiOff,
  X,
  Star,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { headerToolbarIconTriggerClass } from '@/lib/header-toolbar';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { socketManager, NotificationData } from '@/lib/socket';
import { NotificationFilters, NotificationTypeFilter, NotificationStatusFilter } from './notifications/NotificationFilters';

interface EnhancedNotificationItemProps {
  notification: NotificationData;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onClick: () => void;
  isNew?: boolean;
  isImportant?: boolean;
}

function EnhancedNotificationItem({
  notification,
  onMarkRead,
  onDismiss,
  onToggleImportant,
  onClick,
  isNew = false,
  isImportant = false,
}: EnhancedNotificationItemProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return '📋';
      case 'task_status_changed':
        return '✅';
      case 'order_status_changed':
        return '📦';
      case 'quote_received':
        return '💰';
      case 'quote_responded':
        return '✉️';
      case 'harvest_completed':
        return '🌾';
      case 'low_inventory':
        return '⚠️';
      case 'payment_processed':
        return '💳';
      case 'ai_recommendation_created':
        return '🤖';
      case 'ai_alert_triggered':
        return '🚨';
      case 'crop_cycle_status_changed':
        return '🌱';
      case 'campaign_status_changed':
        return '📅';
      case 'task_reassigned':
        return '🔄';
      case 'piece_work_created':
        return '💼';
      case 'invoice_created':
        return '🧾';
      case 'journal_entry_posted':
        return '📒';
      case 'payment_status_changed':
        return '💳';
      case 'lab_results_available':
        return '🔬';
      case 'product_application_completed':
        return '🧪';
      case 'soil_analysis_completed':
        return '🌍';
      case 'harvest_event_recorded':
        return '🌾';
      case 'work_unit_completed':
        return '📊';
      default:
        return '🔔';
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
      case 'task_status_changed':
        return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400';
      case 'order_status_changed':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400';
      case 'quote_received':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400';
      case 'quote_responded':
        return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400';
      case 'harvest_completed':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
      case 'low_inventory':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
      case 'payment_processed':
        return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400';
      case 'ai_recommendation_created':
        return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400';
      case 'ai_alert_triggered':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
      case 'crop_cycle_status_changed':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
      case 'campaign_status_changed':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
      case 'task_reassigned':
        return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400';
      case 'piece_work_created':
        return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400';
      case 'invoice_created':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400';
      case 'journal_entry_posted':
        return 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400';
      case 'payment_status_changed':
        return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400';
      case 'lab_results_available':
        return 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400';
      case 'product_application_completed':
        return 'bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-400';
      case 'soil_analysis_completed':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400';
      case 'harvest_event_recorded':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
      case 'work_unit_completed':
        return 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400';
      default:
        return 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-400';
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
        'hover:shadow-sm hover:scale-[1.01]',
        !notification.is_read
          ? `${getTypeStyle(notification.type)}`
          : 'hover:bg-muted/50',
        isNew && 'notification-slide-in'
      )}
      onClick={onClick}
    >
      <span className="text-lg" role="img" aria-label={notification.type}>
        {getTypeIcon(notification.type)}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm truncate',
            !notification.is_read ? 'font-semibold' : 'text-muted-foreground'
          )}
        >
          {notification.title}
          {isImportant && (
            <Star className="inline-block ml-1 h-3 w-3 text-amber-500 fill-amber-500" />
          )}
        </p>
        {notification.message && (
          <p className="text-xs opacity-80 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs opacity-60 mt-1">
          {getTimeAgo(notification.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 transition-colors',
            isImportant ? 'text-amber-500' : 'text-muted-foreground'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleImportant(notification.id);
          }}
        >
          <Star className={cn('h-3.5 w-3.5', isImportant && 'fill-current')} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(notification.id);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [newNotificationIds, setNewNotificationIds] = useState<Set<string>>(new Set());
  const [isBellAnimating, setIsBellAnimating] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [importantNotifications, setImportantNotifications] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('important-notifications');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Filter states
  const [typeFilter, setTypeFilter] = useState<NotificationTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<NotificationStatusFilter>('all');

  const {
    notifications,
    unreadCount,
    isLoading,
    socketStatus,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ limit: 20 });

  // Filter notifications
  const filteredNotifications = React.useMemo(() => {
    return notifications.filter((n) => {
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      if (statusFilter === 'unread' && n.is_read) return false;
      if (statusFilter === 'important' && !importantNotifications.has(n.id)) return false;
      return true;
    });
  }, [notifications, typeFilter, statusFilter, importantNotifications]);

  // Calculate filter counts
  const filterCounts = React.useMemo(() => {
    const counts: Partial<Record<NotificationTypeFilter, number>> = {};
    counts.all = notifications.length;
    notifications.forEach((n) => {
      counts[n.type as NotificationTypeFilter] = (counts[n.type as NotificationTypeFilter] || 0) + 1;
    });
    return counts;
  }, [notifications]);

  const importantCount = importantNotifications.size;

  const handleNotificationClick = useCallback((notification: NotificationData) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    const { data } = notification;
    if (data?.taskId) {
      navigate({ to: '/tasks/$taskId', params: { taskId: data.taskId } });
    } else if (data?.orderId) {
      navigate({ to: '/marketplace/orders', search: { id: data.orderId } });
    } else if (data?.quoteRequestId) {
      navigate({ to: '/marketplace/quotes', search: { id: data.quoteRequestId } });
    }

    setOpen(false);
  }, [markAsRead, navigate]);

  // Show toast and animate bell for new notifications
  useEffect(() => {
    const unsubscribe = socketManager.on('notification:new', (notification: NotificationData) => {
      // Validate notification has required fields — ignore malformed payloads
      if (!notification?.id || !notification?.title) {
        return;
      }

      // Add to new notifications set for animation
      setNewNotificationIds((prev) => new Set(prev).add(notification.id));

      // Trigger bell shake animation
      setIsBellAnimating(true);
      setTimeout(() => setIsBellAnimating(false), 500);

      // Show toast for new notification
      toast.info(notification.title, {
        description: notification.message || undefined,
        action: notification.data?.taskId || notification.data?.orderId ? {
          label: 'View',
          onClick: () => handleNotificationClick(notification),
        } : undefined,
        duration: 5000,
      });

      // Remove from new notifications after animation
      setTimeout(() => {
        setNewNotificationIds((prev) => {
          const next = new Set(prev);
          next.delete(notification.id);
          return next;
        });
      }, 3000);
    });

    return unsubscribe;
  }, [handleNotificationClick]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead();
    toast.success('All notifications marked as read');
  }, [markAllAsRead]);

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

  const handleDismiss = useCallback((_id: string) => {
    // TODO: Call API to dismiss the notification when backend supports it
    toast.success('Notification dismissed');
  }, []);

  const handleClearFilters = useCallback(() => {
    setTypeFilter('all');
    setStatusFilter('all');
  }, []);

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      // Add scale animation when opening
      if (isOpen && bellRef.current) {
        bellRef.current.classList.add('bell-scale');
        setTimeout(() => bellRef.current?.classList.remove('bell-scale'), 200);
      }
    }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          ref={bellRef}
          className={cn(
            headerToolbarIconTriggerClass,
            'relative transition-transform',
            isBellAnimating && 'bell-shake',
          )}
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <>
              <span
                className={cn(
                  'absolute -end-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white',
                  unreadCount > 0 && 'glow-pulse',
                )}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
              <span className="absolute -end-0.5 -top-0.5 flex h-4 w-4 rounded-full bg-red-500 pulse-ring" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 glass-morphism"
        align="end"
        sideOffset={4}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">Notifications</h4>
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium',
                socketStatus === 'connected'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : socketStatus === 'connecting'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
              )}
            >
              {socketStatus === 'connected' ? (
                <>
                  <Wifi className="h-2.5 w-2.5" />
                  Live
                </>
              ) : socketStatus === 'connecting' ? (
                <>
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  Connecting
                </>
              ) : (
                <>
                  <WifiOff className="h-2.5 w-2.5" />
                  Offline
                </>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all
            </Button>
          )}
        </div>

        {/* Compact Filters */}
        <div className="border-b px-3 py-2 bg-muted/10">
          <NotificationFilters
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            timeFilter="all"
            onTypeChange={setTypeFilter}
            onStatusChange={setStatusFilter}
            onTimeChange={() => {}}
            unreadCount={unreadCount}
            importantCount={importantCount}
            compact
            counts={filterCounts}
          />
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">
                {typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'No notifications match your filters'
                  : 'No notifications yet'}
              </p>
              {(typeFilter !== 'all' || statusFilter !== 'all') && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs"
                  onClick={handleClearFilters}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y p-1">
              {filteredNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className="stagger-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <EnhancedNotificationItem
                    notification={notification}
                    onMarkRead={markAsRead}
                    onDismiss={handleDismiss}
                    onToggleImportant={handleToggleImportant}
                    onClick={() => handleNotificationClick(notification)}
                    isNew={newNotificationIds.has(notification.id)}
                    isImportant={importantNotifications.has(notification.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t p-2 bg-muted/10">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setOpen(false);
                navigate({ to: '/notifications' });
              }}
            >
              View all notifications
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
