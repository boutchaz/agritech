/**
 * TYPES — AgromindIA v3.0
 * Contrats de données entre les étapes du workflow
 * Version : 3.0 — Avril 2026
 */

// ---------------------------------------------------------------------------
// TYPES COMMUNS
// ---------------------------------------------------------------------------

export type Culture = 'olivier' | 'agrumes' | 'avocatier' | 'palmier_dattier';
export type Systeme = 'traditionnel' | 'traditionnel_oasien' | 'semi_intensif' | 'intensif' | 'super_intensif';
export type AnneeCycle = 'ON' | 'OFF' | 'indefini' | 'NA';
export type OptionNutrition = 'A' | 'B' | 'C';
export type PrioriteAlerte = 'urgente' | 'prioritaire' | 'vigilance' | 'info';
export type EtatSignal = 'SIGNAL_PUR' | 'MIXTE_MODERE' | 'DOMINE_ADVENTICES' | 'N/A';
export type NiveauConfiance = '⭐' | '⭐⭐' | '⭐⭐⭐';

export interface Dose {
  valeur: number | [number, number];
  unite: string;
}

export interface IndicesSatellite {
  NDVI: number;
  NIRv: number;
  NDMI: number;
  NDRE: number;
  EVI?: number;
  MSAVI?: number;
  MSI?: number;
  GCI?: number;
  NIRvP?: number;
}

export interface Percentiles {
  P10: number;
  P25: number;
  P50: number;
  P75: number;
  P90: number;
}

// ---------------------------------------------------------------------------
// CYCLE DE VIE RECOMMANDATIONS
// ---------------------------------------------------------------------------

/** 8 états pour les recommandations réactives */
export type StatutRecommandationReactive =
  | 'PROPOSEE'
  | 'VALIDEE'
  | 'EN_ATTENTE'
  | 'EXECUTEE'
  | 'EVALUEE'
  | 'CLOTUREE'
  | 'REJETEE'
  | 'EXPIREE';

/** 5 états pour les recommandations planifiées */
export type StatutRecommandationPlanifiee =
  | 'PROGRAMMEE'
  | 'RAPPELEE'
  | 'EXECUTEE'
  | 'EVALUEE'
  | 'CLOTUREE';

export interface TransitionCycleVie {
  de: StatutRecommandationReactive;
  vers: StatutRecommandationReactive;
  date: string;
  decideur: 'IA' | 'Exploitant';
  motif?: string;
}

/** Résultat d'évaluation post-application */
export type ResultatEvaluation = 'EFFICACE' | 'PARTIELLEMENT_EFFICACE' | 'NON_EFFICACE';

// ---------------------------------------------------------------------------
// STRUCTURE 6 BLOCS OBLIGATOIRE PAR RECOMMANDATION
// ---------------------------------------------------------------------------

export interface Bloc1ConstatlSpectral {
  valeurs_indices: Record<string, number>;
  position_baseline: Record<string, string>;   // ex: {NDMI: "P10-P25"}
  tendance_3_passages: Record<string, string>;  // ex: {NDMI: "baisse"}
  passages_confirmant: number;
  coherence_inter_indices: string;
}

export interface Bloc2Diagnostic {
  hypothese_principale: string;
  alternatives: string[];
  facteurs_concordants: string[];
  facteurs_discordants: string[];
  confiance: NiveauConfiance;
  donnees_manquantes_si_faible?: string[];
}

export interface Bloc3Action {
  description: string;
  produit: string | null;
  dose: Dose | null;
  methode: string;
  zone_ciblee?: string;
  condition_blocage_verifie: boolean;
  blocage_actif: string | null;
}

export interface Bloc4Fenetre {
  priorite: '🔴' | '🟠' | '🟡' | '🟢';
  periode_optimale: string;
  date_limite: string;
  expiration_regles: string;
}

export interface Bloc5ConditionsMeteo {
  temperature_c: string;
  HR_pct?: string;
  vent_km_h?: string;
  autres?: string;
  meteo_j7_compatible: boolean;
  statut: 'applicable' | 'en_attente_meteo';
}

export interface Bloc6Suivi {
  delai_evaluation_j: string;
  indicateur: string;
  reponse_attendue: string;
  fenetre_evaluation_type?: string;
}

