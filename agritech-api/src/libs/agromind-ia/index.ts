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

// Follow-up prompt (kept — may adapt to V2 later)
export * from './prompts/followup_prompt';
