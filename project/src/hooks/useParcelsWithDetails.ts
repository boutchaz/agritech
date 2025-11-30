import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/MultiTenantAuthProvider';

export interface ParcelWithDetails {
  id: string;
  name: string;
  farm_id: string;
  crop_id?: string | null;
  soil_type?: string | null;
  area?: number | null;
  irrigation_type?: string | null;
  created_at?: string;
  updated_at?: string;

  // Relations
  farm?: {
    id: string;
    name: string;
  };
  crop?: {
    id: string;
    name: string;
    variety?: string | null;
  };
}

/**
 * Fetch all parcels for the current organization with farm and crop details (optimized)
 */
export function useParcelsWithDetails() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['parcels-with-details', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        console.warn('No organization ID available');
        return [];
      }

      try {
        console.warn('Fetching parcels for organization:', currentOrganization.id);

        // Step 1: Get all farms for this organization
        const { data: farms, error: farmsError } = await supabase
          .from('farms')
          .select('id, name')
          .eq('organization_id', currentOrganization.id);

        if (farmsError) {
          console.error('Error fetching farms:', farmsError);
          return [];
        }

        console.warn('Found farms:', farms?.length || 0);

        if (!farms || farms.length === 0) {
          console.warn('No farms found for this organization');
          return [];
        }

        const farmIds = farms.map(f => f.id);
        console.warn('Farm IDs:', farmIds);

        // Step 2: Get all parcels for these farms
        const { parcelsApi } = await import('@/lib/api/parcels');

        // Fetch parcels for each farm and combine
        const parcelPromises = farmIds.map(farmId =>
          parcelsApi.getAll({ farm_id: farmId, organization_id: currentOrganization.id }, currentOrganization.id)
        );

        const parcelResults = await Promise.all(parcelPromises);
        const parcels = parcelResults.flat().sort((a, b) => a.name.localeCompare(b.name));

        console.warn('Found parcels:', parcels?.length || 0);

        if (!parcels || parcels.length === 0) {
          console.warn('No parcels found for these farms');
          return [];
        }

        // Step 3: Get crop details if needed
        const cropIds = parcels
          .map(p => p.crop_id)
          .filter(Boolean) as string[];

        let cropsMap = new Map();
        if (cropIds.length > 0) {
          const { data: crops } = await supabase
            .from('crops')
            .select('id, name')
            .in('id', cropIds);

          if (crops) {
            cropsMap = new Map(crops.map(c => [c.id, c]));
          }
        }

        // Create farms map for easy lookup
        const farmsMap = new Map(farms.map(f => [f.id, f]));

        // Step 4: Combine the data
        const result: ParcelWithDetails[] = parcels.map(parcel => ({
          id: parcel.id,
          name: parcel.name,
          farm_id: parcel.farm_id,
          crop_id: parcel.crop_id,
          farm: farmsMap.get(parcel.farm_id) || undefined,
          crop: parcel.crop_id ? cropsMap.get(parcel.crop_id) : undefined,
        }));

        console.warn('Returning parcels with details:', result.length);
        return result;
      } catch (err) {
        console.error('useParcelsWithDetails error:', err);
        return [];
      }
    },
    enabled: !!currentOrganization?.id,
    staleTime: 300000, // 5 minutes - parcels don't change often
  });
}

/**
 * Fetch parcels for a specific farm with details
 */
export function useFarmParcelsWithDetails(farmId: string | undefined) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['parcels-with-details', 'farm', farmId],
    queryFn: async () => {
      if (!farmId) throw new Error('Farm ID is required');
      if (!currentOrganization?.id) throw new Error('No organization selected');

      const { parcelsApi } = await import('@/lib/api/parcels');

      // Get parcels from API (without joins for now)
      const parcels = await parcelsApi.getAll(
        { farm_id: farmId, organization_id: currentOrganization.id },
        currentOrganization.id
      );

      // For now, we'll fetch farm and crop details separately
      // TODO: Enhance backend to return joined data
      const { data: farms } = await supabase
        .from('farms')
        .select('id, name')
        .eq('id', farmId)
        .single();

      const cropIds = parcels
        .map(p => p.crop_id)
        .filter(Boolean) as string[];

      let cropsMap = new Map();
      if (cropIds.length > 0) {
        const { data: crops } = await supabase
          .from('crops')
          .select('id, name, variety')
          .in('id', cropIds);

        if (crops) {
          cropsMap = new Map(crops.map(c => [c.id, c]));
        }
      }

      // Combine data
      return parcels.map(parcel => ({
        ...parcel,
        farm: farms || undefined,
        crop: parcel.crop_id ? cropsMap.get(parcel.crop_id) : undefined,
      })) as ParcelWithDetails[];
    },
    enabled: !!farmId && !!currentOrganization?.id,
    staleTime: 60000,
  });
}
