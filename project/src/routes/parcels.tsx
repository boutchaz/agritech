import React, { useState, useEffect, useRef } from 'react'
import { createFileRoute, useNavigate, Outlet, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { useAuth } from '../components/MultiTenantAuthProvider'
import Sidebar from '../components/Sidebar'
import Map from '../components/Map'
import ModernPageHeader from '../components/ModernPageHeader'
import { useFarms, useParcelsByFarm, useParcelsByFarms, useUpdateParcel, useDeleteParcel, type Parcel } from '../hooks/useParcelsQuery'
import type { Module, SensorData } from '../types'
import { Edit2, Trash2, MapPin, Ruler, Droplets, Building2, TreePine, Trees as Tree } from 'lucide-react'
import { useSidebarMargin } from '../hooks/useSidebarLayout'

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

interface ParcelsListContentProps {
  search: { farmId?: string };
}

const ParcelsListContent: React.FC<ParcelsListContentProps> = ({ search }) => {
  console.log('🎨 ParcelsListContent rendering', { search });
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();
  const isRTL = i18n.language === 'ar';

  console.log('Auth state:', {
    hasOrg: !!currentOrganization,
    orgName: currentOrganization?.name,
    hasFarm: !!currentFarm
  });

  const [activeModule, setActiveModule] = useState('parcels');
  const [isDarkMode] = useState(false);
  const [modules] = useState(mockModules);
  const { style: sidebarStyle } = useSidebarMargin(isRTL);
  const [_sensorData, _setSensorData] = useState<SensorData[]>([]);
  const [showAddParcelMap, setShowAddParcelMap] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(search.farmId || null);
  const [editingBoundaryParcelId, setEditingBoundaryParcelId] = useState<string | null>(null);

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


  // Get the appropriate parcels data
  const parcels = targetFarmId ? parcelsByFarm : parcelsByFarms;
  const loading = targetFarmId ? parcelsByFarmLoading : parcelsByFarmsLoading || farmsLoading;

  // Debug logging for farmId issue
  console.warn('🔍 FarmId Debug:', {
    selectedFarmId,
    currentFarmId: currentFarm?.id,
    targetFarmId,
    mapFarmId: targetFarmId, // This is what Map component will use
    currentFarmName: currentFarm?.name
  });

  // Sync URL search params to state (URL is source of truth)
  useEffect(() => {
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;

    const urlFarmId = search.farmId || null;

    if (urlFarmId !== selectedFarmId) {
      setSelectedFarmId(urlFarmId);
    }

    isSyncingRef.current = false;

  }, [search.farmId]);

  // Update URL when state changes (state changes trigger URL update)
  useEffect(() => {
    if (isSyncingRef.current) return;

    const newSearch: { farmId: string | undefined } = {
      farmId: undefined
    };
    const currentFarmId = search.farmId || null;

    if (selectedFarmId) {
      newSearch.farmId = selectedFarmId;
    }

    // Only navigate if something actually changed
    const farmChanged = currentFarmId !== selectedFarmId;

    if (farmChanged) {
      isSyncingRef.current = true;
      navigate({
        to: '/parcels',
        search: newSearch,
        replace: true,
      }).then(() => {
        isSyncingRef.current = false;
      });
    }

  }, [selectedFarmId]);

  // Farms and parcels are loaded automatically via React Query hooks
  // No manual fetching needed

  const handleDeleteParcel = async (parcelId: string) => {
    try {
      await deleteParcelMutation.mutateAsync(parcelId);
    } catch (error) {
      console.error('Error deleting parcel:', error);
      alert(t('parcels.deleteError'));
    }
  };

  const handleUpdateParcel = async (parcelId: string, updates: Partial<Parcel>) => {
    try {
      await updateParcelMutation.mutateAsync({ id: parcelId, updates });
      setEditingParcel(null);
      setShowEditDialog(false);
    } catch (error) {
      console.error('Error updating parcel:', error);
      alert(t('parcels.updateError'));
    }
  };

  const handleParcelSelect = (parcelId: string) => {
    console.log('handleParcelSelect called with:', parcelId);
    console.log('Attempting to navigate to:', `/parcels/${parcelId}`);

    try {
      // Navigate to the parcel detail page instead of using state
      navigate({ to: `/parcels/${parcelId}` });
      console.log('Navigation successful');
    } catch (error) {
      console.error('Navigation error:', error);
      alert(`Error navigating to parcel: ${error}`);
    }
  };



  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('parcels.loadingOrganization')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Sidebar
        modules={modules.filter(m => m.active)}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isDarkMode={isDarkMode}
        onThemeToggle={() => { }}
      />
      <main data-testid="parcels-page" className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-all duration-300 ease-in-out" style={sidebarStyle}>
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
            { icon: TreePine, label: t('parcels.farms') },
            { icon: MapPin, label: t('nav.parcels'), isActive: true }
          ]}
          title={t('parcels.title')}
          subtitle={(() => {
            const targetFarmId = selectedFarmId || currentFarm?.id;
            const farm = farms?.find(f => f.id === targetFarmId);
            const farmName = farm?.name || currentFarm?.name;
            return farmName
              ? t('parcels.subtitle', { count: parcels.length, farmName })
              : t('parcels.subtitleAllFarms', { count: parcels.length });
          })()}
          actions={
            farms && farms.length > 1 ? (
              <select
                data-tour="parcel-filters"
                value={selectedFarmId || currentFarm?.id || ''}
                onChange={(e) => setSelectedFarmId(e.target.value || null)}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm w-full sm:w-auto"
              >
                <option value="">{t('parcels.allFarms')}</option>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6 hidden">
            <div className="w-full sm:w-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {t('parcels.title')}
              </h2>
              {/* Show current context */}
              <div className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {selectedFarmId || currentFarm ? (
                  <span className="font-medium text-gray-900 dark:text-white">
                    {(() => {
                      const targetFarmId = selectedFarmId || currentFarm?.id;
                      const farm = farms?.find(f => f.id === targetFarmId);
                      return farm?.name || currentFarm?.name || t('parcels.loading');
                    })()}
                  </span>
                ) : (
                  <span className="font-medium text-gray-900 dark:text-white">
                    {currentOrganization?.name}
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 w-full sm:w-auto text-left sm:text-right">
              {loading ? (
                <span>{t('parcels.loading')}</span>
              ) : (
                <span>{t('parcels.subtitle', { count: parcels.length, farmName: '' })}</span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : parcels.length === 0 && !showAddParcelMap ? (
            <div data-testid="parcels-empty-state" className="space-y-6">
              {/* Show farms overview when no specific farm is selected */}
              {!selectedFarmId && !currentFarm && farms.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('parcels.farmsIn', { orgName: currentOrganization?.name })}
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
                            📏 {farm.size} {t('units.hectares').toLowerCase()}
                          </p>
                        )}
                        {farm.manager_name && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            👤 {farm.manager_name}
                          </p>
                        )}
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          {t('parcels.clickToViewParcels')}
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
                    ? t('parcels.noParcelsForFarm', { farmName: (() => {
                      const targetFarmId = selectedFarmId || currentFarm?.id;
                      const farm = farms?.find(f => f.id === targetFarmId);
                      return farm?.name || '';
                    })() })
                    : t('parcels.selectFarmToAdd')}
                </p>
                  {(currentFarm || selectedFarmId) && (
                    <div className="space-x-3" data-tour="parcel-actions">
                      <button
                        data-testid="create-parcel-button"
                        onClick={() => {
                          setEditingBoundaryParcelId(null);
                          setShowAddParcelMap(true);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        {t('parcels.addParcel')}
                      </button>
                    <button
                      onClick={() => {
                        // Manual refresh of React Query cache
                        window.location.reload();
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {t('parcels.refresh')}
                    </button>
                  </div>
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
                    {t('parcels.back')}
                  </button>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('parcels.drawOnMap')}
                  </p>
                </div>
              )}

              <div data-tour="farm-map">
                <Map
                  center={[31.7917, -7.0926]}
                  zones={[]}
                  sensors={[]}
                  farmId={targetFarmId}
                  enableDrawing={true}
                  selectedParcelId={null}
                  onParcelSelect={handleParcelSelect}
                  parcels={parcels}
                  editingParcelId={editingBoundaryParcelId}
                  onParcelAdded={(newParcel) => {
                    setShowAddParcelMap(false);
                    setEditingBoundaryParcelId(null);
                    // Navigate to the newly created parcel detail page
                    if (newParcel?.id) {
                      navigate({ to: `/parcels/${newParcel.id}` });
                    }
                  }}
                  onBoundaryUpdated={() => {
                    setShowAddParcelMap(false);
                    setEditingBoundaryParcelId(null);
                  }}
                />
              </div>

              {/* Parcel selection now navigates to dedicated parcel detail pages */}

              {parcels.length > 0 && (
                <div data-testid="parcels-list" data-tour="parcel-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {parcels.map((parcel) => {
                    const farm = farms.find(f => f.id === parcel.farm_id);
                    return (
                      <div
                        key={parcel.id}
                        data-testid={`parcel-card-${parcel.id}`}
                        className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-700 transition-all hover:shadow-lg hover:border-green-300"
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
                              title={t('app.edit')}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(t('parcels.deleteConfirm', { name: parcel.name }))) {
                                  handleDeleteParcel(parcel.id);
                                }
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title={t('app.delete')}
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
                              <span className="font-medium">{parcel.tree_count}</span> {t('parcels.trees')}
                              {parcel.planting_year && (
                                <span className="text-xs text-gray-400 ml-1">
                                  • {t('parcels.plantedIn')} {parcel.planting_year}
                                </span>
                              )}
                            </div>
                          )}
                          {parcel.rootstock && (
                            <div className="text-xs text-gray-400">
                              {t('parcels.rootstock')}: {parcel.rootstock}
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                          {parcel.boundary && parcel.boundary.length > 0 ? (
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                              {t('parcels.boundariesDefined')}
                            </p>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                {t('parcels.noBoundaries')}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingBoundaryParcelId(parcel.id);
                                  setShowAddParcelMap(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 underline"
                              >
                                {t('parcels.defineBoundaries')}
                              </button>
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('View Details button clicked for:', parcel.id);
                              handleParcelSelect(parcel.id);
                            }}
                            className="w-full mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                          >
                            <span>{t('parcels.viewDetails')}</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
              {t('parcels.editParcel')}
            </h3>

            <div className="space-y-4">
              <FormField label={t('parcels.form.name')} htmlFor="parcel_name">
                <Input
                  id="parcel_name"
                  type="text"
                  value={editingParcel.name}
                  onChange={(e) => setEditingParcel({ ...editingParcel, name: e.target.value })}
                />
              </FormField>

              <FormField label={t('parcels.form.description')} htmlFor="parcel_description">
                <Textarea
                  id="parcel_description"
                  value={editingParcel.description || ''}
                  onChange={(e) => setEditingParcel({ ...editingParcel, description: e.target.value })}
                  rows={3}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('parcels.form.area')} htmlFor="parcel_area">
                  <Input
                    id="parcel_area"
                    type="number"
                    value={editingParcel.area || ''}
                    onChange={(e) => setEditingParcel({ ...editingParcel, area: parseFloat(e.target.value) })}
                    step={1}
                  />
                </FormField>

                <FormField label={t('parcels.form.areaUnit')} htmlFor="parcel_area_unit">
                  <Select
                    id="parcel_area_unit"
                    value={editingParcel.area_unit || 'hectares'}
                    onChange={(e) => setEditingParcel({ ...editingParcel, area_unit: e.target.value })}
                  >
                    <option value="hectares">{t('parcels.areaUnits.hectares')}</option>
                    <option value="square_meters">{t('parcels.areaUnits.square_meters')}</option>
                    <option value="acres">{t('parcels.areaUnits.acres')}</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('parcels.form.soilType')} htmlFor="parcel_soil_type">
                  <Input
                    id="parcel_soil_type"
                    type="text"
                    value={editingParcel.soil_type || ''}
                    onChange={(e) => setEditingParcel({ ...editingParcel, soil_type: e.target.value })}
                    placeholder={t('parcels.form.soilTypePlaceholder')}
                  />
                </FormField>

                <FormField label={t('parcels.form.irrigationType')} htmlFor="parcel_irrigation_type">
                  <Select
                    id="parcel_irrigation_type"
                    value={editingParcel.irrigation_type || ''}
                    onChange={(e) => setEditingParcel({ ...editingParcel, irrigation_type: e.target.value })}
                  >
                    <option value="">{t('parcels.form.selectIrrigation')}</option>
                    <option value="drip">{t('parcels.irrigationTypes.drip')}</option>
                    <option value="sprinkler">{t('parcels.irrigationTypes.sprinkler')}</option>
                    <option value="flood">{t('parcels.irrigationTypes.flood')}</option>
                    <option value="none">{t('parcels.irrigationTypes.none')}</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('parcels.form.variety')} htmlFor="parcel_variety">
                  <Input
                    id="parcel_variety"
                    type="text"
                    value={editingParcel.variety || ''}
                    onChange={(e) => setEditingParcel({ ...editingParcel, variety: e.target.value })}
                    placeholder={t('parcels.form.varietyPlaceholder')}
                  />
                </FormField>

                <FormField label={t('parcels.form.plantingDate')} htmlFor="parcel_planting_date">
                  <Input
                    id="parcel_planting_date"
                    type="date"
                    value={editingParcel.planting_date || ''}
                    onChange={(e) => setEditingParcel({ ...editingParcel, planting_date: e.target.value })}
                  />
                </FormField>
              </div>

              <FormField label={t('parcels.form.plantingType')} htmlFor="parcel_planting_type">
                <Select
                  id="parcel_planting_type"
                  value={editingParcel.planting_type || ''}
                  onChange={(e) => setEditingParcel({ ...editingParcel, planting_type: e.target.value })}
                >
                  <option value="">{t('parcels.form.selectIrrigation')}</option>
                  <option value="traditional">{t('parcels.plantingTypes.traditional')}</option>
                  <option value="intensive">{t('parcels.plantingTypes.intensive')}</option>
                  <option value="super_intensive">{t('parcels.plantingTypes.super_intensive')}</option>
                  <option value="organic">{t('parcels.plantingTypes.organic')}</option>
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
                {t('parcels.form.cancel')}
              </button>
              <button
                onClick={() => {
                  if (editingParcel) {
                    handleUpdateParcel(editingParcel.id, editingParcel);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {t('parcels.form.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const search = Route.useSearch();
  // Match /parcels/{id} or /parcels/{id}/ or /parcels/{id}/something
  const isParcelDetailRoute = location.pathname.match(/^\/parcels\/[^/]+(\/.*)?$/);

  console.log('📋 Parcels route check', {
    pathname: location.pathname,
    isParcelDetailRoute: !!isParcelDetailRoute,
    search
  });

  // If we're on a parcel detail route, show the full-page detail view
  if (isParcelDetailRoute) {
    console.log('🎯 Rendering full-page parcel detail');
    return <Outlet />;
  }

  // Otherwise show the parcels list
  console.log('📝 Rendering parcels list with search:', search);
  return <ParcelsListContent search={search} />;
};

export const Route = createFileRoute('/parcels')({
  component: AppContent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      farmId: (search.farmId as string) || undefined,
    } as {
      farmId: string | undefined;
    };
  },
})
