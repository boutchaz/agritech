import { z } from 'zod';

const optionalNumber = z.number().min(0).optional();

const requiredNumber = z.number().min(0);

export const PlantationStepSchema = z
  .object({
    plantation_age: requiredNumber,
    real_tree_count: optionalNumber,
    real_spacing: z.string().trim().optional(),
    water_source: z.enum(['well', 'dam', 'seguia', 'municipal', 'mixed', 'other']),
    water_source_changed: z.boolean(),
    water_source_change_date: z.string().trim().optional(),
    previous_water_source: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.water_source_changed) {
      if (!data.water_source_change_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['water_source_change_date'],
          message: 'Water source change date is required when source changed',
        });
      }

      if (!data.previous_water_source) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['previous_water_source'],
          message: 'Previous water source is required when source changed',
        });
      }
    }
  });

export const IrrigationStepSchema = z
  .object({
    irrigation_frequency: z.enum(['daily', '2_3_per_week', 'weekly', 'biweekly', 'other']),
    volume_per_tree_liters: requiredNumber,
    irrigation_regime_changed: z.boolean(),
    irrigation_change_date: z.string().trim().optional(),
    previous_irrigation_frequency: z.string().trim().optional(),
    previous_volume_per_tree_liters: optionalNumber,
  })
  .superRefine((data, ctx) => {
    if (data.irrigation_regime_changed) {
      if (!data.irrigation_change_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['irrigation_change_date'],
          message: 'Irrigation change date is required when regime changed',
        });
      }

      if (!data.previous_irrigation_frequency) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['previous_irrigation_frequency'],
          message: 'Previous irrigation frequency is required when regime changed',
        });
      }

      if (data.previous_volume_per_tree_liters == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['previous_volume_per_tree_liters'],
          message: 'Previous volume per tree is required when regime changed',
        });
      }
    }
  });

export const SoilParametersSchema = z.object({
  prioritaire: z.object({
    ph: optionalNumber,
    ec_ds_m: optionalNumber,
    texture: z.string().trim().optional(),
    organic_matter_pct: optionalNumber,
  }),
  recommande: z.object({
    phosphorus_ppm: optionalNumber,
    potassium_ppm: optionalNumber,
    calcium_ppm: optionalNumber,
    magnesium_ppm: optionalNumber,
    total_limestone_pct: optionalNumber,
    active_limestone_pct: optionalNumber,
    root_depth_cm: optionalNumber,
  }),
  optionnel: z.object({
    nitrogen_ppm: optionalNumber,
    iron_ppm: optionalNumber,
    zinc_ppm: optionalNumber,
    manganese_ppm: optionalNumber,
    boron_ppm: optionalNumber,
    copper_ppm: optionalNumber,
    other_text: z.string().trim().optional(),
  }),
});

export const SoilAnalysisStepSchema = z.object({
  soil_analysis_available: z.enum(['yes', 'no', 'upcoming']),
  soil_analysis_date: z.string().trim().optional(),
  soil_analysis_laboratory: z.string().trim().optional(),
  soil_analysis_parameters: SoilParametersSchema,
});

export const WaterParametersSchema = z.object({
  prioritaire: z.object({
    ec_water: optionalNumber,
    ph_water: optionalNumber,
    sar: optionalNumber,
    sodium_meq: optionalNumber,
    chlorides_meq: optionalNumber,
  }),
  recommande: z.object({
    bicarbonates_meq: optionalNumber,
    calcium_meq: optionalNumber,
    magnesium_meq: optionalNumber,
    nitrates_mg: optionalNumber,
  }),
  optionnel: z.object({
    boron_mg: optionalNumber,
    sulfates_meq: optionalNumber,
    other_text: z.string().trim().optional(),
  }),
});

export const WaterAnalysisStepSchema = z.object({
  water_analysis_available: z.enum(['yes', 'no', 'upcoming']),
  water_analysis_date: z.string().trim().optional(),
  water_analysis_parameters: WaterParametersSchema,
});

