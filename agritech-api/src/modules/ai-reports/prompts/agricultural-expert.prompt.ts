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

  return `
${langInstruction}

Analyze the agricultural data for parcel "${data.parcel.name}".
You MUST strictly follow the agronomic methodology defined in the system prompt.

====================================================
1. PARCEL INFORMATION
====================================================
- Name: ${data.parcel.name}
- Area: ${data.parcel.area} ${data.parcel.areaUnit}
- Crop / Tree type: ${data.parcel.cropType || data.parcel.treeType || 'Non spécifié'}
- Variety: ${data.parcel.variety || 'Non spécifié'}
- Rootstock: ${data.parcel.rootstock || 'Non spécifié'}
- Planting year: ${data.parcel.plantingYear || 'Non spécifié'}
- Tree count: ${data.parcel.treeCount || 'N/A'}
- Soil type: ${data.parcel.soilType || 'Non spécifié'}
- Irrigation type: ${data.parcel.irrigationType || 'Non spécifié'}

====================================================
2. FARM TASKS / OPERATIONS HISTORY
====================================================
The following agricultural tasks were recorded on the parcel.
You MUST analyze them BEFORE interpreting satellite data.

${data.tasks && data.tasks.length > 0 ? `
For each task, consider:
- Task type
- Date
- Products or operations applied
- Expected agronomic effect

Tasks:
${data.tasks.map(t => `
- Date: ${t.date}
  Type: ${t.type}
  Description: ${t.description || 'N/A'}
`).join('')}
` : 'No recorded tasks.'}

====================================================
3. SOIL / WATER / PLANT ANALYSES
====================================================
(Use dates to evaluate data reliability)

## SOIL ANALYSIS ${data.soilAnalysis?.latestDate ? `(Date: ${data.soilAnalysis.latestDate})` : '(No analysis available)'}
${
  data.soilAnalysis
    ? `
- pH: ${data.soilAnalysis.phLevel ?? 'N/A'}
- Organic Matter: ${data.soilAnalysis.organicMatter ?? 'N/A'}%
- Nitrogen (ppm): ${data.soilAnalysis.nitrogenPpm ?? 'N/A'}
- Phosphorus (ppm): ${data.soilAnalysis.phosphorusPpm ?? 'N/A'}
- Potassium (ppm): ${data.soilAnalysis.potassiumPpm ?? 'N/A'}
- Texture: ${data.soilAnalysis.texture ?? 'N/A'}
- CEC (meq/100g): ${data.soilAnalysis.cec ?? 'N/A'}
- Electrical Conductivity: ${data.soilAnalysis.ec ?? 'N/A'} dS/m
- Calcium (ppm): ${data.soilAnalysis.calcium ?? 'N/A'}
- Magnesium (ppm): ${data.soilAnalysis.magnesium ?? 'N/A'}
- Sulfur (ppm): ${data.soilAnalysis.sulfur ?? 'N/A'}
- Iron (ppm): ${data.soilAnalysis.iron ?? 'N/A'}
- Zinc (ppm): ${data.soilAnalysis.zinc ?? 'N/A'}
- Manganese (ppm): ${data.soilAnalysis.manganese ?? 'N/A'}
- Copper (ppm): ${data.soilAnalysis.copper ?? 'N/A'}
- Boron (ppm): ${data.soilAnalysis.boron ?? 'N/A'}
`
    : 'No soil analysis data available.'
}

## WATER ANALYSIS ${data.waterAnalysis?.latestDate ? `(Date: ${data.waterAnalysis.latestDate})` : '(No analysis available)'}
${
  data.waterAnalysis
    ? `
- pH: ${data.waterAnalysis.ph ?? 'N/A'}
- Electrical Conductivity: ${data.waterAnalysis.ec ?? 'N/A'} dS/m
- TDS: ${data.waterAnalysis.tds ?? 'N/A'} ppm
- Nitrates: ${data.waterAnalysis.nitrates ?? 'N/A'} ppm
- Chlorides: ${data.waterAnalysis.chlorides ?? 'N/A'} ppm
- Hardness: ${data.waterAnalysis.hardness ?? 'N/A'} ppm
- SAR (Sodium Absorption Ratio): ${data.waterAnalysis.sar ?? 'N/A'}
`
    : 'No water analysis data available.'
}

## PLANT ANALYSIS ${data.plantAnalysis?.latestDate ? `(Date: ${data.plantAnalysis.latestDate})` : '(No analysis available)'}
${
  data.plantAnalysis
    ? `
