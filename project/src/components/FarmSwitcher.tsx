import React, { useState } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import type { AuthFarm } from '../contexts/AuthContext';

interface FarmSwitcherProps {
  currentFarmId?: string;
  onFarmChange?: (farmId: string) => void;
}

const FarmSwitcher: React.FC<FarmSwitcherProps> = ({ currentFarmId, onFarmChange }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { farms, currentFarm, setCurrentFarm, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleAddFarm = () => {
    setIsOpen(false);
    navigate({ to: '/farm-hierarchy' });
  };

  const handleFarmSelect = (farm: AuthFarm) => {
    // Update context
    setCurrentFarm(farm);
    // Call prop callback if provided (for backward compatibility)
    if (onFarmChange) {
      onFarmChange(farm.id);
    }
    setIsOpen(false);
  };

  // Determine which farm ID is selected
  const selectedFarmId = currentFarmId || currentFarm?.id;

  if (loading) {
    return (
      <div className="h-10 w-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <span className="text-sm font-medium truncate max-w-[150px]">
          {currentFarm?.name || t('farmSwitcher.selectFarm')}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700">
          <div className="py-1">
            {farms.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                {t('farmSwitcher.noFarmsAvailable')}
              </div>
            ) : (
              farms.map(farm => (
                <button
                  key={farm.id}
                  onClick={() => handleFarmSelect(farm)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                    farm.id === selectedFarmId
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{farm.name}</div>
                    {(farm.location || farm.size) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {farm.location && <span>{farm.location}</span>}
                        {farm.location && farm.size && <span> • </span>}
                        {farm.size && <span>{farm.size} ha</span>}
                      </div>
                    )}
                  </div>
                  {farm.id === selectedFarmId && (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
            <div className="border-t border-gray-200 dark:border-gray-700 mt-1">
              <button
                onClick={handleAddFarm}
                className="w-full text-left px-4 py-2.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center space-x-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{t('farmSwitcher.addFarm')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmSwitcher;
