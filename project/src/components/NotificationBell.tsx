import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, ExternalLink, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { useNotifications, useUnreadNotificationCount } from '@/hooks/useNotifications';
import { socketManager, NotificationData } from '@/lib/socket';

interface NotificationItemProps {
  notification: NotificationData;
  onMarkRead: (id: string) => void;
  onClick: () => void;
}

function NotificationItem({ notification, onMarkRead, onClick }: NotificationItemProps) {
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
      default:
        return '🔔';
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
        'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
        !notification.is_read
          ? 'bg-primary/5 hover:bg-primary/10'
          : 'hover:bg-muted/50'
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
            !notification.is_read ? 'font-medium' : 'text-muted-foreground'
          )}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {getTimeAgo(notification.created_at)}
        </p>
      </div>
      {!notification.is_read && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
        >
          <Check className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    socketStatus,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ limit: 20 });

  // Show toast for new notifications
  useEffect(() => {
    const unsubscribe = socketManager.on('notification:new', (notification: NotificationData) => {
      toast(notification.title, {
        description: notification.message,
        action: notification.data?.taskId || notification.data?.orderId ? {
          label: 'View',
          onClick: () => handleNotificationClick(notification),
        } : undefined,
      });
    });

    return unsubscribe;
  }, []);

  const handleNotificationClick = useCallback((notification: NotificationData) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    const { data } = notification;
    if (data?.taskId) {
      navigate({ to: '/tasks', search: { id: data.taskId } });
    } else if (data?.orderId) {
      navigate({ to: '/marketplace/orders', search: { id: data.orderId } });
    } else if (data?.quoteRequestId) {
      navigate({ to: '/marketplace/quotes', search: { id: data.quoteRequestId } });
    }

    setOpen(false);
  }, [markAsRead, navigate]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead();
    toast.success('All notifications marked as read');
  }, [markAllAsRead]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">Notifications</h4>
            {socketStatus === 'connected' ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : socketStatus === 'connecting' ? (
              <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t p-2">
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
