import i18n from '@/i18n/config';

const NS = 'ai' as const;

export type AnnualPlanUiStatus = 'draft' | 'validated' | 'active' | 'archived' | string | undefined;

/** Localized label for annual plan workflow status (draft / validated / …). */
export function annualPlanStatusLabel(status: AnnualPlanUiStatus): string {
  if (!status) {
    return i18n.t('planStatus.none', { ns: NS });
  }
  return i18n.t(`planStatus.${status}`, {
    ns: NS,
    defaultValue: i18n.t('planStatus.unknown', { ns: NS }),
  });
}

export type PlanInterventionUiStatus =
  | 'planned'
  | 'executed'
  | 'skipped'
  | 'delayed'
  | 'pending'
  | string;

/** Localized label for a plan intervention row (planned / executed / …). */
export function planInterventionStatusLabel(status: PlanInterventionUiStatus): string {
  return i18n.t(`interventionStatus.${status}`, {
    ns: NS,
    defaultValue: String(status).replace(/_/g, ' '),
  });
}

/** Short month label (1–12) in the active UI language. */
export function planMonthShort(month1to12: number): string {
  if (month1to12 < 1 || month1to12 > 12) {
    return i18n.t('planStatus.none', { ns: NS });
  }
  return i18n.t(`months.short.${month1to12}`, { ns: NS });
}

/**
 * Readable title from API `intervention_type` (often joined keys).
 */
export function planInterventionTitle(interventionType: string): string {
  if (!interventionType || interventionType.trim() === '') {
    return i18n.t('interventionDefault', { ns: NS });
  }

  const normalized = interventionType.toLowerCase().replace(/\s+/g, '_');
  const single = i18n.t(`interventionTypeParts.${normalized}`, {
    ns: NS,
    defaultValue: '__missing__',
  });
  if (single !== '__missing__') {
    return single;
  }

  const parts = interventionType.split(/[+_]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return i18n.t('interventionDefault', { ns: NS });
  }

  return parts
    .map((p) => {
      const key = p.toLowerCase();
      const tr = i18n.t(`interventionTypeParts.${key}`, {
        ns: NS,
        defaultValue: '__missing__',
      });
      if (tr !== '__missing__') {
        return tr;
      }
      return p.charAt(0).toUpperCase() + p.slice(1).replace(/_/g, ' ');
    })
    .join(' · ');
}
