export type ZoneClassification = 'normal' | 'stressed' | 'optimal';

export interface CalibrationParcelFixture {
  id: string;
  crop_type: 'olivier';
  system: 'intensif';
  area_ha: number;
  trees_per_ha: number;
  variety: string;
}

export interface CalibrationSatelliteReading {
  date: string;
  ndvi: number;
  ndre: number;
  ndmi: number;
  gci: number;
  evi: number;
  savi: number;
}

export interface CalibrationWeatherReading {
  date: string;
  temp_min: number;
  temp_max: number;
  precip: number;
  et0: number;
}

export interface CalibrationExpectedOutput {
  baseline_ndvi: number;
  confidence_score: number;
  zone_classification: ZoneClassification;
  phenology_stage: string;
}

export interface CalibrationAcceptanceFixture {
  parcel: CalibrationParcelFixture;
  ndvi_thresholds: {
    optimal: readonly [number, number];
    vigilance: number;
    alerte: number;
  };
  satellite_readings: CalibrationSatelliteReading[];
  weather_readings: CalibrationWeatherReading[];
  expected_output: CalibrationExpectedOutput;
}

const NDVI_SERIES = [
  0.52, 0.54, 0.55, 0.56, 0.58,
  0.52, 0.54, 0.55, 0.56, 0.58,
  0.52, 0.54, 0.55, 0.56, 0.58,
  0.52, 0.54, 0.55, 0.56, 0.58,
  0.52, 0.54, 0.55, 0.56, 0.58,
  0.52, 0.54, 0.55, 0.56, 0.58,
] as const;

const NDRE_SERIES = [
  0.19, 0.2, 0.21, 0.22, 0.23,
  0.19, 0.2, 0.21, 0.22, 0.23,
  0.19, 0.2, 0.21, 0.22, 0.23,
  0.19, 0.2, 0.21, 0.22, 0.23,
  0.19, 0.2, 0.21, 0.22, 0.23,
  0.19, 0.2, 0.21, 0.22, 0.23,
] as const;

const NDMI_SERIES = [
  0.15, 0.16, 0.17, 0.18, 0.19,
  0.15, 0.16, 0.17, 0.18, 0.19,
  0.15, 0.16, 0.17, 0.18, 0.19,
  0.15, 0.16, 0.17, 0.18, 0.19,
  0.15, 0.16, 0.17, 0.18, 0.19,
  0.15, 0.16, 0.17, 0.18, 0.19,
] as const;

const GCI_SERIES = [
  1.18, 1.22, 1.25, 1.29, 1.33,
  1.18, 1.22, 1.25, 1.29, 1.33,
  1.18, 1.22, 1.25, 1.29, 1.33,
  1.18, 1.22, 1.25, 1.29, 1.33,
  1.18, 1.22, 1.25, 1.29, 1.33,
  1.18, 1.22, 1.25, 1.29, 1.33,
] as const;

const EVI_SERIES = [
  0.3, 0.31, 0.32, 0.33, 0.34,
  0.3, 0.31, 0.32, 0.33, 0.34,
  0.3, 0.31, 0.32, 0.33, 0.34,
  0.3, 0.31, 0.32, 0.33, 0.34,
  0.3, 0.31, 0.32, 0.33, 0.34,
  0.3, 0.31, 0.32, 0.33, 0.34,
] as const;

const SAVI_SERIES = [
  0.37, 0.39, 0.4, 0.41, 0.43,
  0.37, 0.39, 0.4, 0.41, 0.43,
  0.37, 0.39, 0.4, 0.41, 0.43,
  0.37, 0.39, 0.4, 0.41, 0.43,
  0.37, 0.39, 0.4, 0.41, 0.43,
  0.37, 0.39, 0.4, 0.41, 0.43,
] as const;

const TEMP_MIN_SERIES = [
  5, 6, 7, 8, 9,
  10, 5, 6, 7, 8,
  9, 10, 5, 6, 7,
  8, 9, 10, 5, 6,
  7, 8, 9, 10, 5,
  6, 7, 8, 9, 10,
] as const;

const TEMP_MAX_SERIES = [
  15, 16, 17, 18, 19,
  20, 15, 16, 17, 18,
  19, 20, 15, 16, 17,
  18, 19, 20, 15, 16,
  17, 18, 19, 20, 15,
  16, 17, 18, 19, 20,
] as const;

const PRECIP_SERIES = [
  0, 1, 0, 2, 1,
  0, 3, 0, 1, 4,
  0, 2, 0, 5, 1,
  0, 2, 0, 1, 3,
  0, 4, 0, 1, 2,
  0, 1, 0, 2, 1,
] as const;

const ET0_SERIES = [
  1.2, 1.3, 1.5, 1.7, 1.9,
  2.1, 1.4, 1.6, 1.8, 2.0,
  2.2, 1.5, 1.7, 1.9, 2.1,
  2.3, 1.6, 1.8, 2.0, 2.2,
  2.4, 1.7, 1.9, 2.1, 2.3,
  1.8, 2.0, 2.2, 2.4, 2.6,
] as const;

const buildDate = (dayIndex: number) => `2026-01-${String(dayIndex + 1).padStart(2, '0')}`;

export const OLIVIER_INTENSIF_NDVI_THRESHOLDS = {
  optimal: [0.4, 0.6] as const,
  vigilance: 0.35,
  alerte: 0.3,
};

export const agromindCalibrationFixture: CalibrationAcceptanceFixture = {
  parcel: {
    id: 'fixture-parcel-001',
    crop_type: 'olivier',
    system: 'intensif',
    area_ha: 5,
    trees_per_ha: 200,
    variety: 'Picholine Marocaine',
  },
  ndvi_thresholds: OLIVIER_INTENSIF_NDVI_THRESHOLDS,
  satellite_readings: NDVI_SERIES.map((ndvi, index) => ({
    date: buildDate(index),
    ndvi,
    ndre: NDRE_SERIES[index],
    ndmi: NDMI_SERIES[index],
    gci: GCI_SERIES[index],
    evi: EVI_SERIES[index],
    savi: SAVI_SERIES[index],
  })),
  weather_readings: TEMP_MIN_SERIES.map((temp_min, index) => ({
    date: buildDate(index),
    temp_min,
    temp_max: TEMP_MAX_SERIES[index],
    precip: PRECIP_SERIES[index],
    et0: ET0_SERIES[index],
  })),
  expected_output: {
    baseline_ndvi: 0.55,
    confidence_score: 0.82,
    zone_classification: 'normal',
    phenology_stage: 'repos_vegetatif',
  },
};
