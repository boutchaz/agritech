import { Injectable } from '@nestjs/common';
import { ContextSummarizerService } from '../context/context-summarizer.service';

// Import BuiltContext type from chat service (will be moved to shared types later)
// For now we use 'any' to avoid circular dependency during extraction
type BuiltContext = any;

@Injectable()
export class PromptBuilderService {
  private readonly summarizer = new ContextSummarizerService();

  /**
   * Explains why forecast rows may be missing so the model does not falsely blame "no parcel coordinates".
   */
  private weatherForecastUnavailableExplanation(context: BuiltContext): string {
    const d = context.satelliteWeather?.weather_forecast?.diagnostics;
    if (!d) {
      return 'No forecast rows were attached. Do not insist that parcels lack GPS or AOI unless farm data in context clearly shows unmappable parcels.';
    }
    const bits: string[] = [
      `openweather_configured=${d.openweather_configured}`,
      `parcels_loaded=${d.parcels_loaded}`,
      `parcels_with_resolved_location=${d.parcels_resolved_location}`,
      `forecasts_returned=${d.forecasts_returned}`,
    ];
    if (!d.openweather_configured) {
      bits.push('Likely cause: OpenWeatherMap API key is not set on the server.');
    } else if (d.parcels_loaded > 0 && d.parcels_resolved_location === 0) {
      bits.push(
        'Likely cause: no location could be built from parcel boundary JSON, PostGIS centroid/boundary_geom, or satellite AOI geometry.',
      );
    } else if (d.parcels_resolved_location > 0 && d.forecasts_returned === 0) {
      bits.push(
        'Likely cause: weather API error, rate limit, or empty response despite resolved coordinates.',
      );
    }
    return `System diagnostics: ${bits.join('; ')}`;
  }

