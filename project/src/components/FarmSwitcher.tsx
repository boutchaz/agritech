import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { authSupabase } from '../lib/auth-supabase';
import { useAuth } from '../hooks/useAuth';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Farm {
  id: string;
  name: string;
  location: string;
  size: number;
}

interface FarmSwitcherProps {
  currentFarmId: string;
  onFarmChange: (farmId: string) => void;
}

const FarmSwitcher: React.FC<FarmSwitcherProps> = ({ currentFarmId, onFarmChange }) => {
  const navigate = useNavigate();
  const { currentOrganization, currentFarm } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchFarms();
  }, [currentOrganization?.id]);

  const fetchFarms = async () => {
    if (!currentOrganization?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await authSupabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`${apiUrl}/api/v1/farms?organization_id=${currentOrganization.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-organization-id': currentOrganization.id,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch farms');

      const data = await response.json();
      const farmsData = data.farms || data || [];
      
      // Map API response to Farm interface (handle both farm_id/farm_name and id/name formats)
      const mappedFarms = farmsData.map((farm: { farm_id?: string; id?: string; farm_name?: string; name?: string; location?: string; address?: string; farm_size?: number; size?: number }) => ({
        id: farm.farm_id || farm.id || '',
        name: farm.farm_name || farm.name || '',
        location: farm.location || farm.address || '',
        size: farm.farm_size || farm.size || 0,
      }));
      
      setFarms(mappedFarms);
    } catch (error) {
      console.error('Error fetching farms:', error);
      setError('Failed to fetch farms');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFarm = () => {
    setIsOpen(false);
    navigate({ to: '/farm-hierarchy' });
  };

  // Use currentFarm from context if available, otherwise find it in local farms list
  const displayFarm = currentFarm 
    ? { id: currentFarm.id, name: currentFarm.name, location: currentFarm.location || '', size: currentFarm.size || 0 }
    : farms.find(farm => farm.id === currentFarmId);

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
          {displayFarm?.name || 'Sélectionner une ferme'}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700">
          <div className="py-1">
            {farms.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                Aucune ferme disponible
              </div>
            ) : (
              farms.map(farm => (
                <button
                  key={farm.id}
                  onClick={() => {
                    onFarmChange(farm.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                    farm.id === currentFarmId
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{farm.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {farm.location} • {farm.size} ha
                    </div>
                  </div>
                  {farm.id === currentFarmId && (
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
                <span>Ajouter une ferme</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmSwitcher;
