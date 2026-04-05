import {  useMemo  } from "react";
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { Package, AlertTriangle, ChevronRight, TrendingDown, CheckCircle } from 'lucide-react';
import { useInventory, type InventoryItem } from '../../hooks/useInventory';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { localizeUnit } from '@/lib/utils/unit-localization';

const StockAlertsWidget = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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
    <div className="group bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-2xl group-hover:scale-110 transition-transform duration-500">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 min-w-0">
        <div className="relative min-w-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 sm:p-4 overflow-hidden group/card">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-700"></div>
          <div className="relative min-w-0">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide sm:tracking-wider leading-tight break-words hyphens-auto">{t('dashboard.widgets.stock.alerts')}</span>
            <div className={cn(
              "text-3xl font-black tabular-nums mt-1",
              lowStockItems.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
            )}>
              {lowStockItems.length}
            </div>
            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1 uppercase tracking-tight leading-tight break-words">
              {t('dashboard.widgets.stock.lowStock')}
            </div>
          </div>
        </div>

        <div className="relative min-w-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 sm:p-4 overflow-hidden group/card">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-700"></div>
          <div className="relative min-w-0">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide sm:tracking-wider leading-tight break-words hyphens-auto">{t('dashboard.widgets.stock.ok')}</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
              {healthyStock}
            </div>
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-tight leading-tight break-words">
              {t('dashboard.widgets.stock.inStock')}
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Items */}
      {lowStockItems.length > 0 ? (
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('dashboard.widgets.stock.lowStock')}
            </h4>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 mx-3"></div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {lowStockItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 shadow-sm hover:shadow"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                    {item.name}
                  </p>
                  {item.brand && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                      {item.brand}
                    </p>
                  )}
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className="text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums">
                    {item.quantity || 0}
                  </div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {localizeUnit(item.unit, i18n.language) || t('dashboard.widgets.stock.units')}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {lowStockItems.length > 5 && (
            <button
              onClick={handleViewStock}
              className="w-full text-center py-2 mt-2 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
            >
              + {lowStockItems.length - 5} {t('dashboard.widgets.stock.moreItems')}
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 mt-auto">
          <CheckCircle className="h-8 w-8 text-emerald-300 dark:text-emerald-700 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {t('dashboard.widgets.stock.allOptimal')}
          </p>
        </div>
      )}

      {/* Footer Stats */}
      <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('dashboard.widgets.stock.totalProducts')}</span>
        <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-lg">{totalItems}</span>
      </div>
    </div>
  );
};

export default StockAlertsWidget;
