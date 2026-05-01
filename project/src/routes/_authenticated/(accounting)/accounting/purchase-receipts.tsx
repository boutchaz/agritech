import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Package, Eye, CheckCircle2, Clock, XCircle, MoreVertical, Trash2 } from 'lucide-react';
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
  usePaginatedPurchaseReceipts,
  useSubmitPurchaseReceipt,
  useCancelPurchaseReceipt,
  useDeletePurchaseReceipt,
  type PurchaseReceipt,
} from '@/hooks/usePurchaseReceipts';
import { PurchaseReceiptDetailDialog } from '@/components/Billing/PurchaseReceiptDetailDialog';
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
  const [selectedReceipt, setSelectedReceipt] = useState<PurchaseReceipt | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const submitMutation = useSubmitPurchaseReceipt();
  const cancelMutation = useCancelPurchaseReceipt();
  const deleteMutation = useDeletePurchaseReceipt();

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'receipt_date', direction: 'desc' },
  });

  const { data: paginatedData, isLoading, isFetching, error } = usePaginatedPurchaseReceipts(tableState.queryParams);

  const receipts = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const stats = {
    total: receipts.length,
    draft: receipts.filter((r) => r.status === 'draft').length,
    submitted: receipts.filter((r) => r.status === 'submitted').length,
    cancelled: receipts.filter((r) => r.status === 'cancelled').length,
    totalValue: receipts.reduce((sum, r) => sum + Number(r.total_amount), 0),
  };

  const handleSubmit = (receipt: PurchaseReceipt) => {
    submitMutation.mutate(receipt.id, {
      onSuccess: () => {
        toast.success(t('billingModule.purchaseReceipts.submitted', 'Receipt submitted successfully'));
        setDetailDialogOpen(false);
        setSelectedReceipt(null);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : t('billingModule.purchaseReceipts.submitFailed', 'Failed to submit receipt'));
      },
    });
  };

  const handleCancel = (receipt: PurchaseReceipt) => {
    cancelMutation.mutate(receipt.id, {
      onSuccess: () => {
        toast.success(t('billingModule.purchaseReceipts.cancelled', 'Receipt cancelled successfully'));
        setDetailDialogOpen(false);
        setSelectedReceipt(null);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : t('billingModule.purchaseReceipts.cancelFailed', 'Failed to cancel receipt'));
      },
    });
  };

  const handleDelete = (receipt: PurchaseReceipt) => {
    deleteMutation.mutate(receipt.id, {
      onSuccess: () => {
        toast.success(t('billingModule.purchaseReceipts.deleted', 'Receipt deleted successfully'));
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : t('billingModule.purchaseReceipts.deleteFailed', 'Failed to delete receipt'));
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{t('billingModule.purchaseReceipts.error.loading', 'Error loading purchase receipts')}</p>
          <p className="text-sm text-gray-500 mt-2">{error instanceof Error ? error.message : t('billingModule.purchaseReceipts.error.unknown', 'Unknown error')}</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    `${currentOrganization.currency} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString('fr-FR') : '-';

  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <ListPageLayout
          header={
            <ListPageHeader
              variant="shell"
              title={t('billingModule.purchaseReceipts.title', 'Purchase Receipts')}
              description={t('billingModule.purchaseReceipts.description', 'Track goods received from suppliers')}
            />
          }
          filters={
            <FilterBar
              searchValue={tableState.search}
              onSearchChange={(value) => tableState.setSearch(value)}
              searchPlaceholder={t('billingModule.purchaseReceipts.search', 'Search by receipt number or supplier...')}
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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.purchaseReceipts.stats.total', 'Total Receipts')}
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.purchaseReceipts.stats.draft', 'Draft')}
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.draft}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.purchaseReceipts.stats.submitted', 'Submitted')}
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-green-600">{stats.submitted}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.purchaseReceipts.stats.cancelled', 'Cancelled')}
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-red-600">{stats.cancelled}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.purchaseReceipts.stats.totalValue', 'Total Value')}
                  </CardTitle>
                </CardHeader>
                <CardContent><div className="text-xl font-bold">{formatCurrency(stats.totalValue)}</div></CardContent>
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
              <CardTitle className="text-lg sm:text-xl">{t('billingModule.purchaseReceipts.allReceipts', 'All Purchase Receipts')}</CardTitle>
              <CardDescription className="text-sm">
                {t('billingModule.purchaseReceipts.viewAndManage', 'View and manage your purchase receipts')}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
              <div className="hidden md:block overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700">
                      <SortableHeader label={t('billingModule.purchaseReceipts.table.receiptNumber', 'Receipt #')} sortKey="receipt_number" currentSort={tableState.sortConfig} onSort={(key) => tableState.handleSort(String(key))} />
                      <SortableHeader label={t('billingModule.purchaseReceipts.table.supplier', 'Supplier')} sortKey="supplier_name" currentSort={tableState.sortConfig} onSort={(key) => tableState.handleSort(String(key))} />
                      <SortableHeader label={t('billingModule.purchaseReceipts.table.receiptDate', 'Receipt Date')} sortKey="receipt_date" currentSort={tableState.sortConfig} onSort={(key) => tableState.handleSort(String(key))} />
                      <SortableHeader label={t('billingModule.purchaseReceipts.table.poNumber', 'PO #')} sortKey="receipt_number" currentSort={tableState.sortConfig} onSort={(key) => tableState.handleSort(String(key))} />
                      <SortableHeader label={t('billingModule.purchaseReceipts.table.amount', 'Amount')} sortKey="total_amount" currentSort={tableState.sortConfig} onSort={(key) => tableState.handleSort(String(key))} align="right" />
                      <SortableHeader label={t('billingModule.purchaseReceipts.table.status', 'Status')} sortKey="status" currentSort={tableState.sortConfig} onSort={(key) => tableState.handleSort(String(key))} />
                      <TableHead className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('billingModule.purchaseReceipts.table.actions', 'Actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((receipt) => (
                      <TableRow key={receipt.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">{receipt.receipt_number}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-gray-900 dark:text-white">{receipt.supplier_name || '-'}</TableCell>
                        <TableCell className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(receipt.receipt_date)}</TableCell>
                        <TableCell className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{receipt.purchase_order?.order_number || '-'}</TableCell>
                        <TableCell className="py-3 px-4 text-sm text-right font-medium">{formatCurrency(Number(receipt.total_amount))}</TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge className={`${getStatusColor(receipt.status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(receipt.status)}
                            {receipt.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedReceipt(receipt); setDetailDialogOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>{t('billingModule.purchaseReceipts.actions.label', 'Actions')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {receipt.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => handleSubmit(receipt)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {t('billingModule.purchaseReceipts.actions.submit', 'Submit')}
                                  </DropdownMenuItem>
                                )}
                                {receipt.status === 'submitted' && (
                                  <DropdownMenuItem onClick={() => handleCancel(receipt)}>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    {t('billingModule.purchaseReceipts.actions.cancel', 'Cancel')}
                                  </DropdownMenuItem>
                                )}
                                {receipt.status === 'draft' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDelete(receipt)} className="text-red-600 dark:text-red-400">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      {t('billingModule.purchaseReceipts.actions.delete', 'Delete')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {receipts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          {tableState.search || tableState.datePreset !== 'all'
                            ? t('billingModule.purchaseReceipts.empty.filtered', 'No purchase receipts match your filters.')
                            : t('billingModule.purchaseReceipts.empty', 'No purchase receipts found. Receipts are created when receiving goods from purchase orders.')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {receipts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {tableState.search || tableState.datePreset !== 'all'
                      ? t('billingModule.purchaseReceipts.empty.filtered', 'No purchase receipts match your filters.')
                      : t('billingModule.purchaseReceipts.empty', 'No purchase receipts found.')}
                  </div>
                ) : (
                  receipts.map((receipt) => (
                    <div key={receipt.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Package className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">{receipt.receipt_number}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{receipt.supplier_name || '-'}</p>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(receipt.status)} flex items-center gap-1 text-xs flex-shrink-0`}>
                          {getStatusIcon(receipt.status)}
                          {receipt.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('billingModule.purchaseReceipts.table.receiptDate', 'Date')}</p>
                          <p className="font-medium text-gray-900 dark:text-white">{formatDate(receipt.receipt_date)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('billingModule.purchaseReceipts.table.poNumber', 'PO #')}</p>
                          <p className="font-medium text-gray-900 dark:text-white">{receipt.purchase_order?.order_number || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('billingModule.purchaseReceipts.table.amount', 'Amount')}</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(receipt.total_amount))}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedReceipt(receipt); setDetailDialogOpen(true); }} className="flex-1">
                          <Eye className="h-4 w-4 mr-1" />
                          {t('app.view', 'View')}
                        </Button>
                        {receipt.status === 'draft' && (
                          <Button variant="outline" size="sm" onClick={() => handleSubmit(receipt)} className="flex-1" disabled={submitMutation.isPending}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {t('billingModule.purchaseReceipts.actions.submit', 'Submit')}
                          </Button>
                        )}
                        {receipt.status === 'submitted' && (
                          <Button variant="outline" size="sm" onClick={() => handleCancel(receipt)} className="flex-1" disabled={cancelMutation.isPending}>
                            <XCircle className="h-4 w-4 mr-1" />
                            {t('billingModule.purchaseReceipts.actions.cancel', 'Cancel')}
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

      <PurchaseReceiptDetailDialog
        purchaseReceipt={selectedReceipt}
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) setSelectedReceipt(null);
        }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/purchase-receipts')({
  component: withRouteProtection(AppContent, 'read', 'Invoice'),
});
