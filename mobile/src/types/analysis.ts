// Unified Analysis Types for Mobile
// Adapted from web: project/src/types/analysis.ts

export type AnalysisType = 'soil' | 'plant' | 'water';

export interface BaseAnalysis {
  id: string;
  parcel_id: string;
  organization_id?: string;
  analysis_type: AnalysisType;
  analysis_date: string;
  laboratory?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Soil Analysis
export interface SoilAnalysisData {
  // Physical properties
  ph_level?: number;
  texture?: 'sand' | 'loamy_sand' | 'sandy_loam' | 'sandy_clay_loam' | 'loam' | 'silt_loam' | 'silt' | 'clay_loam' | 'silty_clay_loam' | 'sandy_clay' | 'silty_clay' | 'clay';
  moisture_percentage?: number;
  bulk_density?: number;
  granulometry_sand_pct?: number;
  granulometry_silt_pct?: number;
  granulometry_clay_pct?: number;

  // Chemical properties
  organic_matter_percentage?: number;
  total_limestone_pct?: number;
  active_limestone_pct?: number;
  nitrogen_ppm?: number;
  phosphorus_ppm?: number;
  phosphorus_olsen_ppm?: number;
  potassium_ppm?: number;
  calcium_ppm?: number;
  magnesium_ppm?: number;
  sulfur_ppm?: number;
  sodium_ppm?: number;
  chloride_ppm?: number;
  iron_ppm?: number;
  zinc_ppm?: number;
  copper_ppm?: number;
  manganese_ppm?: number;
  boron_ppm?: number;

  // Soil health indicators
  salinity_level?: number;
  electrical_conductivity?: number;
  cec_meq_per_100g?: number;
  base_saturation_percentage?: number;

  // Biological properties
  earthworm_count?: number;
  microbial_activity?: 'low' | 'medium' | 'high';
}

export interface SoilAnalysis extends BaseAnalysis {
  analysis_type: 'soil';
  data: SoilAnalysisData;
}

// Plant Tissue Analysis
export interface PlantAnalysisData {
  plant_part: 'leaf' | 'stem' | 'root' | 'fruit' | 'whole_plant';
  growth_stage?: string;

  // Macro nutrients (%)
  nitrogen_percentage?: number;
  phosphorus_percentage?: number;
  potassium_percentage?: number;
  calcium_percentage?: number;
  magnesium_percentage?: number;
  sulfur_percentage?: number;
  sodium_percentage?: number;

  // Micro nutrients (ppm)
  iron_ppm?: number;
  zinc_ppm?: number;
  copper_ppm?: number;
  manganese_ppm?: number;
  boron_ppm?: number;
  molybdenum_ppm?: number;

  // Health indicators
  dry_matter_percentage?: number;
  moisture_percentage?: number;
  chlorophyll_content?: number;
  stress_indicators?: string[];
}

export interface PlantAnalysis extends BaseAnalysis {
  analysis_type: 'plant';
  data: PlantAnalysisData;
}

// Water Analysis
export interface WaterAnalysisData {
  water_source: 'well' | 'river' | 'irrigation' | 'rainwater' | 'municipal' | 'other';

  // Physical properties
  ph_level?: number;
  temperature_celsius?: number;
  turbidity_ntu?: number;

  // Chemical properties
  ec_ds_per_m?: number;
  tds_ppm?: number;
  calcium_ppm?: number;
  magnesium_ppm?: number;
  sodium_ppm?: number;
  potassium_ppm?: number;
  bicarbonate_ppm?: number;
  carbonate_ppm?: number;
  chloride_ppm?: number;
  sulfate_ppm?: number;
  nitrate_ppm?: number;
  phosphate_ppm?: number;

  // Trace elements
  iron_ppm?: number;
  manganese_ppm?: number;
  zinc_ppm?: number;
  copper_ppm?: number;
  boron_ppm?: number;

  // Water quality indicators
  sar?: number;
  hardness_ppm?: number;
  alkalinity_ppm?: number;

  // Biological
  coliform_cfu_per_100ml?: number;
  e_coli_cfu_per_100ml?: number;

  // Suitability
  irrigation_suitability?: 'excellent' | 'good' | 'fair' | 'poor' | 'unsuitable';
}

export interface WaterAnalysis extends BaseAnalysis {
  analysis_type: 'water';
  data: WaterAnalysisData;
}

// Union type for all analyses
export type Analysis = SoilAnalysis | PlantAnalysis | WaterAnalysis;

// Recommendation types
export interface AnalysisRecommendation {
  id: string;
  analysis_id: string;
  recommendation_type: 'fertilizer' | 'amendment' | 'irrigation' | 'pest_management' | 'general';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action_items: string[];
  estimated_cost?: number;
  created_at: string;
}

// Analysis summary
export interface AnalysisSummary {
  total_analyses: number;
  by_type: {
    soil: number;
    plant: number;
    water: number;
  };
  recent_analyses: Analysis[];
  pending_recommendations: number;
  critical_issues: number;
}

// API Types
export type AnalysisData = SoilAnalysisData | PlantAnalysisData | WaterAnalysisData;

export interface AnalysisFilters {
  parcel_id?: string;
  parcel_ids?: string[];
  farm_id?: string;
  analysis_type?: AnalysisType;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface CreateAnalysisInput {
  parcel_id: string;
  analysis_type: AnalysisType;
  analysis_date: string;
  data: AnalysisData;
  laboratory?: string;
  notes?: string;
}

export interface UpdateAnalysisInput {
  analysis_date?: string;
  laboratory?: string;
  data?: AnalysisData;
  notes?: string;
}

export interface AnalysesResponse {
  data: Analysis[];
  count: number;
}
