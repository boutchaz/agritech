import {  useState  } from "react";
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';

import { Building2, Receipt, Plus, CheckCircle2, Clock, XCircle, Eye, Edit, Trash2, MoreVertical, Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
import { usePaginatedInvoices, useInvoiceStats, useDeleteInvoice } from '@/hooks/useInvoices';
import { InvoiceForm } from '@/components/Accounting/InvoiceForm';
import { InvoiceDetailDialog } from '@/components/Accounting/InvoiceDetailDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr, ar, enUS } from 'date-fns/locale';
import { useServerTableState, SortableHeader, DataTablePagination, FilterBar, ListPageLayout, ListPageHeader } from '@/components/ui/data-table';
import { SectionLoader } from '@/components/ui/loader';


const AppContent = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const _showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<'all' | 'sales' | 'purchase'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'invoice_date', direction: 'desc' },
  });

  const { data: paginatedData, isLoading, isFetching, error } = usePaginatedInvoices({
    ...tableState.queryParams,
    invoice_type: filterType !== 'all' ? filterType : undefined,
    status: filterStatus !== 'all' ? (filterStatus as 'draft' | 'submitted' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled') : undefined,
  });

  const stats = useInvoiceStats();
  const deleteMutation = useDeleteInvoice();

  const invoices = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const isRTL = i18n.language === 'ar';

  const getLocale = () => {
    switch (i18n.language) {
      case 'fr':
        return fr;
      case 'ar':
        return ar;
      default:
        return enUS;
    }
  };

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string, status: string) => {
    if (status !== 'draft') {
      toast.error(t('invoices.actions.onlyDraftDelete'));
      return;
    }

    if (!confirm(t('invoices.actions.confirmDelete', { invoiceNumber }))) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(invoiceId);
      toast.success(t('invoices.actions.deleteSuccess', { invoiceNumber }));
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error(error instanceof Error ? error.message : t('invoices.actions.deleteError'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'submitted':
        return <Clock className="h-4 w-4" />;
      case 'overdue':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (!currentOrganization || isLoading) {
    return <SectionLoader />;
  }

  if (error) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900", isRTL && "flex-row-reverse")} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{t('invoices.error.loading', 'Error loading invoices')}</p>
          <p className="text-sm text-gray-500 mt-2">{error instanceof Error ? error.message : t('common.error.unknown', 'Unknown error')}</p>
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
            { icon: Receipt, label: t('invoices.pageTitle', 'Invoices'), isActive: true }
          ]}
          title={t('invoices.title', 'Invoices')}
          subtitle={t('invoices.subtitle', 'Manage sales and purchase invoices')}
        />
      }
    >
      <div className={cn("p-3 sm:p-4 md:p-6 pb-20 md:pb-6", isRTL && "text-right")}>
        <ListPageLayout
          header={
            <ListPageHeader
              variant="shell"
              className={isRTL ? 'sm:flex-row-reverse' : undefined}
              actions={
                <Button onClick={() => setIsInvoiceFormOpen(true)} className="flex-1 sm:flex-none">
                  <Plus className={cn("h-4 w-4 sm:mr-2", isRTL && "sm:ml-2")} />
                  <span className="hidden sm:inline">{t('invoices.actions.create', 'Create Invoice')}</span>
                  <span className="sm:hidden">New</span>
                </Button>
              }
            />
          }
          filters={
            <FilterBar
              searchValue={tableState.search}
              onSearchChange={tableState.setSearch}
              searchPlaceholder={t('invoices.search.placeholder', 'Search invoices by number or customer...')}
              isSearching={isFetching}
              filters={[
                {
                  key: 'type',
                  value: filterType,
                  onChange: (v) => setFilterType(v as 'all' | 'sales' | 'purchase'),
                  options: [
                    { value: 'all', label: t('invoices.filter.allTypes', 'All Types') },
                    { value: 'sales', label: t('invoices.filter.sales', 'Sales') },
                    { value: 'purchase', label: t('invoices.filter.purchase', 'Purchase') },
                  ],
                },
                {
                  key: 'status',
                  value: filterStatus,
                  onChange: (v) => setFilterStatus(v),
                  options: [
                    { value: 'all', label: t('invoices.filter.allStatus', 'All Status') },
                    { value: 'draft', label: t('invoices.status.draft', 'Draft') },
                    { value: 'submitted', label: t('invoices.status.submitted', 'Submitted') },
                    { value: 'paid', label: t('invoices.status.paid', 'Paid') },
                    { value: 'partially_paid', label: t('invoices.status.partiallyPaid', 'Partially Paid') },
                    { value: 'overdue', label: t('invoices.status.overdue', 'Overdue') },
                    { value: 'cancelled', label: t('invoices.status.cancelled', 'Cancelled') },
                  ],
                },
              ]}
              datePreset={tableState.datePreset}
              onDatePresetChange={tableState.setDatePreset}
            />
          }
          stats={
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" data-tour="billing-stats">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('invoices.stats.total', 'Total Invoices')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('invoices.stats.pending', 'Pending')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.submitted}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('invoices.stats.paid', 'Paid')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.paid}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('invoices.stats.overdue', 'Overdue')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats.overdue}
                </div>
              </CardContent>
            </Card>
          </div>
          }
        >
          {/* Invoice List - Desktop Table View */}
          <Card className="hidden md:block" data-tour="billing-invoices">
            <CardHeader>
              <CardTitle>{t('invoices.allInvoices', 'Invoices')}</CardTitle>
              <CardDescription>
                {t('invoices.tableDescription', 'A list of all your sales and purchase invoices')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700">
                      <SortableHeader
                        label={t('invoices.table.invoiceNumber', 'Invoice #')}
                        sortKey="invoice_number"
                        currentSort={tableState.sortConfig}
                        onSort={tableState.handleSort}
                      />
                      <SortableHeader
                        label={t('invoices.table.type', 'Type')}
                        sortKey="invoice_type"
                        currentSort={tableState.sortConfig}
                        onSort={tableState.handleSort}
                      />
                      <SortableHeader
                        label={t('invoices.table.party', 'Customer/Supplier')}
                        sortKey="party_name"
                        currentSort={tableState.sortConfig}
                        onSort={tableState.handleSort}
                      />
                      <SortableHeader
                        label={t('invoices.table.date', 'Date')}
                        sortKey="invoice_date"
                        currentSort={tableState.sortConfig}
                        onSort={tableState.handleSort}
                      />
                      <SortableHeader
                        label={t('invoices.table.amount', 'Amount')}
                        sortKey="grand_total"
                        currentSort={tableState.sortConfig}
                        onSort={tableState.handleSort}
                        align="right"
                      />
                      <SortableHeader
                        label={t('invoices.table.status', 'Status')}
                        sortKey="status"
                        currentSort={tableState.sortConfig}
                        onSort={tableState.handleSort}
                      />
                      <TableHead className={cn("py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-left" : "text-right")}>
                        {t('invoices.table.actions', 'Actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell className="py-3 px-4">
                          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                            <Receipt className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {invoice.invoice_number}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge className={cn(
                            invoice.invoice_type === 'sales'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          )}>
                            {invoice.invoice_type === 'sales' ? t('invoices.type.sales', 'Sales') : t('invoices.type.purchase', 'Purchase')}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("py-3 px-4 text-sm text-gray-900 dark:text-white", isRTL && "text-right")}>
                          {invoice.party_name}
                        </TableCell>
                        <TableCell className={cn("py-3 px-4 text-sm text-gray-600 dark:text-gray-400", isRTL && "text-right")}>
                          {format(new Date(invoice.invoice_date), 'P', { locale: getLocale() })}
                        </TableCell>
                        <TableCell className={cn("py-3 px-4 text-sm font-medium text-gray-900 dark:text-white", isRTL ? "text-left" : "text-right")}>
                          {invoice.currency_code} {Number(invoice.grand_total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge className={cn(`${getStatusColor(invoice.status)} flex items-center gap-1 w-fit`, isRTL && "flex-row-reverse")}>
                            {getStatusIcon(invoice.status)}
                            {t(`invoices.status.${invoice.status}`, invoice.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className={cn("flex items-center gap-2", isRTL ? "justify-start flex-row-reverse" : "justify-end")}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewInvoiceId(invoice.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (invoice.status !== 'draft') {
                                  toast.error(t('invoices.error.editDraftOnly', 'Only draft invoices can be edited'));
                                } else {
                                  setEditInvoiceId(invoice.id);
                                  setIsInvoiceFormOpen(true);
                                }
                              }}
                              disabled={invoice.status !== 'draft'}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isRTL ? "start" : "end"} className={cn("w-48", isRTL && "text-right")}>
                                <DropdownMenuLabel>{t('invoices.actions.menu', 'Actions')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {invoice.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => setViewInvoiceId(invoice.id)}>
                                    <Send className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                    {t('invoices.actions.submit', 'Submit Invoice')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setViewInvoiceId(invoice.id)}>
                                  <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                  {t('invoices.actions.download', 'Download PDF')}
                                </DropdownMenuItem>
                                {invoice.status === 'draft' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteInvoice(invoice.id, invoice.invoice_number, invoice.status)}
                                      className="text-red-600 dark:text-red-400"
                                    >
                                      <Trash2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                      {t('invoices.actions.delete', 'Delete')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {invoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className={cn("py-8 text-center text-gray-500 dark:text-gray-400", isRTL && "text-right")}>
                          {tableState.search || filterType !== 'all' || filterStatus !== 'all' || tableState.datePreset !== 'all'
                            ? t('invoices.empty.filtered', 'No invoices match your filters.')
                            : t('invoices.empty.message', 'No invoices found. Create your first invoice to get started.')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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
            {invoices.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {tableState.search || filterType !== 'all' || filterStatus !== 'all' || tableState.datePreset !== 'all'
                      ? t('invoices.empty.filtered', 'No invoices match your filters.')
                      : t('invoices.empty.message', 'No invoices found. Create your first invoice to get started.')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              invoices.map((invoice) => (
                <Card key={invoice.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    {/* Header: Invoice Number & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Receipt className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white truncate">
                            {invoice.invoice_number}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {invoice.party_name}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn(`${getStatusColor(invoice.status)} flex items-center gap-1 flex-shrink-0`, isRTL && "flex-row-reverse")}>
                        {getStatusIcon(invoice.status)}
                        <span className="text-xs">{t(`invoices.status.${invoice.status}`, invoice.status)}</span>
                      </Badge>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{t('invoices.table.type', 'Type')}</p>
                        <Badge className={cn(
                          invoice.invoice_type === 'sales'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
                          'text-xs'
                        )}>
                          {invoice.invoice_type === 'sales' ? t('invoices.type.sales', 'Sales') : t('invoices.type.purchase', 'Purchase')}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{t('invoices.table.date', 'Date')}</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {format(new Date(invoice.invoice_date), 'P', { locale: getLocale() })}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{t('invoices.table.amount', 'Amount')}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {invoice.currency_code} {Number(invoice.grand_total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setViewInvoiceId(invoice.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t('common.view', 'View')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (invoice.status !== 'draft') {
                            toast.error(t('invoices.error.editDraftOnly', 'Only draft invoices can be edited'));
                          } else {
                            setEditInvoiceId(invoice.id);
                            setIsInvoiceFormOpen(true);
                          }
                        }}
                        disabled={invoice.status !== 'draft'}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isRTL ? "start" : "end"} className={cn("w-48", isRTL && "text-right")}>
                          <DropdownMenuLabel>{t('invoices.actions.menu', 'Actions')}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setViewInvoiceId(invoice.id)}>
                            <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                            {t('invoices.actions.download', 'Download PDF')}
                          </DropdownMenuItem>
                          {invoice.status === 'draft' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteInvoice(invoice.id, invoice.invoice_number, invoice.status)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                {t('invoices.actions.delete', 'Delete')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            {totalItems > 0 && (
              <DataTablePagination
                page={tableState.page}
                totalPages={totalPages}
                pageSize={tableState.pageSize}
                totalItems={totalItems}
                onPageChange={tableState.setPage}
                onPageSizeChange={tableState.setPageSize}
                pageSizeOptions={[5, 10, 20]}
              />
            )}
          </div>
        </ListPageLayout>

        {/* Invoice Creation/Edit Dialog */}
        <InvoiceForm
          isOpen={isInvoiceFormOpen}
          onClose={() => {
            setIsInvoiceFormOpen(false);
            setEditInvoiceId(null);
          }}
          onSuccess={() => {
            setIsInvoiceFormOpen(false);
            setEditInvoiceId(null);
            // Invoices will auto-refresh via query invalidation
          }}
          editInvoiceId={editInvoiceId}
        />

        {/* Invoice Detail Dialog */}
        <InvoiceDetailDialog
          isOpen={viewInvoiceId !== null}
          onClose={() => setViewInvoiceId(null)}
          invoiceId={viewInvoiceId}
        />
      </div>
          <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </PageLayout>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/invoices')({
  component: withRouteProtection(AppContent, 'read', 'Invoice'),
});
