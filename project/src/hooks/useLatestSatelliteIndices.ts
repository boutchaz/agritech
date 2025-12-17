import { useQuery } from '@tanstack/react-query';
import { satelliteIndicesApi, SatelliteIndex } from '../lib/api/satellite-indices';
import { useAuth } from '../components/MultiTenantAuthProvider';

export interface LatestIndices {
  ndvi: number | null;
  ndmi: number | null;
  ndre: number | null;
  gci: number | null;
  savi: number | null;
  lastUpdate: string | null;
}

export interface ParcelHealthStatus {
  status: 'Excellente' | 'Bonne' | 'Moyenne' | 'Faible' | 'Critique' | 'Inconnu';
  color: string;
  description: string;
}

/**
 * Calculate health status based on NDVI value
 * NDVI ranges: -1 to 1
 * - > 0.7: Excellent (dense, healthy vegetation)
 * - 0.5-0.7: Good (moderate vegetation)
 * - 0.3-0.5: Average (sparse vegetation)
 * - 0.1-0.3: Poor (very sparse vegetation)
 * - < 0.1: Critical (bare soil, water, or stressed vegetation)
 */
export function calculateHealthStatus(ndvi: number | null): ParcelHealthStatus {
  if (ndvi === null || isNaN(ndvi)) {
    return {
      status: 'Inconnu',
      color: 'text-gray-500',
      description: 'Données NDVI non disponibles',
    };
  }

  if (ndvi > 0.7) {
    return {
      status: 'Excellente',
      color: 'text-green-600',
      description: 'Végétation dense et saine',
    };
  } else if (ndvi > 0.5) {
    return {
      status: 'Bonne',
      color: 'text-green-500',
      description: 'Végétation modérée en bonne santé',
    };
  } else if (ndvi > 0.3) {
    return {
      status: 'Moyenne',
      color: 'text-yellow-500',
      description: 'Végétation clairsemée',
    };
  } else if (ndvi > 0.1) {
    return {
      status: 'Faible',
      color: 'text-orange-500',
      description: 'Végétation très clairsemée ou stressée',
    };
  } else {
    return {
      status: 'Critique',
      color: 'text-red-600',
      description: 'Sol nu ou végétation très stressée',
    };
  }
}

/**
 * Calculate irrigation index based on NDMI (Normalized Difference Moisture Index)
 * NDMI ranges: -1 to 1
 * Higher values indicate higher water content
 * Returns a percentage (0-100%)
 */
export function calculateIrrigationIndex(ndmi: number | null): number | null {
  if (ndmi === null || isNaN(ndmi)) {
    return null;
  }

  // Convert NDMI range (-1 to 1) to percentage (0-100%)
  // NDMI of 0.4+ is considered well-watered (100%)
  // NDMI of -0.2 or below is considered dry (0%)
  const minNdmi = -0.2;
  const maxNdmi = 0.4;

  const clampedNdmi = Math.max(minNdmi, Math.min(maxNdmi, ndmi));
  const percentage = ((clampedNdmi - minNdmi) / (maxNdmi - minNdmi)) * 100;

  return Math.round(percentage);
}

/**
 * Hook to fetch the latest satellite indices for a parcel
 */
export function useLatestSatelliteIndices(parcelId: string | null | undefined) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['latest-satellite-indices', parcelId, organizationId],
    queryFn: async (): Promise<LatestIndices> => {
      if (!parcelId || !organizationId) {
        return {
          ndvi: null,
          ndmi: null,
          ndre: null,
          gci: null,
          savi: null,
          lastUpdate: null,
        };
      }

      // Fetch the most recent indices for this parcel
      // Get the last 90 days of data to find the most recent
      const now = new Date();
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

      const response = await satelliteIndicesApi.getAll(
        {
          parcel_id: parcelId,
          date_from: threeMonthsAgo.toISOString().split('T')[0],
          date_to: now.toISOString().split('T')[0],
          limit: 100,
        },
        organizationId
      );

      if (!response || response.length === 0) {
        return {
          ndvi: null,
          ndmi: null,
          ndre: null,
          gci: null,
          savi: null,
          lastUpdate: null,
        };
      }

      // Group by index name and get the most recent for each
      const latestByIndex: Record<string, SatelliteIndex> = {};

      for (const item of response) {
        const indexName = item.index_name?.toUpperCase();
        if (!indexName) continue;

        const existing = latestByIndex[indexName];
        if (!existing || new Date(item.date) > new Date(existing.date)) {
          latestByIndex[indexName] = item;
        }
      }

      // Extract values
      const getValue = (indexName: string): number | null => {
        const item = latestByIndex[indexName];
        if (!item) return null;
        return item.mean_value ?? item.index_value ?? null;
      };

      // Find the most recent date across all indices
      let lastUpdate: string | null = null;
      for (const item of Object.values(latestByIndex)) {
        if (!lastUpdate || new Date(item.date) > new Date(lastUpdate)) {
          lastUpdate = item.date?.split('T')[0] || null;
        }
      }

      return {
        ndvi: getValue('NDVI'),
        ndmi: getValue('NDMI'),
        ndre: getValue('NDRE'),
        gci: getValue('GCI'),
        savi: getValue('SAVI'),
        lastUpdate,
      };
    },
    enabled: !!parcelId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
