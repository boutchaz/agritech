import { AggregatedParcelData } from '../interfaces';

export const AGRICULTURAL_EXPERT_SYSTEM_PROMPT = `You are a world-class agricultural consultant and agronomist with 30+ years of field experience. Your expertise spans:

CORE EXPERTISE:
- Advanced soil science, fertility management, and soil health restoration
- Plant nutrition, deficiency diagnosis, and precision fertilization
- Precision agriculture, remote sensing interpretation, and satellite imagery analysis
- Mediterranean/North African agriculture (olive trees, fruit trees, cereals, vegetables, vineyards)
- Irrigation optimization, water stress management, and drought mitigation
- Integrated pest and disease management (IPM/IDM)
- Crop phenology, growth stages, and seasonal management
- Yield optimization, quality improvement, and economic sustainability
- Climate adaptation and weather risk management

ANALYTICAL APPROACH:
You provide farmers with:
1. **Deep Insights**: Not just data summaries, but meaningful interpretations that connect dots between satellite trends, soil health, weather patterns, and farm operations
2. **Actionable Recommendations**: Specific, prioritized actions with dosages, timing, methods, and expected outcomes
3. **Predictive Analysis**: Forecast potential issues before they become problems, based on current conditions and historical patterns
4. **Comparative Analysis**: Benchmark current performance against historical data, regional averages, and optimal conditions
5. **Economic Context**: Cost-benefit analysis, ROI projections, and economic impact of recommendations
6. **Risk Assessment**: Identify risks early with severity levels and concrete mitigation strategies
7. **Seasonal Planning**: Forward-looking guidance for upcoming seasons based on current conditions

CRITICAL PRINCIPLES:
- **Data-Driven**: Base ALL conclusions on provided data. When data is missing, clearly state limitations and provide general best practices
- **Context-Aware**: Always interpret satellite indices in context of:
  * Recent farm operations (tasks, applications, pruning, etc.)
  * Phenological stage of the crop
  * Weather patterns and climate conditions
  * Historical performance and trends
- **Farmer-Focused**: Write for farmers, not academics. Use clear language, practical examples, and focus on what matters: yield, quality, and profitability
- **Action-Oriented**: Every insight should lead to a specific action. Avoid generic advice.
- **Prioritized**: Rank recommendations by urgency (critical issues first) and impact (highest ROI first)
- **Timing-Sensitive**: Consider seasonal timing, crop stage, and weather forecasts for all recommendations
- **Holistic**: Connect soil health, water management, nutrition, and pest control as an integrated system

OUTPUT REQUIREMENTS:
- Always respond with valid JSON matching the exact schema
- Provide quantitative assessments with scores and percentages where possible
- Include specific dosages, application rates, and timing windows
- Reference specific data points when making conclusions
- Flag any assumptions or limitations in data quality
- Minimum 5-7 recommendations covering all critical areas
- Minimum 3-5 action items with clear deadlines
- Include cost estimates and ROI projections where applicable`;

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
${data.harvests && data.harvests.length > 0 ? `7. HARVEST HISTORY & PERFORMANCE` : ''}
====================================================
${data.harvests && data.harvests.length > 0 ? `
Recent harvests provide context for current performance:
${data.harvests.slice(0, 10).map((h: any) => `
- ${h.date}: ${h.quantity} ${h.unit}${h.qualityGrade ? ` (Quality: ${h.qualityGrade})` : ''}${h.qualityScore ? ` [Score: ${h.qualityScore}/10]` : ''}
`).join('')}

Use this to:
- Compare current vegetation indices with past harvest quality
- Identify trends in yield and quality over time
- Assess if current management practices are improving or declining
` : 'No recent harvest data available.'}

${data.yieldHistory && data.yieldHistory.length > 0 ? `
Historical Yield Performance (for comparison):
${data.yieldHistory.map((yh: any) => `
- ${yh.year} ${yh.season}: ${yh.yieldPerHa?.toFixed(1) || 'N/A'} kg/ha${yh.qualityGrade ? ` (Quality: ${yh.qualityGrade})` : ''}${yh.performanceRating ? ` [Rating: ${yh.performanceRating}]` : ''}
`).join('')}

Analyze:
- Year-over-year trends in yield
- Seasonal variations and patterns
- Performance ratings and what they indicate
- How current conditions compare to historical averages
` : ''}

${data.cropCycle ? `
====================================================
8. CURRENT CROP CYCLE STATUS
====================================================
Cycle: ${data.cropCycle.cycleName}
Status: ${data.cropCycle.status}
${data.cropCycle.plantingDate ? `Planting Date: ${data.cropCycle.plantingDate}` : ''}
${data.cropCycle.expectedHarvestStart ? `Expected Harvest: ${data.cropCycle.expectedHarvestStart} to ${data.cropCycle.expectedHarvestEnd || 'TBD'}` : ''}
${data.cropCycle.actualHarvestStart ? `Actual Harvest: ${data.cropCycle.actualHarvestStart} to ${data.cropCycle.actualHarvestEnd || 'Ongoing'}` : ''}
${data.cropCycle.expectedYieldPerHa ? `Expected Yield: ${data.cropCycle.expectedYieldPerHa.toFixed(1)} kg/ha` : ''}
${data.cropCycle.actualYieldPerHa ? `Actual Yield: ${data.cropCycle.actualYieldPerHa.toFixed(1)} kg/ha` : ''}
${data.cropCycle.totalCosts !== undefined ? `Total Costs: ${data.cropCycle.totalCosts.toFixed(2)}` : ''}
${data.cropCycle.totalRevenue !== undefined ? `Total Revenue: ${data.cropCycle.totalRevenue.toFixed(2)}` : ''}
${data.cropCycle.netProfit !== undefined ? `Net Profit: ${data.cropCycle.netProfit.toFixed(2)}` : ''}

Use this to:
- Assess if current cycle is on track vs expectations
- Identify economic performance and ROI
- Provide context for recommendations (e.g., if behind schedule, prioritize actions)
` : ''}

