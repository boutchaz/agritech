import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFarm, setNewFarm] = useState({
    name: '',
    location: '',
    size: 0
  });

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setFarms(data || []);
    } catch (error) {
      console.error('Error fetching farms:', error);
      setError('Failed to fetch farms');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFarm = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('farms')
        .insert([{
          ...newFarm,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setFarms([...farms, data]);
      setShowAddModal(false);
      setNewFarm({
        name: '',
        location: '',
        size: 0
      });
    } catch (error) {
      console.error('Error adding farm:', error);
      setError('Failed to add farm');
    }
  };

  const currentFarm = farms.find(farm => farm.id === currentFarmId);

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
          {currentFarm?.name || 'Sélectionner une ferme'}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {farms.map(farm => (
              <button
                key={farm.id}
                onClick={() => {
                  onFarmChange(farm.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm ${
                  farm.id === currentFarmId
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">{farm.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {farm.location} • {farm.size} ha
                </div>
              </button>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 mt-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowAddModal(true);
                }}
                className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter une ferme</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-panel p-6 max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Nouvelle Ferme
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nom de la ferme
                </label>
                <input
                  type="text"
                  value={newFarm.name}
                  onChange={(e) => setNewFarm({ ...newFarm, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Localisation
                </label>
                <input
                  type="text"
                  value={newFarm.location}
                  onChange={(e) => setNewFarm({ ...newFarm, location: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Surface (ha)
                </label>
                <input
                  type="number"
                  step="1"
                  value={newFarm.size}
                  onChange={(e) => setNewFarm({ ...newFarm, size: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={handleAddFarm}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmSwitcher;
