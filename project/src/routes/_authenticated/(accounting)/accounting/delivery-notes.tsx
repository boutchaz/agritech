import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle2, Clock, Eye, MoreVertical, Trash2, Truck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import {
  usePaginatedDeliveryNotes,
  useSubmitDeliveryNote,
  useCancelDeliveryNote,
  useDeleteDeliveryNote,
  type DeliveryNote,
} from '@/hooks/useDeliveryNotes';
import { DeliveryNoteDetailDialog } from '@/components/Billing/DeliveryNoteDetailDialog';
import { toast } from 'sonner';
import {
  useServerTableState,
  SortableHeader,
  DataTablePagination,
  FilterBar,
  ListPageLayout,
  ListPageHeader,
  type DatePreset as FilterDatePreset,
} from '@/components/ui/data-table';
import { PageLoader, SectionLoader } from '@/components/ui/loader';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'submitted':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'draft':
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'submitted':
      return <CheckCircle2 className="h-3 w-3" />;
    case 'cancelled':
      return <XCircle className="h-3 w-3" />;
    case 'draft':
    default:
      return <Clock className="h-3 w-3" />;
  }
};

const AppContent = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [selectedDeliveryNote, setSelectedDeliveryNote] = useState<DeliveryNote | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const submitMutation = useSubmitDeliveryNote();
  const cancelMutation = useCancelDeliveryNote();
  const deleteMutation = useDeleteDeliveryNote();

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'delivery_date', direction: 'desc' },
  });

  const { data: paginatedData, isLoading, isFetching, error } = usePaginatedDeliveryNotes(tableState.queryParams);

  const deliveryNotes = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const stats = {
    total: totalItems,
    draft: deliveryNotes.filter((note) => note.status === 'draft').length,
    submitted: deliveryNotes.filter((note) => note.status === 'submitted').length,
    cancelled: deliveryNotes.filter((note) => note.status === 'cancelled').length,
    totalQty: deliveryNotes.reduce((sum, note) => sum + Number(note.total_qty), 0),
  };

  const handleSubmit = (deliveryNote: DeliveryNote) => {
    submitMutation.mutate(deliveryNote.id, {
      onSuccess: () => {
        toast.success(t('billingModule.deliveryNotes.submitted', 'Delivery note submitted successfully'));
        setDetailDialogOpen(false);
        setSelectedDeliveryNote(null);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : t('billingModule.deliveryNotes.submitFailed', 'Failed to submit delivery note'));
      },
    });
  };

  const handleCancel = (deliveryNote: DeliveryNote) => {
    cancelMutation.mutate(deliveryNote.id, {
      onSuccess: () => {
        toast.success(t('billingModule.deliveryNotes.cancelled', 'Delivery note cancelled successfully'));
        setDetailDialogOpen(false);
        setSelectedDeliveryNote(null);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : t('billingModule.deliveryNotes.cancelFailed', 'Failed to cancel delivery note'));
      },
    });
  };

  const handleDelete = (deliveryNote: DeliveryNote) => {
    deleteMutation.mutate(deliveryNote.id, {
      onSuccess: () => {
        toast.success(t('billingModule.deliveryNotes.deleted', 'Delivery note deleted successfully'));
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : t('billingModule.deliveryNotes.deleteFailed', 'Failed to delete delivery note'));
      },
    });
  };

  if (!currentOrganization) {
    return <PageLoader />;
  }

  if (isLoading) {
    return <SectionLoader />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-red-600 dark:text-red-400">{t('billingModule.deliveryNotes.error.loading', 'Error loading delivery notes')}</p>
          <p className="mt-2 text-sm text-gray-500">{error instanceof Error ? error.message : t('billingModule.deliveryNotes.error.unknown', 'Unknown error')}</p>
        </div>
      </div>
    );
  }

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString('fr-FR') : '-';

  return (
    <>
      <div className="p-3 pb-20 sm:p-4 md:p-6 md:pb-6">
        <ListPageLayout
          header={
            <ListPageHeader
              variant="shell"
              title={t('billingModule.deliveryNotes.title', 'Delivery Notes')}
              description={t('billingModule.deliveryNotes.description', 'Track goods delivered to customers')}
            />
          }
          filters={
            <FilterBar
              searchValue={tableState.search}
              onSearchChange={(value) => tableState.setSearch(value)}
              searchPlaceholder={t('billingModule.deliveryNotes.search', 'Search by note number or customer...')}
              isSearching={isFetching}
              datePreset={tableState.datePreset as FilterDatePreset}
              onDatePresetChange={(preset) => {
                if (preset !== 'custom') {
                  tableState.setDatePreset(preset);
                }
              }}
            />
          }
          stats={
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.deliveryNotes.stats.total', 'Total Notes')}
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.deliveryNotes.stats.draft', 'Draft')}
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.draft}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.deliveryNotes.stats.submitted', 'Submitted')}
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-green-600">{stats.submitted}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.deliveryNotes.stats.cancelled', 'Cancelled')}
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-red-600">{stats.cancelled}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.deliveryNotes.stats.totalQty', 'Total Qty')}
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-xl font-bold">{stats.totalQty}</div></CardContent>
              </Card>
            </div>
          }
          pagination={
            <DataTablePagination
              page={tableState.page}
              totalPages={totalPages}
              pageSize={tableState.pageSize}
              totalItems={totalItems}
              onPageChange={tableState.setPage}
              onPageSizeChange={tableState.setPageSize}
            />
          }
        >
          <Card>
            <CardHeader className="px-4 py-4 sm:px-6 sm:py-5">
              <CardTitle className="text-lg sm:text-xl">{t('billingModule.deliveryNotes.allNotes', 'All Delivery Notes')}</CardTitle>
              <CardDescription className="text-sm">
                {t('billingModule.deliveryNotes.viewAndManage', 'View and manage your delivery notes')}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
              <div className="hidden overflow-x-auto md:block">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700">
                      <SortableHeader label={t('billingModule.deliveryNotes.table.deliveryNoteNumber', 'DN #')} sortKey="delivery_note_number" currentSort={tableState.sortConfig} onSort={(key) => tableState.handleSort(String(key))} />
                      <SortableHeader label={t('billingModule.deliveryNotes.table.customer', 'Customer')} sortKey="customer_name" currentSort={tableState.sortConfig} onSort={(key) => tableState.handleSort(String(key))} />
                      <SortableHeader label={t('billingModule.deliveryNotes.table.deliveryDate', 'Delivery Date')} sortKey="delivery_date" currentSort={tableState.sortConfig} onSort={(key) => tableState.handleSort(String(key))} />
                      <SortableHeader label={t('billingModule.deliveryNotes.table.salesOrderNumber', 'SO #')} sortKey="sales_order_id" currentSort={tableState.sortConfig} onSort={(key) => tableState.handleSort(String(key))} />
                      <SortableHeader label={t('billingModule.deliveryNotes.table.qty', 'Qty')} sortKey="total_qty" currentSort={tableState.sortConfig} onSort={(key) => tableState.handleSort(String(key))} align="right" />
                      <SortableHeader label={t('billingModule.deliveryNotes.table.status', 'Status')} sortKey="status" currentSort={tableState.sortConfig} onSort={(key) => tableState.handleSort(String(key))} />
                      <TableHead className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('billingModule.deliveryNotes.table.actions', 'Actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryNotes.map((deliveryNote) => (
                      <TableRow key={deliveryNote.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">{deliveryNote.delivery_note_number}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-900 dark:text-white">{deliveryNote.customer_name || '-'}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(deliveryNote.delivery_date)}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{deliveryNote.sales_order?.order_number || '-'}</TableCell>
                        <TableCell className="px-4 py-3 text-right text-sm font-medium">{Number(deliveryNote.total_qty)}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge className={`${getStatusColor(deliveryNote.status)} flex w-fit items-center gap-1`}>
                            {getStatusIcon(deliveryNote.status)}
                            {deliveryNote.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedDeliveryNote(deliveryNote); setDetailDialogOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>{t('billingModule.deliveryNotes.actions.label', 'Actions')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {deliveryNote.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => handleSubmit(deliveryNote)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {t('billingModule.deliveryNotes.actions.submit', 'Submit')}
                                  </DropdownMenuItem>
                                )}
                                {deliveryNote.status === 'submitted' && (
                                  <DropdownMenuItem onClick={() => handleCancel(deliveryNote)}>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    {t('billingModule.deliveryNotes.actions.cancel', 'Cancel')}
                                  </DropdownMenuItem>
                                )}
                                {deliveryNote.status === 'draft' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDelete(deliveryNote)} className="text-red-600 dark:text-red-400">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      {t('billingModule.deliveryNotes.actions.delete', 'Delete')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {deliveryNotes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          {tableState.search || tableState.datePreset !== 'all'
                            ? t('billingModule.deliveryNotes.empty.filtered', 'No delivery notes match your filters.')
                            : t('billingModule.deliveryNotes.empty', 'No delivery notes found. Delivery notes are created from sales orders.')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {deliveryNotes.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    {tableState.search || tableState.datePreset !== 'all'
                      ? t('billingModule.deliveryNotes.empty.filtered', 'No delivery notes match your filters.')
                      : t('billingModule.deliveryNotes.empty', 'No delivery notes found.')}
                  </div>
                ) : (
                  deliveryNotes.map((deliveryNote) => (
                    <div key={deliveryNote.id} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Truck className="h-5 w-5 flex-shrink-0 text-gray-400" />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-gray-900 dark:text-white">{deliveryNote.delivery_note_number}</p>
                              <p className="truncate text-sm text-gray-600 dark:text-gray-400">{deliveryNote.customer_name || '-'}</p>
                            </div>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(deliveryNote.status)} flex flex-shrink-0 items-center gap-1 text-xs`}>
                          {getStatusIcon(deliveryNote.status)}
                          {deliveryNote.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('billingModule.deliveryNotes.table.deliveryDate', 'Date')}</p>
                          <p className="font-medium text-gray-900 dark:text-white">{formatDate(deliveryNote.delivery_date)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('billingModule.deliveryNotes.table.salesOrderNumber', 'SO #')}</p>
                          <p className="font-medium text-gray-900 dark:text-white">{deliveryNote.sales_order?.order_number || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('billingModule.deliveryNotes.table.qty', 'Qty')}</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{Number(deliveryNote.total_qty)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-700">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedDeliveryNote(deliveryNote); setDetailDialogOpen(true); }} className="flex-1">
                          <Eye className="mr-1 h-4 w-4" />
                          {t('app.view', 'View')}
                        </Button>
                        {deliveryNote.status === 'draft' && (
                          <Button variant="outline" size="sm" onClick={() => handleSubmit(deliveryNote)} className="flex-1" disabled={submitMutation.isPending}>
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            {t('billingModule.deliveryNotes.actions.submit', 'Submit')}
                          </Button>
                        )}
                        {deliveryNote.status === 'submitted' && (
                          <Button variant="outline" size="sm" onClick={() => handleCancel(deliveryNote)} className="flex-1" disabled={cancelMutation.isPending}>
                            <XCircle className="mr-1 h-4 w-4" />
                            {t('billingModule.deliveryNotes.actions.cancel', 'Cancel')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </ListPageLayout>
      </div>

      <DeliveryNoteDetailDialog
        deliveryNote={selectedDeliveryNote}
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) setSelectedDeliveryNote(null);
        }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/delivery-notes')({
  component: withRouteProtection(AppContent, 'read', 'Invoice'),
});
