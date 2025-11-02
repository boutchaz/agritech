import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { useItems } from '@/hooks/useItems';
import { useWarehouses } from '@/hooks/useWarehouses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Package, Search, ExternalLink, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

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

export default function InventoryStock() {
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedWarehouse, setSelectedWarehouse] = React.useState<string>('all');

  const { data: items = [], isLoading: itemsLoading } = useItems({ is_stock_item: true });
  const { data: warehouses = [] } = useWarehouses();

  // Fetch stock levels aggregated from stock_valuation
  const { data: stockLevels = [], isLoading: stockLoading } = useQuery({
    queryKey: ['inventory-stock-levels', currentOrganization?.id, selectedWarehouse],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      // For now, we'll aggregate from stock_valuation table
      // Note: After migration, stock_valuation.item_id should reference items table
      let query = supabase
        .from('stock_valuation')
        .select(`
          item_id,
          warehouse_id,
          quantity,
          remaining_quantity,
          cost_per_unit,
          total_cost,
          warehouse:warehouses(id, name)
        `)
        .eq('organization_id', currentOrganization.id)
        .gt('remaining_quantity', 0);

      if (selectedWarehouse !== 'all') {
        query = query.eq('warehouse_id', selectedWarehouse);
      }

      const { data, error } = await query;

      if (error) {
        // If stock_valuation doesn't exist or has errors, return empty array
        console.warn('Could not fetch stock valuation:', error);
        return [];
      }

      // Group by item_id and warehouse_id
      const grouped = (data || []).reduce((acc, val) => {
        const key = `${val.item_id}_${val.warehouse_id}`;
        if (!acc[key]) {
          acc[key] = {
            item_id: val.item_id,
            warehouse_id: val.warehouse_id,
            warehouse_name: (val.warehouse as any)?.name || 'Unknown',
            total_quantity: 0,
            total_value: 0,
          };
        }
        acc[key].total_quantity += parseFloat(val.remaining_quantity || 0);
        acc[key].total_value += parseFloat(val.total_cost || val.remaining_quantity * val.cost_per_unit || 0);
        return acc;
      }, {} as Record<string, any>);

      return Object.values(grouped);
    },
    enabled: !!currentOrganization?.id,
  });

  // Combine items with stock levels
  const inventoryData = React.useMemo(() => {
    const itemMap = new Map(items.map(item => [item.id, item]));
    const stockMap = new Map(
      (stockLevels as any[]).map(stock => [`${stock.item_id}_${stock.warehouse_id}`, stock])
    );

    const result: InventoryStockLevel[] = [];

    // If we have stock data, show items with stock
    if (stockLevels.length > 0) {
      (stockLevels as any[]).forEach(stock => {
        const item = itemMap.get(stock.item_id);
        if (item) {
          result.push({
            item_id: item.id,
            item_code: item.item_code,
            item_name: item.item_name,
            item_group: (item.item_group as any)?.name || '-',
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
            item_group: (item.item_group as any)?.name || '-',
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
          <h2 className="text-2xl font-bold">Inventory Stock</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View stock levels across all warehouses
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by item code, name, or warehouse..."
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
          <option value="all">All Warehouses</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>
              {wh.name}
            </option>
          ))}
        </select>
      </div>

      {/* Inventory Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                Item Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                Item Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                Group
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                Warehouse
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                Quantity
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                Value
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {inventoryData.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  {items.length === 0
                    ? 'No stock items found. Create items first.'
                    : 'No stock levels found. Make stock entries to see inventory.'}
                </td>
              </tr>
            ) : (
              inventoryData.map((row) => (
                <tr key={`${row.item_id}_${row.warehouse_id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {row.item_code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {row.item_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {row.item_group}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {row.warehouse_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    {row.total_quantity.toFixed(3)} {row.default_unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    ₪{row.total_value.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.total_quantity === 0 ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Out of Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewItem(row.item_id)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View Item
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

