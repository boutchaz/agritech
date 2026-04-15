import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useCreateProductApplication, useProductApplications } from '@/hooks/useProductApplications';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Droplets, Plus, Building2 } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { toast } from 'sonner';

function ProductApplicationsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const { data: applications = [], isLoading, isError } = useProductApplications();
  const createApplication = useCreateProductApplication();

  const createSchema = useMemo(() => {
    const requiredMessage = t('validation.required', 'Required');
    const optionalNumber = z.preprocess(
      (value) => value === '' || value === null ? undefined : value,
      z.coerce.number().optional(),
    );
    const requiredNumber = z.preprocess(
      (value) => value === '' || value === null ? undefined : value,
      z.coerce.number(),
    );

    return z.object({
      product_id: z.string().min(1, requiredMessage),
      farm_id: z.string().min(1, requiredMessage),
      application_date: z.string().min(1, requiredMessage),
      quantity_used: requiredNumber,
      area_treated: requiredNumber,
      parcel_id: z.string().optional(),
      cost: optionalNumber,
      notes: z.string().optional(),
    });
  }, [t]);

  type FormData = z.input<typeof createSchema>;
  type SubmitData = z.output<typeof createSchema>;

  const form = useForm<FormData, unknown, SubmitData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      product_id: '',
      farm_id: '',
      application_date: '',
      quantity_used: undefined,
      area_treated: undefined,
      parcel_id: '',
      cost: undefined,
      notes: '',
    },
  });

  const onSubmit = async (data: SubmitData) => {
    try {
      await createApplication.mutateAsync({
        product_id: data.product_id,
        farm_id: data.farm_id,
        application_date: data.application_date,
        quantity_used: data.quantity_used,
        area_treated: data.area_treated,
        parcel_id: data.parcel_id || undefined,
        cost: data.cost,
        notes: data.notes || undefined,
      });
      toast.success(t('productApplications.createSuccess', 'Product application recorded successfully'));
      setShowForm(false);
      form.reset();
    } catch {
      toast.error(t('productApplications.createError', 'Failed to record product application'));
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
          { icon: Droplets, label: t('productApplications.pageTitle', 'Product Applications'), isActive: true },
        ]}
        title={t('productApplications.pageTitle', 'Product Applications')}
        subtitle={t('productApplications.description', 'Track crop treatments and product usage from inventory.')}
        actions={
          <Button variant="green" onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('productApplications.addApplication', 'Record Application')}
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
        ) : applications.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <Droplets className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('productApplications.noApplications', 'No product applications yet')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('productApplications.noApplicationsDescription', 'Record your first product application to track treatments.')}
            </p>
            <Button variant="green" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('productApplications.addApplication', 'Record Application')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => (
              <Card key={app.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">
                    {app.inventory?.name || t('productApplications.unnamedProduct', 'Product')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p><span className="font-medium">{t('productApplications.date', 'Date')}:</span> {format(new Date(app.application_date), 'dd MMM yyyy')}</p>
                    <p><span className="font-medium">{t('productApplications.quantityUsed', 'Quantity')}:</span> {app.quantity_used} {app.inventory?.unit || ''}</p>
                    <p><span className="font-medium">{t('productApplications.areaTreated', 'Area')}:</span> {app.area_treated} ha</p>
                    {app.notes && (
                      <p className="text-gray-500 dark:text-gray-500 italic">{app.notes}</p>
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
            <h2 className="text-lg font-semibold mb-4">{t('productApplications.addApplication', 'Record Application')}</h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="product-application-product-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('productApplications.productId', 'Product ID')}
                  </label>
                  <Input
                    id="product-application-product-id"
                    {...form.register('product_id')}
                    placeholder={t('productApplications.productIdPlaceholder', 'Enter product ID')}
                    className={form.formState.errors.product_id ? 'border-red-400' : ''}
                  />
                  {form.formState.errors.product_id && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.product_id.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="product-application-farm-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('productApplications.farmId', 'Farm ID')}
                  </label>
                  <Input
                    id="product-application-farm-id"
                    {...form.register('farm_id')}
                    placeholder={t('productApplications.farmIdPlaceholder', 'Enter farm ID')}
                    className={form.formState.errors.farm_id ? 'border-red-400' : ''}
                  />
                  {form.formState.errors.farm_id && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.farm_id.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="product-application-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('productApplications.date', 'Application Date')}
                </label>
                <Input
                  id="product-application-date"
                  {...form.register('application_date')}
                  type="date"
                  className={form.formState.errors.application_date ? 'border-red-400' : ''}
                />
                {form.formState.errors.application_date && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.application_date.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="product-application-quantity-used" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('productApplications.quantityUsed', 'Quantity Used')}
                  </label>
                  <Input
                    id="product-application-quantity-used"
                    {...form.register('quantity_used')}
                    type="number"
                    step="0.01"
                    placeholder={t('productApplications.quantityUsedPlaceholder', 'Enter quantity used')}
                    className={form.formState.errors.quantity_used ? 'border-red-400' : ''}
                  />
                  {form.formState.errors.quantity_used && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.quantity_used.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="product-application-area-treated" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('productApplications.areaTreated', 'Area Treated')}
                  </label>
                  <Input
                    id="product-application-area-treated"
                    {...form.register('area_treated')}
                    type="number"
                    step="0.01"
                    placeholder={t('productApplications.areaTreatedPlaceholder', 'Enter treated area')}
                    className={form.formState.errors.area_treated ? 'border-red-400' : ''}
                  />
                  {form.formState.errors.area_treated && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.area_treated.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="product-application-parcel-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('productApplications.parcelId', 'Parcel ID')}
                  </label>
                  <Input
                    id="product-application-parcel-id"
                    {...form.register('parcel_id')}
                    placeholder={t('productApplications.parcelIdPlaceholder', 'Enter parcel ID')}
                  />
                </div>

                <div>
                  <label htmlFor="product-application-cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('productApplications.cost', 'Cost')}
                  </label>
                  <Input
                    id="product-application-cost"
                    {...form.register('cost')}
                    type="number"
                    step="0.01"
                    placeholder={t('productApplications.costPlaceholder', 'Enter cost')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="product-application-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('productApplications.notes', 'Notes')}
                </label>
                <Textarea
                  id="product-application-notes"
                  {...form.register('notes')}
                  placeholder={t('productApplications.notesPlaceholder', 'Add application notes')}
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
                <Button type="submit" variant="green" disabled={createApplication.isPending}>
                  {createApplication.isPending ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/product-applications')({
  component: withRouteProtection(ProductApplicationsPage, 'read', 'Stock'),
});
