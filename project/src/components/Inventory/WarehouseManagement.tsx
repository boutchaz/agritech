import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWarehouses, type Warehouse } from '@/hooks/useWarehouses';
import { useFarms } from '@/hooks/useMultiTenantData';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/FormField';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

interface WarehouseFormData {
  organization_id: string;
  farm_id: string | null;
  name: string;
  description: string;
  location: string;
  address: string;
  city: string;
  postal_code: string;
  capacity: number | undefined;
  capacity_unit: string;
  temperature_controlled: boolean;
  humidity_controlled: boolean;
  security_level: string;
  manager_name: string;
  manager_phone: string;
  is_active: boolean;
}

interface WarehouseFormProps {
  warehouse: Warehouse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function WarehouseForm({ warehouse, open, onOpenChange }: WarehouseFormProps) {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const { data: farms = [] } = useFarms();

  const [formData, setFormData] = useState<WarehouseFormData>({
    organization_id: currentOrganization?.id || '',
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

  useEffect(() => {
    if (warehouse) {
      setFormData({
        organization_id: warehouse.organization_id,
        farm_id: warehouse.farm_id,
        name: warehouse.name,
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
      setFormData({
        organization_id: currentOrganization?.id || '',
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
  }, [warehouse, currentOrganization?.id]);

  const createMutation = useMutation({
    mutationFn: async (data: WarehouseFormData) => {
      const { data: result, error } = await supabase
        .from('warehouses')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success(t('warehouses.warehouseCreated'));
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`${t('warehouses.createError')}: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WarehouseFormData> }) => {
      const { data: result, error } = await supabase
        .from('warehouses')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success(t('warehouses.warehouseUpdated'));
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`${t('warehouses.updateError')}: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (warehouse) {
      updateMutation.mutate({ id: warehouse.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const updateField = <K extends keyof WarehouseFormData>(field: K, value: WarehouseFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {warehouse ? t('warehouses.editWarehouse') : t('warehouses.createWarehouse')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('warehouses.form.name')} htmlFor="name" required>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder={t('warehouses.form.namePlaceholder')}
                required
              />
            </FormField>

            <FormField label={t('warehouses.form.farm')} htmlFor="farm_id">
              <Select
                id="farm_id"
                value={formData.farm_id || ''}
                onChange={(e) => updateField('farm_id', e.target.value || null)}
              >
                <option value="">{t('warehouses.form.noFarm')}</option>
                {farms.data?.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label={t('warehouses.form.description')} htmlFor="description">
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder={t('warehouses.form.descriptionPlaceholder')}
              rows={3}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('warehouses.form.location')} htmlFor="location">
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder={t('warehouses.form.locationPlaceholder')}
              />
            </FormField>

            <FormField label={t('warehouses.form.address')} htmlFor="address">
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder={t('warehouses.form.addressPlaceholder')}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField label={t('warehouses.form.city')} htmlFor="city">
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder={t('warehouses.form.cityPlaceholder')}
              />
            </FormField>

            <FormField label={t('warehouses.form.postalCode')} htmlFor="postal_code">
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => updateField('postal_code', e.target.value)}
                placeholder={t('warehouses.form.postalCodePlaceholder')}
              />
            </FormField>

            <FormField label={t('warehouses.form.securityLevel')} htmlFor="security_level">
              <Select
                id="security_level"
                value={formData.security_level}
                onChange={(e) => updateField('security_level', e.target.value)}
              >
                <option value="basic">{t('warehouses.form.securityLevels.basic')}</option>
                <option value="standard">{t('warehouses.form.securityLevels.standard')}</option>
                <option value="high">{t('warehouses.form.securityLevels.high')}</option>
                <option value="maximum">{t('warehouses.form.securityLevels.maximum')}</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('warehouses.form.capacity')} htmlFor="capacity">
              <Input
                id="capacity"
                type="number"
                value={formData.capacity || ''}
                onChange={(e) => updateField('capacity', e.target.value ? Number(e.target.value) : undefined)}
                placeholder={t('warehouses.form.capacityPlaceholder')}
                step="0.01"
              />
            </FormField>

            <FormField label={t('warehouses.form.capacityUnit')} htmlFor="capacity_unit">
              <Select
                id="capacity_unit"
                value={formData.capacity_unit}
                onChange={(e) => updateField('capacity_unit', e.target.value)}
              >
                <option value="m3">{t('warehouses.form.units.m3')}</option>
                <option value="kg">{t('warehouses.form.units.kg')}</option>
                <option value="ton">{t('warehouses.form.units.ton')}</option>
                <option value="pallets">{t('warehouses.form.units.pallets')}</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('warehouses.form.managerName')} htmlFor="manager_name">
              <Input
                id="manager_name"
                value={formData.manager_name}
                onChange={(e) => updateField('manager_name', e.target.value)}
                placeholder={t('warehouses.form.managerNamePlaceholder')}
              />
            </FormField>

            <FormField label={t('warehouses.form.managerPhone')} htmlFor="manager_phone">
              <Input
                id="manager_phone"
                type="tel"
                value={formData.manager_phone}
                onChange={(e) => updateField('manager_phone', e.target.value)}
                placeholder={t('warehouses.form.managerPhonePlaceholder')}
              />
            </FormField>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.temperature_controlled}
                onChange={(e) => updateField('temperature_controlled', e.target.checked)}
                className="rounded"
              />
              <span>{t('warehouses.form.temperatureControlled')}</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.humidity_controlled}
                onChange={(e) => updateField('humidity_controlled', e.target.checked)}
                className="rounded"
              />
              <span>{t('warehouses.form.humidityControlled')}</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => updateField('is_active', e.target.checked)}
                className="rounded"
              />
              <span>{t('warehouses.form.isActive')}</span>
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('app.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {warehouse ? t('warehouses.updating') : t('warehouses.creating')}
                </>
              ) : (
                warehouse ? t('warehouses.update') : t('warehouses.create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function WarehouseManagement() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const { data: warehouses = [], isLoading, error, refetch } = useWarehouses();

  const [showForm, setShowForm] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (warehouseId: string) => {
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', warehouseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success(t('warehouses.warehouseDeleted'));
      setShowDeleteDialog(false);
      setWarehouseToDelete(null);
    },
    onError: (error: any) => {
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
