import { apiRequest } from './api-client';

export interface ReferentialSummary {
  crop: string;
  fileName: string;
  version: string;
  date: string;
  sections: string[];
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

  create(crop: string, data: Record<string, unknown>): Promise<{ success: boolean; crop: string }> {
    return apiRequest<{ success: boolean; crop: string }>('/api/v1/admin/referentials', {
      method: 'POST',
      body: JSON.stringify({ crop, data }),
    });
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
