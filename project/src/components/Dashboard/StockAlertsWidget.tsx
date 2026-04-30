import {  useMemo  } from "react";
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { Package, ChevronRight, CheckCircle } from 'lucide-react';
import { useInventory, type InventoryItem } from '../../hooks/useInventory';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const StockAlertsWidget = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: inventory = [], isLoading } = useInventory();

  // Calculate stock alerts
  const { lowStockItems, totalItems, healthyStock } = useMemo(() => {
    const items = inventory as InventoryItem[];
    const lowStock = items.filter(item => {
      if (!item.min_stock_level) return false;
      return item.quantity <= item.min_stock_level;
    });

    return {
      lowStockItems: lowStock,
      totalItems: items.length,
      healthyStock: items.length - lowStock.length
    };
  }, [inventory]);

  const handleViewStock = () => {
    navigate({ to: '/stock' });
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
        <div className="space-y-3 mt-auto">
          <div className="flex items-center justify-between px-1 mb-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-px flex-1 mx-3 rounded" />
          </div>
          {[1, 2, 3].map((_, skIdx) => (
            <Skeleton key={"sk-" + skIdx} className="h-12 w-full rounded-xl" />
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-6 w-8 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 sm:p-5 hover:shadow-md transition-all duration-300 flex flex-col h-full min-h-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('dashboard.widgets.stock.title')}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewStock}
          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 h-8 rounded-xl px-2 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 min-w-0">
        <div className="min-w-0 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.widgets.stock.alerts')}</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <div className={cn(
              "text-2xl font-semibold tabular-nums leading-none",
              lowStockItems.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
            )}>
              {lowStockItems.length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.widgets.stock.lowStock')}
            </div>
          </div>
        </div>

        <div className="min-w-0 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.widgets.stock.ok')}</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <div className="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums leading-none">
              {healthyStock}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.widgets.stock.inStock')}
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Items */}
      {lowStockItems.length > 0 ? (
        <div className="mt-auto">
          <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            {t('dashboard.widgets.stock.lowStock')}
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {lowStockItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  {(item as InventoryItem & { brand?: string }).brand && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {(item as InventoryItem & { brand?: string }).brand}
                    </p>
                  )}
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className="text-sm font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                    {item.quantity || 0} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">{item.unit || ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {lowStockItems.length > 5 && (
            <button
              onClick={handleViewStock}
              className="w-full text-center py-1.5 mt-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              + {lowStockItems.length - 5} {t('dashboard.widgets.stock.moreItems')}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl mt-auto">
          <CheckCircle className="h-4 w-4 text-emerald-500" strokeWidth={1.75} />
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {t('dashboard.widgets.stock.allOptimal')}
          </p>
        </div>
      )}

      {/* Footer Stats */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.widgets.stock.totalProducts')}</span>
        <span className="text-sm font-medium text-slate-900 dark:text-white tabular-nums">{totalItems}</span>
      </div>
    </div>
  );
};

export default StockAlertsWidget;
