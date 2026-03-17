import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useItems,
  useItemGroups,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useCreateItemGroup,
  useItemVariants,
  useCreateItemVariant,
  useUpdateItemVariant,
  useDeleteItemVariant,
} from '@/hooks/useItems';
import { useCurrency } from '@/hooks/useCurrency';
import { useFarms } from '@/hooks/useParcelsQuery';
import { useFormErrors } from '@/hooks/useFormErrors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Trash2, Pencil, Package, Loader2, ExternalLink, Eye, AlertTriangle, Filter, ShoppingBag, Layers } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from '@tanstack/react-router';
import { itemsApi } from '@/lib/api/items';
import { marketplaceCategoriesApi } from '@/lib/api/marketplace-categories';
import { toast } from 'sonner';
import type { Item, CreateItemInput, ProductVariant } from '@/types/items';
import type { WorkUnit } from '@/types/work-units';
import LowStockAlerts from './LowStockAlerts';
import FarmStockLevels from './FarmStockLevels';
import ItemFarmUsage from './ItemFarmUsage';
import ProductImageUpload from './ProductImageUpload';

// Zod schema for item form validation
const itemFormSchema = z.object({
  item_code: z.string().min(1, 'Item code is required'),
  item_name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  item_group_id: z.string().min(1, 'Item group is required'),
  default_unit: z.string().min(1, 'Default unit is required'),
  stock_uom: z.string().optional(),
  standard_rate: z.number().min(0, 'Standard rate must be non-negative').optional(),
  minimum_stock_level: z.number().min(0, 'Minimum stock level must be non-negative').optional(),
  is_active: z.boolean().optional(),
  is_sales_item: z.boolean().optional(),
  is_purchase_item: z.boolean().optional(),
  is_stock_item: z.boolean().optional(),
  images: z.array(z.any()).optional(),
  website_description: z.string().optional(),
  marketplace_category_slug: z.string().optional(),
  show_in_website: z.boolean().optional(),
});

type ItemFormData = z.infer<typeof itemFormSchema>;

// Zod schema for product variant form validation
const productVariantSchema = z.object({
  variant_name: z.string().min(1, 'Variant name is required'),
  variant_sku: z.string().optional(),
  unit_id: z.string().uuid('Invalid unit ID').optional(),
  quantity: z.number().min(0, 'Quantity must be non-negative').optional(),
  min_stock_level: z.number().min(0, 'Minimum stock level must be non-negative').optional(),
  standard_rate: z.number().min(0, 'Standard rate must be non-negative').optional(),
  barcode: z.string().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
});

type ProductVariantFormData = z.infer<typeof productVariantSchema>;

