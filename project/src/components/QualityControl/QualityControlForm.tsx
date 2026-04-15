import { useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useFarms } from '@/hooks/useParcelsQuery';
import { useParcelsByFarm } from '@/hooks/useParcelsQuery';
import { useWorkers } from '@/hooks/useWorkers';
import { useCreateInspection, useUpdateInspection } from '@/hooks/useQualityControl';
import { useFormErrors } from '@/hooks/useFormErrors';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { QualityInspection, InspectionType, InspectionStatus } from '@/lib/api/quality-control';

const INSPECTION_TYPES: { value: InspectionType; label: string }[] = [
  { value: 'pre_harvest', label: 'Pre-Harvest' },
  { value: 'post_harvest', label: 'Post-Harvest' },
  { value: 'storage', label: 'Storage' },
  { value: 'transport', label: 'Transport' },
  { value: 'processing', label: 'Processing' },
];

const INSPECTION_STATUSES: { value: InspectionStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const createSchema = (t: (key: string, fallback?: string) => string) =>
  z.object({
    farm_id: z.string().min(1, t('validation.required', 'Required')),
    parcel_id: z.string().optional(),
    type: z.enum(['pre_harvest', 'post_harvest', 'storage', 'transport', 'processing'], {
      required_error: t('validation.required', 'Required'),
    }),
    inspection_date: z.string().min(1, t('validation.required', 'Required')),
    inspector_id: z.string().optional(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'failed', 'cancelled']).default('scheduled'),
    overall_score: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
    notes: z.string().optional(),
  });

type FormData = z.infer<ReturnType<typeof createSchema>>;

interface QualityControlFormProps {
  open: boolean;
  onClose: () => void;
  inspection?: QualityInspection | null;
}

export default function QualityControlForm({ open, onClose, inspection }: QualityControlFormProps) {
  const { t } = useTranslation('common');
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;
  const isEditing = !!inspection;

  const { data: farms } = useFarms(organizationId);
  const createMutation = useCreateInspection();
  const updateMutation = useUpdateInspection();
  const { handleFormError } = useFormErrors();

  const schema = useMemo(() => createSchema(t), [t]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      farm_id: '',
      parcel_id: '',
      type: 'pre_harvest',
      inspection_date: new Date().toISOString().split('T')[0],
      inspector_id: '',
      status: 'scheduled',
      overall_score: '' as unknown as number,
      notes: '',
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch, reset, setError } = form;
  const selectedFarmId = watch('farm_id');

  const { data: parcels } = useParcelsByFarm(selectedFarmId || undefined, organizationId);
  const { data: workers } = useWorkers(organizationId, selectedFarmId || undefined);

  useEffect(() => {
    if (inspection) {
      reset({
        farm_id: inspection.farm_id || '',
        parcel_id: inspection.parcel_id || '',
        type: inspection.type,
        inspection_date: inspection.inspection_date?.split('T')[0] || '',
        inspector_id: inspection.inspector_id || '',
        status: inspection.status,
        overall_score: inspection.overall_score ?? ('' as unknown as number),
        notes: inspection.notes || '',
      });
    } else {
      reset({
        farm_id: '',
        parcel_id: '',
        type: 'pre_harvest',
        inspection_date: new Date().toISOString().split('T')[0],
        inspector_id: '',
        status: 'scheduled',
        overall_score: '' as unknown as number,
        notes: '',
      });
    }
  }, [inspection, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload: Partial<QualityInspection> = {
        farm_id: data.farm_id,
        parcel_id: data.parcel_id || undefined,
        type: data.type,
        inspection_date: data.inspection_date,
        inspector_id: data.inspector_id || undefined,
        status: data.status,
        overall_score: data.overall_score !== '' ? Number(data.overall_score) : undefined,
        notes: data.notes || undefined,
      };

      if (isEditing && inspection) {
        await updateMutation.mutateAsync({ id: inspection.id, data: payload });
        toast.success(t('production.qualityControl.form.updateSuccess', 'Inspection updated'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('production.qualityControl.form.createSuccess', 'Inspection created'));
      }
      onClose();
    } catch (error) {
      handleFormError(error, setError);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending || isSubmitting;

  const footer = (
    <div className="flex gap-2 justify-end w-full">
      <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
        {t('common.cancel', 'Cancel')}
      </Button>
      <Button type="submit" form="quality-control-form" disabled={isSaving}>
        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {isEditing
          ? t('production.qualityControl.form.update', 'Update')
          : t('production.qualityControl.form.create', 'Create')}
      </Button>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={
        isEditing
          ? t('production.qualityControl.form.editTitle', 'Edit Inspection')
          : t('production.qualityControl.form.createTitle', 'New Inspection')
      }
      size="xl"
      footer={footer}
    >
      <form id="quality-control-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label={t('production.qualityControl.form.type', 'Inspection Type')}
            error={errors.type?.message}
            required
          >
            <Select
              value={watch('type')}
              onValueChange={(v) => setValue('type', v as InspectionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSPECTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(`production.qualityControl.list.filters.type.${type.value === 'pre_harvest' ? 'preHarvest' : type.value === 'post_harvest' ? 'postHarvest' : type.value}`, type.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label={t('production.qualityControl.form.status', 'Status')}
            error={errors.status?.message}
          >
            <Select
              value={watch('status')}
              onValueChange={(v) => setValue('status', v as InspectionStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSPECTION_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label={t('production.qualityControl.form.farm', 'Farm')}
            error={errors.farm_id?.message}
            required
          >
            <Select
              value={watch('farm_id')}
              onValueChange={(v) => {
                setValue('farm_id', v);
                setValue('parcel_id', '');
                setValue('inspector_id', '');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('production.qualityControl.form.selectFarm', 'Select farm')} />
              </SelectTrigger>
              <SelectContent>
                {farms?.map((farm) => (
                  <SelectItem key={farm.id} value={farm.id}>
                    {farm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label={t('production.qualityControl.form.parcel', 'Parcel')}
            error={errors.parcel_id?.message}
          >
            <Select
              value={watch('parcel_id') || ''}
              onValueChange={(v) => setValue('parcel_id', v === '__none__' ? '' : v)}
              disabled={!selectedFarmId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('production.qualityControl.form.selectParcel', 'Select parcel (optional)')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('common.none', 'None')}</SelectItem>
                {parcels?.map((parcel) => (
                  <SelectItem key={parcel.id} value={parcel.id}>
                    {parcel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label={t('production.qualityControl.form.date', 'Inspection Date')}
            error={errors.inspection_date?.message}
            required
          >
            <Input type="date" {...register('inspection_date')} />
          </FormField>

          <FormField
            label={t('production.qualityControl.form.inspector', 'Inspector')}
            error={errors.inspector_id?.message}
          >
            <Select
              value={watch('inspector_id') || ''}
              onValueChange={(v) => setValue('inspector_id', v === '__none__' ? '' : v)}
              disabled={!selectedFarmId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('production.qualityControl.form.selectInspector', 'Select inspector (optional)')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('common.none', 'None')}</SelectItem>
                {workers?.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.first_name} {worker.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <FormField
          label={t('production.qualityControl.form.score', 'Overall Score (0-100)')}
          error={errors.overall_score?.message}
        >
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="0-100"
            {...register('overall_score')}
          />
        </FormField>

        <FormField
          label={t('production.qualityControl.form.notes', 'Notes')}
          error={errors.notes?.message}
        >
          <Textarea
            placeholder={t('production.qualityControl.form.notesPlaceholder', 'Add notes about this inspection...')}
            rows={3}
            {...register('notes')}
          />
        </FormField>
      </form>
    </ResponsiveDialog>
  );
}
