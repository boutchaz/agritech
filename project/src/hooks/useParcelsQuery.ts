import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Parcel {
  id: string;
  farm_id: string | null;
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
  // Fruit trees specific fields
  tree_type?: string | null;
  tree_count?: number | null;
  planting_year?: number | null;
  variety?: string | null;
  rootstock?: string | null;
  // New parcel fields
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

// Fetch farms for an organization
export const useFarms = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: farmsKeys.byOrganization(organizationId || ''),
    queryFn: async (): Promise<Farm[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('farms')
        .select('id, name, location, size, manager_name')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) {
        console.error('Error fetching farms:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

// Fetch parcels for a specific farm
export const useParcelsByFarm = (farmId: string | undefined) => {
  return useQuery({
    queryKey: parcelsKeys.byFarm(farmId || ''),
    queryFn: async (): Promise<Parcel[]> => {
      if (!farmId) return [];

      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .eq('farm_id', farmId)
        .order('name');

      if (error) {
        console.error('Error fetching parcels:', error);
        throw error;
      }

      return (data || []).map(parcel => ({
        ...parcel,
        boundary: parcel.boundary as number[][] | undefined,
      }));
    },
    enabled: !!farmId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
};

// Fetch parcels for multiple farms (organization-wide)
export const useParcelsByFarms = (farmIds: string[]) => {
  return useQuery({
    queryKey: parcelsKeys.byFarms(farmIds),
    queryFn: async (): Promise<Parcel[]> => {
      if (!farmIds.length) return [];

      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .in('farm_id', farmIds)
        .order('name');

      if (error) {
        console.error('Error fetching parcels:', error);
        throw error;
      }

      return (data || []).map(parcel => ({
        ...parcel,
        boundary: parcel.boundary as number[][] | undefined,
      }));
    },
    enabled: farmIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
};

// Add parcel mutation
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
      const { data, error } = await supabase
        .from('parcels')
        .insert([parcelData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: parcelsKeys.byFarm(data.farm_id) });
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
    },
  });
};

// Update parcel mutation
export const useUpdateParcel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Parcel> }) => {
      const { data, error } = await supabase
        .from('parcels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      if (data.farm_id) {
        queryClient.invalidateQueries({ queryKey: parcelsKeys.byFarm(data.farm_id) });
      }
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
    },
  });
};

// Delete parcel mutation
export const useDeleteParcel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parcelId: string) => {
      const { error } = await supabase
        .from('parcels')
        .delete()
        .eq('id', parcelId);

      if (error) throw error;
      return parcelId;
    },
    onSuccess: (_parcelId) => {
      // Invalidate all parcel queries since we don't know which farm it belonged to
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
    },
  });
};
