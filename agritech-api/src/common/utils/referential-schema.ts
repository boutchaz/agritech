import { z } from 'zod';

const monthCodeSchema = z.enum([
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]);

const numberRangeSchema = z.tuple([z.number(), z.number()]);

const weatherRuleSchema = z
  .object({
    threshold_c: z.number().optional(),
    detection_months: z.array(z.number().int().min(1).max(12)).optional(),
    severity: z.string().optional(),
    tmax_c: z.number().optional(),
    consecutive_days: z.number().int().min(1).optional(),
    temperature_c: z.number().optional(),
    wind_kmh: z.number().optional(),
    humidity_max_pct: z.number().optional(),
    rain_mm_max_per_day: z.number().optional(),
    dry_season_days: z.number().int().min(1).optional(),
    transition_days: z.number().int().min(0).optional(),
    rainy_season_days: z.number().int().min(0).optional(),
  })
  .passthrough();

const weatherThresholdsSchema = z
  .object({
    gel: weatherRuleSchema.optional(),
    canicule: weatherRuleSchema.optional(),
    vent_chaud: weatherRuleSchema.optional(),
    secheresse: weatherRuleSchema.optional(),
  })
  .passthrough();

const calibrationCapabilitiesSchema = z
  .object({
    supported: z.boolean().optional(),
    phenology_mode: z.string().optional(),
    required_indices: z.array(z.string()).optional(),
    min_observed_images: z.number().int().min(0).optional(),
    min_history_days: z.number().int().min(0).optional(),
    min_history_months_for_period_percentiles: z.number().int().min(0).optional(),
  })
  .passthrough();

const gddSchema = z
  .object({
    tbase_c: z.number().optional(),
    plafond_c: z.number().optional(),
    activation_forcing: z.boolean().optional(),
    formule: z.string().optional(),
    seuils_chill_units_par_variete: z.record(z.string(), z.array(z.number())).optional(),
  })
  .passthrough();

const systemSchema = z
  .object({
    indice_cle: z.string().optional(),
    indice_satellite_cle: z.string().optional(),
    entree_production_annee: numberRangeSchema.optional(),
    pleine_production_annee: numberRangeSchema.optional(),
    duree_vie_economique_ans: numberRangeSchema.optional(),
  })
  .passthrough();

const satelliteThresholdSchema = z
  .object({
    optimal: numberRangeSchema.optional(),
    vigilance: z.number().optional(),
    alerte: z.number().optional(),
  })
  .passthrough();

const systemSatelliteThresholdsSchema = z
  .record(z.string(), satelliteThresholdSchema)
  .or(z.record(z.string(), z.union([satelliteThresholdSchema, z.number(), z.array(z.number())])));

const satelliteThresholdsSchema = z
  .record(z.string(), systemSatelliteThresholdsSchema)
  .or(z.record(z.string(), z.union([satelliteThresholdSchema, z.number(), z.array(z.number())])));

const bbchStageSchema = z
  .object({
    code: z.string(),
    nom: z.string(),
    mois: z.array(monthCodeSchema).optional(),
    gdd_cumul: numberRangeSchema.optional(),
  })
  .passthrough();

const varietyYieldStageSchema = z
  .record(
    z.string(),
    z.union([
      numberRangeSchema,
      z.number(),
      z.array(z.number()),
    ]),
  );

const varietySchema = z
  .object({
    code: z.string().optional(),
    nom: z.string().optional(),
    name: z.string().optional(),
    unit: z.string().optional(),
    rendement_kg_arbre: varietyYieldStageSchema.optional(),
    rendement_t_ha: varietyYieldStageSchema.optional(),
    heures_froid_requises: z.array(z.number()).optional(),
    sensibilites: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  })
  .passthrough();

const metadataSchema = z
  .object({
    version: z.string().min(1),
    culture: z.string().min(1),
    date: z.string().optional(),
    last_modified: z.string().optional(),
    pays: z.string().optional(),
    usage: z.string().optional(),
  })
  .passthrough();

export function buildReferentialSchema(expectedCrop?: string) {
  return z
    .object({
      metadata: metadataSchema,
      capacites_calibrage: calibrationCapabilitiesSchema.optional(),
      gdd: gddSchema.optional(),
      seuils_meteo: weatherThresholdsSchema.optional(),
      systemes: z.record(z.string(), systemSchema).optional(),
      seuils_satellite: satelliteThresholdsSchema.optional(),
      stades_bbch: z.array(bbchStageSchema).optional(),
      protocole_phenologique: z.record(z.string(), z.unknown()).optional(),
      phases_maturite_ans: z.record(z.string(), numberRangeSchema).optional(),
      varietes_calibrage: z.array(varietySchema).optional(),
      varietes: z.union([z.array(varietySchema), z.record(z.string(), z.unknown())]).optional(),
    })
    .passthrough()
    .superRefine((value, ctx) => {
      if (
        expectedCrop &&
        value.metadata?.culture &&
        value.metadata.culture.toLowerCase() !== expectedCrop.toLowerCase()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['metadata', 'culture'],
          message: `metadata.culture must match "${expectedCrop.toLowerCase()}"`,
        });
      }
    });
}

export type ReferentialDocument = z.infer<ReturnType<typeof buildReferentialSchema>>;

export interface SchemaValidationError {
  path: string;
  message: string;
}

export function formatZodErrors(
  error: z.ZodError,
): SchemaValidationError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '$',
    message: issue.message,
  }));
}
