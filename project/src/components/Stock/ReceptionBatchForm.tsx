import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  ClipboardCheck,
  Package,
  Scale,
  Thermometer,
  Droplet,
  Loader2,
  Warehouse,
  MapPin,
  Calendar,
  Star,
  User,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useCreateReceptionBatch,
  useUpdateReceptionBatch,
  useUpdateQualityControl,
} from '@/hooks/useReceptionBatches';
import { useParcelsWithDetails } from '@/hooks/useParcelsWithDetails';
import { useAssignableUsers } from '@/hooks/useAssignableUsers';
import { useHarvests } from '@/hooks/useHarvests';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useAuth } from '@/hooks/useAuth';
import type {
  CreateReceptionBatchDto,
  QualityGrade,
} from '@/types/reception';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Zod schema factory that accepts t function for translated validation messages
const createReceptionBatchSchema = (t: (key: string) => string) =>
  z.object({
    warehouse_id: z.string().min(1, t('receptionBatches.form.validation.warehouseRequired')),
    harvest_id: z.string().optional(),
    parcel_id: z.string().min(1, t('receptionBatches.form.validation.parcelRequired')),
    crop_id: z.string().optional(),
    culture_type: z.string().optional(),

    reception_date: z.string().min(1, t('receptionBatches.form.validation.dateRequired')),
    reception_time: z.string().optional(),

    // Weight & Quantity
    weight: z.number().min(0.001, t('receptionBatches.form.validation.weightPositive')),
    weight_unit: z.string().min(1, t('receptionBatches.form.validation.weightUnitRequired')),
    quantity: z.number().optional(),
    quantity_unit: z.string().optional(),

    // Quality Control
    quality_grade: z.enum(['Extra', 'A', 'B', 'C', 'First', 'Second', 'Third']).optional(),
    quality_score: z.number().min(1).max(10).optional(),
    quality_notes: z.string().optional(),
    humidity_percentage: z.number().min(0).max(100).optional(),
    maturity_level: z.string().optional(),
    temperature: z.number().optional(),
    moisture_content: z.number().min(0).max(100).optional(),

    // Personnel & Producer
    received_by: z.string().optional(),
    producer_name: z.string().optional(),
    supplier_id: z.string().optional(),
  });

type ReceptionBatchFormData = z.infer<ReturnType<typeof createReceptionBatchSchema>>;

interface ReceptionBatchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultHarvestId?: string;
  defaultParcelId?: string;
  batchToEdit?: Record<string, unknown>;
}