/** Recommandation complète en 6 blocs */
export interface RecommandationComplete {
  recommandation_id: string;
  parcelle_id: string;
  alerte_code: string;
  type: 'irrigation' | 'fertilisation' | 'phytosanitaire' | 'taille' | 'information' | 'autre';
  type_recommandation: 'REACTIVE' | 'PLANIFIEE';
  statut: StatutRecommandationReactive | StatutRecommandationPlanifiee;
  priorite: PrioriteAlerte;
  date_creation: string;
  date_expiration?: string;

  bloc_1_constat: Bloc1ConstatlSpectral;
  bloc_2_diagnostic: Bloc2Diagnostic;
  bloc_3_action: Bloc3Action;
  bloc_4_fenetre: Bloc4Fenetre;
  bloc_5_conditions_meteo: Bloc5ConditionsMeteo;
  bloc_6_suivi: Bloc6Suivi;

  mention_responsabilite: string;
  co_occurrence_code?: string;
  historique_transitions: TransitionCycleVie[];
  motif_rejet?: string;
  resultat_evaluation?: ResultatEvaluation;
  note_evaluation?: string;
}

// ---------------------------------------------------------------------------
// CALIBRAGE
// ---------------------------------------------------------------------------

export interface CalibrageInput {
  profil: {
    parcelle_id: string;
    culture: Culture;
    variete: string;
    systeme: Systeme;
    age_ans: number;
    densite_arbres_ha: number;
    surface_ha: number;
    irrigation: { type: string; efficience: number; volume_annuel_mm?: number };
    localisation: { lat: number; lng: number; region: string };
    langue: 'fr' | 'ar' | 'ber';
    cible_production?: 'huile_qualite' | 'olive_table' | 'mixte';
    // Champs questionnaire Simo
    adventices?: 'oui' | 'non_sol_nu' | 'couvert_seme' | 'inconnu';
    changement_recent?: 'non' | 'changement_irrigation' | 'taille_severe' | 'autre';
    taille_rajeunissement?: { annee?: number } | null;
    terrain_disponible?: 'oui' | 'partiellement' | 'non';
    superficie_classe?: '<0.5ha' | '0.5-2ha' | '2-10ha' | '>10ha';
  };
  satellite_history: Array<{
    date: string;
    indices: IndicesSatellite;
    nb_pixels_purs: number;
    couverture_nuageuse_pct: number;
  }>;
  meteo_history: Array<{
    date: string;
    Tmin: number; Tmax: number; Tmoy: number;
    precip_mm: number; ETP_mm: number;
    HR_pct: number; vent_km_h: number;
    PAR_MJ_m2?: number;
  }>;
  analyses?: {
    sol?: Record<string, number>;
    eau?: Record<string, number>;
    foliaire?: Record<string, number>;
  };
  historique_rendements?: Array<{
    annee: number;
    rendement_t_ha: number;
    notes?: string;
  }>;
}

export interface MessageAmelioration {
  donnee: 'analyse_sol' | 'analyse_eau' | 'analyse_foliaire' | 'historique_rendements';
  gain_confiance_pts: number;
  message: string;
}

export interface CalibrageOutput {
  calibrage_id: string;
  parcelle_id: string;
  culture: Culture;
  date_calibrage: string;
  phase_age: {
    phase: 'juvenile' | 'entree_production' | 'pleine_production' | 'senescence';
    age_ans: number;
    entree_production_annee: [number, number];
    pleine_production_annee: [number, number];
    duree_vie_economique_ans: [number, number];
    label: string;
  };
  mode_calibrage: 'lecture_pure' | 'calibrage_progressif' | 'calibrage_complet' | 'calibrage_avec_signalement' | 'collecte_donnees' | 'age_manquant';
  mode_amorcage: boolean;
  nb_cycles_complets: number;
  statut: 'valide' | 'insuffisant' | 'en_attente' | 'collecte_donnees' | 'age_manquant';

  scores: {
    sante_global: number;
    sante_detail: {
      vigueur_vegetative: number;
      homogeneite_spatiale: number;
      stabilite_temporelle: number;
      etat_hydrique: number;
      etat_nutritionnel: number;
    };
    confiance_global: number;
    confiance_bloc_A: { profondeur_satellite_pts: number; coherence_pts: number; total: number };
    confiance_bloc_B: { sol_pts: number; eau_pts: number; foliaire_pts: number; rendements_pts: number; profil_pts: number; total: number };
  };

  profil_reel: {
    systeme: Systeme;
    variete: string;
    age_ans: number;
    densite_arbres_ha: number;
    surface_ha: number;
    rendement_historique_t_ha: number[] | null;
    annee_cycle: AnneeCycle;
  };

