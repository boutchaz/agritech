import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { MapPin, TrendingUp, ChevronRight, Layers } from 'lucide-react';
import { useAuth } from '../MultiTenantAuthProvider';
import { useFarms, useParcelsByFarms } from '../../hooks/useParcelsQuery';

const ParcelsOverviewWidget: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization, currentFarm } = useAuth();

  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const farmIds = currentFarm?.id ? [currentFarm.id] : farms.map(f => f.id);
  const { data: parcels = [], isLoading } = useParcelsByFarms(farmIds);

  // Calculate statistics
  const totalArea = parcels.reduce((sum, p) => sum + (p.calculated_area || p.area || 0), 0);
  const parcelsByCrop = parcels.reduce((acc, p) => {
    const cropType = p.crop_type || 'Non spécifié';
    acc[cropType] = (acc[cropType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCrops = Object.entries(parcelsByCrop)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const handleViewParcels = () => {
    navigate({ to: '/parcels' });
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin className="h-5 w-5 text-green-600" />
          Parcelles
        </h3>
        <button
          onClick={handleViewParcels}
          className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
        >
          Voir tout
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
            <Layers className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {parcels.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            parcelles
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Surface</span>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalArea.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            hectares
          </div>
        </div>
      </div>

      {/* Top Crops */}
      {topCrops.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Principales cultures
          </h4>
          <div className="space-y-2">
            {topCrops.map(([crop, count]) => (
              <div key={crop} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {crop}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {parcels.length === 0 && (
        <div className="text-center py-6">
          <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aucune parcelle créée
          </p>
          <button
            onClick={handleViewParcels}
            className="mt-2 text-sm text-green-600 hover:text-green-700 dark:text-green-400"
          >
            Créer une parcelle
          </button>
        </div>
      )}
    </div>
  );
};

export default ParcelsOverviewWidget;
