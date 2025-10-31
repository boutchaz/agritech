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
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-7 hover:shadow-md hover:border-green-200 dark:hover:border-green-700 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-900/20 rounded-xl">
            <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Parcelles
          </h3>
        </div>
        <button
          onClick={handleViewParcels}
          className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1 transition-colors"
        >
          Voir tout
          <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="relative bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/30 dark:to-green-900/10 rounded-xl p-4 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-200/20 dark:bg-green-400/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">Total</span>
              <Layers className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-0.5">
              {parcels.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              parcelles
            </div>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-900/10 rounded-xl p-4 overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/20 dark:bg-blue-400/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Surface</span>
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-0.5">
              {totalArea.toFixed(1)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              hectares
            </div>
          </div>
        </div>
      </div>

      {/* Top Crops */}
      {topCrops.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
            Principales cultures
          </h4>
          <div className="space-y-2">
            {topCrops.map(([crop, count]) => (
              <div key={crop} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-colors">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {crop}
                </span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400 ml-2 flex items-center gap-1">
                  {count}
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">parcelles</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {parcels.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl flex items-center justify-center">
            <MapPin className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            Aucune parcelle créée
          </p>
          <button
            onClick={handleViewParcels}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-lg transition-colors"
          >
            <MapPin className="h-4 w-4" />
            Créer une parcelle
          </button>
        </div>
      )}
    </div>
  );
};

export default ParcelsOverviewWidget;
