import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useItems } from '@/hooks/useItems';
import { useWarehouses } from '@/hooks/useWarehouses';
import { itemsApi, type ItemStockLevelsResponse, type ItemStockLevelWarehouse } from '@/lib/api/items';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/Input';
import { Search, ExternalLink, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

interface InventoryStockLevel {
  item_id: string;
  item_code: string;
  item_name: string;
  item_group: string;
  default_unit: string;
  warehouse_id: string;
  warehouse_name: string;
  total_quantity: number;
  total_value: number;
}

interface InventoryWarehouseStockLevel extends Pick<ItemStockLevelWarehouse, 'warehouse_id' | 'warehouse_name'> {
  item_id: string;
  total_quantity: number;
  total_value: number;
}

export default function InventoryStock() {
  const { t } = useTranslation('stock');
  const { currentOrganization } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedWarehouse, setSelectedWarehouse] = React.useState<string>('all');

  const { data: items = [], isLoading: itemsLoading } = useItems({ is_stock_item: true });
  const { data: warehouses = [] } = useWarehouses();

  // Fetch stock levels using NestJS API
  const { data: stockLevelsData = {}, isLoading: stockLoading } = useQuery<ItemStockLevelsResponse>({
    queryKey: ['inventory-stock-levels', currentOrganization?.id, selectedWarehouse],
    queryFn: async () => {
      if (!currentOrganization?.id) return {};

       try {
         // Use the items API stock-levels endpoint which aggregates stock by item and warehouse
          const filters = {} as Record<string, never>;
         // Note: The API returns data grouped by item_id with warehouse details
         // We need to transform it to match the expected format
         const stockData = await itemsApi.getStockLevels(filters, currentOrganization.id);
         return stockData;
       } catch (_error) {
         return {};
       }
    },
    enabled: !!currentOrganization?.id,
  });

  // Transform stock levels data to match the expected format
  const stockLevels = React.useMemo<InventoryWarehouseStockLevel[]>(() => {
    const result: InventoryWarehouseStockLevel[] = [];

    Object.entries(stockLevelsData).forEach(([itemId, itemStock]) => {
      if (itemStock.warehouses && Array.isArray(itemStock.warehouses)) {
        itemStock.warehouses.forEach((wh) => {
          // Filter by selected warehouse if not 'all'
          if (selectedWarehouse !== 'all' && wh.warehouse_id !== selectedWarehouse) {
            return;
          }

          result.push({
            item_id: itemId,
            warehouse_id: wh.warehouse_id,
            warehouse_name: wh.warehouse_name,
            total_quantity: wh.quantity || 0,
            total_value: wh.value || 0,
          });
        });
      }
    });

    return result;
  }, [stockLevelsData, selectedWarehouse]);

  // Combine items with stock levels
  const inventoryData = React.useMemo(() => {
    const itemMap = new Map(items.map(item => [item.id, item]));
    const stockMap = new Map(
      stockLevels.map(stock => [`${stock.item_id}_${stock.warehouse_id}`, stock])
    );

    const result: InventoryStockLevel[] = [];

    // If we have stock data, show items with stock
    if (stockLevels.length > 0) {
      stockLevels.forEach(stock => {
        const item = itemMap.get(stock.item_id);
        if (item) {
          result.push({
            item_id: item.id,
            item_code: item.item_code,
            item_name: item.item_name,
            item_group: item.item_group?.name || '-',
            default_unit: item.default_unit,
            warehouse_id: stock.warehouse_id,
            warehouse_name: stock.warehouse_name,
            total_quantity: stock.total_quantity,
            total_value: stock.total_value,
          });
        }
      });
    } else {
      // If no stock data, show all stock items
      items.forEach(item => {
        warehouses.forEach(warehouse => {
          const stock = stockMap.get(`${item.id}_${warehouse.id}`);
          result.push({
            item_id: item.id,
            item_code: item.item_code,
            item_name: item.item_name,
            item_group: item.item_group?.name || '-',
            default_unit: item.default_unit,
            warehouse_id: warehouse.id,
            warehouse_name: warehouse.name,
            total_quantity: stock?.total_quantity || 0,
            total_value: stock?.total_value || 0,
          });
        });
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return result.filter(item =>
        item.item_code.toLowerCase().includes(term) ||
        item.item_name.toLowerCase().includes(term) ||
        item.warehouse_name.toLowerCase().includes(term)
      );
    }

    return result;
  }, [items, stockLevels, warehouses, searchTerm]);

  const handleViewItem = (itemId: string) => {
    navigate({ to: '/stock/items', search: { itemId } });
  };

  if (itemsLoading || stockLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('inventoryStock.title')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('inventoryStock.subtitle')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('inventoryStock.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">{t('inventoryStock.allWarehouses')}</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>
              {wh.name}
            </option>
          ))}
        </select>
      </div>

      {/* Inventory Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table className="w-full">
          <TableHeader className="bg-gray-50 dark:bg-gray-800 border-b">
            <TableRow>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                {t('inventoryStock.table.itemCode')}
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                {t('inventoryStock.table.itemName')}
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                {t('inventoryStock.table.group')}
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                {t('inventoryStock.table.warehouse')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                {t('inventoryStock.table.quantity')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                {t('inventoryStock.table.value')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                {t('inventoryStock.table.status')}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                {t('inventoryStock.table.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
            {inventoryData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  {items.length === 0
                    ? t('inventoryStock.noItemsFound')
                    : t('inventoryStock.noStockLevels')}
                </TableCell>
              </TableRow>
            ) : (
              inventoryData.map((row) => (
                <TableRow key={`${row.item_id}_${row.warehouse_id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {row.item_code}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {row.item_name}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {row.item_group}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {row.warehouse_name}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    {row.total_quantity.toFixed(3)} {row.default_unit}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    {formatCurrency(row.total_value)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {row.total_quantity === 0 ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {t('inventoryStock.outOfStock')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t('inventoryStock.inStock')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewItem(row.item_id)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      {t('inventoryStock.viewItem')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
