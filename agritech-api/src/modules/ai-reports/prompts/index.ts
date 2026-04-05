export * from './agricultural-expert.prompt';

// V2 prompt builders (config-driven)
export {
  buildCalibrageSystemPrompt,
  buildCalibrageUserPrompt,
} from '../../../libs/agromind-ia/prompts/calibrage.prompt.v3';
export {
  buildOperationnelSystemPrompt,
  buildOperationnelUserPrompt,
} from '../../../libs/agromind-ia/prompts/operationnel.prompt.v3';
export {
  buildPlanAnnuelSystemPrompt,
  buildPlanAnnuelUserPrompt,
} from '../../../libs/agromind-ia/prompts/plan_annuel.prompt.v3';
export {
  buildRecalibrageSystemPrompt,
  buildRecalibragePartielUserPrompt,
  buildRecalibrageCompletUserPrompt,
} from '../../../libs/agromind-ia/prompts/recalibrage.prompt';

// Follow-up prompt (kept — may adapt to V2 later)
export {
  FOLLOWUP_EXPERT_SYSTEM_PROMPT,
  buildFollowUpPrompt,
} from '../../../libs/agromind-ia/prompts/followup_prompt';
