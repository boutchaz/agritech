import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { PageLayout } from '../components/PageLayout';
import ModernPageHeader from '../components/ModernPageHeader';
import { MobileNavBar } from '../components/MobileNavBar';
import { Building2, Package, Plus, Eye, CheckCircle2, Clock, XCircle, Truck, Download, Send, MoreVertical, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
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
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import { usePurchaseOrders, usePaginatedPurchaseOrders, type PurchaseOrder, type PurchaseOrderWithItems } from '../hooks/usePurchaseOrders';
import { PurchaseOrderForm } from '../components/Billing/PurchaseOrderForm';
import { PurchaseOrderDetailDialog } from '../components/Billing/PurchaseOrderDetailDialog';
import { authSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useServerTableState, SortableHeader, DateRangeFilter, DataTablePagination } from '@/components/ui/data-table';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<PurchaseOrderWithItems | null>(null);

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'order_date', direction: 'desc' },
  });

  const { data: paginatedData, isLoading, isFetching, error } = usePaginatedPurchaseOrders(tableState.queryParams);
  const { data: allOrdersForStats = [] } = usePurchaseOrders();

  const orders = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const handleDownloadPDF = async (order: PurchaseOrder) => {
    try {
      const { data: { session } } = await authSupabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to download PDF');
        return;
      }

      // Call backend service
      const backendUrl = import.meta.env.VITE_BACKEND_SERVICE_URL || import.meta.env.VITE_SATELLITE_SERVICE_URL || 'http://localhost:8001';
      const response = await fetch(`${backendUrl}/api/billing/purchase-orders/${order.id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const contentType = response.headers.get('Content-Type');
        let errorMessage = 'Failed to generate PDF';

        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('Content-Type');

      if (contentType?.includes('text/html')) {
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');

        toast.info('PDF service not configured. Opening printable HTML version. Use browser\'s Print to PDF feature.');
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `purchase-order-${order.order_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in_transit':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'received':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'billed':
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

  const getStatusIcon = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'submitted':
      case 'approved':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'in_transit':
        return <Truck className="h-3 w-3" />;
      case 'received':
      case 'completed':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'cancelled':
        return <XCircle className="h-3 w-3" />;
      case 'draft':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const stats = {
    total: allOrdersForStats.length,
    draft: allOrdersForStats.filter(o => o.status === 'draft').length,
    submitted: allOrdersForStats.filter(o => o.status === 'submitted').length,
    approved: allOrdersForStats.filter(o => o.status === 'approved').length,
    inTransit: allOrdersForStats.filter(o => o.status === 'in_transit').length,
    received: allOrdersForStats.filter(o => o.status === 'received').length,
    completed: allOrdersForStats.filter(o => o.status === 'completed').length,
    totalValue: allOrdersForStats.reduce((sum, o) => sum + Number(o.grand_total), 0),
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('dashboard.loading', 'Loading organization...')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <PageLayout
        activeModule="accounting"
        header={
          <ModernPageHeader
            breadcrumbs={[
              { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
              { icon: Package, label: t('billingModule.purchaseOrders.title', 'Purchase Orders'), isActive: true }
            ]}
            title={t('billingModule.purchaseOrders.title', 'Purchase Orders')}
            subtitle={t('billingModule.purchaseOrders.loading', 'Manage supplier purchase orders')}
          />
        }
      >
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout activeModule="accounting">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400">{t('billingModule.purchaseOrders.error.loading', 'Error loading purchase orders')}</p>
            <p className="text-sm text-gray-500 mt-2">{error instanceof Error ? error.message : t('billingModule.purchaseOrders.error.unknown', 'Unknown error')}</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      activeModule="accounting"
      header={
        <>
          {/* Mobile Navigation Bar */}
          <MobileNavBar title={t('billingModule.purchaseOrders.title', 'Purchase Orders')} />

          {/* Desktop Header */}
          <div className="hidden md:block">
            <ModernPageHeader
              breadcrumbs={[
                { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
                { icon: Package, label: t('billingModule.purchaseOrders.title', 'Purchase Orders'), isActive: true }
              ]}
              title={t('billingModule.purchaseOrders.title', 'Purchase Orders')}
              subtitle={t('billingModule.purchaseOrders.subtitle', 'Manage supplier purchase orders and goods receipt')}
            />
          </div>
        </>
      }
    >
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 space-y-4 md:space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('billingModule.purchaseOrders.allOrders', 'All Purchase Orders')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('billingModule.purchaseOrders.trackOrders', 'Create and track purchase orders from suppliers')}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('billingModule.purchaseOrders.newOrder', 'New Purchase Order')}</span>
                  <span className="sm:hidden">{t('billingModule.purchaseOrders.newOrderShort', 'New PO')}</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('billingModule.purchaseOrders.search', 'Search by PO number or supplier...')}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4" data-tour="billing-stats">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('billingModule.purchaseOrders.stats.totalOrders', 'Total Orders')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('billingModule.purchaseOrders.stats.draft', 'Draft')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.draft}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('billingModule.purchaseOrders.stats.submitted', 'Submitted')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('billingModule.purchaseOrders.stats.approved', 'Approved')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('billingModule.purchaseOrders.stats.inTransit', 'In Transit')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.inTransit}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('billingModule.purchaseOrders.stats.received', 'Received')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.received}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('billingModule.purchaseOrders.stats.completed', 'Completed')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('billingModule.purchaseOrders.stats.totalValue', 'Total Value')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {currentOrganization.currency} {stats.totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order List */}
          <Card data-tour="billing-orders">
            <CardHeader className="px-4 py-4 sm:px-6 sm:py-5">
              <CardTitle className="text-lg sm:text-xl">{t('billingModule.purchaseOrders.allOrders', 'All Purchase Orders')}</CardTitle>
              <CardDescription className="text-sm">
                {t('billingModule.purchaseOrders.viewAndManage', 'View and manage your purchase orders')}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <SortableHeader
                        label={t('billingModule.purchaseOrders.table.poNumber', 'PO #')}
                        sortKey="order_number"
                        currentSort={tableState.sortConfig}
                        onSort={tableState.handleSort}
                      />
                      <SortableHeader
                        label={t('billingModule.purchaseOrders.table.supplier', 'Supplier')}
                        sortKey="supplier_name"
                        currentSort={tableState.sortConfig}
                        onSort={tableState.handleSort}
                      />
                      <SortableHeader
                        label={t('billingModule.purchaseOrders.table.orderDate', 'Order Date')}
                        sortKey="order_date"
                        currentSort={tableState.sortConfig}
                        onSort={tableState.handleSort}
                      />
                      <SortableHeader
                        label={t('billingModule.purchaseOrders.table.expectedDate', 'Expected Date')}
                        sortKey="expected_delivery_date"
                        currentSort={tableState.sortConfig}
                        onSort={tableState.handleSort}
                      />
                      <SortableHeader
                        label={t('billingModule.purchaseOrders.table.amount', 'Amount')}
                        sortKey="grand_total"
                        currentSort={tableState.sortConfig}
                        onSort={tableState.handleSort}
                        align="right"
                      />
                      <SortableHeader
                        label={t('billingModule.purchaseOrders.table.billed', 'Billed')}
                        sortKey="billed_amount"
                        currentSort={tableState.sortConfig}
                        onSort={tableState.handleSort}
                        align="right"
                      />
                      <SortableHeader
                        label={t('billingModule.purchaseOrders.table.status', 'Status')}
                        sortKey="status"
                        currentSort={tableState.sortConfig}
                        onSort={tableState.handleSort}
                      />
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('billingModule.purchaseOrders.table.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {order.order_number}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {order.supplier_name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {order.order_date ? new Date(order.order_date).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {order.currency_code} {Number(order.grand_total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          {order.currency_code} {Number(order.billed_amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${getStatusColor(order.status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(order.status)}
                            {order.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPDF(order)}
                              disabled={order.status === 'draft'}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>{t('billingModule.purchaseOrders.actions.changeStatus', 'Change Status')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {order.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedOrder(order);
                                    setDetailDialogOpen(true);
                                  }}>
                                    <Send className="mr-2 h-4 w-4" />
                                    {t('billingModule.purchaseOrders.actions.submitForApproval', 'Submit for Approval')}
                                  </DropdownMenuItem>
                                )}
                                {order.status === 'submitted' && (
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedOrder(order);
                                    setDetailDialogOpen(true);
                                  }}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {t('billingModule.purchaseOrders.actions.confirmOrder', 'Confirm Order')}
                                  </DropdownMenuItem>
                                )}
                                {['confirmed', 'partially_received'].includes(order.status) && (
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedOrder(order);
                                    setDetailDialogOpen(true);
                                  }}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {t('billingModule.purchaseOrders.actions.markAsReceived', 'Mark as Received')}
                                  </DropdownMenuItem>
                                )}
                                {order.status !== 'cancelled' && order.status !== 'billed' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedOrder(order);
                                        setDetailDialogOpen(true);
                                      }}
                                      className="text-red-600 dark:text-red-400"
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      {t('billingModule.purchaseOrders.actions.cancelOrder', 'Cancel Order')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          {tableState.search || tableState.datePreset !== 'all'
                            ? t('billingModule.purchaseOrders.empty.filtered', 'No purchase orders match your filters.')
                            : t('billingModule.purchaseOrders.empty', 'No purchase orders found. Create your first purchase order to get started.')}
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

              <div className="md:hidden space-y-3">
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {tableState.search || tableState.datePreset !== 'all'
                      ? t('billingModule.purchaseOrders.empty.filtered', 'No purchase orders match your filters.')
                      : t('billingModule.purchaseOrders.empty', 'No purchase orders found. Create your first purchase order to get started.')}
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 space-y-3"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Package className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {order.order_number}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {order.supplier_name}
                            </p>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(order.status)} flex items-center gap-1 text-xs flex-shrink-0`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </Badge>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('billingModule.purchaseOrders.table.orderDate', 'Order Date')}</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {order.order_date ? new Date(order.order_date).toLocaleDateString('fr-FR') : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('billingModule.purchaseOrders.table.expectedDate', 'Expected Date')}</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString('fr-FR') : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('billingModule.purchaseOrders.table.amount', 'Amount')}</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {order.currency_code} {Number(order.grand_total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('billingModule.purchaseOrders.table.billed', 'Billed')}</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {order.currency_code} {Number(order.billed_amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setDetailDialogOpen(true);
                          }}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('app.view', 'View')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(order)}
                          disabled={order.status === 'draft'}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>{t('billingModule.purchaseOrders.actions.changeStatus', 'Change Status')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {order.status === 'draft' && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedOrder(order);
                                setDetailDialogOpen(true);
                              }}>
                                <Send className="mr-2 h-4 w-4" />
                                {t('billingModule.purchaseOrders.actions.submitForApproval', 'Submit for Approval')}
                              </DropdownMenuItem>
                            )}
                            {order.status === 'submitted' && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedOrder(order);
                                setDetailDialogOpen(true);
                              }}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                {t('billingModule.purchaseOrders.actions.confirmOrder', 'Confirm Order')}
                              </DropdownMenuItem>
                            )}
                            {['confirmed', 'partially_received'].includes(order.status) && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedOrder(order);
                                setDetailDialogOpen(true);
                              }}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                {t('billingModule.purchaseOrders.actions.markAsReceived', 'Mark as Received')}
                              </DropdownMenuItem>
                            )}
                            {order.status !== 'cancelled' && order.status !== 'billed' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setDetailDialogOpen(true);
                                  }}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  {t('billingModule.purchaseOrders.actions.cancelOrder', 'Cancel Order')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Purchase Order Dialog */}
        <PurchaseOrderForm
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => {
            // Purchase orders will be automatically refetched due to query invalidation
            setCreateDialogOpen(false);
          }}
        />

        {/* Edit Purchase Order Dialog */}
        <PurchaseOrderForm
          purchaseOrder={editOrder}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setEditOrder(null);
            }
          }}
          onSuccess={() => {
            // Purchase orders will be automatically refetched due to query invalidation
            setEditDialogOpen(false);
            setEditOrder(null);
            setDetailDialogOpen(false);
          }}
        />

        {/* Purchase Order Detail Dialog */}
        <PurchaseOrderDetailDialog
          purchaseOrder={selectedOrder}
          open={detailDialogOpen}
          onOpenChange={(open) => {
            setDetailDialogOpen(open);
            if (!open) {
              setSelectedOrder(null);
            }
          }}
          onEdit={async (order) => {
            // Fetch full order with items for editing
            // First try to find in orders list (which includes items)
            let orderWithItems = orders.find(o => o.id === order.id) as PurchaseOrderWithItems | undefined;
            
            // If not found or items missing, fetch from detail dialog data
            if (!orderWithItems || !orderWithItems.items) {
              // Use the purchaseOrderWithItems from the detail dialog hook if available
              // Otherwise, we'll need to fetch it separately
              orderWithItems = { ...order, items: [] } as PurchaseOrderWithItems;
            }
            
            setEditOrder(orderWithItems || null);
            setDetailDialogOpen(false);
            setEditDialogOpen(true);
          }}
          onDownloadPDF={(order) => {
            handleDownloadPDF(order);
          }}
        />
      </PageLayout>
  );
};

export const Route = createFileRoute('/billing-purchase-orders')({
  component: withRouteProtection(AppContent, 'read', 'Invoice'),
});
