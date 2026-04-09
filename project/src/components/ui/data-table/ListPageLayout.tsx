import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
    return (
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3',
          className,
        )}
      >
        <div className="flex gap-2 flex-shrink-0 flex-wrap sm:justify-end">{actions}</div>
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
