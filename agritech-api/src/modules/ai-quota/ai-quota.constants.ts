/**
 * Monthly AI request limits per agromindIaLevel.
 * Maps subscription formula → monthly request limit.
 */
export const UNLIMITED = -1;

export const AI_LEVEL_LIMITS: Record<string, number> = {
  basic: 50,       // STARTER formula — Ahmed (50ha)
  advanced: 200,   // STANDARD formula — Karim (300ha)
  expert: 500,     // PREMIUM formula — Hassan (5-15 farms)
  enterprise: UNLIMITED, // ENTERPRISE formula — Fatima (2000ha)
};

/**
 * Map subscription formula names to agromindIaLevel.
 */
export const FORMULA_TO_LEVEL: Record<string, string> = {
  STARTER: 'basic',
  STANDARD: 'advanced',
  PREMIUM: 'expert',
  ENTERPRISE: 'enterprise',
};

/**
 * AI feature tags for usage logging.
 */
export type AiFeature = 'chat' | 'report' | 'alert' | 'job' | 'annual_plan' | 'calibration' | 'compliance';
