import React from 'react';
import { useAuth } from './MultiTenantAuthProvider';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/radix-select';

interface InlineFarmSelectorProps {
  message?: string;
  className?: string;
}

const InlineFarmSelector: React.FC<InlineFarmSelectorProps> = ({
  message,
  className = '',
}) => {
  const { t } = useTranslation();
  const { farms, currentFarm, setCurrentFarm } = useAuth();

  const farmsList = Array.isArray(farms) ? farms : [];

  if (farmsList.length === 0) {
    return (
      <div className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('farmSelector.noFarms', 'No farms available')}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              {t('farmSelector.createFarmFirst', 'Create a farm first to access this feature.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentFarm) {
    return null;
  }

  return (
    <div className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              {message || t('farmSelector.selectFarm', 'Select a farm to continue')}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              {t('farmSelector.selectFarmDescription', 'Choose a farm from the dropdown to view and manage its data.')}
            </p>
          </div>
        </div>
        <div className="sm:w-64">
          <Select
            value={currentFarm?.id || ''}
            onValueChange={(value) => {
              const farm = farmsList.find(f => f.id === value);
              if (farm) {
                setCurrentFarm(farm);
              }
            }}
          >
            <SelectTrigger className="w-full bg-white dark:bg-gray-800">
              <SelectValue placeholder={t('farmSelector.chooseFarm', 'Choose a farm...')} />
            </SelectTrigger>
            <SelectContent>
              {farmsList.map((farm) => (
                <SelectItem key={farm.id} value={farm.id}>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span>{farm.name}</span>
                    {farm.total_area && (
                      <span className="text-xs text-gray-500">
                        ({farm.total_area} ha)
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default InlineFarmSelector;