  baseline: {
    disponible: boolean;
    note_si_indisponible: string | null;
    etat_signal: EtatSignal;
    percentiles: {
      NDVI: Percentiles; NIRv: Percentiles; NDMI: Percentiles; NDRE: Percentiles;
    };
    phenologie_historique: Array<{
      phase_ou_stade: string;
      gdd_moyen: number;
      date_typique_MM_DD: string;
      variabilite_jours: number;
      confiance: string;
    }>;
    zones_intraparcellaires: { A_pct: number; B_pct: number; C_pct: number; D_pct: number; E_pct: number };
  };

  potentiel_rendement: {
    fourchette_t_ha: [number, number];
    fourchette_kg_arbre: [number, number];
    methode: 'historique_reel' | 'satellite_model' | 'referentiel_age';
    coefficient_etat_parcelle: number;
    note: string;
  };

  diagnostic_explicatif: {
    etat_global: 'optimale' | 'correcte' | 'degradee';
    ecarts: Array<{
      dimension: 'hydrique' | 'nutritionnel' | 'phenologique' | 'vigueur' | 'autre';
      observation: string;
      cause_probable: string;
      certitude: 'confirme' | 'probable' | 'a_verifier_terrain';
      impact_rendement_pct: number;
    }>;
    resume_pourquoi: string;
  };

  anomalies_detectees: Array<{
    date_debut: string;
    date_fin: string;
    type: string;
    description: string;
    triple_confirmation: { meteo: boolean; satellite: boolean; utilisateur: boolean };
    exclue_des_percentiles: boolean;
  }>;

  donnees_manquantes: string[];
  message_amelioration: MessageAmelioration[];
  incoherences: string[];
  validation_utilisateur_requise: boolean;
  signalement_senescence: string | null;

  rapport_agriculteur: {
    langue: 'fr' | 'ar' | 'ber';
    score_label: string;
    score_icone: string;
    texte_complet: string;
  };
}

// ---------------------------------------------------------------------------
// MOTEUR OPÉRATIONNEL
// ---------------------------------------------------------------------------

export interface OperationnelInput {
  baseline: CalibrageOutput;
  satellite_actuel?: {
    date: string;
    indices: IndicesSatellite;
    nb_pixels_purs: number;
  };
  meteo: {
    historique_30j: Array<{ date: string; Tmin: number; Tmax: number; precip_mm: number; HR_pct: number; ETP_mm: number; vent_km_h: number }>;
    previsions_7j: Array<{ date: string; Tmin: number; Tmax: number; precip_mm: number; HR_pct: number; vent_km_h: number }>;
    gdd_cumul_saison: number;
    heures_froid_cumul?: number;
    etat_signal?: EtatSignal;
  };
  actions_declarees?: Array<{
    date: string;
    type: string;
    description: string;
    dose?: Dose;
  }>;
  recommandations_actives?: Array<{
    code: string;
    priorite: PrioriteAlerte;
    statut: StatutRecommandationReactive;
    date_emission: string;
    theme: string;
  }>;
  date_analyse: string;
}

export interface OperationnelOutput {
  analyse_id: string;
  parcelle_id: string;
  date_analyse: string;
  chemin: 'A_plan_standard' | 'B_recommandations' | 'C_observation';
  statut: 'actif' | 'plan_standard_jeune' | 'observation' | 'bloque';
  phase_age: string;

  etat_actuel: {
    stade_phenologique: { code: string; nom: string; phase_kc: string; gdd_cumul: number; etat_signal: EtatSignal };
    indices: Record<string, { valeur: number; position_baseline: string; tendance: string; code_couleur: string }>;
    bilan_hydrique: { etc_mm_j: number; bilan_7j_mm: number; statut: 'deficit' | 'equilibre' | 'exces' };
  };

  alertes_actives: Array<{
    code: string;
    nom: string;
    priorite: PrioriteAlerte;
    statut_desescalade: 'nouveau' | 'maintenu' | 'en_amelioration';
    conditions_remplies: string[];
    co_occurrence_detectee: string | null;
  }>;

  recommandations: RecommandationComplete[];

  plan_annuel_standard: {
    actif: boolean;
    calendrier_mensuel: Record<string, any>;
    annees_avant_production: number;
    potentiel_a_maturite_t_ha: [number, number];
  };

  prevision_rendement: {
    active: boolean;
    valeur_t_ha: [number, number] | null;
    precision: string;
    facteurs_limitants: string[];
  };

  rapport_agriculteur: {
    langue: 'fr' | 'ar' | 'ber';
    texte_complet: string;
  };
}

