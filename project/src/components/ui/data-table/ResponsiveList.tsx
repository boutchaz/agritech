import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SectionLoader } from '@/components/ui/loader';
import { EmptyState } from '@/components/ui/empty-state';
import type { LucideIcon } from 'lucide-react';

export interface ResponsiveListProps<T> {
  items: T[];
  isLoading?: boolean;
  isFetching?: boolean;
  keyExtractor: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  renderTable: (item: T) => ReactNode;
  renderTableHeader?: ReactNode;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyMessage: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  };
  className?: string;
  /** Extra content rendered below the empty state (e.g. secondary message) */
  emptyExtra?: ReactNode;
}

export function ResponsiveList<T>({
  items,
  isLoading = false,
  isFetching = false,
  keyExtractor,
  renderCard,
  renderTable,
  renderTableHeader,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  emptyAction,
  className,
  emptyExtra,
}: ResponsiveListProps<T>) {
  if (isLoading) {
    return <SectionLoader />;
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          variant="card"
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyMessage}
          action={emptyAction}
        />
        {emptyExtra}
      </div>
    );
  }

  return (
    <div className={cn('relative', isFetching && 'opacity-70', className)}>
      {isFetching && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      )}

      {/* Mobile: Card View */}
      <ul className="lg:hidden space-y-3">
        {items.map((item) => (
          <li key={keyExtractor(item)}>
            {renderCard(item)}
          </li>
        ))}
      </ul>

      {/* Desktop: Table View */}
      <div
        className={cn(
          'hidden lg:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden',
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            {renderTableHeader && (
              <thead className="bg-gray-50 dark:bg-gray-900">
                {renderTableHeader}
              </thead>
            )}
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {renderTable(item)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
