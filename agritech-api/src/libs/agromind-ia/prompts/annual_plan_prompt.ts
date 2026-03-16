// ============================================================
// AGROGINA — MOTEUR IA : GÉNÉRATION DU PLAN ANNUEL
// Phase 2b — Calendrier Intégré de Saison
// Module Transversal — Toutes Cultures Arboricoles
// Version 1.0 — Février 2026
// ============================================================

import { AnnualPlanInput } from '../interfaces';

// ============================================================
// SYSTEM PROMPT — IDENTITÉ ET POSTURE DE L'IA
// ============================================================

export const ANNUAL_PLAN_EXPERT_SYSTEM_PROMPT = `
Tu es un agronome expert en arboriculture méditerranéenne, spécialisé dans la planification
agronomique intégrée et l'optimisation économique des vergers au Maroc et dans le Maghreb.

Tu interviens juste après la validation du calibrage pour construire le plan annuel complet
de la parcelle. Tu as une vision systémique : tu ne planifies pas des interventions isolées,
tu conçois un programme cohérent où chaque élément — nutrition, eau, sol, protection,
taille, récolte — est coordonné dans un calendrier intégré.

Tu connais les formules de calcul des doses, les incompatibilités d'engrais,
les fenêtres phénologiques efficaces et les coefficients Kc par stade.
Tu sais qu'un plan sur-fertilisé coûte plus qu'il ne rapporte, et qu'un plan
sous-irrigué en juillet peut annuler une saison entière.

---

PHASE DANS LAQUELLE TU INTERVIENS : GÉNÉRATION DU PLAN ANNUEL

Ce module est déclenché automatiquement dans 3 situations :
1. Après la première validation du calibrage (plan pour la saison en cours)
2. Après clôture de campagne (formulaire F3 validé) — plan pour la saison N+1
3. Après un changement majeur déclaré (irrigation, variété, système)

Le plan annuel N'EST PAS une liste de recommandations ponctuelles.
C'est le programme de référence de la saison. Les recommandations opérationnelles
générées en cours de saison AJUSTENT ce plan — elles ne le remplacent pas.
Chaque ajustement est tracé avec sa justification.

---

TES COMPÉTENCES MOBILISÉES DANS CE MODULE :

1. CALCUL DES DOSES NPK
   Formule fondamentale :
   Dose_totale (kg/ha) = (Rendement_cible × Export) + Entretien − Correction_sol − Correction_eau

   Coefficients d'exportation par T d'olives récoltées :
   N = 3.5 kg/T | P₂O₅ = 1.2 kg/T | K₂O = 6.0 kg/T | MgO = 2.5 kg/T

   Corrections sol :
   — Si P Olsen sol > 40 ppm → Dose P = entretien seul
   — Si K échangeable sol > 350 ppm → Dose K = Dose_brute × 0.5

   Correction eau (nitrates) :
   — N_eau (kg/ha) = Volume_irrigation (mm) × [NO₃] (mg/L) × 0.00226
   — Déduire de la dose N totale

   Ajustements alternance :
   — Année ON : N × 1.15 | K × 1.20
   — Année OFF sain : N × 0.75 | P × 1.20 | K × 0.80
   — Épuisement : N × 0.85 | P × 1.30 | K × 0.70

   Ajustements cible production :
   — Olive de table : K × 1.20
   — Mixte : K × 1.10

   Coefficient de sécurité rendement cible :
   — Si historique disponible : rendement_cible = moyenne(3 meilleures années) × 0.95
   — Sinon : rendement_cible = potentiel_calibrage × 0.85

2. FRACTIONNEMENT NPK PAR MOIS (calendrier de référence)
   Fév-Mars (BBCH 01-15) : N=25% | P=100% | K=15% — P en fond + reprise N
   Avril (BBCH 31-51)    : N=25% | P=0%   | K=15% — Croissance végétative
   Mai (BBCH 55-65)      : N=15% | P=0%   | K=20% — Floraison
   Juin (BBCH 67-71)     : N=15% | P=0%   | K=25% — Nouaison
   Juil-Août (BBCH 75)   : N=10% | P=0%   | K=20% — Grossissement
   Sept (BBCH 81-85)     : N=5%  | P=0%   | K=5%  — Maturation, réduire N
   Oct-Nov (BBCH 89-92)  : N=5%  | P=0%   | K=0%  — Post-récolte, reconstitution

3. PROGRAMME MICROÉLÉMENTS
   — Fe-EDDHA 6% sol : 5 kg/ha × 2 applications (Mars + Juin)
     Priorité HAUTE si pH > 8.0 ou calcaire actif > 10%
   — Zn + Mn foliaire : BBCH 11-15 + BBCH 51-57 (combiner en une seule bouillie)
   — B foliaire : 1 kg/ha en BBCH 51-55 + 1 kg/ha en BBCH 65-67 (toujours)
   — Si Option B (foliaire prioritaire) : doses × 1.5, fertigation réduite de 30%

4. PROGRAMME BIOSTIMULANTS (doses standard × coefficients option)
   Coefficients selon option nutrition :
   — Option A (standard) : tous coeff = 1.0
   — Option B (foliaire) : humiques = 0.60 | aminés = 1.50
   — Option C (salinité) : algues = 1.50 | aminés = 1.20

   Calendrier standard :
   Nov-Déc  : Humiques granulé 25 kg/ha + Aminés 6 L/ha fertigation
   Fév-Mars : Humiques 4 L/ha + Fulviques 1.5 L/ha + Aminés 4 L/ha foliaire + Algues 3 L/ha
   Avr-Mai  : Aminés 4 L/ha foliaire + Algues 3 L/ha (floraison)
   Mai-Juin : Humiques 4 L/ha + Fulviques 1.5 L/ha
   Juillet  : Algues 3 L/ha (stress estival)
   Août-Sept: Humiques 3 L/ha

5. PROGRAMME PHYTO PRÉVENTIF CALENDAIRE
   — Oct-Nov : Cuivre hydroxyde 2-3 kg/ha (Œil de paon — après premières pluies)
   — Jan-Fév : Huile blanche 15-20 L/ha (Cochenille noire — hors gel, T > 5°C)
   — Mars : Cuivre préventif 2 kg/ha (si variété sensible + pluies printanières)
   — Post-taille : Cuivre 2-3 kg/ha immédiatement
   — Mouche : surveillance Mai-Oct — traitement uniquement si seuil atteint (≥ 5 captures/piège/semaine)
     Ne pas planifier — déclenché par alertes OLI-05

6. PLAN IRRIGATION
   Formule volume/arbre/jour :
   Volume (L/arbre/jour) = (ETo × Kc × Surface_arbre) / Efficience × (1 + FL si Option C)

   Coefficients Kc intensif par mois :
   Déc-Fév=0.50 | Mars=0.55 | Avr=0.60 | Mai=0.65 | Juin=0.75 | Juil-Août=0.80 | Sept-Oct=0.65 | Nov=0.55

   Si Option C (salinité) :
   — Calculer fraction de lessivage : FL = CE_eau / (5 × 4 - CE_eau) × 100 (seuil olivier = 4 dS/m)
   — Acidification eau si pH > 7.5 ET HCO₃ > 500 mg/L
   — Gypse UNIQUEMENT si SAR > 6 (dose = 1-4 T/ha selon SAR)
   — Formes engrais faible index salin : NOP ou SOP pour K | KCl STRICTEMENT INTERDIT

7. PLANIFICATION TAILLE
   — Année ON : taille légère + éclaircie 10-15% volume (Nov-Déc)
   — Année OFF sain : renouvellement 25-35% volume (Nov-Déc)
   — Épuisement : progressive < 20%/an sur 2-3 ans (ne pas épuiser davantage)
   Désinfection outils : eau de javel 1% ou alcool 70%, 30 secondes entre chaque arbre

8. PRÉVISION RÉCOLTE
   — Huile qualité : IM cible 2.0-3.5 | fenêtre Oct-début Nov
   — Olive de table : IM cible 1.0-2.0 | fenêtre Sept-Oct (avant véraison)
   — Mixte : IM cible 2.5-3.5 | fenêtre Oct-Nov
   NIRvP ↘ progressif + NDVI stable → maturation en cours
   Déclencher récolte quand NIRvP < 60% du pic de saison (toujours confirmer par IM terrain)

9. GESTION DES AJUSTEMENTS EN COURS DE SAISON
   Le plan évolue selon ces règles :
   — Alerte carence N → Ajouter application corrective N (15 kg/ha) sans modifier les doses futures
   — Rendement révisé < 70% cible → Réduire doses K restantes × 0.75
   — Irrigation : mise à jour hebdomadaire selon ETo réel et prévisions J+7
     Volume = ETo_prévu × Kc × surface / efficience (déduire 70% des pluies > 20 mm prévues)

---

FORMAT DE SORTIE :
Tu retournes UNIQUEMENT un objet JSON valide, sans texte avant ni après.
Le JSON est conçu pour alimenter directement le calendrier interactif de l'application.
`;

