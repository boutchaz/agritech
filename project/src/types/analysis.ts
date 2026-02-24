// Unified Analysis Types for Soil, Plant, and Water

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
  bulk_density?: number; // g/cm³
  granulometry_sand_pct?: number;
  granulometry_silt_pct?: number;
  granulometry_clay_pct?: number;
  granulometry_fine_sand_pct?: number;
  granulometry_coarse_sand_pct?: number;

  // Chemical properties
  organic_matter_percentage?: number;
  total_limestone_pct?: number;
  active_limestone_pct?: number;
  nitrogen_ppm?: number;
  ammonium_nitrogen_ppm?: number;
  nitrate_nitrogen_ppm?: number;
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
  silicon_ppm?: number;
  selenium_ppm?: number;
  gold_ppm?: number;
  lithium_ppm?: number;
  aluminum_ppm?: number;
  antimony_ppm?: number;
  bismuth_ppm?: number;
  cadmium_ppm?: number;
  lead_ppm?: number;
  nickel_ppm?: number;
  chromium_ppm?: number;
  arsenic_ppm?: number;
  mercury_ppm?: number;

  cao_meq?: number;
  mgo_meq?: number;
  k2o_meq?: number;
  na2o_meq?: number;

  // Soil health indicators
  salinity_level?: number; // EC dS/m
  electrical_conductivity?: number;
  cec_meq_per_100g?: number; // Cation Exchange Capacity
  base_saturation_percentage?: number;

  // Biological properties
  earthworm_count?: number;
  microbial_activity?: 'low' | 'medium' | 'high';
  biological_carbon?: number;
}

export interface SoilAnalysis extends BaseAnalysis {
  analysis_type: 'soil';
  data: SoilAnalysisData;
}

// Plant Tissue Analysis
export interface PlantAnalysisData {
  // Plant identification
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
  chlorine_percentage?: number;

  // Micro nutrients (ppm)
  iron_ppm?: number;
  zinc_ppm?: number;
  copper_ppm?: number;
  manganese_ppm?: number;
  boron_ppm?: number;
  molybdenum_ppm?: number;
  chlorine_ppm?: number;
  cadmium_ppm?: number;
  lead_ppm?: number;
  arsenic_ppm?: number;
  cobalt_ppm?: number;
  silver_ppm?: number;
  barium_ppm?: number;
  vanadium_ppm?: number;
  nickel_ppm?: number;
  chromium_ppm?: number;
  mercury_ppm?: number;
  silicon_ppm?: number;
  selenium_ppm?: number;
  gold_ppm?: number;
  lithium_ppm?: number;
  aluminum_ppm?: number;
  antimony_ppm?: number;
  bismuth_ppm?: number;

  // Health indicators
  dry_matter_percentage?: number;
  moisture_percentage?: number;
  chlorophyll_content?: number; // SPAD units
  stress_indicators?: string[];
}

export interface PlantAnalysis extends BaseAnalysis {
  analysis_type: 'plant';
  data: PlantAnalysisData;
}

// Water Analysis
export interface WaterAnalysisData {
  // Source
  water_source: 'well' | 'river' | 'irrigation' | 'rainwater' | 'municipal' | 'other';

  // Physical properties
  ph_level?: number;
  temperature_celsius?: number;
  turbidity_ntu?: number; // Nephelometric Turbidity Units
  color?: string;
  odor?: string;

  // Chemical properties - Major ions (ppm or mg/L)
  ec_ds_per_m?: number; // Electrical Conductivity
  tds_ppm?: number; // Total Dissolved Solids
  calcium_ppm?: number;
  magnesium_ppm?: number;
  sodium_ppm?: number;
  potassium_ppm?: number;
  ammonium_ppm?: number;
  bicarbonate_ppm?: number;
  h2po4_ppm?: number;
  carbonate_ppm?: number;
  chloride_ppm?: number;
  sulfate_ppm?: number;
  nitrate_ppm?: number;
  phosphate_ppm?: number;

  // Trace elements (ppm)
  iron_ppm?: number;
  manganese_ppm?: number;
  zinc_ppm?: number;
  copper_ppm?: number;
  boron_ppm?: number;
  cobalt_ppm?: number;
  silver_ppm?: number;
  barium_ppm?: number;
  vanadium_ppm?: number;
  nickel_ppm?: number;
  chromium_ppm?: number;
  molybdenum_ppm?: number;
  silicon_ppm?: number;
  selenium_ppm?: number;
  gold_ppm?: number;
  lithium_ppm?: number;
  aluminum_ppm?: number;
  antimony_ppm?: number;
  bismuth_ppm?: number;
  cadmium_ppm?: number;
  mercury_ppm?: number;

  // Heavy metals (ppb)
  lead_ppb?: number;
  cadmium_ppb?: number;
  arsenic_ppb?: number;
  mercury_ppb?: number;

  // Water quality indicators
  sar?: number; // Sodium Adsorption Ratio
  hardness_ppm?: number; // as CaCO3
  alkalinity_ppm?: number; // as CaCO3

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

// Analysis summary for dashboard
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
