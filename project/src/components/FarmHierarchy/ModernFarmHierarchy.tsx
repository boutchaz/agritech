import {  useState, useMemo, useRef, useEffect  } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { farmsService } from '../../services/farmsService';
import { farmHierarchyApi } from '@/lib/api/farm-hierarchy';
import { runOrQueue as runOrQueueOffline } from '@/lib/offline/runOrQueue';
import { parcelsService } from '../../services/parcelsService';
import FarmHierarchyHeader from './FarmHierarchyHeader';
import FarmCard from './FarmCard';
import FarmListItem from './FarmListItem';
import ParcelManagementModal from './ParcelManagementModal';
import FarmDetailsModal from './FarmDetailsModal';
import FarmImportDialog from './FarmImportDialog';
import EditFarmManagerModal from './EditFarmManagerModal';
import { X, Trash2, Building2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DataTablePagination,
  FilterBar,
  type FilterSelect,
  type StatusFilterOption,
} from '@/components/ui/data-table';
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
import { Button } from '@/components/ui/button';
import { SectionLoader, ButtonLoader } from '@/components/ui/loader';

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
  onViewHeatmap?: (farmId: string) => void;
}

const flattenFarmNodes = (nodes: FarmNode[]): FarmNode[] => {
  return nodes.reduce((acc: FarmNode[], node) => {
    acc.push(node);
    if (node.children && node.children.length > 0) {
      acc.push(...flattenFarmNodes(node.children));
    }
    return acc;
  }, []);
};

// Schema will be defined inside the component to access t function
const getFarmSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(2, t('farmHierarchy.farm.validation.nameRequired')),
});

type FarmFormValues = {
  name: string;
};

