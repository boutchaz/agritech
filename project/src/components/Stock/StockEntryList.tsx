import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useStockEntries,
  usePostStockEntry,
  useCancelStockEntry,
  useDeleteStockEntry,
} from '@/hooks/useStockEntries';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
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
  XCircle,
  Search, Download,
  Loader2
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

export default function StockEntryList({ onCreateClick, onViewClick }: StockEntryListProps) {
  const { t } = useTranslation('stock');
  const [filters, setFilters] = useState<StockEntryFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    entry: StockEntry;
    action: 'post' | 'cancel' | 'delete';
  } | null>(null);

  const { data: entries = [], isLoading } = useStockEntries(filters);
  const postEntry = usePostStockEntry();
  const cancelEntry = useCancelStockEntry();
  const deleteEntry = useDeleteStockEntry();

  // Filter entries by search term
  const filteredEntries = entries.filter((entry) =>
    entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleCancel = async (entryId: string) => {
    try {
      await cancelEntry.mutateAsync(entryId);
      toast.success(t('stockEntries.toast.cancelSuccess'));
      setConfirmAction(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      toast.error(`${t('stockEntries.toast.cancelError')}: ${message}`);
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

  const getActionLabel = (action: 'post' | 'cancel' | 'delete') => {
    switch (action) {
      case 'post':
        return {
          title: t('stockEntries.confirm.postTitle'),
          description: t('stockEntries.confirm.postDescription'),
          confirmLabel: t('stockEntries.confirm.postConfirm'),
        };
      case 'cancel':
        return {
          title: t('stockEntries.confirm.cancelTitle'),
          description: t('stockEntries.confirm.cancelDescription'),
          confirmLabel: t('stockEntries.confirm.cancelConfirm'),
        };
      case 'delete':
        return {
          title: t('stockEntries.confirm.deleteTitle'),
          description: t('stockEntries.confirm.deleteDescription'),
          confirmLabel: t('stockEntries.confirm.deleteConfirm'),
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">{t('stockEntries.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('stockEntries.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('stockEntries.subtitle')}</p>
        </div>
        <Button onClick={onCreateClick}>
          <Plus className="w-4 h-4 mr-2" />
          {t('stockEntries.newEntry')}
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={t('stockEntries.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Entry Type Filter */}
          <div>
            <Select
              value={filters.entry_type || 'all'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  entry_type: value === 'all' ? undefined : (value as StockEntryType),
                })
              }
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

          {/* Status Filter */}
          <div>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  status: value === 'all' ? undefined : (value as StockEntryStatus),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('stockEntries.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('stockEntries.allStatuses')}</SelectItem>
                <SelectItem value="Draft">{t('stockEntries.status.draft')}</SelectItem>
                <SelectItem value="Submitted">{t('stockEntries.status.submitted')}</SelectItem>
                <SelectItem value="Posted">{t('stockEntries.status.posted')}</SelectItem>
                <SelectItem value="Cancelled">{t('stockEntries.status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {Object.values(STOCK_ENTRY_TYPES).map((type) => {
          const count = entries.filter((e) => e.entry_type === type.type).length;
          return (
            <div key={type.type} className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{type.label}</p>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                </div>
                <div className={`w-12 h-12 rounded-full bg-${type.color}-100 flex items-center justify-center`}>
                  <Package className={`w-6 h-6 text-${type.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('stockEntries.table.entryNumber')}</TableHead>
              <TableHead>{t('stockEntries.table.date')}</TableHead>
              <TableHead>{t('stockEntries.table.type')}</TableHead>
              <TableHead>{t('stockEntries.table.warehouse')}</TableHead>
              <TableHead>{t('stockEntries.table.reference')}</TableHead>
              <TableHead>{t('stockEntries.table.status')}</TableHead>
              <TableHead className="text-right">{t('stockEntries.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>{t('stockEntries.noEntries')}</p>
                  <p className="text-sm mt-1">{t('stockEntries.noEntriesHint')}</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const typeConfig = STOCK_ENTRY_TYPES[entry.entry_type];
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.entry_number}</TableCell>
                    <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={`bg-${typeConfig.color}-100 text-${typeConfig.color}-800`}>
                        {entry.entry_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {(() => {
                        const fromWarehouse = (entry as unknown as { from_warehouse?: { name: string } }).from_warehouse;
                        const toWarehouse = (entry as unknown as { to_warehouse?: { name: string } }).to_warehouse;
                        
                        if (fromWarehouse && toWarehouse) {
                          return (
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500 dark:text-gray-400">{t('stockEntries.table.from')}: {fromWarehouse.name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{t('stockEntries.table.to')}: {toWarehouse.name}</span>
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
                      })()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.reference_number || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={STOCK_ENTRY_STATUS_COLORS[entry.status]}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
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
                              <DropdownMenuItem
                                onClick={() => setConfirmAction({ entry, action: 'post' })}
                              >
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
                              onClick={() => setConfirmAction({ entry, action: 'cancel' })}
                            >
                              <XCircle className="w-4 h-4 mr-2 text-orange-600" />
                              {t('stockEntries.actions.cancelEntry')}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            {t('stockEntries.actions.exportPdf')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{getActionLabel(confirmAction.action).title}</AlertDialogTitle>
              <AlertDialogDescription>
                {getActionLabel(confirmAction.action).description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('stockEntries.confirm.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const { entry, action } = confirmAction;
                  if (action === 'post') handlePost(entry.id);
                  else if (action === 'cancel') handleCancel(entry.id);
                  else if (action === 'delete') handleDelete(entry.id);
                }}
                className={
                  confirmAction.action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmAction.action === 'post'
                    ? 'bg-green-600 hover:bg-green-700'
                    : ''
                }
              >
                {getActionLabel(confirmAction.action).confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
