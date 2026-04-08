import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SectionLoader } from '@/components/ui/loader';

export interface ResponsiveListProps<T> {
  items: T[];
  isLoading?: boolean;
  keyExtractor: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  renderTable: (item: T) => ReactNode;
  renderTableHeader?: ReactNode;
  emptyIcon?: ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveList<T>({
  items,
  isLoading = false,
  keyExtractor,
  renderCard,
  renderTable,
  renderTableHeader,
  emptyIcon,
  emptyMessage,
  className,
}: ResponsiveListProps<T>) {
  if (isLoading) {
    return <SectionLoader />;
  }

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 sm:p-12 text-center">
        {emptyIcon && (
          <div className="mx-auto mb-4 w-12 h-12 sm:w-16 sm:h-16 text-gray-300">
            {emptyIcon}
          </div>
        )}
        {emptyMessage && (
          <p className="text-gray-600 dark:text-gray-400">{emptyMessage}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <ul className="lg:hidden space-y-3">
        {items.map((item) => (
          <li key={keyExtractor(item)}>
            {renderCard(item)}
          </li>
        ))}
      </ul>

      <div
        className={cn(
          'hidden lg:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden',
          className,
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
    </>
  );
}
