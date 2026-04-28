import { useMemo, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { SectionLoader } from '@/components/ui/loader';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTablePagination, ResponsiveList, useServerTableState } from '@/components/ui/data-table';
import { usePaginatedBatches } from '@/hooks/useBatches';
import type { BatchData } from '@/lib/api/stock';
import { Package, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

function getFreshnessColor(batch: BatchData): {
  bg: string;
  text: string;
  label: string;
} {
  if (!batch.expiryDate) {
    return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: 'fresh' };
  }
  const now = new Date();
  const expiry = new Date(batch.expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: 'expired' };
  if (diffDays < 30) return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', label: 'nearExpiry' };
  if (diffDays < 60) return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', label: 'aging' };
  return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: 'fresh' };
}

export default function BatchManagement() {
  const { t } = useTranslation('stock');
  const [itemFilter, setItemFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'created_at', direction: 'desc' as const },
  });

  const { data, isLoading, isFetching } = usePaginatedBatches(
    {
      ...tableState.queryParams,
      item_id: itemFilter !== 'all' ? itemFilter : undefined,
      warehouse_id: warehouseFilter !== 'all' ? warehouseFilter : undefined,
    },
    keepPreviousData,
  );

  const batches = data?.data ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const uniqueItems = useMemo(
    () => [...new Map(batches.map((b) => [b.itemId, b.itemName])).entries()],
    [batches]
  );
  const uniqueWarehouses = useMemo(
    () => [...new Map(batches.map((b) => [b.warehouseId, b.warehouseName])).entries()],
    [batches]
  );

  if (isLoading) {
    return <SectionLoader />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('batchManagement.title', 'Batch Management')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('batchManagement.subtitle', 'Track and manage stock batches')}
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={tableState.search}
              onChange={(e) => tableState.setSearch(e.target.value)}
              placeholder={t('batchManagement.filterByItem', 'Filter by item')}
              className="pl-9"
            />
          </div>
          <Select value={itemFilter} onValueChange={setItemFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('batchManagement.allItems', 'All Items')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('batchManagement.allItems', 'All Items')}</SelectItem>
              {uniqueItems.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('batchManagement.allWarehouses', 'All Warehouses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('batchManagement.allWarehouses', 'All Warehouses')}</SelectItem>
              {uniqueWarehouses.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {batches.length === 0 ? (
        <EmptyState
          variant="card"
          icon={Package}
          title={t('batchManagement.noBatches', 'No batches found')}
          description={t('batchManagement.noBatchesHint', 'Batches will appear when stock entries with batch numbers are posted')}
        />
      ) : (
        <>
          <ResponsiveList
            items={batches}
            isLoading={isFetching}
            isFetching={isFetching}
            keyExtractor={(item) => item.id}
            emptyIcon={Package}
            emptyMessage={t('batchManagement.noBatches', 'No batches found')}
            renderCard={(batch) => {
              const freshness = getFreshnessColor(batch);
              return (
                <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {batch.itemName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('batchManagement.batchNumber', 'Batch')}: {batch.batchNumber}
                      </p>
                    </div>
                    <Badge className={cn(freshness.bg, freshness.text)}>
                      {t(`batchManagement.freshness.${freshness.label}`, freshness.label)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('batchManagement.warehouse', 'Warehouse')}:
                      </span>{' '}
                      {batch.warehouseName}
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('batchManagement.remainingQty', 'Remaining')}:
                      </span>{' '}
                      {batch.remainingQuantity} {batch.unit}
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('batchManagement.costPerUnit', 'Cost/Unit')}:
                      </span>{' '}
                      {batch.costPerUnit.toLocaleString()} MAD
                    </div>
                    {batch.expiryDate && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">
                          {t('batchManagement.expiryDate', 'Expiry')}:
                        </span>{' '}
                        {new Date(batch.expiryDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
            renderTableHeader={
              <TableRow>
                <TableHead>{t('batchManagement.batchNumber', 'Batch Number')}</TableHead>
                <TableHead>{t('batchManagement.itemName', 'Item Name')}</TableHead>
                <TableHead>{t('batchManagement.warehouse', 'Warehouse')}</TableHead>
                <TableHead>{t('batchManagement.remainingQty', 'Remaining Qty')}</TableHead>
                <TableHead>{t('batchManagement.costPerUnit', 'Cost/Unit')}</TableHead>
                <TableHead>{t('batchManagement.totalValue', 'Total Value')}</TableHead>
                <TableHead>{t('batchManagement.expiryDate', 'Expiry Date')}</TableHead>
              </TableRow>
            }
            renderTable={(batch) => {
              const freshness = getFreshnessColor(batch);
              return (
                <>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{batch.batchNumber}</span>
                      <Badge className={cn(freshness.bg, freshness.text, 'text-xs')}>
                        {t(`batchManagement.freshness.${freshness.label}`, freshness.label)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{batch.itemName}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{batch.warehouseName}</TableCell>
                  <TableCell>
                    {batch.remainingQuantity} {batch.unit}
                  </TableCell>
                  <TableCell>{batch.costPerUnit.toLocaleString()} MAD</TableCell>
                  <TableCell className="font-medium">{batch.totalValue.toLocaleString()} MAD</TableCell>
                  <TableCell>
                    {batch.expiryDate
                      ? new Date(batch.expiryDate).toLocaleDateString()
                      : '-'}
                  </TableCell>
                </>
              );
            }}
          />
          <DataTablePagination
            page={tableState.page}
            pageSize={tableState.pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={tableState.setPage}
            onPageSizeChange={tableState.setPageSize}
          />
        </>
      )}
    </div>
  );
}
