import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import {
  MapPin,
  Users,
  Leaf,
  Calendar,
  Building2,
  Edit,
  Layers
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface FarmDetailsModalProps {
  farmId: string;
  onClose: () => void;
  onEdit?: () => void;
  onManageParcels?: () => void;
}

const FarmDetailsModal: React.FC<FarmDetailsModalProps> = ({
  farmId,
  onClose,
  onEdit,
  onManageParcels
}) => {
  const { t } = useTranslation();

  // Fetch farm details
  const { data: farm, isLoading } = useQuery({
    queryKey: ['farm-details', farmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('id', farmId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Fetch parcels
  const { data: parcels = [] } = useQuery({
    queryKey: ['farm-parcels', farmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .eq('farm_id', farmId);

      if (error) throw error;
      return data;
    }
  });

  // Fetch organization name
  const { data: organization } = useQuery({
    queryKey: ['organization', farm?.organization_id],
    queryFn: async () => {
      if (!farm?.organization_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', farm.organization_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!farm?.organization_id
  });

  const totalArea = parcels.reduce((sum, p) => sum + (p.area || 0), 0);

  if (isLoading || !farm) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">{t('farmHierarchy.details.loading')}</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white flex-shrink-0">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur rounded-lg">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">{farm.name}</DialogTitle>
                <DialogDescription className="text-green-100">
                  {organization?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <Card className="bg-white/10 backdrop-blur border-0">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-white" />
                  <span className="text-sm text-white opacity-90">{t('farmHierarchy.farm.area')}</span>
                </div>
                <p className="text-2xl font-bold text-white">{totalArea.toFixed(2)} ha</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur border-0">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="w-4 h-4 text-white" />
                  <span className="text-sm text-white opacity-90">{t('farmHierarchy.farm.parcels')}</span>
                </div>
                <p className="text-2xl font-bold text-white">{parcels.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur border-0">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-4 h-4 text-white" />
                  <span className="text-sm text-white opacity-90">{t('farmHierarchy.farm.status')}</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {farm.status === 'active' ? t('farmHierarchy.farm.active') : t('farmHierarchy.farm.inactive')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* Farm Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600" />
              {t('farmHierarchy.details.information')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {farm.location && (
                <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('farmHierarchy.details.location')}</span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{farm.location}</p>
                  </CardContent>
                </Card>
              )}

              {farm.manager_name && (
                <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('farmHierarchy.details.manager')}</span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{farm.manager_name}</p>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('farmHierarchy.details.createdAt')}</span>
                  </div>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(farm.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                    <Layers className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('farmHierarchy.farm.status')}</span>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${
                    farm.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {farm.status === 'active' ? t('farmHierarchy.farm.active') : t('farmHierarchy.farm.inactive')}
                  </span>
                </CardContent>
              </Card>
            </div>

            {farm.description && (
              <Card className="mt-4 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('farmHierarchy.details.description')}</span>
                  <p className="text-gray-900 dark:text-white mt-1">{farm.description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Parcels Summary */}
          {parcels.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-green-600" />
                  {t('farmHierarchy.details.parcelsSummary')} ({parcels.length})
                </h3>
                {onManageParcels && (
                  <Button
                    variant="ghost"
                    onClick={onManageParcels}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    {t('farmHierarchy.farm.manageParcels')} →
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parcels.slice(0, 6).map((parcel) => (
                  <Card
                    key={parcel.id}
                    className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{parcel.name}</p>
                          {parcel.crop_type && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{parcel.crop_type}</p>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {parcel.area} ha
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {parcels.length > 6 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 text-center">
                  + {parcels.length - 6} {t('farmHierarchy.details.moreItems')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            {onEdit && (
              <Button
                onClick={onEdit}
                variant="outline"
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('farmHierarchy.details.editFarm')}
              </Button>
            )}
            {onManageParcels && (
              <Button
                onClick={onManageParcels}
                className="flex-1"
              >
                <Leaf className="w-4 h-4 mr-2" />
                {t('farmHierarchy.farm.manageParcels')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FarmDetailsModal;
