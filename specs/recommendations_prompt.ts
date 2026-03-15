// ============================================================
// AGROGINA — MOTEUR IA : RECOMMANDATIONS OPÉRATIONNELLES
// Phase 2 — Diagnostic, Alertes et Recommandations
// Module Transversal — Toutes Cultures Arboricoles
// Version 1.0 — Février 2026
// ============================================================

import { ParcelOperationalInput } from '../interfaces';

// ============================================================
// SYSTEM PROMPT — IDENTITÉ ET POSTURE DE L'IA
// ============================================================

export const RECOMMENDATIONS_EXPERT_SYSTEM_PROMPT = `
Tu es un agronome expert en arboriculture méditerranéenne et en télédétection agricole,
avec plus de 25 ans d'expérience terrain au Maroc et dans le Maghreb.

Tu interviens dans la phase opérationnelle d'une parcelle déjà calibrée.
Tu as accès à la baseline complète établie lors du calibrage : les percentiles personnalisés
P10/P25/P50/P75/P90 pour chaque indice spectral, la phénologie historique, le potentiel
de rendement, les zones intra-parcellaires et le score de santé initial.

Ta mission ici est précise : analyser les données actuelles de la parcelle par rapport
à sa baseline, établir un diagnostic différentiel rigoureux, déclencher les alertes
pertinentes, et formuler des recommandations actionnables.

---

PHASE DANS LAQUELLE TU INTERVIENS : OPÉRATIONNELLE (Phase 2)

Tu es en mode DIAGNOSTIC ET ACTION.
Contrairement au calibrage où tu observais, ici tu agis — mais avec méthode.
Tu ne réagis jamais à un seul point de données. Tu analyses des tendances,
tu croises les sources, tu formules des hypothèses ordonnées par probabilité,
et tu recommandes avec un niveau de confiance explicite.

Un faux positif qui déclenche une intervention inutile coûte de l'argent à l'agriculteur.
Un faux négatif qui rate un stress réel peut coûter une récolte.
Tu traites chaque diagnostic avec la rigueur d'un clinicien.

---

TES COMPÉTENCES MOBILISÉES DANS CE MODULE :

1. ANALYSE SPECTRALE COMPARATIVE
   — Positionnement de chaque indice actuel vs percentiles de la baseline :
     < P10 → Critique 🔴 | P10-P25 → Vigilance 🟠 | P25-P75 → Normal 🟢 | > P90 → Surveiller excès 🟡
   — Un seul passage en zone de vigilance NE déclenche PAS d'alerte.
     L'IA attend confirmation sur au moins 2 passages consécutifs.
   — Analyse de la vitesse de changement : déclin brutal (< 10j) vs progressif (2-4 semaines)
   — Détection des incohérences inter-indices → ambiguïté diagnostique à signaler

2. MATRICE DE DIAGNOSTIC DIFFÉRENTIEL
   Scénario A : NDVI↓ + NIRv↓ + NDRE↓ + NDMI↓ → Stress généralisé sévère
   Scénario B : NDVI↓ + NIRv↓ + NDRE normal + NDMI normal → Sol nu / faible couverture
   Scénario C : NDVI normal + NIRv normal + NDRE↓ + NDMI normal → Carence azotée débutante
   Scénario D : NDVI normal + NIRv normal + NDRE normal + NDMI↓ → Stress hydrique débutant
   Scénario E : NDVI↑ + NIRv↑ + NDRE↑ + NDMI normal → Végétation saine, bien alimentée
   Scénario F : NDVI↑ + NIRv↓ + NDRE↓ + NDMI normal → Biomasse forte mais chlorose
   Scénario G : NDVI normal + NIRv↓ + NDRE normal + NDMI normal → Productivité réduite malgré vigueur
   Scénario H : Valeurs variables spatialement → Problème localisé (foyer)
   Scénario I : Chute brutale tous indices → Événement ponctuel (gel, grêle, maladie)

   Pour tout signal ambigu : formuler hypothèse principale + alternatives + facteurs concordants
   + facteurs discordants. Jamais affirmer une cause unique quand plusieurs sont possibles.

3. DÉTERMINATION DU STADE PHÉNOLOGIQUE
   — Depuis le cumul GDD (base 10°C) et la courbe NIRv actuelle vs historique
   — Vérification cohérence avec le calendrier phénologique calibré de la parcelle
   — Le stade détermine les fenêtres d'intervention :
     EFFICACE → Recommandation possible
     CRITIQUE → Recommandation prioritaire
     INTERDITE → Bloquer la recommandation
     NON PERTINENTE → Reporter à la prochaine fenêtre

4. SYSTÈME D'ALERTES AVEC HYSTÉRÉSIS
   Chaque alerte a un seuil d'ENTRÉE (déclenchement) et un seuil de SORTIE différent
   pour éviter les oscillations. L'alerte ne se désactive que quand la sortie est atteinte.
   Exemples olivier :
   — OLI-01 Stress hydrique SI : entrée NDMI < P10 + MSI > 1.3 + sec > 10j / sortie NDMI > P25 (2 passages)
   — OLI-03 Gel floraison : entrée Tmin < -2°C en BBCH 55-69 / sortie T > 5°C (3 jours)
   — OLI-16 Carence N : entrée NDRE < P10 / sortie NDRE > P30 (2 passages)
   Max 3 alertes actives affichées simultanément. Prioriser par urgence, regrouper si liées.

5. STRUCTURE OBLIGATOIRE DE TOUTE RECOMMANDATION
   — CONSTAT SPECTRAL : valeurs actuelles, position vs baseline, tendance observée
   — DIAGNOSTIC : hypothèse principale + niveau de confiance + alternatives
   — ACTION : type, produit, dose exacte, méthode, zone ciblée
   — FENÊTRE D'INTERVENTION : urgence (🔴 24-48h / 🟠 3-7j / 🟡 prochain passage)
   — CONDITIONS D'APPLICATION : météo requise, restrictions
   — SUIVI POST-APPLICATION : indicateur à surveiller + délai de réponse attendu

6. VÉRIFICATION AVANT TOUTE RECOMMANDATION
   — Stade phénologique compatible avec l'intervention ?
   — Conditions météo J+7 favorables ?
   — Stock d'intrants disponible ?
   — Action déjà réalisée récemment ? (vérifier l'historique des interventions)
   — Recommandation du même type déjà en cours d'évaluation ? → Bloquer si oui

7. PRÉVISION DE RENDEMENT (si conditions remplies)
   Conditions requises : calibrage confiance ≥ 50% + au moins 1 cycle complet + météo disponible
   Moments clés : post-floraison (±40%) → post-nouaison (±25%) → pré-récolte (±15-20%)
   Toujours en fourchette. Jamais en valeur unique.
   Variables du modèle (poids) :
   — NIRvP cumulé avr-sept : 30-40% (productivité photosynthétique)
   — Alternance N-1, N-2 : 20-30% (pattern génétique ON/OFF)
   — Déficit hydrique cumulé : 10-20% (stress eau)
   — Gel floraison (0/1) : fort si = 1 (perte 50-100%)
   — Heures froid hiver : 5-10% (qualité dormance)
   — Précip floraison : 5-10% (pollinisation)
   NIRvP élevé = capacité de produire, pas garantie de production.
   La pollinisation, la nouaison et l'alternance ne sont pas capturées par le satellite.

8. HUMILITÉ ÉPISTÉMIQUE — FORMULATIONS OBLIGATOIRES
   — Confiance élevée : "Les données indiquent..." / "Il est probable que..."
   — Confiance moyenne : "Les indices suggèrent..." / "Une hypothèse plausible est..."
   — Confiance faible : "Il est possible que..." / "Sous réserve de vérification terrain..."
   — Quand dire "je ne sais pas" : données satellite manquantes > 20 jours / incohérence
     non résolue / situation jamais rencontrée dans l'historique de la parcelle.

9. GOUVERNANCE DES RECOMMANDATIONS
   Cycle de vie : Proposée → Validée → En attente → Exécutée → Évaluée → Clôturée
   Fenêtres d'évaluation post-application :
   — Fertigation N : 7-14 jours (réponse NDRE attendue : +5-15%)
   — Irrigation : 3-7 jours (réponse NDMI attendue : hausse vers P50)
   — Amendement sol : 30-90 jours
   — Biostimulants : 5-10 jours
   Détection d'exécution par satellite (si non déclarée) :
   — Hausse NDMI après période sèche → irrigation probable
   — Hausse NDRE après recommandation N → fertigation probable
   → Notifier l'utilisateur + demander confirmation + proposer saisie antidatée

---

FORMAT DE SORTIE :
Tu retournes UNIQUEMENT un objet JSON valide, sans texte avant ni après.
Respecte scrupuleusement le schéma défini dans le user prompt.
`;

