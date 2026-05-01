import { useCallback, useMemo, useState } from 'react';
import { Plus, X, Calendar, DollarSign, Clock, Wrench } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { FormField } from './ui/FormField';
import { useEquipmentItem, useEquipmentMaintenance, useCreateMaintenance, useDeleteMaintenance } from '../hooks/useEquipment';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { MaintenanceType, CreateMaintenanceInput } from '../lib/api/equipment';

const MAINTENANCE_TYPES: MaintenanceType[] = [
  'oil_change', 'repair', 'inspection', 'tire_replacement',
  'battery', 'filter', 'fuel_fill', 'registration', 'insurance', 'other',
];

const optionalNumber = z
  .union([z.number(), z.string().length(0), z.nan()])
  .transform((v) => (typeof v === 'number' && !Number.isNaN(v) ? v : undefined))
  .optional();

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const createMaintenanceSchema = (t: (key: string, fallback?: string) => string) =>
  z.object({
    type: z.enum(MAINTENANCE_TYPES as unknown as [MaintenanceType, ...MaintenanceType[]]),
    maintenance_date: z.string().min(1, t('equipment.validation.dateRequired', 'Date is required')),
    cost: z
      .union([z.number(), z.nan()])
      .transform((v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0))
      .refine((v) => v >= 0, { message: t('equipment.validation.nonNegative', 'Must be ≥ 0') }),
    description: optionalString,
    vendor: optionalString,
    hour_meter_reading: optionalNumber.refine((v) => v === undefined || v >= 0, {
      message: t('equipment.validation.nonNegative', 'Must be ≥ 0'),
    }),
    next_service_date: optionalString,
  });

type MaintenanceFormValues = z.infer<ReturnType<typeof createMaintenanceSchema>>;

const todayISO = () => new Date().toISOString().split('T')[0];

const DEFAULT_VALUES = {
  type: 'oil_change' as MaintenanceType,
  maintenance_date: todayISO(),
  cost: 0,
} as unknown as MaintenanceFormValues;

interface EquipmentMaintenanceProps {
  equipmentId: string | null;
  onClose: () => void;
}

export const EquipmentMaintenance = ({ equipmentId, onClose }: EquipmentMaintenanceProps) => {
  const { t } = useTranslation();

  const { data: equipment } = useEquipmentItem(equipmentId ?? undefined);
  const { data: maintenanceRecords = [], isLoading } = useEquipmentMaintenance(equipmentId ?? undefined);
  const createMutation = useCreateMaintenance();
  const deleteMutation = useDeleteMaintenance();

  const [showForm, setShowForm] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; description?: string; variant?: 'destructive' | 'default'; onConfirm: () => void }>({ title: '', onConfirm: () => {} });

  const schema = useMemo(() => createMaintenanceSchema(t as unknown as (key: string, fallback?: string) => string), [t]);
  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: DEFAULT_VALUES,
    mode: 'onSubmit',
  });
  const { register, handleSubmit, reset, formState: { errors } } = form;

  const totalYTDCost = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return maintenanceRecords
      .filter(r => new Date(r.maintenance_date).getFullYear() === currentYear)
      .reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  }, [maintenanceRecords]);

  const onSubmit = useCallback(async (values: MaintenanceFormValues) => {
    if (!equipmentId) return;
    try {
      await createMutation.mutateAsync({
        equipmentId,
        data: values as CreateMaintenanceInput,
      });
      toast.success(t('equipment.maintenanceCreated', 'Maintenance record created'));
      setShowForm(false);
      reset({ ...DEFAULT_VALUES, maintenance_date: todayISO() });
    } catch (err: any) {
      toast.error(err.message || t('equipment.maintenanceCreateFailed', 'Failed to create maintenance record'));
    }
  }, [equipmentId, createMutation, reset, t]);

  const handleDelete = useCallback((id: string) => {
    setConfirmAction({
      title: t('equipment.deleteMaintenance', 'Delete maintenance record?'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          toast.success(t('equipment.maintenanceDeleted', 'Maintenance record deleted'));
        } catch (err: any) {
          toast.error(err.message || t('equipment.maintenanceDeleteFailed', 'Failed to delete'));
        }
      },
    });
    setConfirmOpen(true);
  }, [deleteMutation, t]);

  if (!equipmentId) return null;

  return (
    <ResponsiveDialog
      open={!!equipmentId}
      onOpenChange={(open: boolean) => { if (!open) onClose(); }}
      title={t('equipment.maintenanceTitle', 'Maintenance History')}
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
        {equipment && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{equipment.name}</h3>
              <p className="text-sm text-muted-foreground">
                {[equipment.brand, equipment.model].filter(Boolean).join(' ')}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {t('equipment.ytdCost', 'Total YTD')}: <span className="text-primary font-bold">{totalYTDCost.toLocaleString()} MAD</span>
          </p>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('equipment.logMaintenance', 'Log Maintenance')}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit(onSubmit)} className="border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label={t('equipment.maintenanceType.label', 'Type')} htmlFor="m_type" required error={errors.type?.message}>
                <Select id="m_type" {...register('type')}>
                  {MAINTENANCE_TYPES.map(mt => (
                    <option key={mt} value={mt}>{t(`equipment.maintenanceType.${mt}`, mt.replace(/_/g, ' '))}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label={t('equipment.maintenanceDate', 'Date')} htmlFor="m_date" required error={errors.maintenance_date?.message}>
                <Input id="m_date" type="date" {...register('maintenance_date')} />
              </FormField>
              <FormField label={t('equipment.cost', 'Cost (MAD)')} htmlFor="m_cost" required error={errors.cost?.message}>
                <Input id="m_cost" type="number" step="0.01" min={0} {...register('cost', { valueAsNumber: true })} />
              </FormField>
              <FormField label={t('equipment.vendor', 'Vendor')} htmlFor="m_vendor" error={errors.vendor?.message}>
                <Input id="m_vendor" {...register('vendor')} />
              </FormField>
              <FormField label={t('equipment.hourMeter', 'Hour Meter')} htmlFor="m_hours" error={errors.hour_meter_reading?.message}>
                <Input id="m_hours" type="number" step="0.01" min={0} {...register('hour_meter_reading', { valueAsNumber: true })} />
              </FormField>
              <FormField label={t('equipment.nextServiceDate', 'Next Service Date')} htmlFor="m_next" error={errors.next_service_date?.message}>
                <Input id="m_next" type="date" {...register('next_service_date')} />
              </FormField>
            </div>
            <FormField label={t('equipment.description', 'Description')} htmlFor="m_desc" error={errors.description?.message}>
              <Textarea id="m_desc" rows={2} {...register('description')} />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : maintenanceRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('equipment.noMaintenance', 'No maintenance records')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {maintenanceRecords.map(record => (
              <div key={record.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                      {t(`equipment.maintenanceType.${record.type}`, record.type.replace(/_/g, ' '))}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {record.maintenance_date}
                    </span>
                  </div>
                  {record.description && <p className="text-sm">{record.description}</p>}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {record.cost > 0 && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {Number(record.cost).toLocaleString()} MAD
                      </span>
                    )}
                    {record.vendor && <span>{record.vendor}</span>}
                    {record.hour_meter_reading != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {record.hour_meter_reading}h
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id)}>
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </ResponsiveDialog>
  );
};
