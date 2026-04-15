import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCrops } from '@/hooks/useCrops';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
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

  const { data: crops = [], isLoading } = useCrops();

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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('crops.formComingSoon', 'Full crop form with variety selection, area, and dates coming soon.')}
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

export const Route = createFileRoute('/_authenticated/(production)/crops')({
  component: withRouteProtection(CropsPage, 'read', 'Crop'),
});
