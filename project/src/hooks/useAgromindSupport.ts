import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiReferencesApi, type SupportedCrop, type SupportedVariety } from '../lib/api/ai-references';
import { useAuth } from './useAuth';

/**
 * Maps frontend crop display names to referential codes used by AgromindIA.
 *
 * All matching uses referential **codes** as source of truth (exact match).
 * Every referential (including future ones) will have sub-type groups,
 * so varietyGroup filtering is the standard path.
 */
const CROP_NAME_TO_REF: Record<string, { code: string; varietyGroup?: string }> = {
  // Olivier
  'olivier': { code: 'olivier' },
  // Agrumes — each citrus subtype maps to the relevant varietes group key
  'oranger': { code: 'agrumes', varietyGroup: 'oranges' },
  'mandariner': { code: 'agrumes', varietyGroup: 'petits_agrumes' },
  'citronnier': { code: 'agrumes', varietyGroup: 'citrons' },
  'pamplemoussier': { code: 'agrumes', varietyGroup: 'pomelos' },
  'pomelo': { code: 'agrumes', varietyGroup: 'pomelos' },
  'combava': { code: 'agrumes' },
  'cédratier': { code: 'agrumes', varietyGroup: 'citrons' },
  // Avocatier
  'avocatier': { code: 'avocatier' },
  // Palmier dattier
  'palmier dattier': { code: 'palmier_dattier' },
};

function normalizeKey(name: string): string {
  return name.trim().toLowerCase();
}

export function useSupportedCrops() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const query = useQuery({
    queryKey: ['agromind-supported-crops'],
    queryFn: () => aiReferencesApi.getSupportedCrops(orgId ?? undefined),
    staleTime: 1000 * 60 * 60, // 1 hour — referentials rarely change
    enabled: !!orgId,
  });

  const cropMap = useMemo(() => {
    const map = new Map<string, SupportedCrop>();
    if (query.data) {
      for (const crop of query.data.crops) {
        map.set(crop.code, crop);
      }
    }
    return map;
  }, [query.data]);

  /**
   * Check if a frontend crop type name is supported by AgromindIA.
   */
  function isCropSupported(cropName: string | undefined | null): boolean {
    if (!cropName) return false;
    const mapping = CROP_NAME_TO_REF[normalizeKey(cropName)];
    return mapping ? cropMap.has(mapping.code) : false;
  }

  /**
   * Get referential code for a frontend crop name.
   */
  function getReferentialCode(cropName: string | undefined | null): string | null {
    if (!cropName) return null;
    return CROP_NAME_TO_REF[normalizeKey(cropName)]?.code ?? null;
  }

  /**
   * Get supported varieties for a frontend crop name.
   * For grouped referentials (agrumes, etc.), filters to the relevant sub-group.
   */
  function getSupportedVarieties(cropName: string | undefined | null): SupportedVariety[] {
    if (!cropName) return [];
    const mapping = CROP_NAME_TO_REF[normalizeKey(cropName)];
    if (!mapping) return [];
    const crop = cropMap.get(mapping.code);
    if (!crop) return [];

    if (mapping.varietyGroup) {
      return crop.varietyGroups?.[mapping.varietyGroup] ?? crop.varieties;
    }
    return crop.varieties;
  }

  /**
   * Check if a variety code matches a supported referential variety code.
   * Exact code match only — codes are the source of truth.
   */
  function isVarietySupported(cropName: string | undefined | null, varietyCode: string | undefined | null): boolean {
    if (!cropName || !varietyCode) return false;
    const varieties = getSupportedVarieties(cropName);
    if (varieties.length === 0) return false;
    const normalized = normalizeKey(varietyCode);
    return varieties.some((v) => normalizeKey(v.code) === normalized);
  }

  return {
    supportedCrops: query.data?.crops ?? [],
    isLoading: query.isLoading,
    isCropSupported,
    getReferentialCode,
    getSupportedVarieties,
    isVarietySupported,
  };
}
