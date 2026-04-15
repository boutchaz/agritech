import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useDeliveries, useCancelDelivery } from '@/hooks/useDeliveries';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Truck, Plus, Building2 } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';

function DeliveriesPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const { data: deliveries = [], isLoading } = useDeliveries();
  const cancelDelivery = useCancelDelivery();

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
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          { icon: Truck, label: t('deliveries.pageTitle', 'Deliveries'), isActive: true },
        ]}
        title={t('deliveries.pageTitle', 'Deliveries')}
        subtitle={t('deliveries.description', 'Track and manage your product deliveries.')}
        actions={
          <Button variant="green" onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('deliveries.addDelivery', 'New Delivery')}
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('deliveries.formComingSoon', 'Full delivery form coming soon.')}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/deliveries')({
  component: withRouteProtection(DeliveriesPage, 'read', 'Delivery'),
});
