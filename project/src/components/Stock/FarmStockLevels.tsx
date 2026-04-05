import { Package, Warehouse, Building2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFarmStockLevels } from '@/hooks/useFarmStockLevels';
import { useTranslation } from 'react-i18next';
import { localizeUnit } from '@/lib/utils/unit-localization';

interface FarmStockLevelsProps {
  item_id?: string;
  farm_id?: string;
  showWarehouseDetails?: boolean;
}

export default function FarmStockLevels({
  item_id,
  farm_id,
  showWarehouseDetails = true,
}: FarmStockLevelsProps) {
  const { t, i18n } = useTranslation('stock');

  const { data: stockLevels = [], isLoading } = useFarmStockLevels({
    item_id,
    farm_id,
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

  if (stockLevels.length === 0) {
    return (
      <div className="p-6 border rounded-lg text-center">
        <Package className="w-12 h-12 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('stock.farmStockLevels.noStock', 'No stock levels found')}
        </p>
      </div>
    );
  }

  // Group by farm
  const farmMap = new Map<string, typeof stockLevels[0]['by_farm']>();
  stockLevels.forEach((item) => {
    item.by_farm.forEach((farmStock) => {
      const farmKey = farmStock.farm_id || 'no-farm';
      if (!farmMap.has(farmKey)) {
        farmMap.set(farmKey, []);
      }
      farmMap.get(farmKey)!.push(farmStock);
    });
  });

  return (
    <div className="space-y-4">
      {Array.from(farmMap.entries()).map(([farmKey, farmStocks]) => {
        const firstStock = farmStocks[0];
        const farmName = firstStock.farm_name || t('stock.farmStockLevels.noFarm', 'No Farm');
        const farmId = firstStock.farm_id;

        // Calculate totals for this farm
        const totalQuantity = farmStocks.reduce((sum, s) => sum + s.total_quantity, 0);

        return (
          <div key={farmKey} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{farmName}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {farmStocks.length} {t('stock.farmStockLevels.warehouses', 'warehouse(s)')}
                  </p>
                </div>
              </div>
              {farmId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    // Navigate to farms page - adjust route as needed
                    window.location.href = `/farms?farmId=${farmId}`;
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {t('stock.farmStockLevels.viewFarm', 'View Farm')}
                </Button>
              )}
            </div>

            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('stock.farmStockLevels.totalStock', 'Total Stock')}:
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {parseFloat(totalQuantity.toFixed(3))} {localizeUnit(stockLevels[0]?.default_unit, i18n.language)}
                </span>
              </div>
            </div>

            {showWarehouseDetails && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t('stock.farmStockLevels.byWarehouse', 'By Warehouse')}:
                </p>
                {farmStocks.map((warehouseStock) => (
                  <div
                    key={warehouseStock.warehouse_id}
                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Warehouse className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {warehouseStock.warehouse_name}
                        </p>
                        {warehouseStock.is_low_stock && (
                          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3" />
                            {t('stock.farmStockLevels.lowStock', 'Low Stock')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {parseFloat(warehouseStock.total_quantity.toFixed(3))} {localizeUnit(stockLevels[0]?.default_unit, i18n.language)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

