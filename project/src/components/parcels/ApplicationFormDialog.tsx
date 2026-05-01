import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_CURRENCY } from '@/utils/currencies';
import { useAuthStore } from '@/stores/authStore';
import { tasksApi } from '@/lib/api/tasks';
import { Calendar, Droplets, AlertCircle } from 'lucide-react';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';

const schema = z.object({
  product_id: z.string().min(1, 'Product is required').uuid('Product must be a valid UUID'),
  farm_id: z.string().uuid(),
  parcel_id: z.string().uuid().optional(),
  application_date: z.string().min(1, 'Application date is required'),
  quantity_used: z.number().nonnegative('Quantity must be 0 or greater'),
  area_treated: z.number().nonnegative('Area must be 0 or greater'),
  cost: z.number().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  task_id: z.string().uuid().optional(),
  images: z.array(z.string()).optional(),
}).refine((data) => data.farm_id, {
  message: 'Farm ID is required',
  path: ['farm_id'],
});

type FormData = z.infer<typeof schema>;

interface ApplicationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelId?: string;
  farmId: string;
  onSuccess?: () => void;
}

export const ApplicationFormDialog = ({
  open,
  onOpenChange,
  parcelId,
  farmId,
  onSuccess,
}: ApplicationFormDialogProps) => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const getAccessToken = useAuthStore((state) => state.getAccessToken);
  // Image upload state
  const [images, setImages] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      farm_id: farmId,
      parcel_id: parcelId,
      application_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD for date input
      currency: currentOrganization?.currency || DEFAULT_CURRENCY,
      quantity_used: 0,
      area_treated: 0,
      images: [],
    },
    mode: 'onChange', // Validate on change to enable/disable button
  });

  // Get selected product info for validation
  const selectedProductId = form.watch('product_id');
  const quantityUsed = form.watch('quantity_used');
  const areaTreated = form.watch('area_treated');

  // Fetch parcel details to get area for validation
  const { data: parcel } = useQuery({
    queryKey: ['parcel', parcelId],
    queryFn: async () => {
      const token = getAccessToken();
      if (!token || !parcelId) return null;

      const response = await fetch(`/api/v1/parcels/${parcelId}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-organization-id': currentOrganization?.id || '',
        },
      });

      if (!response.ok) return null;
      return response.json();
    },
    enabled: open && !!parcelId && !!currentOrganization?.id,
  });

  const parcelArea = parcel?.area_ha || 0;

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setImages([]);
      form.reset({
        farm_id: farmId,
        parcel_id: parcelId,
        application_date: new Date().toISOString().split('T')[0],
        currency: currentOrganization?.currency || DEFAULT_CURRENCY,
        quantity_used: 0,
        area_treated: 0,
        images: [],
      });
    }
  }, [open, farmId, parcelId, currentOrganization?.currency, form]);

  const handlePhotosChange = (next: string[]) => {
    setImages(next);
    form.setValue('images', next);
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token. Please log in again.');
      }

      // Include images in the submission
      const submitData = {
        ...data,
        images: images,
      };

      const response = await fetch(`/api/v1/product-applications`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-organization-id': currentOrganization?.id || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'Failed to create application';
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (Array.isArray(errorData.details) && errorData.details.length > 0) {
            errorMessage = errorData.details.map((d: { message?: string }) => d.message || '').join(', ');
          }
        } catch (_e) {
          // If parsing fails, use status text
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate parcel applications query
      queryClient.invalidateQueries({ queryKey: ['parcels', parcelId, 'applications'] });
      // Also invalidate general applications list
      queryClient.invalidateQueries({ queryKey: ['product-applications'] });

      setImages([]);
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    // Additional validation before submit
    if (data.quantity_used <= 0) {
      form.setError('quantity_used', { type: 'manual', message: 'Quantity must be greater than 0' });
      return;
    }
    if (data.area_treated <= 0) {
      form.setError('area_treated', { type: 'manual', message: 'Area must be greater than 0' });
      return;
    }

    // Convert date from YYYY-MM-DD to full ISO string for backend validation
    const dataWithIsoDate = {
      ...data,
      application_date: data.application_date.includes('T')
        ? data.application_date
        : new Date(data.application_date).toISOString(),
    };
    mutation.mutate(dataWithIsoDate);
  });

  // Fetch available products
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['available-products'],
    queryFn: async () => {
      const token = getAccessToken();
      const orgId = currentOrganization?.id;

      if (!token) {
        console.error('No access token found in auth store');
        return [];
      }

      if (!orgId) {
        console.error('No organization ID found');
        return [];
      }

      const response = await fetch(`/api/v1/product-applications/available-products`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-organization-id': orgId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching available products:', errorData);
        return [];
      }

      const data = await response.json();
      return data.products || data || [];
    },
    enabled: open && !!currentOrganization?.id,
  });


  // Fetch tasks for linking applications to tasks
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['tasks', currentOrganization?.id, farmId],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      try {
        const filters: Record<string, string> = {};
        if (farmId) filters.farm_id = farmId;
        const result = await tasksApi.getAll(currentOrganization.id, filters);
        return result?.data || [];
      } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }
    },
    enabled: open && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Get selected product for validation
  const selectedProduct = products.find((p: { id: string }) => p.id === selectedProductId);
  const availableStock = selectedProduct?.quantity || 0;
  const stockUnit = selectedProduct?.unit || '';

  // Validation checks
  const hasProduct = !!selectedProductId;
  const hasValidQuantity = quantityUsed > 0;
  const hasValidArea = areaTreated > 0;
  const isQuantityValid = !hasProduct || !hasValidQuantity || (hasValidQuantity && quantityUsed <= availableStock);
  const isAreaValid = !hasValidArea || (hasValidArea && (!parcelArea || areaTreated <= parcelArea));
  const isFormValid = form.formState.isValid && isQuantityValid && isAreaValid && hasProduct && hasValidQuantity && hasValidArea;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('parcels.index.addApplication')}
      size="lg"
      footer={(
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="application-form-dialog-form"
            disabled={mutation.isPending || !isFormValid}
            title={!isFormValid ? 'Please fill all required fields correctly' : ''}
          >
            {mutation.isPending ? t('parcels.index.saving') : t('parcels.index.save')}
          </Button>
        </>
      )}
    >
      <form id="application-form-dialog-form" onSubmit={onSubmit} className="space-y-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product_id">{t('parcels.index.product')}</Label>
            {/* Show auth error if no token */}
            {!getAccessToken() && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Authentication required. Please <Button type="button" onClick={() => window.location.href = '/login'} className="underline font-medium">log in again</Button>.
              </p>
            )}
            {isError && getAccessToken() && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {t('parcels.index.errorLoadingProducts') || 'Error loading products. Please check your inventory.'}
              </p>
            )}
            {isLoading ? (
              <p className="text-sm text-gray-500">{t('parcels.index.loadingProducts') || 'Loading products...'}</p>
            ) : Array.isArray(products) && products.length > 0 ? (
              <>
                <Select
                  value={form.watch('product_id') || ''}
                  onValueChange={(value) => {
                    form.setValue('product_id', value);
                    // Trigger validation after setting value
                    form.trigger('product_id');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('parcels.index.selectProduct')} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product: { id: string; name: string; quantity?: number; unit?: string }) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.quantity} {product.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.product_id && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {form.formState.errors.product_id.message}
                  </p>
                )}
              </>
            ) : (
              <>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder={t('parcels.index.noProductsAvailable') || 'No products available'} />
                  </SelectTrigger>
                </Select>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {t('parcels.index.noProductsAvailable') || 'No products available in inventory.'}
                  <br/>
                  <span className="text-xs opacity-75">
                    {t('parcels.index.noProductsHint') || 'Go to Stock > Receipts to add inventory.'}
                  </span>
                </p>
              </>
            )}
          </div>

          {/* Application Date */}
          <div className="space-y-2">
            <Label htmlFor="application_date">
              <Calendar className="h-4 w-4 mr-2 inline" />
              {t('parcels.index.applicationDate')}
            </Label>
            <Input
              id="application_date"
              type="date"
              {...form.register('application_date')}
            />
            {form.formState.errors.application_date && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {form.formState.errors.application_date.message}
              </p>
            )}
          </div>

          {/* Quantity and Area */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity_used">
                {t('parcels.index.quantityUsed')}
                {selectedProductId && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    (Available: {availableStock} {stockUnit})
                  </span>
                )}
              </Label>
              <Input
                id="quantity_used"
                type="number"
                step="1"
                min="0"
                {...form.register('quantity_used', { valueAsNumber: true })}
              />
              {selectedProductId && quantityUsed > availableStock && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Quantity cannot exceed available stock ({availableStock} {stockUnit})
                </p>
              )}
              {form.formState.errors.quantity_used && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {form.formState.errors.quantity_used.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="area_treated">
                <Droplets className="h-4 w-4 mr-2 inline" />
                {t('parcels.index.areaTreated')} (ha)
                {parcelArea > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    (Parcel: {parcelArea} ha)
                  </span>
                )}
              </Label>
              <Input
                id="area_treated"
                type="number"
                step="0.01"
                min="0"
                {...form.register('area_treated', { valueAsNumber: true })}
              />
              {areaTreated > 0 && parcelArea > 0 && areaTreated > parcelArea && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Area cannot exceed parcel size ({parcelArea} ha)
                </p>
              )}
              {form.formState.errors.area_treated && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {form.formState.errors.area_treated.message}
                </p>
              )}
            </div>
          </div>

          {/* Task - Optional */}
          <div className="space-y-2">
            <Label htmlFor="task_id">{t('parcels.index.task')} <span className="text-xs text-gray-500 dark:text-gray-400">({t('parcels.index.adhoc')})</span></Label>
            {isLoadingTasks ? (
              <p className="text-sm text-gray-500">{t('common.loading') || 'Chargement...'}</p>
            ) : tasks.length > 0 ? (
              <Select
                value={form.watch('task_id') || '__none__'}
                onValueChange={(value) => {
                  form.setValue('task_id', value === '__none__' ? undefined : value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('parcels.index.selectTask') || 'Sélectionner une tâche'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('parcels.index.noTask') || 'Aucune tâche (ad-hoc)'}</SelectItem>
                  {tasks.map((taskItem: { id: string; title: string }) => (
                    <SelectItem key={taskItem.id} value={taskItem.id}>
                      {taskItem.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder={t('parcels.index.noTasksAvailable') || 'Aucune tâche disponible'} />
                </SelectTrigger>
              </Select>
            )}
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label htmlFor="cost">{t('parcels.index.cost')} ({currentOrganization?.currency || DEFAULT_CURRENCY})</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              min="0"
              {...form.register('cost', { valueAsNumber: true })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('parcels.index.notes')}</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder={t('parcels.index.notesPlaceholder')}
              {...form.register('notes')}
            />
          </div>

          {/* Images */}
          {currentOrganization?.id && (
            <div className="space-y-2">
              <Label>{t('parcels.index.images') || 'Images'}</Label>
              <PhotoUpload
                organizationId={currentOrganization.id}
                photos={images}
                onChange={handlePhotosChange}
                bucket="products"
                entityType="product-application"
                folder="product-applications"
                fieldName="images"
                maxPhotos={5}
                disabled={mutation.isPending}
              />
            </div>
          )}

      </form>
    </ResponsiveDialog>
  );
};
