import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Wrench, Tractor, Wheat, SprayCan, Truck, Droplets, Package, Search } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { FormField } from './ui/FormField';
import { PhotoUpload } from './ui/PhotoUpload';
import { useAuth } from '../hooks/useAuth';
import {
  useEquipment,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
} from '../hooks/useEquipment';
import { useFarms } from '../hooks/useParcelsQuery';
import type { EquipmentAsset, EquipmentCategory, EquipmentFuelType, EquipmentStatus, CreateEquipmentInput } from '../lib/api/equipment';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DataTablePagination, FilterBar, ListPageHeader, ListPageLayout, useTableState } from '@/components/ui/data-table';
import { EquipmentMaintenance } from './EquipmentMaintenance';

const CATEGORY_ICONS: Record<EquipmentCategory, React.ElementType> = {
  tractor: Tractor,
  harvester: Wheat,
  sprayer: SprayCan,
  utility_vehicle: Truck,
  pump: Droplets,
  small_tool: Wrench,
  other: Package,
};

const STATUS_COLORS: Record<EquipmentStatus, string> = {
  available: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  in_use: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  out_of_service: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const CATEGORIES: EquipmentCategory[] = ['tractor', 'harvester', 'sprayer', 'utility_vehicle', 'pump', 'small_tool', 'other'];
const STATUSES: EquipmentStatus[] = ['available', 'in_use', 'maintenance', 'out_of_service'];
const FUEL_TYPES: EquipmentFuelType[] = ['diesel', 'petrol', 'electric', 'other'];

const optionalNumber = z
  .union([z.number(), z.string().length(0), z.nan()])
  .transform((v) => (typeof v === 'number' && !Number.isNaN(v) ? v : undefined))
  .optional();

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const createEquipmentSchema = (t: (key: string, fallback?: string) => string) =>
  z.object({
    name: z.string().min(1, t('equipment.validation.nameRequired', 'Name is required')),
    category: z.enum(CATEGORIES as unknown as [EquipmentCategory, ...EquipmentCategory[]]),
    fuel_type: z.enum(FUEL_TYPES as unknown as [EquipmentFuelType, ...EquipmentFuelType[]]),
    status: z.enum(STATUSES as unknown as [EquipmentStatus, ...EquipmentStatus[]]),
    brand: optionalString,
    model: optionalString,
    serial_number: optionalString,
    license_plate: optionalString,
    purchase_date: optionalString,
    purchase_price: optionalNumber.refine((v) => v === undefined || v >= 0, {
      message: t('equipment.validation.nonNegative', 'Must be ≥ 0'),
    }),
    current_value: optionalNumber.refine((v) => v === undefined || v >= 0, {
      message: t('equipment.validation.nonNegative', 'Must be ≥ 0'),
    }),
    hour_meter_reading: optionalNumber.refine((v) => v === undefined || v >= 0, {
      message: t('equipment.validation.nonNegative', 'Must be ≥ 0'),
    }),
    hour_meter_date: optionalString,
    insurance_expiry: optionalString,
    farm_id: optionalString,
    notes: optionalString,
    photos: z.array(z.string().url()).optional(),
  });

type EquipmentFormValues = z.infer<ReturnType<typeof createEquipmentSchema>>;

const DEFAULT_VALUES = {
  name: '',
  category: 'tractor' as EquipmentCategory,
  fuel_type: 'diesel' as EquipmentFuelType,
  status: 'available' as EquipmentStatus,
  photos: [] as string[],
} as unknown as EquipmentFormValues;

const EquipmentManagement = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [farmFilter, setFarmFilter] = useState<string>('');

  const filters = useMemo(() => {
    const f: { farm_id?: string; category?: EquipmentCategory; status?: EquipmentStatus } = {};
    if (farmFilter) f.farm_id = farmFilter;
    if (categoryFilter) f.category = categoryFilter as EquipmentCategory;
    if (statusFilter) f.status = statusFilter as EquipmentStatus;
    return Object.keys(f).length ? f : undefined;
  }, [farmFilter, categoryFilter, statusFilter]);

  const { data: equipment = [], isLoading, error: apiError } = useEquipment(filters);
  const { data: farms = [] } = useFarms(orgId);
  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();
  const deleteMutation = useDeleteEquipment();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentAsset | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; description?: string; variant?: 'destructive' | 'default'; onConfirm: () => void }>({ title: '', onConfirm: () => {} });
  const [maintenanceEquipmentId, setMaintenanceEquipmentId] = useState<string | null>(null);

  const schema = useMemo(() => createEquipmentSchema(t as unknown as (key: string, fallback?: string) => string), [t]);
  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: DEFAULT_VALUES,
    mode: 'onSubmit',
  });
  const { register, handleSubmit, reset, formState: { errors } } = form;

  const filteredEquipment = useMemo(() => {
    let items = equipment ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.brand?.toLowerCase().includes(q) ||
        e.model?.toLowerCase().includes(q) ||
        e.serial_number?.toLowerCase().includes(q) ||
        e.license_plate?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [equipment, search]);

  const tableState = useTableState<EquipmentAsset>({
    data: filteredEquipment as unknown as Record<string, unknown>[],
    defaultPageSize: 12,
  });
  const { paginatedData, page, pageSize, totalPages, totalItems, setPage, setPageSize } = tableState;
  const pagedEquipment = paginatedData as unknown as EquipmentAsset[];

  useEffect(() => {
    if (!showAddDialog) return;
    if (editingItem) {
      reset({
        name: editingItem.name,
        category: editingItem.category,
        fuel_type: editingItem.fuel_type,
        status: editingItem.status,
        brand: editingItem.brand,
        model: editingItem.model,
        serial_number: editingItem.serial_number,
        license_plate: editingItem.license_plate,
        purchase_date: editingItem.purchase_date,
        purchase_price: editingItem.purchase_price,
        current_value: editingItem.current_value,
        hour_meter_reading: editingItem.hour_meter_reading,
        hour_meter_date: editingItem.hour_meter_date,
        insurance_expiry: editingItem.insurance_expiry,
        farm_id: editingItem.farm_id,
        notes: editingItem.notes,
        photos: editingItem.photos ?? [],
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [showAddDialog, editingItem, reset]);

  const onSubmit = useCallback(async (values: EquipmentFormValues) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: values });
        toast.success(t('equipment.updated', 'Equipment updated'));
      } else {
        await createMutation.mutateAsync(values as CreateEquipmentInput);
        toast.success(t('equipment.created', 'Equipment created'));
      }
      setShowAddDialog(false);
      setEditingItem(null);
    } catch (err: any) {
      toast.error(err.message || t('equipment.saveFailed', 'Failed to save equipment'));
    }
  }, [editingItem, createMutation, updateMutation, t]);

  const handleEdit = useCallback((item: EquipmentAsset) => {
    setEditingItem(item);
    setShowAddDialog(true);
  }, []);

  const handleDelete = useCallback((item: EquipmentAsset) => {
    setConfirmAction({
      title: t('equipment.deleteConfirm', 'Delete equipment?'),
      description: t('equipment.deleteConfirmDesc', `Are you sure you want to delete "${item.name}"?`),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(item.id);
          toast.success(t('equipment.deleted', 'Equipment deleted'));
        } catch (err: any) {
          toast.error(err.message || t('equipment.deleteFailed', 'Failed to delete'));
        }
      },
    });
    setConfirmOpen(true);
  }, [deleteMutation, t]);

  const error = apiError ? t('equipment.loadFailed', 'Failed to load equipment') : null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <ListPageLayout>
        <ListPageHeader
          title={t('equipment.title', 'Equipment')}
          icon={
            <span className="inline-flex items-center gap-1 text-sm font-normal text-muted-foreground">
              <Tractor className="h-5 w-5" />
              <span>{totalItems}</span>
            </span>
          }
          actions={
            <Button
              variant="green"
              onClick={() => { setEditingItem(null); setShowAddDialog(true); }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('equipment.add', 'Add Equipment')}
            </Button>
          }
        />

        <FilterBar>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('equipment.search', 'Search equipment...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">{t('equipment.allCategories', 'All Categories')}</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{t(`equipment.category.${c}`, c)}</option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">{t('equipment.allStatuses', 'All Statuses')}</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{t(`equipment.status.${s}`, s)}</option>
            ))}
          </Select>
          <Select value={farmFilter} onChange={e => setFarmFilter(e.target.value)}>
            <option value="">{t('equipment.allFarms', 'All Farms')}</option>
            {farms.map((f: any) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </Select>
        </FilterBar>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : filteredEquipment.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
            <Tractor className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('equipment.empty', 'No equipment found')}</p>
            <Button variant="outline" className="mt-4" onClick={() => { setEditingItem(null); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t('equipment.addFirst', 'Add your first equipment')}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pagedEquipment.map(item => {
              const Icon = CATEGORY_ICONS[item.category] || Package;
              return (
                <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {[item.brand, item.model].filter(Boolean).join(' ') || t('equipment.noModel', 'No model info')}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                      {t(`equipment.status.${item.status}`, item.status)}
                    </span>
                  </div>

                  {item.photos && item.photos.length > 0 && (
                    <div className="mt-3 flex gap-1 overflow-x-auto">
                      {item.photos.slice(0, 4).map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="h-14 w-14 flex-none rounded object-cover border"
                          loading="lazy"
                        />
                      ))}
                      {item.photos.length > 4 && (
                        <div className="h-14 w-14 flex-none rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          +{item.photos.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {item.farm && <p>{t('equipment.farm', 'Farm')}: {item.farm.name}</p>}
                    {item.hour_meter_reading != null && (
                      <p>{t('equipment.hours', 'Hours')}: {item.hour_meter_reading}</p>
                    )}
                    {item.fuel_type && <p>{t('equipment.fuel', 'Fuel')}: {t(`equipment.fuelType.${item.fuel_type}`, item.fuel_type)}</p>}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setMaintenanceEquipmentId(item.id)}>
                      <Wrench className="h-4 w-4 mr-1" />
                      {t('equipment.maintenance', 'Maintenance')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
            </div>
            {totalItems > 0 && (
              <DataTablePagination
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[12, 24, 48]}
              />
            )}
          </>
        )}
      </ListPageLayout>

      <ResponsiveDialog
        open={showAddDialog}
        onOpenChange={(open: boolean) => { setShowAddDialog(open); if (!open) setEditingItem(null); }}
        title={editingItem ? t('equipment.edit', 'Edit Equipment') : t('equipment.add', 'Add Equipment')}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t('equipment.name', 'Name')} htmlFor="eq_name" required error={errors.name?.message}>
              <Input id="eq_name" {...register('name')} />
            </FormField>
            <FormField label={t('equipment.category.label', 'Category')} htmlFor="eq_category" required error={errors.category?.message}>
              <Select id="eq_category" {...register('category')}>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{t(`equipment.category.${c}`, c)}</option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('equipment.brand', 'Brand')} htmlFor="eq_brand" error={errors.brand?.message}>
              <Input id="eq_brand" {...register('brand')} />
            </FormField>
            <FormField label={t('equipment.model', 'Model')} htmlFor="eq_model" error={errors.model?.message}>
              <Input id="eq_model" {...register('model')} />
            </FormField>
            <FormField label={t('equipment.serialNumber', 'Serial Number')} htmlFor="eq_serial" error={errors.serial_number?.message}>
              <Input id="eq_serial" {...register('serial_number')} />
            </FormField>
            <FormField label={t('equipment.licensePlate', 'License Plate')} htmlFor="eq_plate" error={errors.license_plate?.message}>
              <Input id="eq_plate" {...register('license_plate')} />
            </FormField>
            <FormField label={t('equipment.purchaseDate', 'Purchase Date')} htmlFor="eq_purchase_date" error={errors.purchase_date?.message}>
              <Input id="eq_purchase_date" type="date" {...register('purchase_date')} />
            </FormField>
            <FormField label={t('equipment.purchasePrice', 'Purchase Price')} htmlFor="eq_purchase_price" error={errors.purchase_price?.message}>
              <Input id="eq_purchase_price" type="number" step="0.01" min={0} {...register('purchase_price', { valueAsNumber: true })} />
            </FormField>
            <FormField label={t('equipment.currentValue', 'Current Value')} htmlFor="eq_current_value" error={errors.current_value?.message}>
              <Input id="eq_current_value" type="number" step="0.01" min={0} {...register('current_value', { valueAsNumber: true })} />
            </FormField>
            <FormField label={t('equipment.hourMeter', 'Hour Meter')} htmlFor="eq_hours" error={errors.hour_meter_reading?.message}>
              <Input id="eq_hours" type="number" step="0.01" min={0} {...register('hour_meter_reading', { valueAsNumber: true })} />
            </FormField>
            <FormField label={t('equipment.fuelType.label', 'Fuel Type')} htmlFor="eq_fuel" required error={errors.fuel_type?.message}>
              <Select id="eq_fuel" {...register('fuel_type')}>
                {FUEL_TYPES.map(f => (
                  <option key={f} value={f}>{t(`equipment.fuelType.${f}`, f)}</option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('equipment.status.label', 'Status')} htmlFor="eq_status" required error={errors.status?.message}>
              <Select id="eq_status" {...register('status')}>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{t(`equipment.status.${s}`, s)}</option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('equipment.farm', 'Farm')} htmlFor="eq_farm" error={errors.farm_id?.message}>
              <Select id="eq_farm" {...register('farm_id')}>
                <option value="">{t('equipment.noFarm', 'No farm assignment')}</option>
                {farms.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('equipment.insuranceExpiry', 'Insurance Expiry')} htmlFor="eq_insurance" error={errors.insurance_expiry?.message}>
              <Input id="eq_insurance" type="date" {...register('insurance_expiry')} />
            </FormField>
          </div>
          <FormField label={t('equipment.notes', 'Notes')} htmlFor="eq_notes" error={errors.notes?.message}>
            <Textarea id="eq_notes" rows={3} {...register('notes')} />
          </FormField>
          {orgId && (
            <FormField label={t('equipment.photos', 'Photos')}>
              <Controller
                control={form.control}
                name="photos"
                render={({ field }) => (
                  <PhotoUpload
                    organizationId={orgId}
                    photos={field.value ?? []}
                    onChange={(p) => field.onChange(p)}
                    bucket="entity-photos"
                    entityType="equipment"
                    entityId={editingItem?.id}
                    folder={editingItem?.id || `new-equipment-${Date.now()}`}
                    fieldName="photos"
                    showPrimary
                  />
                )}
              />
            </FormField>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { setShowAddDialog(false); setEditingItem(null); }}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? t('common.saving', 'Saving...')
                : editingItem ? t('common.update', 'Update') : t('common.create', 'Create')}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>

      <EquipmentMaintenance
        equipmentId={maintenanceEquipmentId}
        onClose={() => setMaintenanceEquipmentId(null)}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </>
  );
};

export default EquipmentManagement;
