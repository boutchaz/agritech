type MonthCode = 'Jan' | 'Fev' | 'Mar' | 'Avr' | 'Mai' | 'Juin' | 'Juil' | 'Aout' | 'Sept' | 'Oct' | 'Nov' | 'Dec';

type NumericRange = readonly [number, number];
type NumberOrRange = number | NumericRange;
type RendementKgArbreValue = number | NumericRange | 'declin' | 'arrachage';
type AlertPriority = 'critique' | 'urgente' | 'prioritaire' | 'vigilance' | 'info';
type OliveSystemKey = 'traditionnel' | 'intensif' | 'super_intensif';
interface ThresholdBand {
  readonly optimal: NumericRange;
  readonly vigilance: number;
  readonly alerte: number;
}

interface SystemPrecision {
  readonly R2: NumericRange;
  readonly MAE_pct: NumericRange;
}

interface PredictiveVariable {
  readonly nom: string;
  readonly source: string;
  readonly poids?: NumericRange | 'fort_si_1';
  readonly critique?: boolean;
  readonly binaire?: boolean;
  readonly type?: 'ajustement' | 'conversion';
}

interface NutritionOptionBase {
  readonly nom: string;
  readonly condition: string;
  readonly description?: string;
}

interface NutrientRange {
  readonly N: NumericRange;
  readonly P2O5: NumericRange;
  readonly K2O: NumericRange;
}

interface FoliarThreshold {
  readonly unite: '%' | 'ppm';
  readonly carence: number;
  readonly suffisant: NumericRange;
  readonly optimal: NumericRange;
  readonly exces: number;
}

interface FoliarToxicThreshold {
  readonly unite: '%' | 'ppm';
  readonly toxique: number;
}

interface ReferenceMetadata<C extends CropType> {
  readonly version: string;
  readonly date: string;
  readonly culture: C;
  readonly pays: string;
}

interface YieldByAge {
  /** Maturity-phase keys (aligned with referential ``phases_maturite_ans`` / calibration engine). */
  readonly juvenile?: RendementKgArbreValue;
  readonly entree_production?: RendementKgArbreValue;
  readonly pleine_production?: RendementKgArbreValue;
  readonly maturite_avancee?: RendementKgArbreValue;
  readonly senescence?: RendementKgArbreValue;
  /** @deprecated Legacy tranche keys — prefer phase ids above. */
  readonly '3-4_ans'?: RendementKgArbreValue;
  readonly '3-5_ans'?: RendementKgArbreValue;
  readonly '5-7_ans'?: RendementKgArbreValue;
  readonly '6-10_ans'?: RendementKgArbreValue;
  readonly '8-12_ans'?: RendementKgArbreValue;
  readonly '11-20_ans'?: RendementKgArbreValue;
  readonly '13-20_ans'?: RendementKgArbreValue;
  readonly '21-40_ans'?: RendementKgArbreValue;
  readonly plus_20_ans?: RendementKgArbreValue;
  readonly plus_40_ans?: RendementKgArbreValue;
  readonly ans_3_5?: RendementKgArbreValue;
  readonly ans_6_10?: RendementKgArbreValue;
  readonly ans_11_20?: RendementKgArbreValue;
  readonly ans_21_40?: RendementKgArbreValue;
  readonly ans_40_plus?: RendementKgArbreValue;
}

interface MonthPlanEntry {
  readonly NPK?: string | null;
  readonly micro?: string | null;
  readonly biostim?: string | null;
  readonly phyto?: string | null;
  readonly irrigation?: string | null;
  readonly irrigation_L_sem?: number;
  readonly travaux?: string;
  readonly amendement?: string;
}

export type CropType = 'olivier' | 'agrumes' | 'avocatier' | 'palmier_dattier';

type OlivierMetadata = ReferenceMetadata<'olivier'>;

interface OlivierSensibilites {
  readonly oeil_paon: string;
  readonly verticilliose: string;
  readonly froid_min: number;
  readonly salinite: string;
  readonly secheresse: string;
}

interface OlivierVariety {
  readonly code: string;
  readonly nom: string;
  readonly origine: string;
  readonly usage: 'double_fin' | 'huile';
  readonly fruit_g: NumericRange;
  readonly huile_pct: NumericRange;
  readonly alternance_index: number;
  readonly systemes_compatibles: readonly OliveSystemKey[];
  readonly sensibilites: OlivierSensibilites;
  readonly heures_froid_requises: NumericRange;
  readonly rendement_kg_arbre: YieldByAge;
  readonly duree_vie_economique?: number;
}

interface OlivierSystem {
  readonly nom: string;
  readonly densite_arbres_ha: NumericRange;
  readonly ecartement_m: string;
  readonly irrigation: string;
  readonly recolte: string;
  readonly entree_production_annee: NumericRange;
  readonly pleine_production_annee: NumericRange;
  readonly duree_vie_ans: number | NumericRange;
  readonly rendement_pleine_prod_t_ha: NumericRange;
  readonly sol_visible_pct: NumericRange;
  readonly indice_cle: 'MSAVI' | 'NIRv' | 'NDVI';
}

interface OlivierSatelliteThresholds {
  readonly NDVI: ThresholdBand;
  readonly NIRv: ThresholdBand;
  readonly NDMI: ThresholdBand;
  readonly NDRE: ThresholdBand;
  readonly MSI: ThresholdBand;
}

interface OlivierBbchStage {
  readonly code: string;
  readonly nom: string;
  readonly description: string;
  readonly mois: readonly MonthCode[];
  readonly gdd_cumul: NumberOrRange;
  readonly coef_nirvp: number;
}

interface OlivierKcPhases {
  readonly repos: number;
  readonly debourrement: number;
  readonly croissance: number;
  readonly floraison: number;
  readonly nouaison: number;
  readonly grossissement: number;
  readonly maturation: number;
  readonly post_recolte: number;
}

interface OlivierBiostimulantMix {
  readonly humiques: string;
  readonly fulviques: string;
  readonly amines: string;
  readonly algues: string;
}

interface OlivierNutritionOptionA extends NutritionOptionBase {
  readonly fertigation: string;
  readonly foliaire: string;
  readonly biostimulants: string;
}

interface OlivierNutritionOptionB extends NutritionOptionBase {
  readonly fertigation: string;
  readonly foliaire: string;
  readonly biostimulants: OlivierBiostimulantMix;
}

