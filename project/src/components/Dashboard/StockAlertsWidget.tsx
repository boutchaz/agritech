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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          Stock & Inventaire
        </h3>
        <button
          onClick={handleViewStock}
          className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
        >
          Voir tout
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Alertes</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {lowStockItems.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            stock faible
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">OK</span>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {healthyStock}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            en stock
          </div>
        </div>
      </div>

      {/* Low Stock Items */}
      {lowStockItems.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
            <TrendingDown className="h-4 w-4 text-amber-600" />
            Stock faible
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {lowStockItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.name}
                    </p>
                  </div>
                  {item.brand && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.brand}
                    </p>
                  )}
                </div>
                <div className="text-right ml-2">
                  <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {item.quantity || 0} {item.unit || 'units'}
                  </div>
                  {item.min_stock_level && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
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
              className="mt-2 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400"
            >
              +{lowStockItems.length - 5} autres articles en stock faible
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-300" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tous les stocks sont au niveau optimal
          </p>
        </div>
      )}

      {/* Footer Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Total produits:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{totalItems}</span>
        </div>
      </div>
    </div>
  );
};

export default StockAlertsWidget;
