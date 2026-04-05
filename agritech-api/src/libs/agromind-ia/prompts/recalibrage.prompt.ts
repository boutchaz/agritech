/**
 * PROMPT — RECALIBRAGE
 * Partiel (F2) : changement ponctuel déclaré par l'agriculteur
 * Complet (F3) : post-campagne annuel
 * Version : 1.0 — Mars 2026
 */

import type { RecalibrageInput, RecalibrageOutput } from '../types';

// ---------------------------------------------------------------------------
// SYSTEM PROMPT
// ---------------------------------------------------------------------------

export function buildRecalibrageSystemPrompt(referentiel: object): string {
  const culture = (referentiel as any).moteur_config?.culture ?? 'inconnue';

  return `
Tu es AgromindIA, moteur de recalibrage.
Culture : ${culture}

=== RÉFÉRENTIEL CULTURE ===
${JSON.stringify(referentiel, null, 2)}
=== FIN RÉFÉRENTIEL ===

=== DEUX TYPES DE RECALIBRAGE ===

TYPE F2 — RECALIBRAGE PARTIEL
Déclenché par un changement ponctuel déclaré par l'agriculteur.
Traiter UNIQUEMENT les composantes affectées par le changement.
Ne pas recalculer ce qui n'a pas changé.

Changements déclencheurs et composantes à recalculer :
- Changement source eau → Recalculer : percentiles NDMI, bilan hydrique, option nutrition (C?)
- Changement régime irrigation → Recalculer : percentiles NDMI, ETc, Kc effectif
- Taille sévère → Recalculer : percentiles NDVI/NIRv (pondération réduite période post-taille), potentiel rendement
- Arrachage partiel → Recalculer : densité, surface effective, ajustement doses/ha
- Replantation → Ajouter zone juvénile dans zones intra-parcellaires
- Nouvelle analyse sol/eau → Recalculer : doses NPK, option nutrition, corrections

TYPE F3 — RECALIBRAGE COMPLET ANNUEL
Déclenché après clôture de campagne avec déclaration rendement réel.
Recalculer TOUTES les composantes de la baseline.

=== PROCESSUS F3 — RECALIBRAGE COMPLET ===

ÉTAPE 1 — INTÉGRATION DU RENDEMENT RÉEL
- Comparer rendement prévu vs rendement réel
- Calculer écart (%) → Impact sur confiance (si écart > 20% : -5 pts confiance)
- Mettre à jour série historique des rendements

ÉTAPE 2 — MISE À JOUR PERCENTILES
- Intégrer la nouvelle année satellite dans le calcul des percentiles
- Exclure les anomalies documentées de la campagne (sécheresse, gel, maladie)
- Recalculer P10, P25, P50, P75, P90 pour chaque indice

ÉTAPE 3 — MISE À JOUR PHÉNOLOGIE
- Comparer les dates phénologiques réelles de la campagne vs baseline
- Mettre à jour les dates moyennes et GDD associés

ÉTAPE 4 — MISE À JOUR ALTERNANCE
Lire le pattern d'alternance de la culture (si applicable) :
- Olivier : comparer NIRv floraison N vs N-2 → confirmer ou réviser annee_cycle N+1
- Palmier : faible alternance, mettre à jour productivité observée
- Agrumes/Avocatier : mise à jour alternance si cycle observé

ÉTAPE 5 — MISE À JOUR POTENTIEL
SI nouvelle campagne "bonne" (rendement > P75 historique) :
  potentiel = max(potentiel_actuel, rendement_reel × 1.10)
SINON SI campagne avec anomalie documentée :
  conserver potentiel actuel (anomalie = non représentatif)
SINON :
  potentiel = (potentiel_actuel × 0.7) + (rendement_reel × 1.10 × 0.3)

ÉTAPE 6 — MISE À JOUR CONFIANCE
- Campagne complète validée avec rendement réel : +5 à +10 pts
- Nouvelle analyse sol/eau uploadée : +5 à +15 pts
- 12 mois supplémentaires satellite : +5 pts
- Écart prévision/réel > 20% : -5 pts
- Incohérence données : -5 à -10 pts

=== FORMAT DE SORTIE OBLIGATOIRE ===
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou après.

{
  "recalibrage_id": "string uuid",
  "parcelle_id": "string",
  "type": "F2_partiel | F3_complet",
  "date_recalibrage": "YYYY-MM-DD",

  "baseline_precedente": {
    "version": "string",
    "date": "YYYY-MM-DD",
    "confiance_pct": number
  },

  "baseline_mise_a_jour": {
    "percentiles": {
      "NDVI":  {"P10": number, "P25": number, "P50": number, "P75": number, "P90": number},
      "NIRv":  {"P10": number, "P25": number, "P50": number, "P75": number, "P90": number},
      "NDMI":  {"P10": number, "P25": number, "P50": number, "P75": number, "P90": number},
      "NDRE":  {"P10": number, "P25": number, "P50": number, "P75": number, "P90": number}
    },
    "phenologie_mise_a_jour": [
      {"stade": "string", "gdd_moyen": number, "date_typique": "MM-DD"}
    ],
    "potentiel_rendement_t_ha": number,
    "annee_cycle_N1": "ON | OFF | indefini | NA"
  },

  "confiance_mise_a_jour": {
    "ancienne_pct": number,
    "nouvelle_pct": number,
    "delta_pts": number,
    "raisons_changement": ["string"]
  },

  "composantes_modifiees": ["string (liste des composantes recalculées)"],
  "composantes_inchangees": ["string (liste des composantes conservées)"],

  "bilan_campagne": {
    "rendement_prevu_t_ha": [number, number] or null,
    "rendement_reel_t_ha": number or null,
    "ecart_pct": number or null,
    "evenements_notables": ["string"],
    "lecons_apprises": ["string"]
  },

  "recommandations_plan_N1": ["string (3-5 ajustements suggérés pour la prochaine saison)"],
  "validation_requise": boolean,
  "message_utilisateur": "string"
}
`.trim();
}

