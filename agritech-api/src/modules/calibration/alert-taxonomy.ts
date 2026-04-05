/**
 * Alert taxonomy — V2 aligned with DATA_{CULTURE}_v5.json referentiels.
 * Each alert has structured seuil_entree/seuil_sortie and prescription.
 */

export type AlertPriority = 'urgent' | 'priority' | 'vigilance' | 'info';

export interface AlertCondition {
  indice: string;
  operateur: string;
  valeur: number | string;
  passages_requis?: number;
}

export interface AlertPrescription {
  action: string;
  dose: string;
  duree: string;
  plafond: string;
  condition_blocage: string;
  conditions_meteo: string;
  fenetre_bbch: string;
  suivi: {
    indicateur: string;
    reponse_attendue: string;
    delai_j: string;
  };
  impact_plan: string;
}

export interface AlertDefinition {
  code: string;
  culture: string;
  nom: string;
  priority: AlertPriority;
  systeme?: string;
  seuil_entree: AlertCondition[];
  seuil_sortie: AlertCondition[];
  prescription: AlertPrescription;
  requires_immediate_notification: boolean;
  irreversible: boolean;
  // Legacy fields for backward compatibility
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title_en: string;
  title_fr: string;
  title_ar: string;
}

const PRIORITY_TO_SEVERITY: Record<AlertPriority, 'critical' | 'high' | 'medium' | 'low'> = {
  urgent: 'critical',
  priority: 'high',
  vigilance: 'medium',
  info: 'low',
};

const IRREVERSIBLE_ALERTS = new Set(['OLI-06', 'OLI-11', 'OLI-17']);

/**
 * Build alert taxonomy from referentiel alertes array.
 * Called once per culture, results cached.
 */
function buildFromReferentiel(
  culture: string,
  alertes: Array<Record<string, unknown>>,
): AlertDefinition[] {
  return alertes.map((a) => {
    const code = a.code as string;
    const nom = a.nom as string;
    const priorite = a.priorite as string;
    const priority = mapPriority(priorite);

    return {
      code,
      culture,
      nom,
      priority,
      systeme: (a.systeme as string) ?? undefined,
      seuil_entree: (a.seuil_entree as AlertCondition[]) ?? [],
      seuil_sortie: (a.seuil_sortie as AlertCondition[]) ?? [],
      prescription: (a.prescription as AlertPrescription) ?? {} as AlertPrescription,
      requires_immediate_notification: priority === 'urgent',
      irreversible: IRREVERSIBLE_ALERTS.has(code),
      severity: PRIORITY_TO_SEVERITY[priority],
      category: inferCategory(code),
      title_en: nom,
      title_fr: nom,
      title_ar: nom,
    };
  });
}

function mapPriority(priorite: string): AlertPriority {
  switch (priorite) {
    case 'urgente': return 'urgent';
    case 'prioritaire': return 'priority';
    case 'vigilance': return 'vigilance';
    case 'info': return 'info';
    default: return 'info';
  }
}

function inferCategory(code: string): string {
  const categoryMap: Record<string, string> = {
    'OLI-01': 'hydric_stress', 'OLI-02': 'hydric_stress', 'OLI-12': 'hydric_stress',
    'OLI-03': 'frost', 'OLI-07': 'climate', 'OLI-08': 'climate', 'OLI-15': 'climate',
    'OLI-04': 'disease', 'OLI-05': 'pest', 'OLI-06': 'disease', 'OLI-18': 'phyto',
    'OLI-09': 'phenology', 'OLI-13': 'phenology', 'OLI-14': 'phenology',
    'OLI-10': 'vegetation', 'OLI-11': 'vegetation', 'OLI-17': 'vegetation',
    'OLI-16': 'nutrition',
    'OLI-19': 'salinity', 'OLI-20': 'salinity',
  };
  return categoryMap[code] ?? 'other';
}

// ═══════════════════════════════════════════════════════════════
// STATIC TAXONOMY (loaded from referentiel at module init)
// ═══════════════════════════════════════════════════════════════

let taxonomyCache: AlertDefinition[] | null = null;

function loadTaxonomy(): AlertDefinition[] {
  if (taxonomyCache) return taxonomyCache;

  try {
    const { getLocalCropReference } = require('./crop-reference-loader');

    const cultures = ['olivier', 'agrumes', 'avocatier', 'palmier_dattier'];
    const all: AlertDefinition[] = [];

    for (const culture of cultures) {
      const ref = getLocalCropReference(culture);
      if (ref?.alertes && Array.isArray(ref.alertes)) {
        all.push(...buildFromReferentiel(culture, ref.alertes as Array<Record<string, unknown>>));
      }
    }

    taxonomyCache = all;
    return all;
  } catch {
    // Fallback: return empty — referentials not loaded yet
    return [];
  }
}

export const ALERT_TAXONOMY: AlertDefinition[] = new Proxy([] as AlertDefinition[], {
  get(target, prop) {
    const loaded = loadTaxonomy();
    if (prop === 'length') return loaded.length;
    if (prop === Symbol.iterator) return loaded[Symbol.iterator].bind(loaded);
    if (typeof prop === 'string' && !isNaN(Number(prop))) return loaded[Number(prop)];
    if (typeof prop === 'string') {
      const method = (loaded as any)[prop];
      return typeof method === 'function' ? method.bind(loaded) : method;
    }
    return (loaded as any)[prop as any];
  },
});

export function getAlertsForCulture(cultureKey: string): AlertDefinition[] {
  return loadTaxonomy().filter((a) => a.culture === cultureKey);
}

export function getAlertByCode(code: string): AlertDefinition | undefined {
  return loadTaxonomy().find((a) => a.code === code);
}

export function getCriticalAlerts(): AlertDefinition[] {
  return loadTaxonomy().filter((a) => a.requires_immediate_notification);
}

export function getIrreversibleAlerts(): AlertDefinition[] {
  return loadTaxonomy().filter((a) => a.irreversible);
}

export function reloadAlertTaxonomy(): void {
  taxonomyCache = null;
}
