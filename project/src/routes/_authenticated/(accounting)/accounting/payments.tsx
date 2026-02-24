import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import { MobileNavBar } from '@/components/MobileNavBar';
import { Building2, CreditCard, Plus, CheckCircle2, Clock, XCircle, Eye, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { usePaginatedPayments, usePaymentStats, type Payment } from '@/hooks/useAccountingPayments';
import { PaymentForm } from '@/components/Accounting/PaymentForm';
import { PaymentDetailDialog } from '@/components/Accounting/PaymentDetailDialog';
import { useServerTableState, SortableHeader, DateRangeFilter, DataTablePagination } from '@/components/ui/data-table';

const AppContent: React.FC = () => {
  const { currentOrganization } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'payment_date', direction: 'desc' },
  });

  const { data: paginatedData, isLoading, isFetching, error } = usePaginatedPayments(tableState.queryParams);
  const stats = usePaymentStats();

  const payments = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'received'
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'draft':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (!currentOrganization || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {!currentOrganization ? 'Chargement de l\'organisation...' : 'Chargement des paiements...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">Erreur lors du chargement des paiements</p>
          <p className="text-sm text-gray-500 mt-2">{error instanceof Error ? error.message : 'Erreur inconnue'}</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      activeModule="accounting"
      header={
        <>
          {/* Mobile Navigation Bar */}
          <MobileNavBar title="Payments" />

          {/* Desktop Header */}
          <div className="hidden md:block">
            <ModernPageHeader
              breadcrumbs={[
                { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
                { icon: CreditCard, label: 'Payments', isActive: true }
              ]}
              title="Payments"
              subtitle="Track and manage incoming and outgoing payments"
            />
          </div>
        </>
      }
    >
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 space-y-4 sm:space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">All Payments</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                Track and manage your payment transactions
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button onClick={() => setCreateDialogOpen(true)} className="flex-1 sm:flex-none">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Record Payment</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by payment number or party..."
                value={tableState.search}
                onChange={(e) => tableState.setSearch(e.target.value)}
                className="pl-10"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
            <DateRangeFilter
              value={tableState.datePreset}
              onChange={tableState.setDatePreset}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                MAD {stats.totalReceived.toLocaleString('fr-FR')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Paid Out
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                MAD {stats.totalPaid.toLocaleString('fr-FR')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Draft
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle>All Payments</CardTitle>
            <CardDescription>
              View and manage your payment transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <SortableHeader
                      label="Payment #"
                      sortKey="payment_number"
                      currentSort={tableState.sortConfig}
                      onSort={tableState.handleSort}
                    />
                    <SortableHeader
                      label="Type"
                      sortKey="payment_type"
                      currentSort={tableState.sortConfig}
                      onSort={tableState.handleSort}
                    />
                    <SortableHeader
                      label="Party"
                      sortKey="party_name"
                      currentSort={tableState.sortConfig}
                      onSort={tableState.handleSort}
                    />
                    <SortableHeader
                      label="Date"
                      sortKey="payment_date"
                      currentSort={tableState.sortConfig}
                      onSort={tableState.handleSort}
                    />
                    <SortableHeader
                      label="Method"
                      sortKey="payment_method"
                      currentSort={tableState.sortConfig}
                      onSort={tableState.handleSort}
                    />
                    <SortableHeader
                      label="Amount"
                      sortKey="amount"
                      currentSort={tableState.sortConfig}
                      onSort={tableState.handleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Status"
                      sortKey="status"
                      currentSort={tableState.sortConfig}
                      onSort={tableState.handleSort}
                    />
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {payment.payment_number}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium capitalize ${getTypeColor(payment.payment_type)}`}>
                          {payment.payment_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        {payment.party_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {payment.payment_method}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        <span className={getTypeColor(payment.payment_type)}>
                          {payment.payment_type === 'received' ? '+' : '-'} MAD {Number(payment.amount).toLocaleString('fr-FR')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        {tableState.search || tableState.datePreset !== 'all'
                          ? 'No payments match your filters.'
                          : 'No payments found. Create your first payment to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <DataTablePagination
              page={tableState.page}
              totalPages={totalPages}
              pageSize={tableState.pageSize}
              totalItems={totalItems}
              onPageChange={tableState.setPage}
              onPageSizeChange={tableState.setPageSize}
            />
          </CardContent>
        </Card>

        <div className="md:hidden space-y-3">
          {payments.length === 0 && !isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {tableState.search || tableState.datePreset !== 'all'
                    ? 'No payments match your filters.'
                    : 'No payments found. Create your first payment to get started.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            payments.map((payment) => (
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
                      {payment.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Type</p>
                      <p className={`font-medium capitalize ${getTypeColor(payment.payment_type)}`}>
                        {payment.payment_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Method</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {payment.payment_method}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Amount</p>
                      <p className={`text-lg font-bold ${getTypeColor(payment.payment_type)}`}>
                        {payment.payment_type === 'received' ? '+' : '-'} MAD {Number(payment.amount).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setDetailDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
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
      </div>

      {/* Create Payment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
            <DialogDescription>
              Record a payment received from a customer or a payment made to a supplier
            </DialogDescription>
          </DialogHeader>
          <PaymentForm
            onSuccess={() => setCreateDialogOpen(false)}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Payment Detail Dialog */}
      <PaymentDetailDialog
        payment={selectedPayment}
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) {
            setSelectedPayment(null);
          }
        }}
      />
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/payments')({
  component: withRouteProtection(AppContent, 'read', 'Payment'),
});
