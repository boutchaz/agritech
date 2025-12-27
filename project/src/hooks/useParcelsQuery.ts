import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parcelsService } from '../services/parcelsService';
import { farmsService } from '../services/farmsService';

export interface Parcel {
  id: string;
  farm_id: string | null;
  organization_id?: string | null;
  name: string;
  description: string | null;
  area: number | null;
  area_unit: string | null;
  boundary?: number[][];
  calculated_area?: number | null;
  perimeter?: number | null;
  soil_type?: string | null;
  planting_density?: number | null;
  irrigation_type?: string | null;
  crop_type?: string | null;
  crop_category?: string | null;
  tree_type?: string | null;
  tree_count?: number | null;
  planting_year?: number | null;
  variety?: string | null;
  rootstock?: string | null;
  planting_date?: string | null;
  planting_type?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Farm {
  id: string;
  name: string;
  location: string | null;
  size: number | null;
  manager_name: string | null;
}

// Query keys
export const parcelsKeys = {
  all: ['parcels'] as const,
  byFarm: (farmId: string) => ['parcels', 'farm', farmId] as const,
  byOrganization: (organizationId: string) => ['parcels', 'organization', organizationId] as const,
  byFarms: (farmIds: string[]) => ['parcels', 'farms', farmIds.sort()] as const,
};

export const farmsKeys = {
  all: ['farms'] as const,
  byOrganization: (organizationId: string) => ['farms', 'organization', organizationId] as const,
};

// Fetch farms for an organization using farmsService (apiClient)
export const useFarms = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: farmsKeys.byOrganization(organizationId || ''),
    queryFn: async (): Promise<Farm[]> => {
      if (!organizationId) return [];
      const farms = await farmsService.listFarms(organizationId);
      // Map to match expected Farm interface (convert undefined to null)
      // Backend returns farm_id/farm_name in ListFarmsResponseDto
      return farms.map((farm: any) => ({
        id: farm.farm_id || farm.id,
        name: farm.farm_name || farm.name,
        location: farm.location ?? null,
        size: farm.farm_size ?? farm.size ?? null,
        manager_name: farm.manager_name ?? null,
      }));
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

// Fetch parcels for a specific farm using parcelsService (apiClient)
export const useParcelsByFarm = (farmId: string | undefined) => {
  return useQuery({
    queryKey: parcelsKeys.byFarm(farmId || ''),
    queryFn: async (): Promise<Parcel[]> => {
      if (!farmId) return [];
      const parcels = await parcelsService.listParcels(farmId);
      return parcels.map(parcel => ({
        ...parcel,
        farm_id: parcel.farm_id ?? null,
        description: parcel.description ?? null,
        area: parcel.area ?? null,
        area_unit: parcel.area_unit ?? null,
        boundary: (parcel as any).boundary as number[][] | undefined,
        calculated_area: (parcel as any).calculated_area ?? null,
        perimeter: (parcel as any).perimeter ?? null,
        soil_type: parcel.soil_type ?? null,
        planting_density: (parcel as any).planting_density ?? null,
        irrigation_type: parcel.irrigation_type ?? null,
        crop_type: (parcel as any).crop_type ?? null,
        crop_category: (parcel as any).crop_category ?? null,
        tree_type: (parcel as any).tree_type ?? null,
        tree_count: (parcel as any).tree_count ?? null,
        planting_year: parcel.planting_year ?? null,
        variety: parcel.variety ?? null,
        rootstock: parcel.rootstock ?? null,
        planting_date: parcel.planting_date ?? null,
        planting_type: (parcel as any).planting_type ?? null,
        created_at: parcel.created_at ?? null,
        updated_at: parcel.updated_at ?? null,
      }));
    },
    enabled: !!farmId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
};

// Fetch parcels for multiple farms (organization-wide) using parcelsService (apiClient)
export const useParcelsByFarms = (farmIds: string[]) => {
  return useQuery({
    queryKey: parcelsKeys.byFarms(farmIds),
    queryFn: async (): Promise<Parcel[]> => {
      if (!farmIds.length) return [];

      // Fetch all parcels for organization and filter by farm IDs
      const parcels = await parcelsService.listParcels();
      const filteredParcels = parcels.filter(p => farmIds.includes(p.farm_id));

      return filteredParcels.map(parcel => ({
        ...parcel,
        farm_id: parcel.farm_id ?? null,
        description: parcel.description ?? null,
        area: parcel.area ?? null,
        area_unit: parcel.area_unit ?? null,
        boundary: (parcel as any).boundary as number[][] | undefined,
        calculated_area: (parcel as any).calculated_area ?? null,
        perimeter: (parcel as any).perimeter ?? null,
        soil_type: parcel.soil_type ?? null,
        planting_density: (parcel as any).planting_density ?? null,
        irrigation_type: parcel.irrigation_type ?? null,
        crop_type: (parcel as any).crop_type ?? null,
        crop_category: (parcel as any).crop_category ?? null,
        tree_type: (parcel as any).tree_type ?? null,
        tree_count: (parcel as any).tree_count ?? null,
        planting_year: parcel.planting_year ?? null,
        variety: parcel.variety ?? null,
        rootstock: parcel.rootstock ?? null,
        planting_date: parcel.planting_date ?? null,
        planting_type: (parcel as any).planting_type ?? null,
        created_at: parcel.created_at ?? null,
        updated_at: parcel.updated_at ?? null,
      }));
    },
    enabled: farmIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
};

// Fetch a single parcel by ID using parcelsService (apiClient)
export const useParcelById = (parcelId: string | null | undefined) => {
  return useQuery({
    queryKey: ['parcel', parcelId],
    queryFn: async (): Promise<Parcel | null> => {
      if (!parcelId) return null;
      const parcel = await parcelsService.getParcelById(parcelId);
      if (!parcel) return null;
      return {
        ...parcel,
        farm_id: parcel.farm_id ?? null,
        description: parcel.description ?? null,
        area: parcel.area ?? null,
        area_unit: parcel.area_unit ?? null,
        boundary: (parcel as any).boundary as number[][] | undefined,
        calculated_area: (parcel as any).calculated_area ?? null,
        perimeter: (parcel as any).perimeter ?? null,
        soil_type: parcel.soil_type ?? null,
        planting_density: (parcel as any).planting_density ?? null,
        irrigation_type: parcel.irrigation_type ?? null,
        crop_type: (parcel as any).crop_type ?? null,
        crop_category: (parcel as any).crop_category ?? null,
        tree_type: (parcel as any).tree_type ?? null,
        tree_count: (parcel as any).tree_count ?? null,
        planting_year: parcel.planting_year ?? null,
        variety: parcel.variety ?? null,
        rootstock: parcel.rootstock ?? null,
        planting_date: parcel.planting_date ?? null,
        planting_type: (parcel as any).planting_type ?? null,
        created_at: parcel.created_at ?? null,
        updated_at: parcel.updated_at ?? null,
      };
    },
    enabled: !!parcelId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
};

// Add parcel mutation using parcelsService (apiClient)
export const useAddParcel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parcelData: {
      name: string;
      farm_id: string;
      boundary?: number[][];
      description?: string;
      area?: number;
      area_unit?: string;
      soil_type?: string;
      irrigation_type?: string;
      tree_type?: string;
      tree_count?: number;
      planting_year?: number;
      variety?: string;
      rootstock?: string;
      planting_date?: string;
      planting_type?: string;
    }) => {
      // Convert undefined to null where needed and ensure required fields
      const createData: {
        farm_id: string;
        name: string;
        description?: string;
        area: number;
        area_unit?: string;
        soil_type?: string;
        irrigation_type?: string;
        variety?: string;
        planting_date?: string;
        planting_year?: number;
        rootstock?: string;
        [key: string]: unknown;
      } = {
        farm_id: parcelData.farm_id,
        name: parcelData.name,
        area: parcelData.area ?? 0, // Required field, default to 0
      };

      if (parcelData.description !== undefined) createData.description = parcelData.description || undefined;
      if (parcelData.area_unit) createData.area_unit = parcelData.area_unit;
      if (parcelData.soil_type) createData.soil_type = parcelData.soil_type;
      if (parcelData.irrigation_type) createData.irrigation_type = parcelData.irrigation_type;
      if (parcelData.variety) createData.variety = parcelData.variety;
      if (parcelData.planting_date) createData.planting_date = parcelData.planting_date;
      if (parcelData.planting_year) createData.planting_year = parcelData.planting_year;
      if (parcelData.rootstock) createData.rootstock = parcelData.rootstock;

      // Handle boundary separately if needed (it might need special handling)
      if (parcelData.boundary) {
        (createData as any).boundary = parcelData.boundary;
      }

      return parcelsService.createParcel(createData);
    },
    onSuccess: (data) => {
      // Invalidate relevant queries - invalidate ALL parcel queries
      queryClient.invalidateQueries({ queryKey: parcelsKeys.all });
      queryClient.invalidateQueries({ queryKey: parcelsKeys.byFarm(data.farm_id) });
      // Also invalidate farms query in case it affects parcel counts
      queryClient.invalidateQueries({ queryKey: farmsKeys.all });
    },
  });
};

// Update parcel mutation using parcelsService (apiClient)
export const useUpdateParcel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Parcel> }) => {
      // Convert null to undefined for the service (which expects undefined for optional fields)
      const updateData: Record<string, unknown> = {};

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          updateData[key] = value;
        } else if (value === null) {
          // Explicitly set to undefined to remove the field
          updateData[key] = undefined;
        }
      });

      return parcelsService.updateParcel(id, updateData);
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: parcelsKeys.all });
      if (data.farm_id) {
        queryClient.invalidateQueries({ queryKey: parcelsKeys.byFarm(data.farm_id) });
      }
      queryClient.invalidateQueries({ queryKey: farmsKeys.all });
    },
  });
};

// Delete parcel mutation using parcelsService (apiClient)
export const useDeleteParcel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parcelId: string) => {
      await parcelsService.deleteParcel(parcelId);
      return parcelId;
    },
    onSuccess: (_parcelId) => {
      // Invalidate all parcel queries since we don't know which farm it belonged to
      queryClient.invalidateQueries({ queryKey: parcelsKeys.all });
      queryClient.invalidateQueries({ queryKey: farmsKeys.all });
    },
  });
};