export default function ReceptionBatchForm({
  open,
  onOpenChange,
  defaultHarvestId,
  defaultParcelId,
  batchToEdit,
}: ReceptionBatchFormProps) {
  const { t } = useTranslation('stock');
  const { currentOrganization, user } = useAuth();
  const createBatch = useCreateReceptionBatch();
  const updateBatch = useUpdateReceptionBatch();
  const updateQualityControl = useUpdateQualityControl();
  const { data: warehouses = [], isLoading: warehousesLoading } = useWarehouses();
  const { data: parcels = [], isLoading: parcelsLoading } = useParcelsWithDetails();
  const { data: assignableUsers = [] } = useAssignableUsers(currentOrganization?.id || null);
  const { data: harvests = [], isLoading: harvestsLoading } = useHarvests(currentOrganization?.id || '');
  const [showQualityControl, setShowQualityControl] = useState(false);

  const isEditMode = !!batchToEdit;

  const receptionBatchSchema = useMemo(() => createReceptionBatchSchema(t), [t]);

  const form = useForm<ReceptionBatchFormData>({
    resolver: zodResolver(receptionBatchSchema),
    defaultValues: batchToEdit ? {
      warehouse_id: batchToEdit.warehouse_id || '',
      harvest_id: batchToEdit.harvest_id || undefined,
      parcel_id: batchToEdit.parcel_id || '',
      crop_id: batchToEdit.crop_id || undefined,
      culture_type: batchToEdit.culture_type || undefined,
      reception_date: batchToEdit.reception_date || new Date().toISOString().split('T')[0],
      reception_time: batchToEdit.reception_time || undefined,
      weight: batchToEdit.weight || 0,
      weight_unit: batchToEdit.weight_unit || 'kg',
      quantity: batchToEdit.quantity || undefined,
      quantity_unit: batchToEdit.quantity_unit || undefined,
      quality_grade: batchToEdit.quality_grade || undefined,
      quality_score: batchToEdit.quality_score || undefined,
      quality_notes: batchToEdit.quality_notes || undefined,
      humidity_percentage: batchToEdit.humidity_percentage || undefined,
      maturity_level: batchToEdit.maturity_level || undefined,
      temperature: batchToEdit.temperature || undefined,
      moisture_content: batchToEdit.moisture_content || undefined,
      received_by: batchToEdit.received_by || user?.id || '',
      producer_name: batchToEdit.producer_name || undefined,
      supplier_id: batchToEdit.supplier_id || undefined,
    } : {
      warehouse_id: '',
      harvest_id: defaultHarvestId || undefined,
      parcel_id: defaultParcelId || '',
      reception_date: new Date().toISOString().split('T')[0],
      reception_time: new Date().toTimeString().slice(0, 5),
      weight_unit: 'kg',
      weight: 0,
      received_by: user?.id || '',
    },
  });

  useEffect(() => {
    if (open && batchToEdit) {
      form.reset({
        warehouse_id: batchToEdit.warehouse_id || '',
        harvest_id: batchToEdit.harvest_id || undefined,
        parcel_id: batchToEdit.parcel_id || '',
        crop_id: batchToEdit.crop_id || undefined,
        culture_type: batchToEdit.culture_type || undefined,
        reception_date: batchToEdit.reception_date || new Date().toISOString().split('T')[0],
        reception_time: batchToEdit.reception_time || undefined,
        weight: batchToEdit.weight || 0,
        weight_unit: batchToEdit.weight_unit || 'kg',
        quantity: batchToEdit.quantity || undefined,
        quantity_unit: batchToEdit.quantity_unit || undefined,
        quality_grade: batchToEdit.quality_grade || undefined,
        quality_score: batchToEdit.quality_score || undefined,
        quality_notes: batchToEdit.quality_notes || undefined,
        humidity_percentage: batchToEdit.humidity_percentage || undefined,
        maturity_level: batchToEdit.maturity_level || undefined,
        temperature: batchToEdit.temperature || undefined,
        moisture_content: batchToEdit.moisture_content || undefined,
        received_by: batchToEdit.received_by || user?.id || '',
        producer_name: batchToEdit.producer_name || undefined,
        supplier_id: batchToEdit.supplier_id || undefined,
      });
      if (batchToEdit.quality_grade || batchToEdit.quality_score) {
        setShowQualityControl(true);
      }
    }
  }, [open, batchToEdit, form, user?.id]);

  // Watch parcel selection to auto-populate culture type and crop
  const selectedParcelId = form.watch('parcel_id');

  useEffect(() => {
    if (selectedParcelId && parcels.length > 0) {
      const selectedParcel = parcels.find(p => p.id === selectedParcelId);
      if (selectedParcel) {
        // Auto-populate culture_type from parcel
        if (selectedParcel.crop_type) {
          form.setValue('culture_type', selectedParcel.crop_type);
        } else if (selectedParcel.variety) {
          form.setValue('culture_type', selectedParcel.variety);
        }
      }
    }
  }, [selectedParcelId, parcels, form]);

  // Watch harvest selection to auto-populate parcel, weight, etc.
  const selectedHarvestId = form.watch('harvest_id');

  // Auto-populate from defaultHarvestId when form opens
  useEffect(() => {
    if (open && defaultHarvestId && harvests.length > 0 && !batchToEdit) {
      const defaultHarvest = harvests.find(h => h.id === defaultHarvestId);
      if (defaultHarvest) {
        if (defaultHarvest.parcel_id) {
          form.setValue('parcel_id', defaultHarvest.parcel_id);
          // Auto-populate culture_type from parcel if harvest doesn't have it
          if (parcels.length > 0) {
            const parcel = parcels.find(p => p.id === defaultHarvest.parcel_id);
            if (parcel?.crop_type) {
              form.setValue('culture_type', parcel.crop_type);
            } else if (parcel?.variety) {
              form.setValue('culture_type', parcel.variety);
            }
          }
        }
        if (defaultHarvest.quantity) {
          form.setValue('weight', defaultHarvest.quantity);
        }
        if (defaultHarvest.unit) {
          form.setValue('weight_unit', defaultHarvest.unit);
        }
        if (defaultHarvest.harvest_date) {
          form.setValue('reception_date', defaultHarvest.harvest_date);
        }
      }
    }
  }, [open, defaultHarvestId, harvests, parcels, form, batchToEdit]);

  // Watch harvest selection to auto-populate parcel, weight, etc.
  useEffect(() => {
    if (selectedHarvestId && harvests.length > 0) {
      const selectedHarvest = harvests.find(h => h.id === selectedHarvestId);
      if (selectedHarvest) {
        if (selectedHarvest.parcel_id) {
          form.setValue('parcel_id', selectedHarvest.parcel_id);
          // Auto-populate culture_type from parcel if harvest doesn't have it
          if (parcels.length > 0) {
            const parcel = parcels.find(p => p.id === selectedHarvest.parcel_id);
            if (parcel?.crop_type) {
              form.setValue('culture_type', parcel.crop_type);
            } else if (parcel?.variety) {
              form.setValue('culture_type', parcel.variety);
            }
          }
        }
        if (selectedHarvest.quantity) {
          form.setValue('weight', selectedHarvest.quantity);
        }
        if (selectedHarvest.unit) {
          form.setValue('weight_unit', selectedHarvest.unit);
        }
        if (selectedHarvest.harvest_date) {
          form.setValue('reception_date', selectedHarvest.harvest_date);
        }
      }
    }
  }, [selectedHarvestId, harvests, parcels, form]);

  const onSubmit = async (data: ReceptionBatchFormData) => {
    if (!currentOrganization?.id) {
      toast.error(t('receptionBatches.form.toast.noOrganization'));
      return;
    }

    if (warehouses.length === 0) {
      toast.error(t('receptionBatches.form.toast.noWarehouses'));
      return;
    }

    try {
      // Step 1: Create/update reception batch with basic data only
      const basicInput: CreateReceptionBatchDto = {
        warehouse_id: data.warehouse_id,
        harvest_id: data.harvest_id,
        parcel_id: data.parcel_id,
        crop_id: data.crop_id,
        culture_type: data.culture_type,
        reception_date: data.reception_date,
        reception_time: data.reception_time,
        weight: data.weight,
        weight_unit: data.weight_unit,
        quantity: data.quantity,
        quantity_unit: data.quantity_unit,
        received_by: data.received_by,
        producer_name: data.producer_name,
        supplier_id: data.supplier_id,
      };

      let batchId: string;

      if (isEditMode && batchToEdit?.id) {
        await updateBatch.mutateAsync({ batchId: batchToEdit.id, data: basicInput });
        batchId = batchToEdit.id;
      } else {
        const result = await createBatch.mutateAsync(basicInput);
        batchId = result.id;
      }

      // Step 2: If quality control data is provided, update it separately
      const hasQualityData =
        data.quality_grade ||
        data.quality_score ||
        data.quality_notes ||
        data.humidity_percentage !== undefined ||
        data.maturity_level ||
        data.temperature !== undefined ||
        data.moisture_content !== undefined;

      if (hasQualityData) {
        try {
          await updateQualityControl.mutateAsync({
            batchId,
            data: {
              quality_grade: data.quality_grade || 'A',
              quality_score: data.quality_score || 5,
              quality_notes: data.quality_notes,
              humidity_percentage: data.humidity_percentage,
              maturity_level: data.maturity_level,
              temperature: data.temperature,
              moisture_content: data.moisture_content,
            },
           });
         } catch (_qcError: unknown) {
           // Quality control error but don't fail the entire operation
           toast.warning(t('receptionBatches.form.toast.createdWithQualityWarning'));
         }
      }

      toast.success(isEditMode ? t('receptionBatches.form.toast.updated') : t('receptionBatches.form.toast.created'));
      onOpenChange(false);
      form.reset();
    } catch (error: unknown) {
      toast.error(`${t(isEditMode ? 'receptionBatches.form.toast.updateError' : 'receptionBatches.form.toast.createError')}: ${error instanceof Error ? error.message : ''}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
            <div className="p-2 bg-white/20 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            {isEditMode ? t('receptionBatches.form.editTitle') : t('receptionBatches.form.createTitle')}
          </DialogTitle>
          <p className="text-blue-100 text-sm mt-1">
            {isEditMode
              ? t('receptionBatches.form.editDescription')
              : t('receptionBatches.form.createDescription')}
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Section: Lien avec récolte */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 text-amber-600" />
              <h3 className="font-medium text-amber-800">{t('receptionBatches.form.harvestLink')}</h3>
            </div>
            <div>
              <Label htmlFor="harvest_id" className="text-sm text-amber-700">
                {t('receptionBatches.form.harvestLabel')}
              </Label>
              <Select
                value={form.watch('harvest_id') || '_none'}
                onValueChange={(value) => form.setValue('harvest_id', value === '_none' ? undefined : value)}
                disabled={harvestsLoading}
              >
                <SelectTrigger className="mt-1 bg-white">
                  <SelectValue placeholder={harvestsLoading ? t('receptionBatches.form.loadingHarvests') : t('receptionBatches.form.selectHarvest')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{t('receptionBatches.form.noHarvest')}</SelectItem>
                  {harvests.map((harvest) => (
                    <SelectItem key={harvest.id} value={harvest.id}>
                      {harvest.harvest_date ? new Date(harvest.harvest_date).toLocaleDateString('fr-FR') : t('receptionBatches.form.noDate')} - {harvest.crop_name || t('receptionBatches.form.unknownCrop')} ({harvest.quantity} {harvest.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-amber-600 mt-1">
                {t('receptionBatches.form.harvestAutoFillHint')}
              </p>
            </div>
          </div>

          {/* Section: Localisation */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium text-gray-800">{t('receptionBatches.form.locationSection')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Warehouse */}
              <div>
                <Label htmlFor="warehouse_id" className="text-sm font-medium flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-blue-600" />
                  {t('receptionBatches.form.warehouseLabel')}
                </Label>
                <Select
                  value={form.watch('warehouse_id') || ''}
                  onValueChange={(value) => form.setValue('warehouse_id', value)}
                  disabled={warehousesLoading}
                >
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue placeholder={warehousesLoading ? t('receptionBatches.form.loadingWarehouses') : t('receptionBatches.form.selectWarehouse')} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        {t('receptionBatches.form.noWarehouses')}
                      </SelectItem>
                    ) : (
                      warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                          {warehouse.location && ` - ${warehouse.location}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.warehouse_id && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.warehouse_id.message}
                  </p>
                )}
              </div>

              {/* Parcel */}
              <div>
                <Label htmlFor="parcel_id" className="text-sm font-medium">
                  {t('receptionBatches.form.parcelLabel')}
                  {selectedHarvestId && (
                    <span className="ml-2 text-xs text-gray-500 font-normal">
                      {t('receptionBatches.form.parcelAutoFilled')}
                    </span>
                  )}
                </Label>
                <Select
                  value={form.watch('parcel_id') || ''}
                  onValueChange={(value) => form.setValue('parcel_id', value)}
                  disabled={parcelsLoading || !!selectedHarvestId}
                >
                  <SelectTrigger className={cn(
                    "mt-1",
                    selectedHarvestId ? "bg-gray-100" : "bg-white"
                  )}>
                    <SelectValue placeholder={parcelsLoading ? t('receptionBatches.form.loadingParcels') : t('receptionBatches.form.selectParcel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {parcels.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        {parcelsLoading ? t('receptionBatches.form.loadingParcels') : t('receptionBatches.form.noParcels')}
                      </SelectItem>
                    ) : (
                      parcels.map((parcel) => (
                        <SelectItem key={parcel.id} value={parcel.id}>
                          {parcel.name}
                          {parcel.farm?.name && ` - ${parcel.farm.name}`}
                          {parcel.crop_type && ` (${parcel.crop_type})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.parcel_id && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.parcel_id.message}
                  </p>
                )}
              </div>

              {/* Culture Type (auto-filled) */}
              <div className="md:col-span-2">
                <Label htmlFor="culture_type" className="text-sm font-medium text-gray-500">
                  {t('receptionBatches.form.cropTypeLabel')}
                </Label>
                <Input
                  id="culture_type"
                  {...form.register('culture_type')}
                  placeholder={t('receptionBatches.form.cropTypeHint')}
                  className="mt-1 bg-gray-100"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Section: Détails de la réception */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-blue-800">{t('receptionBatches.form.detailsSection')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reception Date */}
              <div>
                <Label htmlFor="reception_date" className="text-sm font-medium">
                  {t('receptionBatches.form.receptionDateLabel')}
                </Label>
                <Input
                  type="date"
                  id="reception_date"
                  {...form.register('reception_date')}
                  className="mt-1 bg-white"
                />
              </div>

              {/* Reception Time */}
              <div>
                <Label htmlFor="reception_time" className="text-sm font-medium">
                  {t('receptionBatches.form.receptionTimeLabel')}
                </Label>
                <Input
                  type="time"
                  id="reception_time"
                  {...form.register('reception_time')}
                  className="mt-1 bg-white"
                />
              </div>

              {/* Weight */}
              <div>
                <Label htmlFor="weight" className="text-sm font-medium flex items-center gap-2">
                  <Scale className="w-4 h-4 text-blue-600" />
                  {t('receptionBatches.form.grossWeightLabel')}
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    step="0.01"
                    id="weight"
                    {...form.register('weight', { valueAsNumber: true })}
                    placeholder="0.00"
                    className="flex-1 bg-white"
                  />
                  <Select
                    value={form.watch('weight_unit') || 'kg'}
                    onValueChange={(value) => form.setValue('weight_unit', value)}
                  >
                    <SelectTrigger className="w-24 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ton">{t('receptionBatches.form.weightUnit')}</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.formState.errors.weight && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.weight.message}
                  </p>
                )}
              </div>

              {/* Quantity (optional) */}
              <div>
                <Label htmlFor="quantity" className="text-sm font-medium">
                  {t('receptionBatches.form.quantityLabel')}
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    step="1"
                    id="quantity"
                    {...form.register('quantity', { valueAsNumber: true })}
                    placeholder={t('receptionBatches.form.quantityUnit')}
                    className="flex-1 bg-white"
                  />
                  <Input
                    id="quantity_unit"
                    {...form.register('quantity_unit')}
                    placeholder={t('receptionBatches.form.quantityPlaceholder')}
                    className="w-32 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Personnel */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium text-purple-800">{t('receptionBatches.form.personnelSection')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Producer Name */}
              <div>
                <Label htmlFor="producer_name" className="text-sm font-medium">
                  {t('receptionBatches.form.producerNameLabel')}
                </Label>
                <Input
                  id="producer_name"
                  {...form.register('producer_name')}
                  placeholder={t('receptionBatches.form.producerNamePlaceholder')}
                  className="mt-1 bg-white"
                />
              </div>

              {/* Received By */}
              <div>
                <Label htmlFor="received_by" className="text-sm font-medium">
                  {t('receptionBatches.form.receivedByLabel')}
                </Label>
                <Select
                  value={form.watch('received_by') || ''}
                  onValueChange={(value) => form.setValue('received_by', value)}
                >
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue placeholder={t('receptionBatches.form.selectUser')} />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        {t('receptionBatches.form.noUsers')}
                      </SelectItem>
                    ) : (
                      assignableUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.full_name}
                          {u.role && ` (${u.role})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Contrôle qualité (Collapsible) */}
          <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
            <Button
              type="button"
              onClick={() => setShowQualityControl(!showQualityControl)}
              className="w-full flex items-center justify-between p-4 hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-green-800">{t('receptionBatches.form.qualitySection')}</h3>
                <span className="text-xs text-green-600 bg-green-200 px-2 py-0.5 rounded-full">
                  {t('receptionBatches.form.qualityOptional')}
                </span>
              </div>
              {showQualityControl ? (
                <ChevronUp className="w-5 h-5 text-green-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-green-600" />
              )}
            </Button>

            {showQualityControl && (
              <div className="p-4 pt-0 space-y-4 border-t border-green-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Quality Grade */}
                  <div>
                    <Label htmlFor="quality_grade" className="text-sm font-medium">
                      {t('receptionBatches.form.qualityGradeLabel')}
                    </Label>
                    <Select
                      value={form.watch('quality_grade') || ''}
                      onValueChange={(value) =>
                        form.setValue('quality_grade', value as QualityGrade)
                      }
                    >
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue placeholder={t('receptionBatches.form.qualityGradePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Extra">Extra</SelectItem>
                        <SelectItem value="A">{t('receptionBatches.form.qualityGrades.A')}</SelectItem>
                        <SelectItem value="First">{t('receptionBatches.form.qualityGrades.first_choice')}</SelectItem>
                        <SelectItem value="B">{t('receptionBatches.form.qualityGrades.B')}</SelectItem>
                        <SelectItem value="Second">{t('receptionBatches.form.qualityGrades.second_choice')}</SelectItem>
                        <SelectItem value="C">{t('receptionBatches.form.qualityGrades.C')}</SelectItem>
                        <SelectItem value="Third">{t('receptionBatches.form.qualityGrades.third_choice')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quality Score */}
                  <div>
                    <Label htmlFor="quality_score" className="text-sm font-medium">
                      {t('receptionBatches.form.qualityScoreLabel')}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      step="1"
                      id="quality_score"
                      {...form.register('quality_score', { valueAsNumber: true })}
                      placeholder="1-10"
                      className="mt-1 bg-white"
                    />
                  </div>

                  {/* Maturity Level */}
                  <div>
                    <Label htmlFor="maturity_level" className="text-sm font-medium">
                      {t('receptionBatches.form.maturityLabel')}
                    </Label>
                    <Input
                      id="maturity_level"
                      {...form.register('maturity_level')}
                      placeholder={t('receptionBatches.form.maturityPlaceholder')}
                      className="mt-1 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Humidity */}
                  <div>
                    <Label htmlFor="humidity_percentage" className="text-sm font-medium flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-blue-500" />
                      {t('receptionBatches.form.humidityLabel')}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      id="humidity_percentage"
                      {...form.register('humidity_percentage', { valueAsNumber: true })}
                      placeholder="0-100%"
                      className="mt-1 bg-white"
                    />
                  </div>

                  {/* Moisture Content */}
                  <div>
                    <Label htmlFor="moisture_content" className="text-sm font-medium">
                      {t('receptionBatches.form.moistureLabel')}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      id="moisture_content"
                      {...form.register('moisture_content', { valueAsNumber: true })}
                      placeholder="0-100%"
                      className="mt-1 bg-white"
                    />
                  </div>

                  {/* Temperature */}
                  <div>
                    <Label htmlFor="temperature" className="text-sm font-medium flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-red-500" />
                      {t('receptionBatches.form.temperatureLabel')}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      id="temperature"
                      {...form.register('temperature', { valueAsNumber: true })}
                      placeholder={t('receptionBatches.form.temperaturePlaceholder')}
                      className="mt-1 bg-white"
                    />
                  </div>
                </div>

                {/* Quality Notes */}
                <div>
                  <Label htmlFor="quality_notes" className="text-sm font-medium">
                    {t('receptionBatches.form.qualityNotesLabel')}
                  </Label>
                  <Textarea
                    id="quality_notes"
                    {...form.register('quality_notes')}
                    placeholder={t('receptionBatches.form.qualityNotesPlaceholder')}
                    rows={3}
                    className="mt-1 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('receptionBatches.form.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createBatch.isPending || updateBatch.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {(createBatch.isPending || updateBatch.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? t('receptionBatches.form.updating') : t('receptionBatches.form.creating')}
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  {isEditMode ? t('receptionBatches.form.update') : t('receptionBatches.form.create')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