${data.performanceAlerts && data.performanceAlerts.length > 0 ? `
====================================================
9. ACTIVE PERFORMANCE ALERTS
====================================================
${data.performanceAlerts.map((pa: any) => `
- [${pa.severity.toUpperCase()}] ${pa.type}: ${pa.description} (${new Date(pa.date).toLocaleDateString()})
`).join('')}

These alerts indicate areas requiring immediate attention. Address them in your recommendations.
` : ''}

====================================================
10. REQUIRED OUTPUT — STRICT JSON
====================================================
Return a JSON object with this EXACT structure (all fields required):
{
  "executiveSummary": "3-4 sentence comprehensive summary covering: current status, key findings, performance trends, and critical actions needed",
  "phenologicalStage": "Current phenological stage with specific timing and what this means for management",
  "dataConfidence": {
    "satelliteDataStatus": "good|partial|limited",
    "comment": "Detailed comment on data quality, completeness, and reliability for decision-making"
  },
  "healthAssessment": {
    "overallScore": <number 0-100, calculated from all factors>,
    "soilHealth": "Detailed soil health assessment (2-3 sentences) with specific issues and strengths",
    "vegetationHealth": "Detailed vegetation health assessment (2-3 sentences) with NDVI/NDMI interpretation",
    "waterStatus": "Detailed water status assessment (2-3 sentences) including stress levels and irrigation adequacy"
  },
  "detailedAnalysis": {
    "taskImpactAnalysis": "Deep analysis (3-4 sentences) of how recent operations affected the parcel, with specific examples",
    "satelliteInterpretation": "Comprehensive interpretation (4-5 sentences) connecting satellite trends to phenology, tasks, weather, and historical performance",
    "soilAndNutrition": "Detailed analysis (3-4 sentences) of soil fertility, nutrient balance, deficiencies, and optimization opportunities",
    "irrigationAndWaterStress": "Detailed analysis (3-4 sentences) of water management, stress indicators, and irrigation efficiency",
    "climateImpact": "Detailed analysis (3-4 sentences) of how weather patterns affected crop development and what to expect",
    "yieldPerformance": "${data.yieldHistory && data.yieldHistory.length > 0 ? 'Comparative analysis (3-4 sentences) of yield trends, performance vs historical averages, and factors affecting productivity' : 'N/A - No historical yield data available'}",
    "economicOutlook": "${data.cropCycle ? 'Economic analysis (2-3 sentences) of current cycle performance, ROI, cost efficiency, and profitability projections' : 'N/A - No crop cycle data available'}"
  },
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "irrigation|fertilization|soil|pruning|plant-health|pest-control|general",
      "title": "Specific, actionable recommendation title",
      "description": "Detailed description (3-4 sentences) with: specific dosages/rates, application methods, expected outcomes, and why this is important now",
      "timing": "Specific timing window (e.g., 'Within 2 weeks', 'Before flowering', 'During dormancy')",
      "estimatedCost": "Estimated cost per hectare or total cost if applicable",
      "expectedROI": "Expected return on investment or yield/quality improvement percentage if applicable"
    }
  ],
  "riskAlerts": [
    {
      "severity": "critical|warning|info",
      "type": "Specific risk type (e.g., 'Water Stress', 'Nutrient Deficiency', 'Disease Risk', 'Yield Decline')",
      "description": "Detailed description (2-3 sentences) of the risk, its causes, and potential impact",
      "mitigationSteps": ["Specific action 1 with timing", "Specific action 2 with timing", "Monitoring action"]
    }
  ],
  "actionItems": [
    {
      "priority": 1,
      "action": "Very specific action to take (e.g., 'Apply 50kg/ha NPK 15-15-15 fertilizer via fertigation')",
      "deadline": "Specific deadline (e.g., 'Within 7 days', 'Before March 15', 'During next irrigation cycle')",
      "estimatedImpact": "Quantified expected impact (e.g., 'Expected 15-20% yield increase', 'Should improve NDVI by 0.1-0.15 points', 'May prevent 30% quality loss')"
    }
  ],
  "seasonalPlanning": {
    "upcomingSeason": "Analysis of what to expect in the upcoming season based on current conditions",
    "preparationNeeded": "Specific preparation actions needed before next season (2-3 items)",
    "optimizationOpportunities": "Opportunities to optimize next cycle based on current learnings"
  },
  "insights": [
    {
      "type": "trend|anomaly|opportunity|warning",
      "title": "Insight title",
      "description": "Deep insight (2-3 sentences) connecting multiple data points to reveal something not immediately obvious"
    }
  ]
}

CRITICAL REQUIREMENTS:
- Minimum 5-7 recommendations covering: irrigation, fertilization, soil health, pest/disease management, and optimization
- Minimum 3-5 action items with specific deadlines and quantified impacts
- Minimum 3-4 insights that reveal non-obvious connections between data points
- Include cost estimates and ROI projections for major recommendations
- Compare current performance to historical data when available
- Do NOT recommend actions already performed recently (check task history)
- Interpret satellite data in context of: tasks, phenology, weather, and historical performance
- Provide specific dosages, rates, and application methods - avoid generic advice
- All text content must be in ${language === 'fr' ? 'French' : 'English'}
- Be farmer-focused: prioritize yield, quality, and profitability in all recommendations`;
}
