import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { Receipt, ChevronRight, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { useInvoices, useInvoiceStats } from '../../hooks/useInvoices';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 h-full flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <Skeleton className="h-5 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3 mt-auto">
          <div className="flex items-center justify-between px-1 mb-3">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-px flex-1 mx-3 rounded" />
          </div>
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-500">
            <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
            {t('dashboard.widgets.accounting.title', 'Accounting')}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewAccounting}
          className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 h-8 rounded-xl px-2 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Revenue vs Expenses Overview */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 overflow-hidden group/card">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-700"></div>
          <div className="relative">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('dashboard.widgets.accounting.revenue', 'Revenue')}
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1 truncate">
              {formatCurrency(detailedStats.salesTotal)}
            </div>
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-tighter">
              {t('dashboard.widgets.accounting.invoicesCount', '{{count}} items', { count: detailedStats.salesCount })}
            </div>
          </div>
        </div>

        <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 overflow-hidden group/card">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-700"></div>
          <div className="relative">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('dashboard.widgets.accounting.expenses', 'Expenses')}
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1 truncate">
              {formatCurrency(detailedStats.purchaseTotal)}
            </div>
            <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1 uppercase tracking-tighter">
              {t('dashboard.widgets.accounting.invoicesCount', '{{count}} items', { count: detailedStats.purchaseCount })}
            </div>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'draft', value: stats.draft, icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/20' },
          { label: 'pending', value: stats.submitted, icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'paid', value: stats.paid, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'overdue', value: stats.overdue, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
        ].map((item) => (
          <div key={item.label} className={cn("text-center p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105 duration-300", item.bg)}>
            <item.icon className={cn("h-3.5 w-3.5", item.color)} />
            <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums leading-none">{item.value}</div>
            <div className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter truncate w-full">
              {t(`dashboard.widgets.accounting.${item.label}`)}
            </div>
          </div>
        ))}
      </div>

      {/* Outstanding Amount Alert */}
      {stats.outstandingAmount > 0 && (
        <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl mb-6 flex items-center gap-3">
          <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest leading-none">
              {t('dashboard.widgets.accounting.outstandingAlert', 'Outstanding')}
            </p>
            <p className="text-sm font-black text-amber-900 dark:text-amber-200 mt-1 tabular-nums">
              {formatCurrency(stats.outstandingAmount)}
            </p>
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      {detailedStats.recentInvoices.length > 0 ? (
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('dashboard.widgets.accounting.recentInvoices', 'Recent Invoices')}
            </h4>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-3"></div>
          </div>
          <div className="space-y-2">
            {detailedStats.recentInvoices.slice(0, 3).map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 shadow-sm hover:shadow group/item cursor-pointer"
                onClick={handleViewInvoices}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tighter">
                      {invoice.invoice_number}
                    </p>
                    <Badge className={cn("border-none font-black text-[8px] tracking-widest px-1.5 py-0 h-4", getStatusColor(invoice.status))}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase truncate mt-0.5">
                    {invoice.party_name}
                  </p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(Number(invoice.grand_total))}
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">
                    {new Date(invoice.invoice_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 mt-auto">
          <Receipt className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {t('dashboard.widgets.accounting.noInvoices', 'No invoices yet')}
          </p>
        </div>
      )}
    </div>
  );
};

export default AccountingWidget;