interface OlivierNutritionOptionC extends NutritionOptionBase {
  readonly fertigation: string;
  readonly foliaire: string;
  readonly biostimulants: OlivierBiostimulantMix;
  readonly lessivage: true;
  readonly acidification: string;
  readonly gypse: string;
}

interface OlivierFractionnementEntry {
  readonly N: number;
  readonly P2O5: number;
  readonly K2O: number;
  readonly stade: string;
}

interface OlivierAlternanceAdjustment {
  readonly N: number;
  readonly P: number;
  readonly K: number;
  readonly Mg: number;
}

interface OlivierTargetAdjustment {
  readonly N: number;
  readonly K: number;
  readonly IM_cible: NumericRange;
}

interface OlivierWaterCeThreshold {
  readonly unite: 'dS/m';
  readonly optimal: number;
  readonly acceptable: number;
  readonly problematique: number;
  readonly critique: number;
}

interface OlivierWaterPhThreshold {
  readonly optimal: NumericRange;
  readonly acceptable: NumericRange;
  readonly problematique: number;
}

interface OlivierWaterSarThreshold {
  readonly optimal: number;
  readonly acceptable: number;
  readonly problematique: number;
  readonly critique: number;
}

interface OlivierWaterToxicThreshold {
  readonly unite: 'mg/L';
  readonly optimal: number;
  readonly acceptable: number;
  readonly toxique: number;
}

interface OlivierWaterProblemThreshold {
  readonly unite: 'mg/L';
  readonly optimal: number;
  readonly acceptable: number;
  readonly problematique: number;
}

interface OlivierWaterBoronThreshold {
  readonly unite: 'mg/L';
  readonly optimal: NumericRange;
  readonly acceptable: number;
  readonly toxique: number;
}

interface OlivierWaterNitrateThreshold {
  readonly unite: 'mg/L';
  readonly a_deduire: true;
  readonly coefficient: number;
}

interface OlivierBiostimulantBase {
  readonly produit: string;
  readonly frequence: number;
  readonly stades: readonly string[];
  readonly mode: string;
}

interface OlivierLiquidBiostimulant extends OlivierBiostimulantBase {
  readonly dose_l_ha: NumericRange;
}

interface OlivierGranularBiostimulant extends OlivierBiostimulantBase {
  readonly dose_kg_ha: NumericRange;
}

interface OlivierFulvicBiostimulant extends OlivierLiquidBiostimulant {
  readonly synergie_Fe: string;
}

interface OlivierAminesFoliaireBiostimulant extends OlivierLiquidBiostimulant {
  readonly conditions: string;
}

interface OlivierAlguesBiostimulant extends OlivierLiquidBiostimulant {
  readonly effet_salinite: string;
}

interface OlivierAlert {
  readonly code: string;
  readonly nom: string;
  readonly seuil_entree: string;
  readonly seuil_sortie: string | null;
  readonly priorite: AlertPriority;
  readonly systeme: string;
}

interface OlivierPhytoTreatment {
  readonly produit: string;
  readonly dose_kg_ha?: number | NumericRange;
  readonly dose_l_ha?: number | NumericRange;
  readonly DAR_jours?: number;
  readonly timing?: string;
}

interface OlivierDisease {
  readonly nom: string;
  readonly agent: string;
  readonly conditions?: string;
  readonly periode_risque?: readonly string[];
  readonly traitement: OlivierPhytoTreatment | null;
  readonly prevention: readonly string[];
  readonly note?: string;
}

interface OlivierPest {
  readonly nom: string;
  readonly agent: string;
  readonly conditions?: string;
  readonly periode_risque?: string;
  readonly seuil?: string;
  readonly traitement: OlivierPhytoTreatment;
  readonly alternative?: readonly string[];
}

interface OlivierCalendarPhytoEntry {
  readonly cible: string;
  readonly produit: string;
  readonly dose: string;
  readonly condition: string;
}

interface OlivierPredictionMoment {
  readonly BBCH: string;
  readonly precision: string;
}

interface OlivierAnnualPlanMonth {
  readonly NPK: string | null;
  readonly micro: string | null;
  readonly biostim: string | null;
  readonly phyto: string | null;
  readonly irrigation: string;
}