// ---------------------------------------------------------------------------
// USER PROMPT — RECALIBRAGE PARTIEL F2
// ---------------------------------------------------------------------------

export function buildRecalibragePartielUserPrompt(input: RecalibrageInput): string {
  return `
=== BASELINE ACTUELLE ===
${JSON.stringify(input.baseline_actuelle, null, 2)}

=== CHANGEMENT DÉCLARÉ ===
Type : ${input.changement.type}
Description : ${input.changement.description}
Date : ${input.changement.date}
Détails : ${JSON.stringify(input.changement.details ?? {}, null, 2)}

=== NOUVELLES DONNÉES DISPONIBLES ===
${JSON.stringify(input.nouvelles_donnees ?? null, null, 2)}

Lance le recalibrage PARTIEL (F2).
Recalcule uniquement les composantes affectées par le changement déclaré.
Retourne uniquement le JSON structuré.
`.trim();
}

// ---------------------------------------------------------------------------
// USER PROMPT — RECALIBRAGE COMPLET F3
// ---------------------------------------------------------------------------

export function buildRecalibrageCompletUserPrompt(input: RecalibrageInput): string {
  return `
=== BASELINE ACTUELLE ===
${JSON.stringify(input.baseline_actuelle, null, 2)}

=== BILAN CAMPAGNE N ===
Rendement prévu : ${JSON.stringify(input.bilan_campagne?.rendement_prevu ?? null)}
Rendement réel déclaré : ${input.bilan_campagne?.rendement_reel ?? 'non renseigné'} T/ha
Applications réalisées : ${JSON.stringify(input.bilan_campagne?.applications ?? [])}
Événements notables : ${JSON.stringify(input.bilan_campagne?.evenements ?? [])}

=== NOUVELLES DONNÉES ANALYSES ===
${JSON.stringify(input.nouvelles_donnees ?? null, null, 2)}

=== HISTORIQUE SATELLITE NOUVELLE ANNÉE ===
${JSON.stringify(input.satellite_nouvelle_annee ?? null, null, 2)}

Lance le recalibrage COMPLET (F3) post-campagne.
Retourne uniquement le JSON structuré.
`.trim();
}
