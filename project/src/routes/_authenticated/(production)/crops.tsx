import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useCrops, useCreateCrop } from '@/hooks/useCrops';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Sprout, Plus, Building2 } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';

function CropsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const createCrop = useCreateCrop();

  const { data: crops = [], isLoading, isError } = useCrops();

  const createSchema = useMemo(() => {
    const requiredMessage = t('validation.required', 'Required');
    const optionalNumber = z.preprocess(
      (value) => value === '' || value === null ? undefined : value,
      z.coerce.number().optional(),
    );

    return z.object({
      farm_id: z.string().min(1, requiredMessage),
      variety_id: z.string().min(1, requiredMessage),
      name: z.string().min(1, requiredMessage),
      parcel_id: z.string().optional(),
      planting_date: z.string().optional(),
      expected_harvest_date: z.string().optional(),
      planted_area: optionalNumber,
      notes: z.string().optional(),
    });
  }, [t]);

  type FormData = z.input<typeof createSchema>;
  type SubmitData = z.output<typeof createSchema>;

  const form = useForm<FormData, unknown, SubmitData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      farm_id: '',
      variety_id: '',
      name: '',
      parcel_id: '',
      planting_date: '',
      expected_harvest_date: '',
      planted_area: undefined,
      notes: '',
    },
  });

  const onSubmit = async (data: SubmitData) => {
    try {
      await createCrop.mutateAsync({
        farm_id: data.farm_id,
        variety_id: data.variety_id,
        name: data.name,
        parcel_id: data.parcel_id || undefined,
        planting_date: data.planting_date || undefined,
        expected_harvest_date: data.expected_harvest_date || undefined,
        planted_area: data.planted_area,
        notes: data.notes || undefined,
      });
      toast.success(t('crops.createSuccess', 'Crop created successfully'));
      setShowForm(false);
      form.reset();
    } catch {
      toast.error(t('crops.createError', 'Failed to create crop'));
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'planted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'growing': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'harvested': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'dormant': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (!currentOrganization) {
    return <PageLoader />;
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          { icon: Sprout, label: t('crops.pageTitle', 'Crops'), isActive: true },
        ]}
        title={t('crops.pageTitle', 'Crops')}
        subtitle={t('crops.description', 'Manage your crop plantings and track growth.')}
        actions={
          <Button variant="green" onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('crops.addCrop', 'Add Crop')}
          </Button>
        }
      />

      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-lg p-6 h-48" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-red-500">{t('common.error', 'An error occurred while loading data.')}</p>
          </div>
        ) : crops.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <Sprout className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('crops.noCrops', 'No crops yet')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('crops.noCropsDescription', 'Start by adding your first crop planting.')}
            </p>
            <Button variant="green" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('crops.addCrop', 'Add Crop')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {crops.map((crop) => (
              <Card key={crop.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold">{crop.name}</CardTitle>
                    {crop.status && (
                      <Badge className={getStatusColor(crop.status)}>
                        {crop.status}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {crop.farm_name && (
                      <p><span className="font-medium">{t('crops.farm', 'Farm')}:</span> {crop.farm_name}</p>
                    )}
                    {crop.parcel_name && (
                      <p><span className="font-medium">{t('crops.parcel', 'Parcel')}:</span> {crop.parcel_name}</p>
                    )}
                    {crop.planted_area && (
                      <p><span className="font-medium">{t('crops.area', 'Area')}:</span> {crop.planted_area} ha</p>
                    )}
                    {crop.planting_date && (
                      <p><span className="font-medium">{t('crops.plantingDate', 'Planted')}:</span> {format(new Date(crop.planting_date), 'dd MMM yyyy')}</p>
                    )}
                    {crop.expected_harvest_date && (
                      <p><span className="font-medium">{t('crops.expectedHarvest', 'Expected Harvest')}:</span> {format(new Date(crop.expected_harvest_date), 'dd MMM yyyy')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{t('crops.addCrop', 'Add Crop')}</h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="crop-farm-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('crops.farmId', 'Farm ID')}
                </label>
                <Input
                  id="crop-farm-id"
                  {...form.register('farm_id')}
                  placeholder={t('crops.farmIdPlaceholder', 'Enter farm ID')}
                  className={form.formState.errors.farm_id ? 'border-red-400' : ''}
                />
                {form.formState.errors.farm_id && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.farm_id.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="crop-variety-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('crops.varietyId', 'Variety ID')}
                </label>
                <Input
                  id="crop-variety-id"
                  {...form.register('variety_id')}
                  placeholder={t('crops.varietyIdPlaceholder', 'Enter variety ID')}
                  className={form.formState.errors.variety_id ? 'border-red-400' : ''}
                />
                {form.formState.errors.variety_id && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.variety_id.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="crop-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('crops.cropName', 'Crop Name')}
                </label>
                <Input
                  id="crop-name"
                  {...form.register('name')}
                  placeholder={t('crops.cropNamePlaceholder', 'Enter crop name')}
                  className={form.formState.errors.name ? 'border-red-400' : ''}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="crop-parcel-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('crops.parcelId', 'Parcel ID')}
                </label>
                <Input
                  id="crop-parcel-id"
                  {...form.register('parcel_id')}
                  placeholder={t('crops.parcelIdPlaceholder', 'Enter parcel ID')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="crop-planting-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('crops.plantingDate', 'Planting Date')}
                  </label>
                  <Input id="crop-planting-date" {...form.register('planting_date')} type="date" />
                </div>

                <div>
                  <label htmlFor="crop-expected-harvest-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('crops.expectedHarvest', 'Expected Harvest Date')}
                  </label>
                  <Input id="crop-expected-harvest-date" {...form.register('expected_harvest_date')} type="date" />
                </div>
              </div>

              <div>
                <label htmlFor="crop-planted-area" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('crops.plantedArea', 'Planted Area (ha)')}
                </label>
                <Input
                  id="crop-planted-area"
                  {...form.register('planted_area')}
                  type="number"
                  step="0.01"
                  placeholder={t('crops.plantedAreaPlaceholder', 'Enter planted area')}
                  className={form.formState.errors.planted_area ? 'border-red-400' : ''}
                />
                {form.formState.errors.planted_area && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.planted_area.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="crop-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('crops.notes', 'Notes')}
                </label>
                <Textarea
                  id="crop-notes"
                  {...form.register('notes')}
                  placeholder={t('crops.notesPlaceholder', 'Add crop notes')}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    form.reset();
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" variant="green" disabled={createCrop.isPending}>
                  {createCrop.isPending ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/crops')({
  component: withRouteProtection(CropsPage, 'read', 'CropCycle'),
});
