// V2 types — source of truth for all AI engine I/O contracts
export * from './types';

// V2 prompt builders — config-driven, replace V1 hardcoded prompts
export { buildCalibrageSystemPrompt, buildCalibrageUserPrompt } from './prompts/calibrage.prompt.v3';
export { buildOperationnelSystemPrompt, buildOperationnelUserPrompt } from './prompts/operationnel.prompt.v3';
export { buildPlanAnnuelSystemPrompt, buildPlanAnnuelUserPrompt } from './prompts/plan_annuel.prompt.v3';
export {
  buildRecalibrageSystemPrompt,
  buildRecalibragePartielUserPrompt,
  buildRecalibrageCompletUserPrompt,
} from './prompts/recalibrage.prompt';

// Legacy interfaces — kept for backward compatibility with non-AI modules
// that import ParcelCalibrationInput etc. from here
export * from './interfaces';

// Legacy V1 prompts — kept temporarily during migration, will be removed in task 34
export * from './prompts/calibration_prompt';
export * from './prompts/recommendations_prompt';
export * from './prompts/annual_plan_prompt';
export * from './prompts/followup_prompt';
