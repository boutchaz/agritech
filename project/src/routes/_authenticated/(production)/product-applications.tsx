import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useProductApplications } from '@/hooks/useProductApplications';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Droplets, Plus, Building2 } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

function ProductApplicationsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const { data: applications = [], isLoading, isError } = useProductApplications();

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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('productApplications.formComingSoon', 'Full application form with product selection from inventory coming soon.')}
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

export const Route = createFileRoute('/_authenticated/(production)/product-applications')({
  component: withRouteProtection(ProductApplicationsPage, 'read', 'Stock'),
});
