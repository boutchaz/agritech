import type { AIPlanIntervention } from '@/lib/api/ai-plan';

type PlanT = (key: string, options?: Record<string, unknown>) => string;

/** Parse `plan_interventions.notes` (JSON of referential components). */
export function parsePlanInterventionNotes(
  notes: string | null | undefined,
): Record<string, string> | null {
  if (!notes?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(notes) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v === null || v === undefined || v === '') {
        continue;
      }
      out[k] = String(v);
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

function humanizeToken(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function componentKeyLabel(key: string, t: PlanT): string {
  const k = key.toLowerCase();
  const translated = t(`plan.calendar.componentKeys.${k}`, { defaultValue: '__MISSING__' });
  if (translated !== '__MISSING__') {
    return translated;
  }
  return humanizeToken(key);
}

function componentValueLabel(key: string, value: string, t: PlanT): string {
  const kk = key.toLowerCase();
  const vv = value.toLowerCase().replace(/\s+/g, '_');
  const nested = t(`plan.calendar.valueHints.${kk}.${vv}`, { defaultValue: '__MISSING__' });
  if (nested !== '__MISSING__') {
    return nested;
  }
  return humanizeToken(value);
}

export interface FarmerPlanInterventionCopy {
  intro: string;
  bullets: string[];
  /** Raw API description (key=value) for optional disclosure. */
  technicalLine: string | null;
}

export function getFarmerPlanInterventionCopy(
  intervention: AIPlanIntervention,
  t: PlanT,
): FarmerPlanInterventionCopy {
  const monthLong = t(`months.long.${intervention.month}`);
  const components = parsePlanInterventionNotes(intervention.notes);
  const technicalLine = intervention.description?.trim() || null;

  if (!components) {
    if (technicalLine) {
      return {
        intro: t('plan.calendar.unstructuredMonth', { month: monthLong }),
        bullets: [],
        technicalLine,
      };
    }
    return {
      intro: t('plan.calendar.emptyMonthGuidance', { month: monthLong }),
      bullets: [],
      technicalLine: null,
    };
  }

  const intro = t('plan.calendar.monthIntro', { month: monthLong });
  const bullets = Object.entries(components).map(([key, value]) => {
    const label = componentKeyLabel(key, t);
    const detail = componentValueLabel(key, value, t);
    return t('plan.calendar.bulletItem', { label, detail });
  });

  return { intro, bullets, technicalLine };
}