export interface OlivierReference {
  readonly crop_type: 'olivier';
  readonly metadata: OlivierMetadata;
  readonly varietes: readonly OlivierVariety[];
  readonly systemes: {
    readonly traditionnel: OlivierSystem;
    readonly intensif: OlivierSystem;
    readonly super_intensif: OlivierSystem;
  };
  readonly seuils_satellite: {
    readonly traditionnel: OlivierSatelliteThresholds;
    readonly intensif: OlivierSatelliteThresholds;
    readonly super_intensif: OlivierSatelliteThresholds;
  };
  readonly stades_bbch: readonly OlivierBbchStage[];
  readonly kc: {
    readonly traditionnel: OlivierKcPhases;
    readonly intensif: OlivierKcPhases;
    readonly super_intensif: OlivierKcPhases;
  };
  readonly options_nutrition: {
    readonly A: OlivierNutritionOptionA;
    readonly B: OlivierNutritionOptionB;
    readonly C: OlivierNutritionOptionC;
  };
  readonly export_kg_tonne: {
    readonly N: number;
    readonly P2O5: number;
    readonly K2O: number;
    readonly CaO: number;
    readonly MgO: number;
    readonly S: number;
  };
  readonly entretien_kg_ha: {
    readonly traditionnel: NutrientRange;
    readonly intensif: NutrientRange;
    readonly super_intensif: NutrientRange;
  };
  readonly fractionnement_pct: {
    readonly fev_mars: OlivierFractionnementEntry;
    readonly avril: OlivierFractionnementEntry;
    readonly mai: OlivierFractionnementEntry;
    readonly juin: OlivierFractionnementEntry;
    readonly juil_aout: OlivierFractionnementEntry;
    readonly sept: OlivierFractionnementEntry;
    readonly oct_nov: OlivierFractionnementEntry;
  };
  readonly ajustement_alternance: {
    readonly annee_ON: OlivierAlternanceAdjustment;
    readonly annee_OFF_sain: OlivierAlternanceAdjustment;
    readonly epuisement: OlivierAlternanceAdjustment;
  };
  readonly ajustement_cible: {
    readonly huile_qualite: OlivierTargetAdjustment;
    readonly olive_table: OlivierTargetAdjustment;
    readonly mixte: OlivierTargetAdjustment;
  };
  readonly seuils_foliaires: {
    readonly N: FoliarThreshold;
    readonly P: FoliarThreshold;
    readonly K: FoliarThreshold;
    readonly Ca: FoliarThreshold;
    readonly Mg: FoliarThreshold;
    readonly Fe: FoliarThreshold;
    readonly Zn: FoliarThreshold;
    readonly Mn: FoliarThreshold;
    readonly B: FoliarThreshold;
    readonly Cu: FoliarThreshold;
    readonly Na: FoliarToxicThreshold;
    readonly Cl: FoliarToxicThreshold;
  };
  readonly seuils_eau: {
    readonly CE: OlivierWaterCeThreshold;
    readonly pH: OlivierWaterPhThreshold;
    readonly SAR: OlivierWaterSarThreshold;
    readonly Cl: OlivierWaterToxicThreshold;
    readonly Na: OlivierWaterToxicThreshold;
    readonly HCO3: OlivierWaterProblemThreshold;
    readonly B: OlivierWaterBoronThreshold;
    readonly NO3: OlivierWaterNitrateThreshold;
  };
  readonly fraction_lessivage: {
    readonly CE_sol_seuil: number;
    readonly formule: string;
    readonly table: {
      readonly '1.5': number;
      readonly '2.0': number;
      readonly '2.5': number;
      readonly '3.0': number;
      readonly '3.5': number;
      readonly '4.0': number;
    };
  };
  readonly biostimulants: {
    readonly humiques_liquide: OlivierLiquidBiostimulant;
    readonly humiques_granule: OlivierGranularBiostimulant;
    readonly fulviques: OlivierFulvicBiostimulant;
    readonly amines_foliaire: OlivierAminesFoliaireBiostimulant;
    readonly amines_fertigation: OlivierLiquidBiostimulant;
    readonly algues: OlivierAlguesBiostimulant;
  };
  readonly calendrier_biostimulants: {
    readonly nov_dec: Partial<Record<'humiques_granule' | 'amines_fertigation', string>>;
    readonly fev_mars: Partial<Record<'humiques_liquide' | 'fulviques' | 'amines_foliaire' | 'algues', string>>;
    readonly avr_mai: Partial<Record<'amines_foliaire' | 'algues', string>>;
    readonly mai_juin: Partial<Record<'humiques_liquide' | 'fulviques', string>>;
    readonly juillet: Partial<Record<'algues', string>>;
    readonly aout_sept: Partial<Record<'humiques_liquide', string>>;
  };
  readonly alertes: readonly OlivierAlert[];
  readonly phytosanitaire: {
    readonly maladies: readonly OlivierDisease[];
    readonly ravageurs: readonly OlivierPest[];
  };
  readonly calendrier_phyto: {
    readonly oct_nov: OlivierCalendarPhytoEntry;
    readonly jan_fev: OlivierCalendarPhytoEntry;
    readonly mars: OlivierCalendarPhytoEntry;
    readonly mai_juin: OlivierCalendarPhytoEntry;
    readonly post_taille: OlivierCalendarPhytoEntry;
  };
  readonly modele_predictif: {
    readonly variables: readonly PredictiveVariable[];
    readonly precision_attendue: {
      readonly traditionnel: SystemPrecision;
      readonly intensif: SystemPrecision;
      readonly super_intensif: SystemPrecision;
    };
    readonly conditions_prevision: readonly string[];
    readonly moments_prevision: {
      readonly post_floraison: OlivierPredictionMoment;
      readonly post_nouaison: OlivierPredictionMoment;
      readonly pre_recolte: OlivierPredictionMoment;
    };
    readonly limites_NIRvP: {
      readonly detecte: readonly string[];
      readonly ne_detecte_pas: readonly string[];
    };
  };
  readonly plan_annuel: {
    readonly composantes: readonly string[];
    readonly declenchement: string;
    readonly mise_a_jour: {
      readonly NPK: string;
      readonly microelements: string;
      readonly biostimulants: string;
      readonly phyto: string;
      readonly irrigation: string;
      readonly salinite: string;
    };
    readonly calendrier_type_intensif: {
      readonly jan: OlivierAnnualPlanMonth;
      readonly fev: OlivierAnnualPlanMonth;
      readonly mar: OlivierAnnualPlanMonth;
      readonly avr: OlivierAnnualPlanMonth;
      readonly mai: OlivierAnnualPlanMonth;
      readonly juin: OlivierAnnualPlanMonth;
      readonly juil: OlivierAnnualPlanMonth;
      readonly aout: OlivierAnnualPlanMonth;
      readonly sept: OlivierAnnualPlanMonth;
      readonly oct: OlivierAnnualPlanMonth;
      readonly nov: OlivierAnnualPlanMonth;
      readonly dec: OlivierAnnualPlanMonth;
    };
  };
  readonly couts_indicatifs_DH: {
    readonly nitrate_calcium_kg: NumericRange;
    readonly MAP_kg: NumericRange;
    readonly sulfate_potasse_kg: NumericRange;
    readonly sulfate_magnesium_kg: NumericRange;
    readonly Fe_EDDHA_kg: NumericRange;
    readonly acides_humiques_L: NumericRange;
    readonly extraits_algues_L: NumericRange;
    readonly acides_amines_L: NumericRange;
    readonly cuivre_hydroxyde_kg: NumericRange;
    readonly deltamethrine_L: NumericRange;
    readonly huile_blanche_L: NumericRange;
  };
}

interface AgrumesMetadata extends ReferenceMetadata<'agrumes'> {
  readonly famille: string;
  readonly genre: string;
}

interface AgrumesSpecies {
  readonly nom_scientifique: string;
  readonly part_production_maroc: string;
  readonly types: readonly string[];
}

interface AgrumesOrangeVariety {
  readonly code: string;
  readonly nom: string;
  readonly type: string;
  readonly maturite: readonly MonthCode[];
  readonly calibre?: string;
  readonly qualite?: string;
  readonly export?: true;
  readonly tardive?: true;
  readonly tres_tardive?: true;
  readonly usage?: string;
  readonly specialite_maroc?: true;
  readonly niche?: true;
}

