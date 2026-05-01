import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { usePaginatedFarmStockLevels } from '@/hooks/useFarmStockLevels';
import { useItems } from '@/hooks/useItems';
import { useWarehouses } from '@/hooks/useWarehouses';
import { Button } from '@/components/ui/button';
import { DataTablePagination, FilterBar, ListPageLayout, useServerTableState } from '@/components/ui/data-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatQuantity } from '@/utils/units';
import { StockValue } from '@/components/Stock/StockValue';

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

interface InventoryWarehouseStockLevel {
  warehouse_id: string;
  warehouse_name: string;
  item_id: string;
  total_quantity: number;
  total_value: number;
}

export default function InventoryStock() {
  const { t, i18n } = useTranslation('stock');
  const navigate = useNavigate();
  const { page, pageSize, search, setPage, setPageSize, setSearch } = useServerTableState({ defaultPageSize: 20 });
  const [selectedWarehouse, setSelectedWarehouse] = React.useState<string>('all');

  const { data: items = [], isLoading: itemsLoading } = useItems({ is_stock_item: true });
  const { data: warehouses = [] } = useWarehouses();
  const { data: stockLevelsResponse, isLoading: stockLoading } = usePaginatedFarmStockLevels({ page, pageSize });

  const stockLevels = React.useMemo<InventoryWarehouseStockLevel[]>(() => {
    const result: InventoryWarehouseStockLevel[] = [];

    stockLevelsResponse?.data.forEach((itemStock) => {
      itemStock.by_farm.forEach((warehouseStock) => {
        if (selectedWarehouse !== 'all' && warehouseStock.warehouse_id !== selectedWarehouse) {
          return;
        }

        result.push({
          item_id: itemStock.item_id,
          warehouse_id: warehouseStock.warehouse_id,
          warehouse_name: warehouseStock.warehouse_name,
          total_quantity: warehouseStock.total_quantity || 0,
          total_value: warehouseStock.total_value || 0,
        });
      });
    });

    return result;
  }, [selectedWarehouse, stockLevelsResponse?.data]);

  // Combine items with stock levels
  const inventoryData = React.useMemo(() => {
    const itemMap = new Map(items.map(item => [item.id, item]));
    const stockMap = new Map(
      stockLevels.map(stock => [`${stock.item_id}_${stock.warehouse_id}`, stock])
    );

    const result: InventoryStockLevel[] = [];

    // If we have stock data, show items with stock
    if ((stockLevelsResponse?.data.length ?? 0) > 0) {
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
    if (search) {
      const term = search.toLowerCase();
      return result.filter(item =>
        item.item_code.toLowerCase().includes(term) ||
        item.item_name.toLowerCase().includes(term) ||
        item.warehouse_name.toLowerCase().includes(term)
      );
    }

    return result;
  }, [items, search, stockLevels, stockLevelsResponse?.data.length, warehouses]);

  const totalItems = stockLevelsResponse?.total ?? 0;
  const totalPages = stockLevelsResponse?.totalPages ?? 0;

  const handleViewItem = (itemId: string) => {
    navigate({ to: '/stock/items', search: { itemId } });
  };

  const handleWarehouseChange = (value: string) => {
    setSelectedWarehouse(value);
    setPage(1);
  };

  if (itemsLoading || stockLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <ListPageLayout
      header={
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('inventoryStock.title')}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('inventoryStock.subtitle')}
          </p>
        </div>
      }
      filters={
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('inventoryStock.searchPlaceholder')}
          filters={[
            {
              key: 'warehouse',
              value: selectedWarehouse,
              onChange: handleWarehouseChange,
              options: [
                { value: 'all', label: t('inventoryStock.allWarehouses') },
                ...warehouses.map((warehouse) => ({
                  value: warehouse.id,
                  label: warehouse.name,
                })),
              ],
              className: 'w-full sm:w-52',
            },
          ]}
        />
      }
    >
      <div className="overflow-hidden rounded-lg border">
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
                    {formatQuantity(row.total_quantity, row.default_unit, i18n.language)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    <StockValue value={row.total_value} />
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
      <DataTablePagination
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </ListPageLayout>
  );
}
