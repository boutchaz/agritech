import React, { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ShoppingCart, ChevronRight, TrendingUp, Clock, CheckCircle, Truck } from 'lucide-react';
import { useSalesOrders } from '../../hooks/useSalesOrders';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
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
      <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-28 rounded-xl mb-5" />
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-900/20 rounded-xl">
            <ShoppingCart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('dashboard.widgets.sales.title', 'Sales Orders')}
          </h3>
        </div>
        <button
          onClick={handleViewOrders}
          className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1 transition-colors"
        >
          {t('dashboard.widgets.viewAll', 'View All')}
          <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* This Month Stats */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/30 dark:to-indigo-900/10 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                {t('dashboard.widgets.sales.thisMonth', 'This Month')}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats.thisMonthTotal)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {t('dashboard.widgets.sales.ordersCount', '{{count}} orders', { count: stats.thisMonthCount })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.total}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {t('dashboard.widgets.sales.totalOrders', 'Total Orders')}
            </div>
          </div>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.pending}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('dashboard.widgets.sales.pending', 'Pending')}</div>
        </div>
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.inProgress}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('dashboard.widgets.sales.inProgress', 'In Progress')}</div>
        </div>
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <Truck className="h-4 w-4 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.shipped}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('dashboard.widgets.sales.shipped', 'Shipped')}</div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.completed}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t('dashboard.widgets.sales.completed', 'Completed')}</div>
        </div>
      </div>

      {/* Recent Orders */}
      {stats.recentOrders.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
            {t('dashboard.widgets.sales.recentOrders', 'Recent Orders')}
          </h4>
          <div className="space-y-2">
            {stats.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={handleViewOrders}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {order.order_number}
                    </p>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {order.customer_name}
                  </p>
                </div>
                <div className="text-right ml-3">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(order.grand_total)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(order.order_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.total === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-900/20 rounded-2xl flex items-center justify-center">
            <ShoppingCart className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('dashboard.widgets.sales.noOrders', 'No sales orders yet')}
          </p>
        </div>
      )}
    </div>
  );
};

export default SalesOverviewWidget;
