import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWarehouses, type Warehouse } from '@/hooks/useWarehouses';
import { useFarms } from '@/hooks/useParcelsQuery';
import { useAuth } from '@/hooks/useAuth';
import { warehousesApi, type CreateWarehouseInput } from '@/lib/api/warehouses';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormErrors } from '@/hooks/useFormErrors';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, Loader2, AlertCircle, Warehouse as WarehouseIcon } from 'lucide-react';

const warehouseSchema = z.object({
  farm_id: z.string().optional().nullable(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  capacity: z.preprocess((val) => (val === '' || val === undefined || Number.isNaN(val) ? undefined : Number(val)), z.number().positive().optional()),
  capacity_unit: z.string().optional(),
  temperature_controlled: z.boolean().optional(),
  humidity_controlled: z.boolean().optional(),
  security_level: z.string().optional(),
  manager_name: z.string().optional(),
  manager_phone: z.string().optional(),
  is_active: z.boolean().optional(),
});

type WarehouseFormData = z.infer<typeof warehouseSchema>;

interface WarehouseFormProps {
  warehouse: Warehouse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function WarehouseForm({ warehouse, open, onOpenChange }: WarehouseFormProps) {
  const { t } = useTranslation('stock');
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const { handleFormError } = useFormErrors<WarehouseFormData>();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      farm_id: null,
      name: '',
      description: '',
      location: '',
      address: '',
      city: '',
      postal_code: '',
      capacity: undefined,
      capacity_unit: 'm3',
      temperature_controlled: false,
      humidity_controlled: false,
      security_level: 'standard',
      manager_name: '',
      manager_phone: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (warehouse) {
      reset({
        farm_id: warehouse.farm_id || null,
        name: warehouse.name || '',
        description: warehouse.description || '',
        location: warehouse.location || '',
        address: warehouse.address || '',
        city: warehouse.city || '',
        postal_code: warehouse.postal_code || '',
        capacity: warehouse.capacity || undefined,
        capacity_unit: warehouse.capacity_unit || 'm3',
        temperature_controlled: warehouse.temperature_controlled ?? false,
        humidity_controlled: warehouse.humidity_controlled ?? false,
        security_level: warehouse.security_level || 'standard',
        manager_name: warehouse.manager_name || '',
        manager_phone: warehouse.manager_phone || '',
        is_active: warehouse.is_active ?? true,
      });
    } else {
      reset({
        farm_id: null,
        name: '',
        description: '',
        location: '',
        address: '',
        city: '',
        postal_code: '',
        capacity: undefined,
        capacity_unit: 'm3',
        temperature_controlled: false,
        humidity_controlled: false,
        security_level: 'standard',
        manager_name: '',
        manager_phone: '',
        is_active: true,
      });
    }
  }, [warehouse, reset]);

  const onSubmit = async (formData: WarehouseFormData) => {
    if (!currentOrganization) {
      toast.error(t('warehouses.noOrganization'));
      return;
    }

    try {
      const cleanedData = {
        ...formData,
        description: formData.description?.trim() || undefined,
        location: formData.location?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        postal_code: formData.postal_code?.trim() || undefined,
        capacity_unit: formData.capacity ? (formData.capacity_unit?.trim() || undefined) : undefined,
        security_level: formData.security_level?.trim() || undefined,
        manager_name: formData.manager_name?.trim() || undefined,
        manager_phone: formData.manager_phone?.trim() || undefined,
        farm_id: formData.farm_id || undefined,
      };

      if (warehouse) {
        await warehousesApi.update(warehouse.id, cleanedData, currentOrganization.id);
        toast.success(t('warehouses.warehouseUpdated'));
      } else {
        const createInput: CreateWarehouseInput = {
          name: cleanedData.name,
          description: cleanedData.description,
          location: cleanedData.location,
          address: cleanedData.address,
          city: cleanedData.city,
          postal_code: cleanedData.postal_code,
          capacity: cleanedData.capacity,
          capacity_unit: cleanedData.capacity_unit,
          temperature_controlled: cleanedData.temperature_controlled ?? false,
          humidity_controlled: cleanedData.humidity_controlled ?? false,
          security_level: cleanedData.security_level,
          manager_name: cleanedData.manager_name,
          manager_phone: cleanedData.manager_phone,
          farm_id: cleanedData.farm_id,
          is_active: cleanedData.is_active ?? true,
        };
        await warehousesApi.create(createInput, currentOrganization.id);
        toast.success(t('warehouses.warehouseCreated'));
      }

      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      onOpenChange(false);
    } catch (error: unknown) {
      handleFormError(error, setError, {
        toastMessage: t(`warehouses.${warehouse ? 'update' : 'create'}Error`),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {warehouse ? t('warehouses.editWarehouse') : t('warehouses.createWarehouse')}
          </DialogTitle>
          <DialogDescription>
            {warehouse ? t('warehouses.editDescription') : t('warehouses.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">{t('warehouses.form.name')} *</Label>
              <Input
                id="name"
                {...register('name')}
                invalid={!!errors.name}
                placeholder={t('warehouses.form.namePlaceholder')}
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="farm_id">{t('warehouses.form.farm')}</Label>
              <Select
                id="farm_id"
                {...register('farm_id')}
              >
                <option value="">{t('warehouses.form.noFarm')}</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </Select>
              {errors.farm_id && (
                <p className="text-red-600 text-sm mt-1">{errors.farm_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="security_level">{t('warehouses.form.securityLevel')}</Label>
              <Select
                id="security_level"
                {...register('security_level')}
              >
                <option value="basic">{t('warehouses.form.securityLevels.basic')}</option>
                <option value="standard">{t('warehouses.form.securityLevels.standard')}</option>
                <option value="high">{t('warehouses.form.securityLevels.high')}</option>
                <option value="maximum">{t('warehouses.form.securityLevels.maximum')}</option>
              </Select>
              {errors.security_level && (
                <p className="text-red-600 text-sm mt-1">{errors.security_level.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">{t('warehouses.form.description')}</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={t('warehouses.form.descriptionPlaceholder')}
              rows={3}
            />
            {errors.description && (
              <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">{t('warehouses.form.location')}</Label>
              <Input
                id="location"
                {...register('location')}
                invalid={!!errors.location}
                placeholder={t('warehouses.form.locationPlaceholder')}
              />
              {errors.location && (
                <p className="text-red-600 text-sm mt-1">{errors.location.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="address">{t('warehouses.form.address')}</Label>
              <Input
                id="address"
                {...register('address')}
                invalid={!!errors.address}
                placeholder={t('warehouses.form.addressPlaceholder')}
              />
              {errors.address && (
                <p className="text-red-600 text-sm mt-1">{errors.address.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">{t('warehouses.form.city')}</Label>
              <Input
                id="city"
                {...register('city')}
                invalid={!!errors.city}
                placeholder={t('warehouses.form.cityPlaceholder')}
              />
              {errors.city && (
                <p className="text-red-600 text-sm mt-1">{errors.city.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="postal_code">{t('warehouses.form.postalCode')}</Label>
              <Input
                id="postal_code"
                {...register('postal_code')}
                invalid={!!errors.postal_code}
                placeholder={t('warehouses.form.postalCodePlaceholder')}
              />
              {errors.postal_code && (
                <p className="text-red-600 text-sm mt-1">{errors.postal_code.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="capacity_unit">{t('warehouses.form.capacityUnit')}</Label>
              <Select
                id="capacity_unit"
                {...register('capacity_unit')}
              >
                <option value="m3">{t('warehouses.form.units.m3')}</option>
                <option value="kg">{t('warehouses.form.units.kg')}</option>
                <option value="ton">{t('warehouses.form.units.ton')}</option>
                <option value="pallets">{t('warehouses.form.units.pallets')}</option>
              </Select>
              {errors.capacity_unit && (
                <p className="text-red-600 text-sm mt-1">{errors.capacity_unit.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="capacity">{t('warehouses.form.capacity')}</Label>
              <Input
                id="capacity"
                type="number"
                {...register('capacity', { valueAsNumber: true })}
                invalid={!!errors.capacity}
                placeholder={t('warehouses.form.capacityPlaceholder')}
                step="0.01"
              />
              {errors.capacity && (
                <p className="text-red-600 text-sm mt-1">{errors.capacity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="manager_name">{t('warehouses.form.managerName')}</Label>
              <Input
                id="manager_name"
                {...register('manager_name')}
                invalid={!!errors.manager_name}
                placeholder={t('warehouses.form.managerNamePlaceholder')}
              />
              {errors.manager_name && (
                <p className="text-red-600 text-sm mt-1">{errors.manager_name.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="manager_phone">{t('warehouses.form.managerPhone')}</Label>
            <Input
              id="manager_phone"
              type="tel"
              {...register('manager_phone')}
              invalid={!!errors.manager_phone}
              placeholder={t('warehouses.form.managerPhonePlaceholder')}
            />
            {errors.manager_phone && (
              <p className="text-red-600 text-sm mt-1">{errors.manager_phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('temperature_controlled')}
                className="rounded"
              />
              <span>{t('warehouses.form.temperatureControlled')}</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('humidity_controlled')}
                className="rounded"
              />
              <span>{t('warehouses.form.humidityControlled')}</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('is_active')}
                className="rounded"
              />
              <span>{t('warehouses.form.isActive')}</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('app.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {warehouse ? t('warehouses.updating') : t('warehouses.creating')}
                </>
              ) : (
                warehouse ? t('warehouses.update') : t('warehouses.create')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function WarehouseManagement() {
  const { t } = useTranslation('stock');
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const { data: warehouses = [], isLoading, error, refetch } = useWarehouses();

  const [showForm, setShowForm] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (warehouseId: string) => {
      return warehousesApi.delete(warehouseId, currentOrganization?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success(t('warehouses.warehouseDeleted'));
      setShowDeleteDialog(false);
      setWarehouseToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(`${t('warehouses.deleteError')}: ${error.message}`);
    },
  });

  const handleCreate = () => {
    setSelectedWarehouse(null);
    setShowForm(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowForm(true);
  };

  const handleDelete = (warehouse: Warehouse) => {
    setWarehouseToDelete(warehouse);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!warehouseToDelete) return;
    deleteMutation.mutate(warehouseToDelete.id);
  };

  if (!currentOrganization) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">{t('warehouses.noOrganization')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <p className="text-red-600 dark:text-red-400 mb-4">{t('warehouses.loadError')}</p>
        <Button onClick={() => refetch()} variant="outline">
          {t('app.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('warehouses.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('warehouses.description')}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t('warehouses.createWarehouse')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <WarehouseIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('warehouses.noWarehouses')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('warehouses.noWarehousesDescription')}
          </p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            {t('warehouses.createFirstWarehouse')}
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('warehouses.table.name')}</TableHead>
                <TableHead>{t('warehouses.table.location')}</TableHead>
                <TableHead>{t('warehouses.table.capacity')}</TableHead>
                <TableHead>{t('warehouses.table.features')}</TableHead>
                <TableHead>{t('warehouses.table.manager')}</TableHead>
                <TableHead>{t('warehouses.table.status')}</TableHead>
                <TableHead className="text-right">{t('warehouses.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-medium">{warehouse.name}</TableCell>
                  <TableCell>
                    {[warehouse.city, warehouse.location].filter(Boolean).join(', ') || '-'}
                  </TableCell>
                  <TableCell>
                    {warehouse.capacity
                      ? `${warehouse.capacity} ${warehouse.capacity_unit}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 text-xs">
                      {warehouse.temperature_controlled && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          {t('warehouses.features.temp')}
                        </span>
                      )}
                      {warehouse.humidity_controlled && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          {t('warehouses.features.humidity')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {warehouse.manager_name ? (
                      <div className="text-sm">
                        <div>{warehouse.manager_name}</div>
                        {warehouse.manager_phone && (
                          <div className="text-gray-500 dark:text-gray-400">
                            {warehouse.manager_phone}
                          </div>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        warehouse.is_active
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {warehouse.is_active ? t('app.active') : t('app.inactive')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(warehouse)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(warehouse)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <WarehouseForm
        warehouse={selectedWarehouse}
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setSelectedWarehouse(null);
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('warehouses.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('warehouses.deleteConfirmation')} <strong>"{warehouseToDelete?.name}"</strong>?
              <br />
              <span className="text-red-600 dark:text-red-400">
                {t('warehouses.deleteWarning')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('app.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('warehouses.deleting')}
                </>
              ) : (
                t('warehouses.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
