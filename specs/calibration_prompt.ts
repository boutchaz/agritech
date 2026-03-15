// ============================================================
// AGROGINA — MOTEUR IA : CALIBRAGE DE PARCELLE
// Phase 1 — Établissement de l'État Zéro
// Module Transversal — Toutes Cultures Arboricoles
// Version 1.0 — Février 2026
// ============================================================

import { ParcelCalibrationInput } from '../interfaces';

// ============================================================
// SYSTEM PROMPT — IDENTITÉ ET POSTURE DE L'IA
// ============================================================

export const CALIBRATION_EXPERT_SYSTEM_PROMPT = `
Tu es un agronome expert en arboriculture méditerranéenne et en télédétection agricole,
avec plus de 25 ans d'expérience terrain au Maroc et dans le Maghreb.

Tu combines deux expertises que peu maîtrisent ensemble :
— La lecture fine des séries temporelles satellite Sentinel-2
— La connaissance approfondie du comportement physiologique des cultures arboricoles
  (olivier, amandier, vigne, agrumes, grenadier) dans les conditions pédoclimatiques du Maghreb.

Tu as passé des années à croiser des analyses de sol avec des cartes de vigueur satellite,
à expliquer pourquoi un NDMI bas en juillet sur un argile calcaire de Meknès ne signifie
pas la même chose que sur un sable du Souss. Tu sais que les données ne mentent pas,
mais qu'elles demandent à être lues avec le contexte — sinon elles induisent en erreur.

---

PHASE DANS LAQUELLE TU INTERVIENS : CALIBRAGE (Phase 1)

Tu es en mode OBSERVATION PURE. Cette règle est non négociable.
Tu n'émets AUCUNE recommandation d'action, AUCUNE dose, AUCUN conseil d'intervention.
Tu établis l'état zéro de la parcelle — une photographie complète et objective
de son comportement historique et de son potentiel réel.

Ce que tu produis ici est le fondement de tout ce qui suivra.
Un calibrage bâclé = des recommandations erronées pendant toute la durée de vie
de la parcelle dans le système. Tu traites ce travail avec la rigueur d'un diagnostic médical.

---

TES COMPÉTENCES MOBILISÉES DANS CE MODULE :

1. TÉLÉDÉTECTION ET INDICES SPECTRAUX
   — Lecture et interprétation des séries temporelles NDVI, NIRv, NIRvP, NDMI, NDRE,
     EVI, MSAVI, MSI, GCI sur 12 à 36 mois
   — Calcul des percentiles personnalisés P10/P25/P40/P50/P60/P75/P90
   — Détection des anomalies, des ruptures de tendance, des événements ponctuels
   — Identification des patterns phénologiques depuis la courbe NIRv
   — Classification intra-parcellaire en zones A/B/C/D/E selon la vigueur historique

2. AGRONOMIE TERRAIN
   — Interprétation des analyses de sol (pH, CE, texture, MO, NPK, micro-éléments,
     calcaire total et actif)
   — Interprétation des analyses d'eau d'irrigation (CE, SAR, chlorures, bicarbonates,
     sodium, bore, nitrates)
   — Interprétation des analyses foliaires (N, P, K, Ca, Mg, Fe, Zn, Mn, B, Cu)
   — Compréhension de l'alternance de production et de ses signatures satellitaires
   — Connaissance des comportements spectraux par système de plantation
     (traditionnel / intensif / super-intensif)

3. RAISONNEMENT CONTEXTUEL
   — Hiérarchie des sources : données terrain > rendements réels > satellite > météo > référentiel
   — Adaptation selon le contexte hydrique : irrigation maîtrisée vs bore vs pluvial
   — Ajustement selon l'âge de la plantation et la dynamique de croissance
   — Contextualisation des anomalies historiques pour ne pas biaiser la baseline

---

CE QUE TU PEUX COMMUNIQUER (CONSTATS UNIQUEMENT) :

✓ "Votre parcelle présente un score de santé initial de 72/100."
✓ "L'historique montre un stress hydrique récurrent en août."
✓ "Le potentiel de rendement estimé est de 8 à 12 T/ha."
✓ "Une zone faible est détectée dans le quart nord-est (12% de la surface)."
✓ "Les données sol manquantes réduisent la précision du calibrage."
✓ "L'historique satellite révèle un événement de stress brutal en avril 2023,
   probablement lié à un gel tardif — cette période a été exclue du calcul de référence."

CE QUE TU NE DOIS PAS DIRE (STRICTEMENT INTERDIT PENDANT LE CALIBRAGE) :

✗ "Vous devriez irriguer davantage."
✗ "Appliquez un traitement contre le stress."
✗ "Fertilisez davantage cette zone."
✗ "Vous pouvez espérer 15 T/ha si vous suivez mes conseils."
✗ Toute recommandation d'action, de produit, de dose ou d'intervention.

---

HIÉRARCHIE DES SOURCES DE DONNÉES (en cas de conflit) :

1. Données terrain utilisateur — analyses labo : mesure directe, vérité absolue
2. Historique rendements réels déclarés : vérité campagne, non substituable
3. Données satellite Sentinel-2 : objectif, répétable, couvrant 12 à 36 mois
4. Données météo ERA5 / Open-Meteo : modélisation, biais local possible
5. Valeurs par défaut du référentiel culture : génériques, usage uniquement
   si aucune autre source disponible

Si les données utilisateur contredisent fortement les données satellite
(ex. : rendement déclaré de 20 T/ha mais NIRv historiquement très bas),
tu signales l'incohérence et demandes vérification AVANT de finaliser le calibrage.

---

ADAPTATION SELON LE CONTEXTE HYDRIQUE :

— Irrigation maîtrisée (goutte-à-goutte, aspersion) :
  Le climat est facteur secondaire. L'analyse hydrique se base sur les volumes
  et fréquences d'irrigation déclarés. L'ET₀ sert uniquement à corriger
  l'effet climatique.

— Irrigation bore ou pluvial :
  Le climat devient prioritaire. La pluviométrie et les températures
  conditionnent l'interprétation hydrique. Mentionner explicitement
  ce changement de logique dans le rapport.

---

FORMAT DE SORTIE :
Tu retournes UNIQUEMENT un objet JSON valide, sans texte avant ni après.
Respecte scrupuleusement le schéma défini dans le user prompt.
`;

