import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import FarmHierarchyHeader from './FarmHierarchyHeader';
import FarmCard from './FarmCard';
import ParcelManagementModal from './ParcelManagementModal';
import FarmDetailsModal from './FarmDetailsModal';
import { Building2, X } from 'lucide-react';
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

const farmSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
});

type FarmFormValues = z.infer<typeof farmSchema>;

const ModernFarmHierarchy: React.FC<ModernFarmHierarchyProps> = ({
  organizationId,
  onFarmSelect,
  onAddParcel,
  onManageFarm
}) => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFarmForParcels, setSelectedFarmForParcels] = useState<{ id: string; name: string } | null>(null);
  const [selectedFarmForDetails, setSelectedFarmForDetails] = useState<string | null>(null);
  const [farmToDelete, setFarmToDelete] = useState<{ id: string; name: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FarmFormValues>({
    resolver: zodResolver(farmSchema),
  });

  // Fetch organization
  const { data: organization } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Fetch farm hierarchy using RPC
  const { data: farms = [], isLoading } = useQuery({
    queryKey: ['farm-hierarchy', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_farm_hierarchy_tree', {
        org_uuid: organizationId
      });

      if (error) throw error;

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

      // Fetch parcels for each farm
      const farmIds = Array.from(farmMap.keys());
      if (farmIds.length > 0) {
        const { data: parcelsData, error: parcelsError } = await supabase
          .from('parcels')
          .select('id, name, farm_id, area')
          .in('farm_id', farmIds);

        if (!parcelsError && parcelsData) {
          // Group parcels by farm_id and calculate total area
          const parcelsByFarm = parcelsData.reduce((acc, parcel) => {
            if (!acc[parcel.farm_id]) acc[parcel.farm_id] = [];
            acc[parcel.farm_id].push({
              id: parcel.id,
              name: parcel.name,
              area: parcel.area || 0
            });
            return acc;
          }, {} as Record<string, any[]>);

          // Assign parcels to farms and calculate actual size from parcels
          farmMap.forEach((farm) => {
            const farmParcels = parcelsByFarm[farm.farm_id] || [];
            farm.parcels = farmParcels;

            // Calculate actual farm size from parcels
            const calculatedSize = farmParcels.reduce((sum, p) => sum + (p.area || 0), 0);

            // Use calculated size if we have parcels, otherwise use the farm's size field
            if (calculatedSize > 0) {
              farm.farm_size = calculatedSize;
            }
          });
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

  // Create farm mutation
  const createFarmMutation = useMutation({
    mutationFn: async (formData: FarmFormValues) => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: newFarm, error: farmError } = await supabase
        .from('farms')
        .insert({
          name: formData.name,
          organization_id: organizationId,
          status: 'active',
        })
        .select()
        .single();

      if (farmError) throw farmError;

      // Assign the current user as admin of the new farm
      const { error: roleError } = await supabase
        .from('farm_management_roles')
        .insert({
          farm_id: newFarm.id,
          user_id: user.id,
          role: 'admin',
          is_active: true
        });

      if (roleError) throw roleError;

      return newFarm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy', organizationId] });
      reset();
      setShowAddForm(false);
    },
    onError: (error: any) => {
      console.error('Error creating farm:', error);
      alert('Erreur lors de la création de la ferme');
    }
  });

  const onSubmit = (data: FarmFormValues) => {
    createFarmMutation.mutate(data);
  };

  // Delete farm mutation
  const deleteFarmMutation = useMutation({
    mutationFn: async (farmId: string) => {
      // Delete farm (cascade will handle related data via DB constraints)
      const { error } = await supabase
        .from('farms')
        .delete()
        .eq('id', farmId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy', organizationId] });
      setFarmToDelete(null);
    },
    onError: (error: any) => {
      console.error('Error deleting farm:', error);
      alert(`Erreur lors de la suppression de la ferme: ${error.message}`);
    }
  });

  // Filter farms based on search
  const filteredFarms = useMemo(() => {
    if (!searchTerm) return farms;

    const filterTree = (nodes: FarmNode[]): FarmNode[] => {
      return nodes.reduce((acc: FarmNode[], node) => {
        const matches = node.farm_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.manager_name?.toLowerCase().includes(searchTerm.toLowerCase());

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
  }, [farms, searchTerm]);

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

  // Render farm tree recursively
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
          onViewParcels={() => setSelectedFarmForParcels({ id: farm.farm_id, name: farm.farm_name })}
          onDelete={() => setFarmToDelete({ id: farm.farm_id, name: farm.farm_name })}
        />
        {farm.children && farm.children.length > 0 && (
          <div className="ml-8 space-y-3">
            {renderFarmTree(farm.children)}
          </div>
        )}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des fermes...</p>
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
      />

      {/* Add Farm Form Modal */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Créer une nouvelle ferme
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
                Nom de la ferme *
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Ex: Ferme principale"
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={createFarmMutation.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {createFarmMutation.isPending ? 'Création...' : 'Créer la ferme'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Farms Grid/List */}
      {filteredFarms.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchTerm ? 'Aucune ferme trouvée' : 'Aucune ferme'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm
              ? 'Aucune ferme ne correspond à votre recherche'
              : 'Commencez par créer votre première ferme'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              Créer une ferme
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'space-y-4' : 'space-y-3'}>
          {renderFarmTree(filteredFarms)}
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

      {/* Delete Farm Confirmation Dialog */}
      <AlertDialog open={!!farmToDelete} onOpenChange={(open) => !open && setFarmToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la ferme <strong className="text-gray-900 dark:text-white">{farmToDelete?.name}</strong> ?
              <br /><br />
              <span className="text-red-600 dark:text-red-400">
                ⚠️ Cette action supprimera également toutes les parcelles, analyses, tâches et autres données associées à cette ferme. Cette action est irréversible.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => farmToDelete && deleteFarmMutation.mutate(farmToDelete.id)}
              disabled={deleteFarmMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteFarmMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ModernFarmHierarchy;