export const FoliarElementsSchema = z.object({
  nitrogen_pct: optionalNumber,
  phosphorus_pct: optionalNumber,
  potassium_pct: optionalNumber,
  calcium_pct: optionalNumber,
  magnesium_pct: optionalNumber,
  iron_ppm: optionalNumber,
  zinc_ppm: optionalNumber,
  manganese_ppm: optionalNumber,
  boron_ppm: optionalNumber,
  copper_ppm: optionalNumber,
  sodium_pct: optionalNumber,
  chlorides_pct: optionalNumber,
});

export const FoliarAnalysisStepSchema = z.object({
  foliar_analysis_available: z.enum(['yes', 'no', 'planned']).optional(),
  foliar_analysis_date: z.string().trim().optional(),
  phenological_stage_at_sampling: z.string().trim().optional(),
  branch_type: z.enum(['fruiting', 'non_fruiting', 'mixed']).optional(),
  foliar_elements: FoliarElementsSchema,
});

export const HarvestRecordSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  yield_value: requiredNumber,
  unit: z.enum(['t_ha', 'kg_total']),
  quality_grade: z.string().trim().optional(),
  observation: z.string().trim().optional(),
});

export const HarvestHistoryStepSchema = z.object({
  harvests: z.array(HarvestRecordSchema).min(3).max(5),
  harvest_regularity: z.enum(['stable', 'marked_alternance', 'very_irregular']).optional(),
});

export const StressEventSchema = z.object({
  type: z.enum(['drought', 'frost', 'disease', 'pest', 'salinity', 'other']),
  year: z.number().int().min(1900).max(2100).optional(),
  description: z.string().trim().optional(),
});

export const CulturalHistoryStepSchema = z.object({
  pruning_practiced: z.enum(['yes', 'no', 'irregular']).optional(),
  pruning_type: z.enum(['production', 'rejuvenation', 'sanitary', 'mixed']).optional(),
  last_pruning_date: z.string().trim().optional(),
  pruning_intensity: z.enum(['light', 'moderate', 'severe']).optional(),
  past_fertilization: z.enum(['yes', 'no', 'partial']).optional(),
  fertilization_type: z.enum(['organic', 'mineral', 'both', 'unknown']).optional(),
  biostimulants_used: z.enum(['yes', 'no', 'unknown']).optional(),
  stress_events: z.array(StressEventSchema),
  observations: z.string().trim().optional(),
});

export const ValidationStepSchema = z.object({});

export const CalibrationWizardSchema = PlantationStepSchema.merge(IrrigationStepSchema)
  .merge(SoilAnalysisStepSchema)
  .merge(WaterAnalysisStepSchema)
  .merge(FoliarAnalysisStepSchema)
  .merge(HarvestHistoryStepSchema)
  .merge(CulturalHistoryStepSchema)
  .merge(ValidationStepSchema);

export type CalibrationWizardFormValues = z.infer<typeof CalibrationWizardSchema>;

