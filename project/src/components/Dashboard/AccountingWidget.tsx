import React, { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Receipt, ChevronRight, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { useInvoices, useInvoiceStats } from '../../hooks/useInvoices';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DEFAULT_CURRENCY } from '@/utils/currencies';

const AccountingWidget: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: invoices = [], isLoading } = useInvoices();
  const stats = useInvoiceStats();

  const detailedStats = useMemo(() => {
    const salesInvoices = invoices.filter(i => i.invoice_type === 'sales');
    const purchaseInvoices = invoices.filter(i => i.invoice_type === 'purchase');

    const salesTotal = salesInvoices.reduce((sum, i) => sum + Number(i.grand_total), 0);
    const purchaseTotal = purchaseInvoices.reduce((sum, i) => sum + Number(i.grand_total), 0);

    const overdueInvoices = invoices.filter(i => i.status === 'overdue');
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.outstanding_amount), 0);

    // Recent invoices (last 4)
    const recentInvoices = [...invoices]
      .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())
      .slice(0, 4);

    return {
      salesCount: salesInvoices.length,
      purchaseCount: purchaseInvoices.length,
      salesTotal,
      purchaseTotal,
      overdueCount: overdueInvoices.length,
      overdueAmount,
      recentInvoices,
    };
  }, [invoices]);

  const handleViewInvoices = () => {
    navigate({ to: '/accounting-invoices' });
  };

  const handleViewAccounting = () => {
    navigate({ to: '/accounting' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'submitted':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
      case 'paid':
        return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
      case 'partially_paid':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
      case 'overdue':
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/20 rounded-xl">
            <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('dashboard.widgets.accounting.title', 'Accounting')}
          </h3>
        </div>
        <Button
          variant="link"
          onClick={handleViewAccounting}
          className="text-green-600 dark:text-green-400 p-0 h-auto"
        >
          {t('dashboard.widgets.viewAll', 'View All')}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Revenue vs Expenses Overview */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="relative bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/30 dark:to-green-900/10 rounded-xl p-4 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-200/20 dark:bg-green-400/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
                {t('dashboard.widgets.accounting.revenue', 'Revenue')}
              </span>
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
              {formatCurrency(detailedStats.salesTotal)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {t('dashboard.widgets.accounting.invoicesCount', '{{count}} invoices', { count: detailedStats.salesCount })}
            </div>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-900/10 rounded-xl p-4 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-200/20 dark:bg-red-400/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">
                {t('dashboard.widgets.accounting.expenses', 'Expenses')}
              </span>
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">
              {formatCurrency(detailedStats.purchaseTotal)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {t('dashboard.widgets.accounting.invoicesCount', '{{count}} invoices', { count: detailedStats.purchaseCount })}
            </div>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.draft}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('dashboard.widgets.accounting.draft', 'Draft')}</div>
        </div>
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.submitted}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('dashboard.widgets.accounting.pending', 'Pending')}</div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.paid}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('dashboard.widgets.accounting.paid', 'Paid')}</div>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.overdue}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('dashboard.widgets.accounting.overdue', 'Overdue')}</div>
        </div>
      </div>

      {/* Outstanding Amount Alert */}
      {stats.outstandingAmount > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-5">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {t('dashboard.widgets.accounting.outstandingAlert', 'Outstanding Amount')}:
              </span>
              <span className="ml-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                {formatCurrency(stats.outstandingAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      {detailedStats.recentInvoices.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
            {t('dashboard.widgets.accounting.recentInvoices', 'Recent Invoices')}
          </h4>
          <div className="space-y-2">
            {detailedStats.recentInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={handleViewInvoices}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {invoice.invoice_number}
                    </p>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      invoice.invoice_type === 'sales'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                    }`}>
                      {invoice.invoice_type === 'sales' ? t('dashboard.widgets.accounting.sale', 'Sale') : t('dashboard.widgets.accounting.purchase', 'Purchase')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {invoice.party_name}
                  </p>
                </div>
                <div className="text-right ml-3">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(Number(invoice.grand_total))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.total === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/20 rounded-2xl flex items-center justify-center">
            <Receipt className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('dashboard.widgets.accounting.noInvoices', 'No invoices yet')}
          </p>
        </div>
      )}
    </div>
  );
};

export default AccountingWidget;
