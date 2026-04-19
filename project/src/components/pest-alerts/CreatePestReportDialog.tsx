import {  useState, useMemo  } from "react";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/FormField';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/radix-select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePestReport, usePestDiseaseLibrary } from '@/hooks/usePestAlerts';
import { useFarmHierarchy } from '@/hooks/useFarmHierarchy';
import { useParcels } from '@/hooks/useParcels';

const createFormSchema = (t: (key: string, fallback: string) => string) => z.object({
  farm_id: z.string().min(1, t('pestReport.validation.farmRequired', 'Farm is required')),
  parcel_id: z.string().min(1, t('pestReport.validation.parcelRequired', 'Parcel is required')),
  pest_disease_id: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical'] as const),
  detection_method: z.enum(['visual_inspection', 'trap_monitoring', 'lab_test', 'field_scout', 'automated_sensor', 'worker_report'] as const),
  notes: z.string().optional(),
  affected_area_percentage: z.string().transform(val => val ? parseInt(val, 10) : undefined).optional(),
});

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

export function CreatePestReportDialog() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { mutate: createReport, isPending } = useCreatePestReport();
  const { data: farms } = useFarmHierarchy(currentOrganization?.id);
  const { data: library } = usePestDiseaseLibrary(currentOrganization?.id ?? null);
  const formSchema = useMemo(() => createFormSchema(t), [t]);
  
  const form = useForm<z.input<typeof formSchema>, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      severity: 'low',
      detection_method: 'visual_inspection',
    },
  });

  const selectedFarmId = form.watch('farm_id');
  const { parcels } = useParcels(selectedFarmId || null);

  const onSubmit = (values: FormValues) => {
    if (!currentOrganization?.id) return;

    createReport({
      organizationId: currentOrganization.id,
      data: {
        ...values,
        photo_urls: [], // TODO: Implement photo upload
      },
    }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t('pestReport.newReportButton', 'New report')}
        </Button>
      </DialogTrigger>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        size="lg"
        contentClassName="max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{t('pestReport.title', 'Report a Pest or Disease')}</DialogTitle>
          <DialogDescription>
            {t('pestReport.description', 'Fill out the form below to create a new report.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="farm_id"
              render={({ field }) => (
                <FormField 
                  label={t('pestReport.farmLabel', 'Farm')} 
                  error={form.formState.errors.farm_id?.message}
                  required
                >
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('pestReport.selectFarmPlaceholder', 'Select a farm')} />
                    </SelectTrigger>
                    <SelectContent>
                      {farms?.map((farm) => (
                        <SelectItem key={farm.farm_id} value={farm.farm_id}>
                          {farm.farm_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="parcel_id"
              render={({ field }) => (
                <FormField 
                  label={t('pestReport.parcelLabel', 'Parcel')} 
                  error={form.formState.errors.parcel_id?.message}
                  required
                >
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={!selectedFarmId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('pestReport.selectParcelPlaceholder', 'Select a parcel')} />
                    </SelectTrigger>
                    <SelectContent>
                      {parcels.map((parcel) => (
                        <SelectItem key={parcel.id} value={parcel.id}>
                          {parcel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="pest_disease_id"
            render={({ field }) => (
                <FormField 
                  label={t('pestReport.pestDiseaseLabel', 'Pest / disease (optional)')} 
                  error={form.formState.errors.pest_disease_id?.message}
                >
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('pestReport.identifyIfKnown', 'Identify if known')} />
                    </SelectTrigger>
                    <SelectContent>
                      {library?.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.type === 'pest' ? t('pestReport.type.pest', 'Pest') : t('pestReport.type.disease', 'Disease')})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormField 
                  label={t('pestReport.severityLabel', 'Severity')} 
                  error={form.formState.errors.severity?.message}
                  required
                >
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('pestReport.severityPlaceholder', 'Severity level')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('pestReport.severityOptions.low', 'Low')}</SelectItem>
                      <SelectItem value="medium">{t('pestReport.severityOptions.medium', 'Medium')}</SelectItem>
                      <SelectItem value="high">{t('pestReport.severityOptions.high', 'High')}</SelectItem>
                      <SelectItem value="critical">{t('pestReport.severityOptions.critical', 'Critical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="detection_method"
              render={({ field }) => (
                <FormField 
                  label={t('pestReport.detectionMethodLabel', 'Detection method')} 
                  error={form.formState.errors.detection_method?.message}
                  required
                >
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('pestReport.detectionMethodPlaceholder', 'Method')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visual_inspection">{t('pestReport.detectionMethodOptions.visualInspection', 'Visual inspection')}</SelectItem>
                      <SelectItem value="trap_monitoring">{t('pestReport.detectionMethodOptions.trapMonitoring', 'Trap monitoring')}</SelectItem>
                      <SelectItem value="lab_test">{t('pestReport.detectionMethodOptions.labTest', 'Lab test')}</SelectItem>
                      <SelectItem value="field_scout">{t('pestReport.detectionMethodOptions.fieldScout', 'Field scouting')}</SelectItem>
                      <SelectItem value="automated_sensor">{t('pestReport.detectionMethodOptions.automatedSensor', 'Automated sensor')}</SelectItem>
                      <SelectItem value="worker_report">{t('pestReport.detectionMethodOptions.workerReport', 'Worker report')}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="affected_area_percentage"
              render={({ field }) => (
                <FormField 
                  label={t('pestReport.affectedAreaLabel', 'Affected area (%)')} 
                  error={form.formState.errors.affected_area_percentage?.message}
                >
                <Input type="number" min="0" max="100" {...field} value={field.value || ''} />
              </FormField>
            )}
          />

          <Controller
            control={form.control}
            name="notes"
              render={({ field }) => (
                <FormField 
                  label={t('pestReport.notesLabel', 'Notes / observations')} 
                  error={form.formState.errors.notes?.message}
                >
                  <Textarea 
                  placeholder={t('pestReport.notesPlaceholder', 'Describe the symptoms, exact location, etc.')} 
                  className="resize-none" 
                  {...field} 
                />
              </FormField>
            )}
          />

          {/* Photo upload placeholder */}
          <div className="space-y-2">
            <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('pestReport.photoUploadLabel', 'Photos')}</div>
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">
                {t('pestReport.clickToAddPhotos', 'Click to add photos')}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {t('pestReport.photoFormats', 'JPG, PNG up to 5MB')}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('pestReport.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('pestReport.createReport', 'Create report')}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>
    </>
  );
}
