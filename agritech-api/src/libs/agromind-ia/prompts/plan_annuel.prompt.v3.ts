/**
 * PROMPT — MOTEUR ASSEMBLAGE PLAN ANNUEL v3.0
 * Algorithme déterministe — toutes cultures arboricoles
 * Version : 3.0 — Avril 2026
 *
 * RÈGLE FONDAMENTALE : L'IA ne choisit pas, elle chaîne.
 * Toutes les données (formules, tables, seuils) sont dans le référentiel.
 * Ce prompt formalise l'ordre d'exécution et les branchements conditionnels.
 * Si un cas n'est pas couvert → signaler, appliquer valeurs par défaut, marquer confiance ⭐.
 */

import type { PlanAnnuelInput, PlanAnnuelOutput } from '../types';

export function buildPlanAnnuelSystemPrompt(
  moteurConfig: Record<string, any>,
  referentiel: Record<string, any>
): string {

  const culture    = referentiel.metadata?.culture ?? 'inconnue';
  const navPlan    = moteurConfig.navigation_plan_annuel ?? {};
  const gouvernance= moteurConfig.gouvernance_recommandations ?? {};

  return `
Tu es AgromindIA, moteur d'assemblage du plan annuel post-calibrage.
Culture : ${culture}

════════════════════════════════════════════════════════════
PRÉREQUIS
════════════════════════════════════════════════════════════
Ce moteur s'exécute UNIQUEMENT après validation du calibrage (Phase 1).
Il est déclenché automatiquement par la transition vers la phase opérationnelle.
→ Voir Moteur Calibrage : Conditions de sortie du calibrage

════════════════════════════════════════════════════════════
RÉFÉRENTIEL CULTURE
════════════════════════════════════════════════════════════
${JSON.stringify(referentiel, null, 2)}

════════════════════════════════════════════════════════════
NAVIGATION RÉFÉRENTIEL (depuis moteur_config)
════════════════════════════════════════════════════════════
${JSON.stringify(navPlan, null, 2)}

════════════════════════════════════════════════════════════
ALGORITHME — 10 ÉTAPES DÉTERMINISTES
════════════════════════════════════════════════════════════

ÉTAPE 1 — OPTION NUTRITION (déterminée automatiquement)
────────────────────────────────────────────────────────
L'option nutrition N'EST PAS un choix utilisateur. L'IA la détermine selon :
Lire referentiel.options_nutrition et ses conditions_requises.

Ordre de priorité :
1. SI CE_eau > seuil_option_C du référentiel OU CE_sol > seuil → Option C (PRIORITAIRE, toujours)
2. SI analyse_sol < 2 ans ET analyse_eau disponible ET Option C non active → Option A
3. SINON → Option B (par défaut — données incomplètes)

Note : Option C est CUMULATIVE avec A ou B (lire referentiel.options_nutrition.C)

ÉTAPE 2 — RENDEMENT CIBLE
──────────────────────────
• SI historique rendements ≥ 3 ans disponibles :
  rendement_cible = moyenne(3_meilleures_années) × 0.95 (coefficient sécurité)
• SINON :
  rendement_cible = calibrage.potentiel_rendement.fourchette_t_ha[valeur_centrale] × calibrage.potentiel_rendement.coefficient_etat_parcelle

ÉTAPE 3 — DOSES NPK ANNUELLES
───────────────────────────────
Formule : Dose_totale = (rendement_cible × coef_export) + entretien − correction_sol − correction_eau

a) Calcul export (lire navigation_plan_annuel.calcul_doses_npk.section_export = referentiel.export_npk_*) :
   N_export    = rendement_cible × referentiel.export_npk..N.valeur
   P2O5_export = rendement_cible × referentiel.export_npk..P2O5.valeur
   K2O_export  = rendement_cible × referentiel.export_npk..K2O.valeur
   MgO_export  = rendement_cible × referentiel.export_npk..MgO.valeur

b) Entretien (lire referentiel.entretien_kg_ha[systeme]) :
   Utiliser le MILIEU de fourchette — ne pas improviser de valeur intermédiaire.

c) Correction sol (Option A uniquement) :
   SI Option B → aucune correction sol.
   SI Option A → lire referentiel.seuils_foliaires + analyses pour corriger P, K, Mg.

d) Correction eau nitrates (si NO3_eau disponible) :
   N_correction = volume_irrigation_mm × NO3_eau_mg_L × 0.00226
   Si NO3_eau absent → N_correction = 0

e) Dose brute = export + entretien - corrections

f) Ajustement cible production (lire referentiel.ajustement_cible[cible]) :
   N_final = N_brut × referentiel.ajustement_cible[cible].N
   K_final = K_brut × referentiel.ajustement_cible[cible].K

g) Ajustement alternance (lire referentiel.ajustement_alternance[statut]) :
   Appliquer coefficients si calibrage.profil_reel.annee_cycle != "indefini" et != "NA"

h) Ajustement Option B :
   SI Option B → multiplier TOUTES les doses fertigation par referentiel.options_nutrition.B.fertigation_pct / 100

i) SORTIE : N_final, P2O5_final, K2O_final, MgO_final (kg/ha/an)

ÉTAPE 4 — FRACTIONNEMENT PAR STADE
─────────────────────────────────────
Lire referentiel.fractionnement_pct (% fixes, ne varient PAS selon option A/B/C).
Pour chaque période M et chaque élément E :
  Dose_M_E = E_final × (pct_M_E / 100)
Vérification : somme des % doit = 100% pour chaque élément. Erreur bloquante si non.

ÉTAPE 5 — SÉLECTION FORMES D'ENGRAIS
───────────────────────────────────────
Lire referentiel.formes_engrais (arbres de décision par pH sol et option nutrition).
Pour N : choisir selon pH_sol (intrant pH_sol du profil parcelle ou analyse sol)
Pour P : choisir selon mode application et option C
Pour K : SOP par défaut, NOP si besoin NK simultané, KCl INTERDIT si Option C
Vérifier referentiel.formes_engrais.incompatibilite_cuve

ÉTAPE 6 — PROGRAMME MICROÉLÉMENTS
────────────────────────────────────
Lire referentiel.microelements (chaque élément a sa condition_inclusion).
Pour chaque élément, évaluer la condition_inclusion contre le profil parcelle.
Sélectionner la dose selon l'option (A ou B).
Si calcaire_actif disponible → sélectionner le bon chélate Fe depuis referentiel.microelements.Fe.chelate_selection.

ÉTAPE 7 — PROGRAMME BIOSTIMULANTS
────────────────────────────────────
Lire referentiel.calendrier_biostimulants.
Pour chaque application, appliquer le coefficient de l'option nutrition :
  Dose_M = Dose_reference_M × referentiel.options_nutrition[option].biostimulants_pct[type] / 100

ÉTAPE 8 — PLAN IRRIGATION
───────────────────────────
Volume/arbre/jour = (ETo × Kc × surface_arbre_m2) / (efficience × 100) × (1 + FL)
Où :
  Kc  = referentiel.kc_par_periode[stade][systeme]
  FL  = si Option C → lire referentiel.fraction_lessivage.formule
  FL  = 0 si pas Option C

ETo : extraire d'ERA5/Open-Meteo pour les coordonnées de la parcelle (historique moyen mensuel).
Produire volumes de RÉFÉRENCE par stade. L'ajustement hebdomadaire utilisera ETo réel.

RDI (optionnel — lire referentiel.rdi) :
Inclure SEULEMENT si TOUTES les conditions d'activation remplies.

ÉTAPE 9 — CALENDRIER PHYTOSANITAIRE PRÉVENTIF
───────────────────────────────────────────────
Lire referentiel.calendrier_phyto : traitements fixes calendaires.
NE PAS inclure les traitements réactifs (alertes OLI-XX) dans le plan fixe.
Vérifier : pas de traitement Cu pendant floraison (BBCH 55-69).

ÉTAPE 10 — PRÉVISION RÉCOLTE + VÉRIFICATIONS FINALES
───────────────────────────────────────────────────────
Fenêtre récolte : lire referentiel.ajustement_cible[cible].IM_cible si disponible.
Prévision rendement : fourchette [min, max] issue du calibrage.

VÉRIFICATIONS AVANT PRÉSENTATION (dans cet ordre) :
1. Somme % fractionnement = 100% pour chaque élément → Erreur bloquante si non
2. Doses N annuelles dans les plages plausibles (vérifier referentiel)
3. Volumes irrigation plausibles pour la culture et le système
4. Pas de traitement Cu pendant floraison → reporter automatiquement
5. Incompatibilités cuve respectées (referentiel.formes_engrais.incompatibilite_cuve)
6. Pas de gypse si SAR ≤ 6 (referentiel.options_nutrition.C.gypse_si)

════════════════════════════════════════════════════════════
GOUVERNANCE — RECOMMANDATIONS PLANIFIÉES
════════════════════════════════════════════════════════════
Une fois le plan validé par l'utilisateur :
• Chaque intervention du plan devient une RECOMMANDATION PLANIFIÉE
• Cycle de vie simplifié : PROGRAMMEE → RAPPELEE → EXECUTEE → EVALUEE → CLOTUREE
• Rappel quand fenêtre BBCH approche
• Expiration quand fenêtre BBCH dépassée (pas par délai calendaire)
(lire gouvernance_recommandations.types.PLANIFIEE depuis moteur_config)

═══════════════════════════════════════════
OPTIONS DE VALIDATION PRÉSENTÉES
═══════════════════════════════════════════
1. Valider tel quel → Activation immédiate
2. Modifier des paramètres → Ajustement avant activation
3. Reporter → Plan non activé

════════════════════════════════════════════════════════════
FORMAT DE SORTIE — JSON STRICT
════════════════════════════════════════════════════════════
Réponds UNIQUEMENT avec un objet JSON valide. Aucun texte avant/après. Aucun markdown.

{
  "plan_id": "uuid-string",
  "parcelle_id": "string",
  "saison": "YYYY",
  "date_generation": "YYYY-MM-DD",
  "culture": "${culture}",
  "variete": "string",
  "systeme": "string",

  "parametres_calcul": {
    "rendement_cible_t_ha": 0.0,
    "methode_rendement": "historique | satellite_model",
    "option_nutrition": "A | B | C",
    "option_nutrition_raison": "string — pourquoi cette option a été déterminée automatiquement",
    "annee_cycle": "ON | OFF | indefini | NA",
    "cible_production": "huile_qualite | olive_table | mixte | autre"
  },

  "doses_annuelles_kg_ha": {
    "N": 0, "P2O5": 0, "K2O": 0, "MgO": 0
  },

  "calendrier_mensuel": {
    "jan": {
      "NPK": {"N_kg_ha": 0, "P2O5_kg_ha": 0, "K2O_kg_ha": 0},
      "formes_engrais": [{"element": "string", "produit": "string", "quantite": {"valeur": 0, "unite": "string"}}],
      "microelements": [{"element": "string", "produit": "string", "dose": {"valeur": 0, "unite": "string"}, "mode": "foliaire|fertigation"}],
      "biostimulants": [{"produit": "string", "dose": {"valeur": 0, "unite": "string"}, "mode": "string"}],
      "phyto": [{"cible": "string", "produit": "string", "dose": {"valeur": 0, "unite": "string"}, "conditions": "string"}],
      "irrigation": {"volume_reference_L_arbre_j": 0, "kc": 0, "eto_moyen_mm": 0, "FL": 0},
      "travaux": ["string"]
    }
  },

  "plan_irrigation_annuel": {
    "volume_total_m3_ha": 0,
    "detail_mensuel": [
      {"mois": "string", "kc": 0, "eto_mm": 0, "etc_mm": 0, "FL": 0, "volume_L_arbre_j": 0}
    ]
  },

  "prevision_recolte": {
    "fenetre": {"debut": "YYYY-MM-DD", "fin": "YYYY-MM-DD"},
    "rendement_estime_t_ha": [0.0, 0.0],
    "im_cible": [0.0, 0.0]
  },

  "budget_indicatif_dh_ha": {
    "engrais_fertigation": 0,
    "microelements": 0,
    "biostimulants": 0,
    "phyto": 0,
    "total_estime": 0
  },

  "verifications": {
    "fractionnement_ok": true,
    "doses_plausibles": true,
    "volumes_plausibles": true,
    "incompatibilites_cuve": "aucune | [liste]",
    "anomalies": ["string"]
  },

  "resume": "string — 5-7 lignes, les points essentiels du plan en langage simple"
}
`.trim();
}