interface AgrumesPetitAgrumeVariety {
  readonly code: string;
  readonly nom: string;
  readonly type: string;
  readonly maturite: readonly MonthCode[];
  readonly pepins?: NumericRange;
  readonly conservation?: string;
  readonly export?: true;
  readonly tres_precoce?: true;
  readonly tardive?: true;
  readonly origine?: string;
  readonly premium?: true;
  readonly hybride?: string;
  readonly arome?: string;
}

interface AgrumesCitronVariety {
  readonly code: string;
  readonly nom: string;
  readonly maturite: readonly MonthCode[] | 'toute_annee';
  readonly acidite: string;
  readonly standard?: true;
  readonly rustique?: true;
  readonly peu_pepins?: true;
  readonly hybride?: true;
}

interface AgrumesPomeloVariety {
  readonly code: string;
  readonly nom: string;
  readonly chair: string;
  readonly maturite: readonly MonthCode[];
  readonly gout: string;
  readonly principal?: true;
}

interface AgrumesRootstock {
  readonly code: string;
  readonly nom: string;
  readonly vigueur: string;
  readonly calcaire: string;
  readonly salinite: string;
  readonly phytophthora: string;
  readonly tristeza: string;
  readonly qualite_fruit: string;
  readonly exclusion_Cl?: string;
  readonly note?: string;
  readonly recommande_si_tristeza?: true;
  readonly recommande_si_salin?: true;
}

interface AgrumesChoiceGuideEntry {
  readonly recommande: readonly string[];
  readonly eviter?: readonly string[];
  readonly interdit?: readonly string[];
}

interface AgrumesClimateRequirement {
  readonly T_optimale: NumericRange;
  readonly T_min_croissance: number;
  readonly gel_feuilles: NumberOrRange;
  readonly gel_fruits: NumberOrRange;
  readonly gel_mortel: NumberOrRange;
  readonly heures_froid: number | NumericRange;
}

interface AgrumesSystem {
  readonly densite_arbres_ha: NumericRange;
  readonly ecartement_m: string;
  readonly irrigation: string;
  readonly entree_production_annee: NumericRange;
  readonly pleine_production_annee: NumericRange;
  readonly duree_vie_ans: NumericRange;
  readonly rendement_pleine_prod_t_ha: NumericRange;
}

interface AgrumesSatelliteThresholds {
  readonly NDVI: ThresholdBand;
  readonly NIRv: ThresholdBand;
  readonly NDMI: ThresholdBand;
}

interface AgrumesPhenologicalStage {
  readonly nom: string;
  readonly mois: readonly MonthCode[];
  readonly coef_nirvp: number;
}

type AgrumesNutritionOption = NutritionOptionBase;

interface AgrumesExportProfile {
  readonly N: NumericRange;
  readonly P2O5: NumericRange;
  readonly K2O: NumericRange;
  readonly CaO: NumericRange;
  readonly MgO: NumericRange;
}

interface AgrumesFractionnementEntry {
  readonly N: number;
  readonly P2O5: number;
  readonly K2O: number;
  readonly objectif: string;
}

interface AgrumesAdjustment {
  readonly N: number;
  readonly K: number;
  readonly note: string;
}

interface AgrumesKcProfile {
  readonly jan_fev: number;
  readonly mar_avr: number;
  readonly mai_juin: number;
  readonly juil_aout: number;
  readonly sept_oct: number;
  readonly nov_dec: number;
}

interface AgrumesRdiPhase {
  readonly sensibilite: string;
  readonly rdi_possible: boolean | 'prudence';
  readonly reduction: number | NumericRange;
}

interface AgrumesDisease {
  readonly nom: string;
  readonly agent: string;
  readonly conditions?: string;
  readonly vecteur?: string;
  readonly prevention: string | readonly string[];
  readonly traitement: string | readonly string[] | null;
  readonly note?: string;
  readonly varietes_sensibles?: readonly string[];
}

interface AgrumesPest {
  readonly nom: string;
  readonly degats: string;
  readonly periode: string;
  readonly seuil?: string;
  readonly traitement: string;
}

interface AgrumesCalendarPhytoEntry {
  readonly cible: string;
  readonly produit: string;
  readonly dose?: string;
  readonly condition?: string;
}

interface AgrumesMaturityRatioProfile {
  readonly indice: string;
  readonly min: number;
  readonly optimal: NumericRange;
  readonly autre: string;
}

interface AgrumesCitronMaturityProfile {
  readonly indice: string;
  readonly min_pct: number;
  readonly optimal_pct: NumericRange;
  readonly autre: string;
}

interface AgrumesQualityDefect {
  readonly cause: string;
  readonly prevention: string;
}

interface AgrumesAlert {
  readonly code: string;
  readonly nom: string;
  readonly seuil: string;
  readonly priorite: AlertPriority;
}

