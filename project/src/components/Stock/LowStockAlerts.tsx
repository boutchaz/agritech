
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Package, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFarmStockLevels } from '@/hooks/useFarmStockLevels';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';

interface LowStockAlertsProps {
  farm_id?: string;
  maxItems?: number;
  showActions?: boolean;
}

export default function LowStockAlerts({
  farm_id,
  maxItems = 10,
  showActions = true,
}: LowStockAlertsProps) {
  const { t } = useTranslation('stock');
  const navigate = useNavigate();
  const { format: formatCurrency } = useCurrency();

  const { data: lowStockItems = [], isLoading } = useFarmStockLevels({
    farm_id,
    low_stock_only: true,
  });

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (lowStockItems.length === 0) {
    return (
      <div className="p-6 border rounded-lg bg-green-50 dark:bg-green-900/10">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <Package className="w-5 h-5" />
          <p className="font-medium">{t('stock.lowStockAlerts.allOptimal', 'All stock levels are optimal')}</p>
        </div>
      </div>
    );
  }

  const displayItems = lowStockItems.slice(0, maxItems);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t('stock.lowStockAlerts.title', 'Low Stock Alerts')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {lowStockItems.length} {t('stock.lowStockAlerts.itemsBelowMinimum', 'item(s) below minimum stock level')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {displayItems.map((item) => (
          <div
            key={item.item_id}
            className="p-4 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {item.item_name}
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({item.item_code})
                  </span>
                </div>

                <div className="ml-6 space-y-1">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('stock.lowStockAlerts.currentStock', 'Current Stock')}:
                    </span>
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      {parseFloat(item.total_quantity.toFixed(3))} {item.default_unit}
                    </span>
                  </div>

                  {item.minimum_stock_level && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('stock.lowStockAlerts.minimumLevel', 'Minimum Level')}:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {item.minimum_stock_level} {item.default_unit}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('stock.lowStockAlerts.totalValue', 'Total Value')}:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.total_value)}
                    </span>
                  </div>

                  {item.by_farm.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('stock.lowStockAlerts.byFarm', 'By Farm/Warehouse')}:
                      </p>
                      <div className="space-y-1">
                        {item.by_farm.map((farmStock) => (
                          <div
                            key={farmStock.warehouse_id}
                            className="text-xs text-gray-600 dark:text-gray-400"
                          >
                            <span className="font-medium">
                              {farmStock.warehouse_name}
                              {farmStock.farm_name && ` (${farmStock.farm_name})`}:
                            </span>{' '}
                            <span className={farmStock.is_low_stock ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                              {parseFloat(farmStock.total_quantity.toFixed(3))} {item.default_unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {showActions && (
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-slate-900 dark:text-slate-100"
                    onClick={() =>
                      navigate({
                        to: '/stock/entries',
                        search: { type: 'Material Receipt', item_id: item.item_id },
                      })
                    }
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {t('stock.lowStockAlerts.addStock', 'Add Stock')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-900 dark:text-slate-100"
                    onClick={() =>
                      navigate({
                        to: '/stock/items/$itemId',
                        params: { itemId: item.item_id },
                      })
                    }
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {t('stock.lowStockAlerts.viewItem', 'View Item')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {lowStockItems.length > maxItems && (
        <div className="text-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/stock/items', search: { low_stock_only: 'true' } })}
          >
            {t('stock.lowStockAlerts.viewAll', 'View all {{count}} low stock items', {
              count: lowStockItems.length,
            })}
          </Button>
        </div>
      )}
    </div>
  );
}

