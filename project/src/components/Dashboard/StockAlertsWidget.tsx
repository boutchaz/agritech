import React, { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Package, AlertTriangle, ChevronRight, TrendingDown, CheckCircle } from 'lucide-react';
import { useInventory, type InventoryItem } from '../../hooks/useInventory';

const StockAlertsWidget: React.FC = () => {
  const navigate = useNavigate();
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/20 rounded-xl">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Stock & Inventaire
          </h3>
        </div>
        <button
          onClick={handleViewStock}
          className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1 transition-colors"
        >
          Voir tout
          <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="relative bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-900/10 rounded-xl p-4 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200/20 dark:bg-amber-400/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Alertes</span>
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-0.5">
              {lowStockItems.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              stock faible
            </div>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/30 dark:to-green-900/10 rounded-xl p-4 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-200/20 dark:bg-green-400/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">OK</span>
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-0.5">
              {healthyStock}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              en stock
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Items */}
      {lowStockItems.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
              <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Stock faible
            </h4>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {lowStockItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {item.name}
                    </p>
                  </div>
                  {item.brand && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate font-medium ml-5">
                      {item.brand}
                    </p>
                  )}
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    {item.quantity || 0} {item.unit || 'units'}
                  </div>
                  {item.min_stock_level && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Min: {item.min_stock_level}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {lowStockItems.length > 5 && (
            <button
              onClick={handleViewStock}
              className="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
            >
              +{lowStockItems.length - 5} autres articles en stock faible
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-900/20 rounded-2xl flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500 dark:text-green-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Tous les stocks sont au niveau optimal
          </p>
        </div>
      )}

      {/* Footer Stats */}
      <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total produits</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">{totalItems}</span>
        </div>
      </div>
    </div>
  );
};

export default StockAlertsWidget;