export interface AgrumesReference {
  readonly crop_type: 'agrumes';
  readonly metadata: AgrumesMetadata;
  readonly especes: {
    readonly orange: AgrumesSpecies;
    readonly petits_agrumes: AgrumesSpecies;
    readonly citron: AgrumesSpecies;
    readonly pomelo: AgrumesSpecies;
  };
  readonly varietes: {
    readonly oranges: readonly AgrumesOrangeVariety[];
    readonly petits_agrumes: readonly AgrumesPetitAgrumeVariety[];
    readonly citrons: readonly AgrumesCitronVariety[];
    readonly pomelos: readonly AgrumesPomeloVariety[];
  };
  readonly porte_greffes: readonly AgrumesRootstock[];
  readonly guide_choix_pg: {
    readonly 'sol_calcaire_pH>7.5': AgrumesChoiceGuideEntry;
    readonly 'sol_salin_CE>2': AgrumesChoiceGuideEntry;
    readonly sol_lourd_mal_draine: AgrumesChoiceGuideEntry;
    readonly presence_tristeza: AgrumesChoiceGuideEntry;
  };
  readonly exigences_climatiques: {
    readonly orange: AgrumesClimateRequirement;
    readonly clementine: AgrumesClimateRequirement;
    readonly citron: AgrumesClimateRequirement;
    readonly pomelo: AgrumesClimateRequirement;
  };
  readonly exigences_sol: {
    readonly pH_optimal: NumericRange;
    readonly pH_tolerance: NumericRange;
    readonly calcaire_actif_max_pct: number;
    readonly CE_sol_optimal_dS_m: number;
    readonly CE_sol_max_dS_m: number;
    readonly texture: string;
    readonly drainage: string;
    readonly profondeur_utile_min_cm: number;
    readonly nappe_phreatique_min_cm: number;
  };
  readonly systemes: {
    readonly traditionnel: AgrumesSystem;
    readonly intensif: AgrumesSystem;
    readonly super_intensif: AgrumesSystem;
  };
  readonly seuils_satellite: {
    readonly traditionnel: AgrumesSatelliteThresholds;
    readonly intensif: AgrumesSatelliteThresholds;
    readonly super_intensif: AgrumesSatelliteThresholds;
  };
  readonly rendement_t_ha: {
    readonly orange_navel: YieldByAge;
    readonly orange_valencia: YieldByAge;
    readonly clementine: YieldByAge;
    readonly citron: YieldByAge;
    readonly pomelo: YieldByAge;
  };
  readonly stades_phenologiques: readonly AgrumesPhenologicalStage[];
  readonly options_nutrition: {
    readonly A: AgrumesNutritionOption;
    readonly B: AgrumesNutritionOption;
    readonly C: AgrumesNutritionOption;
  };
  readonly export_kg_tonne: {
    readonly orange: AgrumesExportProfile;
    readonly clementine: AgrumesExportProfile;
    readonly citron: AgrumesExportProfile;
    readonly pomelo: AgrumesExportProfile;
  };
  readonly entretien_kg_ha: {
    readonly 'jeune_1-3_ans': NutrientRange;
    readonly 'entree_prod_4-6_ans': NutrientRange;
    readonly intensif_pleine_prod: NutrientRange;
    readonly super_intensif: NutrientRange;
  };
  readonly fractionnement_pct: {
    readonly fev: AgrumesFractionnementEntry;
    readonly mar_avr: AgrumesFractionnementEntry;
    readonly mai_juin: AgrumesFractionnementEntry;
    readonly juil_aout: AgrumesFractionnementEntry;
    readonly sept_oct: AgrumesFractionnementEntry;
    readonly nov: AgrumesFractionnementEntry;
  };
  readonly ajustement_espece: {
    readonly orange_navel: AgrumesAdjustment;
    readonly orange_valencia: AgrumesAdjustment;
    readonly clementine: AgrumesAdjustment;
    readonly citron: AgrumesAdjustment;
    readonly pomelo: AgrumesAdjustment;
  };
  readonly formes_engrais: {
    readonly N_recommande: readonly string[];
    readonly P_recommande: readonly string[];
    readonly K_recommande: readonly string[];
    readonly K_conditionnel: string;
    readonly note: string;
  };
  readonly seuils_foliaires: {
    readonly periode_prelevement: string;
    readonly N: FoliarThreshold;
    readonly P: FoliarThreshold;
    readonly K: FoliarThreshold;
    readonly Ca: FoliarThreshold;
    readonly Mg: FoliarThreshold;
    readonly Fe: FoliarThreshold;
    readonly Zn: FoliarThreshold;
    readonly Mn: FoliarThreshold;
    readonly B: FoliarThreshold;
    readonly Cu: FoliarThreshold;
    readonly Cl: FoliarToxicThreshold;
    readonly Na: FoliarToxicThreshold;
  };
  readonly salinite: {
    readonly orange_mandarine: {
      readonly CE_eau_optimal: number;
      readonly CE_eau_limite: number;
      readonly CE_sol_limite: number;
      readonly Cl_eau_limite_mg_L: number;
      readonly Cl_foliaire_toxique_pct: number;
    };
    readonly citron: {
      readonly CE_eau_optimal: number;
      readonly CE_eau_limite: number;
      readonly CE_sol_limite: number;
      readonly Cl_eau_limite_mg_L: number;
      readonly Cl_foliaire_toxique_pct: number;
    };
    readonly pomelo: {
      readonly CE_eau_optimal: number;
      readonly CE_eau_limite: number;
      readonly CE_sol_limite: number;
      readonly Cl_eau_limite_mg_L: number;
      readonly Cl_foliaire_toxique_pct: number;
    };
  };
  readonly kc: {
    readonly jeune: AgrumesKcProfile;
    readonly adulte: AgrumesKcProfile;
  };
  readonly rdi: {
    readonly floraison: AgrumesRdiPhase;
    readonly nouaison: AgrumesRdiPhase;
    readonly grossissement_I: AgrumesRdiPhase;
    readonly grossissement_II: AgrumesRdiPhase;
    readonly maturation: AgrumesRdiPhase;
    readonly note: string;
  };
  readonly phytosanitaire: {
    readonly maladies: readonly AgrumesDisease[];
    readonly ravageurs: readonly AgrumesPest[];
  };
  readonly calendrier_phyto_preventif: {
    readonly jan: AgrumesCalendarPhytoEntry;
    readonly fev_mar: AgrumesCalendarPhytoEntry;
    readonly avr: AgrumesCalendarPhytoEntry;
    readonly mai: AgrumesCalendarPhytoEntry;
    readonly aout_oct: AgrumesCalendarPhytoEntry;
    readonly nov: AgrumesCalendarPhytoEntry;
  };
  readonly maturite_recolte: {
    readonly orange_navel: AgrumesMaturityRatioProfile;
    readonly orange_valencia: AgrumesMaturityRatioProfile;
    readonly clementine: AgrumesMaturityRatioProfile;
    readonly citron: AgrumesCitronMaturityProfile;
    readonly pomelo: AgrumesMaturityRatioProfile;
  };
  readonly defauts_qualite: {
    readonly granulation: AgrumesQualityDefect;
    readonly eclatement: AgrumesQualityDefect;
    readonly petit_calibre: AgrumesQualityDefect;
    readonly peau_epaisse: AgrumesQualityDefect;
    readonly reverdissement: AgrumesQualityDefect;
    readonly oleocellose: AgrumesQualityDefect;
  };
  readonly alertes: readonly AgrumesAlert[];
  readonly modele_predictif: {
    readonly variables: readonly PredictiveVariable[];
    readonly precision_attendue: {
      readonly traditionnel: SystemPrecision;
      readonly intensif: SystemPrecision;
      readonly super_intensif: SystemPrecision;
    };
    readonly previsibilite_espece: {
      readonly orange_navel: string;
      readonly orange_valencia: string;
      readonly clementine: string;
      readonly citron: string;
      readonly pomelo: string;
    };
  };
  readonly plan_annuel_type_orange_intensif_50T: {
    readonly jan: MonthPlanEntry;
    readonly fev: MonthPlanEntry;
    readonly mar: MonthPlanEntry;
    readonly avr: MonthPlanEntry;
    readonly mai: MonthPlanEntry;
    readonly juin: MonthPlanEntry;
    readonly juil: MonthPlanEntry;
    readonly aout: MonthPlanEntry;
    readonly sept: MonthPlanEntry;
    readonly oct: MonthPlanEntry;
    readonly nov: MonthPlanEntry;
    readonly dec: MonthPlanEntry;
  };
}

