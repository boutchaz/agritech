export interface DiagnosticEntry {
  var: string;
  op: string;
  expected: unknown;
  actual: unknown;
  result: boolean;
}

const VAR_OPS = ['gt_var', 'gte_var', 'lt_var', 'lte_var'] as const;
const CONST_OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in'] as const;

type VarOp = (typeof VAR_OPS)[number];
type ConstOp = (typeof CONST_OPS)[number];

function evaluateConstOp(
  op: ConstOp,
  actual: unknown,
  expected: unknown,
): boolean {
  switch (op) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'gt':
      return (actual as number) > (expected as number);
    case 'gte':
      return (actual as number) >= (expected as number);
    case 'lt':
      return (actual as number) < (expected as number);
    case 'lte':
      return (actual as number) <= (expected as number);
    case 'between': {
      const [lo, hi] = expected as [number, number];
      const v = actual as number;
      return v >= lo && v <= hi;
    }
    case 'in':
      return (expected as unknown[]).includes(actual);
    default:
      return false;
  }
}

function evaluateVarOp(
  op: VarOp,
  actual: number,
  refValue: number,
): boolean {
  switch (op) {
    case 'gt_var':
      return actual > refValue;
    case 'gte_var':
      return actual >= refValue;
    case 'lt_var':
      return actual < refValue;
    case 'lte_var':
      return actual <= refValue;
    default:
      return false;
  }
}

export function evaluate(
  condition: Record<string, unknown>,
  context: Record<string, unknown>,
  diagnostics?: DiagnosticEntry[],
): boolean {
  if (Array.isArray(condition)) {
    throw new Error(
      'Condition must be an object with and/or/not/var key, not an array',
    );
  }

  // Boolean combinators
  if ('and' in condition) {
    const clauses = condition.and as Record<string, unknown>[];
    return clauses.every((c) => evaluate(c, context, diagnostics));
  }

  if ('or' in condition) {
    const clauses = condition.or as Record<string, unknown>[];
    return clauses.some((c) => evaluate(c, context, diagnostics));
  }

  if ('not' in condition) {
    return !evaluate(
      condition.not as Record<string, unknown>,
      context,
      diagnostics,
    );
  }

  // Atomic clause — must have "var"
  const varName = condition.var as string;
  if (!(varName in context)) {
    // Check all possible ops to push diagnostic
    const op = findOp(condition);
    if (diagnostics && op) {
      diagnostics.push({
        var: varName,
        op,
        expected: condition[op],
        actual: undefined,
        result: false,
      });
    }
    return false;
  }

  const actual = context[varName];

  // Variable-vs-variable ops
  for (const op of VAR_OPS) {
    if (op in condition) {
      const refName = condition[op] as string;
      if (!(refName in context)) {
        if (diagnostics) {
          diagnostics.push({
            var: varName,
            op,
            expected: undefined,
            actual,
            result: false,
          });
        }
        return false;
      }
      const factor = (condition.factor as number) ?? 1.0;
      const refValue = (context[refName] as number) * factor;
      const result = evaluateVarOp(op, actual as number, refValue);
      if (diagnostics) {
        diagnostics.push({
          var: varName,
          op,
          expected: refValue,
          actual,
          result,
        });
      }
      return result;
    }
  }

  // Constant ops
  for (const op of CONST_OPS) {
    if (op in condition) {
      const expected = condition[op];
      const result = evaluateConstOp(op, actual, expected);
      if (diagnostics) {
        diagnostics.push({
          var: varName,
          op,
          expected,
          actual,
          result,
        });
      }
      return result;
    }
  }

  return false;
}

function findOp(condition: Record<string, unknown>): string | undefined {
  for (const op of VAR_OPS) {
    if (op in condition) return op;
  }
  for (const op of CONST_OPS) {
    if (op in condition) return op;
  }
  return undefined;
}
