export type VegetationStatus =
  | 'BYPASS_JEUNE_PLANTATION'
  | 'VEGETATION_CONFIRMEE'
  | 'PARCELLE_VIDE'
  | 'ZONE_GRISE';

export type MessageType = 'bloquant' | 'avertissement' | 'aucun';

export interface VegetationCheckResult {
  status: VegetationStatus;
  continueCalibration: boolean;
  showMessage: boolean;
  messageType: MessageType;
  ndviStats: {
    summerMean: number | null;
    summerMin: number | null;
    sampleCount: number;
  };
}

const BYPASS_RESULT: VegetationCheckResult = {
  status: 'BYPASS_JEUNE_PLANTATION',
  continueCalibration: true,
  showMessage: false,
  messageType: 'aucun',
  ndviStats: { summerMean: null, summerMin: null, sampleCount: 0 },
};

/**
 * Deterministic vegetation check from July-August NDVI values.
 *
 * @param plantingYear - parcel planting year, or null if unknown
 * @param summerNdviValues - array of NDVI mean_value for July/August dates
 */
export function checkVegetation(
  plantingYear: number | null,
  summerNdviValues: number[],
): VegetationCheckResult {
  const currentYear = new Date().getFullYear();

  // Rule 0: bypass young plantation or unknown age
  if (plantingYear === null || currentYear - plantingYear < 4) {
    return BYPASS_RESULT;
  }

  // Rule absolue: no data = let through
  if (summerNdviValues.length === 0) {
    return { ...BYPASS_RESULT, ndviStats: { summerMean: null, summerMin: null, sampleCount: 0 } };
  }

  const summerMean =
    summerNdviValues.reduce((sum, v) => sum + v, 0) / summerNdviValues.length;
  const summerMin = Math.min(...summerNdviValues);
  const sampleCount = summerNdviValues.length;
  const ndviStats = { summerMean, summerMin, sampleCount };

  // Rule 1: vegetation confirmed
  if (summerMean >= 0.28 && summerMin >= 0.18) {
    return {
      status: 'VEGETATION_CONFIRMEE',
      continueCalibration: true,
      showMessage: false,
      messageType: 'aucun',
      ndviStats,
    };
  }

  // Rule 2: parcelle vide
  if (summerMean < 0.15 && summerMin < 0.10) {
    return {
      status: 'PARCELLE_VIDE',
      continueCalibration: false,
      showMessage: true,
      messageType: 'bloquant',
      ndviStats,
    };
  }

  // Rule 3: zone grise
  return {
    status: 'ZONE_GRISE',
    continueCalibration: true,
    showMessage: true,
    messageType: 'avertissement',
    ndviStats,
  };
}