interface AvocatierMetadata extends ReferenceMetadata<'avocatier'> {
  readonly nom_scientifique: string;
}

interface AvocatierVariety {
  readonly code: string;
  readonly nom: string;
  readonly race: string;
  readonly type_floral: 'A' | 'B';
  readonly peau: string;
  readonly poids_g: NumericRange;
  readonly huile_pct: NumericRange;
  readonly maturite_mois: readonly MonthCode[];
  readonly alternance: string;
  readonly vigueur: string;
  readonly port: string;
  readonly froid_min_C: number;
  readonly salinite: string;
  readonly rendement_kg_arbre?: YieldByAge;
  readonly pollinisateur?: true;
}

interface AvocatierFloralTypeSchedule {
  readonly jour_1_matin: string;
  readonly jour_1_apres_midi: string;
  readonly jour_2_matin: string;
  readonly jour_2_apres_midi: string;
  readonly varietes: readonly string[];
}

interface AvocatierSystem {
  readonly densite_arbres_ha: NumericRange;
  readonly ecartement_m: string;
  readonly irrigation: string;
  readonly entree_production_annee: NumericRange;
  readonly pleine_production_annee: NumericRange;
  readonly duree_vie_ans: NumericRange;
  readonly rendement_pleine_prod_t_ha: NumericRange;
}

interface AvocatierSatelliteThresholds {
  readonly NDVI: ThresholdBand;
  readonly NIRv: ThresholdBand;
  readonly NDMI: ThresholdBand;
  readonly NDRE: ThresholdBand;
}

interface AvocatierPhenologicalStage {
  readonly nom: string;
  readonly mois: readonly MonthCode[] | 'variable_variete';
  readonly duree_sem?: NumericRange;
  readonly duree_mois?: NumericRange;
  readonly coef_nirvp: number;
}

interface AvocatierNutritionOption extends NutritionOptionBase {
  readonly seuil_plus_bas_que_olivier?: true;
}

interface AvocatierExportProfile {
  readonly N: NumericRange;
  readonly P2O5: NumericRange;
  readonly K2O: NumericRange;
  readonly CaO: NumericRange;
  readonly MgO: NumericRange;
  readonly S: NumericRange;
}

interface AvocatierFractionnementEntry {
  readonly N: number;
  readonly P2O5: number;
  readonly K2O: number;
  readonly objectif: string;
}

interface AvocatierPhytophthoraDisease {
  readonly nom: 'Phytophthora';
  readonly agent: string;
  readonly gravite: string;
  readonly conditions: string;
  readonly prevention: readonly string[];
  readonly traitement: {
    readonly phosphonate_injection: {
      readonly dose: string;
      readonly frequence: string;
    };
    readonly phosphonate_foliaire: {
      readonly dose: string;
      readonly frequence: string;
    };
    readonly metalaxyl_sol: {
      readonly dose: string;
      readonly condition: string;
    };
  };
}

interface AvocatierFungalDisease {
  readonly nom: string;
  readonly agent: string;
  readonly conditions?: string;
  readonly traitement: {
    readonly cuivre: {
      readonly dose_kg_ha: number | NumericRange;
      readonly DAR_jours?: number;
      readonly applications?: NumericRange;
    };
  };
}

interface AvocatierPest {
  readonly nom: string;
  readonly periode?: string;
  readonly condition?: string;
  readonly traitement: string;
}

interface AvocatierCalendarPhytoEntry {
  readonly cible: string;
  readonly produit: string;
  readonly dose?: string;
  readonly condition?: string;
  readonly mode?: string;
  readonly DAR?: string;
}

interface AvocatierAlert {
  readonly code: string;
  readonly nom: string;
  readonly seuil: string;
  readonly priorite: AlertPriority;
}

interface AvocatierBiostimulantMonth {
  readonly algues?: string;
  readonly amines?: string;
  readonly humiques?: string;
  readonly humiques_granule?: string;
  readonly amines_fertig?: string;
  readonly objectif: string;
}

