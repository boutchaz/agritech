import { useState, useCallback, useMemo } from 'react';
import { createFileRoute, useNavigate, Outlet, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/hooks/useAuth'
import { useAutoStartTour } from '@/contexts/TourContext'
import ParcelsMap from '@/components/Map'
import ModernPageHeader from '@/components/ModernPageHeader'
import { PageLoader, SectionLoader } from '@/components/ui/loader'
import { useFarms, useParcelsByFarm, useParcelsByOrganization, useUpdateParcel, useDeleteParcel, type Parcel } from '@/hooks/useParcelsQuery';
import { Edit2, Trash2, MapPin, Ruler, Droplets, Building2, TreePine, Trees as Tree } from 'lucide-react'
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterBar, useServerTableState } from '@/components/ui/data-table';

interface ParcelsListContentProps {
  search: { farmId?: string };
}

const ParcelsListContent = ({ search }: ParcelsListContentProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();

  useAutoStartTour('parcels', 1500);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});

  const [showAddParcelMap, setShowAddParcelMap] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingBoundaryParcelId, setEditingBoundaryParcelId] = useState<string | null>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const { search: searchTerm, setSearch: setSearchTerm } = useServerTableState();

  /** Farm filter: URL is the only source of truth (avoids navigate ↔ state sync loops). */
  const selectedFarmId = search.farmId ?? '';
  const setFarmFilter = useCallback(
    (farmId: string) => {
      void navigate({
        to: '/parcels',
        search: { farmId: farmId || undefined },
        replace: true,
      });
    },
    [navigate],
  );

  // React Query hooks
  const { data: farms = [], isLoading: farmsLoading, error: farmsError } = useFarms(currentOrganization?.id);
  const updateParcelMutation = useUpdateParcel();
  const archiveParcelMutation = useDeleteParcel();

  // Determine farm view context - use stable values to prevent re-render loops
  const isAllFarmsView = !selectedFarmId && !currentFarm?.id;
  const targetFarmId = selectedFarmId || currentFarm?.id || undefined;

  // Use organization-wide parcels query for stable query key
  const { data: parcelsByOrg = [], isLoading: parcelsByOrgLoading, error: parcelsByOrgError } = useParcelsByOrganization(currentOrganization?.id);
  const { data: parcelsByFarm = [], isLoading: parcelsByFarmLoading, error: parcelsByFarmError } = useParcelsByFarm(targetFarmId, currentOrganization?.id);

  // Get the appropriate parcels data
  const parcels = targetFarmId ? parcelsByFarm : parcelsByOrg;
  const loading = targetFarmId ? parcelsByFarmLoading : parcelsByOrgLoading || farmsLoading;
  const fetchError = targetFarmId ? parcelsByFarmError : (parcelsByOrgError || farmsError);
  const activeFarmId = isAllFarmsView ? undefined : (selectedFarmId || currentFarm?.id);
  const activeFarm = activeFarmId ? farms.find((farm) => farm.id === activeFarmId) : null;

  const filteredParcels = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return parcels;

    return parcels.filter((parcel) => {
      const farmName = farms.find((farm) => farm.id === parcel.farm_id)?.name ?? '';
      return [
        parcel.name,
        parcel.description,
        parcel.irrigation_type,
        parcel.tree_type,
        parcel.variety,
        parcel.rootstock,
        farmName,
      ]
        .filter(Boolean)
        .some((value) => value?.toString().toLowerCase().includes(normalizedSearch));
    });
  }, [farms, parcels, searchTerm]);

          // Farms and parcels are loaded automatically via React Query hooks
          // No manual fetching needed

  const handleArchiveParcel = async (parcelId: string) => {
    try {
      await archiveParcelMutation.mutateAsync(parcelId);
      toast.success(t('parcels.archiveSuccess', 'Parcelle archivée avec succès'));
    } catch (error) {
      console.error('Error archiving parcel:', error);
      toast.error(t('parcels.archiveError', "Erreur lors de l'archivage"));
    }
  };

  const handleUpdateParcel = async (parcelId: string, updates: Partial<Parcel>) => {
    try {
      await updateParcelMutation.mutateAsync({ id: parcelId, updates });
      setEditingParcel(null);
      setShowEditDialog(false);
    } catch (error) {
      console.error('Error updating parcel:', error);
      toast.error(t('parcels.updateError'));
    }
  };

  const handleParcelSelect = useCallback((parcelId: string) => {
    setSelectedParcelId(parcelId);
  }, []);



  if (!currentOrganization) {
    return <PageLoader />;
  }

  return (
    <>
      <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: TreePine, label: t('parcels.farms') },
            { icon: MapPin, label: t('nav.parcels'), isActive: true }
          ]}
          title={t('parcels.title')}
          subtitle={(() => {
            const farmName = activeFarm?.name || (!isAllFarmsView ? currentFarm?.name : undefined);
            return activeFarmId && farmName
              ? t('parcels.subtitle', { count: filteredParcels.length, farmName })
              : t('parcels.subtitleAllFarms', { count: filteredParcels.length });
          })()}
        />
        <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
          <div data-tour="parcel-filters">
            <FilterBar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder={t('parcels.searchPlaceholder', 'Search parcels...')}
              filters={farms.length > 1 ? [{
                key: 'farm',
                value: selectedFarmId,
                onChange: setFarmFilter,
                options: [
                  { value: '', label: t('parcels.allFarms') },
                  ...farms.map((farm) => ({ value: farm.id, label: farm.name })),
                ],
                placeholder: t('parcels.allFarms'),
              }] : []}
            />
          </div>

          {loading ? (
            <SectionLoader className="h-96 min-h-0 rounded-lg bg-white dark:bg-gray-800" />
          ) : fetchError ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-red-500 dark:text-red-400 mb-4">
                {t('parcels.loadError', 'Failed to load parcels. Please try again.')}
              </p>
              <Button variant="blue"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg"
              >
                {t('parcels.refresh')}
              </Button>
            </div>
          ) : parcels.length === 0 && !showAddParcelMap ? (
            <div data-testid="parcels-empty-state">
              <EmptyState
                icon={MapPin}
                title={t('parcels.emptyTitle', 'No parcels yet')}
                description={!isAllFarmsView
                  ? t('parcels.noParcelsForFarm', { farmName: activeFarm?.name || '' })
                  : t('parcels.selectFarmToAdd')}
                action={!isAllFarmsView && (currentFarm || selectedFarmId)
                  ? {
                      label: t('parcels.addParcel'),
                      onClick: () => {
                        setEditingBoundaryParcelId(null);
                        setShowAddParcelMap(true);
                      },
                    }
                  : undefined}
                secondaryAction={{
                  label: t('parcels.refresh'),
                  onClick: () => window.location.reload(),
                }}
              />
            </div>
          ) : (
            <>
              {showAddParcelMap && parcels.length === 0 && (
                <div className="mb-4 flex justify-between items-center">
                  <Button
                    onClick={() => setShowAddParcelMap(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    {t('parcels.back')}
                  </Button>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('parcels.drawOnMap')}
                  </p>
                </div>
              )}

              <div data-tour="farm-map">
                <ParcelsMap
                  center={[31.7917, -7.0926]}
                  zones={[]}
                  sensors={[]}
                  farmId={targetFarmId}
                  enableDrawing={true}
                  selectedParcelId={selectedParcelId}
                  onParcelSelect={handleParcelSelect}
                  parcels={filteredParcels}
                  editingParcelId={editingBoundaryParcelId}
                  onParcelAdded={(newParcel: unknown) => {
                    setShowAddParcelMap(false);
                    setEditingBoundaryParcelId(null);
                    const createdParcel = typeof newParcel === 'object' && newParcel !== null && 'id' in newParcel
                      ? (newParcel as { id?: string })
                      : null;
                    // Navigate to the newly created parcel detail page
                    if (createdParcel?.id) {
                      navigate({ to: `/parcels/${createdParcel.id}` });
                    }
                  }}
                  onBoundaryUpdated={() => {
                    setShowAddParcelMap(false);
                    setEditingBoundaryParcelId(null);
                  }}
                />
              </div>

              {/* Parcel selection now navigates to dedicated parcel detail pages */}

              {filteredParcels.length > 0 ? (
                <div data-testid="parcels-list" data-tour="parcel-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {filteredParcels.map((parcel) => {
                    const farm = farms.find(f => f.id === parcel.farm_id);
                    return (
                      <div
                        key={parcel.id}
                        data-testid={`parcel-card-${parcel.id}`}
                        className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-4 cursor-pointer text-left ${
                          selectedParcelId === parcel.id
                            ? 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900'
                            : ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <button
                            type="button"
                            onClick={() => handleParcelSelect(parcel.id)}
                            className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2 text-left"
                          >
                            <MapPin className="h-4 w-4 text-green-600" />
                            <span>{parcel.name}</span>
                          </button>
                          <div className="flex space-x-1">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingParcel(parcel);
                                setShowEditDialog(true);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title={t('app.edit')}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                  setConfirmAction({
                                    title: t('parcels.archiveConfirmTitle', 'Archive parcel'),
                                    description: t('parcels.archiveConfirmMsg', 'Archiver cette parcelle ? Les données historiques seront conservées.'),
                                    variant: 'destructive',
                                    onConfirm: () => handleArchiveParcel(parcel.id),
                                  });
                                  setConfirmOpen(true);
                                }}
                                className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                                title={t('parcels.archive', 'Archiver')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <button type="button" onClick={() => handleParcelSelect(parcel.id)} className="w-full text-left">
                          {/* Show farm name when viewing all farms */}
                          {isAllFarmsView && farm && (
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
                                <span>{parcel.calculated_area || parcel.area} {parcel.area_unit || t('parcels.areaUnits.hectares')}</span>
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
                        </button>

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
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingBoundaryParcelId(parcel.id);
                                  setShowAddParcelMap(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 underline"
                              >
                                {t('parcels.defineBoundaries')}
                              </Button>
                            </div>
                          )}
                          <Button variant="green"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate({ to: `/parcels/${parcel.id}` });
                            }}
                            className="w-full mt-2 px-4 py-2 rounded-md transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                          >
                            <span>{t('parcels.viewDetails')}</span>
                            <span>→</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={MapPin}
                  title={t('parcels.noSearchResultsTitle', 'No matching parcels')}
                  description={t('parcels.noSearchResults', 'Try adjusting your search to find a parcel.')}
                  secondaryAction={{
                    label: t('dataTable.clearFilters', 'Clear'),
                    onClick: () => setSearchTerm(''),
                  }}
                />
              )}

            </>
          )}
        </div>

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
              <Button
                onClick={() => {
                  setEditingParcel(null);
                  setShowEditDialog(false);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                {t('parcels.form.cancel')}
              </Button>
              <Button variant="green"
                onClick={() => {
                  if (editingParcel) {
                    handleUpdateParcel(editingParcel.id, editingParcel);
                  }
                }}
                className="px-4 py-2 rounded-md"
              >
                {t('parcels.form.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </>
  );
};

const AppContent = () => {
  const location = useLocation();
  const search = Route.useSearch();
  // Match /parcels/{id} or /parcels/{id}/ or /parcels/{id}/something
  const isParcelDetailRoute = location.pathname.match(/^\/parcels\/[^/]+(\/.*)?$/);

  // If we're on a parcel detail route, show the full-page detail view
  if (isParcelDetailRoute) {
    return <Outlet />;
  }

  // Otherwise show the parcels list
  return <ParcelsListContent search={search} />;
};

export const Route = createFileRoute('/_authenticated/(production)/parcels')({
  component: AppContent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      farmId: (search.farmId as string) || undefined,
    } as {
      farmId: string | undefined;
    };
  },
})