  buildSystemPrompt(options?: { enableTools?: boolean }): string {
    const toolInstructions = options?.enableTools
      ? `

**Available Actions:**
- You have access to the following actions. Use them ONLY when the user explicitly asks you to take an action:
- create_task_from_recommendation: Create a workforce task only when the user clearly requests it AND it maps to an existing validated Agromind recommendation already listed in context (never invent a recommendation to justify a task).
- mark_intervention_done: Mark an intervention as executed only for interventions from the validated/active Agromind annual plan in context — not for arbitrary user tasks.`
      : '';

    return `You are an expert agricultural consultant and intelligent assistant for the AgriTech platform with deep expertise in:

**Agricultural Expertise:**
- Soil science and fertility management
- Plant nutrition and health diagnostics
- Precision agriculture and remote sensing interpretation (NDVI, NDMI, NDRE, GCI, SAVI)
- Mediterranean/North African crop management (olive trees, fruit trees, cereals, vegetables)
- Irrigation and water management
- Integrated pest management
- Seasonal awareness and phenological stages
- Crop cycle management and timing

**Farm Management:**
- Parcels, crops, varieties, rootstocks, and soil information
- Irrigation systems and farm structures
- Crop cycles, phenological stages, planting dates, expected harvest windows
- Satellite indices interpretation (vegetation health, water stress, chlorophyll)

**Workforce Management:**
- Workers (employees, day laborers, métayage)
- Tasks and assignments
- Work records and payments

**Accounting & Finance:**
- Chart of accounts and journal entries
- Invoices (sales/purchase), payments
- Financial reports and fiscal years
- Profitability analysis and cost management

**Inventory & Stock:**
- Items and products
- Warehouses and stock movements
- Stock entries and reception batches

**Production Intelligence:**
- Harvests and yields
- Quality control checks
- Deliveries and production intelligence
- Performance alerts and underperforming parcels
- Yield forecasts and benchmarks
- Yield trends and variance analysis

**Suppliers & Customers:**
- Supplier management
- Customer management
- Sales orders and purchase orders
- Quotes and estimates

**Your capabilities:**
- Answer questions about farm operations, ERP data (stock, workers, accounting), and general agronomic education at a high level
- Explain and summarize data already present in context (indices, diagnostics, inventories, etc.)
- Interpret satellite data, weather, and analyses descriptively when context provides them
- **CRITICAL — This chat is NOT an agronomic prescription channel:** do NOT give new actionable field instructions (dosages, product names to apply, spray/irrigate/fertilize schedules you invented). Operational “what to do in the field” must come from **Calibration / AgromindIA** (proven plan) that the user runs in the app — direct them there instead of substituting your own plan
- **CRITICAL: When the user has no farm data, act as a helpful onboarding assistant** and point them to registering farms/parcels and running **Calibration** for parcel-level Agromind outputs

**Response Guidelines:**
- **BE CONCISE AND DIRECT** - Answer the question directly, don't write essays
- For simple queries like "list farms", "list workers", "show invoices" - provide a brief, direct answer first
- If there's no data, say so briefly (e.g., "You have 0 farms registered" or "No workers found")
- Only provide detailed explanations if the user asks follow-up questions or requests more information
- Always base your responses on the provided context data
- For parcel agronomy: **only** relay what AgromindIA context already contains (diagnostics, validated recommendations, validated annual plan). Summarize in neutral language; **do not add** new doses, products, or timing you inferred
- **When there's no data:**
  * Give a brief, direct answer first (e.g., "You have 0 farms" or "No workers registered")
  * Then offer ONE sentence about how to add data (e.g., "You can add farms through the Farm Management module")
  * Don't repeat the same information multiple times
  * Don't write long paragraphs explaining what they need to do - be concise
- If you don't have sufficient data, clearly state what information is missing briefly
- Use professional agricultural terminology while remaining accessible
- Be specific with references to actual data (parcel names, amounts, dates, indices) when available
- For complex analyses, break down your response clearly
- When interpreting satellite indices, relate them to context (diagnostics, calibration baselines, weather) — **do not** treat ad-hoc **worker tasks** from the tasks module as the Agromind calendar or as agronomic truth
- If the user asks for something that requires actions you cannot perform, explain what needs to be done briefly
- **Remember: Users want quick answers, not long explanations unless they specifically ask for details**

**CRITICAL — AgromindIA Intelligence:**
- When AgromindIA computed data is provided (diagnostics, **validated** recommendations, **validated/active** annual plan, calibration), you MUST use it instead of inventing your own analysis or prescriptions.
- **Recommendations in context are already user-validated Agromind outputs** — you may summarize them; never restate them as your own new advice and never extend them with extra operational steps.
- Reference diagnostic scenarios by their code (A through H) and confidence score.
- Use referential NPK formulas and BBCH stages **only** to explain context already loaded — do NOT invent new application rates.
- **Annual plan / calendar in context is ONLY the Agromind annual plan the user validated (or active)** — never describe draft plans, never equate workforce **tasks** with that calendar. If no validated plan appears in context, tell the user to validate the Agromind plan in the app; do not improvise a calendar.
- If calibration or validated plan is missing, **direct the user to Parcel → Calibration / Agromind flows** rather than giving substitute field recommendations.
${toolInstructions}

**Structured JSON Output:**
Return ONE valid JSON object with this schema:
\`\`\`json
{
  "text": "The main response text with markdown formatting...",
  "suggestions": ["Follow-up question 1", "Follow-up question 2", "Follow-up question 3"],
  "data_cards": [
    {"type": "recommendation-card", "data": {"constat": "...", "diagnostic": "...", "action": "...", "priority": "high"}},
    {"type": "farm-summary", "data": {"farms_count": 5, "parcels_count": 12}}
  ]
}
\`\`\`

- The \`text\` field contains the main response and may use markdown.
- The \`suggestions\` field must contain 2-3 contextual follow-up questions in the same language as the reply.
- The \`data_cards\` field replaces inline card code blocks and must be an array of objects with shape \`{ "type": string, "data": object }\`.
- Only use these supported \`data_cards.type\` values:
  * \`recommendation-card\` — use **only** to mirror a validated Agromind recommendation already present in context (same substance; no new actions). Fields: {"constat":"...", "diagnostic":"...", "action":"...", "priority":"high|medium|low", "valid_from":"...", "valid_until":"..."}
  * \`diagnostic-card\` — {"scenario_code":"A-H", "scenario":"...", "confidence":0.85, "zone_classification":"optimal|normal|stressed"}
  * \`farm-summary\` — {"farms_count":N, "parcels_count":N, "workers_count":N, "pending_tasks":N}
  * \`plan-calendar\` — **only** from validated/active Agromind annual plan data in context (never from user tasks): {"upcoming":[{"month":N, "intervention_type":"...", "description":"...", "status":"planned"}], "overdue":[...], "summary":{"total":N, "executed":N, "planned":N}}
  * \`stock-alert\` — {"items":[{"item_name":"...", "current_quantity":N, "min_quantity":N, "unit":"..."}]}
  * \`financial-snapshot\` — {"revenue":N, "expenses":N, "currency":"MAD", "period":"..."}
- Use \`data_cards\` when presenting diagnostics, validated recommendations, validated annual plan, summaries, stock alerts, or financial data.
- Do NOT use the old \`---SUGGESTIONS---\` marker.
- Do NOT wrap the full response in markdown code fences.

Generate 2-3 contextual follow-up questions the user might want to ask next. They must **not** invite new field prescriptions; prefer questions about data in the app, Calibration, or validating the Agromind plan/calendar. Write them in the same language the user is using.
- Compare current indices against calibration baselines when available.
- If AgromindIA data is not available for a parcel, acknowledge it and **direct the user to Calibration / validated plan workflows** — do not fill the gap with invented agronomic programs.

**CRITICAL — Language Rule:**
- You MUST reply in the EXACT language specified in the user prompt's language instruction.
- Supported languages: English (en), French (fr), Arabic (ar).
- Your ENTIRE response must be in that language — do not mix languages.
- If the user writes in a different language than the one specified, still respond in the specified language.

You MUST respond with valid JSON matching the specified schema.`;
  }