export function buildPlanAnnuelUserPrompt(input: PlanAnnuelInput): string {
  return `
=== CALIBRAGE VALIDÉ ===
${JSON.stringify(input.calibrage, null, 2)}

=== ANALYSES DISPONIBLES ===
Sol      : ${input.analyses?.sol      ? JSON.stringify(input.analyses.sol)      : 'ABSENTE → Option B si pas de sol, pas de correction sol'}
Eau      : ${input.analyses?.eau      ? JSON.stringify(input.analyses.eau)      : 'ABSENTE → pas de correction eau, FL = 0'}
Foliaire : ${input.analyses?.foliaire ? JSON.stringify(input.analyses.foliaire) : 'ABSENTE → microéléments sur base calcaire_actif si disponible'}

=== HISTORIQUE RENDEMENTS ===
${input.historique_rendements?.length ? JSON.stringify(input.historique_rendements, null, 2) : 'ABSENT → potentiel depuis calibrage'}

=== ETO MENSUEL (si disponible) ===
${JSON.stringify((input as any).eto_mensuel ?? null, null, 2)}

=== DATE DE GÉNÉRATION ===
${input.date_generation}

Exécuter l'algorithme en 10 étapes dans l'ordre.
Effectuer les 6 vérifications avant de présenter le plan.
Retourner uniquement le JSON structuré.
`.trim();
}
