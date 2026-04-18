import { useState } from "react";
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';

import { Building2, CreditCard, Plus, CheckCircle2, Clock, XCircle, Eye, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { usePaginatedPayments, usePaymentStats, type Payment } from '@/hooks/useAccountingPayments';
import { PaymentForm } from '@/components/Accounting/PaymentForm';
import { PaymentDetailDialog } from '@/components/Accounting/PaymentDetailDialog';
import { PaymentAllocationDialog } from '@/components/Accounting/PaymentAllocationDialog';
import { useServerTableState, SortableHeader, DataTablePagination, FilterBar, ListPageLayout, ListPageHeader } from '@/components/ui/data-table';
import { PageLoader } from '@/components/ui/loader';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

type PaymentStatus = 'draft' | 'submitted' | 'reconciled' | 'cancelled';

const AppContent = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);

  const [filterType, setFilterType] = useState<'all' | 'receive' | 'pay'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const currencySymbol = currentOrganization?.currency_symbol || currentOrganization?.currency || 'MAD';

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'payment_date', direction: 'desc' },
  });

  const { data: paginatedData, isLoading, isFetching, error } = usePaginatedPayments({
    ...tableState.queryParams,
    payment_type: filterType !== 'all' ? filterType : undefined,
    status: filterStatus !== 'all' ? (filterStatus as PaymentStatus) : undefined,
  });
  const stats = usePaymentStats();

  const payments = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'reconciled':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string | null) => {
    return type === 'receive'
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'submitted':
      case 'reconciled':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'draft':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatAmount = (amount: number) =>
    `${currencySymbol} ${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const countAllocations = (p: Payment) => {
    const alloc = (p as unknown as { allocations?: unknown[] }).allocations;
    return Array.isArray(alloc) ? alloc.length : 0;
  };

  const openAllocate = (p: Payment) => {
    setSelectedPayment(p);
    setAllocateDialogOpen(true);
  };

  const openDetail = (p: Payment) => {
    setSelectedPayment(p);
    setDetailDialogOpen(true);
  };

  if (!currentOrganization || isLoading) {
    return (
      <PageLoader />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">
            {t('payments.errors.loadFailed', 'Failed to load payments')}
          </p>
          <p className="text-sm text-gray-500 mt-2">{error instanceof Error ? error.message : t('app.unknownError', 'Unknown error')}</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      activeModule="accounting"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: CreditCard, label: t('payments.title', 'Payments'), isActive: true }
          ]}
          title={t('payments.title', 'Payments')}
          subtitle={t('payments.subtitle', 'Track and manage incoming and outgoing payments')}
        />
      }
    >
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <ListPageLayout
          header={
            <ListPageHeader
              variant="shell"
              actions={
                <Button onClick={() => setCreateDialogOpen(true)} className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('payments.actions.recordNew', 'Record Payment')}</span>
                  <span className="sm:hidden">{t('common.new', 'New')}</span>
                </Button>
              }
            />
          }
          filters={
            <FilterBar
              searchValue={tableState.search}
              onSearchChange={(value) => tableState.setSearch(value)}
              searchPlaceholder={t('payments.search.placeholder', 'Search by payment number or party...')}
              isSearching={isFetching}
              filters={[
                {
                  key: 'type',
                  value: filterType,
                  onChange: (v) => setFilterType(v as 'all' | 'receive' | 'pay'),
                  options: [
                    { value: 'all', label: t('payments.filter.allTypes', 'All Types') },
                    { value: 'receive', label: t('payments.filter.received', 'Received') },
                    { value: 'pay', label: t('payments.filter.paid', 'Paid Out') },
                  ],
                },
                {
                  key: 'status',
                  value: filterStatus,
                  onChange: setFilterStatus,
                  options: [
                    { value: 'all', label: t('payments.filter.allStatus', 'All Status') },
                    { value: 'draft', label: t('payments.status.draft', 'Draft') },
                    { value: 'submitted', label: t('payments.status.submitted', 'Submitted') },
                    { value: 'reconciled', label: t('payments.status.reconciled', 'Reconciled') },
                    { value: 'cancelled', label: t('payments.status.cancelled', 'Cancelled') },
                  ],
                },
              ]}
              datePreset={tableState.datePreset}
              onDatePresetChange={(preset) => tableState.setDatePreset(preset as Parameters<typeof tableState.setDatePreset>[0])}
            />
          }
          stats={
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('payments.stats.total', 'Total Payments')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('payments.stats.received', 'Received')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-green-600 truncate">
                    {formatAmount(stats.totalReceived)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('payments.stats.paidOut', 'Paid Out')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-red-600 truncate">
                    {formatAmount(stats.totalPaid)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('payments.stats.draft', 'Draft')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.draft}</div>
                </CardContent>
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
          <>
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle>{t('payments.list.title', 'All Payments')}</CardTitle>
                <CardDescription>
                  {t('payments.list.subtitle', 'View, allocate, and manage your payment transactions')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="border-b border-gray-200 dark:border-gray-700">
                        <SortableHeader
                          label={t('payments.columns.number', 'Payment #')}
                          sortKey="payment_number"
                          currentSort={tableState.sortConfig}
                          onSort={(key) => tableState.handleSort(String(key))}
                        />
                        <SortableHeader
                          label={t('payments.columns.type', 'Type')}
                          sortKey="payment_type"
                          currentSort={tableState.sortConfig}
                          onSort={(key) => tableState.handleSort(String(key))}
                        />
                        <SortableHeader
                          label={t('payments.columns.party', 'Party')}
                          sortKey="party_name"
                          currentSort={tableState.sortConfig}
                          onSort={(key) => tableState.handleSort(String(key))}
                        />
                        <SortableHeader
                          label={t('payments.columns.date', 'Date')}
                          sortKey="payment_date"
                          currentSort={tableState.sortConfig}
                          onSort={(key) => tableState.handleSort(String(key))}
                        />
                        <SortableHeader
                          label={t('payments.columns.method', 'Method')}
                          sortKey="payment_method"
                          currentSort={tableState.sortConfig}
                          onSort={(key) => tableState.handleSort(String(key))}
                        />
                        <SortableHeader
                          label={t('payments.columns.amount', 'Amount')}
                          sortKey="amount"
                          currentSort={tableState.sortConfig}
                          onSort={(key) => tableState.handleSort(String(key))}
                          align="right"
                        />
                        <SortableHeader
                          label={t('payments.columns.status', 'Status')}
                          sortKey="status"
                          currentSort={tableState.sortConfig}
                          onSort={(key) => tableState.handleSort(String(key))}
                        />
                        <TableHead className="py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                          {t('payments.columns.allocation', 'Allocation')}
                        </TableHead>
                        <TableHead className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                          {t('common.actions', 'Actions')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => {
                        const allocCount = countAllocations(payment);
                        const isDraft = (payment.status ?? 'draft') === 'draft';
                        return (
                          <TableRow key={payment.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <TableCell className="py-3 px-4">
                              <button
                                onClick={() => openDetail(payment)}
                                className="flex items-center gap-2 hover:underline text-left"
                              >
                                <CreditCard className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {payment.payment_number}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className={`text-sm font-medium capitalize ${getTypeColor(payment.payment_type)}`}>
                                {payment.payment_type === 'receive'
                                  ? t('payments.type.receive', 'Receive')
                                  : t('payments.type.pay', 'Pay')}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                              {payment.party_name}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 capitalize">
                              {payment.payment_method?.replace('_', ' ')}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-sm text-right font-medium">
                              <span className={getTypeColor(payment.payment_type)}>
                                {payment.payment_type === 'receive' ? '+' : '-'} {formatAmount(Number(payment.amount))}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                                {getStatusIcon(payment.status)}
                                {payment.status ?? '-'}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-sm">
                              {allocCount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                                  <Link2 className="h-3.5 w-3.5" />
                                  {t('payments.allocation.linked', {
                                    count: allocCount,
                                    defaultValue: `${allocCount} invoice${allocCount === 1 ? '' : 's'}`,
                                  })}
                                </span>
                              ) : isDraft ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {t('payments.allocation.pending', 'Unallocated')}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isDraft && allocCount === 0 && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => openAllocate(payment)}
                                  >
                                    <Link2 className="h-4 w-4 mr-1" />
                                    {t('payments.actions.allocate', 'Allocate')}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDetail(payment)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t('common.view', 'View')}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {payments.length === 0 && !isLoading && (
                        <TableRow>
                          <TableCell colSpan={9} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            {tableState.search || tableState.datePreset !== 'all' || filterType !== 'all' || filterStatus !== 'all'
                              ? t('payments.empty.filtered', 'No payments match your filters.')
                              : t('payments.empty.initial', 'No payments found. Record your first payment to get started.')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="md:hidden space-y-3">
              {payments.length === 0 && !isLoading ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {tableState.search || tableState.datePreset !== 'all' || filterType !== 'all' || filterStatus !== 'all'
                        ? t('payments.empty.filtered', 'No payments match your filters.')
                        : t('payments.empty.initial', 'No payments found. Record your first payment to get started.')}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                payments.map((payment) => {
                  const allocCount = countAllocations(payment);
                  const isDraft = (payment.status ?? 'draft') === 'draft';
                  return (
                    <Card key={payment.id} className="overflow-hidden">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <CreditCard className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 dark:text-white truncate">
                                {payment.payment_number}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {payment.party_name}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(payment.status)}`}>
                            {getStatusIcon(payment.status)}
                            {payment.status ?? '-'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{t('payments.columns.type', 'Type')}</p>
                            <p className={`font-medium capitalize ${getTypeColor(payment.payment_type)}`}>
                              {payment.payment_type === 'receive'
                                ? t('payments.type.receive', 'Receive')
                                : t('payments.type.pay', 'Pay')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{t('payments.columns.date', 'Date')}</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{t('payments.columns.method', 'Method')}</p>
                            <p className="font-medium text-gray-900 dark:text-white capitalize">
                              {payment.payment_method?.replace('_', ' ')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{t('payments.columns.amount', 'Amount')}</p>
                            <p className={`text-lg font-bold ${getTypeColor(payment.payment_type)}`}>
                              {payment.payment_type === 'receive' ? '+' : '-'} {formatAmount(Number(payment.amount))}
                            </p>
                          </div>
                        </div>

                        {(allocCount > 0 || isDraft) && (
                          <div className="text-xs">
                            {allocCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 font-medium">
                                <Link2 className="h-3.5 w-3.5" />
                                {t('payments.allocation.linked', {
                                  count: allocCount,
                                  defaultValue: `Linked to ${allocCount} invoice${allocCount === 1 ? '' : 's'}`,
                                })}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                {t('payments.allocation.pending', 'Unallocated — allocate to create journal entry')}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                          {isDraft && allocCount === 0 && (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => openAllocate(payment)}
                            >
                              <Link2 className="h-4 w-4 mr-1" />
                              {t('payments.actions.allocate', 'Allocate')}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => openDetail(payment)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t('common.view', 'View')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
              {payments.length > 0 && (
                <DataTablePagination
                  page={tableState.page}
                  totalPages={totalPages}
                  pageSize={tableState.pageSize}
                  totalItems={totalItems}
                  onPageChange={tableState.setPage}
                  onPageSizeChange={tableState.setPageSize}
                />
              )}
            </div>
          </>
        </ListPageLayout>
      </div>

      {/* Create Payment Dialog */}
      <ResponsiveDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title={t('payments.dialogs.create.title', 'Record New Payment')}
        description={t('payments.dialogs.create.description', 'Record a payment received from a customer or made to a supplier')}
        size="2xl"
        contentClassName="max-h-[90vh] overflow-y-auto"
      >
          <PaymentForm
            onSuccess={() => setCreateDialogOpen(false)}
            onCancel={() => setCreateDialogOpen(false)}
          />
      </ResponsiveDialog>

      {/* Payment Detail Dialog */}
      <PaymentDetailDialog
        payment={selectedPayment}
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) setSelectedPayment(null);
        }}
      />

      {/* Payment Allocation Dialog — quick-allocate from the list */}
      {selectedPayment && (
        <PaymentAllocationDialog
          payment={selectedPayment}
          open={allocateDialogOpen}
          onOpenChange={(open) => {
            setAllocateDialogOpen(open);
            if (!open) setSelectedPayment(null);
          }}
          onAllocated={() => {
            setAllocateDialogOpen(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/payments')({
  component: withRouteProtection(AppContent, 'read', 'Payment'),
});