  buildUserPrompt(
    query: string,
    context: BuiltContext,
    language: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): string {
    const langInstruction =
      language === 'fr'
        ? '⚠️ LANGUE OBLIGATOIRE : Répondre UNIQUEMENT en français. Toute la réponse doit être en français.'
        : language === 'ar'
        ? '⚠️ اللغة الإلزامية: يجب الرد باللغة العربية فقط. يجب أن تكون الإجابة بالكامل باللغة العربية.'
        : '⚠️ REQUIRED LANGUAGE: Respond ONLY in English. The entire response must be in English.';

    // Check if weather forecast is available (no string matching - AI already routed to weather agent)
    const hasWeatherForecast =
      context.satelliteWeather?.weather_forecast?.available &&
      context.satelliteWeather.weather_forecast.parcels.length > 0;

    /** Weather-specific routing from ContextBuilderService (not "satellite indices" only). */
    const weatherIntent = context.contextRouting?.weather === true;
    const satelliteOrWeatherLoaded = context.satelliteWeather !== null;

    const conversationContext = conversationHistory.length > 0
      ? `\n====================================================\nCONVERSATION HISTORY\n====================================================\n${conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n\n')}\n`
      : '';

    // Add weather forecast emphasis when the router flagged a weather question
    const weatherEmphasis =
      weatherIntent && hasWeatherForecast
        ? `\n\n⚠️ IMPORTANT: The user is asking about weather/forecast. You MUST use the "Weather Forecast (Next 5 Days)" data provided below to answer their question. The forecast includes:
- Tomorrow's weather (labeled as "Tomorrow")
- Precipitation amounts in mm
- Rain probability percentages
- Temperature ranges
- Weather descriptions

If the user asks "will it rain tomorrow", check the "Tomorrow" forecast entry for precipitation > 0mm or rain probability > 0%. Answer directly based on this data.`
        : weatherIntent && satelliteOrWeatherLoaded && !hasWeatherForecast
          ? `\n\n⚠️ NOTE: The user is asking about weather, but no usable forecast rows were attached below. ${this.weatherForecastUnavailableExplanation(context)}

Explain the limitation briefly using the diagnostics above. Do **not** claim parcels lack coordinates or AOI if \`parcels_with_resolved_location\` is greater than zero.`
          : '';

    return `${langInstruction}${weatherEmphasis}

Current Date: ${context.currentDate}
Current Season: ${context.currentSeason}${conversationContext}

User Question: ${query}

====================================================
ORGANIZATION CONTEXT
====================================================
Organization: ${context.organization.name}
Currency: ${context.organization.currency}
Account Type: ${context.organization.account_type}
Active Users: ${context.organization.active_users_count}
Timezone: ${context.organization.timezone}

${context.settings ? `====================================================
SETTINGS & SUBSCRIPTION
====================================================
${context.settings.subscription ? `
Plan: ${context.settings.subscription.plan_type || 'Free'} (${context.settings.subscription.formula || 'N/A'})
Status: ${context.settings.subscription.status}
Max Users: ${context.settings.subscription.max_users ?? 'Unlimited'}
Max Farms: ${context.settings.subscription.max_farms ?? 'Unlimited'}
Max Parcels: ${context.settings.subscription.max_parcels ?? 'Unlimited'}
${context.settings.subscription.contract_end_at ? `Contract Ends: ${context.settings.subscription.contract_end_at}` : ''}
` : 'No subscription data.'}

Team Members (${context.settings.organization_users.length}):
${context.settings.organization_users.map(u => `- ${u.name} (${u.role}) - ${u.email}`).join('\n')}
` : ''}
====================================================
FARM DATA
====================================================
${context.farms && context.farms.farms_count > 0 ? `
Farms (${context.farms.farms_count}): ${this.summarizer.summarizeFarms(context.farms.farms_recent)}
${context.farms.farms_has_more ? `... and ${context.farms.farms_count - context.farms.farms_recent.length} more farms` : ''}

Parcels (${context.farms.parcels_count}): ${this.summarizer.summarizeParcels(context.farms.parcels_recent)}
${context.farms.parcels_has_more ? `... and ${context.farms.parcels_count - context.farms.parcels_recent.length} more parcels` : ''}

Active Crop Cycles: ${context.farms.active_crop_cycles}
${context.farms.crop_cycles_recent && context.farms.crop_cycles_recent.length > 0 ? `
Crop Cycle Details:
${context.farms.crop_cycles_recent.map((cc) => `- ${cc.cycle_name} (${cc.crop_type}${cc.variety_name ? `, ${cc.variety_name}` : ''}): Status ${cc.status}, Planted ${cc.planting_date || 'N/A'}, Expected harvest ${cc.expected_harvest_start || 'N/A'} - ${cc.expected_harvest_end || 'N/A'}, Area: ${cc.planted_area_ha || 'N/A'} ha`).join('\n')}
${context.farms.crop_cycles_has_more ? `\n... and ${context.farms.crop_cycles_count ? context.farms.crop_cycles_count - context.farms.crop_cycles_recent.length : ''} more crop cycles` : ''}
` : ''}
Structures: ${context.farms.structures_count}
${context.farms.structures_recent.length > 0 ? `\n${context.farms.structures_recent.map((s) => `- ${s.name} (${s.type})`).join('\n')}` : ''}
${context.farms.structures_has_more ? `\n... and ${context.farms.structures_count - context.farms.structures_recent.length} more structures` : ''}
` : `⚠️ IMPORTANT: This organization has NO farm data registered yet (0 farms, 0 parcels).

**CRITICAL: Be CONCISE and DIRECT.**
- For simple queries like "list farms" or "list workers", answer directly: "You have 0 farms" or "No farms found"
- Don't write long paragraphs - keep it brief
- Only provide detailed explanations if the user explicitly asks for them
- Don't repeat the same information multiple times
- One sentence about how to add data is enough (e.g., "You can add farms through the Farm Management module")
- Answer the question first, then optionally offer help if relevant`}

====================================================
CAMPAIGNS
====================================================
${context.campaigns ? `
Total Campaigns: ${context.campaigns.campaigns_count}
Active Campaigns: ${context.campaigns.active_campaigns_count}
Planned Campaigns: ${context.campaigns.planned_campaigns_count}
${context.campaigns.campaigns_recent.length > 0 ? `
Recent Campaigns:
${context.campaigns.campaigns_recent.map((c) => `- ${c.name} (${c.type}, ${c.status}, ${c.priority}): ${c.start_date}${c.end_date ? ` → ${c.end_date}` : ''}`).join('\n')}
${context.campaigns.campaigns_has_more ? `\n... and ${context.campaigns.campaigns_count - context.campaigns.campaigns_recent.length} more campaigns` : ''}
` : 'No recent campaigns.'}
` : 'No campaign data available.'}

====================================================
RECEPTION BATCHES
====================================================
${context.receptionBatches ? `
Reception Batches: ${context.receptionBatches.batches_count}
${context.receptionBatches.recent_batches.length > 0 ? `
Recent Batches:
${context.receptionBatches.recent_batches.map((b) => `- ${b.batch_code} (${b.reception_date}): ${b.weight} ${b.weight_unit}, ${b.status}${b.quality_grade ? `, Grade ${b.quality_grade}` : ''}${b.parcel_name ? `, Parcel ${b.parcel_name}` : ''}${b.warehouse_name ? `, Warehouse ${b.warehouse_name}` : ''}`).join('\n')}
${context.receptionBatches.batches_has_more ? `\n... and ${context.receptionBatches.batches_count - context.receptionBatches.recent_batches.length} more batches` : ''}
` : 'No recent reception batches.'}
` : 'No reception batch data available.'}

====================================================
COMPLIANCE
====================================================
${context.compliance ? `
Certifications: ${context.compliance.certifications_count}
Active Certifications: ${context.compliance.active_certifications_count}
Expiring Soon (90d): ${context.compliance.expiring_certifications_count}
Non-compliant Checks: ${context.compliance.non_compliant_checks_count}
${context.compliance.certifications_recent.length > 0 ? `
Recent Certifications:
${context.compliance.certifications_recent.map((c) => `- ${c.certification_type} (${c.status}${c.expiry_date ? `, expires ${c.expiry_date}` : ''})`).join('\n')}
${context.compliance.certifications_has_more ? `\n... and ${context.compliance.certifications_count - context.compliance.certifications_recent.length} more certifications` : ''}
` : 'No recent certifications.'}
${context.compliance.recent_checks.length > 0 ? `
Recent Compliance Checks:
${context.compliance.recent_checks.map((c) => `- ${c.check_type} (${c.check_date}): ${c.status}${c.score !== undefined && c.score !== null ? `, score ${c.score}` : ''}${c.certification_type ? `, ${c.certification_type}` : ''}`).join('\n')}
${context.compliance.checks_has_more ? `\n... and ${context.compliance.checks_count - context.compliance.recent_checks.length} more checks` : ''}
` : 'No recent compliance checks.'}
` : 'No compliance data available.'}

====================================================
UTILITIES & EXPENSES
====================================================
${context.utilities ? `
Utility Bills: ${context.utilities.utilities_count}
Pending Bills: ${context.utilities.pending_utilities_count}
${context.utilities.utilities_recent.length > 0 ? `
Recent Utilities:
${context.utilities.utilities_recent.map((u) => `- ${u.type} (${u.billing_date}): ${u.amount}, ${u.payment_status}${u.provider ? `, ${u.provider}` : ''}${u.farm_name ? `, Farm ${u.farm_name}` : ''}${u.parcel_name ? `, Parcel ${u.parcel_name}` : ''}`).join('\n')}
${context.utilities.utilities_has_more ? `\n... and ${context.utilities.utilities_count - context.utilities.utilities_recent.length} more utility bills` : ''}
` : 'No recent utility bills.'}
` : 'No utilities data available.'}

====================================================
REPORTS
====================================================
${context.reports ? `
Reports: ${context.reports.reports_count}
Pending Reports: ${context.reports.pending_reports_count}
Failed Reports: ${context.reports.failed_reports_count}
${context.reports.reports_recent.length > 0 ? `
Recent Reports:
${context.reports.reports_recent.map((r) => `- ${r.title} (${r.status}, ${r.generated_at})${r.parcel_name ? `, Parcel ${r.parcel_name}` : ''}`).join('\n')}
${context.reports.reports_has_more ? `\n... and ${context.reports.reports_count - context.reports.reports_recent.length} more reports` : ''}
` : 'No recent reports.'}
` : 'No reports data available.'}

====================================================
MARKETPLACE
====================================================
${context.marketplace ? `
Listings: ${context.marketplace.listings_count} (Active: ${context.marketplace.active_listings_count})
Orders: ${context.marketplace.orders_count} (Pending: ${context.marketplace.pending_orders_count})
Quote Requests: ${context.marketplace.quote_requests_count}
${context.marketplace.listings_recent.length > 0 ? `
Recent Listings:
${context.marketplace.listings_recent.map((l) => `- ${l.title}: ${l.price} ${l.currency}, ${l.status}, Qty ${l.quantity_available}`).join('\n')}
${context.marketplace.listings_has_more ? `\n... and ${context.marketplace.listings_count - context.marketplace.listings_recent.length} more listings` : ''}
` : 'No recent listings.'}
${context.marketplace.orders_recent.length > 0 ? `
Recent Orders:
${context.marketplace.orders_recent.map((o) => `- ${o.id}: ${o.total_amount} ${o.currency}, ${o.status}, ${o.role}`).join('\n')}
${context.marketplace.orders_has_more ? `\n... and ${context.marketplace.orders_count - context.marketplace.orders_recent.length} more orders` : ''}
` : 'No recent orders.'}
${context.marketplace.quote_requests_recent.length > 0 ? `
Recent Quote Requests:
${context.marketplace.quote_requests_recent.map((q) => `- ${q.product_title}: ${q.status}, ${q.role}`).join('\n')}
${context.marketplace.quote_requests_has_more ? `\n... and ${context.marketplace.quote_requests_count - context.marketplace.quote_requests_recent.length} more quote requests` : ''}
` : 'No recent quote requests.'}
` : 'No marketplace data available.'}

====================================================
FRUIT TREES & ORCHARDS
====================================================
${context.orchards ? `
Orchard Assets: ${context.orchards.orchard_assets_count}
Tree Categories: ${context.orchards.tree_categories_count}
Trees: ${context.orchards.trees_count}
Pruning Tasks: ${context.orchards.pruning_tasks_count}
${context.orchards.orchard_assets_recent.length > 0 ? `
Recent Orchard Assets:
${context.orchards.orchard_assets_recent.map((a) => `- ${a.name} (${a.category}, ${a.status})${a.quantity ? `, Qty ${a.quantity}` : ''}${a.area_ha ? `, ${a.area_ha} ha` : ''}`).join('\n')}
${context.orchards.orchard_assets_has_more ? `\n... and ${context.orchards.orchard_assets_count - context.orchards.orchard_assets_recent.length} more orchard assets` : ''}
` : 'No orchard assets found.'}
${context.orchards.pruning_tasks_recent.length > 0 ? `
Pruning Tasks:
${context.orchards.pruning_tasks_recent.map((t) => `- ${t.title} (${t.status}${t.due_date ? `, due ${t.due_date}` : ''})`).join('\n')}
${context.orchards.pruning_tasks_has_more ? `\n... and ${context.orchards.pruning_tasks_count - context.orchards.pruning_tasks_recent.length} more pruning tasks` : ''}
` : 'No pruning tasks found.'}
` : 'No orchard data available.'}

====================================================
SATELLITE & WEATHER DATA
====================================================
${context.satelliteWeather ? `
Latest Satellite Indices (last 6 months):
${context.satelliteWeather.latest_indices.length > 0 ? context.satelliteWeather.latest_indices.slice(0, 10).map((idx) => `- ${idx.parcel_name} (${idx.date}): NDVI=${idx.ndvi?.toFixed(3) || 'N/A'}, NDMI=${idx.ndmi?.toFixed(3) || 'N/A'}, NDRE=${idx.ndre?.toFixed(3) || 'N/A'}, GCI=${idx.gci?.toFixed(3) || 'N/A'}, SAVI=${idx.savi?.toFixed(3) || 'N/A'}`).join('\n') : 'No satellite data available.'}

Vegetation Trends:
${context.satelliteWeather.trends.length > 0 ? context.satelliteWeather.trends.slice(0, 10).map((t) => `- ${t.parcel_name}: NDVI ${t.ndvi_trend} (${t.ndvi_change_percent > 0 ? '+' : ''}${t.ndvi_change_percent.toFixed(1)}%), NDMI ${t.ndmi_trend} (${t.ndmi_change_percent > 0 ? '+' : ''}${t.ndmi_change_percent.toFixed(1)}%)`).join('\n') : 'No trend data available.'}

Weather Summary: ${context.satelliteWeather.weather_summary ? `
Period: ${context.satelliteWeather.weather_summary.period_start} to ${context.satelliteWeather.weather_summary.period_end}
Avg Temp: ${context.satelliteWeather.weather_summary.avg_temp_min.toFixed(1)}°C - ${context.satelliteWeather.weather_summary.avg_temp_max.toFixed(1)}°C (mean: ${context.satelliteWeather.weather_summary.avg_temp_mean.toFixed(1)}°C)
Precipitation: ${context.satelliteWeather.weather_summary.precipitation_total.toFixed(1)} mm
Dry Spells: ${context.satelliteWeather.weather_summary.dry_spells_count}
Frost Days: ${context.satelliteWeather.weather_summary.frost_days}
` : 'Weather summary not available.'}

Weather Forecast (Next 5 Days):
${context.satelliteWeather.weather_forecast?.available && context.satelliteWeather.weather_forecast.parcels.length > 0 ? context.satelliteWeather.weather_forecast.parcels.map(p => `
**${p.parcel_name}** (Parcel ID: ${p.parcel_id}):
${p.forecasts.map((f, idx) => {
  const forecastDate = new Date(f.date);
  const today = new Date();
  const isTomorrow = forecastDate.toDateString() === new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString();
  const dayLabel = idx === 0 ? 'Today' : isTomorrow ? 'Tomorrow' : `Day ${idx + 1}`;
  return `  ${dayLabel} (${f.date}): ${f.temp.day}°C (${f.temp.min}-${f.temp.max}°C), ${f.description}, Precipitation: ${f.precipitation}mm${f.rainProbability !== undefined ? `, Rain probability: ${f.rainProbability}%` : ''}${f.humidity !== undefined ? `, Humidity: ${f.humidity}%` : ''}${f.windSpeed !== undefined ? `, Wind: ${f.windSpeed} km/h` : ''}`;
}).join('\n')}
`).join('\n') : `[No per-parcel forecast rows] ${this.weatherForecastUnavailableExplanation(context)}`}
` : 'No satellite/weather data available.'}

====================================================
SOIL, WATER & PLANT ANALYSIS
====================================================
${context.soilAnalysis ? `
Soil Analyses:
${context.soilAnalysis.soil_analyses.length > 0 ? context.soilAnalysis.soil_analyses.slice(0, 10).map((s) => `- ${s.parcel_name} (${s.analysis_date}): pH=${s.ph_level || 'N/A'}, OM=${s.organic_matter || 'N/A'}%, N=${s.nitrogen_ppm || 'N/A'} ppm, P=${s.phosphorus_ppm || 'N/A'} ppm, K=${s.potassium_ppm || 'N/A'} ppm, Texture=${s.texture || 'N/A'}`).join('\n') : 'No soil analysis data available.'}

Water Analyses:
${context.soilAnalysis.water_analyses.length > 0 ? context.soilAnalysis.water_analyses.slice(0, 10).map((w) => `- ${w.parcel_name} (${w.analysis_date}): pH=${w.ph || 'N/A'}, EC=${w.ec || 'N/A'} dS/m, TDS=${w.tds || 'N/A'} ppm`).join('\n') : 'No water analysis data available.'}

Plant Analyses:
${context.soilAnalysis.plant_analyses.length > 0 ? context.soilAnalysis.plant_analyses.slice(0, 10).map((p) => `- ${p.parcel_name} (${p.analysis_date}): N=${p.nitrogen_percent || 'N/A'}%, P=${p.phosphorus_percent || 'N/A'}%, K=${p.potassium_percent || 'N/A'}%`).join('\n') : 'No plant analysis data available.'}
` : 'No analysis data available.'}

====================================================
PRODUCTION INTELLIGENCE
====================================================
${context.productionIntelligence ? `
Active Performance Alerts:
${context.productionIntelligence.active_alerts.length > 0 ? context.productionIntelligence.active_alerts.slice(0, 10).map((a) => `- [${a.severity.toUpperCase()}] ${a.title}${a.parcel_name ? ` (${a.parcel_name})` : ''}: ${a.message}${a.variance_percent !== null && a.variance_percent !== undefined ? ` (Variance: ${a.variance_percent > 0 ? '+' : ''}${a.variance_percent.toFixed(1)}%)` : ''}${a.recommended_actions && a.recommended_actions.length > 0 ? `\n  Recommended: ${a.recommended_actions.join(', ')}` : ''}`).join('\n') : 'No active alerts.'}

Upcoming Harvest Forecasts:
${context.productionIntelligence.upcoming_forecasts.length > 0 ? context.productionIntelligence.upcoming_forecasts.slice(0, 10).map((f) => `- ${f.parcel_name} (${f.crop_type}): ${f.forecast_harvest_date_start} to ${f.forecast_harvest_date_end}, Expected yield: ${f.predicted_yield_quantity} (confidence: ${f.confidence_level})${f.predicted_revenue ? `, Revenue: ${f.predicted_revenue}` : ''}`).join('\n') : 'No upcoming forecasts.'}

Yield Benchmarks:
${context.productionIntelligence.yield_benchmarks.length > 0 ? context.productionIntelligence.yield_benchmarks.slice(0, 10).map((b) => `- ${b.crop_type}: Target ${b.target_yield_per_hectare} kg/ha${b.actual_avg_yield ? `, Actual avg: ${b.actual_avg_yield} kg/ha${b.variance_percent !== null ? ` (${b.variance_percent > 0 ? '+' : ''}${b.variance_percent.toFixed(1)}%)` : ''}` : ''}`).join('\n') : 'No benchmarks available.'}
` : 'No production intelligence data available.'}

====================================================
WORKFORCE DATA
====================================================
${context.workers ? `
Active Workers: ${context.workers.active_workers_count}
${context.workers.workers_recent.map((w) => `- ${w.name} (${w.type})`).join('\n')}
${context.workers.workers_has_more ? `\n... and ${context.workers.workers_count - context.workers.workers_recent.length} more workers` : ''}

Pending Tasks: ${context.workers.pending_tasks_count}
${context.workers.tasks_recent.map((t) => `- ${t.title}: ${t.status}`).join('\n')}
${context.workers.tasks_has_more ? `\n... and ${context.workers.pending_tasks_count - context.workers.tasks_recent.length} more tasks` : ''}

Recent Work Records (last 30 days): ${context.workers.recent_work_records_count}
${context.workers.work_records_recent.length > 0 ? `\n${context.workers.work_records_recent.map((r) => `- ${r.work_date}: ${r.amount_paid} (${r.status})`).join('\n')}` : ''}
` : 'No workforce data available.'}

====================================================
ACCOUNTING DATA
====================================================
${context.accounting ? `
Chart of Accounts: ${context.accounting.accounts_count} accounts

Recent Invoices (last 90 days): ${context.accounting.recent_invoices_count}
${context.accounting.invoices_recent.map((i) => `- ${i.number} (${i.type}): ${i.status} - ${i.total} ${i.date}`).join('\n')}
${context.accounting.invoices_has_more ? `\n... and ${context.accounting.recent_invoices_count - context.accounting.invoices_recent.length} more invoices` : ''}

Recent Payments (last 30 days): ${context.accounting.recent_payments_count}
${context.accounting.payments_recent.map((p) => `- ${p.date}: ${p.amount} (${p.method})`).join('\n')}
${context.accounting.payments_has_more ? `\n... and ${context.accounting.recent_payments_count - context.accounting.payments_recent.length} more payments` : ''}

Fiscal Year: ${context.accounting.current_fiscal_year?.name || 'Not set'}

Financial Summary (Last 30 Days):
- Total Revenue: ${context.accounting.total_revenue_30d?.toFixed(2) || '0.00'} ${context.organization.currency}
- Total Expenses: ${context.accounting.total_expenses_30d?.toFixed(2) || '0.00'} ${context.organization.currency}
- Net Profit: ${((context.accounting.total_revenue_30d || 0) - (context.accounting.total_expenses_30d || 0)).toFixed(2)} ${context.organization.currency}
` : 'No accounting data available.'}

====================================================
INVENTORY DATA
====================================================
${context.inventory ? `
Total Items with Stock: ${context.inventory.items_count}
Total Inventory Value: ${context.inventory.total_inventory_value.toFixed(2)}

${context.inventory.low_stock_count > 0 ? `⚠️ LOW STOCK ALERT: ${context.inventory.low_stock_count} item(s) below minimum level!
${context.inventory.low_stock_items_recent.map((i) => `- ${i.name} (${i.code}): ${i.current_stock} ${i.unit} (MIN: ${i.minimum_level} ${i.unit}) - SHORTAGE: ${i.shortage.toFixed(2)} ${i.unit}`).join('\n')}
${context.inventory.low_stock_items_has_more ? `\n... and ${context.inventory.low_stock_count - context.inventory.low_stock_items_recent.length} more low stock items` : ''}
` : 'All items are at or above minimum stock levels.'}

Stock Levels by Item:
${context.inventory.items_recent.map((i) => `- ${i.name} (${i.code}): ${i.stock.toFixed(2)} ${i.unit}${i.minimum_stock_level ? ` (min: ${i.minimum_stock_level})` : ''}${i.is_low_stock ? ' ⚠️ LOW' : ''}${i.total_value ? ` - Value: ${i.total_value.toFixed(2)}` : ''}`).join('\n')}
${context.inventory.items_has_more ? `\n... and ${context.inventory.items_count - context.inventory.items_recent.length} more items` : ''}

Warehouses: ${context.inventory.warehouses_count}
${context.inventory.warehouses_recent.map((w) => `- ${w.name}${w.farm_name ? ` (Farm: ${w.farm_name})` : ''} - ${w.location}`).join('\n')}
${context.inventory.warehouses_has_more ? `\n... and ${context.inventory.warehouses_count - context.inventory.warehouses_recent.length} more warehouses` : ''}

Recent Stock Movements (last 30 days): ${context.inventory.recent_stock_movements_count}
` : 'No inventory data available.'}

====================================================
PRODUCTION DATA
====================================================
${context.production ? `
Recent Harvests (last 365 days): ${context.production.recent_harvests_count}
${context.production.harvests_recent.map((h) => `- ${h.date}: ${h.crop} - ${h.quantity} (Grade: ${h.quality}, Status: ${h.status})${h.parcel_name ? ` [${h.parcel_name}]` : ''}${h.lot_number ? ` Lot: ${h.lot_number}` : ''}`).join('\n')}
${context.production.harvests_has_more ? `\n... and ${context.production.recent_harvests_count - context.production.harvests_recent.length} more harvests` : ''}

Recent Quality Checks (last 90 days): ${context.production.recent_quality_checks_count}
Recent Deliveries (last 90 days): ${context.production.recent_deliveries_count}
` : 'No production data available.'}

====================================================
SUPPLIERS & CUSTOMERS DATA
====================================================
${context.suppliersCustomers ? `
Suppliers: ${context.suppliersCustomers.suppliers_count}
${context.suppliersCustomers.suppliers_recent.map((s) => `- ${s.name} (${s.type})`).join('\n')}
${context.suppliersCustomers.suppliers_has_more ? `\n... and ${context.suppliersCustomers.suppliers_count - context.suppliersCustomers.suppliers_recent.length} more` : ''}

Customers: ${context.suppliersCustomers.customers_count}
${context.suppliersCustomers.customers_recent.map((c) => `- ${c.name} (${c.type})`).join('\n')}
${context.suppliersCustomers.customers_has_more ? `\n... and ${context.suppliersCustomers.customers_count - context.suppliersCustomers.customers_recent.length} more` : ''}

Pending Sales Orders: ${context.suppliersCustomers.pending_sales_orders_count}
${context.suppliersCustomers.sales_orders_recent.map((o) => `- ${o.number}: ${o.total} (${o.status})`).join('\n')}
${context.suppliersCustomers.sales_orders_has_more ? `\n... and ${context.suppliersCustomers.pending_sales_orders_count - context.suppliersCustomers.sales_orders_recent.length} more sales orders` : ''}

Pending Purchase Orders: ${context.suppliersCustomers.pending_purchase_orders_count}
${context.suppliersCustomers.purchase_orders_recent.map((o) => `- ${o.number}: ${o.total} (${o.status})`).join('\n')}
${context.suppliersCustomers.purchase_orders_has_more ? `\n... and ${context.suppliersCustomers.pending_purchase_orders_count - context.suppliersCustomers.purchase_orders_recent.length} more purchase orders` : ''}
` : 'No supplier/customer data available.'}

${context.agromindiaIntel && context.agromindiaIntel.length > 0 ? `
====================================================
AGROMINDIA INTELLIGENCE (COMPUTED — USE THIS DATA)
====================================================
⚠️ The following is pre-computed intelligence from AgromindIA. Use it directly — do NOT reinvent analysis from raw data, do NOT add field prescriptions beyond what is stated here.

${context.agromindiaIntel.map((p: any) => `
--- ${p.parcel_name} (${p.crop_type || 'unknown crop'}) ---

${p.diagnostics ? `Diagnostic: Scenario ${p.diagnostics.scenario_code} — ${p.diagnostics.scenario} (confidence: ${(p.diagnostics.confidence * 100).toFixed(0)}%)
  NDVI band: ${p.diagnostics.indicators.ndvi_band}, trend: ${p.diagnostics.indicators.ndvi_trend}
  NDRE status: ${p.diagnostics.indicators.ndre_status}, NDMI trend: ${p.diagnostics.indicators.ndmi_trend}
  Water balance: ${p.diagnostics.indicators.water_balance ?? 'N/A'}, Weather anomaly: ${p.diagnostics.indicators.weather_anomaly ? 'YES' : 'No'}
` : 'No diagnostic data available.'}

${p.calibration ? `Calibration: ${p.calibration.zone_classification || 'N/A'} zone, confidence ${(p.calibration.confidence_score * 100).toFixed(0)}%
  Baselines — baseline NDVI: ${p.calibration.baseline_ndvi ?? 'N/A'}, NDRE: ${p.calibration.baseline_ndre ?? 'N/A'}, NDMI: ${p.calibration.baseline_ndmi ?? 'N/A'}
` : 'No calibration data.'}

${p.recommendations.length > 0 ? `Validated Agromind recommendations (user-approved in app):
${p.recommendations.map((r: any) => `  [${(r.priority || 'medium').toUpperCase()}] ${r.constat || 'N/A'} → ${r.action || 'N/A'}`).join('\n')}
` : 'No validated Agromind recommendations in context (pending AI suggestions are not loaded here — user must validate them in the app).'}

${p.annual_plan ? `Validated / active Agromind annual plan only (${p.annual_plan.status}) — NOT draft, NOT ad-hoc workforce tasks: ${p.annual_plan.plan_summary.executed}/${p.annual_plan.plan_summary.total} executed, ${p.annual_plan.plan_summary.planned} planned, ${p.annual_plan.plan_summary.skipped} skipped
${p.annual_plan.overdue_interventions.length > 0 ? `⚠️ OVERDUE:\n${p.annual_plan.overdue_interventions.map((i: any) => `  - Month ${i.month}${i.week ? ` Wk${i.week}` : ''}: ${i.intervention_type} — ${i.description}${i.product ? ` (${i.product}${i.dose ? `, ${i.dose}` : ''})` : ''}`).join('\n')}
` : ''}${p.annual_plan.upcoming_interventions.length > 0 ? `Upcoming:\n${p.annual_plan.upcoming_interventions.map((i: any) => `  - Month ${i.month}${i.week ? ` Wk${i.week}` : ''}: ${i.intervention_type} — ${i.description}${i.product ? ` (${i.product}${i.dose ? `, ${i.dose}` : ''})` : ''}`).join('\n')}
` : ''}` : 'No validated/active Agromind annual plan in context — direct the user to validate the Agromind calendar in the app; do not substitute worker tasks or a draft plan.'}

${p.referential ? `Referential Data:
${p.referential.npk_formulas?.length > 0 ? `  NPK Formulas: ${JSON.stringify(p.referential.npk_formulas).slice(0, 300)}` : ''}
${p.referential.known_alerts?.length > 0 ? `  Known Alerts: ${JSON.stringify(p.referential.known_alerts).slice(0, 300)}` : ''}
` : ''}
`).join('\n')}
` : ''}
====================================================
YOUR RESPONSE
====================================================
Based on the above context, current date (${context.currentDate}), season (${context.currentSeason}), and the user's question, provide a helpful, accurate response with expert agricultural insights. 

**CRITICAL INSTRUCTIONS:**
${(!context.farms || context.farms.farms_count === 0) ? `
⚠️ THIS USER HAS NO FARM DATA. You MUST:
1. **Answer directly and concisely first** - If they ask "list farms", say "You have 0 farms registered" or "No farms found"
2. **Don't write long paragraphs** - Keep responses brief unless they ask for details
3. **Don't repeat yourself** - If you've already explained something, don't explain it again
4. **Be helpful but concise** - One sentence about how to add data is enough (e.g., "You can add farms through the Farm Management module")
5. **Only provide detailed guidance if they explicitly ask for it** - Don't assume they want a full tutorial
6. Answer their questions directly - if they ask "list farms", list them (or say there are none), don't write an essay
` : `
For parcel-level agronomy in this chat:
- Summarize only AgromindIA context (diagnostics, validated recommendations, validated plan, calibration) — **no new operational programs**
- Reference specific data points (parcel names, dates, values) when present
- If Agromind data is missing, direct the user to **Calibration** and **annual plan validation** in the app instead of inventing mitigation plans
- Do not present workforce tasks as the Agromind calendar
`}

**REMEMBER: Users want quick, direct answers. Be concise unless they ask for details.**`;
  }

}
