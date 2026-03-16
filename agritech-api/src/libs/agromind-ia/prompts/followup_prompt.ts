// ============================================================
// AGROGINA — MOTEUR IA : SUIVI POST-RECOMMANDATION
// Phase 2c — Évaluation, Inférence et Recalibrage Continu
// Module Transversal — Toutes Cultures Arboricoles
// Version 1.0 — Février 2026
// ============================================================

import { PostRecommendationFollowUpInput } from '../interfaces';

// ============================================================
// SYSTEM PROMPT — IDENTITÉ ET POSTURE DE L'IA
// ============================================================

export const FOLLOWUP_EXPERT_SYSTEM_PROMPT = `
Tu es un agronome expert en arboriculture méditerranéenne et en télédétection agricole,
avec plus de 25 ans d'expérience terrain au Maroc et dans le Maghreb.

Tu interviens dans la phase de suivi post-recommandation. Une action a été recommandée,
elle a été réalisée (ou non), et il faut maintenant évaluer si elle a produit l'effet attendu.
C'est la phase la plus exigeante intellectuellement : tu dois distinguer une vraie réponse
agronomique d'un bruit satellite, une récupération réelle d'un artefact météo,
et une inefficacité de dose d'un mauvais timing.

Tu es aussi le garant de l'apprentissage de la plateforme. Ce que tu détectes ici
améliore les recommandations futures sur cette parcelle. C'est un cercle vertueux :
plus l'utilisateur déclare ses actions, plus le modèle devient précis.

---

PHASE DANS LAQUELLE TU INTERVIENS : SUIVI ET ÉVALUATION

Tu as quatre rôles simultanés dans ce module :

1. ÉVALUER l'efficacité d'une recommandation déjà exécutée
2. INFÉRER si une action a été réalisée même sans déclaration utilisateur
3. AJUSTER le plan annuel si la réponse est insuffisante ou absente
4. ALIMENTER le recalibrage continu de la baseline

---

TES COMPÉTENCES MOBILISÉES DANS CE MODULE :

1. DÉTECTION DE RÉPONSE SATELLITE
   Chaque type de recommandation a une signature de réponse attendue :
   — Fertigation azotée  : NDRE ↗ de 5-15% dans 7-14 jours
   — Irrigation          : NDMI ↗ vers P50 dans 3-7 jours
   — Chélate fer         : GCI ↗ (verdissement) dans 10-20 jours
   — Amendement sol      : NDVI ↗ progressif dans 30-90 jours
   — Biostimulants       : NDRE + NIRv légère amélioration dans 5-10 jours
   — Traitement phyto    : Stabilisation NDVI (pas de réponse directe attendue)

   Règle de lecture de la réponse :
   — Remontée progressive (2-4 semaines) → Récupération après intervention
   — Remontée brutale (< 10 jours) → Artefact possible, vérifier qualité image
   — Stagnation basse (> 4 semaines) → Blocage persistant, ajuster stratégie
   — Nouveau déclin post-application → Intervention inefficace ou mauvais diagnostic

2. INFÉRENCE D'EXÉCUTION SANS DÉCLARATION
   Si l'utilisateur n'a rien déclaré mais que les indices montrent un changement :
   — NDMI ↗ après période sèche + cohérent avec délai d'une irrigation → probable
   — NDRE ↗ cohérent avec délai post-fertigation N → probable
   — Changement localisé sur zone connue → probable
   
   Conditions d'inférence (toutes requises) :
   ✓ Changement clair et cohérent (≥ 2 passages consécutifs)
   ✓ Timing concordant avec la recommandation émise
   ✓ Localisation cohérente avec la zone ciblée
   
   Si inférence validée :
   — Passer la recommandation en état "Exécutée détectée par IA"
   — Notifier l'utilisateur et demander confirmation
   — Proposer saisie antidatée

3. STATUTS DU CYCLE DE VIE D'UNE RECOMMANDATION
   Proposée → Validée → En attente d'exécution → Exécutée (déclarée) → Évaluée → Clôturée
   OU : → Non exécutée → Ajustement stratégie
   OU : → Exécutée détectée par IA (sans déclaration) → Évaluée → Clôturée

4. LOGIQUE D'AJUSTEMENT DU PLAN ANNUEL
   Si recommandation inefficace :
   — Dose insuffisante → Ajouter application corrective (ne pas modifier les doses futures)
   — Mauvais timing → Reformuler pour prochaine fenêtre
   — Mauvais diagnostic → Réviser le diagnostic initial, générer nouvelle hypothèse
   — Conditions défavorables → Documenter, relancer dans la prochaine fenêtre

   Si rendement révisé < 70% cible :
   — Réduire doses K restantes × 0.75 (moins de fruits = moins d'export)
   — Enregistrer l'ajustement avec justification

   Règle de recalibrage continu des percentiles :
   — Les nouvelles données PONDÈRENT les anciennes (pas de remplacement total)
   — Les périodes anormales restent exclues
   — Le niveau de confiance est réévalué à chaque événement significatif
   — Événements impactant la confiance :
     +5 à +10 pts : Nouvelle campagne validée avec rendement réel
     +5 à +15 pts : Nouvelle analyse sol/eau uploadée
     +5 pts       : 12 mois supplémentaires de données satellite
     -5 à -10 pts : Écart prévision vs réel > 30%
     -2 pts       : Données corrigées après erreur (temporaire)

5. HUMILITÉ ÉPISTÉMIQUE — RÈGLES DE FORMULATION
   Tu peux affirmer avec confiance :
   ✓ Les valeurs des indices satellite (mesure objective)
   ✓ La position de ces valeurs vs baseline calibrée
   ✓ La tendance sur plusieurs passages
   ✓ La cohérence ou incohérence entre indices

   Tu NE DOIS PAS affirmer :
   ✗ L'efficacité garantie d'une intervention
   ✗ Un diagnostic sans alternative quand plusieurs causes sont possibles
   ✗ Une réponse positive si la fenêtre d'évaluation n'est pas complète
   ✗ Que l'absence de réponse satellite = échec (la réponse peut être trop lente)

   Quand dire "je ne peux pas conclure" :
   — Données satellite manquantes > 20 jours (nuages)
   — Fenêtre d'évaluation non complète
   — Événement météo confondant (pluie abondante pendant l'évaluation d'une irrigation)

---

FORMAT DE SORTIE :
Tu retournes UNIQUEMENT un objet JSON valide, sans texte avant ni après.
`;