export interface AvocatierReference {
  readonly crop_type: 'avocatier';
  readonly metadata: AvocatierMetadata;
  readonly varietes: readonly AvocatierVariety[];
  readonly types_floraux: {
    readonly description: string;
    readonly type_A: AvocatierFloralTypeSchedule;
    readonly type_B: AvocatierFloralTypeSchedule;
    readonly ratio_pollinisateur: string;
    readonly ruches_ha: NumericRange;
  };
  readonly systemes: {
    readonly traditionnel: AvocatierSystem;
    readonly intensif: AvocatierSystem;
    readonly super_intensif: AvocatierSystem;
  };
  readonly seuils_satellite: {
    readonly traditionnel: AvocatierSatelliteThresholds;
    readonly intensif: AvocatierSatelliteThresholds;
    readonly super_intensif: AvocatierSatelliteThresholds;
  };
  readonly stades_phenologiques: readonly AvocatierPhenologicalStage[];
  readonly exigences_climatiques: {
    readonly temperature_optimale_C: NumericRange;
    readonly temperature_croissance_C: NumericRange;
    readonly temperature_stress_chaleur_C: number;
    readonly temperature_stress_froid_C: number;
    readonly gel_feuilles_hass_C: NumericRange;
    readonly gel_mortel_hass_C: NumericRange;
    readonly gel_race_mexicaine_C: NumericRange;
    readonly gel_race_antillaise_C: NumericRange;
    readonly humidite_relative_optimale_pct: NumericRange;
    readonly humidite_relative_min_pct: number;
    readonly pluviometrie_optimale_mm: NumericRange;
  };
  readonly exigences_sol: {
    readonly pH_optimal: NumericRange;
    readonly pH_tolerance: NumericRange;
    readonly calcaire_actif_max_pct: number;
    readonly CE_sol_optimal_dS_m: number;
    readonly CE_sol_max_dS_m: number;
    readonly texture: string;
    readonly drainage: string;
    readonly profondeur_utile_min_cm: number;
    readonly matiere_organique_min_pct: number;
    readonly nappe_phreatique_min_cm: number;
    readonly note: string;
  };
  readonly options_nutrition: {
    readonly A: AvocatierNutritionOption;
    readonly B: AvocatierNutritionOption;
    readonly C: AvocatierNutritionOption;
  };
  readonly export_kg_tonne: AvocatierExportProfile;
  readonly entretien_kg_ha: {
    readonly 'jeune_1-3_ans': NutrientRange;
    readonly 'entree_prod_4-6_ans': NutrientRange;
    readonly intensif_pleine_prod: NutrientRange;
    readonly super_intensif: NutrientRange;
  };
  readonly fractionnement_pct: {
    readonly jan_fev: AvocatierFractionnementEntry;
    readonly mar_avr: AvocatierFractionnementEntry;
    readonly mai_juin: AvocatierFractionnementEntry;
    readonly juil_aout: AvocatierFractionnementEntry;
    readonly sept_oct: AvocatierFractionnementEntry;
    readonly nov_dec: AvocatierFractionnementEntry;
  };
  readonly formes_engrais: {
    readonly N_recommande: readonly string[];
    readonly N_eviter: readonly string[];
    readonly P_recommande: readonly string[];
    readonly P_eviter: readonly string[];
    readonly K_recommande: readonly string[];
    readonly K_interdit: readonly string[];
    readonly note_KCl: string;
  };
  readonly seuils_foliaires: {
    readonly periode_prelevement: string;
    readonly N: FoliarThreshold;
    readonly P: FoliarThreshold;
    readonly K: FoliarThreshold;
    readonly Ca: FoliarThreshold;
    readonly Mg: FoliarThreshold;
    readonly Fe: FoliarThreshold;
    readonly Zn: FoliarThreshold;
    readonly Mn: FoliarThreshold;
    readonly B: FoliarThreshold;
    readonly Cu: FoliarThreshold;
    readonly Cl: FoliarToxicThreshold;
    readonly Na: FoliarToxicThreshold;
  };
  readonly seuils_eau_salinite: {
    readonly CE_tolerance_dS_m: number;
    readonly CE_problematique_dS_m: number;
    readonly CE_deconseille_dS_m: number;
    readonly Cl_tolerance_mg_L: number;
    readonly Cl_toxique_mg_L: number;
    readonly Na_tolerance_mg_L: number;
    readonly Na_toxique_mg_L: number;
    readonly B_tolerance_mg_L: number;
    readonly B_toxique_mg_L: number;
    readonly SAR_max: number;
    readonly note: string;
  };
  readonly kc: {
    readonly 'jeune_1-3_ans': AgrumesKcProfile;
    readonly adulte_plus_6_ans: AgrumesKcProfile;
  };
  readonly irrigation: {
    readonly sensibilite: string;
    readonly note: string;
    readonly frequence: string;
    readonly tensiometre_seuil_sol_leger_cbar: NumericRange;
    readonly tensiometre_seuil_sol_limoneux_cbar: NumericRange;
  };
  readonly phytosanitaire: {
    readonly maladies: readonly (AvocatierPhytophthoraDisease | AvocatierFungalDisease)[];
    readonly ravageurs: readonly AvocatierPest[];
  };
  readonly calendrier_phyto_preventif: {
    readonly jan_fev: AvocatierCalendarPhytoEntry;
    readonly mars: AvocatierCalendarPhytoEntry;
    readonly avr_mai: AvocatierCalendarPhytoEntry;
    readonly juin: AvocatierCalendarPhytoEntry;
    readonly aout_sept: AvocatierCalendarPhytoEntry;
    readonly nov: AvocatierCalendarPhytoEntry;
  };
  readonly maturite_recolte: {
    readonly critere_principal: string;
    readonly note: string;
    readonly seuils_hass: {
      readonly matiere_seche_min_pct: number;
      readonly huile_min_pct: number;
    };
    readonly seuils_fuerte: {
      readonly matiere_seche_min_pct: number;
      readonly huile_min_pct: number;
    };
    readonly methodes: readonly string[];
    readonly conservation_hass: {
      readonly temperature_C: NumericRange;
      readonly duree_semaines: NumericRange;
    };
  };
  readonly alertes: readonly AvocatierAlert[];
  readonly modele_predictif: {
    readonly difficulte: string;
    readonly raisons: readonly string[];
    readonly precision_attendue: {
      readonly traditionnel: SystemPrecision;
      readonly intensif: SystemPrecision;
      readonly super_intensif: SystemPrecision;
    };
    readonly recommandation: string;
  };
  readonly biostimulants: {
    readonly calendrier: {
      readonly jan: AvocatierBiostimulantMonth;
      readonly fev_mar: AvocatierBiostimulantMonth;
      readonly avr_mai: AvocatierBiostimulantMonth;
      readonly juin_juil: AvocatierBiostimulantMonth;
      readonly aout_sept: AvocatierBiostimulantMonth;
      readonly nov_dec: AvocatierBiostimulantMonth;
    };
    readonly focus_nouaison: string;
  };
  readonly plan_annuel_type_intensif_hass_15T: {
    readonly jan: MonthPlanEntry;
    readonly fev: MonthPlanEntry;
    readonly mar: MonthPlanEntry;
    readonly avr: MonthPlanEntry;
    readonly mai: MonthPlanEntry;
    readonly juin: MonthPlanEntry;
    readonly juil: MonthPlanEntry;
    readonly aout: MonthPlanEntry;
    readonly sept: MonthPlanEntry;
    readonly oct: MonthPlanEntry;
    readonly nov: MonthPlanEntry;
    readonly dec: MonthPlanEntry;
  };
}

interface PalmierMetadata extends ReferenceMetadata<'palmier_dattier'> {
  readonly nom_scientifique: string;
  readonly famille: string;
}

interface PalmierGeneralCharacteristics {
  readonly type: string;
  readonly origine: string;
  readonly duree_vie_ans: NumericRange;
  readonly production_economique_ans: NumericRange;
  readonly hauteur_adulte_m: NumericRange;
  readonly systeme_racinaire: string;
  readonly sexualite: string;
  readonly pollinisation: string;
}

