import {  useState  } from "react";
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import { useAuth } from '@/hooks/useAuth';
import { useAutoStartTour } from '@/contexts/TourContext';

import { FileText, Plus, Eye, CheckCircle2, Clock, XCircle, Send, Download, Edit, MoreVertical } from 'lucide-react';
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
import { useQuotes, usePaginatedQuotes } from '@/hooks/useQuotes';
import type { QuoteResponse as Quote } from '@/types/quotes';
import { QuoteForm } from '@/components/Billing/QuoteForm';
import { QuoteDetailDialog } from '@/components/Billing/QuoteDetailDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr, ar, enUS } from 'date-fns/locale';
import { useServerTableState, SortableHeader, DataTablePagination, FilterBar, ListPageLayout, ListPageHeader, type DatePreset as FilterDatePreset } from '@/components/ui/data-table';
import { toast } from 'sonner';
import { SectionLoader } from '@/components/ui/loader';


const AppContent = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  useAutoStartTour('billing', 1500);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'quote_date', direction: 'desc' },
  });

  const { data: paginatedData, isLoading, isFetching, error } = usePaginatedQuotes(tableState.queryParams);
  const { data: allQuotesForStats = [] } = useQuotes();

  const quotes = paginatedData?.data ?? [];
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

  const getStatusLabel = (status: Quote['status']) => {
    return t(`quotes.status.${status}`);
  };

  const handleDownloadPDF = async (quote: Quote) => {
    try {
      const { getAccessToken } = await import('../../../../stores/authStore');

      const accessToken = getAccessToken();
      if (!accessToken) {
        toast.error(t('quotes.pdf.signInRequired'));
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/v1/satellite-proxy/billing/quotes/${quote.id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Organization-Id': quote.organization_id || '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('quotes.pdf.failed'));
      }

      // Check if we got HTML (fallback) or PDF
      const contentType = response.headers.get('Content-Type');

      if (contentType?.includes('text/html')) {
        // Fallback: Open HTML in new tab (user can print to PDF)
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');

        toast.info(t('quotes.pdf.htmlFallback'));
      } else {
        // Got PDF directly
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quote-${quote.quote_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(`${t('quotes.pdf.downloadFailed')}: ${error instanceof Error ? error.message : t('quotes.error.unknown')}`);
    }
  };

  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setEditDialogOpen(true);
  };

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'converted':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'expired':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Quote['status']) => {
    switch (status) {
      case 'sent':
        return <Send className="h-3 w-3" />;
      case 'accepted':
      case 'converted':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="h-3 w-3" />;
      case 'draft':
      case 'expired':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const stats = {
    total: allQuotesForStats.length,
    draft: allQuotesForStats.filter(q => q.status === 'draft').length,
    sent: allQuotesForStats.filter(q => q.status === 'sent').length,
    accepted: allQuotesForStats.filter(q => q.status === 'accepted').length,
    converted: allQuotesForStats.filter(q => q.status === 'converted').length,
    totalValue: allQuotesForStats.reduce((sum, q) => sum + Number(q.grand_total), 0),
  };

  if (!currentOrganization) {
    return <SectionLoader />;
  }

  if (isLoading) {
    return <SectionLoader />;
  }

  if (error) {
    return (
        <div className={cn("min-h-screen flex items-center justify-center", isRTL && "flex-row-reverse")}>
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400">{t('quotes.error.loading')}</p>
            <p className="text-sm text-gray-500 mt-2">{error instanceof Error ? error.message : t('quotes.error.unknown')}</p>
          </div>
        </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <ListPageLayout
          header={
            <ListPageHeader
              variant="shell"
              actions={
                <Button onClick={() => setCreateDialogOpen(true)} className="flex-1 sm:flex-none">
                  <Plus className={cn("h-4 w-4 sm:mr-2", isRTL && "sm:ml-2")} />
                  <span className="hidden sm:inline">{t('quotes.actions.newQuote')}</span>
                  <span className="sm:hidden">New</span>
                </Button>
              }
              className={isRTL ? 'sm:flex-row-reverse' : undefined}
            />
          }
          filters={
            <FilterBar
              searchValue={tableState.search}
              onSearchChange={(value) => tableState.setSearch(value)}
              searchPlaceholder={t('quotes.search', 'Search by quote number or customer...')}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4" data-tour="billing-stats">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('quotes.stats.total')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('quotes.stats.draft')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.draft}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('quotes.stats.sent')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('quotes.stats.accepted')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('quotes.stats.converted')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{stats.converted}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('quotes.stats.totalValue')}
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
            <div className="hidden md:block">
              <DataTablePagination
                page={tableState.page}
                totalPages={totalPages}
                pageSize={tableState.pageSize}
                totalItems={totalItems}
                onPageChange={tableState.setPage}
                onPageSizeChange={tableState.setPageSize}
              />
            </div>
          }
        >
          <Card className="hidden md:block" data-tour="billing-quotes">
            <CardHeader>
              <CardTitle>{t('quotes.allQuotes')}</CardTitle>
              <CardDescription>
                {t('quotes.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700">
                      <SortableHeader
                        label={t('quotes.table.quoteNumber')}
                        sortKey="quote_number"
                        currentSort={tableState.sortConfig}
                        onSort={(key) => tableState.handleSort(String(key))}
                      />
                      <SortableHeader
                        label={t('quotes.table.customer')}
                        sortKey="customer_name"
                        currentSort={tableState.sortConfig}
                        onSort={(key) => tableState.handleSort(String(key))}
                      />
                      <SortableHeader
                        label={t('quotes.table.date')}
                        sortKey="quote_date"
                        currentSort={tableState.sortConfig}
                        onSort={(key) => tableState.handleSort(String(key))}
                      />
                      <SortableHeader
                        label={t('quotes.table.validUntil')}
                        sortKey="valid_until"
                        currentSort={tableState.sortConfig}
                        onSort={(key) => tableState.handleSort(String(key))}
                      />
                      <SortableHeader
                        label={t('quotes.table.amount')}
                        sortKey="grand_total"
                        currentSort={tableState.sortConfig}
                        onSort={(key) => tableState.handleSort(String(key))}
                        align="right"
                      />
                      <SortableHeader
                        label={t('quotes.table.status')}
                        sortKey="status"
                        currentSort={tableState.sortConfig}
                        onSort={(key) => tableState.handleSort(String(key))}
                      />
                      <TableHead className={cn("py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-left" : "text-right")}>
                        {t('quotes.table.actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => (
                      <TableRow key={quote.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell className="py-3 px-4">
                          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {quote.quote_number}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={cn("py-3 px-4 text-sm text-gray-900 dark:text-white", isRTL && "text-right")}>
                          {quote.customer_name}
                        </TableCell>
                        <TableCell className={cn("py-3 px-4 text-sm text-gray-600 dark:text-gray-400", isRTL && "text-right")}>
                          {format(new Date(quote.quote_date), 'P', { locale: getLocale() })}
                        </TableCell>
                        <TableCell className={cn("py-3 px-4 text-sm text-gray-600 dark:text-gray-400", isRTL && "text-right")}>
                          {format(new Date(quote.valid_until), 'P', { locale: getLocale() })}
                        </TableCell>
                        <TableCell className={cn("py-3 px-4 text-sm font-medium", isRTL ? "text-left" : "text-right")}>
                          {quote.currency_code} {Number(quote.grand_total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge className={cn(`${getStatusColor(quote.status)} flex items-center gap-1 w-fit`, isRTL && "flex-row-reverse")}>
                            {getStatusIcon(quote.status)}
                            {getStatusLabel(quote.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className={cn("flex items-center gap-2", isRTL ? "justify-start flex-row-reverse" : "justify-end")}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedQuote(quote);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPDF(quote)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditQuote(quote)}
                              disabled={quote.status === 'converted' || quote.status === 'cancelled'}
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
                                <DropdownMenuLabel>{t('quotes.actions.changeStatus')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {quote.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedQuote(quote);
                                    setDetailDialogOpen(true);
                                  }}>
                                    <Send className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                    {t('quotes.actions.sendToCustomer')}
                                  </DropdownMenuItem>
                                )}
                                {quote.status === 'sent' && (
                                  <>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedQuote(quote);
                                      setDetailDialogOpen(true);
                                    }}>
                                      <CheckCircle2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                      {t('quotes.actions.markAccepted')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedQuote(quote);
                                      setDetailDialogOpen(true);
                                    }}>
                                      <XCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                      {t('quotes.actions.markRejected')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {quote.status === 'accepted' && (
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedQuote(quote);
                                    setDetailDialogOpen(true);
                                  }}>
                                    <CheckCircle2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                    {t('quotes.actions.convertToOrder')}
                                  </DropdownMenuItem>
                                )}
                                {quote.status !== 'cancelled' && quote.status !== 'converted' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedQuote(quote);
                                        setDetailDialogOpen(true);
                                      }}
                                      className="text-red-600 dark:text-red-400"
                                    >
                                      <XCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                      {t('quotes.actions.cancelQuote')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {quotes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className={cn("py-8 text-center text-gray-500 dark:text-gray-400", isRTL && "text-right")}>
                          {tableState.search || tableState.datePreset !== 'all'
                            ? t('quotes.empty.filtered', 'No quotes match your filters.')
                            : t('quotes.empty.message')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="md:hidden space-y-3">
            {quotes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {tableState.search || tableState.datePreset !== 'all'
                      ? t('quotes.empty.filtered', 'No quotes match your filters.')
                      : t('quotes.empty.message')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              quotes.map((quote) => (
                <Card key={quote.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    {/* Header: Quote Number, Customer & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white truncate">
                            {quote.quote_number}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {quote.customer_name}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn(`${getStatusColor(quote.status)} flex items-center gap-1 flex-shrink-0`, isRTL && "flex-row-reverse")}>
                        {getStatusIcon(quote.status)}
                        <span className="text-xs">{getStatusLabel(quote.status)}</span>
                      </Badge>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{t('quotes.table.date')}</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {format(new Date(quote.quote_date), 'P', { locale: getLocale() })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{t('quotes.table.validUntil')}</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {format(new Date(quote.valid_until), 'P', { locale: getLocale() })}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">{t('quotes.table.amount')}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {quote.currency_code} {Number(quote.grand_total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedQuote(quote);
                          setDetailDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownloadPDF(quote)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditQuote(quote)}
                        disabled={quote.status === 'converted' || quote.status === 'cancelled'}
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
                          <DropdownMenuLabel>{t('quotes.actions.changeStatus')}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {quote.status === 'draft' && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedQuote(quote);
                              setDetailDialogOpen(true);
                            }}>
                              <Send className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                              {t('quotes.actions.sendToCustomer')}
                            </DropdownMenuItem>
                          )}
                          {quote.status === 'sent' && (
                            <>
                              <DropdownMenuItem onClick={() => {
                                setSelectedQuote(quote);
                                setDetailDialogOpen(true);
                              }}>
                                <CheckCircle2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                {t('quotes.actions.markAccepted')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedQuote(quote);
                                setDetailDialogOpen(true);
                              }}>
                                <XCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                {t('quotes.actions.markRejected')}
                              </DropdownMenuItem>
                            </>
                          )}
                          {quote.status === 'accepted' && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedQuote(quote);
                              setDetailDialogOpen(true);
                            }}>
                              <CheckCircle2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                              {t('quotes.actions.convertToOrder')}
                            </DropdownMenuItem>
                          )}
                          {quote.status !== 'cancelled' && quote.status !== 'converted' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedQuote(quote);
                                  setDetailDialogOpen(true);
                                }}
                                className="text-red-600 dark:text-red-400"
                              >
                                <XCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                                {t('quotes.actions.cancelQuote')}
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
            {quotes.length > 0 && (
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

        </ListPageLayout>

        {/* Create Quote Dialog */}
        <QuoteForm
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => {
            // Quotes will be automatically refetched due to query invalidation
          }}
        />

        {/* Edit Quote Dialog */}
        <QuoteForm
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setSelectedQuote(null);
            }
          }}
          quote={selectedQuote}
          onSuccess={() => {
            setEditDialogOpen(false);
            setSelectedQuote(null);
          }}
        />

        {/* Quote Detail Dialog */}
        <QuoteDetailDialog
          quote={selectedQuote}
          open={detailDialogOpen}
          onOpenChange={(open) => {
            setDetailDialogOpen(open);
            if (!open) {
              setSelectedQuote(null);
            }
          }}
          onEdit={(quote) => {
            setDetailDialogOpen(false);
            handleEditQuote(quote);
          }}
          onDownloadPDF={(quote) => {
            handleDownloadPDF(quote);
          }}
        />
      </div>
  );
};

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/quotes')({
  component: withRouteProtection(AppContent, 'read', 'Invoice'),
});