export const calibrationWizardDefaultValues: CalibrationWizardFormValues = {
  plantation_age: 0,
  real_tree_count: undefined,
  real_spacing: '',
  water_source: 'well',
  water_source_changed: false,
  water_source_change_date: '',
  previous_water_source: '',
  irrigation_frequency: 'daily',
  volume_per_tree_liters: 0,
  irrigation_regime_changed: false,
  irrigation_change_date: '',
  previous_irrigation_frequency: '',
  previous_volume_per_tree_liters: undefined,
  soil_analysis_available: 'no',
  soil_analysis_date: '',
  soil_analysis_laboratory: '',
  soil_analysis_parameters: {
    prioritaire: {
      ph: undefined,
      ec_ds_m: undefined,
      texture: '',
      organic_matter_pct: undefined,
    },
    recommande: {
      phosphorus_ppm: undefined,
      potassium_ppm: undefined,
      calcium_ppm: undefined,
      magnesium_ppm: undefined,
      total_limestone_pct: undefined,
      active_limestone_pct: undefined,
      root_depth_cm: undefined,
    },
    optionnel: {
      nitrogen_ppm: undefined,
      iron_ppm: undefined,
      zinc_ppm: undefined,
      manganese_ppm: undefined,
      boron_ppm: undefined,
      copper_ppm: undefined,
      other_text: '',
    },
  },
  water_analysis_available: 'no',
  water_analysis_date: '',
  water_analysis_parameters: {
    prioritaire: {
      ec_water: undefined,
      ph_water: undefined,
      sar: undefined,
      sodium_meq: undefined,
      chlorides_meq: undefined,
    },
    recommande: {
      bicarbonates_meq: undefined,
      calcium_meq: undefined,
      magnesium_meq: undefined,
      nitrates_mg: undefined,
    },
    optionnel: {
      boron_mg: undefined,
      sulfates_meq: undefined,
      other_text: '',
    },
  },
  foliar_analysis_available: undefined,
  foliar_analysis_date: '',
  phenological_stage_at_sampling: '',
  branch_type: undefined,
  foliar_elements: {
    nitrogen_pct: undefined,
    phosphorus_pct: undefined,
    potassium_pct: undefined,
    calcium_pct: undefined,
    magnesium_pct: undefined,
    iron_ppm: undefined,
    zinc_ppm: undefined,
    manganese_ppm: undefined,
    boron_ppm: undefined,
    copper_ppm: undefined,
    sodium_pct: undefined,
    chlorides_pct: undefined,
  },
  harvests: [
    { year: new Date().getFullYear() - 3, yield_value: 0, unit: 't_ha', quality_grade: '', observation: '' },
    { year: new Date().getFullYear() - 2, yield_value: 0, unit: 't_ha', quality_grade: '', observation: '' },
    { year: new Date().getFullYear() - 1, yield_value: 0, unit: 't_ha', quality_grade: '', observation: '' },
  ],
  harvest_regularity: undefined,
  pruning_practiced: undefined,
  pruning_type: undefined,
  last_pruning_date: '',
  pruning_intensity: undefined,
  past_fertilization: undefined,
  fertilization_type: undefined,
  biostimulants_used: undefined,
  stress_events: [],
  observations: '',
};

export const WIZARD_STEP_FIELD_PATHS: Record<number, Array<keyof CalibrationWizardFormValues | string>> = {
  1: [
    'plantation_age',
    'real_tree_count',
    'real_spacing',
    'water_source',
    'water_source_changed',
    'water_source_change_date',
    'previous_water_source',
  ],
  2: [
    'irrigation_frequency',
    'volume_per_tree_liters',
    'irrigation_regime_changed',
    'irrigation_change_date',
    'previous_irrigation_frequency',
    'previous_volume_per_tree_liters',
  ],
  3: ['soil_analysis_available', 'soil_analysis_date', 'soil_analysis_laboratory', 'soil_analysis_parameters'],
  4: ['water_analysis_available', 'water_analysis_date', 'water_analysis_parameters'],
  5: [
    'foliar_analysis_available',
    'foliar_analysis_date',
    'phenological_stage_at_sampling',
    'branch_type',
    'foliar_elements',
  ],
  6: ['harvests', 'harvest_regularity'],
  7: [
    'pruning_practiced',
    'pruning_type',
    'last_pruning_date',
    'pruning_intensity',
    'past_fertilization',
    'fertilization_type',
    'biostimulants_used',
    'stress_events',
    'observations',
  ],
  8: [],
};

export const WIZARD_STEP_SCHEMAS = {
  1: PlantationStepSchema,
  2: IrrigationStepSchema,
  3: SoilAnalysisStepSchema,
  4: WaterAnalysisStepSchema,
  5: FoliarAnalysisStepSchema,
  6: HarvestHistoryStepSchema,
  7: CulturalHistoryStepSchema,
  8: ValidationStepSchema,
} as const;
