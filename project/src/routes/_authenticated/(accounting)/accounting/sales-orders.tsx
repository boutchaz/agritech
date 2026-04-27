import {  useState  } from "react";
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { ShoppingCart, Eye, CheckCircle2, Clock, XCircle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useSalesOrders, usePaginatedSalesOrders, type SalesOrder } from '@/hooks/useSalesOrders';
import { SalesOrderDetailDialog } from '@/components/Billing/SalesOrderDetailDialog';
import { useServerTableState, SortableHeader, DataTablePagination, FilterBar, ListPageLayout, type DatePreset as FilterDatePreset } from '@/components/ui/data-table';
import { PageLoader, SectionLoader } from '@/components/ui/loader';


const AppContent = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'order_date', direction: 'desc' },
  });

  const { data: paginatedData, isLoading, isFetching, error } = usePaginatedSalesOrders(tableState.queryParams);
  const { data: allOrdersForStats = [] } = useSalesOrders();

  const orders = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const getStatusColor = (status: SalesOrder['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'ready_to_ship':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'shipped':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'invoiced':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: SalesOrder['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'shipped':
      case 'delivered':
        return <Truck className="h-3 w-3" />;
      case 'cancelled':
        return <XCircle className="h-3 w-3" />;
      case 'draft':
      case 'in_progress':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const stats = {
    total: allOrdersForStats.length,
    draft: allOrdersForStats.filter(o => o.status === 'draft').length,
    confirmed: allOrdersForStats.filter(o => o.status === 'confirmed').length,
    inProgress: allOrdersForStats.filter(o => o.status === 'in_progress').length,
    shipped: allOrdersForStats.filter(o => o.status === 'shipped').length,
    completed: allOrdersForStats.filter(o => o.status === 'completed').length,
    totalValue: allOrdersForStats.reduce((sum, o) => sum + Number(o.grand_total), 0),
  };

  if (!currentOrganization) {
    return (
      <PageLoader />
    );
  }

  if (isLoading) {
    return (
        <SectionLoader />
    );
  }

  if (error) {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400">{t('billingModule.salesOrders.error.loading', 'Error loading sales orders')}</p>
            <p className="text-sm text-gray-500 mt-2">{error instanceof Error ? error.message : t('billingModule.salesOrders.error.unknown', 'Unknown error')}</p>
          </div>
        </div>
    );
  }

  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <ListPageLayout
          filters={
            <FilterBar
              searchValue={tableState.search}
              onSearchChange={(value) => tableState.setSearch(value)}
              searchPlaceholder={t('billingModule.salesOrders.search', 'Search by order number or customer...')}
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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4" data-tour="billing-stats">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.salesOrders.stats.totalOrders', 'Total Orders')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.salesOrders.stats.draft', 'Draft')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.draft}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.salesOrders.stats.confirmed', 'Confirmed')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.salesOrders.stats.inProgress', 'In Progress')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.salesOrders.stats.shipped', 'Shipped')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.shipped}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.salesOrders.stats.completed', 'Completed')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('billingModule.salesOrders.stats.totalValue', 'Total Value')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {currentOrganization.currency} {stats.totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  </div>
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
          <Card data-tour="billing-orders">
            <CardHeader>
              <CardTitle>{t('billingModule.salesOrders.allOrders', 'All Sales Orders')}</CardTitle>
              <CardDescription>
                {t('billingModule.salesOrders.viewAndManage', 'View and manage your sales orders')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700">
                      <SortableHeader
                        label={t('billingModule.salesOrders.table.orderNumber', 'Order #')}
                        sortKey="order_number"
                        currentSort={tableState.sortConfig}
                        onSort={(key) => tableState.handleSort(String(key))}
                      />
                      <SortableHeader
                        label={t('billingModule.salesOrders.table.customer', 'Customer')}
                        sortKey="customer_name"
                        currentSort={tableState.sortConfig}
                        onSort={(key) => tableState.handleSort(String(key))}
                      />
                      <SortableHeader
                        label={t('billingModule.salesOrders.table.orderDate', 'Order Date')}
                        sortKey="order_date"
                        currentSort={tableState.sortConfig}
                        onSort={(key) => tableState.handleSort(String(key))}
                      />
                      <SortableHeader
                        label={t('billingModule.salesOrders.table.expectedDate', 'Expected Date')}
                        sortKey="expected_delivery_date"
                        currentSort={tableState.sortConfig}
                        onSort={(key) => tableState.handleSort(String(key))}
                      />
                      <SortableHeader
                        label={t('billingModule.salesOrders.table.amount', 'Amount')}
                        sortKey="grand_total"
                        currentSort={tableState.sortConfig}
                        onSort={(key) => tableState.handleSort(String(key))}
                        align="right"
                      />
                      <SortableHeader
                        label={t('billingModule.salesOrders.table.invoiced', 'Invoiced')}
                        sortKey="invoiced_amount"
                        currentSort={tableState.sortConfig}
                        onSort={(key) => tableState.handleSort(String(key))}
                        align="right"
                      />
                      <SortableHeader
                        label={t('billingModule.salesOrders.table.status', 'Status')}
                        sortKey="status"
                        currentSort={tableState.sortConfig}
                        onSort={(key) => tableState.handleSort(String(key))}
                      />
                      <TableHead className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('billingModule.salesOrders.table.actions', 'Actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {order.order_number}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {order.customer_name}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(order.order_date).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {order.expected_delivery_date
                            ? new Date(order.expected_delivery_date).toLocaleDateString('fr-FR')
                            : '-'}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-right font-medium">
                          {order.currency_code} {Number(order.grand_total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-right">
                          {order.currency_code} {Number(order.invoiced_amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge className={`${getStatusColor(order.status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(order.status)}
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t('app.view', 'View')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          {tableState.search || tableState.datePreset !== 'all'
                            ? t('billingModule.salesOrders.empty.filtered', 'No sales orders match your filters.')
                            : t('billingModule.salesOrders.noData', 'No sales orders found. Orders are created from accepted quotes.')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </ListPageLayout>
      </div>

        {/* Sales Order Detail Dialog */}
        <SalesOrderDetailDialog
          salesOrder={selectedOrder}
          open={detailDialogOpen}
          onOpenChange={(open) => {
            setDetailDialogOpen(open);
            if (!open) {
              setSelectedOrder(null);
            }
          }}
        />
    </>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/sales-orders')({
  component: withRouteProtection(AppContent, 'read', 'Invoice'),
});