const ModernFarmHierarchy = ({
  organizationId,
  onFarmSelect: _onFarmSelect,
  onAddParcel: _onAddParcel,
  onManageFarm,
  onViewHeatmap
}: ModernFarmHierarchyProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFarmForParcels, setSelectedFarmForParcels] = useState<{ id: string; name: string } | null>(null);
  const [selectedFarmForDetails, setSelectedFarmForDetails] = useState<string | null>(null);
  const [farmToDelete, setFarmToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFarmIds, setSelectedFarmIds] = useState<Set<string>>(new Set());
  const [farmTypeFilter, setFarmTypeFilter] = useState<'all' | 'main' | 'sub'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
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

  const addFormRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (showAddForm) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showAddForm]);

  // Fetch organization using farmsService (apiClient)
  const { data: organization } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => farmsService.getOrganization(organizationId),
    enabled: !!organizationId
  });

  const { data: farms = [], isLoading } = useQuery({
    queryKey: ['farm-hierarchy', organizationId],
    queryFn: async () => {
      // Use shared mapper: handles paginated `{ data }`, raw arrays, and `id` vs `farm_id`.
      const flatFarms = await farmHierarchyApi.getOrganizationFarms(organizationId);

      const farmMap = new Map<string, FarmNode>();
      const rootFarms: FarmNode[] = [];

      flatFarms.forEach((farm) => {
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

      flatFarms.forEach((farm) => {
        const node = farmMap.get(farm.farm_id);
        if (!node) return;

        if (farm.parent_farm_id) {
          const parent = farmMap.get(farm.parent_farm_id);
          if (parent) {
            if (!parent.children) parent.children = [];
            parent.children.push(node);
          }
        } else {
          rootFarms.push(node);
        }
      });

      // Fetch parcels for each farm using parcelsService (apiClient)
      const farmIds = Array.from(farmMap.keys());

      if (farmIds.length > 0) {
        try {
          // Fetch parcels for all farms in the organization (no farm_id filter to get all)
          const parcelsData = await parcelsService.listParcels();

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

  // Create farm mutation — routed through the offline outbox so the call
  // doesn't hang on the network in the field.
  const createFarmMutation = useMutation({
    mutationFn: async (formData: FarmFormValues) => {
      if (!organizationId) {
        throw new Error('No organization selected');
      }
      const cid = uuidv4();
      const payload = {
        name: formData.name,
        is_active: true,
        status: 'active',
        client_id: cid,
      };
      const outcome = await runOrQueueOffline(
        {
          organizationId,
          resource: 'farm',
          method: 'POST',
          url: '/api/v1/farms',
          payload,
          clientId: cid,
        },
        () =>
          farmsService.createFarm({
            name: formData.name,
            is_active: true,
            status: 'active',
          }),
      );
      if (outcome.status === 'queued') {
        return { id: cid, _pending: true, name: formData.name } as never;
      }
      return outcome.result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['farms'] });
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
        toast.success(t('farmHierarchy.farm.exportSuccess', 'Export successful!'));
      } else {
        throw new Error(result?.error || t('farmHierarchy.farm.exportError', 'Export failed'));
      }
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : t('farmHierarchy.farm.exportError', 'Export failed');
      toast.error(`${t('farmHierarchy.farm.exportError', 'Export failed')}: ${errorMessage}`);
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
        toast.success(t('farmHierarchy.farm.exportSuccess', 'Export successful!'));
      } else {
        throw new Error(result?.error || t('farmHierarchy.farm.exportError', 'Export failed'));
      }
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : t('farmHierarchy.farm.exportError', 'Export failed');
      toast.error(`${t('farmHierarchy.farm.exportError', 'Export failed')}: ${errorMessage}`);
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
        throw new Error(t('farmHierarchy.farm.deleteError', 'Deletion failed'));
      }

      return { farmId, farmName: farmToDelete?.name };
    },
    onSuccess: (result) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['farms'] });

      // Success feedback with captured farm name
      toast.success(t('farmHierarchy.farm.deleteSuccess', { name: result?.farmName, defaultValue: `Farm "${result?.farmName}" and all associated data deleted successfully.` }));

      // Close dialog and reset state
      setFarmToDelete(null);
      setRelatedDataCounts(null);
      deleteFarmMutation.reset();
    },
    onError: (error: Error) => {
      let errorMessage = t('farmHierarchy.farm.deleteError', 'Error deleting farm');

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
        const typeMatch = farmTypeFilter === 'all' || node.farm_type === farmTypeFilter;

        // Apply status filter
        const statusMatch = statusFilter === 'all' ||
          (statusFilter === 'active' && node.is_active) ||
          (statusFilter === 'inactive' && !node.is_active);

        const matches = searchMatch && typeMatch && statusMatch;

        if (matches) {
          const filteredChildren = node.children && node.children.length > 0
            ? filterTree(node.children)
            : undefined;
          acc.push({ ...node, children: filteredChildren });
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
  }, [farms, searchTerm, farmTypeFilter, statusFilter]);

  // Calculate totals from flat list
  const allFarms = useMemo(() => {
    return flattenFarmNodes(farms);
  }, [farms]);

  // Flatten filtered tree for pagination — ensures pagination shows even with few root farms
  const allFilteredFarms = useMemo(() => flattenFarmNodes(filteredFarms), [filteredFarms]);
  const totalFilteredFarms = allFilteredFarms.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredFarms / pageSize));

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const visibleFarms = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return allFilteredFarms.slice(startIndex, startIndex + pageSize);
  }, [allFilteredFarms, page, pageSize]);

  // For grid view: build a pruned tree where only visible-page descendants are shown
  const paginatedRootFarms = useMemo(() => {
    const visibleIds = new Set(visibleFarms.map(f => f.farm_id));

    const pruneTree = (node: FarmNode): FarmNode | null => {
      const isSelfVisible = visibleIds.has(node.farm_id);
      const prunedChildren = (node.children || [])
        .map(child => pruneTree(child))
        .filter((c): c is FarmNode => c !== null);

      if (isSelfVisible) {
        return { ...node, children: prunedChildren };
      }
      if (prunedChildren.length > 0) {
        return { ...node, children: prunedChildren };
      }
      return null;
    };

    return filteredFarms
      .map(root => pruneTree(root))
      .filter((r): r is FarmNode => r !== null);
  }, [filteredFarms, visibleFarms]);

  const filterOptions = useMemo<FilterSelect[]>(() => ([
    {
      key: 'farm-type',
      value: farmTypeFilter,
      onChange: (value) => {
        setFarmTypeFilter(value as 'all' | 'main' | 'sub');
        setPage(1);
      },
      className: 'w-full sm:w-48',
      options: [
        { value: 'all', label: t('farmHierarchy.farm.filterAllTypes', 'All types') },
        { value: 'main', label: t('farmHierarchy.farm.filterMainFarms', 'Main farms') },
        { value: 'sub', label: t('farmHierarchy.farm.filterSubFarms', 'Sub-farms') },
      ],
    },
  ]), [farmTypeFilter, t]);

  const statusFilterOptions = useMemo<StatusFilterOption[]>(() => ([
    { value: 'active', label: t('farmHierarchy.farm.active') },
    { value: 'inactive', label: t('farmHierarchy.farm.inactive') },
  ]), [t]);

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
    setSelectedFarmIds(new Set(visibleFarms.map(f => f.farm_id)));
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
        const failedText = result.failed > 0 ? ` ${result.failed} ${t('common.failed', 'failed')}` : '';
        toast.success(
          t('farmHierarchy.farm.batchDeleteSuccess', { deleted: result.deleted, failed: failedText })
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
      toast.error(error instanceof Error ? error.message : t('farmHierarchy.farm.deleteError', 'Error deleting farm'));
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
          onViewHeatmap={onViewHeatmap ? () => onViewHeatmap(farm.farm_id) : undefined}
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
        onViewHeatmap={onViewHeatmap ? () => onViewHeatmap(farm.farm_id) : undefined}
        onDelete={() => handleDeleteFarmClick({ id: farm.farm_id, name: farm.farm_name })}
      />
    ));
  };

  if (isLoading) {
    return (
      <SectionLoader />
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
        onExportAll={handleExportAll}
        onImport={() => setShowImportDialog(true)}
        onExportFarm={handleExportFarm}
      />

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={(value) => {
            setSearchTerm(value);
            setPage(1);
          }}
          searchPlaceholder={t('farmHierarchy.farm.searchPlaceholder')}
          filters={filterOptions}
          statusFilters={statusFilterOptions}
          activeStatus={statusFilter}
          onStatusChange={(status) => {
            setStatusFilter(status as 'all' | 'active' | 'inactive');
            setPage(1);
          }}
          onClear={() => {
            setFarmTypeFilter('all');
            setPage(1);
          }}
        />

      </div>

      {/* Add Farm Form Modal */}
      {showAddForm && (
        <div ref={addFormRef} data-testid="create-farm-form" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('farmHierarchy.farm.createNew')}
            </h3>
            <Button
              onClick={() => setShowAddForm(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="farm-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('farmHierarchy.farm.name')} *
              </label>
              <input
                {...register('name')}
                id="farm-name"
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
              <Button variant="green" type="submit" data-testid="farm-submit-button" disabled={createFarmMutation.isPending} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors" >
                {createFarmMutation.isPending ? t('farmHierarchy.farm.creating') : t('farmHierarchy.farm.create')}
              </Button>
              <Button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {t('app.cancel')}
              </Button>
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
                {selectedFarmIds.size}{' '}
                {selectedFarmIds.size === 1
                  ? t('farmHierarchy.farm.selectedSingle', 'selected farm')
                  : t('farmHierarchy.farm.selectedMultiple', 'selected farms')}
              </span>
              <Button
                onClick={clearSelection}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {t('farmHierarchy.farm.clearSelection', 'Clear selection')}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={selectAllFarms}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('farmHierarchy.farm.selectAll', 'Select all')}
              </Button>
              <Button variant="red" onClick={handleBatchDeleteClick} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors" >
                <Trash2 className="w-4 h-4" />
                {t('farmHierarchy.farm.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Farms Grid/List — data-tour on wrapper so guided tour works with 0 farms (empty state) */}
      <div data-testid="farms-list" data-tour="farm-list" className="space-y-3">
        {filteredFarms.length === 0 ? (
          <EmptyState
            data-testid="farms-empty-state"
            variant="card"
            icon={Building2}
            title={searchTerm ? t('farmHierarchy.farm.noFarmsFound') : t('farmHierarchy.farm.noFarms')}
            description={
              searchTerm
                ? t('farmHierarchy.farm.noSearchResults')
                : t('farmHierarchy.farm.noFarmsMessage')
            }
            action={
              !searchTerm
                ? {
                    label: t('farmHierarchy.farm.create'),
                    onClick: () => setShowAddForm(true),
                  }
                : undefined
            }
          />
        ) : (
          viewMode === 'grid' ? renderFarmTree(paginatedRootFarms) : renderFarmList(visibleFarms)
        )}
      </div>

      {totalFilteredFarms > pageSize && (
        <DataTablePagination
          totalItems={totalFilteredFarms}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          pageSizeOptions={[12, 24, 48]}
        />
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
                  <ButtonLoader className="h-8 w-8" />
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
                            <span>{t('farmHierarchy.farm.relatedParcels', { count: relatedDataCounts.parcels, defaultValue: `${relatedDataCounts.parcels} parcel(s)` })}</span>
                          </li>
                        )}
                        {relatedDataCounts.tasks > 0 && (
                          <li className="flex items-center gap-2 text-red-800 dark:text-red-300">
                            <span className="font-medium min-w-[30px]">{relatedDataCounts.tasks}</span>
                            <span>{t('farmHierarchy.farm.relatedTasks', { count: relatedDataCounts.tasks, defaultValue: `${relatedDataCounts.tasks} task(s)` })}</span>
                          </li>
                        )}
                        {relatedDataCounts.satellite_data > 0 && (
                          <li className="flex items-center gap-2 text-red-800 dark:text-red-300">
                            <span className="font-medium min-w-[30px]">{relatedDataCounts.satellite_data}</span>
                            <span>{t('farmHierarchy.farm.relatedSatellite', { count: relatedDataCounts.satellite_data, defaultValue: `${relatedDataCounts.satellite_data} satellite analysis` })}</span>
                          </li>
                        )}
                        {relatedDataCounts.warehouses > 0 && (
                          <li className="flex items-center gap-2 text-red-800 dark:text-red-300">
                            <span className="font-medium min-w-[30px]">{relatedDataCounts.warehouses}</span>
                            <span>{t('farmHierarchy.farm.relatedWarehouses', { count: relatedDataCounts.warehouses, defaultValue: `${relatedDataCounts.warehouses} warehouse(s)` })}</span>
                          </li>
                        )}
                        {relatedDataCounts.inventory_items > 0 && (
                          <li className="flex items-center gap-2 text-red-800 dark:text-red-300">
                            <span className="font-medium min-w-[30px]">{relatedDataCounts.inventory_items}</span>
                            <span>{t('farmHierarchy.farm.relatedInventory', { count: relatedDataCounts.inventory_items, defaultValue: `${relatedDataCounts.inventory_items} inventory item(s)` })}</span>
                          </li>
                        )}
                        {relatedDataCounts.structures > 0 && (
                          <li className="flex items-center gap-2 text-red-800 dark:text-red-300">
                            <span className="font-medium min-w-[30px]">{relatedDataCounts.structures}</span>
                            <span>{t('farmHierarchy.farm.relatedStructures', { count: relatedDataCounts.structures, defaultValue: `${relatedDataCounts.structures} structure(s)` })}</span>
                          </li>
                        )}
                        {relatedDataCounts.workers > 0 && (
                          <li className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                            <span className="font-medium min-w-[30px]">{relatedDataCounts.workers}</span>
                            <span>{t('farmHierarchy.farm.relatedWorkers', { count: relatedDataCounts.workers, defaultValue: `${relatedDataCounts.workers} worker(s) (will be dissociated)` })}</span>
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
              {t('farmHierarchy.farm.batchDeleteConfirmTitle', 'Confirm bulk deletion')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                {t('farmHierarchy.farm.batchDeleteConfirmDescription', 'You are about to delete')}{' '}
                <span className="font-bold text-red-600 dark:text-red-400">
                  {selectedFarmIds.size} {selectedFarmIds.size > 1
                    ? t('farmHierarchy.farm.selectedMultiple', 'selected farms')
                    : t('farmHierarchy.farm.selectedSingle', 'selected farm')}
                </span>
                .
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-300 text-sm">
                  ⚠️ {t('farmHierarchy.farm.batchDeleteIrreversible', 'This action is irreversible. All associated data will also be deleted.')}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('app.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('farmHierarchy.farm.batchDeleteAction', {
                count: selectedFarmIds.size,
                defaultValue: 'Delete {{count}} farm(s)',
              })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ModernFarmHierarchy;
