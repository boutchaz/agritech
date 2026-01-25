import React, { useState } from 'react';
import { Check, CheckCheck, ExternalLink, Star, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { NotificationData } from '@/lib/socket';

interface NotificationItemProps {
  notification: NotificationData;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onClick: () => void;
  isNew?: boolean;
  index?: number;
  isImportant?: boolean;
}

// Color coding by notification type
const typeStyles: Record<string, { bg: string; text: string; icon: string; iconBg: string }> = {
  task_assigned: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
    icon: '📋',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  task_status_changed: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-700 dark:text-indigo-400',
    icon: '✅',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
  },
  order_status_changed: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-400',
    icon: '📦',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
  },
  quote_received: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
    icon: '💰',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
  },
  quote_responded: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-400',
    icon: '✉️',
    iconBg: 'bg-orange-100 dark:bg-orange-900/40',
  },
  harvest_completed: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-400',
    icon: '🌾',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
  },
  low_inventory: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-400',
    icon: '⚠️',
    iconBg: 'bg-red-100 dark:bg-red-900/40',
  },
  payment_processed: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    icon: '💳',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
  general: {
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    text: 'text-gray-700 dark:text-gray-400',
    icon: '🔔',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
  },
};

// Priority indicators
const priorityStyles: Record<string, { border: string; dot: string }> = {
  high: {
    border: 'border-l-4 border-l-red-500',
    dot: 'bg-red-500',
  },
  medium: {
    border: 'border-l-4 border-l-yellow-500',
    dot: 'bg-yellow-500',
  },
  low: {
    border: 'border-l-4 border-l-gray-300 dark:border-l-gray-600',
    dot: 'bg-gray-400',
  },
};

function getPriorityFromType(type: string): string {
  if (type === 'low_inventory') return 'high';
  if (type === 'task_assigned' || type === 'quote_received') return 'medium';
  return 'low';
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
  onToggleImportant,
  onClick,
  isNew = false,
  index = 0,
  isImportant = false,
}: NotificationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [touchStart, setTouchStart] = useState(0);

  const typeStyle = typeStyles[notification.type] || typeStyles.general;
  const priority = getPriorityFromType(notification.type);
  const priorityStyle = priorityStyles[priority];
  const hasLongMessage = notification.message && notification.message.length > 100;

  // Touch handlers for swipe-to-dismiss on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchEnd = e.touches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 50) {
      setIsSwiping(true);
    }
  };

  const handleTouchEnd = () => {
    if (isSwiping) {
      onDismiss(notification.id);
      setIsSwiping(false);
    }
    setTouchStart(0);
  };

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
        'hover:shadow-sm hover:scale-[1.01]',
        !notification.is_read
          ? `${typeStyle.bg} hover:opacity-90`
          : 'hover:bg-muted/50 bg-muted/30',
        priorityStyle.border,
        isNew && 'notification-slide-in',
        isSwiping && 'swipe-dismiss',
        `stagger-in stagger-delay-${Math.min(index + 1, 5)}`
      )}
      style={
        isNew
          ? { animationDelay: `${index * 0.05}s` }
          : undefined
      }
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Priority dot */}
      <div
        className={cn(
          'absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full',
          priorityStyle.dot
        )}
      />

      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg',
          typeStyle.iconBg
        )}
        role="img"
        aria-label={notification.type}
      >
        {typeStyle.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-sm truncate',
                !notification.is_read ? 'font-semibold' : 'font-medium text-muted-foreground'
              )}
            >
              {notification.title}
              {isImportant && (
                <Star className="inline-block ml-1 h-3 w-3 text-amber-500 fill-amber-500" />
              )}
            </p>
            {notification.message && (
              <div className="mt-1">
                {hasLongMessage && !isExpanded ? (
                  <p
                    className={cn(
                      'text-xs line-clamp-2',
                      !notification.is_read ? 'text-foreground/80' : 'text-muted-foreground'
                    )}
                  >
                    {notification.message}
                  </p>
                ) : (
                  <p
                    className={cn(
                      'text-xs whitespace-pre-wrap break-words',
                      !notification.is_read ? 'text-foreground/80' : 'text-muted-foreground'
                    )}
                  >
                    {notification.message}
                  </p>
                )}
                {hasLongMessage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className="mt-1 text-xs text-primary hover:underline flex items-center gap-0.5"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        Show more
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              {getTimeAgo(notification.created_at)}
              {!notification.is_read && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', typeStyle.text, typeStyle.bg)}>
                  New
                </span>
              )}
            </p>
          </div>

          {/* Quick actions */}
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
                aria-label="Mark as read"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 transition-colors',
                isImportant ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-amber-500'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleImportant(notification.id);
              }}
              aria-label={isImportant ? 'Remove from important' : 'Mark as important'}
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
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Data preview (if available) */}
        {notification.data && Object.keys(notification.data).length > 0 && isExpanded && (
          <div className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
            {Object.entries(notification.data).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="font-medium">{key}:</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Swipe indicator for mobile */}
      <div
        className={cn(
          'absolute right-2 top-1/2 -translate-y-1/2 text-destructive transition-opacity',
          isSwiping ? 'opacity-100' : 'opacity-0'
        )}
      >
        <X className="h-5 w-5" />
      </div>
    </div>
  );
}

export default NotificationItem;
