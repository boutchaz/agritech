import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { cn } from '@/lib/utils';

interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function DataTablePagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: DataTablePaginationProps) {
  const { t } = useTranslation();
  
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4 py-4', className)}>
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span>{t('dataTable.pagination.showing', 'Showing')}</span>
        <span className="font-medium text-gray-900 dark:text-white">{startItem}-{endItem}</span>
        <span>{t('dataTable.pagination.of', 'of')}</span>
        <span className="font-medium text-gray-900 dark:text-white">{totalItems}</span>
        <span>{t('dataTable.pagination.items', 'items')}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('dataTable.pagination.rowsPerPage', 'Rows per page')}:
          </span>
          <NativeSelect
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="w-20"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1 px-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('dataTable.pagination.page', 'Page')}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {page}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('dataTable.pagination.of', 'of')}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {totalPages || 1}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
