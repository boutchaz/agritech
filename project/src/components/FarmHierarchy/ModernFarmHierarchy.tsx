import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiClient } from '../../lib/api-client';
import { farmsService } from '../../services/farmsService';
import { parcelsService } from '../../services/parcelsService';
import FarmHierarchyHeader from './FarmHierarchyHeader';
import FarmCard from './FarmCard';
import FarmListItem from './FarmListItem';
import ParcelManagementModal from './ParcelManagementModal';
import FarmDetailsModal from './FarmDetailsModal';
import FarmImportDialog from './FarmImportDialog';
import EditFarmManagerModal from './EditFarmManagerModal';
import { Building2, X, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface FarmNode {
  farm_id: string;
  farm_name: string;
  farm_type: 'main' | 'sub';
  parent_farm_id: string | null;
  hierarchy_level: number;
  manager_name: string;
  sub_farms_count: number;
  farm_size: number;
  is_active: boolean;
  children?: FarmNode[];
  parcels?: Array<{ id: string; name: string; area: number }>;
}

interface ModernFarmHierarchyProps {
  organizationId: string;
  onFarmSelect?: (farmId: string) => void;
  onAddParcel?: (farmId: string) => void;
  onManageFarm?: (farmId: string) => void;
}

// Schema will be defined inside the component to access t function
const getFarmSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(2, t('farmHierarchy.farm.validation.nameRequired')),
});

type FarmFormValues = {
  name: string;
};