- Nitrogen (%): ${data.plantAnalysis.nitrogenPercent ?? 'N/A'}
- Phosphorus (%): ${data.plantAnalysis.phosphorusPercent ?? 'N/A'}
- Potassium (%): ${data.plantAnalysis.potassiumPercent ?? 'N/A'}
- Chlorophyll Index: ${data.plantAnalysis.chlorophyllIndex ?? 'N/A'}
`
    : 'No plant analysis data available.'
}

====================================================
4. SATELLITE INDICES — TIME SERIES
====================================================
Period: ${data.satelliteIndices.period.start} → ${data.satelliteIndices.period.end}

Available indices:
PRI, NDVI, GCI, SAVI, OSAVI, MSAVI, NDMI, MNDWI, MSI, NDRE, TCARI, MCARI

Latest values:
- NDVI: ${data.satelliteIndices.latestData.ndvi?.toFixed(3) ?? 'N/A'} (Vegetation vigor)
- NDMI: ${data.satelliteIndices.latestData.ndmi?.toFixed(3) ?? 'N/A'} (Water content)
- NDRE: ${data.satelliteIndices.latestData.ndre?.toFixed(3) ?? 'N/A'} (Chlorophyll)
- GCI: ${data.satelliteIndices.latestData.gci?.toFixed(3) ?? 'N/A'} (Green chlorophyll)
- SAVI: ${data.satelliteIndices.latestData.savi?.toFixed(3) ?? 'N/A'} (Soil-adjusted vegetation)

Trends:
- NDVI: ${data.satelliteIndices.trends.ndvi.direction} (${data.satelliteIndices.trends.ndvi.changePercent > 0 ? '+' : ''}${data.satelliteIndices.trends.ndvi.changePercent.toFixed(1)}%)
- NDMI: ${data.satelliteIndices.trends.ndmi.direction} (${data.satelliteIndices.trends.ndmi.changePercent > 0 ? '+' : ''}${data.satelliteIndices.trends.ndmi.changePercent.toFixed(1)}%)

Interpret trends in relation to:
- Phenological stage
- Climate
- Farm tasks timing

====================================================
5. CLIMATE DATA
====================================================
Period: ${data.weather.period.start} → ${data.weather.period.end}
- Avg temperature min: ${data.weather.temperatureSummary.avgMin.toFixed(1)}°C
- Avg temperature max: ${data.weather.temperatureSummary.avgMax.toFixed(1)}°C
- Avg temperature mean: ${data.weather.temperatureSummary.avgMean.toFixed(1)}°C
- Rainfall total: ${data.weather.precipitationTotal.toFixed(1)} mm
- Dry spells: ${data.weather.drySpellsCount}
- Frost days: ${data.weather.frostDays}

====================================================
6. REQUIRED OUTPUT — STRICT JSON
====================================================
Return a JSON object with this EXACT structure (all fields required):
{
  "executiveSummary": "2-3 sentence summary of parcel status and key points",
  "phenologicalStage": "Current phenological stage of the crop/trees",
  "dataConfidence": {
    "satelliteDataStatus": "good|partial|limited",
    "comment": "Brief comment on data quality and reliability"
  },
  "healthAssessment": {
    "overallScore": <number 0-100, based on all available data>,
    "soilHealth": "Soil health assessment in 1-2 sentences",
    "vegetationHealth": "Vegetation health assessment in 1-2 sentences",
    "waterStatus": "Water status assessment in 1-2 sentences"
  },
  "detailedAnalysis": {
    "taskImpactAnalysis": "Analysis of how recent tasks affected the parcel...",
    "satelliteInterpretation": "Interpretation of satellite data in context of tasks and phenology...",
    "soilAndNutrition": "Soil and nutrition analysis...",
    "irrigationAndWaterStress": "Irrigation and water stress analysis...",
    "climateImpact": "Climate impact analysis..."
  },
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "irrigation|fertilization|soil|pruning|plant-health|general",
      "title": "Short recommendation title",
      "description": "Detailed description with specific dosages and methods",
      "timing": "When to apply (season, month, or conditions)"
    }
  ],
  "riskAlerts": [
    {
      "severity": "critical|warning|info",
      "type": "Risk type (e.g., Water stress, Deficiency, Salinity)",
      "description": "Description of identified risk",
      "mitigationSteps": ["Action 1", "Action 2"]
    }
  ],
  "actionItems": [
    {
      "priority": 1,
      "action": "Specific action to take",
      "deadline": "Suggested deadline",
      "estimatedImpact": "Expected impact on yield/quality"
    }
  ]
}

IMPORTANT:
- Do NOT recommend actions already performed recently
- Interpret satellite data in light of farm tasks
- Minimum 3 recommendations and 3 action items
- All text content must be in ${language === 'fr' ? 'French' : 'English'}`;
}
