import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { authSupabase } from '@/lib/auth-supabase';

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
        console.log('No organization ID available');
        return [];
      }

      try {
        console.log('Fetching parcels for organization:', currentOrganization.id);

        // Step 1: Get all farms for this organization
        const { data: farms, error: farmsError } = await supabase
          .from('farms')
          .select('id, name')
          .eq('organization_id', currentOrganization.id);

        if (farmsError) {
          console.error('Error fetching farms:', farmsError);
          return [];
        }

        console.log('Found farms:', farms?.length || 0);

        if (!farms || farms.length === 0) {
          console.log('No farms found for this organization');
          return [];
        }

        const farmIds = farms.map(f => f.id);
        console.log('Farm IDs:', farmIds);

        // Step 2: Get all parcels for these farms
        const { data: parcels, error: parcelsError } = await supabase
          .from('parcels')
          .select('id, name, farm_id, crop_id')
          .in('farm_id', farmIds)
          .order('name');

        if (parcelsError) {
          console.error('Error fetching parcels:', parcelsError);
          return [];
        }

        console.log('Found parcels:', parcels?.length || 0);

        if (!parcels || parcels.length === 0) {
          console.log('No parcels found for these farms');
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

        console.log('Returning parcels with details:', result.length);
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
  return useQuery({
    queryKey: ['parcels-with-details', 'farm', farmId],
    queryFn: async () => {
      if (!farmId) throw new Error('Farm ID is required');

      const { data, error } = await supabase
        .from('parcels')
        .select(`
          id,
          name,
          farm_id,
          crop_id,
          soil_type,
          area,
          irrigation_type,
          created_at,
          updated_at,
          farm:farms(
            id,
            name
          ),
          crop:crops(
            id,
            name,
            variety
          )
        `)
        .eq('farm_id', farmId)
        .order('name');

      if (error) throw error;
      return data as ParcelWithDetails[];
    },
    enabled: !!farmId,
    staleTime: 60000,
  });
}