const ModernFarmHierarchy: React.FC<ModernFarmHierarchyProps> = ({
  organizationId,
  onFarmSelect: _onFarmSelect,
  onAddParcel: _onAddParcel,
  onManageFarm
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFarmForParcels, setSelectedFarmForParcels] = useState<{ id: string; name: string } | null>(null);
  const [selectedFarmForDetails, setSelectedFarmForDetails] = useState<string | null>(null);
  const [farmToDelete, setFarmToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFarmIds, setSelectedFarmIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'main' | 'sub',
    status: 'all' as 'all' | 'active' | 'inactive',
  });
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [relatedDataCounts, setRelatedDataCounts] = useState<{
    parcels: number;
    workers: number;
    tasks: number;
    satellite_data: number;
    warehouses: number;
    inventory_items: number;
    structures: number;
  } | null>(null);
  const [loadingRelatedData, setLoadingRelatedData] = useState(false);
  const [selectedFarmForEditManager, setSelectedFarmForEditManager] = useState<{
    id: string;
    name: string;
    manager_name?: string;
    manager_email?: string;
    manager_phone?: string;
  } | null>(null);

  // Debug: Log organization ID on mount and when it changes
  if (!organizationId) {
    console.error('❌ ModernFarmHierarchy: No organizationId provided!');
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FarmFormValues>({
    resolver: zodResolver(getFarmSchema(t)),
  });

  // Fetch organization using farmsService (apiClient)
  const { data: organization } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => farmsService.getOrganization(organizationId),
    enabled: !!organizationId
  });

  const { data: farms = [], isLoading } = useQuery({
    queryKey: ['farm-hierarchy', organizationId],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/api/v1/farms?organization_id=${organizationId}`;

      const result = await apiClient.get<{ success: boolean; farms: unknown[] }>(url, {}, organizationId);

      const data = result.farms || [];

      // Build tree structure
      const farmMap = new Map<string, FarmNode>();
      const rootFarms: FarmNode[] = [];

      // First pass: create all nodes
      (data || []).forEach((farm: any) => {
        farmMap.set(farm.farm_id, {
          farm_id: farm.farm_id,
          farm_name: farm.farm_name,
          farm_type: farm.farm_type || 'main',
          parent_farm_id: farm.parent_farm_id,
          hierarchy_level: farm.hierarchy_level || 1,
          manager_name: farm.manager_name,
          sub_farms_count: farm.sub_farms_count || 0,
          farm_size: farm.farm_size || 0,
          is_active: farm.is_active !== false,
          children: [],
          parcels: []
        });
      });

      // Second pass: build tree structure
      (data || []).forEach((farm: any) => {
        const node = farmMap.get(farm.farm_id)!;

        if (farm.parent_farm_id) {
          const parent = farmMap.get(farm.parent_farm_id);
          if (parent) {
            parent.children!.push(node);
          }
        } else {
          rootFarms.push(node);
        }
      });

      // Fetch parcels for each farm using parcelsService (apiClient)
      const farmIds = Array.from(farmMap.keys());
      console.log('🔍 Fetching parcels for', farmIds.length, 'farms');

      if (farmIds.length > 0) {
        try {
          // Fetch parcels for all farms in the organization (no farm_id filter to get all)
          const parcelsData = await parcelsService.listParcels();
          console.log('✅ Parcels fetched:', parcelsData.length, 'parcels');

          // Filter parcels for our farms and group by farm_id
          const parcelsByFarm = parcelsData
            .filter((p) => farmIds.includes(p.farm_id))
            .reduce((acc: Record<string, Array<{ id: string; name: string; area: number }>>, parcel) => {
              if (!acc[parcel.farm_id]) acc[parcel.farm_id] = [];
              acc[parcel.farm_id].push({
                id: parcel.id,
                name: parcel.name,
                area: parcel.area || 0
              });
              return acc;
            }, {});

          // Assign parcels to farms and calculate actual size from parcels
          farmMap.forEach((farm) => {
            const farmParcels = parcelsByFarm[farm.farm_id] || [];
            farm.parcels = farmParcels;

            // Calculate actual farm size from parcels
            const calculatedSize = farmParcels.reduce((sum: number, p: { area: number }) => sum + (p.area || 0), 0);

            // Use calculated size if we have parcels, otherwise use the farm's size field
            if (calculatedSize > 0) {
              farm.farm_size = calculatedSize;
            }
          });
        } catch (parcelsError) {
          console.error('❌ Error fetching parcels:', parcelsError);
        }
      }

      // Recursively calculate total size including children
      const calculateTotalSize = (farm: FarmNode): number => {
        let total = farm.farm_size || 0;

        if (farm.children && farm.children.length > 0) {
          farm.children.forEach(child => {
            total += calculateTotalSize(child);
          });
        }

        return total;
      };

      // Update parent farms with total size including sub-farms
      rootFarms.forEach(rootFarm => {
        if (rootFarm.children && rootFarm.children.length > 0) {
          const totalSize = calculateTotalSize(rootFarm);
          rootFarm.farm_size = totalSize;
        }
      });

      return rootFarms;
    },
    enabled: !!organizationId
  });

  // Create farm mutation using farmsService (apiClient)
  const createFarmMutation = useMutation({
    mutationFn: async (formData: FarmFormValues) => {
      return farmsService.createFarm({
        name: formData.name,
        is_active: true,
        status: 'active',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy', organizationId] });
      reset();
      setShowAddForm(false);
    },
    onError: (error: Error) => {
      console.error('Error creating farm:', error);
      toast.error(t('app.error') + ': ' + (error.message || ''));
    }
  });

  const onSubmit = (data: FarmFormValues) => {
    createFarmMutation.mutate(data);
  };

  // Export farm handler using farmsService (apiClient)
  const handleExportFarm = async (farmId: string) => {
    try {
      const result = await farmsService.exportFarm({ 
        farm_id: farmId, 
        include_sub_farms: true 
      });

      if (result?.success && result?.data) {
        // Download as JSON file
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `farm-export-${farmId}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Export réussi!');
      } else {
        throw new Error(result?.error || 'Erreur lors de l\'export');
      }
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'export';
      toast.error(`Erreur lors de l'export: ${errorMessage}`);
    }
  };

  // Export all farms handler using farmsService (apiClient)
  const handleExportAll = async () => {
    try {
      const result = await farmsService.exportFarm({ 
        organization_id: organizationId 
      });

      if (result?.success && result?.data) {
        // Download as JSON file
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `farms-export-${organization?.name || 'all'}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Export réussi!');
      } else {
        throw new Error(result?.error || 'Erreur lors de l\'export');
      }
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'export';
      toast.error(`Erreur lors de l'export: ${errorMessage}`);
    }
  };

  // Import handler
  const handleImportSuccess = () => {
    // Invalidate all farm-related queries
    queryClient.invalidateQueries({ queryKey: ['farm-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['farms'] });
    queryClient.invalidateQueries({ queryKey: ['parcels'] });
    queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });

    // Force refetch the farm hierarchy
    queryClient.refetchQueries({ queryKey: ['farm-hierarchy', organizationId] });
  };

  // Fetch related data counts for a farm using farmsService (apiClient)
  const fetchRelatedDataCounts = async (farmId: string) => {
    setLoadingRelatedData(true);
    try {
      const data = await farmsService.getRelatedDataCounts(farmId);
      setRelatedDataCounts({
        parcels: data.parcels || 0,
        workers: data.workers || 0,
        tasks: data.tasks || 0,
        satellite_data: data.satellite_data || 0,
        warehouses: data.warehouses || 0,
        inventory_items: data.inventory_items || 0,
        structures: data.structures || 0,
      });
    } catch (error) {
      console.error('Error fetching related data counts:', error);
      setRelatedDataCounts(null);
    } finally {
      setLoadingRelatedData(false);
    }
  };

  // Handle delete farm click
  const handleDeleteFarmClick = (farm: { id: string; name: string }) => {
    setFarmToDelete(farm);
    fetchRelatedDataCounts(farm.id);
  };

  // Delete farm mutation using farmsService (apiClient)
  const deleteFarmMutation = useMutation({
    mutationFn: async (farmId: string) => {
      const result = await farmsService.deleteFarm(farmId);

      if (!result?.success) {
        throw new Error('La suppression a échoué');
      }

      return { farmId, farmName: farmToDelete?.name };
    },
    onSuccess: (result) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['farms'] });

      // Success feedback with captured farm name
      toast.success(`La ferme "${result?.farmName}" et toutes ses données associées ont été supprimées avec succès.`);

      // Close dialog and reset state
      setFarmToDelete(null);
      setRelatedDataCounts(null);
      deleteFarmMutation.reset();
    },
    onError: (error: Error) => {
      let errorMessage = 'Erreur lors de la suppression de la ferme';

      if (error?.message) {
        errorMessage += `: ${error.message}`;
      }

      toast.error(errorMessage);
      // Don't close dialog on error so user can try again or see the error
    }
  });

  // Filter farms based on search and filters
  const filteredFarms = useMemo(() => {
    const filterTree = (nodes: FarmNode[]): FarmNode[] => {
      return nodes.reduce((acc: FarmNode[], node) => {
        // Apply search filter
        const searchMatch = !searchTerm ||
          node.farm_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.manager_name?.toLowerCase().includes(searchTerm.toLowerCase());

        // Apply type filter
        const typeMatch = filters.type === 'all' || node.farm_type === filters.type;

        // Apply status filter
        const statusMatch = filters.status === 'all' ||
          (filters.status === 'active' && node.is_active) ||
          (filters.status === 'inactive' && !node.is_active);

        const matches = searchMatch && typeMatch && statusMatch;

        if (matches) {
          acc.push({ ...node });
        } else if (node.children && node.children.length > 0) {
          const filteredChildren = filterTree(node.children);
          if (filteredChildren.length > 0) {
            acc.push({ ...node, children: filteredChildren });
          }
        }
        return acc;
      }, []);
    };

    return filterTree(farms);
  }, [farms, searchTerm, filters]);

  // Calculate totals from flat list
  const allFarms = useMemo(() => {
    const flattenFarms = (nodes: FarmNode[]): FarmNode[] => {
      return nodes.reduce((acc: FarmNode[], node) => {
        acc.push(node);
        if (node.children && node.children.length > 0) {
          acc.push(...flattenFarms(node.children));
        }
        return acc;
      }, []);
    };
    return flattenFarms(farms);
  }, [farms]);

  const totalFarms = allFarms.length;
  const totalArea = allFarms.reduce((sum, farm) => sum + farm.farm_size, 0);

  // Multi-selection handlers
  const toggleFarmSelection = (farmId: string) => {
    setSelectedFarmIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(farmId)) {
        newSet.delete(farmId);
      } else {
        newSet.add(farmId);
      }
      return newSet;
    });
  };

  const selectAllFarms = () => {
    setSelectedFarmIds(new Set(allFarms.map(f => f.farm_id)));
  };

  const clearSelection = () => {
    setSelectedFarmIds(new Set());
  };

  const handleBatchDeleteClick = () => {
    if (selectedFarmIds.size === 0) return;
    setShowBatchDeleteConfirm(true);
  };

  const handleBatchDeleteConfirm = async () => {
    if (selectedFarmIds.size === 0) return;

    try {
      const result = await farmsService.batchDeleteFarms(Array.from(selectedFarmIds));

      // Show success message with details
      if (result.deleted > 0) {
        toast.success(
          `${result.deleted} ferme(s) supprimée(s) avec succès${result.failed > 0 ? `. ${result.failed} échec(s)` : ''}`
        );
      }

      // Show errors if any
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((error: { name: string; error: string }) => {
          toast.error(`${error.name}: ${error.error}`, { duration: 5000 });
        });
      }

      clearSelection();
      setShowBatchDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy', organizationId] });
    } catch (error) {
      console.error('Error deleting farms:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
      setShowBatchDeleteConfirm(false);
    }
  };

  // Render farm tree recursively (Grid View)
  const renderFarmTree = (nodes: FarmNode[]) => {
    return nodes.map(farm => (
      <div key={farm.farm_id} className="space-y-3">
        <FarmCard
          farm={{
            id: farm.farm_id,
            name: farm.farm_name,
            type: farm.farm_type,
            size: farm.farm_size,
            manager_name: farm.manager_name,
            sub_farms_count: farm.sub_farms_count,
            parcels_count: farm.parcels?.length || 0,
            hierarchy_level: farm.hierarchy_level,
            is_active: farm.is_active
          }}
          onSelect={() => setSelectedFarmForDetails(farm.farm_id)}
          onManage={() => onManageFarm?.(farm.farm_id)}
          onEditManager={() => setSelectedFarmForEditManager({
            id: farm.farm_id,
            name: farm.farm_name,
            manager_name: farm.manager_name,
          })}
          onViewParcels={() => setSelectedFarmForParcels({ id: farm.farm_id, name: farm.farm_name })}
          onDelete={() => handleDeleteFarmClick({ id: farm.farm_id, name: farm.farm_name })}
        />
        {farm.children && farm.children.length > 0 && (
          <div className="ml-8 space-y-3">
            {renderFarmTree(farm.children)}
          </div>
        )}
      </div>
    ));
  };

  // Render farm list (List View)
  const renderFarmList = (nodes: FarmNode[]) => {
    return nodes.map(farm => (
      <FarmListItem
        key={farm.farm_id}
        farm={{
          id: farm.farm_id,
          name: farm.farm_name,
          type: farm.farm_type,
          size: farm.farm_size,
          manager_name: farm.manager_name,
          sub_farms_count: farm.sub_farms_count,
          parcels_count: farm.parcels?.length || 0,
          hierarchy_level: farm.hierarchy_level,
          is_active: farm.is_active
        }}
        isSelected={selectedFarmIds.has(farm.farm_id)}
        onSelect={() => setSelectedFarmForDetails(farm.farm_id)}
        onToggleSelection={() => toggleFarmSelection(farm.farm_id)}
        onManage={() => onManageFarm?.(farm.farm_id)}
        onEditManager={() => setSelectedFarmForEditManager({
          id: farm.farm_id,
          name: farm.farm_name,
          manager_name: farm.manager_name,
        })}
        onViewParcels={() => setSelectedFarmForParcels({ id: farm.farm_id, name: farm.farm_name })}
        onDelete={() => handleDeleteFarmClick({ id: farm.farm_id, name: farm.farm_name })}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('farmHierarchy.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FarmHierarchyHeader
        organizationName={organization?.name || ''}
        totalFarms={totalFarms}
        totalArea={totalArea}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddFarm={() => setShowAddForm(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onExportAll={handleExportAll}
        onImport={() => setShowImportDialog(true)}
        onExportFarm={handleExportFarm}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Add Farm Form Modal */}
      {showAddForm && (
        <div data-testid="create-farm-form" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('farmHierarchy.farm.createNew')}
            </h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('farmHierarchy.farm.name')} *
              </label>
              <input
                {...register('name')}
                data-testid="farm-name-input"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder={t('farmHierarchy.farm.namePlaceholder')}
              />
              {errors.name && (
                <p data-testid="farm-name-error" className="text-red-600 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                data-testid="farm-submit-button"
                disabled={createFarmMutation.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {createFarmMutation.isPending ? t('farmHierarchy.farm.creating') : t('farmHierarchy.farm.create')}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {t('app.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Multi-selection Action Bar */}
      {viewMode === 'list' && selectedFarmIds.size > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedFarmIds.size} {selectedFarmIds.size === 1 ? 'ferme sélectionnée' : 'fermes sélectionnées'}
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Désélectionner
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllFarms}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Tout sélectionner
              </button>
              <button
                onClick={handleBatchDeleteClick}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Farms Grid/List */}
      {filteredFarms.length === 0 ? (
        <div data-testid="farms-empty-state" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchTerm ? t('farmHierarchy.farm.noFarmsFound') : t('farmHierarchy.farm.noFarms')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm
              ? t('farmHierarchy.farm.noSearchResults')
              : t('farmHierarchy.farm.noFarmsMessage')}
          </p>
          {!searchTerm && (
            <button
              data-testid="empty-state-create-farm-button"
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              {t('farmHierarchy.farm.create')}
            </button>
          )}
        </div>
      ) : (
        <div data-testid="farms-list" data-tour="farm-list" className="space-y-3">
          {viewMode === 'grid' ? renderFarmTree(filteredFarms) : renderFarmList(allFarms.filter(farm =>
            filteredFarms.some(f => f.farm_id === farm.farm_id ||
              (f.children && f.children.some(c => c.farm_id === farm.farm_id)))
          ))}
        </div>
      )}

      {/* Parcel Management Modal */}
      {selectedFarmForParcels && (
        <ParcelManagementModal
          farmId={selectedFarmForParcels.id}
          farmName={selectedFarmForParcels.name}
          onClose={() => setSelectedFarmForParcels(null)}
        />
      )}

      {/* Farm Details Modal */}
      {selectedFarmForDetails && (
        <FarmDetailsModal
          farmId={selectedFarmForDetails}
          onClose={() => setSelectedFarmForDetails(null)}
          onManageParcels={() => {
            // Get farm name for parcels modal
            const farm = allFarms.find(f => f.farm_id === selectedFarmForDetails);
            if (farm) {
              setSelectedFarmForDetails(null);
              setSelectedFarmForParcels({ id: farm.farm_id, name: farm.farm_name });
            }
          }}
        />
      )}

      {/* Import Farm Dialog */}
      <FarmImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        organizationId={organizationId}
        onSuccess={handleImportSuccess}
      />

      {/* Edit Farm Manager Modal */}
      <EditFarmManagerModal
        open={!!selectedFarmForEditManager}
        onOpenChange={(open) => !open && setSelectedFarmForEditManager(null)}
        farmId={selectedFarmForEditManager?.id || ''}
        farmName={selectedFarmForEditManager?.name || ''}
        currentManagerName={selectedFarmForEditManager?.manager_name}
        currentManagerEmail={selectedFarmForEditManager?.manager_email}
        currentManagerPhone={selectedFarmForEditManager?.manager_phone}
      />

      {/* Delete Farm Confirmation Dialog */}
      <AlertDialog open={!!farmToDelete} onOpenChange={(open) => {
        if (!open) {
          setFarmToDelete(null);
          setRelatedDataCounts(null);
        }
      }}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white text-xl">
              {t('farmHierarchy.farm.deleteConfirm')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                {t('farmHierarchy.farm.deleteWarning')} <strong className="text-gray-900 dark:text-white font-semibold">{farmToDelete?.name}</strong> ?
              </p>

              {/* Loading state */}
              {loadingRelatedData && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">{t('farmHierarchy.farm.analyzing')}</span>
                </div>
              )}

              {/* Related data counts */}
              {!loadingRelatedData && relatedDataCounts && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                        {t('farmHierarchy.farm.relatedData')}
                      </h4>
                      <ul className="space-y-2 text-sm">
                        {relatedDataCounts.parcels > 0 && (
                          <li className="flex items-center gap-2 text-red-800 dark:text-red-300">
                            <span className="font-medium min-w-[30px]">{relatedDataCounts.parcels}</span>
                            <span>Parcelle{relatedDataCounts.parcels > 1 ? 's' : ''}</span>
                          </li>
                        )}
                        {relatedDataCounts.tasks > 0 && (
                          <li className="flex items-center gap-2 text-red-800 dark:text-red-300">
                            <span className="font-medium min-w-[30px]">{relatedDataCounts.tasks}</span>
                            <span>Tâche{relatedDataCounts.tasks > 1 ? 's' : ''}</span>
                          </li>
                        )}
                        {relatedDataCounts.satellite_data > 0 && (
                          <li className="flex items-center gap-2 text-red-800 dark:text-red-300">
                            <span className="font-medium min-w-[30px]">{relatedDataCounts.satellite_data}</span>
                            <span>Analyse{relatedDataCounts.satellite_data > 1 ? 's' : ''} satellite</span>
                          </li>
                        )}
                        {relatedDataCounts.warehouses > 0 && (
                          <li className="flex items-center gap-2 text-red-800 dark:text-red-300">
                            <span className="font-medium min-w-[30px]">{relatedDataCounts.warehouses}</span>
                            <span>Entrepôt{relatedDataCounts.warehouses > 1 ? 's' : ''}</span>
                          </li>
                        )}
                        {relatedDataCounts.inventory_items > 0 && (
                          <li className="flex items-center gap-2 text-red-800 dark:text-red-300">
                            <span className="font-medium min-w-[30px]">{relatedDataCounts.inventory_items}</span>
                            <span>Article{relatedDataCounts.inventory_items > 1 ? 's' : ''} d'inventaire</span>
                          </li>
                        )}
                        {relatedDataCounts.structures > 0 && (
                          <li className="flex items-center gap-2 text-red-800 dark:text-red-300">
                            <span className="font-medium min-w-[30px]">{relatedDataCounts.structures}</span>
                            <span>Infrastructure{relatedDataCounts.structures > 1 ? 's' : ''} (écuries, bassins, puits, salles techniques)</span>
                          </li>
                        )}
                        {relatedDataCounts.workers > 0 && (
                          <li className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                            <span className="font-medium min-w-[30px]">{relatedDataCounts.workers}</span>
                            <span>Travailleur{relatedDataCounts.workers > 1 ? 's' : ''} (seront dissociés de la ferme)</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <p className="text-red-900 dark:text-red-200 font-semibold text-sm mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                    ⚡ {t('farmHierarchy.farm.deleteIrreversible')}
                  </p>
                </div>
              )}

              {/* Error state */}
              {!loadingRelatedData && !relatedDataCounts && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                    ⚠️ {t('farmHierarchy.farm.deleteIrreversible')}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteFarmMutation.isPending}>
              {t('app.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => farmToDelete && deleteFarmMutation.mutate(farmToDelete.id)}
              disabled={deleteFarmMutation.isPending || loadingRelatedData}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {deleteFarmMutation.isPending ? t('farmHierarchy.farm.deleting') : t('farmHierarchy.farm.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Confirmation de suppression groupée
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Vous êtes sur le point de supprimer{' '}
                <span className="font-bold text-red-600 dark:text-red-400">
                  {selectedFarmIds.size} ferme{selectedFarmIds.size > 1 ? 's' : ''}
                </span>
                .
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-300 text-sm">
                  ⚠️ Cette action est irréversible. Toutes les données associées (parcelles, tâches, analyses satellite, etc.) seront également supprimées.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer {selectedFarmIds.size} ferme{selectedFarmIds.size > 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ModernFarmHierarchy;
