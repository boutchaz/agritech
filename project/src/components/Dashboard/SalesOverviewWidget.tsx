import {  useMemo  } from "react";
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { ShoppingCart, ChevronRight, TrendingUp, Clock, CheckCircle, Truck } from 'lucide-react';
import { useSalesOrders } from '../../hooks/useSalesOrders';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_CURRENCY } from '@/utils/currencies';

const SalesOverviewWidget = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: orders = [], isLoading } = useSalesOrders();

  const stats = useMemo(() => {
    const pending = orders.filter(o => ['draft', 'confirmed'].includes(o.status));
    const inProgress = orders.filter(o => ['processing', 'in_progress', 'ready_to_ship'].includes(o.status));
    const shipped = orders.filter(o => ['shipped', 'delivered'].includes(o.status));
    const completed = orders.filter(o => o.status === 'completed');

    // Calculate this month's orders
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthOrders = orders.filter(o => new Date(o.order_date) >= startOfMonth);
    const thisMonthTotal = thisMonthOrders.reduce((sum, o) => sum + (o.grand_total || 0), 0);

    // Recent orders (last 5)
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
      .slice(0, 4);

    return {
      total: orders.length,
      pending: pending.length,
      inProgress: inProgress.length,
      shipped: shipped.length,
      completed: completed.length,
      thisMonthCount: thisMonthOrders.length,
      thisMonthTotal,
      recentOrders,
    };
  }, [orders]);

  const handleViewOrders = () => {
    navigate({ to: '/accounting/sales-orders' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
      case 'processing':
      case 'in_progress':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
      case 'shipped':
      case 'delivered':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
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
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 min-[520px]:grid-cols-4 gap-2 sm:gap-3">
          {[1, 2, 3, 4].map((_, skIdx) => (
            <Skeleton key={"sk-" + skIdx} className="h-16 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3 mt-auto">
          <div className="flex items-center justify-between px-1 mb-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-px flex-1 mx-3 rounded" />
          </div>
          {[1, 2].map((_, skIdx) => (
            <Skeleton key={"sk-" + skIdx} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 sm:p-5 hover:shadow-md transition-all duration-300 flex flex-col h-full min-h-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <ShoppingCart className="h-4 w-4 text-indigo-600 dark:text-indigo-400" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('dashboard.widgets.sales.title', 'Sales Orders')}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewOrders}
          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 h-8 rounded-xl px-2 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* This Month Stats */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.widgets.sales.thisMonth', 'This Month')}</span>
            <div className="text-xl font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5 truncate">
              {formatCurrency(stats.thisMonthTotal)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('dashboard.widgets.sales.ordersCount', '{{count}} orders', { count: stats.thisMonthCount })}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums leading-none">
              {stats.total}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('dashboard.widgets.sales.totalOrders', 'Total Orders')}
            </div>
          </div>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 min-[520px]:grid-cols-4 gap-2 mb-4 min-w-0">
        {[
          { label: 'pending', value: stats.pending, icon: Clock, color: 'text-amber-500' },
          { label: 'inProgress', value: stats.inProgress, icon: TrendingUp, color: 'text-blue-500' },
          { label: 'shipped', value: stats.shipped, icon: Truck, color: 'text-purple-500' },
          { label: 'completed', value: stats.completed, icon: CheckCircle, color: 'text-emerald-500' },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 min-w-0">
            <item.icon className={cn("h-4 w-4 flex-shrink-0", item.color)} strokeWidth={1.75} />
            <div className="text-sm font-medium text-slate-900 dark:text-white tabular-nums leading-none">{item.value}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight text-center">
              {t(`dashboard.widgets.sales.${item.label}`)}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      {stats.recentOrders.length > 0 ? (
        <div className="mt-auto">
          <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            {t('dashboard.widgets.sales.recentOrders', 'Recent Orders')}
          </h4>
          <div className="space-y-1">
            {stats.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                onClick={handleViewOrders}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-900 dark:text-white truncate">
                      {order.order_number}
                    </p>
                    <Badge className={cn("border-none px-1.5 py-0 h-4 text-[10px]", getStatusColor(order.status))}>
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {order.customer_name}
                  </p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(order.grand_total)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {new Date(order.order_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 mt-auto">
          <ShoppingCart className="h-7 w-7 text-slate-300 dark:text-slate-600 mx-auto mb-2" strokeWidth={1.75} />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('dashboard.widgets.sales.noOrders', 'No sales orders yet')}
          </p>
        </div>
      )}
    </div>
  );
};

export default SalesOverviewWidget;
