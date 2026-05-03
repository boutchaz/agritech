import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStockEntry } from '@/hooks/useStockEntries';
import { useCurrency } from '@/hooks/useCurrency';
import { DataTablePagination } from '@/components/ui/data-table';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Package, Warehouse, Calendar, FileText } from 'lucide-react';
import { STOCK_ENTRY_TYPES, STOCK_ENTRY_STATUS_COLORS } from '@/types/stock-entries';

interface StockEntryDetailProps {
  entryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StockEntryDetail({ entryId, open, onOpenChange }: StockEntryDetailProps) {
  const { t } = useTranslation('stock');
  const { data: entry, isLoading, isFetching } = useStockEntry(entryId);
  const { format: formatCurrency } = useCurrency();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  if (!open) return null;

  if (isLoading || isFetching) {
    return (
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        size="4xl"
        className="max-h-[90vh] overflow-y-auto"
        contentClassName="max-h-[90vh] overflow-y-auto"
      >
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3">{t('stockEntries.detail.loading')}</span>
          </div>
      </ResponsiveDialog>
    );
  }

  if (!entry) {
    return (
      <ResponsiveDialog open={open} onOpenChange={onOpenChange} size="4xl">
          <div className="text-center py-12">
            <p className="text-gray-500">{t('stockEntries.detail.notFound')}</p>
          </div>
      </ResponsiveDialog>
    );
  }

  const typeConfig = STOCK_ENTRY_TYPES[entry.entry_type];
  const totalCost = entry.items?.reduce((sum, item) => sum + (item.quantity * (item.cost_per_unit || 0)), 0) || 0;
  const totalItems = entry.items?.length ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedItems = entry.items?.slice((page - 1) * pageSize, page * pageSize) ?? [];

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="4xl"
      className="max-h-[90vh] overflow-y-auto"
      contentClassName="max-h-[90vh] overflow-y-auto"
    >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t('stockEntries.detail.title')}
          </DialogTitle>
          <DialogDescription>
            {entry.entry_number} - {entry.entry_type}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Header Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('stockEntries.detail.entryNumber')}</p>
                <p className="font-semibold text-lg">{entry.entry_number}</p>
              </div>
              <Badge className={STOCK_ENTRY_STATUS_COLORS[entry.status]}>
                {entry.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {t('stockEntries.detail.entryDate')}
                </p>
                <p className="font-medium">{new Date(entry.entry_date).toLocaleDateString()}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {t('stockEntries.detail.entryType')}
                </p>
                <Badge className={`bg-${typeConfig.color}-100 text-${typeConfig.color}-800`}>
                  {entry.entry_type}
                </Badge>
              </div>
            </div>

            {/* Warehouses */}
            {(entry.from_warehouse || entry.to_warehouse) && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                {entry.from_warehouse && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Warehouse className="w-4 h-4" />
                      {t('stockEntries.detail.fromWarehouse')}
                    </p>
                    <p className="font-medium">{entry.from_warehouse.name}</p>
                  </div>
                )}

                {entry.to_warehouse && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Warehouse className="w-4 h-4" />
                      {t('stockEntries.detail.toWarehouse')}
                    </p>
                    <p className="font-medium">{entry.to_warehouse.name}</p>
                  </div>
                )}
              </div>
            )}

            {/* Reference */}
            {entry.reference_number && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('stockEntries.detail.reference')}</p>
                <p className="font-medium">
                  {entry.reference_type && `${entry.reference_type}: `}
                  {entry.reference_number}
                </p>
              </div>
            )}

            {/* Purpose */}
            {entry.purpose && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('stockEntries.detail.purpose')}</p>
                <p className="font-medium">{entry.purpose}</p>
              </div>
            )}

            {/* Notes */}
            {entry.notes && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('stockEntries.detail.notes')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{entry.notes}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-lg font-semibold mb-3">{t('stockEntries.detail.items')}</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t('stockEntries.detail.itemColumn')}</TableHead>
                    <TableHead className="text-right">{t('stockEntries.detail.quantityColumn')}</TableHead>
                    <TableHead className="text-right">{t('stockEntries.detail.rateColumn')}</TableHead>
                    <TableHead className="text-right">{t('stockEntries.detail.amountColumn')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.items && entry.items.length > 0 ? (
                    paginatedItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{(page - 1) * pageSize + index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            {item.variant?.variant_name && (
                              <p className="text-xs text-gray-500">
                                {t('stockEntries.detail.variant', 'Variant')}: {item.variant.variant_name}
                              </p>
                            )}
                            {item.batch_number && (
                              <p className="text-xs text-gray-500">
                                {t('stockEntries.detail.batch')}: {item.batch_number}
                              </p>
                            )}
                            {item.serial_number && (
                              <p className="text-xs text-gray-500">
                                {t('stockEntries.detail.serial')}: {item.serial_number}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.cost_per_unit ? formatCurrency(item.cost_per_unit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.cost_per_unit
                            ? formatCurrency(item.quantity * item.cost_per_unit)
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {t('stockEntries.detail.noItems')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {totalItems > 0 ? (
                <div className="border-t px-4">
                  <DataTablePagination
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setPage(1);
                    }}
                  />
                </div>
              ) : null}
            </div>

            {/* Total */}
            {totalCost > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 min-w-[200px]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{t('stockEntries.detail.totalCost')}:</span>
                    <span className="text-lg font-bold">{formatCurrency(totalCost)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('stockEntries.detail.created')}</span>
              <span>{new Date(entry.created_at).toLocaleString()}</span>
            </div>
            {entry.updated_at && entry.updated_at !== entry.created_at && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('stockEntries.detail.updated')}</span>
                <span>{new Date(entry.updated_at).toLocaleString()}</span>
              </div>
            )}
            {entry.posted_at && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('stockEntries.detail.posted')}</span>
                <span>{new Date(entry.posted_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
    </ResponsiveDialog>
  );
}
