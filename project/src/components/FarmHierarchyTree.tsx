import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { farmsService } from '../services/farmsService';
import { parcelsApi } from '../lib/api/parcels';
import type { Database } from '../types/database.types';
import {
  Building2,
  GripVertical,
  Plus
} from 'lucide-react';
import { Can } from '../lib/casl';
import { SectionLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';

// Type aliases from generated database types
type Farm = Database['public']['Tables']['farms']['Row'];
type _FarmInsert = Database['public']['Tables']['farms']['Insert'];
// type ParcelRow = Database['public']['Tables']['parcels']['Row'];
// type Organization = Database['public']['Tables']['organizations']['Row'];

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
  parcels?: ParcelInfo[];
}

interface ParcelInfo {
  id: string;
  name: string;
  crop_type?: string;
  area: number;
  farm_id: string;
}

interface FarmHierarchyTreeProps {
  organizationId: string;
  onFarmSelect?: (farmId: string) => void;
  selectedFarmId?: string;
  onAddParcel?: (farmId: string) => void;
  onEditParcel?: (parcelId: string) => void;
  onDeleteParcel?: (parcelId: string) => void;
  onManageRoles?: (farmId: string) => void;
}

// Zod schema for farm creation
const createFarmSchema = z.object({
  name: z.string().min(2, 'Farm name must be at least 2 characters'),
});

type CreateFarmFormValues = z.infer<typeof createFarmSchema>;

const FarmHierarchyTree: React.FC<FarmHierarchyTreeProps> = ({
  organizationId,
  onAddParcel,
  onEditParcel,
  onDeleteParcel,
  onManageRoles
}) => {
  const queryClient = useQueryClient();

  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateFarmFormValues>({
    resolver: zodResolver(createFarmSchema),
    mode: 'onSubmit'
  });

  const { data: organizationName } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      const org = await farmsService.getOrganization(organizationId);
      return org.name;
    },
    enabled: !!organizationId
  });

  // Fetch farm hierarchy
  const {
    data: farms = [],
    isLoading: loading,
    error: queryError
  } = useQuery({
    queryKey: ['farm-hierarchy', organizationId],
    queryFn: async () => {
      const data = await farmsService.getFarmHierarchy(organizationId);

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

      const farmIds = Array.from(farmMap.keys());
      if (farmIds.length > 0) {
        const farmIdSet = new Set(farmIds);
        const allParcels = await parcelsApi.getAll({}, organizationId);
        const parcelsData = allParcels.filter(p => p.farm_id && farmIdSet.has(p.farm_id));

        if (parcelsData.length > 0) {
          const parcelsByFarm = parcelsData.reduce((acc: Record<string, ParcelInfo[]>, parcel) => {
            if (parcel.farm_id) {
              if (!acc[parcel.farm_id]) acc[parcel.farm_id] = [];
              acc[parcel.farm_id].push({
                id: parcel.id,
                name: parcel.name,
                crop_type: parcel.description || 'No description',
                area: parcel.area || 0,
                farm_id: parcel.farm_id
              });
            }
            return acc;
          }, {} as Record<string, ParcelInfo[]>);

          // Assign parcels to farms
          farmMap.forEach((farm) => {
            farm.parcels = parcelsByFarm[farm.farm_id] || [];
          });
        }
      }

      return rootFarms;
    },
    enabled: !!organizationId
  });

  // Create farm mutation with typed insert
  const createFarmMutation = useMutation({
    mutationFn: async (formData: CreateFarmFormValues): Promise<Farm> => {
      const farmData = {
        name: formData.name,
        organization_id: organizationId,
        status: 'active',
      };

      const newFarm = await farmsService.createFarm(organizationId, farmData);
      return newFarm;
    },
    onSuccess: () => {
      // Invalidate and refetch farm hierarchy
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy', organizationId] });
      reset();
    },
    onError: (error: any) => {
      console.error('Error creating farm:', error);
    }
  });

  const onSubmit = (data: CreateFarmFormValues) => {
    createFarmMutation.mutate(data);
  };

  const renderFarmNode = (farm: FarmNode, level: number = 0) => {
    const hasChildren = farm.children && farm.children.length > 0;
    const hasParcels = farm.parcels && farm.parcels.length > 0;

    return (
      <div key={farm.farm_id} className="mb-4">
        {/* Farm Card */}
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
          {/* Farm Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
              <h3 className="text-lg font-semibold text-gray-900">
                {farm.farm_name}
              </h3>
            </div>
            <Button
              onClick={() => onManageRoles?.(farm.farm_id)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Gérer Rôles
            </Button>
          </div>

          {/* Parcels */}
          {hasParcels && (
            <div className="space-y-2">
              {farm.parcels!.map((parcel) => (
                <div key={parcel.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    <div>
                      <h4 className="font-medium text-gray-900">{parcel.name}</h4>
                      <p className="text-sm text-gray-600">
                        {parcel.crop_type} • {parcel.area} ha
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Can I="update" a="Parcel">
                      <Button
                        onClick={() => onEditParcel?.(parcel.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Modifier
                      </Button>
                    </Can>
                    <Can I="delete" a="Parcel">
                      <Button
                        onClick={() => onDeleteParcel?.(parcel.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Supprimer
                      </Button>
                    </Can>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Parcel Button */}
          <div className="mt-3">
            <Can
              I="create"
              a="Parcel"
              fallback={
                <div className="text-sm text-gray-500 italic">
                  Upgrade your plan to add more parcels
                </div>
              }
            >
              <Button
                onClick={() => onAddParcel?.(farm.farm_id)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une parcelle</span>
              </Button>
            </Can>
          </div>
        </div>

        {/* Render Sub-farms */}
        {hasChildren && (
          <div className="ml-6 space-y-4">
            {farm.children!.map(childFarm => renderFarmNode(childFarm, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <SectionLoader />
    );
  }

  if (queryError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-red-600">{queryError instanceof Error ? queryError.message : 'Failed to load farm hierarchy'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      <div className="bg-gray-100 border-2 border-dashed border-gray-400 rounded-lg p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {organizationName || 'Organisation'}
        </h2>
        <p className="text-sm text-gray-600">Racine de l'organisation</p>
      </div>

      {/* Farms */}
      {farms.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No farms found. Create your first farm to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {farms.map(farm => renderFarmNode(farm))}
        </div>
      )}

      {/* Add New Farm Section */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Nom de la nouvelle ferme"
                {...register('name')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                aria-invalid={errors.name ? 'true' : 'false'}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={createFarmMutation.isPending}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createFarmMutation.isPending ? 'Création...' : 'Ajouter'}
            </Button>
            <Button
              type="button"
              onClick={() => reset()}
              className="px-6 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </Button>
          </div>
          {createFarmMutation.isError && (
            <p className="text-sm text-red-600" role="alert">
              {createFarmMutation.error instanceof Error
                ? createFarmMutation.error.message
                : 'Failed to create farm'}
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default FarmHierarchyTree;
