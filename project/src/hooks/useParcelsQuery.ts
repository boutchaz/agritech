import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parcelsService, type Parcel as ServiceParcel } from '../services/parcelsService';
import { farmsService, type Farm as ServiceFarm } from '../services/farmsService';
import { withOfflineQueue } from '../lib/offline/withOfflineQueue';
import { useOrganizationStore } from '../stores/organizationStore';

export interface Parcel extends Omit<ServiceParcel, 'area' | 'area_unit' | 'description'> {
  area: number | null;
  area_unit: string | null;
  description: string | null;
  planting_density?: number | null;
  planting_type?: string | null;
  tree_type?: string | null;
  tree_count?: number | null;
  irrigation_frequency?: string | null;
  water_source?: string | null;
  water_quantity_per_session?: number | null;
  ai_phase?: string | null;
  ai_enabled?: boolean | null;
  ai_observation_only?: boolean | null;
  ai_nutrition_option?: string | null;
}

type FarmWithTotalArea = Pick<ServiceFarm, 'id' | 'name'> & {
  location: string | null;
  size: number | null;
  manager_name: string | null;
  total_area: number | null;
};

function normalizeParcel(parcel: ServiceParcel): Parcel {
  const extendedParcel = parcel as Parcel;

  return {
    ...extendedParcel,
    description: parcel.description ?? null,
    area: parcel.area ?? null,
    area_unit: parcel.area_unit ?? null,
    boundary: parcel.boundary,
    calculated_area: parcel.calculated_area,
    perimeter: parcel.perimeter,
    soil_type: parcel.soil_type,
    planting_density: extendedParcel.planting_density ?? null,
    irrigation_type: parcel.irrigation_type,
    crop_type: parcel.crop_type,
    crop_category: parcel.crop_category,
    tree_type: extendedParcel.tree_type ?? null,
    tree_count: extendedParcel.tree_count ?? null,
    planting_year: parcel.planting_year,
    variety: parcel.variety,
    rootstock: parcel.rootstock,
    planting_date: parcel.planting_date,
    planting_type: extendedParcel.planting_type ?? null,
    planting_system: parcel.planting_system,
    irrigation_frequency: extendedParcel.irrigation_frequency ?? null,
    water_source: extendedParcel.water_source ?? null,
    water_quantity_per_session: extendedParcel.water_quantity_per_session ?? null,
    ai_phase: extendedParcel.ai_phase ?? null,
    ai_enabled: extendedParcel.ai_enabled ?? null,
    ai_observation_only: extendedParcel.ai_observation_only ?? null,
    ai_nutrition_option: extendedParcel.ai_nutrition_option ?? null,
  };
}

// Query keys
export const parcelsKeys = {
  all: ['parcels'] as const,
  byFarm: (farmId: string, includeArchived?: boolean) => ['parcels', farmId, { includeArchived }] as const,
  byOrganization: (organizationId: string, includeArchived?: boolean) => ['parcels', 'organization', organizationId, { includeArchived }] as const,
  byFarms: (farmIds: string[]) => ['parcels', 'farms', [...farmIds].sort().join(',')] as const,
  byId: (parcelId: string) => ['parcels', parcelId] as const,
  applications: (parcelId: string) => ['parcels', parcelId, 'applications'] as const,
};

export const farmsKeys = {
  all: ['farms'] as const,
  byOrganization: (organizationId: string) => ['farms', 'organization', organizationId] as const,
};

