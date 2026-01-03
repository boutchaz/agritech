import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  key: keyof T | null;
  direction: SortDirection;
}

interface SortableHeaderProps<T> {
  label: string;
  sortKey: keyof T;
  currentSort: SortConfig<T>;
  onSort: (key: keyof T) => void;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export function SortableHeader<T>({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
  align = 'left',
}: SortableHeaderProps<T>) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  const alignClass = {
    left: 'justify-start text-left',
    right: 'justify-end text-right',
    center: 'justify-center text-center',
  }[align];

  return (
    <th
      className={cn(
        'py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn('flex items-center gap-1', alignClass)}>
        <span>{label}</span>
        <span className="w-4 h-4 flex items-center justify-center">
          {direction === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-green-600" />
          ) : direction === 'desc' ? (
            <ArrowDown className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 opacity-50" />
          )}
        </span>
      </div>
    </th>
  );
}
