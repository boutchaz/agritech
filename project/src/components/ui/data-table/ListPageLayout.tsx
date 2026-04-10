import * as React from 'react';
import type { ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Do not traverse into these — nested Buttons (e.g. menu triggers) must keep their own variants. */
const SHELL_TOOLBAR_SKIP_RECURSE = new Set<string>([
  'Select',
  'SelectTrigger',
  'SelectContent',
  'DropdownMenu',
  'DropdownMenuTrigger',
  'DropdownMenuContent',
  'Popover',
  'PopoverTrigger',
  'PopoverContent',
  'Dialog',
  'DialogContent',
  'AlertDialog',
  'AlertDialogContent',
  'ResponsiveDialog',
]);

function getElementTypeName(type: unknown): string | undefined {
  if (typeof type === 'string') return type;
  if (typeof type === 'function') return type.name || (type as { displayName?: string }).displayName;
  if (typeof type === 'object' && type !== null && 'displayName' in type) {
    return (type as { displayName?: string }).displayName ?? undefined;
  }
  return undefined;
}

/**
 * Shell toolbars use <Button> without variant → Button defaults to `ghost`.
 * Map those to `default` (primary / design tokens) unless a variant was set explicitly.
 */
function applyShellToolbarPrimaryButtons(node: React.ReactNode, depth = 0): React.ReactNode {
  if (depth > 8) return node;

  return React.Children.map(node, (child) => {
    if (!React.isValidElement(child)) return child;

    if (child.type === Button) {
      const p = child.props as ButtonProps;
      if (p.variant != null) return child;
      return React.cloneElement(child, { variant: 'default' });
    }

    const typeName = getElementTypeName(child.type);
    if (typeName && SHELL_TOOLBAR_SKIP_RECURSE.has(typeName)) {
      return child;
    }

    const props = child.props as { children?: React.ReactNode };
    if (props.children == null) return child;

    return React.cloneElement(child, {
      ...props,
      children: applyShellToolbarPrimaryButtons(props.children, depth + 1),
    } as never);
  });
}

export interface ListPageHeaderProps {
  /** Omit when variant is "shell" — title already shown in ModernPageHeader / PageLayout */
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  /**
   * Use on pages wrapped with ModernPageHeader: skips duplicate h2 title/subtitle,
   * keeps optional actions row (toolbar) only.
   */
  variant?: 'default' | 'shell';
}

export function ListPageHeader({
  title,
  subtitle,
  actions,
  icon,
  className,
  variant = 'default',
}: ListPageHeaderProps) {
  if (variant === 'shell') {
    if (!actions) {
      return null;
    }
    const toolbarActions = applyShellToolbarPrimaryButtons(actions);
    return (
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3',
          className,
        )}
      >
        <div className="flex gap-2 flex-shrink-0 flex-wrap sm:justify-end">{toolbarActions}</div>
      </div>
    );
  }

  if (!title) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        className,
      )}
    >
      <div className="min-w-0">
        {icon && (
          <div className="flex items-center gap-2.5 mb-1">
            {icon}
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </h2>
          </div>
        )}
        {!icon && (
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}

export interface ListPageLayoutProps {
  header?: ReactNode;
  filters?: ReactNode;
  stats?: ReactNode;
  children: ReactNode;
  pagination?: ReactNode;
  className?: string;
}

export function ListPageLayout({
  header,
  filters,
  stats,
  children,
  pagination,
  className,
}: ListPageLayoutProps) {
  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      {header}
      {filters}
      {stats}
      {children}
      {pagination}
    </div>
  );
}