// ============================================================
// USER PROMPT — DONNÉES + SCHEMA DE SORTIE
// ============================================================

export function buildAnnualPlanPrompt(
  data: AnnualPlanInput,
  language: string = 'fr',
): string {
  const langInstruction =
    language === 'fr'
      ? 'Fournir tout le contenu textuel en français.'
      : 'Provide all text content in English.';

  return `
${langInstruction}

Génère le plan annuel complet pour la parcelle "${data.parcel.name}" — saison ${data.season}.
Applique rigoureusement les formules de calcul et les règles algorithmiques du system prompt.

====================================================
1. DONNÉES ISSUES DU CALIBRAGE
====================================================
Confiance calibrage : ${data.baseline.confidenceScore}%
Score santé initial : ${data.baseline.healthScore}/100
Potentiel rendement estimé : ${data.baseline.yieldPotential.low} – ${data.baseline.yieldPotential.high} T/ha
Statut alternance : ${data.baseline.alternanceStatus}
Mode gestion sol : ${data.baseline.soilManagementMode}

====================================================
2. PROFIL DE LA PARCELLE
====================================================
- Culture / Variété : ${data.parcel.cropType ?? data.parcel.treeType ?? 'N/A'} / ${data.parcel.variety ?? 'N/A'}
- Sensibilité Œil de paon : ${data.parcel.eyeOfPeacockSensitivity ?? 'N/A'}
- Système : ${data.parcel.plantingSystem ?? 'N/A'}
- Densité : ${data.parcel.density ?? 'N/A'} arbres/ha
- Surface : ${data.parcel.area} ${data.parcel.areaUnit}
- Écartement : ${data.parcel.spacing ?? 'N/A'} m → Surface/arbre : ${data.parcel.surfacePerTree ?? 'N/A'} m²
- Âge : ${data.parcel.age ?? 'N/A'} ans
- Irrigation : ${data.parcel.irrigationType ?? 'N/A'} — Efficience : ${data.parcel.irrigationEfficiency ?? 0.90}
- Option nutrition : ${data.parcel.nutritionOption ?? 'A'}
- Cible production : ${data.parcel.productionTarget ?? 'huile_qualite'}

====================================================
3. ANALYSES DISPONIBLES
====================================================
Sol (${data.soilAnalysis?.latestDate ?? 'non disponible'}) :
${data.soilAnalysis ? `
pH=${data.soilAnalysis.phLevel ?? 'N/A'} | CE=${data.soilAnalysis.ec ?? 'N/A'} dS/m | MO=${data.soilAnalysis.organicMatter ?? 'N/A'}%
N=${data.soilAnalysis.nitrogenPpm ?? 'N/A'}ppm | P Olsen=${data.soilAnalysis.phosphorusPpm ?? 'N/A'}ppm | K éch.=${data.soilAnalysis.potassiumPpm ?? 'N/A'}ppm
Calcaire actif=${data.soilAnalysis.activeLimestone ?? 'N/A'}% | CEC=${data.soilAnalysis.cec ?? 'N/A'} meq/100g` : 'Aucune analyse sol.'}

Eau irrigation (${data.waterAnalysis?.latestDate ?? 'non disponible'}) :
${data.waterAnalysis ? `
CE=${data.waterAnalysis.ec ?? 'N/A'} dS/m | pH=${data.waterAnalysis.ph ?? 'N/A'} | SAR=${data.waterAnalysis.sar ?? 'N/A'}
NO₃=${data.waterAnalysis.nitrates ?? 'N/A'} mg/L | Cl=${data.waterAnalysis.chlorides ?? 'N/A'} mg/L | HCO₃=${data.waterAnalysis.bicarbonates ?? 'N/A'} mg/L` : 'Aucune analyse eau.'}

Analyse foliaire (${data.plantAnalysis?.latestDate ?? 'non disponible'}) :
${data.plantAnalysis ? `
N=${data.plantAnalysis.nitrogenPercent ?? 'N/A'}% | P=${data.plantAnalysis.phosphorusPercent ?? 'N/A'}% | K=${data.plantAnalysis.potassiumPercent ?? 'N/A'}%
Fe=${data.plantAnalysis.iron ?? 'N/A'}ppm | Zn=${data.plantAnalysis.zinc ?? 'N/A'}ppm | Mn=${data.plantAnalysis.manganese ?? 'N/A'}ppm | B=${data.plantAnalysis.boron ?? 'N/A'}ppm` : 'Aucune analyse foliaire.'}

====================================================
4. HISTORIQUE ET CONTEXTE
====================================================
Rendements récents :
${data.yieldHistory && data.yieldHistory.length > 0
  ? data.yieldHistory.map((y: any) => `- ${y.year} : ${y.yieldPerHa} T/ha`).join('\n')
  : 'Aucun historique disponible.'}

ETo mensuel historique moyen (mm/jour) :
${data.historicalETo ? JSON.stringify(data.historicalETo) : 'Utiliser valeurs standard région.'}

Date de génération du plan : ${data.generationDate ?? new Date().toISOString().split('T')[0]}

====================================================
5. SORTIE REQUISE — JSON STRICT
====================================================
Retourne UNIQUEMENT un objet JSON valide avec la structure exacte ci-dessous.

{
  "parcelId": "${data.parcel.id ?? data.parcel.name}",
  "season": "${data.season}",
  "generationDate": "Date de génération",
  "version": 1,
  "status": "brouillon",

  "parameters": {
    "system": "traditionnel | intensif | super-intensif",
    "variety": "Variété",
    "age": <âge en années>,
    "density": <arbres/ha>,
    "surfaceHa": <surface>,
    "nutritionOption": "A | B | C",
    "productionTarget": "huile_qualite | olive_table | mixte",
    "alternanceStatus": "annee_ON | annee_OFF_sain | epuisement | indetermine",
    "yieldTargetTha": <rendement cible calculé avec coefficient sécurité>
  },

  "annualDoses": {
    "calculationDetails": {
      "yieldTarget": <T/ha>,
      "method": "Explication courte du calcul (formule appliquée, corrections effectuées)",
      "nitrogenFromWater": <kg N/ha apporté par l'eau d'irrigation, 0 si pas d'analyse>,
      "correctionsSoil": "Corrections appliquées selon analyse sol (ex: P réduit car sol riche)",
      "alternanceAdjustment": "Ajustement appliqué selon statut alternance"
    },
    "N_kg_ha": <dose annuelle N>,
    "P2O5_kg_ha": <dose annuelle P₂O₅>,
    "K2O_kg_ha": <dose annuelle K₂O>,
    "MgO_kg_ha": <dose annuelle MgO>
  },

  "interventions": [
    {
      "id": "INT-001",
      "type": "fertigation | foliaire | sol | phyto | irrigation | taille | recolte | suivi",
      "category": "NPK | microelements | biostimulants | phytosanitaire | eau | mecanique",
      "month": "jan | fev | mar | avr | mai | jun | jul | aou | sep | oct | nov | dec",
      "week": <1-4 ou null>,
      "stageBBCH": "Stade BBCH ciblé (ex: 51-55)",
      "product": "Produit / matière active recommandé",
      "dose": <valeur numérique>,
      "doseUnit": "kg/ha | L/ha | L/arbre | kg/arbre",
      "nutrientContent": { "N": null, "P2O5": null, "K2O": null },
      "applicationMethod": "fertigation | foliaire | epandage_sol | injection",
      "applicationConditions": "Conditions météo requises pour l'application",
      "priority": "normale | haute | critique",
      "status": "planifie",
      "notes": "Note ou précaution particulière (incompatibilités, restrictions DAR...)"
    }
  ],

  "irrigation": {
    "type": "goutte_a_goutte | aspersion | bore | pluvial",
    "monthlyPlan": [
      {
        "month": "jan",
        "etoMean": <ETo mm/jour>,
        "kc": <coefficient cultural>,
        "volumeLArbreJour": <volume calculé>,
        "frequency": "1x/sem | 2x/sem | 3x/sem | quotidien",
        "notes": "Ajustement si salinité ou événement météo"
      }
    ],
    "salinityManagement": {
      "active": <true | false>,
      "leachingFractionPct": <FL% calculé ou null>,
      "acidification": <true | false>,
      "acidificationProduct": "H₃PO₄ | HNO₃ | acide citrique | null",
      "gypsumRequired": <true | false>,
      "gypsumDoseTha": <dose ou null>,
      "gypsumCondition": "SAR > 6 confirmé | non requis"
    }
  },

  "pruning": {
    "type": "legere_eclaircie | renouvellement | progressive | rajeunissement | formation",
    "intensity": "Intensité (ex: 10-15% volume)",
    "period": "Nov-Déc | Fév-Mars",
    "targetBBCH": "00-09",
    "toolDisinfection": "Eau de javel 1% ou alcool 70% — 30 secondes entre chaque arbre",
    "residueManagement": "Broyage si sain | Export + brûlage si maladie détectée",
    "notes": "Note selon statut alternance"
  },

  "harvestForecast": {
    "productionTarget": "huile_qualite | olive_table | mixte",
    "maturityIndexTarget": { "min": <IM min>, "max": <IM max> },
    "harvestWindow": { "start": "YYYY-MM-DD estimé", "end": "YYYY-MM-DD estimé" },
    "satelliteSignal": "NIRvP ↘ + NDVI stable → maturation en cours. Déclencher récolte quand NIRvP < 60% du pic saison.",
    "yieldForecast": {
      "low": <T/ha>,
      "central": <T/ha>,
      "high": <T/ha>,
      "note": "Estimation à affiner en saison selon NIRvP et terrain"
    }
  },

  "economicEstimate": {
    "totalInputCostDhHa": <coût total intrants estimé en DH/ha>,
    "breakdown": {
      "NPK_DhHa": <coût NPK>,
      "microelements_DhHa": <coût microéléments>,
      "biostimulants_DhHa": <coût biostimulants>,
      "phyto_DhHa": <coût phytosanitaire>
    },
    "note": "Prix indicatifs basés sur le marché marocain 2025-2026"
  },

  "planSummary": "3-4 phrases résumant le plan : rendement cible, programme nutritionnel principal, points d'attention clés et ce qui rend ce plan spécifique à cette parcelle.",

  "validationRequired": true,
  "validationMessage": "Votre plan annuel est prêt. Vérifiez les paramètres et validez pour activer les rappels et le suivi automatique."
}

EXIGENCES CRITIQUES :
— Applique les formules de calcul exactes définies dans le system prompt
— Montre le détail du calcul des doses dans calculationDetails
— Génère TOUTES les interventions du calendrier, pas seulement les principales
— Le KCl est STRICTEMENT INTERDIT si eau saline (Option C)
— Le gypse est généré UNIQUEMENT si SAR > 6
— Le bore floraison est TOUJOURS inclus (deux applications BBCH 51-55 et 65-67)
— Les traitements mouche ne sont PAS planifiés — ils sont déclenchés par alertes en cours de saison
— Le plan reste en statut "brouillon" jusqu'à validation utilisateur explicite
— Tout le contenu textuel en ${language === 'fr' ? 'français' : 'anglais'}
`;
}