// ============================================================
// USER PROMPT — DONNÉES DE LA PARCELLE + SCHEMA DE SORTIE
// ============================================================

export function buildCalibrationPrompt(
  data: ParcelCalibrationInput,
  language: string = 'fr',
): string {
  const langInstruction =
    language === 'fr'
      ? 'Fournir tout le contenu textuel en français.'
      : 'Provide all text content in English.';

  return `
${langInstruction}

Effectue le calibrage complet de la parcelle "${data.parcel.name}".
Tu dois suivre rigoureusement la méthodologie définie dans le system prompt.
Tu es en Phase 1 — Observation pure. Aucune recommandation d'action.

====================================================
1. PROFIL DE LA PARCELLE
====================================================
- Nom / Référence : ${data.parcel.name}
- Surface : ${data.parcel.area} ${data.parcel.areaUnit}
- Culture : ${data.parcel.cropType || data.parcel.treeType || 'Non spécifié'}
- Variété : ${data.parcel.variety || 'Non spécifié'}
- Porte-greffe : ${data.parcel.rootstock || 'Non spécifié'}
- Année de plantation : ${data.parcel.plantingYear || 'Non spécifié'}
- Âge de la plantation : ${data.parcel.plantingYear ? `${new Date().getFullYear() - Number(data.parcel.plantingYear)} ans` : 'Non spécifié'}
- Nombre d'arbres : ${data.parcel.treeCount || 'Non spécifié'}
- Densité estimée : ${data.parcel.treeCount && data.parcel.area ? `${Math.round(Number(data.parcel.treeCount) / Number(data.parcel.area))} arbres/ha` : 'Non spécifié'}
- Système de plantation : ${data.parcel.plantingSystem || 'Non spécifié'}
- Type de sol : ${data.parcel.soilType || 'Non spécifié'}
- Type d'irrigation : ${data.parcel.irrigationType || 'Non spécifié'}
- Source d'eau : ${data.parcel.waterSource || 'Non spécifié'}

====================================================
2. HISTORIQUE SATELLITE — SÉRIES TEMPORELLES
====================================================
Période analysée : ${data.satelliteHistory.period.start} → ${data.satelliteHistory.period.end}
Nombre de passages exploitables : ${data.satelliteHistory.validScenes ?? 'Non spécifié'}
Couverture temporelle : ${data.satelliteHistory.coverageMonths ?? 'Non spécifié'} mois

Indices disponibles : NDVI, NIRv, NIRvP, NDMI, NDRE, EVI, MSAVI, MSI, GCI

Données brutes pour calcul des percentiles (toutes valeurs historiques) :
${data.satelliteHistory.timeSeries ? JSON.stringify(data.satelliteHistory.timeSeries, null, 2) : 'Non disponible'}

Dernières valeurs observées :
- NDVI  : ${data.satelliteHistory.latestValues?.ndvi?.toFixed(3)  ?? 'N/A'} — Vigueur végétative générale
- NIRv  : ${data.satelliteHistory.latestValues?.nirv?.toFixed(3)  ?? 'N/A'} — Productivité photosynthétique réelle
- NIRvP : ${data.satelliteHistory.latestValues?.nirvp?.toFixed(3) ?? 'N/A'} — NIRv pondéré par stade phénologique
- NDMI  : ${data.satelliteHistory.latestValues?.ndmi?.toFixed(3)  ?? 'N/A'} — Contenu en eau de la canopée
- NDRE  : ${data.satelliteHistory.latestValues?.ndre?.toFixed(3)  ?? 'N/A'} — Teneur en chlorophylle / statut azoté
- MSI   : ${data.satelliteHistory.latestValues?.msi?.toFixed(3)   ?? 'N/A'} — Stress hydrique (inverse)
- EVI   : ${data.satelliteHistory.latestValues?.evi?.toFixed(3)   ?? 'N/A'} — Vigueur corrigée atmosphère
- MSAVI : ${data.satelliteHistory.latestValues?.msavi?.toFixed(3) ?? 'N/A'} — Vigueur corrigée sol nu
- GCI   : ${data.satelliteHistory.latestValues?.gci?.toFixed(3)   ?? 'N/A'} — Teneur en chlorophylle (Green)

INSTRUCTIONS D'INTERPRÉTATION SATELLITE :
— Calcule les percentiles P10/P25/P40/P50/P60/P75/P90 pour chaque indice
  depuis les séries temporelles fournies
— Identifie les périodes anormales (chute > 25% en < 15 jours, valeur > 3 écarts-types)
  et EXCLU-LES du calcul des percentiles de référence
— Détecte les dates caractéristiques phénologiques depuis la courbe NIRv :
  sortie dormance, pic végétation, plateau estival, déclin automnal, entrée dormance
— Les seuils génériques du référentiel culture sont des GARDE-FOUS uniquement —
  les vrais seuils opérationnels sont calculés depuis l'historique de CETTE parcelle

====================================================
3. DONNÉES MÉTÉO HISTORIQUES
====================================================
Période : ${data.weather?.period?.start ?? 'N/A'} → ${data.weather?.period?.end ?? 'N/A'}
- Température min moyenne : ${data.weather?.temperatureSummary?.avgMin?.toFixed(1) ?? 'N/A'} °C
- Température max moyenne : ${data.weather?.temperatureSummary?.avgMax?.toFixed(1) ?? 'N/A'} °C
- Température moyenne     : ${data.weather?.temperatureSummary?.avgMean?.toFixed(1) ?? 'N/A'} °C
- Pluviométrie totale     : ${data.weather?.precipitationTotal?.toFixed(1) ?? 'N/A'} mm
- Jours de gel            : ${data.weather?.frostDays ?? 'N/A'}
- Séquences sèches        : ${data.weather?.drySpellsCount ?? 'N/A'}
- Heures de froid < 7.2°C : ${data.weather?.chillingHours ?? 'N/A'} h
- Cumul GDD (base 10°C)   : ${data.weather?.gddCumulative ?? 'N/A'} °C·j
- Événements extrêmes détectés : ${data.weather?.extremeEvents ? JSON.stringify(data.weather.extremeEvents) : 'Aucun signalé'}

====================================================
4. ANALYSES LABORATOIRE
====================================================

## ANALYSE DE SOL ${data.soilAnalysis?.latestDate ? `(Date : ${data.soilAnalysis.latestDate})` : '(Aucune analyse disponible)'}
${data.soilAnalysis ? `
- pH                   : ${data.soilAnalysis.phLevel ?? 'N/A'}
- Conductivité électrique : ${data.soilAnalysis.ec ?? 'N/A'} dS/m
- Texture              : ${data.soilAnalysis.texture ?? 'N/A'}
- Matière organique    : ${data.soilAnalysis.organicMatter ?? 'N/A'} %
- Calcaire total       : ${data.soilAnalysis.totalLimestone ?? 'N/A'} %
- Calcaire actif       : ${data.soilAnalysis.activeLimestone ?? 'N/A'} %
- CEC                  : ${data.soilAnalysis.cec ?? 'N/A'} meq/100g
- Azote (N)            : ${data.soilAnalysis.nitrogenPpm ?? 'N/A'} ppm
- Phosphore (P Olsen)  : ${data.soilAnalysis.phosphorusPpm ?? 'N/A'} ppm
- Potassium éch. (K)   : ${data.soilAnalysis.potassiumPpm ?? 'N/A'} ppm
- Calcium (Ca)         : ${data.soilAnalysis.calcium ?? 'N/A'} ppm
- Magnésium (Mg)       : ${data.soilAnalysis.magnesium ?? 'N/A'} ppm
- Fer (Fe)             : ${data.soilAnalysis.iron ?? 'N/A'} ppm
- Zinc (Zn)            : ${data.soilAnalysis.zinc ?? 'N/A'} ppm
- Manganèse (Mn)       : ${data.soilAnalysis.manganese ?? 'N/A'} ppm
- Cuivre (Cu)          : ${data.soilAnalysis.copper ?? 'N/A'} ppm
- Bore (B)             : ${data.soilAnalysis.boron ?? 'N/A'} ppm
` : 'Aucune analyse de sol disponible — niveau de confiance réduit de 20 pts.'}

## ANALYSE DE L'EAU D'IRRIGATION ${data.waterAnalysis?.latestDate ? `(Date : ${data.waterAnalysis.latestDate})` : '(Aucune analyse disponible)'}
${data.waterAnalysis ? `
- pH                   : ${data.waterAnalysis.ph ?? 'N/A'}
- Conductivité électrique : ${data.waterAnalysis.ec ?? 'N/A'} dS/m
- SAR                  : ${data.waterAnalysis.sar ?? 'N/A'}
- Sodium (Na)          : ${data.waterAnalysis.sodium ?? 'N/A'} mg/L
- Chlorures (Cl)       : ${data.waterAnalysis.chlorides ?? 'N/A'} mg/L
- Bicarbonates (HCO₃)  : ${data.waterAnalysis.bicarbonates ?? 'N/A'} mg/L
- Bore (B)             : ${data.waterAnalysis.boron ?? 'N/A'} mg/L
- Nitrates (NO₃)       : ${data.waterAnalysis.nitrates ?? 'N/A'} mg/L
- TDS                  : ${data.waterAnalysis.tds ?? 'N/A'} ppm
` : 'Aucune analyse eau disponible — niveau de confiance réduit de 15 pts.'}

## ANALYSE FOLIAIRE ${data.plantAnalysis?.latestDate ? `(Date : ${data.plantAnalysis.latestDate})` : '(Aucune analyse disponible)'}
${data.plantAnalysis ? `
Note : L'analyse foliaire prime sur les analyses de sol et d'eau pour l'état physiologique réel de la plante.
- N  : ${data.plantAnalysis.nitrogenPercent ?? 'N/A'} %
- P  : ${data.plantAnalysis.phosphorusPercent ?? 'N/A'} %
- K  : ${data.plantAnalysis.potassiumPercent ?? 'N/A'} %
- Ca : ${data.plantAnalysis.calcium ?? 'N/A'} %
- Mg : ${data.plantAnalysis.magnesium ?? 'N/A'} %
- Fe : ${data.plantAnalysis.iron ?? 'N/A'} ppm
- Zn : ${data.plantAnalysis.zinc ?? 'N/A'} ppm
- Mn : ${data.plantAnalysis.manganese ?? 'N/A'} ppm
- B  : ${data.plantAnalysis.boron ?? 'N/A'} ppm
- Cu : ${data.plantAnalysis.copper ?? 'N/A'} ppm
- Na : ${data.plantAnalysis.sodium ?? 'N/A'} %
- Cl : ${data.plantAnalysis.chloride ?? 'N/A'} %
` : 'Aucune analyse foliaire disponible.'}

====================================================
5. HISTORIQUE DES RENDEMENTS
====================================================
${data.yieldHistory && data.yieldHistory.length > 0 ? `
Utilise cet historique pour :
— Calculer le potentiel de rendement : Potentiel = Moyenne des 3 meilleures années × 1.1
— Détecter le statut d'alternance (ON / OFF / épuisement) sur les 3 dernières années
— Identifier les écarts entre performance réelle et potentiel estimé

${data.yieldHistory.map((y: any) => `- ${y.year}${y.season ? ` (${y.season})` : ''} : ${y.yieldPerHa?.toFixed(1) ?? y.quantity ?? 'N/A'} ${y.unit ?? 'T/ha'}${y.qualityGrade ? ` — Qualité : ${y.qualityGrade}` : ''}`).join('\n')}
` : `Aucun historique de rendements disponible.
Le potentiel sera estimé depuis le NIRvP cumulé × coefficients culture.
Niveau de confiance réduit de 20 pts.`}

====================================================
6. CONTEXTE COMPLÉMENTAIRE
====================================================
${data.operationsHistory && data.operationsHistory.length > 0 ? `
Interventions majeures déclarées (tailles sévères, changements d'irrigation, etc.) :
${data.operationsHistory.map((op: any) => `- ${op.date} : ${op.type} — ${op.description ?? ''}`).join('\n')}

Ces interventions peuvent avoir modifié durablement le profil spectral de la parcelle.
Prends-les en compte pour contextualiser les ruptures de tendance détectées.
` : 'Aucune intervention majeure déclarée.'}

====================================================
7. SORTIE REQUISE — JSON STRICT
====================================================
Retourne UNIQUEMENT un objet JSON valide avec la structure exacte ci-dessous.
Tous les champs sont obligatoires. Si une donnée manque, indique-le dans le champ concerné.

{
  "calibrationSummary": {
    "status": "complete | partial | limited",
    "confidenceScore": <nombre 0-100, calculé selon la grille définie>,
    "confidenceBreakdown": {
      "satelliteHistory": <0-30, selon durée : 36+ mois=30, 24-36=20, 12-24=10, <12=5>,
      "soilAnalysis": <0-20, complète <2 ans=20, partielle=10, absente=0>,
      "waterAnalysis": <0-15, complète=15, partielle=8, absente=0>,
      "yieldHistory": <0-20, 5+ ans=20, 3-4 ans=15, 1-2 ans=8, aucun=0>,
      "profileCompleteness": <0-10, prorata champs remplis>,
      "dataConsistency": <0-5, aucune incohérence=5, mineures=2, majeures=0>
    },
    "confidenceLevel": "ÉLEVÉ (75-100%) | MOYEN (50-75%) | FAIBLE (25-50%) | MINIMAL (0-25%)",
    "missingDataImpact": "Description de l'impact des données manquantes sur la précision du calibrage",
    "readyForOperational": <true | false — true uniquement si confiance >= 25% et données minimales présentes>
  },

  "parcelIdentity": {
    "crop": "Culture identifiée",
    "variety": "Variété",
    "plantingSystem": "traditionnel | intensif | super-intensif",
    "estimatedAge": <âge en années>,
    "dominantSoilConstraint": "Contrainte sol principale identifiée (ex: pH élevé, calcaire actif, salinité...)",
    "irrigationContext": "maitrisee | bore | pluvial",
    "calibrationDate": "Date du calibrage"
  },

  "healthScore": {
    "overall": <0-100>,
    "breakdown": {
      "vegetativeVigor": {
        "score": <0-30>,
        "observation": "Ce que le NIRv médian révèle sur la vigueur historique de cette parcelle"
      },
      "spatialHomogeneity": {
        "score": <0-20>,
        "observation": "Répartition des zones A/B/C/D/E et ce qu'elles signifient pour cette parcelle"
      },
      "temporalStability": {
        "score": <0-15>,
        "observation": "Variance inter-annuelle et ce qu'elle signifie (alternance normale, instabilité, dégradation)"
      },
      "waterStatus": {
        "score": <0-20>,
        "observation": "Position du NDMI vs percentiles et implication pour la gestion hydrique"
      },
      "nutritionalStatus": {
        "score": <0-15>,
        "observation": "Position du NDRE vs percentiles et ce qu'il révèle sur l'état chlorophyllien"
      }
    }
  },

  "spectralBaseline": {
    "analysedPeriod": "${data.satelliteHistory?.period?.start ?? 'N/A'} → ${data.satelliteHistory?.period?.end ?? 'N/A'}",
    "validScenes": <nombre d'images exploitées>,
    "anomaliesDetected": [
      {
        "approximateDate": "Date approximative de l'anomalie",
        "indexAffected": "Indice concerné",
        "type": "chute brutale | déclin progressif | rupture de tendance | hétérogénéité soudaine",
        "probableCause": "Cause probable (gel, sécheresse, taille sévère, maladie, changement irrigation...)",
        "excludedFromBaseline": <true | false>
      }
    ],
    "percentiles": {
      "ndvi":  { "p10": null, "p25": null, "p50": null, "p75": null, "p90": null },
      "nirv":  { "p10": null, "p25": null, "p50": null, "p75": null, "p90": null },
      "nirvp": { "p10": null, "p25": null, "p50": null, "p75": null, "p90": null },
      "ndmi":  { "p10": null, "p25": null, "p50": null, "p75": null, "p90": null },
      "ndre":  { "p10": null, "p25": null, "p50": null, "p75": null, "p90": null },
      "msi":   { "p10": null, "p25": null, "p50": null, "p75": null, "p90": null },
      "evi":   { "p10": null, "p25": null, "p50": null, "p75": null, "p90": null },
      "msavi": { "p10": null, "p25": null, "p50": null, "p75": null, "p90": null },
      "gci":   { "p10": null, "p25": null, "p50": null, "p75": null, "p90": null }
    },
    "thresholdInterpretation": {
      "criticalAlert": "P10 — En dessous, état inhabituel sur 10% des pires valeurs historiques → investigation",
      "vigilance": "P25 — Bas de la fourchette normale → surveillance renforcée, 2 passages minimum avant alerte",
      "reference": "P50 — Médiane historique — état normal de référence pour cette parcelle",
      "good": "P75 — Haute fourchette — bonne condition",
      "excellentOrExcess": "P90 — Top 10% historique — surveiller si excès (ex. sur-irrigation)"
    }
  },

  "phenologyProfile": {
    "detectedStages": [
      {
        "stage": "Nom du stade (ex: sortie dormance, pic végétation, déclin automnal...)",
        "averageDate": "Date moyenne historique (ex: mi-février)",
        "interAnnualVariability": "±X jours",
        "associatedGDD": <cumul GDD associé>
      }
    ],
    "deviationFromReferential": "Décalage observé vs calendrier théorique du référentiel culture, et son interprétation"
  },

  "intraParcelZoning": {
    "homogeneityAssessment": "homogène | légèrement hétérogène | hétérogène | très hétérogène",
    "zones": [
      {
        "class": "A | B | C | D | E",
        "label": "Zone très vigoureuse | vigoureuse | normale | faible | problématique",
        "percentSurface": <pourcentage de la surface totale>,
        "location": "Description de la localisation spatiale (ex: quart nord-est, bandes centrales...)",
        "probableCause": "Cause probable de l'hétérogénéité (sol, irrigation, pente, taille, maladie...)"
      }
    ],
    "spatialPattern": "gradient | taches isolées | bandes | uniforme | bordure — et interprétation"
  },

  "yieldPotential": {
    "estimationMethod": "historique rendements × 1.1 | NIRvP cumulé × coefficients culture",
    "estimatedPotential": {
      "low": <T/ha fourchette basse>,
      "central": <T/ha valeur centrale probable>,
      "high": <T/ha fourchette haute>
    },
    "marginOfError": "±X% selon niveau de confiance du calibrage",
    "alternanceStatus": "annee_ON | annee_OFF_sain | epuisement | indetermine",
    "alternanceExplanation": "Explication du statut détecté et de sa signature dans les données",
    "gapWithObservedPerformance": "Si historique disponible : écart entre rendement moyen observé et potentiel estimé, avec explication"
  },

  "limitingFactors": {
    "structural": [
      {
        "factor": "Nom du facteur limitant structurel",
        "impact": "elevé | modéré | faible",
        "explanation": "Ce que ça signifie concrètement pour cette parcelle",
        "implicationForRecommendations": "Comment ce facteur limitera les actions futures dans le moteur opérationnel"
      }
    ],
    "correctable": [
      {
        "factor": "Nom du facteur limitant corrigible",
        "impact": "elevé | modéré | faible",
        "explanation": "Ce que ça signifie concrètement",
        "lever": "Levier disponible — sera activé en Phase 2 par le moteur opérationnel"
      }
    ]
  },

  "soilManagementMode": {
    "recommended": "A | B | C",
    "label": "A — Nutrition Plante | B — Construction Progressive du Sol | C — Mixte (cas majoritaire)",
    "rationale": "Raison du choix basée sur les données de calibrage"
  },

  "dataInconsistencies": [
    {
      "description": "Description de l'incohérence détectée",
      "sources": "Sources en conflit (ex: rendement déclaré vs NIRv historique)",
      "action": "VERIFICATION_REQUISE | SIGNALE_MAIS_CONTINUE | EXCLU_DU_CALIBRAGE"
    }
  ],

  "calibrationReport": {
    "executiveSummary": "2-3 phrases résumant l'état de la parcelle de façon claire et factuelle, compréhensible par l'agriculteur. Mentionner le score de santé, le potentiel estimé, et les 1-2 points d'attention principaux.",
    "satelliteReadingSummary": "2-3 phrases décrivant ce que l'historique satellite révèle sur cette parcelle — vigueur, homogénéité, anomalies notables.",
    "soilAndWaterSummary": "2-3 phrases sur l'état sol/eau issu des analyses — contraintes structurelles, points favorables, éléments bloquants.",
    "nextSteps": "Ce qui se passe après validation : activation du moteur opérationnel, génération du plan annuel, démarrage du suivi continu."
  },

  "validationRequired": true,
  "validationMessage": "Le calibrage de votre parcelle est établi. Vérifiez que les informations ci-dessus correspondent à votre réalité terrain. Une fois validé, votre plan annuel et vos recommandations personnalisées seront générés automatiquement."
}

EXIGENCES CRITIQUES :
— Calcule les percentiles depuis les séries temporelles fournies — ne les invente jamais
— Toute anomalie détectée doit être documentée et son exclusion justifiée
— Le score de confiance doit refléter exactement les données disponibles
— Le potentiel de rendement est toujours une fourchette, jamais une valeur unique
— Aucune recommandation d'action dans ce JSON — tu es en mode calibrage
— Tout le contenu textuel en ${language === 'fr' ? 'français' : 'anglais'}
`;
}
