import { evaluate, DiagnosticEntry } from './condition-evaluator';

describe('condition-evaluator', () => {
  const ctx = {
    GDD_cumul: 400,
    Tmoy: 18,
    Tmoy_Q25: 20,
    NIRv: 0.5,
    NIRv_mean: 1.0,
    humidity: 65,
    active: true,
    stage: 'flowering',
    score: 0,
    ratio: 0.1,
  };

  // ── Constant ops ──────────────────────────────────────────

  describe('eq', () => {
    it('returns true when equal', () => {
      expect(evaluate({ var: 'active', eq: true }, ctx)).toBe(true);
    });
    it('returns false when not equal', () => {
      expect(evaluate({ var: 'active', eq: false }, ctx)).toBe(false);
    });
  });

  describe('neq', () => {
    it('returns true when not equal', () => {
      expect(evaluate({ var: 'score', neq: 5 }, ctx)).toBe(true);
    });
    it('returns false when equal', () => {
      expect(evaluate({ var: 'score', neq: 0 }, ctx)).toBe(false);
    });
  });

  describe('gt', () => {
    it('returns true when greater', () => {
      expect(evaluate({ var: 'GDD_cumul', gt: 350 }, ctx)).toBe(true);
    });
    it('returns false when equal', () => {
      expect(evaluate({ var: 'GDD_cumul', gt: 400 }, ctx)).toBe(false);
    });
    it('returns false when less', () => {
      expect(evaluate({ var: 'GDD_cumul', gt: 500 }, ctx)).toBe(false);
    });
  });

  describe('gte', () => {
    it('returns true when greater', () => {
      expect(evaluate({ var: 'GDD_cumul', gte: 350 }, ctx)).toBe(true);
    });
    it('returns true when equal', () => {
      expect(evaluate({ var: 'GDD_cumul', gte: 400 }, ctx)).toBe(true);
    });
    it('returns false when less', () => {
      expect(evaluate({ var: 'GDD_cumul', gte: 500 }, ctx)).toBe(false);
    });
  });

  describe('lt', () => {
    it('returns true when less', () => {
      expect(evaluate({ var: 'Tmoy', lt: 20 }, ctx)).toBe(true);
    });
    it('returns false when equal', () => {
      expect(evaluate({ var: 'Tmoy', lt: 18 }, ctx)).toBe(false);
    });
    it('returns false when greater', () => {
      expect(evaluate({ var: 'Tmoy', lt: 10 }, ctx)).toBe(false);
    });
  });

  describe('lte', () => {
    it('returns true when less', () => {
      expect(evaluate({ var: 'ratio', lte: 0.15 }, ctx)).toBe(true);
    });
    it('returns true when equal', () => {
      expect(evaluate({ var: 'ratio', lte: 0.1 }, ctx)).toBe(true);
    });
    it('returns false when greater', () => {
      expect(evaluate({ var: 'ratio', lte: 0.05 }, ctx)).toBe(false);
    });
  });

  // ── between ───────────────────────────────────────────────

  describe('between', () => {
    it('returns true when inside range', () => {
      expect(evaluate({ var: 'GDD_cumul', between: [350, 700] }, ctx)).toBe(true);
    });
    it('returns true on lower boundary', () => {
      expect(evaluate({ var: 'GDD_cumul', between: [400, 700] }, ctx)).toBe(true);
    });
    it('returns true on upper boundary', () => {
      expect(evaluate({ var: 'GDD_cumul', between: [300, 400] }, ctx)).toBe(true);
    });
    it('returns false when outside range', () => {
      expect(evaluate({ var: 'GDD_cumul', between: [500, 700] }, ctx)).toBe(false);
    });
  });

  // ── in ────────────────────────────────────────────────────

  describe('in', () => {
    it('returns true when value is in set', () => {
      expect(evaluate({ var: 'stage', in: ['flowering', 'fruiting'] }, ctx)).toBe(true);
    });
    it('returns false when value is not in set', () => {
      expect(evaluate({ var: 'stage', in: ['dormant', 'harvest'] }, ctx)).toBe(false);
    });
  });

  // ── var-vs-var ────────────────────────────────────────────

  describe('gt_var', () => {
    it('returns true when ctx.var > ctx.ref', () => {
      expect(evaluate({ var: 'Tmoy_Q25', gt_var: 'Tmoy' }, ctx)).toBe(true); // 20 > 18
    });
    it('returns false when not greater', () => {
      expect(evaluate({ var: 'Tmoy', gt_var: 'Tmoy_Q25' }, ctx)).toBe(false); // 18 > 20
    });
  });

  describe('lt_var', () => {
    it('returns true when ctx.var < ctx.ref', () => {
      expect(evaluate({ var: 'Tmoy', lt_var: 'Tmoy_Q25' }, ctx)).toBe(true); // 18 < 20
    });
    it('returns false when not less', () => {
      expect(evaluate({ var: 'Tmoy_Q25', lt_var: 'Tmoy' }, ctx)).toBe(false); // 20 < 18
    });
    it('applies factor', () => {
      // ctx.NIRv (0.5) < ctx.NIRv_mean (1.0) * 0.6 = 0.6 → true
      expect(evaluate({ var: 'NIRv', lt_var: 'NIRv_mean', factor: 0.6 }, ctx)).toBe(true);
    });
    it('applies factor making comparison false', () => {
      // ctx.NIRv (0.5) < ctx.NIRv_mean (1.0) * 0.4 = 0.4 → false
      expect(evaluate({ var: 'NIRv', lt_var: 'NIRv_mean', factor: 0.4 }, ctx)).toBe(false);
    });
    it('returns false when reference variable is missing', () => {
      expect(evaluate({ var: 'Tmoy', lt_var: 'nonexistent' }, ctx)).toBe(false);
    });
  });

  describe('gte_var', () => {
    it('returns true when equal', () => {
      expect(evaluate({ var: 'Tmoy', gte_var: 'Tmoy' }, ctx)).toBe(true);
    });
  });

  describe('lte_var', () => {
    it('returns true when equal', () => {
      expect(evaluate({ var: 'Tmoy', lte_var: 'Tmoy' }, ctx)).toBe(true);
    });
  });

  // ── Boolean combinators ───────────────────────────────────

  describe('and', () => {
    it('returns true when all clauses are true', () => {
      expect(
        evaluate(
          { and: [{ var: 'GDD_cumul', gte: 350 }, { var: 'active', eq: true }] },
          ctx,
        ),
      ).toBe(true);
    });
    it('returns false when one clause is false', () => {
      expect(
        evaluate(
          { and: [{ var: 'GDD_cumul', gte: 350 }, { var: 'active', eq: false }] },
          ctx,
        ),
      ).toBe(false);
    });
  });

  describe('or', () => {
    it('returns true when one clause is true', () => {
      expect(
        evaluate(
          { or: [{ var: 'GDD_cumul', gte: 9999 }, { var: 'active', eq: true }] },
          ctx,
        ),
      ).toBe(true);
    });
    it('returns false when no clause is true', () => {
      expect(
        evaluate(
          { or: [{ var: 'GDD_cumul', gte: 9999 }, { var: 'active', eq: false }] },
          ctx,
        ),
      ).toBe(false);
    });
  });

  describe('not', () => {
    it('negates a true clause', () => {
      expect(evaluate({ not: { var: 'active', eq: true } }, ctx)).toBe(false);
    });
    it('negates a false clause', () => {
      expect(evaluate({ not: { var: 'active', eq: false } }, ctx)).toBe(true);
    });
  });

  // ── Nested combinators ────────────────────────────────────

  describe('nested and+or', () => {
    it('evaluates nested structure', () => {
      const condition = {
        and: [
          { var: 'GDD_cumul', gte: 350 },
          {
            or: [
              { var: 'stage', in: ['flowering'] },
              { var: 'humidity', gt: 80 },
            ],
          },
        ],
      };
      expect(evaluate(condition, ctx)).toBe(true);
    });

    it('returns false in nested structure when inner or fails', () => {
      const condition = {
        and: [
          { var: 'GDD_cumul', gte: 350 },
          {
            or: [
              { var: 'stage', in: ['dormant'] },
              { var: 'humidity', gt: 80 },
            ],
          },
        ],
      };
      expect(evaluate(condition, ctx)).toBe(false);
    });
  });

  // ── Missing variable ──────────────────────────────────────

  describe('missing variable', () => {
    it('returns false when variable is missing from context', () => {
      expect(evaluate({ var: 'nonexistent', gte: 10 }, ctx)).toBe(false);
    });
  });

  // ── Bare array ────────────────────────────────────────────

  describe('bare array', () => {
    it('throws when condition is an array', () => {
      expect(() =>
        evaluate([{ var: 'x', eq: 1 }] as any, ctx),
      ).toThrow('Condition must be an object with and/or/not/var key, not an array');
    });
  });

  // ── Diagnostics ───────────────────────────────────────────

  describe('diagnostics', () => {
    it('records atomic clause results', () => {
      const diag: DiagnosticEntry[] = [];
      evaluate(
        { and: [{ var: 'GDD_cumul', gte: 350 }, { var: 'Tmoy', lt: 15 }] },
        ctx,
        diag,
      );
      expect(diag).toHaveLength(2);
      expect(diag[0]).toEqual({
        var: 'GDD_cumul',
        op: 'gte',
        expected: 350,
        actual: 400,
        result: true,
      });
      expect(diag[1]).toEqual({
        var: 'Tmoy',
        op: 'lt',
        expected: 15,
        actual: 18,
        result: false,
      });
    });

    it('does not record when diagnostics is undefined', () => {
      // Just ensure no error is thrown
      const result = evaluate({ var: 'GDD_cumul', gte: 350 }, ctx);
      expect(result).toBe(true);
    });

    it('records var-vs-var diagnostics', () => {
      const diag: DiagnosticEntry[] = [];
      evaluate({ var: 'Tmoy', lt_var: 'Tmoy_Q25' }, ctx, diag);
      expect(diag).toHaveLength(1);
      expect(diag[0]).toEqual({
        var: 'Tmoy',
        op: 'lt_var',
        expected: 20, // Tmoy_Q25 * 1.0
        actual: 18,
        result: true,
      });
    });
  });
});
