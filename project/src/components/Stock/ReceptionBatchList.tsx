import {  useState  } from "react";
import {
  usePaginatedReceptionBatches,
  useReceptionBatchStats,
  useCancelReceptionBatch,
  useDeleteReceptionBatch,
} from '@/hooks/useReceptionBatches';
import { useAuth } from '@/hooks/useAuth';
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
  useServerTableState,
  DateRangeFilter,
  DataTablePagination,
} from '@/components/ui/data-table';
import {
  Package,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  XCircle,
  Search,
  Loader2,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import type {
  ReceptionBatch,
  ReceptionBatchStatus,
  ReceptionDecision,
  QualityGrade,
} from '@/types/reception';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

interface ReceptionBatchListProps {
  onCreateClick: () => void;
  onViewClick: (batch: ReceptionBatch) => void;
  onEditClick?: (batch: ReceptionBatch) => void;
}

const STATUS_COLORS: Record<ReceptionBatchStatus, string> = {
  received: 'bg-blue-100 text-blue-800',
  quality_checked: 'bg-purple-100 text-purple-800',
  decision_made: 'bg-orange-100 text-orange-800',
  processed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const DECISION_COLORS: Record<ReceptionDecision, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  direct_sale: 'bg-green-100 text-green-800',
  storage: 'bg-blue-100 text-blue-800',
  transformation: 'bg-purple-100 text-purple-800',
  rejected: 'bg-red-100 text-red-800',
};

const QUALITY_GRADE_COLORS: Record<QualityGrade, string> = {
  Extra: 'bg-emerald-100 text-emerald-800',
  A: 'bg-green-100 text-green-800',
  First: 'bg-green-100 text-green-800',
  B: 'bg-yellow-100 text-yellow-800',
  Second: 'bg-yellow-100 text-yellow-800',
  C: 'bg-orange-100 text-orange-800',
  Third: 'bg-orange-100 text-orange-800',
};

export default function ReceptionBatchList({
  onCreateClick,
  onViewClick,
  onEditClick,
}: ReceptionBatchListProps) {
  const { t } = useTranslation('stock');
  const { currentOrganization } = useAuth();
  const [filterStatus, setFilterStatus] = useState<ReceptionBatchStatus | 'all'>('all');
  const [filterDecision, setFilterDecision] = useState<ReceptionDecision | 'all'>('all');

  // Helper functions to get translated labels
  const getDecisionLabel = (decision: ReceptionDecision) => {
    return t(`receptionBatches.list.decisions.${decision === 'direct_sale' ? 'directSale' : decision}`);
  };

  const getStatusLabel = (status: ReceptionBatchStatus) => {
    const statusMap: Record<ReceptionBatchStatus, string> = {
      received: 'received',
      quality_checked: 'qualityChecked',
      decision_made: 'decisionMade',
      processed: 'processed',
      cancelled: 'cancelled'
    };
    return t(`receptionBatches.list.statuses.${statusMap[status]}`);
  };

  const [confirmAction, setConfirmAction] = useState<{
    batch: ReceptionBatch;
    action: 'cancel' | 'delete';
  } | null>(null);

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'reception_date', direction: 'desc' },
  });

  const { data: paginatedData, isLoading, isFetching } = usePaginatedReceptionBatches(
    currentOrganization?.id || '',
    {
      ...tableState.queryParams,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      decision: filterDecision !== 'all' ? filterDecision : undefined,
    }
  );
  const { data: stats } = useReceptionBatchStats({});
  const cancelBatch = useCancelReceptionBatch();
  const deleteBatch = useDeleteReceptionBatch();

  const batches = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const handleCancel = async (batchId: string) => {
    try {
      await cancelBatch.mutateAsync(batchId);
      toast.success(t('receptionBatches.list.toasts.cancelSuccess'));
      setConfirmAction(null);
    } catch (error: unknown) {
      toast.error(t('receptionBatches.list.toasts.cancelFailed', { message: error instanceof Error ? error.message : '' }));
    }
  };

  const handleDelete = async (batchId: string) => {
    try {
      await deleteBatch.mutateAsync(batchId);
      toast.success(t('receptionBatches.list.toasts.deleteSuccess'));
      setConfirmAction(null);
    } catch (error: unknown) {
      toast.error(t('receptionBatches.list.toasts.deleteFailed', { message: error instanceof Error ? error.message : '' }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">{t('receptionBatches.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('receptionBatches.list.title')}</h2>
          <p className="text-gray-600">
            {totalItems > 0
              ? t('receptionBatches.list.subtitle', { count: totalItems })
              : t('receptionBatches.list.subtitleEmpty')}
          </p>
        </div>
        <Button onClick={onCreateClick} className="w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4 mr-2" />
          {t('receptionBatches.list.create')}
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('receptionBatches.list.stats.totalBatches')}
              </CardTitle>
              <Package className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_batches}</div>
              <p className="text-xs text-gray-500 mt-1">{t('receptionBatches.list.stats.allTime')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('receptionBatches.list.stats.totalWeight')}
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_weight.toFixed(0)} kg
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('receptionBatches.list.stats.received')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('receptionBatches.list.stats.avgQuality')}
              </CardTitle>
              <ClipboardCheck className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.average_quality_score?.toFixed(1) || 'N/A'}
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('receptionBatches.list.stats.outOf', { max: 10 })}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('receptionBatches.list.stats.pendingDecisions')}
              </CardTitle>
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.by_decision.pending}</div>
              <p className="text-xs text-gray-500 mt-1">{t('receptionBatches.list.stats.awaitingDecision')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('receptionBatches.list.search')}
                value={tableState.search}
                onChange={(e) => tableState.setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
          </div>

          <DateRangeFilter
            value={tableState.datePreset}
            onChange={tableState.setDatePreset}
          />

          <Select
            value={filterStatus}
            onValueChange={(value) => setFilterStatus(value as ReceptionBatchStatus | 'all')}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('receptionBatches.list.filters.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('receptionBatches.list.filters.allStatuses')}</SelectItem>
              <SelectItem value="received">{t('receptionBatches.list.filters.status.received')}</SelectItem>
              <SelectItem value="quality_checked">{t('receptionBatches.list.filters.status.qualityChecked')}</SelectItem>
              <SelectItem value="decision_made">{t('receptionBatches.list.filters.status.decisionMade')}</SelectItem>
              <SelectItem value="processed">{t('receptionBatches.list.filters.status.processed')}</SelectItem>
              <SelectItem value="cancelled">{t('receptionBatches.list.filters.status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterDecision}
            onValueChange={(value) => setFilterDecision(value as ReceptionDecision | 'all')}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('receptionBatches.list.filters.allDecisions')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('receptionBatches.list.filters.allDecisions')}</SelectItem>
              <SelectItem value="pending">{t('receptionBatches.list.filters.decision.pending')}</SelectItem>
              <SelectItem value="storage">{t('receptionBatches.list.filters.decision.storage')}</SelectItem>
              <SelectItem value="direct_sale">{t('receptionBatches.list.filters.decision.directSale')}</SelectItem>
              <SelectItem value="transformation">{t('receptionBatches.list.filters.decision.transformation')}</SelectItem>
              <SelectItem value="rejected">{t('receptionBatches.list.filters.decision.rejected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('receptionBatches.list.table.batchCode')}</TableHead>
                <TableHead>{t('receptionBatches.list.table.receptionDate')}</TableHead>
                <TableHead>{t('receptionBatches.list.table.parcel')}</TableHead>
                <TableHead>{t('receptionBatches.list.table.weight')}</TableHead>
                <TableHead>{t('receptionBatches.list.table.quality')}</TableHead>
                <TableHead>{t('receptionBatches.list.table.decision')}</TableHead>
                <TableHead>{t('receptionBatches.list.table.status')}</TableHead>
                <TableHead className="text-right">{t('receptionBatches.list.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>{tableState.search ? t('receptionBatches.list.empty.searchTitle') : t('receptionBatches.list.empty.title')}</p>
                    <p className="text-sm mt-1">
                      {tableState.search ? t('receptionBatches.list.empty.searchDescription') : t('receptionBatches.list.empty.description')}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.batch_code}</TableCell>
                    <TableCell>
                      {new Date(batch.reception_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{batch.parcel?.name || 'Unknown'}</p>
                        {batch.parcel?.farm && (
                          <p className="text-xs text-gray-500">
                            {batch.parcel.farm.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {batch.weight.toFixed(2)} {batch.weight_unit}
                    </TableCell>
                    <TableCell>
                      {batch.quality_grade ? (
                        <div className="flex items-center gap-2">
                          <Badge
                            className={QUALITY_GRADE_COLORS[batch.quality_grade]}
                          >
                            {batch.quality_grade}
                          </Badge>
                          {batch.quality_score && (
                            <span className="text-sm text-gray-600">
                              {batch.quality_score}{t('receptionBatches.list.quality.outOf', { max: 10 })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">{t('receptionBatches.list.quality.notGraded')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={DECISION_COLORS[batch.decision]}>
                        {getDecisionLabel(batch.decision)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[batch.status]}>
                        {getStatusLabel(batch.status)}
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
                          <DropdownMenuItem onClick={() => onViewClick(batch)}>
                            <Eye className="w-4 h-4 mr-2" />
                            {t('receptionBatches.list.actions.viewDetails')}
                          </DropdownMenuItem>

                          {batch.status === 'received' && onEditClick && (
                            <>
                              <DropdownMenuItem onClick={() => onEditClick(batch)}>
                                <Edit className="w-4 h-4 mr-2" />
                                {t('receptionBatches.list.actions.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmAction({ batch, action: 'delete' })
                                }
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('receptionBatches.list.actions.delete')}
                              </DropdownMenuItem>
                            </>
                          )}

                          {batch.status !== 'cancelled' &&
                            batch.status !== 'processed' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmAction({ batch, action: 'cancel' })
                                  }
                                  className="text-orange-600"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  {t('receptionBatches.list.actions.cancelBatch')}
                                </DropdownMenuItem>
                              </>
                            )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden space-y-3 p-3">
          {batches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p>{tableState.search ? t('receptionBatches.list.mobile.searchEmpty') : t('receptionBatches.list.mobile.empty')}</p>
            </div>
          ) : (
            batches.map((batch) => (
              <div key={batch.id} className="border rounded-lg p-3 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{batch.batch_code}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(batch.reception_date).toLocaleDateString()}
                    </p>
                    {batch.parcel?.name && (
                      <p className="text-xs text-gray-600 truncate">
                        {batch.parcel.name}{batch.parcel?.farm ? ` • ${batch.parcel.farm.name}` : ''}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewClick(batch)}>
                        <Eye className="w-4 h-4 mr-2" />
                        {t('receptionBatches.list.actions.viewDetails')}
                      </DropdownMenuItem>
                      {batch.status === 'received' && onEditClick && (
                        <>
                          <DropdownMenuItem onClick={() => onEditClick(batch)}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('receptionBatches.list.actions.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmAction({ batch, action: 'delete' })
                            }
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('receptionBatches.list.actions.delete')}
                          </DropdownMenuItem>
                        </>
                      )}
                      {batch.status !== 'cancelled' && batch.status !== 'processed' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmAction({ batch, action: 'cancel' })
                            }
                            className="text-orange-600"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            {t('receptionBatches.list.actions.cancelBatch')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs mt-3">
                  <Badge className="bg-gray-100 text-gray-800">
                    {batch.weight.toFixed(2)} {batch.weight_unit}
                  </Badge>
                  <Badge className={STATUS_COLORS[batch.status]}>
                    {getStatusLabel(batch.status)}
                  </Badge>
                  <Badge className={DECISION_COLORS[batch.decision]}>
                    {getDecisionLabel(batch.decision)}
                  </Badge>
                  {batch.quality_grade && (
                    <Badge className={QUALITY_GRADE_COLORS[batch.quality_grade]}>
                      {batch.quality_grade}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <DataTablePagination
          page={tableState.page}
          pageSize={tableState.pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={tableState.setPage}
          onPageSizeChange={tableState.setPageSize}
        />
      )}

      {confirmAction && (
        <AlertDialog
          open={!!confirmAction}
          onOpenChange={() => setConfirmAction(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t(`receptionBatches.list.confirm.${confirmAction.action}Title`)}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(`receptionBatches.list.confirm.${confirmAction.action}Description`)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('receptionBatches.list.confirm.cancelButton')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const { batch, action } = confirmAction;
                  if (action === 'cancel') handleCancel(batch.id);
                  else if (action === 'delete') handleDelete(batch.id);
                }}
                className={
                  confirmAction.action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }
              >
                {t(`receptionBatches.list.confirm.${confirmAction.action}Action`)}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
