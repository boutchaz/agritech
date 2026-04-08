import { useState } from 'react';
import {
  useQualityInspections,
  useQualityControlStats,
  useDeleteInspection,
} from '@/hooks/useQualityControl';
import { useTranslation } from 'react-i18next';
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
  DataTablePagination,
  FilterBar,
  ListPageLayout,
} from '@/components/ui/data-table';
import {
  ClipboardCheck,
  MoreVertical,
  Trash2,
  TrendingUp,
  BarChart3,
  Clock,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InspectionType, InspectionStatus } from '@/lib/api/quality-control';

const STATUS_COLORS: Record<InspectionStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const TYPE_COLORS: Record<InspectionType, string> = {
  pre_harvest: 'bg-emerald-100 text-emerald-800',
  post_harvest: 'bg-purple-100 text-purple-800',
  storage: 'bg-blue-100 text-blue-800',
  transport: 'bg-orange-100 text-orange-800',
  processing: 'bg-pink-100 text-pink-800',
};

export default function QualityControlList() {
  const { t } = useTranslation('common');
  const [filterStatus, setFilterStatus] = useState<InspectionStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<InspectionType | 'all'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const tableState = useServerTableState({
    defaultPageSize: 12,
    defaultSort: { key: 'inspection_date', direction: 'desc' },
  });

  const { data: paginatedData, isLoading, isFetching } = useQualityInspections(
    {
      ...tableState.queryParams,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      type: filterType !== 'all' ? filterType : undefined,
    },
  );

  const { data: stats } = useQualityControlStats();
  const deleteInspection = useDeleteInspection();

  const inspections = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const getTypeLabel = (type: InspectionType) => {
    const labels: Record<InspectionType, string> = {
      pre_harvest: 'Pre Harvest',
      post_harvest: 'Post Harvest',
      storage: 'Storage',
      transport: 'Transport',
      processing: 'Processing',
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: InspectionStatus) => {
    const labels: Record<InspectionStatus, string> = {
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInspection.mutateAsync(id);
      toast.success('Inspection deleted successfully');
      setConfirmDelete(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete inspection');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600">{t('production.qualityControl.loadingOrganization', 'Loading...')}</span>
      </div>
    );
  }

  const emptyMessage = tableState.search
    ? t('production.qualityControl.list.empty.searchTitle', 'No results found')
    : t('production.qualityControl.list.empty.title', 'No inspections yet');

  const renderActions = (inspectionId: string, canDelete: boolean) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => toast.info(t('production.qualityControl.list.actions.viewDetails', 'View details coming soon'))}>
          <Eye className="w-4 h-4 mr-2" />
          {t('production.qualityControl.list.actions.viewDetails', 'View Details')}
        </DropdownMenuItem>
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setConfirmDelete(inspectionId)}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('production.qualityControl.list.actions.delete', 'Delete')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <ListPageLayout
      header={
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {t('production.qualityControl.list.title', 'Quality Inspections')}
          </h2>
          <p className="text-gray-600">
            {totalItems > 0
              ? t('production.qualityControl.list.subtitle', { count: totalItems })
              : t('production.qualityControl.list.subtitleEmpty', 'No inspections yet')}
          </p>
        </div>
      }
      filters={
        <FilterBar
          searchValue={tableState.search}
          onSearchChange={tableState.setSearch}
          searchPlaceholder={t('production.qualityControl.list.search', 'Search inspections...')}
          isSearching={isFetching}
          filters={[
            {
              key: 'type',
              value: filterType,
              onChange: (v) => setFilterType(v as InspectionType | 'all'),
              options: [
                { value: 'all', label: t('production.qualityControl.list.filters.allTypes', 'All Types') },
                { value: 'pre_harvest', label: t('production.qualityControl.list.filters.type.preHarvest', 'Pre-Harvest') },
                { value: 'post_harvest', label: t('production.qualityControl.list.filters.type.postHarvest', 'Post-Harvest') },
                { value: 'storage', label: t('production.qualityControl.list.filters.type.storage', 'Storage') },
                { value: 'transport', label: t('production.qualityControl.list.filters.type.transport', 'Transport') },
                { value: 'processing', label: t('production.qualityControl.list.filters.type.processing', 'Processing') },
              ],
            },
            {
              key: 'status',
              value: filterStatus,
              onChange: (v) => setFilterStatus(v as InspectionStatus | 'all'),
              options: [
                { value: 'all', label: t('production.qualityControl.list.filters.allStatuses', 'All Statuses') },
                { value: 'scheduled', label: t('production.qualityControl.list.filters.status.scheduled', 'Scheduled') },
                { value: 'in_progress', label: t('production.qualityControl.list.filters.status.inProgress', 'In Progress') },
                { value: 'completed', label: t('production.qualityControl.list.filters.status.completed', 'Completed') },
                { value: 'failed', label: t('production.qualityControl.list.filters.status.failed', 'Failed') },
                { value: 'cancelled', label: t('production.qualityControl.list.filters.status.cancelled', 'Cancelled') },
              ],
            },
          ]}
        />
      }
      stats={
        stats && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('production.qualityControl.list.stats.total', 'Total Inspections')}
                </CardTitle>
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('production.qualityControl.list.stats.avgScore', 'Average Score')}
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
                  {stats.averageScore}/100
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('production.qualityControl.list.stats.completed', 'Completed')}
                </CardTitle>
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byStatus?.completed || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('production.qualityControl.list.stats.inProgress', 'In Progress')}
                </CardTitle>
                <Clock className="w-4 h-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byStatus?.in_progress || 0}</div>
              </CardContent>
            </Card>
          </div>
        )
      }
      pagination={
        totalItems > 0 ? (
          <DataTablePagination
            page={tableState.page}
            pageSize={tableState.pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={tableState.setPage}
            onPageSizeChange={tableState.setPageSize}
          />
        ) : undefined
      }
    >
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('production.qualityControl.list.table.type', 'Type')}</TableHead>
                <TableHead>{t('production.qualityControl.list.table.date', 'Date')}</TableHead>
                <TableHead>{t('production.qualityControl.list.table.parcel', 'Parcel / Farm')}</TableHead>
                <TableHead>{t('production.qualityControl.list.table.score', 'Score')}</TableHead>
                <TableHead>{t('production.qualityControl.list.table.status', 'Status')}</TableHead>
                <TableHead className="text-right">{t('production.qualityControl.list.table.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>{emptyMessage}</p>
                    <p className="text-sm mt-1">
                      {tableState.search
                        ? t('production.qualityControl.list.empty.searchDescription', 'Try adjusting your search')
                        : t('production.qualityControl.list.empty.description', 'Quality inspections will appear here once created')}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                inspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell>
                      <Badge className={TYPE_COLORS[inspection.type]}>
                        {getTypeLabel(inspection.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(inspection.inspection_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inspection.parcel?.name || '—'}</p>
                        {inspection.parcel?.farm && (
                          <p className="text-xs text-gray-500">{inspection.parcel.farm.name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {inspection.overall_score != null ? (
                        <span className={`text-lg font-semibold ${getScoreColor(inspection.overall_score)}`}>
                          {inspection.overall_score}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[inspection.status]}>
                        {getStatusLabel(inspection.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {renderActions(inspection.id, inspection.status !== 'in_progress')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden space-y-3 p-3">
          {inspections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p>{emptyMessage}</p>
            </div>
          ) : (
            inspections.map((inspection) => (
              <div key={inspection.id} className="border rounded-lg p-3 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={TYPE_COLORS[inspection.type]}>
                        {getTypeLabel(inspection.type)}
                      </Badge>
                      <Badge className={STATUS_COLORS[inspection.status]}>
                        {getStatusLabel(inspection.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(inspection.inspection_date).toLocaleDateString()}
                      {inspection.parcel?.name && ` — ${inspection.parcel.name}`}
                    </p>
                  </div>
                  {renderActions(inspection.id, inspection.status !== 'in_progress')}
                </div>

                <div className="flex items-center gap-3 text-sm mt-2">
                  {inspection.overall_score != null && (
                    <Badge className="bg-gray-100 text-gray-800">
                      <span className={getScoreColor(inspection.overall_score)}>{inspection.overall_score}/100</span>
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {confirmDelete && (
        <AlertDialog
          open={!!confirmDelete}
          onOpenChange={() => setConfirmDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('production.qualityControl.list.confirm.deleteTitle', 'Delete Inspection')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('production.qualityControl.list.confirm.deleteDescription', 'This action cannot be undone. Are you sure you want to delete this quality inspection?')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('production.qualityControl.list.confirm.cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(confirmDelete)}
                className="bg-red-600 hover:bg-red-700"
              >
                {t('production.qualityControl.list.confirm.deleteAction', 'Delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </ListPageLayout>
  );
}
