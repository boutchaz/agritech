import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useStockEntries,
  usePostStockEntry,
  useReverseStockEntry,
  useDeleteStockEntry,
} from '@/hooks/useStockEntries';
import {
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
import {
  DataTablePagination,
  FilterBar,
  ListPageLayout,
  ResponsiveList,
} from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionLoader } from '@/components/ui/loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Package,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Download,
  CalendarDays,
  Hash,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import type {
  StockEntry,
  StockEntryType,
  StockEntryStatus,
  StockEntryFilters,
} from '@/types/stock-entries';
import {
  STOCK_ENTRY_TYPES,
  STOCK_ENTRY_STATUS_COLORS,
} from '@/types/stock-entries';
import { toast } from 'sonner';

interface StockEntryListProps {
  onCreateClick: () => void;
  onViewClick: (entry: StockEntry) => void;
}

type StockEntryListItem = StockEntry & {
  from_warehouse?: { id: string; name: string } | null;
  to_warehouse?: { id: string; name: string } | null;
  farm_name?: string | null;
  farm?: { name?: string | null } | string | null;
  quantity?: number | null;
  unit?: string | null;
  item_name?: string | null;
  product_name?: string | null;
  items?: Array<{
    quantity?: number | null;
    unit?: string | null;
    item_name?: string | null;
    product_name?: string | null;
    item?: { item_name?: string | null; default_unit?: string | null } | null;
    farm?: { name?: string | null } | string | null;
    farm_name?: string | null;
  }>;
};