// ============================================================
// USER PROMPT — DONNÉES DE SUIVI + SCHEMA DE SORTIE
// ============================================================

export function buildFollowUpPrompt(
  data: PostRecommendationFollowUpInput,
  language: string = 'fr',
): string {
  const langInstruction =
    language === 'fr'
      ? 'Fournir tout le contenu textuel en français.'
      : 'Provide all text content in English.';

  return `
${langInstruction}

Évalue le suivi post-recommandation pour la parcelle "${data.parcel.name}".
Analyse si l'intervention a produit l'effet attendu et ajuste la stratégie si nécessaire.

====================================================
1. RECOMMANDATION ÉVALUÉE
====================================================
ID recommandation : ${data.recommendation.id}
Type : ${data.recommendation.category}
Titre : ${data.recommendation.title}
Diagnostic initial : ${data.recommendation.initialDiagnosis}
Confiance diagnostic : ${data.recommendation.diagnosticConfidence}

Action prescrite :
- Produit : ${data.recommendation.action.product ?? 'N/A'}
- Dose : ${data.recommendation.action.dose ?? 'N/A'} ${data.recommendation.action.doseUnit ?? ''}
- Méthode : ${data.recommendation.action.method ?? 'N/A'}
- Zone ciblée : ${data.recommendation.action.targetZone ?? 'N/A'}

Dates :
- Émise le : ${data.recommendation.issuedDate}
- Exécutée le (déclarée) : ${data.recommendation.executedDate ?? 'Non déclarée'}
- Fenêtre évaluation : ${data.recommendation.evaluationWindowDays} jours
- Date limite évaluation : ${data.recommendation.evaluationDeadline}

Indicateur suivi : ${data.recommendation.followUp.indicatorToMonitor}
Réponse attendue : ${data.recommendation.followUp.expectedResponse}

====================================================
2. STATUT ACTUEL DE LA RECOMMANDATION
====================================================
Statut déclaré par utilisateur : ${data.recommendation.status}
${data.recommendation.userNote ? `Note utilisateur : ${data.recommendation.userNote}` : ''}

====================================================
3. INDICES SATELLITE — AVANT / APRÈS
====================================================
Date avant application (référence) : ${data.satelliteComparison.beforeDate}
Date après application (évaluation) : ${data.satelliteComparison.afterDate}
Jours écoulés depuis application : ${data.satelliteComparison.daysElapsed}
Fenêtre complète atteinte : ${data.satelliteComparison.evaluationWindowComplete ? 'OUI' : 'NON — évaluation partielle'}

Comparaison indices :
${[
  { index: 'NDVI',  before: data.satelliteComparison.before.ndvi,  after: data.satelliteComparison.after.ndvi  },
  { index: 'NIRv',  before: data.satelliteComparison.before.nirv,  after: data.satelliteComparison.after.nirv  },
  { index: 'NIRvP', before: data.satelliteComparison.before.nirvp, after: data.satelliteComparison.after.nirvp },
  { index: 'NDMI',  before: data.satelliteComparison.before.ndmi,  after: data.satelliteComparison.after.ndmi  },
  { index: 'NDRE',  before: data.satelliteComparison.before.ndre,  after: data.satelliteComparison.after.ndre  },
  { index: 'MSI',   before: data.satelliteComparison.before.msi,   after: data.satelliteComparison.after.msi   },
  { index: 'GCI',   before: data.satelliteComparison.before.gci,   after: data.satelliteComparison.after.gci   },
].map(({ index, before, after }) => {
  const change = before != null && after != null
    ? ((after - before) / Math.abs(before) * 100).toFixed(1)
    : null;
  const arrow = change != null ? (Number(change) > 0 ? '↗' : Number(change) < 0 ? '↘' : '→') : '?';
  return `- ${index.padEnd(6)} : ${before?.toFixed(3) ?? 'N/A'} → ${after?.toFixed(3) ?? 'N/A'} ${arrow} ${change != null ? `(${Number(change) > 0 ? '+' : ''}${change}%)` : ''}`;
}).join('\n')}

Positions vs baseline :
${data.satelliteComparison.afterPositions ? Object.entries(data.satelliteComparison.afterPositions).map(
  ([index, position]) => `- ${index.toUpperCase().padEnd(6)} : ${position}`
).join('\n') : 'Non disponible'}

Tendance observée sur les passages post-application :
${data.satelliteComparison.trendObservation ?? 'Non disponible'}

====================================================
4. CONTEXTE MÉTÉO PENDANT LA FENÊTRE D'ÉVALUATION
====================================================
- Précipitations totales : ${data.weatherContext.precipitationTotal?.toFixed(1) ?? 'N/A'} mm
- Température moy. min/max : ${data.weatherContext.tMin?.toFixed(1) ?? 'N/A'}°C / ${data.weatherContext.tMax?.toFixed(1) ?? 'N/A'}°C
- Événements confondants : ${data.weatherContext.confoundingEvents ?? 'Aucun signalé'}
- Qualité images satellite (couverture nuageuse) : ${data.weatherContext.cloudCoverageIssues ?? 'Acceptable'}

====================================================
5. INFÉRENCE SATELLITE (si action non déclarée)
====================================================
${data.recommendation.executedDate
  ? 'Action déclarée par l\'utilisateur — pas d\'inférence nécessaire.'
  : `Action non déclarée. Analyse pour inférence :
- Changement cohérent détecté : ${data.inferenceData?.coherentChangeDetected ? 'OUI' : 'NON'}
- Timing concordant : ${data.inferenceData?.timingCoherent ? 'OUI' : 'NON'}
- Localisation cohérente : ${data.inferenceData?.locationCoherent ? 'OUI' : 'NON'}
- Conclusion inférence : ${data.inferenceData?.inferenceConclusion ?? 'Non disponible'}`}

====================================================
6. PLAN ANNUEL — INTERVENTIONS RESTANTES
====================================================
Doses déjà appliquées cette saison :
${data.seasonProgress?.appliedDoses ? JSON.stringify(data.seasonProgress.appliedDoses, null, 2) : 'Non disponible'}

Rendement révisé (si disponible) : ${data.seasonProgress?.yieldForecastRevised ?? 'Pas encore révisé'} T/ha
Rendement cible initial : ${data.seasonProgress?.yieldTarget ?? 'N/A'} T/ha

Interventions restantes dans le plan :
${data.seasonProgress?.remainingInterventions && data.seasonProgress.remainingInterventions.length > 0
  ? data.seasonProgress.remainingInterventions.map((i: any) =>
    `- [${i.month.toUpperCase()}] ${i.type} : ${i.product ?? ''} ${i.dose ?? ''} ${i.doseUnit ?? ''} — Statut : ${i.status}`
  ).join('\n')
  : 'Aucune intervention restante ou non disponible.'}

====================================================
7. SORTIE REQUISE — JSON STRICT
====================================================
Retourne UNIQUEMENT un objet JSON valide avec la structure exacte ci-dessous.

{
  "recommendationId": "${data.recommendation.id}",
  "evaluationDate": "Date de l'évaluation",
  "evaluationWindowComplete": <true | false>,

  "executionStatus": {
    "declaredByUser": <true | false>,
    "inferredBySatellite": <true | false>,
    "inferenceConfidence": "haute | moyenne | faible | non_applicable",
    "inferenceRationale": "Explication si inférence réalisée, null sinon",
    "finalStatus": "executee | non_executee | executee_inferree | evaluation_incomplete",
    "userNotificationRequired": <true | false>,
    "userNotificationMessage": "Message à envoyer à l'utilisateur si notification requise, null sinon"
  },

  "responseAssessment": {
    "overallResponse": "efficace | partiellement_efficace | non_efficace | trop_tot | non_evaluable",
    "primaryIndicator": {
      "index": "Indice principal surveillé",
      "expectedChange": "Réponse attendue",
      "observedChange": "Réponse observée (valeur et direction)",
      "responseAdequate": <true | false>
    },
    "supportingEvidence": [
      "Élément satellite ou météo soutenant l'évaluation"
    ],
    "confoundingFactors": [
      "Facteur météo ou autre ayant pu interférer avec l'évaluation"
    ],
    "confidence": "elevee | moyenne | faible",
    "confidenceRationale": "Pourquoi ce niveau de confiance dans l'évaluation"
  },

  "diagnosisReview": {
    "initialDiagnosisConfirmed": <true | false | null si non évaluable>,
    "diagnosisRevision": "Révision du diagnostic initial si la réponse contredit l'hypothèse, null sinon",
    "newHypothesis": "Nouvelle hypothèse si le diagnostic initial est remis en question, null sinon",
    "lessonLearned": "Ce que ce cas apprend sur le comportement de cette parcelle"
  },

  "planAdjustments": [
    {
      "type": "ajout_correctif | modification_dose | report | annulation | aucun",
      "interventionAffected": "ID ou description de l'intervention concernée dans le plan",
      "adjustmentDetail": "Description précise de l'ajustement (ex: Ajouter 15 kg N/ha correctif en fertigation)",
      "rationale": "Justification de l'ajustement",
      "newDose": <nouvelle dose si applicable, null sinon>,
      "newTiming": "Nouveau timing si applicable, null sinon"
    }
  ],

  "baselineUpdate": {
    "updateRequired": <true | false>,
    "updateType": "progressif | partiel_F2 | annuel_F3 | aucun",
    "elementsToUpdate": [
      "Élément de la baseline à mettre à jour et pourquoi"
    ],
    "confidenceScoreImpact": <variation du score de confiance en points, ex: +5 ou -5>,
    "confidenceRationale": "Raison de l'impact sur le niveau de confiance"
  },

  "nextRecommendation": {
    "blocked": <true | false>,
    "blockedReason": "Raison si bloquée (fenêtre d'évaluation non clôturée), null sinon",
    "canGenerateNewOf": "Types de recommandations qui peuvent être générés maintenant",
    "suggestedNextAnalysis": <nombre de jours avant prochaine analyse utile>
  },

  "yieldForecastUpdate": {
    "revisionTriggered": <true | false>,
    "revisionDirection": "hausse | baisse | stable | non_applicable",
    "revisionRationale": "Raison de la révision si applicable",
    "updatedForecast": {
      "low": <T/ha ou null>,
      "central": <T/ha ou null>,
      "high": <T/ha ou null>
    }
  },

  "summary": "2-3 phrases résumant : ce qui a été observé, si l'intervention a fonctionné, et ce qui se passe ensuite. Langage clair et factuel pour l'agriculteur."
}

EXIGENCES CRITIQUES :
— Une réponse "non évaluable" est acceptable si la fenêtre n'est pas complète ou si les nuages empêchent l'évaluation — ne pas forcer une conclusion
— Si inférence réalisée : notifier l'utilisateur avec un message clair et concis
— Les ajustements du plan sont tracés avec leur justification — jamais silencieux
— Une recommandation clôturée débloque les recommandations du même type
— L'impact sur le score de confiance doit être cohérent avec la grille définie
— Tout le contenu textuel en ${language === 'fr' ? 'français' : 'anglais'}
`;
}
