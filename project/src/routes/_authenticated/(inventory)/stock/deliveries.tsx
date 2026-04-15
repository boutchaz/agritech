import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useDeliveries, useCancelDelivery, useCreateDelivery } from '@/hooks/useDeliveries';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Textarea } from '@/components/ui/Textarea';
import { Truck, Plus } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';

function DeliveriesPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const { data: deliveries = [], isLoading, isError } = useDeliveries();
  const createDelivery = useCreateDelivery();
  const cancelDelivery = useCancelDelivery();

  const createSchema = useMemo(() => {
    const requiredMessage = t('validation.required', 'Required');

    return z.object({
      farm_id: z.string().min(1, requiredMessage),
      delivery_date: z.string().min(1, requiredMessage),
      delivery_type: z.enum(['market_sale', 'export', 'processor', 'direct_client', 'wholesale']),
      customer_name: z.string().min(1, requiredMessage),
      delivery_address: z.string().optional(),
      vehicle_info: z.string().optional(),
      notes: z.string().optional(),
    });
  }, [t]);

  type FormData = z.input<typeof createSchema>;
  type SubmitData = z.output<typeof createSchema>;

  const form = useForm<FormData, unknown, SubmitData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      farm_id: '',
      delivery_date: '',
      delivery_type: 'market_sale',
      customer_name: '',
      delivery_address: '',
      vehicle_info: '',
      notes: '',
    },
  });

  const onSubmit = async (data: SubmitData) => {
    try {
      await createDelivery.mutateAsync({
        farm_id: data.farm_id,
        delivery_date: data.delivery_date,
        delivery_type: data.delivery_type,
        customer_name: data.customer_name,
        delivery_address: data.delivery_address || undefined,
        vehicle_info: data.vehicle_info || undefined,
        notes: data.notes || undefined,
        items: [],
      });
      toast.success(t('deliveries.createSuccess', 'Delivery created successfully'));
      setShowForm(false);
      form.reset();
    } catch {
      toast.error(t('deliveries.createError', 'Failed to create delivery'));
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'in_transit': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleCancel = async (deliveryId: string) => {
    try {
      await cancelDelivery.mutateAsync({ deliveryId });
      toast.success(t('deliveries.cancelSuccess', 'Delivery cancelled'));
    } catch {
      toast.error(t('deliveries.cancelError', 'Failed to cancel delivery'));
    }
  };

  if (!currentOrganization) {
    return <PageLoader />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
                <Truck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t('deliveries.pageTitle', 'Deliveries')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('deliveries.description', 'Track and manage your product deliveries.')}
                </p>
              </div>
            </div>
            <Button variant="green" onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('deliveries.addDelivery', 'New Delivery')}
            </Button>
          </div>
        </div>

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
        ) : deliveries.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <Truck className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('deliveries.noDeliveries', 'No deliveries yet')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('deliveries.noDeliveriesDescription', 'Create your first delivery to start tracking.')}
            </p>
            <Button variant="green" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('deliveries.addDelivery', 'New Delivery')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deliveries.map((delivery) => (
              <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {delivery.customer_name || t('deliveries.unnamedDelivery', 'Delivery')}
                    </CardTitle>
                    {delivery.status && (
                      <Badge className={getStatusColor(delivery.status)}>
                        {delivery.status}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {delivery.delivery_date && (
                      <p><span className="font-medium">{t('deliveries.date', 'Date')}:</span> {format(new Date(delivery.delivery_date), 'dd MMM yyyy')}</p>
                    )}
                    {delivery.delivery_type && (
                      <p><span className="font-medium">{t('deliveries.type', 'Type')}:</span> {delivery.delivery_type}</p>
                    )}
                    {delivery.total_amount !== undefined && delivery.total_amount !== null && (
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {Number(delivery.total_amount).toLocaleString()} {delivery.currency || 'MAD'}
                      </p>
                    )}
                  </div>
                  {(delivery.status === 'pending' || delivery.status === 'in_transit') && (
                    <div className="mt-4">
                      <Button variant="outline" size="sm" onClick={() => handleCancel(delivery.id)}>
                        {t('common.cancel', 'Cancel')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{t('deliveries.addDelivery', 'New Delivery')}</h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="delivery-farm-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('deliveries.farmId', 'Farm ID')}
                </label>
                <Input
                  id="delivery-farm-id"
                  {...form.register('farm_id')}
                  placeholder={t('deliveries.farmIdPlaceholder', 'Enter farm ID')}
                  className={form.formState.errors.farm_id ? 'border-red-400' : ''}
                />
                {form.formState.errors.farm_id && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.farm_id.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="delivery-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('deliveries.date', 'Delivery Date')}
                  </label>
                  <Input
                    id="delivery-date"
                    {...form.register('delivery_date')}
                    type="date"
                    className={form.formState.errors.delivery_date ? 'border-red-400' : ''}
                  />
                  {form.formState.errors.delivery_date && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.delivery_date.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="delivery-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('deliveries.type', 'Delivery Type')}
                  </label>
                  <NativeSelect
                    id="delivery-type"
                    {...form.register('delivery_type')}
                    className={form.formState.errors.delivery_type ? 'border-red-400' : ''}
                  >
                    <option value="market_sale">{t('deliveries.types.marketSale', 'Market Sale')}</option>
                    <option value="export">{t('deliveries.types.export', 'Export')}</option>
                    <option value="processor">{t('deliveries.types.processor', 'Processor')}</option>
                    <option value="direct_client">{t('deliveries.types.directClient', 'Direct Client')}</option>
                    <option value="wholesale">{t('deliveries.types.wholesale', 'Wholesale')}</option>
                  </NativeSelect>
                  {form.formState.errors.delivery_type && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.delivery_type.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="delivery-customer-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('deliveries.customerName', 'Customer Name')}
                </label>
                <Input
                  id="delivery-customer-name"
                  {...form.register('customer_name')}
                  placeholder={t('deliveries.customerNamePlaceholder', 'Enter customer name')}
                  className={form.formState.errors.customer_name ? 'border-red-400' : ''}
                />
                {form.formState.errors.customer_name && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.customer_name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="delivery-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('deliveries.deliveryAddress', 'Delivery Address')}
                </label>
                <Input
                  id="delivery-address"
                  {...form.register('delivery_address')}
                  placeholder={t('deliveries.deliveryAddressPlaceholder', 'Enter delivery address')}
                />
              </div>

              <div>
                <label htmlFor="delivery-vehicle-info" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('deliveries.vehicleInfo', 'Vehicle Info')}
                </label>
                <Input
                  id="delivery-vehicle-info"
                  {...form.register('vehicle_info')}
                  placeholder={t('deliveries.vehicleInfoPlaceholder', 'Enter vehicle details')}
                />
              </div>

              <div>
                <label htmlFor="delivery-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('deliveries.notes', 'Notes')}
                </label>
                <Textarea
                  id="delivery-notes"
                  {...form.register('notes')}
                  placeholder={t('deliveries.notesPlaceholder', 'Add delivery notes')}
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
                <Button type="submit" variant="green" disabled={createDelivery.isPending}>
                  {createDelivery.isPending ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/deliveries')({
  component: withRouteProtection(DeliveriesPage, 'read', 'Stock'),
});
