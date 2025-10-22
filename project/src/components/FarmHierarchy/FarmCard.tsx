import React from 'react';
import {
  Building2,
  MapPin,
  Users,
  MoreVertical,
  ChevronRight,
  Leaf
} from 'lucide-react';

interface FarmCardProps {
  farm: {
    id: string;
    name: string;
    type: 'main' | 'sub';
    location?: string;
    size: number;
    manager_name?: string;
    sub_farms_count?: number;
    parcels_count?: number;
    hierarchy_level: number;
    is_active: boolean;
  };
  onSelect?: () => void;
  onManage?: () => void;
  onViewParcels?: () => void;
}

const FarmCard: React.FC<FarmCardProps> = ({ farm, onSelect, onManage, onViewParcels }) => {
  return (
    <div
      className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-all duration-200 hover:shadow-lg overflow-hidden"
    >
      {/* Colored Top Border */}
      <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-600" />

      {/* Card Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            {/* Icon */}
            <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>

            {/* Farm Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {farm.name}
                </h3>
              </div>

              {farm.manager_name && (
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {farm.manager_name}
                </p>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <button
            onClick={onManage}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Size */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Surface</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {farm.size}
              <span className="text-sm font-normal text-gray-500 ml-1">ha</span>
            </p>
          </div>

          {/* Parcels */}
          {farm.parcels_count !== undefined && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                <Leaf className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Parcelles</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {farm.parcels_count}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onViewParcels}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Leaf className="w-4 h-4" />
            <span>Parcelles</span>
          </button>

          <button
            onClick={onSelect}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <span>Voir détails</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Indicator */}
      {!farm.is_active && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
            Inactive
          </span>
        </div>
      )}
    </div>
  );
};

export default FarmCard;
