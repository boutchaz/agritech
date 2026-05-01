import { apiRequest } from './api-client';

export interface ReferentialSummary {
  crop: string;
  version: string;
  date: string;
  sections: string[];
}

export interface ValidationError {
  path: string;
  message: string;
}

export const referentialApi = {
  list(): Promise<ReferentialSummary[]> {
    return apiRequest<ReferentialSummary[]>('/api/v1/admin/referentials');
  },

  get(crop: string): Promise<Record<string, unknown>> {
    return apiRequest<Record<string, unknown>>(`/api/v1/admin/referentials/${crop}`);
  },

  getSection(crop: string, section: string): Promise<unknown> {
    return apiRequest<unknown>(`/api/v1/admin/referentials/${crop}/${section}`);
  },

  updateSection(crop: string, section: string, value: unknown): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/v1/admin/referentials/${crop}/${section}`, {
      method: 'PUT',
      body: JSON.stringify(value),
    });
  },

  update(crop: string, value: unknown): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/v1/admin/referentials/${crop}`, {
      method: 'PUT',
      body: JSON.stringify(value),
    });
  },

  validateSection(crop: string, section: string, value: unknown): Promise<{ valid: boolean; errors: ValidationError[] }> {
    return apiRequest<{ valid: boolean; errors: ValidationError[] }>(
      `/api/v1/admin/referentials/${crop}/${section}/validate`,
      { method: 'POST', body: JSON.stringify(value) },
    );
  },

  validate(crop: string, value: unknown): Promise<{ valid: boolean; errors: ValidationError[] }> {
    return apiRequest<{ valid: boolean; errors: ValidationError[] }>(
      `/api/v1/admin/referentials/${crop}/validate`,
      { method: 'POST', body: JSON.stringify(value) },
    );
  },

  create(crop: string, template?: string): Promise<{ success: boolean; crop: string }> {
    return apiRequest<{ success: boolean; crop: string }>('/api/v1/admin/referentials', {
      method: 'POST',
      body: JSON.stringify({ crop, template }),
    });
  },
};

// --- Reference Data (tables like account_templates, modules, roles, etc.) ---

export type ReferenceDataTable =
  | 'account_templates'
  | 'account_mappings'
  | 'modules'
  | 'currencies'
  | 'roles'
  | 'work_units';

export interface ImportResult {
  success: boolean;
  dryRun: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: Array<{ row: number; error: string }>;
  jobId?: string;
}

export interface DiffResult {
  table: string;
  fromVersion: string;
  toVersion: string;
  added: number;
  modified: number;
  removed: number;
  changes: Array<{
    type: 'added' | 'modified' | 'removed';
    id: string;
    field?: string;
    oldValue?: unknown;
    newValue?: unknown;
  }>;
}

export interface PublishResult {
  success: boolean;
  publishedCount: number;
  unpublishedCount: number;
  errors: Array<{ id: string; error: string }>;
}

export const refDataApi = {
  getData(table: ReferenceDataTable, query?: Record<string, string>) {
    const params = query ? '?' + new URLSearchParams(query).toString() : '';
    return apiRequest<{ data: Record<string, unknown>[]; total: number }>(
      `/api/v1/admin/ref/${table}${params}`,
    );
  },

  diff(table: ReferenceDataTable, fromVersion?: string, toVersion?: string) {
    const params = new URLSearchParams();
    if (fromVersion) params.set('fromVersion', fromVersion);
    if (toVersion) params.set('toVersion', toVersion);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<DiffResult>(`/api/v1/admin/ref/${table}/diff${qs}`);
  },

  import(table: ReferenceDataTable, rows: Record<string, unknown>[], options?: { dryRun?: boolean; updateExisting?: boolean; version?: string }) {
    return apiRequest<ImportResult>('/api/v1/admin/ref/import', {
      method: 'POST',
      body: JSON.stringify({
        table,
        rows: rows.map((data) => ({ data })),
        dryRun: options?.dryRun ?? false,
        updateExisting: options?.updateExisting ?? false,
        version: options?.version,
      }),
    });
  },

  publish(table: ReferenceDataTable, ids: string[], unpublish = false) {
    return apiRequest<PublishResult>('/api/v1/admin/ref/publish', {
      method: 'POST',
      body: JSON.stringify({ table, ids, unpublish }),
    });
  },

  seedAccounts(organizationId: string, chartType: string, version?: string) {
    return apiRequest<{ success: boolean; accountsCreated: number; message: string }>(
      '/api/v1/admin/ref/seed-accounts',
      {
        method: 'POST',
        body: JSON.stringify({ organizationId, chartType, version }),
      },
    );
  },
};

const CROP_LABELS: Record<string, string> = {
  olivier: 'Olivier',
  agrumes: 'Agrumes',
  avocatier: 'Avocatier',
  palmier_dattier: 'Palmier Dattier',
};

export function getCropLabel(crop: string): string {
  return CROP_LABELS[crop] ?? crop;
}

const SECTION_LABELS: Record<string, string> = {
  metadata: 'Métadonnées',
  phases_maturite_ans: 'Phases de maturité',
  varietes: 'Variétés',
  systemes: 'Systèmes de plantation',
  seuils_satellite: 'Seuils satellite',
  stades_bbch: 'Stades BBCH',
  kc: 'Coefficients Kc',
  kc_par_periode: 'Kc par période',
  options_nutrition: 'Options nutrition',
  export_npk_kg_par_tonne_fruit: 'Export NPK',
  entretien_kg_ha: 'Entretien kg/ha',
  fractionnement_pct: 'Fractionnement %',
  ajustement_alternance: 'Ajustement alternance',
  ajustement_cible: 'Ajustement cible',
  seuils_foliaires: 'Seuils foliaires',
  seuils_eau: 'Seuils eau',
  fraction_lessivage: 'Fraction lessivage',
  biostimulants: 'Biostimulants',
  calendrier_biostimulants: 'Calendrier biostimulants',
  alertes: 'Alertes',
  phytosanitaire: 'Phytosanitaire',
  calendrier_phyto: 'Calendrier phyto',
  modele_predictif: 'Modèle prédictif',
  plan_annuel: 'Plan annuel',
  couts_indicatifs_DH: 'Coûts indicatifs (DH)',
  gdd: 'GDD (Growing Degree Days)',
  formes_engrais: 'Formes d\'engrais',
  microelements: 'Micro-éléments',
  rdi: 'RDI (Regulated Deficit Irrigation)',
  co_occurrence: 'Co-occurrence',
  protocole_phenologique: 'Protocole phénologique',
  rendement_t_ha: 'Rendement t/ha',
  stades_phenologiques: 'Stades phénologiques',
  irrigation: 'Irrigation',
  nutrition: 'Nutrition',
  especes: 'Espèces',
  porte_greffes: 'Porte-greffes',
  guide_choix_pg: 'Guide choix porte-greffe',
  exigences_climatiques: 'Exigences climatiques',
  exigences_sol: 'Exigences sol',
};

export function getSectionLabel(section: string): string {
  return SECTION_LABELS[section] ?? section.replace(/_/g, ' ');
}
