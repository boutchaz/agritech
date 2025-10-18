import { z } from 'zod';

// Soil Analysis Schema
export const soilAnalysisSchema = z.object({
  // General Information
  analysisDate: z.string().min(1, 'La date d\'analyse est requise'),
  laboratory: z.string().optional(),
  notes: z.string().optional(),

  // Physical properties
  ph_level: z.number()
    .min(0, 'Le pH doit être entre 0 et 14')
    .max(14, 'Le pH doit être entre 0 et 14')
    .optional(),
  texture: z.enum([
    'sand',
    'loamy_sand',
    'sandy_loam',
    'loam',
    'silt_loam',
    'silt',
    'clay_loam',
    'silty_clay_loam',
    'sandy_clay',
    'silty_clay',
    'clay'
  ]).optional(),
  moisture_percentage: z.number().min(0).max(100).optional(),
  bulk_density: z.number().min(0).optional(),

  // Chemical properties
  organic_matter_percentage: z.number().min(0).max(100).optional(),
  nitrogen_ppm: z.number().min(0).optional(),
  phosphorus_ppm: z.number().min(0).optional(),
  potassium_ppm: z.number().min(0).optional(),
  calcium_ppm: z.number().min(0).optional(),
  magnesium_ppm: z.number().min(0).optional(),
  sulfur_ppm: z.number().min(0).optional(),
  iron_ppm: z.number().min(0).optional(),
  zinc_ppm: z.number().min(0).optional(),
  copper_ppm: z.number().min(0).optional(),
  manganese_ppm: z.number().min(0).optional(),
  boron_ppm: z.number().min(0).optional(),

  // Soil health indicators
  salinity_level: z.number().min(0).optional(),
  cec_meq_per_100g: z.number().min(0).optional(),
  base_saturation_percentage: z.number().min(0).max(100).optional(),

  // Biological properties
  earthworm_count: z.number().min(0).optional(),
  microbial_activity: z.enum(['low', 'medium', 'high']).optional(),
  biological_carbon: z.number().min(0).optional(),
});

export type SoilAnalysisFormValues = z.infer<typeof soilAnalysisSchema>;

// Plant Analysis Schema
export const plantAnalysisSchema = z.object({
  // General Information
  analysisDate: z.string().min(1, 'La date d\'analyse est requise'),
  laboratory: z.string().optional(),
  notes: z.string().optional(),

  // Plant identification
  plant_part: z.enum(['leaf', 'stem', 'root', 'fruit', 'whole_plant'], {
    required_error: 'La partie de la plante est requise'
  }),
  growth_stage: z.string().optional(),

  // Macro nutrients (%)
  nitrogen_percentage: z.number().min(0).max(100).optional(),
  phosphorus_percentage: z.number().min(0).max(100).optional(),
  potassium_percentage: z.number().min(0).max(100).optional(),
  calcium_percentage: z.number().min(0).max(100).optional(),
  magnesium_percentage: z.number().min(0).max(100).optional(),
  sulfur_percentage: z.number().min(0).max(100).optional(),

  // Micro nutrients (ppm)
  iron_ppm: z.number().min(0).optional(),
  zinc_ppm: z.number().min(0).optional(),
  copper_ppm: z.number().min(0).optional(),
  manganese_ppm: z.number().min(0).optional(),
  boron_ppm: z.number().min(0).optional(),
  molybdenum_ppm: z.number().min(0).optional(),
  chlorine_ppm: z.number().min(0).optional(),

  // Health indicators
  dry_matter_percentage: z.number().min(0).max(100).optional(),
  moisture_percentage: z.number().min(0).max(100).optional(),
  chlorophyll_content: z.number().min(0).optional(),
});

export type PlantAnalysisFormValues = z.infer<typeof plantAnalysisSchema>;

// Water Analysis Schema
export const waterAnalysisSchema = z.object({
  // General Information
  analysisDate: z.string().min(1, 'La date d\'analyse est requise'),
  laboratory: z.string().optional(),
  notes: z.string().optional(),

  // Source
  water_source: z.enum(['well', 'river', 'irrigation', 'rainwater', 'municipal', 'other'], {
    required_error: 'La source d\'eau est requise'
  }),

  // Physical properties
  ph_level: z.number().min(0).max(14).optional(),
  temperature_celsius: z.number().optional(),
  turbidity_ntu: z.number().min(0).optional(),
  color: z.string().optional(),
  odor: z.string().optional(),

  // Chemical properties
  ec_ds_per_m: z.number().min(0).optional(),
  tds_ppm: z.number().min(0).optional(),
  calcium_ppm: z.number().min(0).optional(),
  magnesium_ppm: z.number().min(0).optional(),
  sodium_ppm: z.number().min(0).optional(),
  potassium_ppm: z.number().min(0).optional(),
  bicarbonate_ppm: z.number().min(0).optional(),
  carbonate_ppm: z.number().min(0).optional(),
  chloride_ppm: z.number().min(0).optional(),
  sulfate_ppm: z.number().min(0).optional(),
  nitrate_ppm: z.number().min(0).optional(),
  phosphate_ppm: z.number().min(0).optional(),

  // Trace elements
  iron_ppm: z.number().min(0).optional(),
  manganese_ppm: z.number().min(0).optional(),
  zinc_ppm: z.number().min(0).optional(),
  copper_ppm: z.number().min(0).optional(),
  boron_ppm: z.number().min(0).optional(),

  // Heavy metals (ppb)
  lead_ppb: z.number().min(0).optional(),
  cadmium_ppb: z.number().min(0).optional(),
  arsenic_ppb: z.number().min(0).optional(),
  mercury_ppb: z.number().min(0).optional(),

  // Water quality indicators
  sar: z.number().min(0).optional(),
  hardness_ppm: z.number().min(0).optional(),
  alkalinity_ppm: z.number().min(0).optional(),

  // Biological
  coliform_cfu_per_100ml: z.number().min(0).optional(),
  e_coli_cfu_per_100ml: z.number().min(0).optional(),

  // Suitability
  irrigation_suitability: z.enum(['excellent', 'good', 'fair', 'poor', 'unsuitable']).optional(),
});

export type WaterAnalysisFormValues = z.infer<typeof waterAnalysisSchema>;
