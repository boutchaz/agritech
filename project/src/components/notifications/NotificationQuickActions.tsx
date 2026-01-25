import React from 'react';
import { CheckCheck, Archive, Star, Trash2, FilterX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface NotificationQuickActionsProps {
  unreadCount?: number;
  onMarkAllRead?: () => void;
  onDismissAll?: () => void;
  onMarkAllImportant?: () => void;
  onClearFilters?: () => void;
  hasFilters?: boolean;
  isLoading?: boolean;
  variant?: 'default' | 'compact';
}

/**
 * NotificationQuickActions provides quick action buttons for notification management
 * Supports both inline buttons and dropdown menu actions
 */
export function NotificationQuickActions({
  unreadCount = 0,
  onMarkAllRead,
  onDismissAll,
  onMarkAllImportant,
  onClearFilters,
  hasFilters = false,
  isLoading = false,
  variant = 'default',
}: NotificationQuickActionsProps) {
  const hasActions = onMarkAllRead || onDismissAll || onMarkAllImportant || onClearFilters;

  if (!hasActions) {
    return null;
  }

  if (variant === 'compact') {
    // Compact version with dropdown menu
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={isLoading}
          >
            Quick actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Notification Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {onMarkAllRead && unreadCount > 0 && (
            <DropdownMenuItem
              onClick={onMarkAllRead}
              disabled={isLoading}
              className="cursor-pointer"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </DropdownMenuItem>
          )}
          {onMarkAllImportant && (
            <DropdownMenuItem
              onClick={onMarkAllImportant}
              disabled={isLoading}
              className="cursor-pointer"
            >
              <Star className="h-4 w-4 mr-2" />
              Mark all as important
            </DropdownMenuItem>
          )}
          {onDismissAll && (
            <DropdownMenuItem
              onClick={onDismissAll}
              disabled={isLoading}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Archive className="h-4 w-4 mr-2" />
              Dismiss all notifications
            </DropdownMenuItem>
          )}
          {onClearFilters && hasFilters && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onClearFilters}
                disabled={isLoading}
                className="cursor-pointer"
              >
                <FilterX className="h-4 w-4 mr-2" />
                Clear filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default version with inline buttons
  return (
    <div className="flex items-center gap-2">
      {onMarkAllRead && unreadCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onMarkAllRead}
          disabled={isLoading}
        >
          <CheckCheck className="h-3 w-3 mr-1" />
          Mark all read
        </Button>
      )}
      {onMarkAllImportant && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onMarkAllImportant}
          disabled={isLoading}
        >
          <Star className="h-3 w-3 mr-1" />
          Mark important
        </Button>
      )}
      {onClearFilters && hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onClearFilters}
          disabled={isLoading}
        >
          <FilterX className="h-3 w-3 mr-1" />
          Clear filters
        </Button>
      )}
      {onDismissAll && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDismissAll}
          disabled={isLoading}
        >
          <Archive className="h-3 w-3 mr-1" />
          Dismiss all
        </Button>
      )}
    </div>
  );
}

/**
 * NotificationBulkActions for the notification center page
 * Provides actions when multiple notifications are selected
 */
interface NotificationBulkActionsProps {
  selectedCount: number;
  onMarkRead?: () => void;
  onMarkUnread?: () => void;
  onMarkImportant?: () => void;
  onRemoveImportant?: () => void;
  onDelete?: () => void;
  onClearSelection?: () => void;
  isLoading?: boolean;
}

export function NotificationBulkActions({
  selectedCount,
  onMarkRead,
  onMarkUnread,
  onMarkImportant,
  onRemoveImportant,
  onDelete,
  onClearSelection,
  isLoading = false,
}: NotificationBulkActionsProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'glass-morphism fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'rounded-full px-4 py-2 shadow-lg',
        'flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4'
      )}
    >
      <span className="text-sm font-medium">
        {selectedCount} {selectedCount === 1 ? 'notification' : 'notifications'} selected
      </span>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-1">
        {onMarkRead && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={onMarkRead}
            disabled={isLoading}
            title="Mark as read"
          >
            <CheckCheck className="h-4 w-4" />
          </Button>
        )}
        {onMarkUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={onMarkUnread}
            disabled={isLoading}
            title="Mark as unread"
          >
            <CheckCheck className="h-4 w-4 opacity-50" />
          </Button>
        )}
        {onMarkImportant && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={onMarkImportant}
            disabled={isLoading}
            title="Mark as important"
          >
            <Star className="h-4 w-4" />
          </Button>
        )}
        {onRemoveImportant && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={onRemoveImportant}
            disabled={isLoading}
            title="Remove important"
          >
            <Star className="h-4 w-4 opacity-50" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={isLoading}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <div className="h-4 w-px bg-border mx-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={onClearSelection}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default NotificationQuickActions;
