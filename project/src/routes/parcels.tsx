import React, { useState, useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { useAuth } from '../components/MultiTenantAuthProvider'
import Sidebar from '../components/Sidebar'
import Map from '../components/Map'
import PageHeader from '../components/PageHeader'
import ParcelCard from '../components/ParcelCard'
import { useFarms, useParcelsByFarm, useParcelsByFarms, useParcelById, useUpdateParcel, useDeleteParcel, type Parcel } from '../hooks/useParcelsQuery'
import type { Module, SensorData } from '../types'
import { Edit2, Trash2, MapPin, Ruler, Droplets, Building2, TreePine, Trees as Tree } from 'lucide-react'


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
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { currentOrganization, currentFarm } = useAuth();
  const [activeModule, setActiveModule] = useState('parcels');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules] = useState(mockModules);
  const [_sensorData, _setSensorData] = useState<SensorData[]>([]);
  const [showAddParcelMap, setShowAddParcelMap] = useState(false);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(search.parcelId || null);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(search.farmId || null);
  const [activeParcelTab, setActiveParcelTab] = useState<string>(search.tab || 'overview');

  // Track if we're currently syncing to prevent loops
  const isSyncingRef = useRef(false);

  // React Query hooks
  const { data: farms = [], isLoading: farmsLoading } = useFarms(currentOrganization?.id);
  const updateParcelMutation = useUpdateParcel();
  const deleteParcelMutation = useDeleteParcel();

  // Determine which parcels query to use
  const targetFarmId = selectedFarmId || currentFarm?.id;
  const { data: parcelsByFarm = [], isLoading: parcelsByFarmLoading } = useParcelsByFarm(targetFarmId);
  const { data: parcelsByFarms = [], isLoading: parcelsByFarmsLoading } = useParcelsByFarms(
    !targetFarmId && farms.length > 0 ? farms.map(f => f.id) : []
  );

  // Fetch specific parcel by ID if provided in URL
  const { data: directParcel, isLoading: directParcelLoading } = useParcelById(selectedParcelId);

  // Get the appropriate parcels data
  const parcels = targetFarmId ? parcelsByFarm : parcelsByFarms;
  const loading = targetFarmId ? parcelsByFarmLoading : parcelsByFarmsLoading || farmsLoading;

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Sync URL search params to state (URL is source of truth)
  useEffect(() => {
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;

    const urlParcelId = search.parcelId || null;
    const urlTab = search.tab || 'overview';
    const urlFarmId = search.farmId || null;

    if (urlParcelId !== selectedParcelId) {
      setSelectedParcelId(urlParcelId);
    }

    if (urlTab !== activeParcelTab) {
      setActiveParcelTab(urlTab);
    }

    if (urlFarmId !== selectedFarmId) {
      setSelectedFarmId(urlFarmId);
    }

    isSyncingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.parcelId, search.tab, search.farmId]);

  // Update URL when state changes (state changes trigger URL update)
  useEffect(() => {
    if (isSyncingRef.current) return;

    const newSearch: { parcelId?: string; tab?: string; farmId?: string } = {};
    const currentParcelId = search.parcelId || null;
    const currentTab = search.tab || 'overview';
    const currentFarmId = search.farmId || null;

    if (selectedParcelId) {
      newSearch.parcelId = selectedParcelId;
    }

    if (activeParcelTab && activeParcelTab !== 'overview') {
      newSearch.tab = activeParcelTab;
    }

    if (selectedFarmId) {
      newSearch.farmId = selectedFarmId;
    }

    // Only navigate if something actually changed
    const parcelChanged = currentParcelId !== selectedParcelId;
    const tabChanged = currentTab !== activeParcelTab;
    const farmChanged = currentFarmId !== selectedFarmId;

    if (parcelChanged || tabChanged || farmChanged) {
      isSyncingRef.current = true;
      navigate({
        to: '/parcels',
        search: newSearch,
        replace: true,
      }).then(() => {
        isSyncingRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParcelId, activeParcelTab, selectedFarmId]);

  // Farms and parcels are loaded automatically via React Query hooks
  // No manual fetching needed

  const handleDeleteParcel = async (parcelId: string) => {
    try {
      await deleteParcelMutation.mutateAsync(parcelId);
      if (selectedParcelId === parcelId) {
        setSelectedParcelId(null);
      }
    } catch (error) {
      console.error('Error deleting parcel:', error);
      alert('Erreur lors de la suppression de la parcelle');
    }
  };

  const handleUpdateParcel = async (parcelId: string, updates: Partial<Parcel>) => {
    try {
      await updateParcelMutation.mutateAsync({ id: parcelId, updates });
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
      <main className="flex-1 bg-gray-50 dark:bg-gray-900 w-full lg:w-auto">
        <PageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            { icon: TreePine, label: 'Fermes' },
            { icon: MapPin, label: 'Parcelles', isActive: true }
          ]}
          actions={
            farms && farms.length > 1 ? (
              <select
                value={selectedFarmId || currentFarm?.id || ''}
                onChange={(e) => setSelectedFarmId(e.target.value || null)}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm w-full sm:w-auto"
              >
                <option value="">Toutes les fermes</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            ) : undefined
          }
        />
        <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div className="w-full sm:w-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Gestion des Parcelles
              </h2>
              {/* Show current context */}
              <div className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {selectedFarmId || currentFarm ? (
                  <>
                    <span className="hidden sm:inline">Parcelles de la ferme: </span>
                    <span className="sm:hidden">Ferme: </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(() => {
                        const targetFarmId = selectedFarmId || currentFarm?.id;
                        const farm = farms?.find(f => f.id === targetFarmId);
                        return farm?.name || currentFarm?.name || 'Chargement...';
                      })()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Parcelles de toutes les fermes dans </span>
                    <span className="sm:hidden">Toutes - </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentOrganization?.name || 'votre organisation'}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 w-full sm:w-auto text-left sm:text-right">
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
            <div className="space-y-6">
              {/* Show farms overview when no specific farm is selected */}
              {!selectedFarmId && !currentFarm && farms.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Fermes dans {currentOrganization?.name || 'votre organisation'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {farms.map((farm) => (
                      <div
                        key={farm.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-green-500 transition-colors cursor-pointer"
                        onClick={() => setSelectedFarmId(farm.id)}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <TreePine className="h-5 w-5 text-green-600" />
                          <h4 className="font-medium text-gray-900 dark:text-white">{farm.name}</h4>
                        </div>
                        {farm.location && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            📍 {farm.location}
                          </p>
                        )}
                        {farm.size && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            📏 {farm.size} hectares
                          </p>
                        )}
                        {farm.manager_name && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            👤 {farm.manager_name}
                          </p>
                        )}
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          Cliquer pour voir les parcelles →
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* No parcels message */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {currentFarm || selectedFarmId
                    ? `Aucune parcelle trouvée pour ${farms.find(f => f.id === (selectedFarmId || currentFarm?.id))?.name || currentFarm?.name}.`
                    : 'Veuillez sélectionner une ferme pour ajouter des parcelles.'}
                </p>
                {(currentFarm || selectedFarmId) && (
                  <button
                    onClick={() => setShowAddParcelMap(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Ajouter une parcelle
                  </button>
                )}
              </div>
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
                sensors={[]}
                farmId={currentFarm?.id}
                enableDrawing={true}
                selectedParcelId={selectedParcelId}
                onParcelSelect={handleParcelSelect}
                parcels={directParcel && !parcels.find(p => p.id === directParcel.id) 
                  ? [...parcels, directParcel]  // Include directParcel if not already in list
                  : parcels}
                onParcelAdded={(newParcel) => {
                  // React Query will automatically refetch the data
                  setShowAddParcelMap(false);
                  // Redirect to the newly created parcel
                  if (newParcel?.id) {
                    setSelectedParcelId(newParcel.id);
                  }
                }}
              />

              {/* Selected Parcel Detail View */}
              {selectedParcelId && (
                <div className="mt-6">
                  {(() => {
                    // Try to find in current parcels list first, fallback to direct fetch
                    const selectedParcel = parcels.find(p => p.id === selectedParcelId) || directParcel;
                    
                    // Show loading state while fetching
                    if (directParcelLoading && !selectedParcel) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
                        </div>
                      );
                    }
                    
                    if (!selectedParcel) return null;

                    return (
                      <div className="w-full">
                        <ParcelCard
                          parcel={selectedParcel}
                          activeTab={activeParcelTab}
                          onTabChange={setActiveParcelTab}
                          sensorData={_sensorData}
                          isAssigned={true}
                        />
                      </div>
                    );
                  })()}
                </div>
              )}

              {parcels.length > 0 && !selectedParcelId && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {parcels.map((parcel) => {
                    const farm = farms.find(f => f.id === parcel.farm_id);
                    return (
                      <div
                        key={parcel.id}
                        className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-700 transition-all cursor-pointer hover:shadow-lg hover:border-green-300"
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
                                  handleDeleteParcel(parcel.id);
                                }
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Show farm name when viewing all farms */}
                        {(!selectedFarmId && !currentFarm) && farm && (
                          <div className="mb-2">
                            <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                              <TreePine className="h-3 w-3" />
                              <span>{farm.name}</span>
                            </div>
                          </div>
                        )}

                        {parcel.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{parcel.description}</p>
                        )}

                        <div className="space-y-1">
                          {(parcel.calculated_area || parcel.area) ? (
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Ruler className="h-3 w-3 mr-1" />
                              <span>{parcel.calculated_area || parcel.area} {parcel.area_unit || 'hectares'}</span>
                            </div>
                          ) : null}
                          {parcel.irrigation_type && (
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Droplets className="h-3 w-3 mr-1" />
                              <span>{parcel.irrigation_type}</span>
                            </div>
                          )}
                          {/* Fruit Trees Information */}
                          {parcel.tree_type && (
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Tree className="h-3 w-3 mr-1" />
                              <span>{parcel.tree_type}</span>
                              {parcel.variety && <span className="text-xs text-gray-400 ml-1">({parcel.variety})</span>}
                            </div>
                          )}
                          {parcel.tree_count && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-medium">{parcel.tree_count}</span> arbres
                              {parcel.planting_year && (
                                <span className="text-xs text-gray-400 ml-1">
                                  • Plantés en {parcel.planting_year}
                                </span>
                              )}
                            </div>
                          )}
                          {parcel.rootstock && (
                            <div className="text-xs text-gray-400">
                              Porte-greffe: {parcel.rootstock}
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                          {parcel.boundary && parcel.boundary.length > 0 ? (
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                              ✓ Limites définies
                            </p>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                ⚠ Pas de limites géographiques
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowAddParcelMap(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 underline"
                              >
                                Définir les limites
                              </button>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Cliquer pour voir les détails →
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Back to list button when viewing parcel details */}
              {selectedParcelId && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setSelectedParcelId(null)}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <span>← Retour à la liste des parcelles</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Edit Parcel Dialog */}
      {showEditDialog && editingParcel && (
        <div className="modal-overlay">
          <div className="modal-panel p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Modifier la parcelle
            </h3>

            <div className="space-y-4">
              <FormField label="Nom" htmlFor="parcel_name">
                <Input
                  id="parcel_name"
                  type="text"
                  value={editingParcel.name}
                  onChange={(e) => setEditingParcel({ ...editingParcel, name: e.target.value })}
                />
              </FormField>

              <FormField label="Description" htmlFor="parcel_description">
                <Textarea
                  id="parcel_description"
                  value={editingParcel.description || ''}
                  onChange={(e) => setEditingParcel({ ...editingParcel, description: e.target.value })}
                  rows={3}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Surface" htmlFor="parcel_area">
                  <Input
                    id="parcel_area"
                    type="number"
                    value={editingParcel.area || ''}
                    onChange={(e) => setEditingParcel({ ...editingParcel, area: parseFloat(e.target.value) })}
                    step={1}
                  />
                </FormField>

                <FormField label="Unité" htmlFor="parcel_area_unit">
                  <Select
                    id="parcel_area_unit"
                    value={editingParcel.area_unit || 'hectares'}
                    onChange={(e) => setEditingParcel({ ...editingParcel, area_unit: e.target.value })}
                  >
                    <option value="hectares">Hectares</option>
                    <option value="square_meters">m²</option>
                    <option value="acres">Acres</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Type de sol" htmlFor="parcel_soil_type">
                  <Input
                    id="parcel_soil_type"
                    type="text"
                    value={editingParcel.soil_type || ''}
                    onChange={(e) => setEditingParcel({ ...editingParcel, soil_type: e.target.value })}
                    placeholder="ex: Argileux, Sableux..."
                  />
                </FormField>

                <FormField label="Type d'irrigation" htmlFor="parcel_irrigation_type">
                  <Select
                    id="parcel_irrigation_type"
                    value={editingParcel.irrigation_type || ''}
                    onChange={(e) => setEditingParcel({ ...editingParcel, irrigation_type: e.target.value })}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="drip">Goutte-à-goutte</option>
                    <option value="sprinkler">Aspersion</option>
                    <option value="flood">Inondation</option>
                    <option value="none">Aucune</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Variété" htmlFor="parcel_variety">
                  <Input
                    id="parcel_variety"
                    type="text"
                    value={editingParcel.variety || ''}
                    onChange={(e) => setEditingParcel({ ...editingParcel, variety: e.target.value })}
                    placeholder="ex: Picholine, Lucques, Arbequina..."
                  />
                </FormField>

                <FormField label="Date de plantation" htmlFor="parcel_planting_date">
                  <Input
                    id="parcel_planting_date"
                    type="date"
                    value={editingParcel.planting_date || ''}
                    onChange={(e) => setEditingParcel({ ...editingParcel, planting_date: e.target.value })}
                  />
                </FormField>
              </div>

              <FormField label="Type de plantation" htmlFor="parcel_planting_type">
                <Select
                  id="parcel_planting_type"
                  value={editingParcel.planting_type || ''}
                  onChange={(e) => setEditingParcel({ ...editingParcel, planting_type: e.target.value })}
                >
                  <option value="">Sélectionner...</option>
                  <option value="traditional">Traditionnelle</option>
                  <option value="intensive">Intensive</option>
                  <option value="super_intensive">Super-intensive</option>
                  <option value="organic">Biologique</option>
                </Select>
              </FormField>
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
                    handleUpdateParcel(editingParcel.id, editingParcel);
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
  validateSearch: (search: Record<string, unknown>) => {
    return {
      parcelId: (search.parcelId as string) || undefined,
      tab: (search.tab as string) || undefined,
      farmId: (search.farmId as string) || undefined,
    };
  },
})
