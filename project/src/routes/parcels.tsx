import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../components/MultiTenantAuthProvider'
import Sidebar from '../components/Sidebar'
import Map from '../components/Map'
import OrganizationSwitcher from '../components/OrganizationSwitcher'
import SatelliteIndices from '../components/SatelliteIndices'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Module, SensorData } from '../types'
import { Edit2, Trash2, MapPin, Ruler, Droplets } from 'lucide-react'

interface Parcel {
  id: string;
  farm_id: string;
  name: string;
  description: string | null;
  area: number | null;
  area_unit: string;
  boundary?: number[][];
  calculated_area?: number | null;
  perimeter?: number | null;
  soil_type?: string | null;
  planting_density?: number | null;
  irrigation_type?: string | null;
  created_at: string;
  updated_at: string;
}

const mockModules: Module[] = [
  {
    id: 'fruit-trees',
    name: 'Arbres Fruitiers',
    icon: 'Tree',
    active: true,
    category: 'agriculture',
    description: 'Gérez vos vergers',
    metrics: [
      { name: 'Rendement', value: 12.5, unit: 't/ha', trend: 'up' },
      { name: 'Irrigation', value: 850, unit: 'm³/ha', trend: 'stable' }
    ]
  },
  // ... other modules would be here
];

const AppContent: React.FC = () => {
  const { currentOrganization, currentFarm } = useAuth();
  const [activeModule, setActiveModule] = useState('parcels');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules] = useState(mockModules);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [showAddParcelMap, setShowAddParcelMap] = useState(false);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  useEffect(() => {
    if (currentOrganization) {
      fetchParcels();
    }
  }, [currentOrganization, currentFarm]);

  const deleteParcel = async (parcelId: string) => {
    try {
      const { error } = await supabase
        .from('parcels')
        .delete()
        .eq('id', parcelId);

      if (error) throw error;

      // Update local state
      setParcels(prev => prev.filter(p => p.id !== parcelId));
      if (selectedParcelId === parcelId) {
        setSelectedParcelId(null);
      }
    } catch (error) {
      console.error('Error deleting parcel:', error);
      alert('Erreur lors de la suppression de la parcelle');
    }
  };

  const updateParcel = async (parcelId: string, updates: Partial<Parcel>) => {
    try {
      const { data, error } = await supabase
        .from('parcels')
        .update(updates)
        .eq('id', parcelId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setParcels(prev => prev.map(p => p.id === parcelId ? data : p));
      setEditingParcel(null);
      setShowEditDialog(false);
    } catch (error) {
      console.error('Error updating parcel:', error);
      alert('Erreur lors de la mise à jour de la parcelle');
    }
  };

  const handleParcelSelect = (parcelId: string) => {
    setSelectedParcelId(parcelId);
    // Map will automatically center on the selected parcel via the selectedParcelId prop
  };

  const fetchParcels = async () => {
    try {
      setLoading(true);

      // First fetch all farms for the organization
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id, name')
        .eq('organization_id', currentOrganization?.id);

      if (farmsError) {
        console.error('Error fetching farms:', farmsError);
        return;
      }

      // Then fetch parcels for all farms or specific farm
      let query = supabase
        .from('parcels')
        .select('*');

      if (currentFarm) {
        query = query.eq('farm_id', currentFarm.id);
      } else if (farmsData && farmsData.length > 0) {
        const farmIds = farmsData.map(f => f.id);
        query = query.in('farm_id', farmIds);
      }

      const { data: parcelsData, error: parcelsError } = await query;

      if (parcelsError) {
        console.error('Error fetching parcels:', parcelsError);
      } else {
        console.log('Fetched parcels:', parcelsData); // Debug log
        setParcels(parcelsData || []);

        // Generate sensor data based on parcels
        const sensors: SensorData[] = (parcelsData || []).map((parcel, index) => ({
          id: parcel.id,
          type: index % 3 === 0 ? 'moisture' : index % 3 === 1 ? 'temperature' : 'ph',
          value: index % 3 === 0 ? 65 + Math.random() * 20 : index % 3 === 1 ? 20 + Math.random() * 10 : 6 + Math.random() * 2,
          unit: index % 3 === 0 ? '%' : index % 3 === 1 ? '°C' : '',
          timestamp: new Date(),
          location: parcel.name
        }));
        setSensorData(sensors);
      }
    } catch (error) {
      console.error('Error in fetchParcels:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement de l'organisation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar
        modules={modules.filter(m => m.active)}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleTheme}
      />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {currentOrganization.name}
            </h1>
            {currentFarm && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                • {currentFarm.name}
              </span>
            )}
          </div>
          <OrganizationSwitcher />
        </div>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Gestion des Parcelles
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {loading ? (
                <span>Chargement...</span>
              ) : (
                <span>{parcels.length} parcelle{parcels.length !== 1 ? 's' : ''} trouvée{parcels.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : parcels.length === 0 && !showAddParcelMap ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {currentFarm
                  ? `Aucune parcelle trouvée pour ${currentFarm.name}.`
                  : 'Veuillez sélectionner une ferme pour ajouter des parcelles.'}
              </p>
              {currentFarm && (
                <button
                  onClick={() => setShowAddParcelMap(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Ajouter une parcelle
                </button>
              )}
            </div>
          ) : (
            <>
              {showAddParcelMap && parcels.length === 0 && (
                <div className="mb-4 flex justify-between items-center">
                  <button
                    onClick={() => setShowAddParcelMap(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    ← Retour
                  </button>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Dessinez votre parcelle sur la carte
                  </p>
                </div>
              )}

              <Map
                center={[31.7917, -7.0926]}
                zones={[]}
                sensors={sensorData}
                farmId={currentFarm?.id}
                enableDrawing={true}
                selectedParcelId={selectedParcelId}
                onParcelSelect={handleParcelSelect}
                parcels={parcels}
                onParcelAdded={() => {
                  fetchParcels();
                  setShowAddParcelMap(false);
                }}
              />

              {/* Satellite Indices Section */}
              {selectedParcelId && (
                <div className="mt-6">
                  <SatelliteIndices
                    parcel={parcels.find(p => p.id === selectedParcelId)!}
                  />
                </div>
              )}

              {parcels.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {parcels.map((parcel) => (
                    <div
                      key={parcel.id}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-4 border-2 transition-all cursor-pointer hover:shadow-lg ${
                        selectedParcelId === parcel.id
                          ? 'border-green-500 shadow-lg'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => handleParcelSelect(parcel.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span>{parcel.name}</span>
                        </h3>
                        <div className="flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingParcel(parcel);
                              setShowEditDialog(true);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Êtes-vous sûr de vouloir supprimer la parcelle "${parcel.name}" ?`)) {
                                deleteParcel(parcel.id);
                              }
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {parcel.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{parcel.description}</p>
                      )}

                      <div className="space-y-1">
                        {(parcel.calculated_area || parcel.area) ? (
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Ruler className="h-3 w-3 mr-1" />
                            <span>{parcel.calculated_area || parcel.area} {parcel.area_unit}</span>
                          </div>
                        ) : null}
                        {parcel.irrigation_type && (
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Droplets className="h-3 w-3 mr-1" />
                            <span>{parcel.irrigation_type}</span>
                          </div>
                        )}
                      </div>

                      {selectedParcelId === parcel.id && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          {parcel.boundary && parcel.boundary.length > 0 ? (
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                              ✓ Sélectionnée et visible sur la carte
                            </p>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                ⚠ Pas de limites géographiques définies
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowAddParcelMap(true);
                                  // You could add specific logic here to edit boundaries for existing parcel
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 underline"
                              >
                                Définir les limites sur la carte
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Edit Parcel Dialog */}
      {showEditDialog && editingParcel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Modifier la parcelle
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  value={editingParcel.name}
                  onChange={(e) => setEditingParcel({ ...editingParcel, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editingParcel.description || ''}
                  onChange={(e) => setEditingParcel({ ...editingParcel, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Surface
                  </label>
                  <input
                    type="number"
                    value={editingParcel.area || ''}
                    onChange={(e) => setEditingParcel({ ...editingParcel, area: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unité
                  </label>
                  <select
                    value={editingParcel.area_unit}
                    onChange={(e) => setEditingParcel({ ...editingParcel, area_unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="hectares">Hectares</option>
                    <option value="m2">m²</option>
                    <option value="acres">Acres</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setEditingParcel(null);
                  setShowEditDialog(false);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (editingParcel) {
                    updateParcel(editingParcel.id, editingParcel);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/parcels')({
  component: AppContent,
})
