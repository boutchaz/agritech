import React from 'react';
import { Building2, MapPin, User, Trash2, Eye, Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FarmListItemProps {
  farm: {
    id: string;
    name: string;
    type: 'main' | 'sub';
    size: number;
    manager_name: string;
    sub_farms_count: number;
    parcels_count: number;
    hierarchy_level: number;
    is_active: boolean;
  };
  isSelected?: boolean;
  onSelect?: () => void;
  onToggleSelection?: () => void;
  onManage?: () => void;
  onViewParcels?: () => void;
  onDelete?: () => void;
}

const FarmListItem: React.FC<FarmListItemProps> = ({
  farm,
  isSelected = false,
  onSelect,
  onToggleSelection,
  onManage,
  onViewParcels,
  onDelete,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 border rounded-lg p-4 transition-all cursor-pointer
        ${isSelected
          ? 'border-green-500 dark:border-green-600 shadow-md ring-2 ring-green-500/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-sm'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex items-center gap-4">
        {/* Checkbox for multi-selection */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelection}
            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>

        {/* Farm Icon */}
        <div className={`flex-shrink-0 p-2.5 rounded-lg ${
          farm.type === 'main'
            ? 'bg-green-50 dark:bg-green-900/20'
            : 'bg-blue-50 dark:bg-blue-900/20'
        }`}>
          <Building2 className={`w-5 h-5 ${
            farm.type === 'main'
              ? 'text-green-600 dark:text-green-400'
              : 'text-blue-600 dark:text-blue-400'
          }`} />
        </div>

        {/* Farm Info - Flex Grow */}
        <div className="flex-grow grid grid-cols-5 gap-4">
          {/* Farm Name */}
          <div className="col-span-2">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              {farm.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                farm.type === 'main'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {farm.type === 'main' ? t('farmHierarchy.farm.main') : t('farmHierarchy.farm.sub')}
              </span>
            </div>
          </div>

          {/* Manager */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {farm.manager_name}
            </span>
          </div>

          {/* Size */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {farm.size.toFixed(1)} ha
            </span>
          </div>

          {/* Parcels */}
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {farm.parcels_count} {t('farmHierarchy.parcels')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onViewParcels}
            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title={t('farmHierarchy.farm.manageParcels')}
          >
            <Map className="w-4 h-4" />
          </button>
          <button
            onClick={onSelect}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={t('farmHierarchy.farm.viewDetails')}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title={t('farmHierarchy.farm.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FarmListItem;