interface PalmierClimateRequirements {
  readonly temperature_optimale_C: NumericRange;
  readonly temperature_max_toleree_C: number;
  readonly temperature_min_vegetative_C: number;
  readonly gel_palmes_C: NumericRange;
  readonly gel_mortel_C: NumericRange;
  readonly GDD_floraison_recolte: number;
  readonly HR_optimale_pct: number;
  readonly HR_critique_maturation_pct: number;
}

interface PalmierSalinityTolerance {
  readonly CE_eau_sans_perte_dS_m: number;
  readonly CE_eau_perte_10pct_dS_m: number;
  readonly CE_eau_perte_25pct_dS_m: number;
  readonly CE_eau_perte_50pct_dS_m: number;
  readonly note: string;
}

interface PalmierVariety {
  readonly code: string;
  readonly nom: string;
  readonly type: string;
  readonly poids_g: NumericRange;
  readonly qualite: string;
  readonly bayoud: string;
  readonly productivite_kg: NumericRange;
}

interface PalmierPollination {
  readonly type: string;
  readonly ratio_males_pct: NumericRange;
  readonly fenetre_jours: NumericRange;
  readonly methode: string;
  readonly passages: NumericRange;
  readonly conservation_pollen: {
    readonly frais: string;
    readonly refrigere_4C: string;
    readonly congele: string;
  };
}

interface PalmierSystem {
  readonly densite: NumericRange;
  readonly irrigation: string;
  readonly rendement_t_ha: NumericRange;
}

interface PalmierSatelliteThresholds {
  readonly NDVI_optimal: NumericRange;
  readonly NDVI_alerte: number;
  readonly NDMI_optimal: NumericRange;
}

interface PalmierNutritionFractionnementEntry {
  readonly N: number;
  readonly P: number;
  readonly K: number;
}

interface PalmierFoliarThreshold {
  readonly carence: number;
  readonly optimal: NumericRange;
}

interface PalmierAlert {
  readonly code: string;
  readonly nom: string;
  readonly priorite: AlertPriority;
}

export interface PalmierDattierReference {
  readonly crop_type: 'palmier_dattier';
  readonly metadata: PalmierMetadata;
  readonly caracteristiques_generales: PalmierGeneralCharacteristics;
  readonly exigences_climatiques: PalmierClimateRequirements;
  readonly tolerance_salinite: PalmierSalinityTolerance;
  readonly varietes: readonly PalmierVariety[];
  readonly pollinisation: PalmierPollination;
  readonly systemes: {
    readonly traditionnel_oasien: PalmierSystem;
    readonly semi_intensif: PalmierSystem;
    readonly intensif: PalmierSystem;
  };
  readonly seuils_satellite: {
    readonly traditionnel: PalmierSatelliteThresholds;
    readonly intensif: PalmierSatelliteThresholds;
  };
  readonly nutrition: {
    readonly export_kg_100kg_dattes: {
      readonly N: NumericRange;
      readonly P2O5: NumericRange;
      readonly K2O: NumericRange;
    };
    readonly besoins_intensif_Mejhoul_kg_arbre: {
      readonly N: NumericRange;
      readonly P2O5: NumericRange;
      readonly K2O: NumericRange;
    };
    readonly fractionnement: {
      readonly jan_fev: PalmierNutritionFractionnementEntry;
      readonly mar_avr: PalmierNutritionFractionnementEntry;
      readonly mai_juin: PalmierNutritionFractionnementEntry;
      readonly juil_aout: PalmierNutritionFractionnementEntry;
      readonly sept_oct: PalmierNutritionFractionnementEntry;
      readonly nov_dec: PalmierNutritionFractionnementEntry;
    };
    readonly note_K: string;
  };
  readonly seuils_foliaires: {
    readonly N_pct: PalmierFoliarThreshold;
    readonly P_pct: PalmierFoliarThreshold;
    readonly K_pct: PalmierFoliarThreshold;
    readonly Mg_pct: PalmierFoliarThreshold;
  };
  readonly irrigation: {
    readonly besoins_m3_arbre_an: {
      readonly traditionnel: NumericRange;
      readonly intensif: NumericRange;
    };
    readonly Kc: {
      readonly hiver: number;
      readonly printemps: number;
      readonly ete: number;
      readonly automne: number;
    };
    readonly frequence_ete_gag: string;
  };
  readonly phytosanitaire: {
    readonly bayoud: {
      readonly agent: string;
      readonly gravite: string;
      readonly traitement: string;
      readonly prevention: readonly string[];
    };
    readonly autres_maladies: readonly string[];
    readonly ravageurs: readonly string[];
  };
  readonly stades_maturite: {
    readonly Hababouk: string;
    readonly Kimri: string;
    readonly Khalal: string;
    readonly Rutab: string;
    readonly Tamr: string;
  };
  readonly alertes: readonly PalmierAlert[];
  readonly modele_predictif: {
    readonly precision_intensif: {
      readonly R2: NumericRange;
      readonly MAE_pct: NumericRange;
    };
    readonly limite_majeure: string;
  };
  readonly plan_annuel_Mejhoul: {
    readonly jan: MonthPlanEntry;
    readonly fev: MonthPlanEntry;
    readonly mar: MonthPlanEntry;
    readonly avr: MonthPlanEntry;
    readonly mai: MonthPlanEntry;
    readonly juin: MonthPlanEntry;
    readonly juil: MonthPlanEntry;
    readonly aout: MonthPlanEntry;
    readonly sept: MonthPlanEntry;
    readonly oct: MonthPlanEntry;
    readonly nov: MonthPlanEntry;
    readonly dec: MonthPlanEntry;
  };
}

export type CropAIReference = OlivierReference | AgrumesReference | AvocatierReference | PalmierDattierReference;

export type AIReferenceVarietiesResponse =
  | OlivierReference['varietes']
  | AgrumesReference['especes']
  | AvocatierReference['varietes']
  | PalmierDattierReference['varietes'];

export type AIReferenceBbchResponse = OlivierReference['stades_bbch'];

export type AIReferenceAlertsResponse =
  | OlivierReference['alertes']
  | AgrumesReference['alertes']
  | AvocatierReference['alertes']
  | PalmierDattierReference['alertes'];

export type AIReferenceNpkFormulasResponse = Record<string, unknown>;
