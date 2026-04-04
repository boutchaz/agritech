import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { ShoppingCart, ChevronRight, TrendingUp, Clock, CheckCircle, Truck } from 'lucide-react';
import { useSalesOrders } from '../../hooks/useSalesOrders';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_CURRENCY } from '@/utils/currencies';

const SalesOverviewWidget: React.FC = () => {
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
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3 mt-auto">
          <div className="flex items-center justify-between px-1 mb-3">
            <Skeleton className="h-3 w-20 rounded" />
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
    <div className="group bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-500">
            <ShoppingCart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
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
      <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 mb-6 overflow-hidden group/card">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover/card:scale-150 transition-transform duration-700"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('dashboard.widgets.sales.thisMonth', 'This Month')}</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
              {formatCurrency(stats.thisMonthTotal)}
            </div>
            <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-tighter">
              {t('dashboard.widgets.sales.ordersCount', '{{count}} orders', { count: stats.thisMonthCount })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
              {stats.total}
            </div>
            <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
              {t('dashboard.widgets.sales.totalOrders', 'Total Orders')}
            </div>
          </div>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 min-[520px]:grid-cols-4 gap-2 sm:gap-3 mb-6 min-w-0">
        {[
          { label: 'pending', value: stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'inProgress', value: stats.inProgress, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'shipped', value: stats.shipped, icon: Truck, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'completed', value: stats.completed, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        ].map((item) => (
          <div key={item.label} className={cn("text-center p-2 rounded-xl flex flex-col items-center justify-center gap-1 min-w-0 transition-transform hover:scale-105 duration-300", item.bg)}>
            <item.icon className={cn("h-3.5 w-3.5 flex-shrink-0", item.color)} />
            <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums leading-none">{item.value}</div>
            <div className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight break-words hyphens-auto px-0.5">
              {t(`dashboard.widgets.sales.${item.label}`)}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      {stats.recentOrders.length > 0 ? (
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('dashboard.widgets.sales.recentOrders', 'Recent Orders')}
            </h4>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-3"></div>
          </div>
          <div className="space-y-2">
            {stats.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 shadow-sm hover:shadow group/item cursor-pointer"
                onClick={handleViewOrders}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tighter">
                      {order.order_number}
                    </p>
                    <Badge className={cn("border-none font-black text-[8px] tracking-widest px-1.5 py-0 h-4", getStatusColor(order.status))}>
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase truncate mt-0.5">
                    {order.customer_name}
                  </p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(order.grand_total)}
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">
                    {new Date(order.order_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 mt-auto">
          <ShoppingCart className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {t('dashboard.widgets.sales.noOrders', 'No sales orders yet')}
          </p>
        </div>
      )}
    </div>
  );
};

export default SalesOverviewWidget;
