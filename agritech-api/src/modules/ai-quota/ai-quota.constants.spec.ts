import { AI_LEVEL_LIMITS, UNLIMITED } from './ai-quota.constants';

describe('AI Quota Constants', () => {
  it('should have correct limits for each level', () => {
    expect(AI_LEVEL_LIMITS.basic).toBe(50);
    expect(AI_LEVEL_LIMITS.advanced).toBe(200);
    expect(AI_LEVEL_LIMITS.expert).toBe(500);
    expect(AI_LEVEL_LIMITS.enterprise).toBe(UNLIMITED);
  });

  it('UNLIMITED should be -1', () => {
    expect(UNLIMITED).toBe(-1);
  });
});
