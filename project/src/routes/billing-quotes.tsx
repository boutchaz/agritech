import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { Building2, FileText, Plus, Filter, Eye, CheckCircle2, Clock, XCircle, Send, Download, Edit, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { Module } from '../types';
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import { useQuotes, type Quote } from '../hooks/useQuotes';
import { QuoteForm } from '../components/Billing/QuoteForm';
import { QuoteDetailDialog } from '../components/Billing/QuoteDetailDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr, ar, enUS } from 'date-fns/locale';

const mockModules: Module[] = [
  {
    id: 'accounting',
    name: 'Accounting',
    icon: 'DollarSign',
    active: true,
    category: 'business',
    description: 'Financial management',
    metrics: []
  },
];

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [activeModule, setActiveModule] = useState('accounting');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, _setModules] = useState(mockModules);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Quote['status'] | undefined>(undefined);

  const { data: quotes = [], isLoading, error } = useQuotes(statusFilter);

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
      const { supabase } = await import('../lib/supabase');

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert(t('quotes.pdf.signInRequired'));
        return;
      }

      // Call backend service
      const backendUrl = import.meta.env.VITE_BACKEND_SERVICE_URL || import.meta.env.VITE_SATELLITE_SERVICE_URL || 'http://localhost:8001';
      const response = await fetch(`${backendUrl}/api/billing/quotes/${quote.id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
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

        alert(t('quotes.pdf.htmlFallback'));
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
      alert(`${t('quotes.pdf.downloadFailed')}: ${error instanceof Error ? error.message : t('quotes.error.unknown')}`);
    }
  };

  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setEditDialogOpen(true);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
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
    total: quotes.length,
    draft: quotes.filter(q => q.status === 'draft').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    converted: quotes.filter(q => q.status === 'converted').length,
    totalValue: quotes.reduce((sum, q) => sum + Number(q.grand_total), 0),
  };

  if (!currentOrganization) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900", isRTL && "flex-row-reverse")} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('quotes.loading')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("flex min-h-screen", isRTL && "flex-row-reverse")} dir={isRTL ? 'rtl' : 'ltr'}>
        <Sidebar
          modules={modules.filter(m => m.active)}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          isDarkMode={isDarkMode}
          onThemeToggle={toggleTheme}
        />
        <main className="flex-1 bg-gray-50 dark:bg-gray-900">
          <ModernPageHeader
            breadcrumbs={[
              { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
              { icon: FileText, label: t('quotes.pageTitle'), isActive: true }
            ]}
            title={t('quotes.pageTitle')}
            subtitle={t('quotes.pageSubtitle')}
          />
          <div className="p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900", isRTL && "flex-row-reverse")} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{t('quotes.error.loading')}</p>
          <p className="text-sm text-gray-500 mt-2">{error instanceof Error ? error.message : t('quotes.error.unknown')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(`flex min-h-screen ${isDarkMode ? 'dark' : ''}`, isRTL && "flex-row-reverse")} dir={isRTL ? 'rtl' : 'ltr'}>
      <Sidebar
        modules={modules.filter(m => m.active)}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleTheme}
      />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            { icon: FileText, label: t('quotes.pageTitle'), isActive: true }
          ]}
          title={t('quotes.title')}
          subtitle={t('quotes.subtitle')}
        />

        <div className="p-6 space-y-6">
          {/* Header Actions */}
          <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('quotes.allQuotes')}</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t('quotes.description')}
              </p>
            </div>
            <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
              <Button variant="outline">
                <Filter className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                {t('quotes.actions.filter')}
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                {t('quotes.actions.newQuote')}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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

          {/* Quote List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('quotes.allQuotes')}</CardTitle>
              <CardDescription>
                {t('quotes.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className={cn("py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-right" : "text-left")}>
                        {t('quotes.table.quoteNumber')}
                      </th>
                      <th className={cn("py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-right" : "text-left")}>
                        {t('quotes.table.customer')}
                      </th>
                      <th className={cn("py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-right" : "text-left")}>
                        {t('quotes.table.date')}
                      </th>
                      <th className={cn("py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-right" : "text-left")}>
                        {t('quotes.table.validUntil')}
                      </th>
                      <th className={cn("py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-left" : "text-right")}>
                        {t('quotes.table.amount')}
                      </th>
                      <th className={cn("py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-right" : "text-left")}>
                        {t('quotes.table.status')}
                      </th>
                      <th className={cn("py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400", isRTL ? "text-left" : "text-right")}>
                        {t('quotes.table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote) => (
                      <tr key={quote.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {quote.quote_number}
                            </span>
                          </div>
                        </td>
                        <td className={cn("py-3 px-4 text-sm text-gray-900 dark:text-white", isRTL && "text-right")}>
                          {quote.customer_name}
                        </td>
                        <td className={cn("py-3 px-4 text-sm text-gray-600 dark:text-gray-400", isRTL && "text-right")}>
                          {format(new Date(quote.quote_date), 'P', { locale: getLocale() })}
                        </td>
                        <td className={cn("py-3 px-4 text-sm text-gray-600 dark:text-gray-400", isRTL && "text-right")}>
                          {format(new Date(quote.valid_until), 'P', { locale: getLocale() })}
                        </td>
                        <td className={cn("py-3 px-4 text-sm font-medium", isRTL ? "text-left" : "text-right")}>
                          {quote.currency_code} {Number(quote.grand_total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={cn(`${getStatusColor(quote.status)} flex items-center gap-1 w-fit`, isRTL && "flex-row-reverse")}>
                            {getStatusIcon(quote.status)}
                            {getStatusLabel(quote.status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
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
                        </td>
                      </tr>
                    ))}
                    {quotes.length === 0 && (
                      <tr>
                        <td colSpan={7} className={cn("py-8 text-center text-gray-500 dark:text-gray-400", isRTL && "text-right")}>
                          {t('quotes.empty.message')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

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
      </main>
    </div>
  );
};

export const Route = createFileRoute('/billing-quotes')({
  component: withRouteProtection(AppContent, 'read', 'Invoice'),
});
