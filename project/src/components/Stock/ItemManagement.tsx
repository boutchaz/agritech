import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useItems, useItemGroups, useCreateItem, useUpdateItem, useDeleteItem, useCreateItemGroup } from '@/hooks/useItems';
import { useItemSelection } from '@/hooks/useItems';
import { useCurrency } from '@/hooks/useCurrency';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const createItemGroup = useCreateItemGroup();
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !groupName.trim()) {
      toast.error(t('items.itemGroup.nameRequired'));
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
      toast.success(t('items.itemGroup.created'));
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
          <DrawerTitle>{t('items.itemGroup.title')}</DrawerTitle>
          <DrawerDescription>
            {t('items.itemGroup.description')}
          </DrawerDescription>
        </DrawerHeader>
        <form id="item-group-form" onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
          <div>
            <Label htmlFor="group_name">{t('items.itemGroup.name')} *</Label>
            <Input
              id="group_name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t('items.itemGroup.namePlaceholder')}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="group_code">{t('items.itemGroup.code')}</Label>
            <Input
              id="group_code"
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value)}
              placeholder={t('items.itemGroup.codePlaceholder')}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="group_description">{t('items.itemGroup.groupDescription')}</Label>
            <Input
              id="group_description"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder={t('items.itemGroup.descriptionPlaceholder')}
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
            {t('app.cancel')}
          </Button>
          <Button
            type="submit"
            form="item-group-form"
            disabled={createItemGroup.isPending}
          >
            {createItemGroup.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('items.itemGroup.creating')}
              </>
            ) : (
              t('items.itemGroup.createNew')
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function ItemForm({ item, open, onOpenChange }: ItemFormProps) {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { format: formatCurrency } = useCurrency();
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

  // Update formData when item changes (for edit mode) or reset for create mode
  useEffect(() => {
    if (item) {
      // Edit mode: populate with existing item data
      setFormData({
        organization_id: currentOrganization?.id || '',
        item_code: item.item_code || '',
        item_name: item.item_name || '',
        description: item.description || '',
        item_group_id: item.item_group_id || '',
        default_unit: item.default_unit || '',
        stock_uom: item.stock_uom || item.default_unit || '',
        standard_rate: item.standard_rate || undefined,
        is_active: item.is_active ?? true,
        is_sales_item: item.is_sales_item ?? true,
        is_purchase_item: item.is_purchase_item ?? true,
        is_stock_item: item.is_stock_item ?? true,
        maintain_stock: item.maintain_stock ?? true,
      });
    } else {
      // Create mode: reset to defaults
      setFormData({
        organization_id: currentOrganization?.id || '',
        item_code: '',
        item_name: '',
        description: '',
        item_group_id: itemGroups[0]?.id || '',
        default_unit: '',
        stock_uom: '',
        standard_rate: undefined,
        is_active: true,
        is_sales_item: true,
        is_purchase_item: true,
        is_stock_item: true,
        maintain_stock: true,
      });
    }
  }, [item, currentOrganization?.id, itemGroups]);

  // Update formData when itemGroups change (for create mode)
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
      toast.error(t('items.noOrganization'));
      return;
    }

    if (!formData.item_group_id) {
      toast.error(t('items.selectItemGroupError'));
      return;
    }

    if (!formData.default_unit) {
      toast.error(t('items.selectUnitError'));
      return;
    }

    try {
      if (item) {
        await updateItem.mutateAsync({ itemId: item.id, input: formData });
        toast.success(t('items.itemUpdated'));
      } else {
        await createItem.mutateAsync({
          ...formData,
          organization_id: currentOrganization.id,
        } as CreateItemInput);
        toast.success(t('items.itemCreated'));
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
          <DialogTitle>{item ? t('items.editItem') : t('items.createItem')}</DialogTitle>
          <DialogDescription>
            {item ? t('items.updateItemDescription') : t('items.createItemDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item_code">{t('items.itemCode')} *</Label>
              <Input
                id="item_code"
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                placeholder={t('items.itemCodePlaceholder')}
                disabled={!!item} // Don't allow editing code after creation
                className="mt-1"
              />
              {!item && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('items.itemCodeHint')}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="item_name">{t('items.itemName')} *</Label>
              <Input
                id="item_name"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                placeholder={t('items.itemNamePlaceholder')}
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="item_group_id">{t('items.itemGroup')} *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowGroupForm(true)}
                className="h-auto py-1 px-2 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                {t('items.itemGroup.createNew')}
              </Button>
            </div>
            {itemGroups.length === 0 ? (
              <div className="mt-1 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {t('items.itemGroup.noGroupsFound')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGroupForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('items.itemGroup.createFirst')}
                </Button>
              </div>
            ) : (
              <Select
                value={formData.item_group_id || ''}
                onValueChange={(value) => setFormData({ ...formData, item_group_id: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('items.selectItemGroup')} />
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
              <p className="text-xs text-red-600 mt-1">{t('items.itemGroupRequired')}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">{t('items.description')}</Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('items.descriptionPlaceholder')}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="default_unit">{t('items.defaultUnit')} *</Label>
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
                  {t('items.unit.manage')}
                </Button>
              </div>
              {workUnits.length === 0 ? (
                <div className="mt-1 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {t('items.unit.noUnitsFound')}
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
                    {t('items.unit.goToSettings')}
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
                    <SelectValue placeholder={t('items.selectUnit')} />
                  </SelectTrigger>
                  <SelectContent>
                    {workUnitsLoading ? (
                      <SelectItem value="_loading" disabled>
                        {t('items.unit.loadingUnits')}
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
                <p className="text-xs text-red-600 mt-1">{t('items.unitRequired')}</p>
              )}
            </div>

            <div>
              <Label htmlFor="standard_rate">{t('items.standardRate')}</Label>
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
              <span className="text-sm">{t('items.active')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_sales_item ?? true}
                onChange={(e) => setFormData({ ...formData, is_sales_item: e.target.checked })}
              />
              <span className="text-sm">{t('items.salesItem')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_purchase_item ?? true}
                onChange={(e) => setFormData({ ...formData, is_purchase_item: e.target.checked })}
              />
              <span className="text-sm">{t('items.purchaseItem')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_stock_item ?? true}
                onChange={(e) => setFormData({ ...formData, is_stock_item: e.target.checked })}
              />
              <span className="text-sm">{t('items.stockItem')}</span>
            </label>
          </div>

          {/* Current Stock Level Display (only when editing) */}
          {item && item.is_stock_item && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">{t('items.currentStockLevel')}</h4>
              </div>
              {stockLevelLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('items.loadingStockLevel')}
                </div>
              ) : itemStockLevel ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('items.totalQuantity')}:</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {itemStockLevel.total_quantity.toFixed(3)} {item.default_unit}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('items.totalValue')}:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(itemStockLevel.total_value)}
                    </span>
                  </div>
                  {itemStockLevel.warehouses.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('items.byWarehouse')}:</p>
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
                    {t('items.noStockAvailable')}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="mb-1">{t('items.toAddStock')}</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>{t('items.createStockEntry')}</li>
                      <li>{t('items.postEntry')}</li>
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
              {t('app.cancel')}
            </Button>
            <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
              {createItem.isPending || updateItem.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {item ? t('items.updating') : t('items.creating')}
                </>
              ) : (
                item ? t('items.editItem') : t('items.createItem')
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
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useItems({ is_active: true });
  const deleteItem = useDeleteItem();
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

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

  const handleDelete = (item: Item) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteItem.mutateAsync(itemToDelete.id);
      toast.success(t('items.itemDeleted'));
      setShowDeleteDialog(false);
      setItemToDelete(null);
    } catch (error: any) {
      toast.error(`Failed to delete item: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('items.title')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('items.subtitle')}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t('items.createItem')}
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
                  {t('items.itemCode')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('items.itemName')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('items.group')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('items.defaultUnit')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('items.standardRate')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('items.stockLevel')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('items.status')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('items.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    {t('items.noItemsFound')}
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
                        {item.standard_rate ? formatCurrency(item.standard_rate) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                        {stockLevel ? (
                          <div className="flex flex-col items-end">
                            <span className="font-medium">
                              {stockLevel.total_quantity.toFixed(3)} {item.default_unit}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatCurrency(stockLevel.total_value)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">{t('items.noStock')}</span>
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
                          {item.is_active ? t('items.active') : t('items.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate({ to: '/stock/inventory/stock' })}
                            className="text-blue-600 hover:text-blue-700"
                            title={t('items.viewInventory')}
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('items.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('items.deleteConfirmation')} <strong>"{itemToDelete?.item_name}"</strong>?
              <br />
              <span className="text-red-600 dark:text-red-400">
                {t('items.deleteWarning')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('app.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteItem.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('items.deleting')}
                </>
              ) : (
                t('items.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