export default function StockEntryList({ onCreateClick, onViewClick }: StockEntryListProps) {
  const { t } = useTranslation('stock');
  const [filters, setFilters] = useState<StockEntryFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmAction, setConfirmAction] = useState<{
    entry: StockEntry;
    action: 'post' | 'delete' | 'reverse';
  } | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  const { data: entries = [], isLoading } = useStockEntries(filters);
  const postEntry = usePostStockEntry();
  const reverseEntry = useReverseStockEntry();
  const deleteEntry = useDeleteStockEntry();

  // Filter entries by search term
  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) =>
        entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [entries, searchTerm],
  );

  const totalItems = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedEntries = useMemo(
    () => filteredEntries.slice((page - 1) * pageSize, page * pageSize),
    [filteredEntries, page, pageSize],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handlePost = async (entryId: string) => {
    try {
      await postEntry.mutateAsync(entryId);
      toast.success(t('stockEntries.toast.postSuccess'));
      setConfirmAction(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      toast.error(`${t('stockEntries.toast.postError')}: ${message}`);
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteEntry.mutateAsync(entryId);
      toast.success(t('stockEntries.toast.deleteSuccess'));
      setConfirmAction(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      toast.error(`${t('stockEntries.toast.deleteError')}: ${message}`);
    }
  };

  const handleReverse = async (entryId: string) => {
    const reason = reverseReason.trim();

    if (!reason) {
      toast.error(t('stockEntries.toast.reverseReasonRequired', 'Reversal reason is required'));
      return;
    }

    try {
      await reverseEntry.mutateAsync({ entryId, reason });
      toast.success(t('stockEntries.toast.reverseSuccess', 'Stock entry reversed successfully'));
      setConfirmAction(null);
      setReverseReason('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      toast.error(`${t('stockEntries.toast.reverseError', 'Failed to reverse stock entry')}: ${message}`);
    }
  };

  const getActionLabel = (action: 'post' | 'delete' | 'reverse') => {
    switch (action) {
      case 'post':
        return {
          title: t('stockEntries.confirm.postTitle'),
          description: t('stockEntries.confirm.postDescription'),
          confirmLabel: t('stockEntries.confirm.postConfirm'),
        };
      case 'delete':
        return {
          title: t('stockEntries.confirm.deleteTitle'),
          description: t('stockEntries.confirm.deleteDescription'),
          confirmLabel: t('stockEntries.confirm.deleteConfirm'),
        };
      case 'reverse':
        return {
          title: t('stockEntries.confirm.reverseTitle', 'Reverse stock entry'),
          description: t(
            'stockEntries.confirm.reverseDescription',
            'This will create reversal movements and mark the original entry as reversed.'
          ),
          confirmLabel: t('stockEntries.confirm.reverseConfirm', 'Reverse entry'),
        };
    }
  };

  const getWarehouseDisplay = (entry: StockEntryListItem) => {
    const fromWarehouse = entry.from_warehouse;
    const toWarehouse = entry.to_warehouse;

    if (fromWarehouse && toWarehouse) {
      return (
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('stockEntries.table.from')}: {fromWarehouse.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('stockEntries.table.to')}: {toWarehouse.name}
          </span>
        </div>
      );
    }

    if (fromWarehouse) {
      return <span>{t('stockEntries.table.from')}: {fromWarehouse.name}</span>;
    }

    if (toWarehouse) {
      return <span>{t('stockEntries.table.to')}: {toWarehouse.name}</span>;
    }

    return '-';
  };

  const getPrimaryItem = (entry: StockEntryListItem) => entry.items?.[0];

  const getProductName = (entry: StockEntryListItem) => {
    const primaryItem = getPrimaryItem(entry);
    return (
      primaryItem?.item?.item_name ||
      primaryItem?.item_name ||
      primaryItem?.product_name ||
      entry.item_name ||
      entry.product_name ||
      t('stockEntries.card.productFallback', '—')
    );
  };

  const getFarmName = (entry: StockEntryListItem) => {
    const primaryItem = getPrimaryItem(entry);
    const farm = primaryItem?.farm ?? entry.farm;

    if (typeof farm === 'string') {
      return farm;
    }

    return primaryItem?.farm_name || entry.farm_name || farm?.name || t('stockEntries.card.farmFallback', '—');
  };

  const getQuantityValue = (entry: StockEntryListItem) => {
    const primaryItem = getPrimaryItem(entry);
    return primaryItem?.quantity ?? entry.quantity;
  };

  const getUnitValue = (entry: StockEntryListItem) => {
    const primaryItem = getPrimaryItem(entry);
    return primaryItem?.unit || primaryItem?.item?.default_unit || entry.unit;
  };

  const renderActions = (entry: StockEntry) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewClick(entry)}>
          <Eye className="w-4 h-4 mr-2" />
          {t('stockEntries.actions.viewDetails')}
        </DropdownMenuItem>

        {entry.status === 'Draft' && (
          <>
            <DropdownMenuItem>
              <Edit className="w-4 h-4 mr-2" />
              {t('stockEntries.actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setConfirmAction({ entry, action: 'post' })}>
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              {t('stockEntries.actions.postEntry')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmAction({ entry, action: 'delete' })}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('stockEntries.actions.delete')}
            </DropdownMenuItem>
          </>
        )}

        {entry.status === 'Posted' && (
          <DropdownMenuItem
            onClick={() => {
              setReverseReason('');
              setConfirmAction({ entry, action: 'reverse' });
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2 text-orange-600" />
            {t('stockEntries.actions.reverseEntry', 'Reverse entry')}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Download className="w-4 h-4 mr-2" />
          {t('stockEntries.actions.exportPdf')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isLoading) {
    return <SectionLoader />;
  }

  return (
    <>
      <ListPageLayout
        header={
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('stockEntries.title')}</h2>
              <p className="text-gray-600 dark:text-gray-400">{t('stockEntries.subtitle')}</p>
            </div>
            <Button variant="default" onClick={onCreateClick}>
              <Plus className="w-4 h-4 mr-2" />
              {t('stockEntries.newEntry')}
            </Button>
          </div>
        }
        filters={
          <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div className="md:col-span-2">
                <FilterBar
                  searchValue={searchTerm}
                  onSearchChange={(value) => {
                    setSearchTerm(value);
                    setPage(1);
                  }}
                  searchPlaceholder={t('stockEntries.searchPlaceholder')}
                />
              </div>

              <div>
                <Select
                  value={filters.entry_type || 'all'}
                  onValueChange={(value) => {
                    setFilters({
                      ...filters,
                      entry_type: value === 'all' ? undefined : (value as StockEntryType),
                    });
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('stockEntries.allTypes')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('stockEntries.allTypes')}</SelectItem>
                    {Object.values(STOCK_ENTRY_TYPES).map((type) => (
                      <SelectItem key={type.type} value={type.type}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => {
                    setFilters({
                      ...filters,
                      status: value === 'all' ? undefined : (value as StockEntryStatus),
                    });
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('stockEntries.allStatuses')} />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('stockEntries.allStatuses')}</SelectItem>
                      <SelectItem value="Draft">{t('stockEntries.status.draft')}</SelectItem>
                      <SelectItem value="Posted">{t('stockEntries.status.posted')}</SelectItem>
                      <SelectItem value="Cancelled">{t('stockEntries.status.cancelled')}</SelectItem>
                      <SelectItem value="Reversed">{t('stockEntries.status.reversed', 'Reversed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>
          </div>
        }
        stats={
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {Object.values(STOCK_ENTRY_TYPES).map((type) => {
              const count = entries.filter((e) => e.entry_type === type.type).length;
              return (
                <div key={type.type} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{type.label}</p>
                      <p className="mt-1 text-2xl font-bold">{count}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-${type.color}-100`}>
                      <Package className={`h-6 w-6 text-${type.color}-600`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        }
        pagination={
          totalItems > 0 ? (
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
          ) : null
        }
      >
        {filteredEntries.length === 0 ? (
          <EmptyState
            variant="card"
            icon={Package}
            title={t('stockEntries.noEntries')}
            description={t('stockEntries.noEntriesHint')}
            action={{
              label: t('stockEntries.newEntry'),
              onClick: onCreateClick,
            }}
          />
        ) : (
          <ResponsiveList
            items={paginatedEntries}
            isLoading={isLoading}
            keyExtractor={(item) => item.id}
            emptyIcon={Package}
            emptyMessage={t('stockEntries.noEntries')}
            renderCard={(entry) => {
              const listEntry = entry as StockEntryListItem;
              const typeConfig = STOCK_ENTRY_TYPES[entry.entry_type];
              const quantity = getQuantityValue(listEntry);
              const unit = getUnitValue(listEntry);

              return (
                <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {getProductName(listEntry)}
                      </p>
                      <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                        {getFarmName(listEntry)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {entry.entry_number}
                      </p>
                    </div>
                    <Badge className={STOCK_ENTRY_STATUS_COLORS[entry.status]}>{entry.status}</Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        {t('stockEntries.table.type')}
                      </span>
                      <Badge className={`bg-${typeConfig.color}-100 text-${typeConfig.color}-800`}>
                        {entry.entry_type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {t('stockEntries.card.quantity', 'Quantity')}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {quantity != null ? `${quantity} ${unit || ''}`.trim() : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {t('stockEntries.table.date')}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(entry.entry_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{getWarehouseDisplay(listEntry)}</div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Button variant="outline" size="sm" onClick={() => onViewClick(entry)}>
                      <Eye className="mr-2 h-4 w-4" />
                      {t('stockEntries.actions.viewDetails')}
                    </Button>
                    {renderActions(entry)}
                  </div>
                </div>
              );
            }}
            renderTableHeader={
              <TableRow>
                <TableHead>{t('stockEntries.table.entryNumber')}</TableHead>
                <TableHead>{t('stockEntries.table.date')}</TableHead>
                <TableHead>{t('stockEntries.table.type')}</TableHead>
                <TableHead>{t('stockEntries.table.warehouse')}</TableHead>
                <TableHead>{t('stockEntries.table.reference')}</TableHead>
                <TableHead>{t('stockEntries.table.status')}</TableHead>
                <TableHead className="text-right">{t('stockEntries.table.actions')}</TableHead>
              </TableRow>
            }
            renderTable={(entry) => {
              const listEntry = entry as StockEntryListItem;
              const typeConfig = STOCK_ENTRY_TYPES[entry.entry_type];

              return (
                <>
                  <TableCell className="font-medium">{entry.entry_number}</TableCell>
                  <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={`bg-${typeConfig.color}-100 text-${typeConfig.color}-800`}>
                      {entry.entry_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {getWarehouseDisplay(listEntry)}
                  </TableCell>
                  <TableCell className="text-sm">{entry.reference_number || '-'}</TableCell>
                  <TableCell>
                    <Badge className={STOCK_ENTRY_STATUS_COLORS[entry.status]}>{entry.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{renderActions(entry)}</TableCell>
                </>
              );
            }}
          />
        )}
      </ListPageLayout>

      {confirmAction && (
        <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{getActionLabel(confirmAction.action).title}</AlertDialogTitle>
              <AlertDialogDescription>
                {getActionLabel(confirmAction.action).description}
              </AlertDialogDescription>
              {confirmAction.action === 'reverse' && (
                <div className="mt-4 space-y-2">
                  <label
                    htmlFor="stock-entry-reversal-reason"
                    className="text-sm font-medium text-gray-900 dark:text-gray-100"
                  >
                    {t('stockEntries.form.reversalReason', 'Reversal reason')}
                  </label>
                  <Input
                    id="stock-entry-reversal-reason"
                    value={reverseReason}
                    onChange={(event) => setReverseReason(event.target.value)}
                    placeholder={t(
                      'stockEntries.form.reversalReasonPlaceholder',
                      'Explain why this stock entry is being reversed'
                    )}
                  />
                </div>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('stockEntries.confirm.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const { entry, action } = confirmAction;
                  if (action === 'post') handlePost(entry.id);
                  else if (action === 'reverse') handleReverse(entry.id);
                  else if (action === 'delete') handleDelete(entry.id);
                }}
                className={
                  confirmAction.action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmAction.action === 'post'
                    ? 'bg-green-600 hover:bg-green-700'
                    : confirmAction.action === 'reverse'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : ''
                }
              >
                {getActionLabel(confirmAction.action).confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
