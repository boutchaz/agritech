import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  X,
  MapPin,
  Users,
  Leaf,
  Calendar,
  Building2,
  Edit,
  Layers
} from 'lucide-react';

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

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!farm) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur rounded-lg">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{farm.name}</h2>
                <p className="text-green-100">{organization?.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4" />
                <span className="text-sm opacity-90">Surface</span>
              </div>
              <p className="text-2xl font-bold">{totalArea.toFixed(2)} ha</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Leaf className="w-4 h-4" />
                <span className="text-sm opacity-90">Parcelles</span>
              </div>
              <p className="text-2xl font-bold">{parcels.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4" />
                <span className="text-sm opacity-90">Statut</span>
              </div>
              <p className="text-lg font-semibold">
                {farm.status === 'active' ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {/* Farm Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600" />
              Informations de la ferme
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {farm.location && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">Localisation</span>
                  </div>
                  <p className="text-gray-900 dark:text-white">{farm.location}</p>
                </div>
              )}

              {farm.manager_name && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">Responsable</span>
                  </div>
                  <p className="text-gray-900 dark:text-white">{farm.manager_name}</p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Date de création</span>
                </div>
                <p className="text-gray-900 dark:text-white">
                  {new Date(farm.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                  <Layers className="w-4 h-4" />
                  <span className="text-sm font-medium">Statut</span>
                </div>
                <span className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${
                  farm.status === 'active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {farm.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {farm.description && (
              <div className="mt-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Description</span>
                <p className="text-gray-900 dark:text-white mt-1">{farm.description}</p>
              </div>
            )}
          </div>

          {/* Parcels Summary */}
          {parcels.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-green-600" />
                  Parcelles ({parcels.length})
                </h3>
                {onManageParcels && (
                  <button
                    onClick={onManageParcels}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Gérer les parcelles →
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parcels.slice(0, 6).map((parcel) => (
                  <div
                    key={parcel.id}
                    className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                  >
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
                  </div>
                ))}
              </div>
              {parcels.length > 6 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 text-center">
                  + {parcels.length - 6} autres parcelles
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Modifier la ferme
              </button>
            )}
            {onManageParcels && (
              <button
                onClick={onManageParcels}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <Leaf className="w-4 h-4" />
                Gérer les parcelles
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmDetailsModal;
