import { AggregatedParcelData } from '../interfaces';

export const AGRICULTURAL_EXPERT_SYSTEM_PROMPT = `You are an expert agricultural consultant with deep expertise in:
- Soil science and fertility management
- Plant nutrition and health diagnostics
- Precision agriculture and remote sensing interpretation
- Mediterranean/North African crop management (particularly olive trees, fruit trees, cereals, vegetables)
- Irrigation and water management
- Integrated pest management

You analyze agricultural data and provide:
1. Clear, actionable recommendations
2. Data-driven health assessments with quantitative scores
3. Risk identification with concrete mitigation strategies
4. Prioritized action items with timing guidance

IMPORTANT RULES:
- Always respond with valid JSON matching the exact schema provided
- Use professional agricultural terminology while remaining accessible
- Base all recommendations on the provided data - do not make assumptions beyond what the data shows
- When data is missing or "N/A", acknowledge it and provide general best practices
- Prioritize recommendations based on urgency and impact on yield
- Consider seasonal factors and timing for all recommendations`;

export function buildUserPrompt(
  data: AggregatedParcelData,
  language: string = 'fr',
): string {
  const langInstruction =
    language === 'fr'
      ? 'Fournir tout le contenu textuel en français.'
      : 'Provide all text content in English.';

  return `${langInstruction}

Analyze the following agricultural data for parcel "${data.parcel.name}" and generate a comprehensive report.

## PARCEL INFORMATION
- Name: ${data.parcel.name}
- Area: ${data.parcel.area} ${data.parcel.areaUnit}
- Soil Type: ${data.parcel.soilType || 'Non spécifié'}
- Crop/Tree Type: ${data.parcel.cropType || data.parcel.treeType || 'Non spécifié'}
- Variety: ${data.parcel.variety || 'Non spécifié'}
- Rootstock: ${data.parcel.rootstock || 'Non spécifié'}
- Planting Year: ${data.parcel.plantingYear || 'Non spécifié'}
- Tree Count: ${data.parcel.treeCount || 'N/A'}
- Irrigation Type: ${data.parcel.irrigationType || 'Non spécifié'}

## SOIL ANALYSIS ${data.soilAnalysis?.latestDate ? `(Date: ${data.soilAnalysis.latestDate})` : '(Aucune analyse disponible)'}
${
  data.soilAnalysis
    ? `
- pH: ${data.soilAnalysis.phLevel ?? 'N/A'}
- Matière Organique: ${data.soilAnalysis.organicMatter ?? 'N/A'}%
- Azote (ppm): ${data.soilAnalysis.nitrogenPpm ?? 'N/A'}
- Phosphore (ppm): ${data.soilAnalysis.phosphorusPpm ?? 'N/A'}
- Potassium (ppm): ${data.soilAnalysis.potassiumPpm ?? 'N/A'}
- Texture: ${data.soilAnalysis.texture ?? 'N/A'}
- CEC (meq/100g): ${data.soilAnalysis.cec ?? 'N/A'}
- Conductivité Électrique: ${data.soilAnalysis.ec ?? 'N/A'} dS/m
- Calcium (ppm): ${data.soilAnalysis.calcium ?? 'N/A'}
- Magnésium (ppm): ${data.soilAnalysis.magnesium ?? 'N/A'}
- Soufre (ppm): ${data.soilAnalysis.sulfur ?? 'N/A'}
- Fer (ppm): ${data.soilAnalysis.iron ?? 'N/A'}
- Zinc (ppm): ${data.soilAnalysis.zinc ?? 'N/A'}
- Manganèse (ppm): ${data.soilAnalysis.manganese ?? 'N/A'}
- Cuivre (ppm): ${data.soilAnalysis.copper ?? 'N/A'}
- Bore (ppm): ${data.soilAnalysis.boron ?? 'N/A'}
`
    : 'Aucune donnée d\'analyse de sol disponible.'
}

## WATER ANALYSIS ${data.waterAnalysis?.latestDate ? `(Date: ${data.waterAnalysis.latestDate})` : '(Aucune analyse disponible)'}
${
  data.waterAnalysis
    ? `
- pH: ${data.waterAnalysis.ph ?? 'N/A'}
- Conductivité Électrique: ${data.waterAnalysis.ec ?? 'N/A'} dS/m
- TDS: ${data.waterAnalysis.tds ?? 'N/A'} ppm
- Nitrates: ${data.waterAnalysis.nitrates ?? 'N/A'} ppm
- Chlorures: ${data.waterAnalysis.chlorides ?? 'N/A'} ppm
- Dureté: ${data.waterAnalysis.hardness ?? 'N/A'} ppm
- SAR (Sodium Absorption Ratio): ${data.waterAnalysis.sar ?? 'N/A'}
`
    : 'Aucune donnée d\'analyse d\'eau disponible.'
}

## PLANT ANALYSIS ${data.plantAnalysis?.latestDate ? `(Date: ${data.plantAnalysis.latestDate})` : '(Aucune analyse disponible)'}
${
  data.plantAnalysis
    ? `
- Azote (%): ${data.plantAnalysis.nitrogenPercent ?? 'N/A'}
- Phosphore (%): ${data.plantAnalysis.phosphorusPercent ?? 'N/A'}
- Potassium (%): ${data.plantAnalysis.potassiumPercent ?? 'N/A'}
- Indice Chlorophylle: ${data.plantAnalysis.chlorophyllIndex ?? 'N/A'}
`
    : 'Aucune donnée d\'analyse de plante disponible.'
}

## SATELLITE INDICES (Période: ${data.satelliteIndices.period.start} à ${data.satelliteIndices.period.end})
Dernières valeurs:
- NDVI: ${data.satelliteIndices.latestData.ndvi?.toFixed(3) ?? 'N/A'} (Vigueur végétale)
- NDMI: ${data.satelliteIndices.latestData.ndmi?.toFixed(3) ?? 'N/A'} (Contenu en eau)
- NDRE: ${data.satelliteIndices.latestData.ndre?.toFixed(3) ?? 'N/A'} (Chlorophylle)
- GCI: ${data.satelliteIndices.latestData.gci?.toFixed(3) ?? 'N/A'} (Chlorophylle verte)
- SAVI: ${data.satelliteIndices.latestData.savi?.toFixed(3) ?? 'N/A'} (Végétation ajustée sol)

Tendances:
- NDVI: ${data.satelliteIndices.trends.ndvi.direction} (${data.satelliteIndices.trends.ndvi.changePercent > 0 ? '+' : ''}${data.satelliteIndices.trends.ndvi.changePercent.toFixed(1)}%)
- NDMI: ${data.satelliteIndices.trends.ndmi.direction} (${data.satelliteIndices.trends.ndmi.changePercent > 0 ? '+' : ''}${data.satelliteIndices.trends.ndmi.changePercent.toFixed(1)}%)

Interprétation NDVI:
- > 0.7: Végétation dense et saine
- 0.5-0.7: Végétation modérée
- 0.3-0.5: Végétation clairsemée
- 0.1-0.3: Végétation très clairsemée/stress
- < 0.1: Sol nu ou stress sévère

## MÉTÉO (Période: ${data.weather.period.start} à ${data.weather.period.end})
- Température moyenne min: ${data.weather.temperatureSummary.avgMin.toFixed(1)}°C
- Température moyenne max: ${data.weather.temperatureSummary.avgMax.toFixed(1)}°C
- Température moyenne: ${data.weather.temperatureSummary.avgMean.toFixed(1)}°C
- Précipitations totales: ${data.weather.precipitationTotal.toFixed(1)} mm
- Périodes de sécheresse: ${data.weather.drySpellsCount}
- Jours de gel: ${data.weather.frostDays}

## REQUIRED OUTPUT FORMAT
Return a JSON object with this EXACT structure (all fields required):
{
  "executiveSummary": "Résumé de 2-3 phrases sur l'état de la parcelle et les points clés",
  "healthAssessment": {
    "overallScore": <number 0-100, based on all available data>,
    "soilHealth": "Évaluation de la santé du sol en 1-2 phrases",
    "vegetationHealth": "Évaluation de la santé végétale en 1-2 phrases",
    "waterStatus": "Évaluation du statut hydrique en 1-2 phrases"
  },
  "detailedAnalysis": {
    "soilAnalysis": "Analyse détaillée du sol...",
    "vegetationAnalysis": "Interprétation des données satellite...",
    "waterAnalysis": "Évaluation de la qualité et disponibilité de l'eau...",
    "climateImpact": "Analyse de l'impact météorologique..."
  },
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "fertilization|irrigation|pest-control|soil-amendment|general",
      "title": "Titre court de la recommandation",
      "description": "Description détaillée avec dosages et méthodes spécifiques",
      "timing": "Quand appliquer (saison, mois, ou conditions)"
    }
  ],
  "riskAlerts": [
    {
      "severity": "critical|warning|info",
      "type": "Type de risque (ex: Stress hydrique, Carence, Salinité)",
      "description": "Description du risque identifié",
      "mitigationSteps": ["Action 1", "Action 2"]
    }
  ],
  "actionItems": [
    {
      "priority": 1,
      "action": "Action spécifique à réaliser",
      "deadline": "Échéance suggérée",
      "estimatedImpact": "Impact attendu sur le rendement/qualité"
    }
  ]
}

IMPORTANT:
- Include at least 3 recommendations sorted by priority
- Include any applicable risk alerts (can be empty array if no risks)
- Include at least 3 action items numbered by priority
- All text content must be in ${language === 'fr' ? 'French' : 'English'}`;
}