interface ItemFormProps {
  item?: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ItemVariantsDialogProps {
  item: Item | null;
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
  const { data: itemGroups = [], refetch: refetchGroups } = useItemGroups({ is_active: true });
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const { handleFormError } = useFormErrors<ItemFormData>();
  const [showGroupForm, setShowGroupForm] = useState(false);

  const {
    register,
    handleSubmit: handleFormSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      item_code: '',
      item_name: '',
      description: '',
      item_group_id: '',
      default_unit: '',
      stock_uom: '',
      standard_rate: undefined,
      minimum_stock_level: undefined,
      is_active: true,
      is_sales_item: true,
      is_purchase_item: true,
      is_stock_item: true,
      images: [],
      website_description: '',
      marketplace_category_slug: '',
      show_in_website: false,
    },
  });

  // Fetch work units - Note: This is reference data, keeping direct Supabase call for now
  // TODO: Migrate to NestJS API when work_units endpoint is available
  const { data: workUnits = [], isLoading: workUnitsLoading } = useQuery({
    queryKey: ['work-units', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { apiClient } = await import('../../lib/api-client');
      const data = await apiClient.get<WorkUnit[]>(
        '/api/v1/work-units?is_active=true&orderBy=unit_category&order=asc',
        {},
        currentOrganization.id,
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: !!currentOrganization?.id,
  });

  // Fetch marketplace categories from Strapi CMS
  const { data: marketplaceCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['marketplace-categories'],
    queryFn: async () => {
      try {
        const response = await marketplaceCategoriesApi.getAll(undefined, currentOrganization?.id);
        return response.data || [];
      } catch (error) {
        console.error('[ERROR] Could not fetch marketplace categories:', error);
        toast.error('Could not load categories. Please check backend connection.');
        return [];
      }
    },
    enabled: !!currentOrganization?.id,
  });

  // Fetch current stock level for this item (only when editing)
  const { data: itemStockLevel, isLoading: stockLevelLoading } = useQuery({
    queryKey: ['item-stock-level', item?.id, currentOrganization?.id],
    queryFn: async () => {
      if (!item?.id || !currentOrganization?.id) return null;

      try {
        const stockData = await itemsApi.getStockLevels(
          { item_id: item.id },
          currentOrganization.id,
        );

        // Transform API response to match expected format
        const itemStock = stockData[item.id];
        if (itemStock && itemStock.total_quantity > 0) {
         return {
           total_quantity: itemStock.total_quantity,
           total_value: itemStock.total_value,
           warehouses: itemStock.warehouses || [],
         };
       }

       return null;
     } catch (_error) {
       return null;
     }
    },
    enabled: !!item?.id && !!currentOrganization?.id && !!item?.is_stock_item,
  });

  const firstItemGroupId = itemGroups[0]?.id;

  useEffect(() => {
    if (item) {
      reset({
        item_code: item.item_code || '',
        item_name: item.item_name || '',
        description: item.description || '',
        item_group_id: item.item_group_id || '',
        default_unit: item.default_unit || '',
        stock_uom: item.stock_uom || item.default_unit || '',
        standard_rate: item.standard_rate || undefined,
        minimum_stock_level: item.minimum_stock_level || undefined,
        is_active: item.is_active ?? true,
        is_sales_item: item.is_sales_item ?? true,
        is_purchase_item: item.is_purchase_item ?? true,
        is_stock_item: item.is_stock_item ?? true,
        images: item.images || [],
        website_description: item.website_description || '',
        marketplace_category_slug: item.marketplace_category_slug || '',
        show_in_website: item.show_in_website ?? false,
      });
    } else {
      reset({
        item_code: '',
        item_name: '',
        description: '',
        item_group_id: firstItemGroupId || '',
        default_unit: '',
        stock_uom: '',
        standard_rate: undefined,
        minimum_stock_level: undefined,
        is_active: true,
        is_sales_item: true,
        is_purchase_item: true,
        is_stock_item: true,
        images: [],
        website_description: '',
        marketplace_category_slug: '',
        show_in_website: false,
      });
    }
  }, [item, firstItemGroupId, reset]);

  useEffect(() => {
    if (!item && itemGroups.length > 0 && !watch('item_group_id')) {
      setValue('item_group_id', itemGroups[0].id);
    }
  }, [itemGroups, item, watch, setValue]);

  const handleGroupCreated = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const { data: updatedGroups } = await refetchGroups();
    if (updatedGroups && updatedGroups.length > 0) {
      const latestGroup = updatedGroups[updatedGroups.length - 1];
      setValue('item_group_id', latestGroup.id);
    }
  };

  const onSubmit = async (formData: ItemFormData) => {
    if (!currentOrganization) {
      toast.error(t('items.noOrganization'));
      return;
    }

    try {
      if (item) {
        await updateItem.mutateAsync({ itemId: item.id, input: formData });
        toast.success(t('items.itemUpdated'));
      } else {
        await createItem.mutateAsync(formData as CreateItemInput);
        toast.success(t('items.itemCreated'));
      }
      onOpenChange(false);
    } catch (error: unknown) {
      handleFormError(error, setError, {
        toastMessage: t(`items.${item ? 'update' : 'create'}Failed`),
      });
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

        <form onSubmit={handleFormSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item_code">{t('items.itemCode')} *</Label>
              <Input
                id="item_code"
                {...register('item_code')}
                invalid={!!errors.item_code}
                placeholder={t('items.itemCodePlaceholder')}
                disabled={!!item}
                className="mt-1"
              />
              {errors.item_code && (
                <p className="text-red-600 text-sm mt-1">{errors.item_code.message}</p>
              )}
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
                {...register('item_name')}
                invalid={!!errors.item_name}
                placeholder={t('items.itemNamePlaceholder')}
                className="mt-1"
              />
              {errors.item_name && (
                <p className="text-red-600 text-sm mt-1">{errors.item_name.message}</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="item_group_id">{t('items.group')} *</Label>
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
                value={watch('item_group_id') || ''}
                onValueChange={(value) => setValue('item_group_id', value)}
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
            {errors.item_group_id && (
              <p className="text-red-600 text-sm mt-1">{errors.item_group_id.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">{t('items.description')}</Label>
            <Input
              id="description"
              {...register('description')}
              invalid={!!errors.description}
              placeholder={t('items.descriptionPlaceholder')}
              className="mt-1"
            />
            {errors.description && (
              <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
            )}
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
                  value={watch('default_unit') || ''}
                  onValueChange={(value) => {
                    const selectedUnit = workUnits.find((u) => u.code === value);
                    setValue('default_unit', selectedUnit?.code || value);
                    setValue('stock_uom', selectedUnit?.code || value);
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
              {errors.default_unit && (
                <p className="text-red-600 text-sm mt-1">{errors.default_unit.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="standard_rate">{t('items.standardRate')}</Label>
              <Input
                id="standard_rate"
                type="number"
                step="0.01"
                {...register('standard_rate', { valueAsNumber: true })}
                invalid={!!errors.standard_rate}
                placeholder="0.00"
                className="mt-1"
              />
              {errors.standard_rate && (
                <p className="text-red-600 text-sm mt-1">{errors.standard_rate.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="minimum_stock_level">{t('items.minimumStockLevel', 'Minimum Stock Level')}</Label>
              <Input
                id="minimum_stock_level"
                type="number"
                step="0.01"
                min="0"
                {...register('minimum_stock_level', { valueAsNumber: true })}
                invalid={!!errors.minimum_stock_level}
                placeholder="0.00"
                className="mt-1"
              />
              {errors.minimum_stock_level && (
                <p className="text-red-600 text-sm mt-1">{errors.minimum_stock_level.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {t('items.minimumStockLevelHint', 'Alert when stock falls below this level')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('is_active')}
              />
              <span className="text-sm">{t('items.active')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('is_sales_item')}
              />
              <span className="text-sm">{t('items.salesItem')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('is_purchase_item')}
              />
              <span className="text-sm">{t('items.purchaseItem')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('is_stock_item')}
              />
              <span className="text-sm">{t('items.stockItem')}</span>
            </label>
          </div>

          {watch('is_sales_item') && (
            <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/10 dark:border-emerald-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-emerald-700 dark:text-emerald-400 flex items-center gap-2 text-base">
                  <ShoppingBag className="h-5 w-5" />
                  {t('items.marketplace.title', 'Marketplace Listing')}
                </CardTitle>
                <CardDescription>
                  {t('items.marketplace.description', 'Configure how this item appears on the marketplace')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="marketplace_category" className="text-sm font-medium">
                    {t('items.marketplace.category', 'Category')} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={watch('marketplace_category_slug') || ''}
                    onValueChange={(value) => setValue('marketplace_category_slug', value)}
                    disabled={categoriesLoading}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={categoriesLoading ? t('app.loading') : t('items.marketplace.selectCategory', 'Select a category')} />
                    </SelectTrigger>
                    <SelectContent>
                      {marketplaceCategories.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          {categoriesLoading ? t('app.loading') : 'No categories available. Check console for errors.'}
                        </div>
                      ) : (
                        marketplaceCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.slug}>
                            {cat.icon && `${cat.icon} `}
                            {cat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('items.marketplace.categoryHint', 'Choose the category where this product will appear on the marketplace')}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    {t('items.marketplace.images', 'Product Images')}
                  </Label>
                  <ProductImageUpload
                    itemId={item?.id}
                    organizationId={currentOrganization?.id || ''}
                    images={watch('images') || []}
                    onImagesChange={(images) => setValue('images', images)}
                    maxImages={5}
                    disabled={!currentOrganization?.id}
                  />
                </div>

                <div>
                  <Label htmlFor="website_description">
                    {t('items.marketplace.websiteDescription', 'Marketplace Description')}
                  </Label>
                  <Textarea
                    id="website_description"
                    {...register('website_description')}
                    placeholder={t('items.marketplace.descriptionPlaceholder', 'Detailed description for marketplace buyers...')}
                    rows={3}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('items.marketplace.descriptionHint', 'This description will be shown on the marketplace product page')}
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-md border">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('items.marketplace.price', 'Marketplace Price')}:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(watch('standard_rate') || 0)}
                  </span>
                  <span className="text-sm text-gray-500">
                    / {watch('default_unit') || t('items.unit.notSet', 'unit')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md border">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_in_website" className="text-sm font-medium cursor-pointer">
                      {t('items.marketplace.publishNow', 'Publish on Marketplace')}
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('items.marketplace.publishHint', 'Make this item visible to buyers on the marketplace')}
                    </p>
                  </div>
                  <Switch
                    id="show_in_website"
                    checked={watch('show_in_website') || false}
                    onCheckedChange={(checked) => setValue('show_in_website', checked)}
                  />
                </div>

                {watch('show_in_website') && (!watch('marketplace_category_slug') || !watch('images')?.length || !watch('standard_rate')) && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      <p className="font-medium">{t('items.marketplace.validationWarning', 'Missing required fields:')}</p>
                      <ul className="list-disc list-inside mt-1 text-xs">
                        {!watch('marketplace_category_slug') && (
                          <li>{t('items.marketplace.missingCategory', 'Marketplace category is required')}</li>
                        )}
                        {!watch('images')?.length && (
                          <li>{t('items.marketplace.missingImages', 'At least one product image is required')}</li>
                        )}
                        {!watch('standard_rate') && (
                          <li>{t('items.marketplace.missingPrice', 'Product price must be set')}</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                        {itemStockLevel.warehouses.map((wh: { warehouse_id: string; warehouse_name: string; quantity: number; value: number }) => (
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
               disabled={isSubmitting || createItem.isPending || updateItem.isPending}
             >
               {t('app.cancel')}
             </Button>
             <Button type="submit" disabled={isSubmitting || createItem.isPending || updateItem.isPending}>
               {isSubmitting || createItem.isPending || updateItem.isPending ? (
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

function ItemVariantsDialog({ item, open, onOpenChange }: ItemVariantsDialogProps) {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const { data: variants = [], isLoading } = useItemVariants(item?.id || null);
  const createVariant = useCreateItemVariant();
  const updateVariant = useUpdateItemVariant();
  const deleteVariant = useDeleteItemVariant();
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);

  // Fetch work units for unit selection
  const { data: workUnits = [], isLoading: workUnitsLoading } = useQuery({
    queryKey: ['work-units', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { apiClient } = await import('../../lib/api-client');
      const data = await apiClient.get<WorkUnit[]>(
        '/api/v1/work-units?is_active=true&orderBy=unit_category&order=asc',
        {},
        currentOrganization.id,
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: !!currentOrganization?.id,
  });

  // Initialize form with react-hook-form and zod resolver
  const form = useForm<ProductVariantFormData>({
    resolver: zodResolver(productVariantSchema),
    defaultValues: {
      variant_name: '',
      variant_sku: '',
      unit_id: '',
      quantity: 0,
      min_stock_level: 0,
      standard_rate: 0,
      barcode: '',
      is_active: true,
      notes: '',
    },
  });

  // Reset form when dialog opens/closes or when switching between create/edit mode
  useEffect(() => {
    if (!open) {
      setEditingVariant(null);
      form.reset({
        variant_name: '',
        variant_sku: '',
        unit_id: '',
        quantity: 0,
        min_stock_level: 0,
        standard_rate: 0,
        barcode: '',
        is_active: true,
        notes: '',
      });
    }
  }, [open, form]);

  const handleEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    form.reset({
      variant_name: variant.variant_name || '',
      variant_sku: variant.variant_sku || '',
      unit_id: variant.unit_id || '',
      quantity: variant.quantity || 0,
      min_stock_level: variant.min_stock_level || 0,
      standard_rate: variant.standard_rate || 0,
      barcode: variant.barcode || '',
      is_active: variant.is_active ?? true,
      notes: variant.notes || '',
    });
  };

  const onSubmit = async (data: ProductVariantFormData) => {
    if (!item || !currentOrganization) return;

    // Transform empty strings to undefined
    const basePayload = {
      variant_name: data.variant_name.trim(),
      variant_sku: data.variant_sku?.trim() || undefined,
      unit_id: data.unit_id || undefined,
      quantity: data.quantity ?? 0,
      min_stock_level: data.min_stock_level ?? 0,
      standard_rate: data.standard_rate ?? undefined,
      barcode: data.barcode?.trim() || undefined,
      is_active: data.is_active ?? true,
      notes: data.notes?.trim() || undefined,
    };

    try {
      if (editingVariant) {
        await updateVariant.mutateAsync({
          variantId: editingVariant.id,
          input: basePayload,
        });
        toast.success(t('items.variants.updated', 'Variant updated'));
      } else {
        await createVariant.mutateAsync({
          itemId: item.id,
          input: {
            ...basePayload,
            organization_id: currentOrganization.id,
            item_id: item.id,
          },
        });
        toast.success(t('items.variants.created', 'Variant created'));
      }

      setEditingVariant(null);
      form.reset({
        variant_name: '',
        variant_sku: '',
        unit_id: '',
        quantity: 0,
        min_stock_level: 0,
        standard_rate: 0,
        barcode: '',
        is_active: true,
        notes: '',
      });
    } catch (error: any) {
      toast.error(`Failed to save variant: ${error.message}`);
    }
  };

  const handleDelete = async (variant: ProductVariant) => {
    if (!window.confirm(t('items.variants.deleteConfirm', 'Delete this variant?'))) {
      return;
    }

    try {
      await deleteVariant.mutateAsync(variant.id);
      toast.success(t('items.variants.deleted', 'Variant deleted'));
    } catch (error: any) {
      toast.error(`Failed to delete variant: ${error.message}`);
    }
  };

  const cancelEdit = () => {
    setEditingVariant(null);
    form.reset({
      variant_name: '',
      variant_sku: '',
      unit_id: '',
      quantity: 0,
      min_stock_level: 0,
      standard_rate: 0,
      barcode: '',
      is_active: true,
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('items.variants.title', 'Variants')} - {item?.item_name}
          </DialogTitle>
          <DialogDescription>
            {t('items.variants.subtitle', 'Manage stock dimensions for this item (1L, 5L, etc.)')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <form id="variant-form" onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="variant_name">{t('items.variants.name', 'Variant name')} *</Label>
              <Input
                id="variant_name"
                {...form.register('variant_name')}
                placeholder={t('items.variants.namePlaceholder', 'e.g., 1L, 5L')}
                className="mt-1"
              />
              {form.formState.errors.variant_name && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.variant_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="variant_sku">{t('items.variants.sku', 'Variant SKU')}</Label>
              <Input
                id="variant_sku"
                {...form.register('variant_sku')}
                placeholder={t('items.variants.skuPlaceholder', 'Optional')}
                className="mt-1"
              />
              {form.formState.errors.variant_sku && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.variant_sku.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="variant_unit">{t('items.variants.unit', 'Unit')}</Label>
              <Select
                value={form.watch('unit_id') || ''}
                onValueChange={(value) => form.setValue('unit_id', value)}
              >
                <SelectTrigger id="variant_unit" className="mt-1">
                  <SelectValue placeholder={workUnitsLoading ? 'Loading units...' : 'Select unit'} />
                </SelectTrigger>
                <SelectContent>
                  {workUnitsLoading ? (
                    <SelectItem value="_loading" disabled>
                      Loading units...
                    </SelectItem>
                  ) : workUnits.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No units available
                    </SelectItem>
                  ) : (
                    workUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.code} - {unit.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.unit_id && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.unit_id.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="variant_rate">{t('items.variants.standardRate', 'Standard rate')}</Label>
              <Input
                id="variant_rate"
                type="number"
                step="0.01"
                {...form.register('standard_rate', { valueAsNumber: true })}
                placeholder="0"
                className="mt-1"
              />
              {form.formState.errors.standard_rate && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.standard_rate.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="variant_quantity">{t('items.variants.quantity', 'Initial quantity')}</Label>
              <Input
                id="variant_quantity"
                type="number"
                step="0.001"
                {...form.register('quantity', { valueAsNumber: true })}
                placeholder="0"
                className="mt-1"
              />
              {form.formState.errors.quantity && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.quantity.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="variant_min">{t('items.variants.minStock', 'Minimum stock')}</Label>
              <Input
                id="variant_min"
                type="number"
                step="0.001"
                {...form.register('min_stock_level', { valueAsNumber: true })}
                placeholder="0"
                className="mt-1"
              />
              {form.formState.errors.min_stock_level && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.min_stock_level.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="variant_barcode">{t('items.variants.barcode', 'Barcode')}</Label>
              <Input
                id="variant_barcode"
                {...form.register('barcode')}
                placeholder="Optional"
                className="mt-1"
              />
              {form.formState.errors.barcode && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.barcode.message}</p>
              )}
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={form.watch('is_active')}
                onCheckedChange={(value) => form.setValue('is_active', value)}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('items.variants.active', 'Active')}
              </span>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="variant_notes">{t('items.variants.notes', 'Notes')}</Label>
              <Textarea
                id="variant_notes"
                {...form.register('notes')}
                className="mt-1"
                rows={2}
              />
              {form.formState.errors.notes && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.notes.message}</p>
              )}
            </div>
            <div className="sm:col-span-2 flex items-center justify-end gap-2">
              {editingVariant && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                >
                  {t('items.variants.cancelEdit', 'Cancel edit')}
                </Button>
              )}
              <Button
                type="submit"
                form="variant-form"
                disabled={createVariant.isPending || updateVariant.isPending}
              >
                {(createVariant.isPending || updateVariant.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('items.variants.saving', 'Saving...')}
                  </>
                ) : editingVariant ? (
                  t('items.variants.save', 'Save variant')
                ) : (
                  t('items.variants.add', 'Add variant')
                )}
              </Button>
            </div>
          </form>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('items.variants.list', 'Existing variants')}
            </h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : variants.length === 0 ? (
              <p className="text-sm text-gray-500">{t('items.variants.empty', 'No variants yet')}</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        {t('items.variants.name', 'Variant name')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        {t('items.variants.unit', 'Unit')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        {t('items.variants.quantity', 'Quantity')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        {t('items.variants.standardRate', 'Standard rate')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        {t('items.variants.status', 'Status')}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                        {t('items.variants.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {variants.map((variant) => (
                      <tr key={variant.id} className="text-sm">
                        <td className="px-4 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {variant.variant_name}
                            </span>
                            {variant.variant_sku && (
                              <span className="text-xs text-gray-500">{variant.variant_sku}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                          {variant.unit_id
                            ? workUnits.find((wu) => wu.id === variant.unit_id)?.code || variant.unit_id
                            : '-'}
                        </td>
                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                          {(variant.quantity ?? 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                          {variant.standard_rate ? formatCurrency(variant.standard_rate) : '-'}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              variant.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}
                          >
                            {variant.is_active ? t('items.active') : t('items.inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(variant)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(variant)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ItemManagement() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const [selectedFarm, setSelectedFarm] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<Item | null>(null);
  
  const { data: items = [], isLoading } = useItems({ is_active: true, is_stock_item: true });
  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const deleteItem = useDeleteItem();
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [showVariantsDialog, setShowVariantsDialog] = useState(false);
  const [variantsItem, setVariantsItem] = useState<Item | null>(null);

  // Fetch stock levels for items with farm context
  const { data: stockLevels = {} } = useQuery({
    queryKey: ['items-stock-levels', currentOrganization?.id, selectedFarm],
    queryFn: async () => {
      if (!currentOrganization?.id) return {};

      return itemsApi.getStockLevels(
        {
          farm_id: selectedFarm !== 'all' ? selectedFarm : undefined,
        },
        currentOrganization.id,
      );
    },
    enabled: !!currentOrganization?.id,
  });

  // Filter items based on search, farm, and low stock
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.item_code.toLowerCase().includes(term) ||
          item.item_name.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term)
      );
    }

    // Filter by farm (items that have stock in warehouses of selected farm)
    if (selectedFarm !== 'all') {
      const itemIdsWithStock = new Set(
        Object.entries(stockLevels as Record<string, {
          total_quantity: number;
          total_value: number;
          is_low_stock?: boolean;
          warehouses?: Array<{
            warehouse_id: string;
            warehouse_name: string;
            farm_id: string | null;
            farm_name: string | null;
            quantity: number;
            value: number;
          }>;
        }>)
          .filter(([_, stock]) =>
            stock.warehouses?.some((wh: { farm_id: string | null }) => wh.farm_id === selectedFarm)
          )
          .map(([itemId]) => itemId)
      );
      filtered = filtered.filter((item) => itemIdsWithStock.has(item.id));
    }

    // Filter by low stock - mirror the same logic as the badge display
    if (lowStockOnly) {
      filtered = filtered.filter((item) => {
        const stockLevel = (stockLevels as Record<string, {
          total_quantity: number;
          total_value: number;
          is_low_stock?: boolean;
          warehouses?: Array<{
            warehouse_id: string;
            warehouse_name: string;
            farm_id: string | null;
            farm_name: string | null;
            quantity: number;
            value: number;
          }>;
        }>)[item.id];

        // Use the same condition as the badge: server-side flag OR below minimum threshold
        return stockLevel?.is_low_stock ||
          (item.minimum_stock_level && stockLevel &&
           stockLevel.total_quantity < item.minimum_stock_level);
      });
    }

    return filtered;
  }, [items, searchTerm, selectedFarm, lowStockOnly, stockLevels]);

  const handleEdit = (item: Item) => {
    setSelectedItem(item);
    setShowForm(true);
  };

  const handleCreate = () => {
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleVariants = (item: Item) => {
    setVariantsItem(item);
    setShowVariantsDialog(true);
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

      {/* Low Stock Alerts Section */}
      {selectedFarm === 'all' && !lowStockOnly && (
        <LowStockAlerts maxItems={5} showActions={true} />
      )}

      {/* Filters */}
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Search Input */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder={t('items.searchPlaceholder', 'Search items...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Farm Filter */}
            <div className="w-full sm:w-auto sm:min-w-[200px]">
              <Select value={selectedFarm} onValueChange={setSelectedFarm}>
                <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-500 focus:ring-green-500">
                  <SelectValue placeholder={t('items.filterByFarm', 'Filter by Farm')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('items.allFarms', 'All Farms')}</SelectItem>
                  {farms.map((farm) => {
                    const farmId = (farm as any).farm_id || farm.id;
                    const farmName = (farm as any).farm_name || farm.name;
                    return (
                      <SelectItem key={farmId} value={farmId}>
                        {farmName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Low Stock Filter */}
            <div className="flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 sm:px-3 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                 onClick={() => setLowStockOnly(!lowStockOnly)}>
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <AlertTriangle className={`w-4 h-4 transition-colors ${lowStockOnly ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium transition-colors ${lowStockOnly ? 'text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {t('items.lowStockOnly', 'Low Stock Only')}
                </span>
              </div>
              <Switch
                checked={lowStockOnly}
                onCheckedChange={setLowStockOnly}
                className="pointer-events-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
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
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    {t('items.noItemsFound')}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const stockLevel = (stockLevels as Record<string, {
                    total_quantity: number;
                    total_value: number;
                    is_low_stock?: boolean;
                    warehouses?: Array<{
                      warehouse_id: string;
                      warehouse_name: string;
                      farm_id: string | null;
                      farm_name: string | null;
                      quantity: number;
                      value: number;
                    }>;
                  }>)[item.id];
                  const isLowStock = stockLevel?.is_low_stock || 
                    (item.minimum_stock_level && stockLevel && 
                     stockLevel.total_quantity < item.minimum_stock_level);
                  
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {item.item_code}
                          {isLowStock && (
                            <div title={t('items.lowStock', 'Low Stock')}>
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </div>
                          )}
                        </div>
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
                            <div className="flex items-center gap-1">
                              <span className={`font-medium ${isLowStock ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                {stockLevel.total_quantity.toFixed(3)} {item.default_unit}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatCurrency(stockLevel.total_value)}
                            </span>
                            {stockLevel.warehouses && stockLevel.warehouses.length > 0 && (
                              <div className="mt-1 text-xs text-gray-500">
                                {stockLevel.warehouses.length} {t('items.warehouse', 'warehouse(s)')}
                                {selectedFarm === 'all' && stockLevel.warehouses.some((wh: { farm_name?: string | null }) => wh.farm_name) && (
                                  <span className="ml-1">
                                    ({stockLevel.warehouses
                                      .filter((wh: { farm_name?: string | null }) => wh.farm_name)
                                      .map((wh: { farm_name?: string | null }) => wh.farm_name)
                                      .join(', ')})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">{t('items.noStock')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}
                          >
                            {item.is_active ? t('items.active') : t('items.inactive')}
                          </span>
                          {isLowStock && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {t('items.lowStock', 'Low Stock')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVariants(item)}
                            className="text-emerald-600 hover:text-emerald-700 p-1 sm:p-2"
                            title={t('items.variants.title', 'Variants')}
                          >
                            <Layers className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItemForDetails(item)}
                            className="text-blue-600 hover:text-blue-700 p-1 sm:p-2"
                            title={t('items.viewDetails', 'View Details')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="p-1 sm:p-2"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-700 p-1 sm:p-2"
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
        </div>
      )}

      <ItemForm item={selectedItem} open={showForm} onOpenChange={setShowForm} />
      <ItemVariantsDialog
        item={variantsItem}
        open={showVariantsDialog}
        onOpenChange={(open) => {
          setShowVariantsDialog(open);
          if (!open) {
            setVariantsItem(null);
          }
        }}
      />

      {/* Item Details Dialog */}
      {selectedItemForDetails && (
        <Dialog open={!!selectedItemForDetails} onOpenChange={(open) => !open && setSelectedItemForDetails(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedItemForDetails.item_name}</DialogTitle>
              <DialogDescription>
                {t('items.itemDetails', 'Item Details and Stock Information')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              {/* Stock Levels by Farm */}
              <div>
                <h3 className="text-lg font-semibold mb-3">{t('items.stockByFarm', 'Stock by Farm')}</h3>
                <FarmStockLevels item_id={selectedItemForDetails.id} showWarehouseDetails={true} />
              </div>

              {/* Farm Usage */}
              <div>
                <h3 className="text-lg font-semibold mb-3">{t('items.farmUsage', 'Farm Usage')}</h3>
                <ItemFarmUsage item_id={selectedItemForDetails.id} showDetails={true} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