// Fetch farms for an organization using farmsService (apiClient)
// Also computes total_area from parcels (sum of parcel areas) for each farm
export const useFarms = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: farmsKeys.byOrganization(organizationId || ''),
    queryFn: async (): Promise<FarmWithTotalArea[]> => {
      if (!organizationId) return [];
      const farms = await farmsService.listFarms(organizationId);

      // Fetch parcels to compute total area per farm
      let parcelAreaByFarm: Record<string, number> = {};
      try {
        const parcels = await parcelsService.listParcels(undefined, organizationId);
        parcelAreaByFarm = parcels.reduce((acc: Record<string, number>, parcel: ServiceParcel) => {
          const fid = parcel.farm_id;
          if (!fid) return acc;
          acc[fid] = (acc[fid] || 0) + (parcel.area || 0);
          return acc;
        }, {});
      } catch {
        // If parcels fetch fails, fall back to stored farm size
      }

      return farms.map((farm: ServiceFarm) => {
        const storedSize = farm.size ?? null;
        const calculatedArea = parcelAreaByFarm[farm.id];
        return {
          id: farm.id,
          name: farm.name,
          location: farm.location ?? null,
          size: storedSize,
          manager_name: farm.manager_name ?? null,
          total_area: calculatedArea !== undefined ? parseFloat(calculatedArea.toFixed(2)) : storedSize,
        };
      });
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

// Fetch parcels for a specific farm using parcelsService (apiClient)
export const useParcelsByFarm = (farmId: string | undefined, organizationId?: string | null, includeArchived?: boolean) => {
  return useQuery({
    queryKey: parcelsKeys.byFarm(farmId || '', includeArchived),
    queryFn: async (): Promise<Parcel[]> => {
      if (!farmId) return [];
      const parcels = await parcelsService.listParcels(farmId, organizationId, includeArchived);
      return parcels.map(normalizeParcel);
    },
    enabled: !!farmId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
};

// Fetch parcels for multiple farms (organization-wide) using parcelsService (apiClient)
export const useParcelsByFarms = (farmIds: string[], organizationId?: string | null) => {
  return useQuery({
    queryKey: parcelsKeys.byFarms(farmIds),
    queryFn: async (): Promise<Parcel[]> => {
      if (!farmIds.length) return [];

      // Fetch all parcels for organization and filter by farm IDs
      const parcels = await parcelsService.listParcels(undefined, organizationId);
      const filteredParcels = parcels.filter(p => farmIds.includes(p.farm_id));

      return filteredParcels.map(normalizeParcel);
    },
    enabled: farmIds.length > 0 && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
};

export const useParcelsByOrganization = (organizationId?: string | null, includeArchived?: boolean) => {
  return useQuery({
    queryKey: parcelsKeys.byOrganization(organizationId || '', includeArchived),
    queryFn: async (): Promise<Parcel[]> => {
      if (!organizationId) return [];
      const parcels = await parcelsService.listParcels(undefined, organizationId, includeArchived);
      return parcels.map(normalizeParcel);
    },
    enabled: !!organizationId,
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
      return normalizeParcel(parcel);
    },
    enabled: !!parcelId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
};

// Fetch applications for a specific parcel
export const useParcelApplications = (parcelId: string | null | undefined) => {
  return useQuery({
    queryKey: parcelsKeys.applications(parcelId || ''),
    queryFn: async () => {
      if (!parcelId) return null;
      return parcelsService.getParcelApplications(parcelId);
    },
    enabled: !!parcelId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
};

// Add parcel mutation using parcelsService (apiClient)
export const useAddParcel = () => {
  const queryClient = useQueryClient();
  const orgId = useOrganizationStore((s) => s.currentOrganization?.id ?? null);

  return useMutation({
    mutationFn: withOfflineQueue<
      {
        name: string;
        farm_id: string;
        boundary?: number[][];
        description?: string;
        area?: number;
        area_unit?: string;
        soil_type?: string;
        irrigation_type?: string;
        crop_category?: string;
        crop_type?: string;
        tree_type?: string;
        tree_count?: number;
        planting_year?: number;
        variety?: string;
        rootstock?: string;
        planting_date?: string;
        planting_type?: string;
        planting_system?: string;
        spacing?: string;
        density_per_hectare?: number;
        plant_count?: number;
        calculated_area?: number;
        perimeter?: number;
      },
      ServiceParcel
    >(
      {
        organizationId: orgId,
        resource: 'parcel',
        method: 'POST',
        url: '/api/v1/parcels',
        buildPayload: (input, clientId) => ({ ...input, client_id: clientId }),
        buildOptimisticStub: (input, clientId) =>
          ({ id: clientId, _pending: true, ...input } as unknown as ServiceParcel),
      },
      async (parcelData) => {
        const createData: Record<string, unknown> = {
          farm_id: parcelData.farm_id,
          name: parcelData.name,
          area: parcelData.area ?? 0,
        };

        if (parcelData.description) createData.description = parcelData.description;
        if (parcelData.area_unit) createData.area_unit = parcelData.area_unit;
        if (parcelData.soil_type) createData.soil_type = parcelData.soil_type;
        if (parcelData.irrigation_type) createData.irrigation_type = parcelData.irrigation_type;
        if (parcelData.crop_category) createData.crop_category = parcelData.crop_category;
        if (parcelData.crop_type) createData.crop_type = parcelData.crop_type;
        if (parcelData.variety) createData.variety = parcelData.variety;
        if (parcelData.planting_date) createData.planting_date = parcelData.planting_date;
        if (parcelData.planting_year) createData.planting_year = parcelData.planting_year;
        if (parcelData.rootstock) createData.rootstock = parcelData.rootstock;
        if (parcelData.planting_system) createData.planting_system = parcelData.planting_system;
        if (parcelData.planting_type) createData.planting_type = parcelData.planting_type;
        if (parcelData.spacing) createData.spacing = parcelData.spacing;
        if (parcelData.density_per_hectare) createData.density_per_hectare = parcelData.density_per_hectare;
        if (parcelData.plant_count) createData.plant_count = parcelData.plant_count;
        if (parcelData.boundary) createData.boundary = parcelData.boundary;
        if (parcelData.calculated_area) createData.calculated_area = parcelData.calculated_area;
        if (parcelData.perimeter) createData.perimeter = parcelData.perimeter;

        return parcelsService.createParcel(createData as Parameters<typeof parcelsService.createParcel>[0]);
      },
    ),
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

// Archive parcel mutation (soft delete)
export const useArchiveParcel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parcelId: string) => {
      await parcelsService.archiveParcel(parcelId);
      return parcelId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parcelsKeys.all });
      queryClient.invalidateQueries({ queryKey: farmsKeys.all });
    },
  });
};

// Restore archived parcel mutation
export const useRestoreParcel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parcelId: string) => {
      await parcelsService.restoreParcel(parcelId);
      return parcelId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parcelsKeys.all });
      queryClient.invalidateQueries({ queryKey: farmsKeys.all });
    },
  });
};

/** @deprecated Use useArchiveParcel instead */
export const useDeleteParcel = useArchiveParcel;