// ---------------------------------------------------------------------------
// PLAN ANNUEL
// ---------------------------------------------------------------------------

export interface PlanAnnuelInput {
  calibrage: CalibrageOutput;
  analyses?: CalibrageInput['analyses'];
  historique_rendements?: CalibrageInput['historique_rendements'];
  eto_mensuel?: Record<string, number>;
  date_generation: string;
}

export interface PlanAnnuelOutput {
  plan_id: string;
  parcelle_id: string;
  saison: string;
  date_generation: string;
  culture: Culture;
  variete: string;
  systeme: Systeme;

  parametres_calcul: {
    rendement_cible_t_ha: number;
    methode_rendement: 'historique' | 'satellite_model';
    option_nutrition: OptionNutrition;
    option_nutrition_raison: string;
    annee_cycle: AnneeCycle;
    cible_production: string;
  };

  doses_annuelles_kg_ha: { N: number; P2O5: number; K2O: number; MgO: number };

  calendrier_mensuel: Record<string, {
    NPK: { N_kg_ha: number; P2O5_kg_ha: number; K2O_kg_ha: number };
    formes_engrais: Array<{ element: string; produit: string; quantite: Dose }>;
    microelements: Array<{ element: string; produit: string; dose: Dose; mode: string }>;
    biostimulants: Array<{ produit: string; dose: Dose; mode: string }>;
    phyto: Array<{ cible: string; produit: string; dose: Dose; conditions: string }>;
    irrigation: { volume_reference_L_arbre_j: number; kc: number; eto_moyen_mm: number; FL: number };
    travaux: string[];
  }>;

  plan_irrigation_annuel: {
    volume_total_m3_ha: number;
    detail_mensuel: Array<{ mois: string; kc: number; eto_mm: number; etc_mm: number; FL: number; volume_L_arbre_j: number }>;
  };

  prevision_recolte: {
    fenetre: { debut: string; fin: string };
    rendement_estime_t_ha: [number, number];
    im_cible?: [number, number];
  };

  budget_indicatif_dh_ha: { engrais_fertigation: number; microelements: number; biostimulants: number; phyto: number; total_estime: number };
  verifications: { fractionnement_ok: boolean; doses_plausibles: boolean; volumes_plausibles: boolean; incompatibilites_cuve: string; anomalies: string[] };
  resume: string;
}

// ---------------------------------------------------------------------------
// RECALIBRAGE
// ---------------------------------------------------------------------------

export interface RecalibrageInput {
  baseline_actuelle: CalibrageOutput;
  type: 'F2_partiel' | 'F3_complet';
  changement?: {
    type: 'source_eau' | 'regime_irrigation' | 'taille_severe' | 'arrachage' | 'replantation' | 'nouvelle_analyse' | 'autre';
    description: string;
    date: string;
    details?: Record<string, unknown>;
  };
  nouvelles_donnees?: CalibrageInput['analyses'];
  bilan_campagne?: {
    rendement_prevu: [number, number] | null;
    rendement_reel: number | null;
    applications: Array<{ date: string; type: string; dose?: Dose }>;
    evenements: string[];
    taux_reponse_recommandations?: number;
  };
  satellite_nouvelle_annee?: CalibrageInput['satellite_history'];
}

export interface RecalibrageOutput {
  recalibrage_id: string;
  parcelle_id: string;
  type: 'F2_partiel' | 'F3_complet';
  date_recalibrage: string;
  baseline_precedente: { version: string; date: string; confiance_pct: number };
  baseline_mise_a_jour: CalibrageOutput['baseline'] & {
    potentiel_rendement_t_ha: number;
    annee_cycle_N1: AnneeCycle;
  };
  confiance_mise_a_jour: { ancienne_pct: number; nouvelle_pct: number; delta_pts: number; raisons: string[] };
  composantes_modifiees: string[];
  composantes_inchangees: string[];
  bilan_campagne: {
    rendement_prevu_t_ha: [number, number] | null;
    rendement_reel_t_ha: number | null;
    ecart_pct: number | null;
    taux_reponse_recommandations?: number;
    evenements_notables: string[];
    lecons_apprises: string[];
  };
  recommandations_plan_N1: string[];
  validation_requise: boolean;
  message_utilisateur: string;
}

// ---------------------------------------------------------------------------
// LOADER RÉFÉRENTIEL
// ---------------------------------------------------------------------------

export interface ReferentielLoader {
  load(culture: Culture): Promise<object>;
  validate(referentiel: object): boolean;
}
