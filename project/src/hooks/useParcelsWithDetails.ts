import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { parcelsApi } from '@/lib/api/parcels';
import { farmsApi } from '@/lib/api/farms';

export interface ParcelWithDetails {
  id: string;
  name: string;
  farm_id: string;
  organization_id?: string | null;
  crop_category?: string | null;
  crop_type?: string | null;
  variety?: string | null;
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

        // Step 1: Get all farms for this organization using API
        const data = await farmsApi.getAll(
          { organization_id: currentOrganization.id },
          currentOrganization.id
        );

        const farms: any[] = Array.isArray(data) ? data : [];

        console.warn('Found farms:', farms?.length || 0);

        if (!farms || farms.length === 0) {
          console.warn('No farms found for this organization');
          return [];
        }

        const farmIds = farms.map((f: any) => f.farm_id || f.id);
        console.warn('Farm IDs:', farmIds);

        // Step 2: Get all parcels for these farms using API
        // Fetch parcels for each farm and combine
        const parcelPromises = farmIds.map(async (farmId) => {
          const data = await parcelsApi.getAll({ farm_id: farmId, organization_id: currentOrganization.id }, currentOrganization.id);
          return Array.isArray(data) ? data : [];
        });

        const parcelResults = await Promise.all(parcelPromises);
        const parcels = parcelResults.flat().sort((a, b) => a.name.localeCompare(b.name));

        console.warn('Found parcels:', parcels?.length || 0);

        if (!parcels || parcels.length === 0) {
          console.warn('No parcels found for these farms');
          return [];
        }

        // Create farms map for easy lookup
        const farmsMap = new Map(farms.map(f => [f.id, f]));

        // Step 3: Combine the data with farm information
        // Note: crop information (crop_category, crop_type, variety) is already on the parcel
        const result: ParcelWithDetails[] = parcels.map(parcel => ({
          id: parcel.id,
          name: parcel.name,
          farm_id: parcel.farm_id,
          crop_category: parcel.crop_category,
          crop_type: parcel.crop_type,
          variety: parcel.variety,
          soil_type: parcel.soil_type,
          area: parcel.area,
          irrigation_type: parcel.irrigation_type,
          created_at: parcel.created_at,
          updated_at: parcel.updated_at,
          farm: farmsMap.get(parcel.farm_id) || undefined,
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

      // Get parcels from API
      const data = await parcelsApi.getAll(
        { farm_id: farmId, organization_id: currentOrganization.id },
        currentOrganization.id
      );
      const parcels = Array.isArray(data) ? data : [];

      // Get farm details using API
      const farm = await farmsApi.getOne(farmId, currentOrganization.id);

      // Combine data - crop information is already on the parcel
      return parcels.map(parcel => ({
        id: parcel.id,
        name: parcel.name,
        farm_id: parcel.farm_id,
        crop_category: parcel.crop_category,
        crop_type: parcel.crop_type,
        variety: parcel.variety,
        soil_type: parcel.soil_type,
        area: parcel.area,
        irrigation_type: parcel.irrigation_type,
        created_at: parcel.created_at,
        updated_at: parcel.updated_at,
        farm: farm ? { id: farm.id, name: farm.name } : undefined,
      })) as ParcelWithDetails[];
    },
    enabled: !!farmId && !!currentOrganization?.id,
    staleTime: 60000,
  });
}