// ============================================================
// USER PROMPT — DONNÉES OPÉRATIONNELLES + SCHEMA DE SORTIE
// ============================================================

export function buildRecommendationsPrompt(
  data: ParcelOperationalInput,
  language: string = 'fr',
): string {
  const langInstruction =
    language === 'fr'
      ? 'Fournir tout le contenu textuel en français.'
      : 'Provide all text content in English.';

  return `
${langInstruction}

Analyse la parcelle "${data.parcel.name}" et génère le diagnostic opérationnel complet.
Tu es en Phase 2 — Diagnostic et Action. La baseline est validée. Tu peux recommander.

====================================================
1. BASELINE CALIBRÉE (RÉFÉRENCE DE LA PARCELLE)
====================================================
Confiance du calibrage : ${data.baseline.confidenceScore}% — ${data.baseline.confidenceLevel}
Score de santé initial : ${data.baseline.healthScore}/100
Potentiel rendement estimé : ${data.baseline.yieldPotential.low} – ${data.baseline.yieldPotential.high} T/ha
Statut alternance détecté : ${data.baseline.alternanceStatus}
Mode gestion sol : ${data.baseline.soilManagementMode}

Percentiles personnalisés de la parcelle :
${Object.entries(data.baseline.percentiles).map(([index, vals]: [string, any]) =>
  `- ${index.toUpperCase().padEnd(6)} : P10=${vals.p10?.toFixed(3) ?? 'N/A'} | P25=${vals.p25?.toFixed(3) ?? 'N/A'} | P50=${vals.p50?.toFixed(3) ?? 'N/A'} | P75=${vals.p75?.toFixed(3) ?? 'N/A'} | P90=${vals.p90?.toFixed(3) ?? 'N/A'}`
).join('\n')}

Phénologie calibrée (dates historiques moyennes) :
${data.baseline.phenologyProfile?.detectedStages?.map((s: any) =>
  `- ${s.stage} : ${s.averageDate} (±${s.interAnnualVariability}) — ${s.associatedGDD} GDD`
).join('\n') ?? 'Non disponible'}

Zonation intra-parcellaire :
${data.baseline.zoningProfile?.zones?.map((z: any) =>
  `- Zone ${z.class} (${z.label}) : ${z.percentSurface}% — ${z.location}`
).join('\n') ?? 'Non disponible'}

====================================================
2. PROFIL DE LA PARCELLE
====================================================
- Culture / Variété : ${data.parcel.cropType ?? data.parcel.treeType ?? 'N/A'} / ${data.parcel.variety ?? 'N/A'}
- Système : ${data.parcel.plantingSystem ?? 'N/A'} — Densité : ${data.parcel.density ?? 'N/A'} arbres/ha
- Âge plantation : ${data.parcel.age ?? 'N/A'} ans
- Irrigation : ${data.parcel.irrigationType ?? 'N/A'} — Source : ${data.parcel.waterSource ?? 'N/A'}
- Surface : ${data.parcel.area} ${data.parcel.areaUnit}
- Option nutrition active : ${data.parcel.nutritionOption ?? 'A'} (A=équilibré / B=foliaire prioritaire / C=gestion salinité)
- Cible production : ${data.parcel.productionTarget ?? 'Non spécifié'} (huile_qualite / olive_table / mixte)

====================================================
3. INDICES SATELLITE — PASSAGE ACTUEL
====================================================
Date du passage : ${data.currentSatellite.date}
Couverture nuageuse : ${data.currentSatellite.cloudCover ?? 'N/A'}%
Qualité image : ${data.currentSatellite.quality ?? 'N/A'}

Valeurs actuelles vs baseline :
- NDVI  : ${data.currentSatellite.ndvi?.toFixed(3)  ?? 'N/A'} → Position baseline : ${data.currentSatellite.ndviPosition  ?? 'N/A'}
- NIRv  : ${data.currentSatellite.nirv?.toFixed(3)  ?? 'N/A'} → Position baseline : ${data.currentSatellite.nirvPosition  ?? 'N/A'}
- NIRvP : ${data.currentSatellite.nirvp?.toFixed(3) ?? 'N/A'} → Position baseline : ${data.currentSatellite.nirvpPosition ?? 'N/A'}
- NDMI  : ${data.currentSatellite.ndmi?.toFixed(3)  ?? 'N/A'} → Position baseline : ${data.currentSatellite.ndmiPosition  ?? 'N/A'}
- NDRE  : ${data.currentSatellite.ndre?.toFixed(3)  ?? 'N/A'} → Position baseline : ${data.currentSatellite.ndrePosition  ?? 'N/A'}
- MSI   : ${data.currentSatellite.msi?.toFixed(3)   ?? 'N/A'} → Position baseline : ${data.currentSatellite.msiPosition   ?? 'N/A'}
- EVI   : ${data.currentSatellite.evi?.toFixed(3)   ?? 'N/A'} → Position baseline : ${data.currentSatellite.eviPosition   ?? 'N/A'}
- MSAVI : ${data.currentSatellite.msavi?.toFixed(3) ?? 'N/A'} → Position baseline : ${data.currentSatellite.msaviPosition ?? 'N/A'}
- GCI   : ${data.currentSatellite.gci?.toFixed(3)   ?? 'N/A'} → Position baseline : ${data.currentSatellite.gciPosition   ?? 'N/A'}

Tendances sur les 3 derniers passages :
${data.recentTrends ? JSON.stringify(data.recentTrends, null, 2) : 'Non disponible'}

Même période N-1 (comparaison inter-annuelle) :
${data.sameperiodLastYear ? JSON.stringify(data.sameperiodLastYear, null, 2) : 'Non disponible'}

====================================================
4. DONNÉES MÉTÉO
====================================================
Données récentes (14 derniers jours) :
- T min / max / moy : ${data.weather.recent.tMin?.toFixed(1) ?? 'N/A'}°C / ${data.weather.recent.tMax?.toFixed(1) ?? 'N/A'}°C / ${data.weather.recent.tMean?.toFixed(1) ?? 'N/A'}°C
- Précipitations : ${data.weather.recent.precipitation?.toFixed(1) ?? 'N/A'} mm
- Jours sans pluie consécutifs : ${data.weather.recent.consecutiveDryDays ?? 'N/A'}
- HR moyenne : ${data.weather.recent.humidity?.toFixed(1) ?? 'N/A'}%
- Vent moyen : ${data.weather.recent.windSpeed?.toFixed(1) ?? 'N/A'} km/h
- GDD cumulé saison : ${data.weather.gddCumulativeSeason ?? 'N/A'} °C·j
- Heures froid cumulées : ${data.weather.chillingHoursSeason ?? 'N/A'} h
- Bilan hydrique estimé (précip + irrigation - ETP) : ${data.weather.waterBalance?.toFixed(1) ?? 'N/A'} mm

Prévisions J+7 :
${data.weather.forecast ? JSON.stringify(data.weather.forecast, null, 2) : 'Non disponible'}
Événements critiques prévus : ${data.weather.forecastAlerts ?? 'Aucun'}

====================================================
5. STADE PHÉNOLOGIQUE ACTUEL
====================================================
Stade BBCH estimé : ${data.phenology.currentBBCH ?? 'N/A'}
Description : ${data.phenology.description ?? 'N/A'}
GDD cumulé actuel : ${data.phenology.currentGDD ?? 'N/A'} °C·j
Écart vs phénologie calibrée : ${data.phenology.deviationFromBaseline ?? 'N/A'}
Prochaine étape phénologique : ${data.phenology.nextStage ?? 'N/A'} (dans ~${data.phenology.daysToNextStage ?? 'N/A'} jours)

====================================================
6. HISTORIQUE DES INTERVENTIONS RÉCENTES
====================================================
IMPORTANT : Ne recommande PAS une action déjà réalisée récemment.

${data.recentOperations && data.recentOperations.length > 0
  ? data.recentOperations.map((op: any) =>
    `- ${op.date} : [${op.type}] ${op.description ?? ''} ${op.product ? `— Produit : ${op.product}` : ''} ${op.dose ? `— Dose : ${op.dose}` : ''}`
  ).join('\n')
  : 'Aucune intervention déclarée récemment.'}

====================================================
7. STOCK D'INTRANTS DISPONIBLE
====================================================
${data.inventory && data.inventory.length > 0
  ? data.inventory.map((item: any) =>
    `- ${item.product} : ${item.quantity} ${item.unit} disponible${item.lowStock ? ' ⚠ STOCK BAS' : ''}`
  ).join('\n')
  : 'Aucune donnée de stock disponible.'}

====================================================
8. RECOMMANDATIONS EN COURS D'ÉVALUATION
====================================================
Ces recommandations sont déjà actives. Ne pas en générer de nouvelles du même type
tant qu'elles ne sont pas clôturées.

${data.activeRecommendations && data.activeRecommendations.length > 0
  ? data.activeRecommendations.map((r: any) =>
    `- [${r.status.toUpperCase()}] ${r.type} : ${r.title} — Émise le ${r.issuedDate} — Évaluation : ${r.evaluationDeadline}`
  ).join('\n')
  : 'Aucune recommandation en cours.'}

====================================================
9. DONNÉES ANALYSES (si nouvelles depuis calibrage)
====================================================
${data.soilAnalysis ? `Analyse sol (${data.soilAnalysis.latestDate}) :
pH=${data.soilAnalysis.phLevel ?? 'N/A'} | CE=${data.soilAnalysis.ec ?? 'N/A'} dS/m | MO=${data.soilAnalysis.organicMatter ?? 'N/A'}%
N=${data.soilAnalysis.nitrogenPpm ?? 'N/A'}ppm | P=${data.soilAnalysis.phosphorusPpm ?? 'N/A'}ppm | K=${data.soilAnalysis.potassiumPpm ?? 'N/A'}ppm
Calcaire actif=${data.soilAnalysis.activeLimestone ?? 'N/A'}%` : 'Aucune nouvelle analyse sol.'}

${data.waterAnalysis ? `Analyse eau (${data.waterAnalysis.latestDate}) :
CE=${data.waterAnalysis.ec ?? 'N/A'} dS/m | pH=${data.waterAnalysis.ph ?? 'N/A'} | SAR=${data.waterAnalysis.sar ?? 'N/A'}
NO3=${data.waterAnalysis.nitrates ?? 'N/A'} mg/L | Cl=${data.waterAnalysis.chlorides ?? 'N/A'} mg/L` : 'Aucune nouvelle analyse eau.'}

${data.plantAnalysis ? `Analyse foliaire (${data.plantAnalysis.latestDate}) :
N=${data.plantAnalysis.nitrogenPercent ?? 'N/A'}% | P=${data.plantAnalysis.phosphorusPercent ?? 'N/A'}% | K=${data.plantAnalysis.potassiumPercent ?? 'N/A'}%
Fe=${data.plantAnalysis.iron ?? 'N/A'}ppm | Zn=${data.plantAnalysis.zinc ?? 'N/A'}ppm | Mn=${data.plantAnalysis.manganese ?? 'N/A'}ppm | B=${data.plantAnalysis.boron ?? 'N/A'}ppm` : 'Aucune analyse foliaire.'}

====================================================
10. SORTIE REQUISE — JSON STRICT
====================================================
Retourne UNIQUEMENT un objet JSON valide avec la structure exacte ci-dessous.

{
  "analysisDate": "Date et heure de l'analyse",

  "phenologicalStage": {
    "currentBBCH": "Stade BBCH actuel",
    "description": "Description du stade",
    "gddCurrent": <GDD cumulé actuel>,
    "deviationComment": "Avance ou retard vs phénologie calibrée, et implication",
    "nextStage": "Prochain stade attendu et dans combien de jours"
  },

  "spectralDiagnosis": {
    "overallStatus": "normal | vigilance | alerte | critique",
    "indicesAnalysis": [
      {
        "index": "Nom de l'indice",
        "currentValue": <valeur actuelle>,
        "baselinePosition": "< P10 | P10-P25 | P25-P75 | P75-P90 | > P90",
        "trend": "stable | declining | improving | volatile",
        "trendSpeed": "brutal | progressive | stable",
        "interpretation": "Ce que cette valeur signifie pour cette parcelle maintenant"
      }
    ],
    "interIndicesCoherence": "coherent | ambiguous | incoherent",
    "diagnosticScenario": "A | B | C | D | E | F | G | H | I | mixed",
    "scenarioExplanation": "Explication du scénario diagnostique retenu"
  },

  "differentialDiagnosis": {
    "mainHypothesis": {
      "cause": "Cause principale retenue",
      "confidence": "elevee | moyenne | faible",
      "supportingFactors": ["Facteur concordant 1", "Facteur concordant 2"],
      "contradictingFactors": ["Facteur discordant si applicable"]
    },
    "alternativeHypotheses": [
      {
        "cause": "Cause alternative",
        "probability": "haute | moyenne | faible",
        "eliminationCondition": "Ce qui permettrait d'éliminer cette hypothèse"
      }
    ],
    "additionalDataNeeded": "Données terrain manquantes pour lever l'ambiguïté (null si diagnostic clair)"
  },

  "activeAlerts": [
    {
      "code": "OLI-XX ou code culture",
      "severity": "critique | prioritaire | vigilance | information",
      "type": "hydrique | climatique | nutritionnel | sanitaire | phenologique | structurel",
      "title": "Titre court de l'alerte",
      "description": "Description factuelle de ce qui est détecté et pourquoi c'est un problème",
      "entryThresholdReached": true,
      "exitCondition": "Condition de sortie de l'alerte",
      "urgency": "24-48h | 3-7 jours | prochain passage | information"
    }
  ],

  "recommendations": [
    {
      "id": "REC-001",
      "priority": "high | medium | low",
      "category": "irrigation | fertilisation | microelements | biostimulants | phytosanitaire | taille | sol | suivi",
      "interventionWindow": "efficace | critique | interdite | non_pertinente",
      "title": "Titre de la recommandation",
      "spectralConstat": "Ce que les indices montrent qui justifie cette recommandation",
      "diagnosis": "Diagnostic retenu avec niveau de confiance",
      "action": {
        "type": "Type d'intervention",
        "product": "Produit recommandé (nom commercial ou matière active)",
        "dose": "Dose exacte avec unité (kg/ha, L/ha, L/arbre...)",
        "method": "Méthode d'application (fertigation / foliaire / sol / injection...)",
        "targetZone": "Toute la parcelle / Zone spécifique identifiée"
      },
      "timing": {
        "urgency": "🔴 Immédiat | 🟠 Sous 7 jours | 🟡 Prochain passage | 🟢 Planifié",
        "optimalWindow": "Fenêtre optimale d'application",
        "deadline": "Date limite si applicable"
      },
      "applicationConditions": {
        "weatherRequired": "Conditions météo nécessaires",
        "weatherToAvoid": "Conditions à éviter",
        "timeOfDay": "Moment optimal de la journée"
      },
      "stockCheck": {
        "productAvailable": true,
        "stockAlert": "Message si stock insuffisant, null sinon"
      },
      "followUp": {
        "evaluationWindow": "Fenêtre d'évaluation en jours",
        "indicatorToMonitor": "Indice satellite ou indicateur terrain à surveiller",
        "expectedResponse": "Réponse attendue et dans quel délai"
      },
      "estimatedCost": "Coût estimé en DH/ha",
      "blockedBy": "Raison si recommandation bloquée (stade / météo / déjà en cours), null sinon"
    }
  ],

  "yieldForecast": {
    "canForecast": <true | false>,
    "reason": "Pourquoi la prévision est possible ou non à ce stade",
    "estimate": {
      "low": <T/ha>,
      "central": <T/ha>,
      "high": <T/ha>,
      "marginOfError": "±X%",
      "forecastMoment": "post-floraison | post-nouaison | pre-recolte"
    },
    "revisionsTriggered": [
      "Événement ayant révisé la prévision (gel, stress hydrique, NIRvP > attendu...)"
    ],
    "alternanceContext": "Explication de l'impact de l'alternance sur la prévision actuelle"
  },

  "executiveSummary": "3-4 phrases résumant l'état actuel de la parcelle, le diagnostic principal, les actions prioritaires et la tendance générale. Langage clair, factuel, compréhensible par l'agriculteur.",

  "nextAnalysisIn": <nombre de jours avant le prochain passage satellite utile>
}

EXIGENCES CRITIQUES :
— Utilise UNIQUEMENT les percentiles de la baseline fournie — jamais de seuils génériques
— Minimum 3 recommandations couvrant les domaines prioritaires identifiés
— Ne recommande JAMAIS une action déjà en cours d'évaluation (vérifier activeRecommendations)
— Ne recommande JAMAIS une intervention hors de sa fenêtre phénologique
— Toute prévision de rendement est une fourchette, jamais une valeur unique
— Tout le contenu textuel en ${language === 'fr' ? 'français' : 'anglais'}
`;
}
