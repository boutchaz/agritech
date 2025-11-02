import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useItems, useItemGroups, useCreateItem, useUpdateItem, useDeleteItem, useCreateItemGroup } from '@/hooks/useItems';
import { useItemSelection } from '@/hooks/useItems';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Plus, Trash2, Pencil, Package, Loader2, ExternalLink, Eye } from 'lucide-react';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Item, CreateItemInput, UpdateItemInput, CreateItemGroupInput } from '@/types/items';
import type { WorkUnit } from '@/types/work-units';

interface ItemFormProps {
  item?: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ItemGroupForm({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess?: () => void }) {
  const { currentOrganization } = useAuth();
  const createItemGroup = useCreateItemGroup();
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !groupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      await createItemGroup.mutateAsync({
        organization_id: currentOrganization.id,
        name: groupName.trim(),
        code: groupCode.trim() || undefined,
        description: groupDescription.trim() || undefined,
        is_active: true,
      });
      toast.success('Item group created successfully');
      setGroupName('');
      setGroupCode('');
      setGroupDescription('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(`Failed to create item group: ${error.message}`);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="max-w-md">
        <DrawerHeader>
          <DrawerTitle>Create Item Group</DrawerTitle>
          <DrawerDescription>
            Create a new item group to organize your items
          </DrawerDescription>
        </DrawerHeader>
        <form id="item-group-form" onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
          <div>
            <Label htmlFor="group_name">Group Name *</Label>
            <Input
              id="group_name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Crops, Livestock, Equipment"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="group_code">Group Code</Label>
            <Input
              id="group_code"
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value)}
              placeholder="Optional code"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="group_description">Description</Label>
            <Input
              id="group_description"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Optional description"
              className="mt-1"
            />
          </div>
        </form>
        <DrawerFooter className="px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createItemGroup.isPending}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            form="item-group-form"
            disabled={createItemGroup.isPending}
          >
            {createItemGroup.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Group'
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function ItemForm({ item, open, onOpenChange }: ItemFormProps) {
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const { data: itemGroups = [], refetch: refetchGroups } = useItemGroups();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const [showGroupForm, setShowGroupForm] = useState(false);

  // Fetch work units
  const { data: workUnits = [], isLoading: workUnitsLoading } = useQuery({
    queryKey: ['work-units', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from('work_units')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('unit_category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as WorkUnit[];
    },
    enabled: !!currentOrganization?.id,
  });

  // Fetch current stock level for this item (only when editing)
  const { data: itemStockLevel, isLoading: stockLevelLoading } = useQuery({
    queryKey: ['item-stock-level', item?.id, currentOrganization?.id],
    queryFn: async () => {
      if (!item?.id || !currentOrganization?.id) return null;

      // First try stock_valuation (preferred source)
      const { data: valuationData, error: valuationError } = await supabase
        .from('stock_valuation')
        .select(`
          item_id,
          warehouse_id,
          remaining_quantity,
          total_cost,
          warehouse:warehouses(id, name)
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('item_id', item.id)
        .gt('remaining_quantity', 0);

      if (valuationError) {
        console.warn('Could not fetch from stock_valuation:', valuationError);
      }

      // If stock_valuation has data, use it
      if (valuationData && valuationData.length > 0) {
        const aggregated = valuationData.reduce((acc, val) => {
          acc.total_quantity += parseFloat(val.remaining_quantity || 0);
          acc.total_value += parseFloat(val.total_cost || 0);
          acc.warehouses.push({
            warehouse_id: val.warehouse_id,
            warehouse_name: (val.warehouse as any)?.name || 'Unknown',
            quantity: parseFloat(val.remaining_quantity || 0),
            value: parseFloat(val.total_cost || 0),
          });
          return acc;
        }, {
          total_quantity: 0,
          total_value: 0,
          warehouses: [] as Array<{
            warehouse_id: string;
            warehouse_name: string;
            quantity: number;
            value: number;
          }>,
        });

        if (aggregated.total_quantity > 0) {
          return aggregated;
        }
      }

      // Fallback: Check stock_movements to see if there are any entries
      // This helps identify if stock entries exist but weren't properly processed
      const { data: movementsData } = await supabase
        .from('stock_movements')
        .select('id, warehouse_id, quantity')
        .eq('organization_id', currentOrganization.id)
        .eq('item_id', item.id)
        .limit(1);

      // If there are movements but no valuation, the stock entry might not be posted
      if (movementsData && movementsData.length > 0) {
        console.info('Stock movements exist but no valuation found. Ensure stock entries are Posted.');
      }

      return null;
    },
    enabled: !!item?.id && !!currentOrganization?.id && !!item?.is_stock_item,
  });

  const [formData, setFormData] = useState<CreateItemInput | UpdateItemInput>({
    organization_id: currentOrganization?.id || '',
    item_code: item?.item_code || '',
    item_name: item?.item_name || '',
    description: item?.description || '',
    item_group_id: item?.item_group_id || itemGroups[0]?.id || '',
    default_unit: item?.default_unit || '',
    stock_uom: item?.stock_uom || item?.default_unit || '',
    is_active: item?.is_active ?? true,
    is_sales_item: item?.is_sales_item ?? true,
    is_purchase_item: item?.is_purchase_item ?? true,
    is_stock_item: item?.is_stock_item ?? true,
    maintain_stock: item?.maintain_stock ?? true,
  });

  // Update formData when itemGroups change
  useEffect(() => {
    if (!item && itemGroups.length > 0 && !formData.item_group_id) {
      setFormData((prev) => ({ ...prev, item_group_id: itemGroups[0].id }));
    }
  }, [itemGroups, item, formData.item_group_id]);

  const handleGroupCreated = async () => {
    const { data: updatedGroups } = await refetchGroups();
    if (updatedGroups && updatedGroups.length > 0) {
      // Select the most recently created group (last in array)
      const latestGroup = updatedGroups[updatedGroups.length - 1];
      setFormData((prev) => ({ ...prev, item_group_id: latestGroup.id }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) {
      toast.error('No organization selected');
      return;
    }

    if (!formData.item_group_id) {
      toast.error('Please select an item group');
      return;
    }

    if (!formData.default_unit) {
      toast.error('Please select a default unit');
      return;
    }

    try {
      if (item) {
        await updateItem.mutateAsync({ itemId: item.id, input: formData });
        toast.success('Item updated successfully');
      } else {
        await createItem.mutateAsync({
          ...formData,
          organization_id: currentOrganization.id,
        } as CreateItemInput);
        toast.success('Item created successfully');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to ${item ? 'update' : 'create'} item: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Create Item'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update item details' : 'Create a new item for stock management'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item_code">Item Code *</Label>
              <Input
                id="item_code"
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                placeholder="OLIV-FRUIT-001"
                disabled={!!item} // Don't allow editing code after creation
                className="mt-1"
              />
              {!item && (
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to auto-generate
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="item_name">Item Name *</Label>
              <Input
                id="item_name"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                placeholder="Olives - Picholine"
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="item_group_id">Item Group *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowGroupForm(true)}
                className="h-auto py-1 px-2 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Create Group
              </Button>
            </div>
            {itemGroups.length === 0 ? (
              <div className="mt-1 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  No item groups found. Create one to continue.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGroupForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Item Group
                </Button>
              </div>
            ) : (
              <Select
                value={formData.item_group_id || ''}
                onValueChange={(value) => setFormData({ ...formData, item_group_id: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select item group" />
                </SelectTrigger>
                <SelectContent>
                  {itemGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.path || group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!formData.item_group_id && itemGroups.length > 0 && (
              <p className="text-xs text-red-600 mt-1">Item group is required</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Item description"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="default_unit">Default Unit *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    navigate({ to: '/settings/work-units' });
                  }}
                  className="h-auto py-1 px-2 text-xs"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Manage Units
                </Button>
              </div>
              {workUnits.length === 0 ? (
                <div className="mt-1 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    No work units found. Create units in settings first.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      navigate({ to: '/settings/work-units' });
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Go to Work Units Settings
                  </Button>
                </div>
              ) : (
                <Select
                  value={formData.default_unit || ''}
                  onValueChange={(value) => {
                    const selectedUnit = workUnits.find((u) => u.code === value);
                    setFormData({
                      ...formData,
                      default_unit: selectedUnit?.code || value,
                      stock_uom: selectedUnit?.code || value,
                    });
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {workUnitsLoading ? (
                      <SelectItem value="_loading" disabled>
                        Loading units...
                      </SelectItem>
                    ) : (
                      workUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.code}>
                          {unit.code} - {unit.name}
                          {unit.unit_category && ` (${unit.unit_category})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              {!formData.default_unit && workUnits.length > 0 && (
                <p className="text-xs text-red-600 mt-1">Unit is required</p>
              )}
            </div>

            <div>
              <Label htmlFor="standard_rate">Standard Rate</Label>
              <Input
                id="standard_rate"
                type="number"
                step="0.01"
                value={formData.standard_rate || ''}
                onChange={(e) => setFormData({ ...formData, standard_rate: parseFloat(e.target.value) || undefined })}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active ?? true}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span className="text-sm">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_sales_item ?? true}
                onChange={(e) => setFormData({ ...formData, is_sales_item: e.target.checked })}
              />
              <span className="text-sm">Sales Item</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_purchase_item ?? true}
                onChange={(e) => setFormData({ ...formData, is_purchase_item: e.target.checked })}
              />
              <span className="text-sm">Purchase Item</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_stock_item ?? true}
                onChange={(e) => setFormData({ ...formData, is_stock_item: e.target.checked })}
              />
              <span className="text-sm">Stock Item</span>
            </label>
          </div>

          {/* Current Stock Level Display (only when editing) */}
          {item && item.is_stock_item && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Current Stock Level</h4>
              </div>
              {stockLevelLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading stock level...
                </div>
              ) : itemStockLevel ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Quantity:</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {itemStockLevel.total_quantity.toFixed(3)} {item.default_unit}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Value:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      ₪{itemStockLevel.total_value.toFixed(2)}
                    </span>
                  </div>
                  {itemStockLevel.warehouses.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">By Warehouse:</p>
                      <div className="space-y-1">
                        {itemStockLevel.warehouses.map((wh) => (
                          <div key={wh.warehouse_id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">{wh.warehouse_name}:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {wh.quantity.toFixed(3)} {item.default_unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No stock available for this item
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="mb-1">To add stock:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Create a Stock Entry (Material Receipt)</li>
                      <li>Post the entry to update stock levels</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createItem.isPending || updateItem.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
              {createItem.isPending || updateItem.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {item ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                item ? 'Update Item' : 'Create Item'
              )}
            </Button>
          </div>
        </form>
        <ItemGroupForm
          open={showGroupForm}
          onOpenChange={setShowGroupForm}
          onSuccess={handleGroupCreated}
        />
      </DialogContent>
    </Dialog>
  );
}

export default function ItemManagement() {
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useItems({ is_active: true });
  const deleteItem = useDeleteItem();
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Fetch stock levels for items
  const { data: stockLevels = [] } = useQuery({
    queryKey: ['items-stock-levels', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from('stock_valuation')
        .select(`
          item_id,
          remaining_quantity,
          total_cost
        `)
        .eq('organization_id', currentOrganization.id)
        .gt('remaining_quantity', 0);

      if (error) {
        console.warn('Could not fetch stock levels:', error);
        return [];
      }

      // Aggregate by item_id
      const aggregated = (data || []).reduce((acc, val) => {
        if (!acc[val.item_id]) {
          acc[val.item_id] = { total_quantity: 0, total_value: 0 };
        }
        acc[val.item_id].total_quantity += parseFloat(val.remaining_quantity || 0);
        acc[val.item_id].total_value += parseFloat(val.total_cost || 0);
        return acc;
      }, {} as Record<string, { total_quantity: number; total_value: number }>);

      return aggregated;
    },
    enabled: !!currentOrganization?.id,
  });

  const handleEdit = (item: Item) => {
    setSelectedItem(item);
    setShowForm(true);
  };

  const handleCreate = () => {
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleDelete = async (item: Item) => {
    if (!confirm(`Are you sure you want to delete "${item.item_name}"?`)) {
      return;
    }

    try {
      await deleteItem.mutateAsync(item.id);
      toast.success('Item deleted successfully');
    } catch (error: any) {
      toast.error(`Failed to delete item: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Item Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage items for stock, sales, and purchasing
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Item
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
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
                  Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                  Standard Rate
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                  Stock Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    No items found. Create your first item to get started.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const stockLevel = (stockLevels as Record<string, { total_quantity: number; total_value: number }>)[item.id];
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {item.item_code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.item_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {(item.item_group as any)?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {item.default_unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.standard_rate ? `₪${item.standard_rate.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                        {stockLevel ? (
                          <div className="flex flex-col items-end">
                            <span className="font-medium">
                              {stockLevel.total_quantity.toFixed(3)} {item.default_unit}
                            </span>
                            <span className="text-xs text-gray-500">
                              ₪{stockLevel.total_value.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No stock</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate({ to: '/stock/inventory/stock' })}
                            className="text-blue-600 hover:text-blue-700"
                            title="View Inventory"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <ItemForm item={selectedItem} open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}

