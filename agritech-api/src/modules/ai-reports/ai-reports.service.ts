import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import {
  AIProvider,
  AggregatedParcelData,
  AIReportSections,
  AIProviderConfig,
  IAIProvider,
} from './interfaces';
import { GenerateAIReportDto, AIProviderInfoDto } from './dto';
import {
  AGRICULTURAL_EXPERT_SYSTEM_PROMPT,
  buildUserPrompt,
} from './prompts/agricultural-expert.prompt';

@Injectable()
export class AIReportsService {
  private readonly logger = new Logger(AIReportsService.name);
  private readonly providers: Map<AIProvider, IAIProvider>;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly openaiProvider: OpenAIProvider,
    private readonly geminiProvider: GeminiProvider,
  ) {
    this.providers = new Map<AIProvider, IAIProvider>();
    this.providers.set(AIProvider.OPENAI, openaiProvider);
    this.providers.set(AIProvider.GEMINI, geminiProvider);
  }

  async generateReport(organizationId: string, userId: string, dto: GenerateAIReportDto) {
    this.logger.log(
      `Generating AI report for parcel ${dto.parcel_id} using ${dto.provider}`,
    );

    // 1. Validate provider configuration
    const provider = this.providers.get(dto.provider);
    if (!provider || !provider.validateConfig()) {
      throw new BadRequestException(
        `AI provider ${dto.provider} is not configured. Please contact your administrator.`,
      );
    }

    // 2. Aggregate all data sources
    const aggregatedData = await this.aggregateParcelData(
      organizationId,
      dto.parcel_id,
      dto.data_start_date,
      dto.data_end_date,
    );

    // 3. Build prompts
    const systemPrompt = AGRICULTURAL_EXPERT_SYSTEM_PROMPT;
    const userPrompt = buildUserPrompt(aggregatedData, dto.language || 'fr');

    // 4. Generate AI response
    const config: AIProviderConfig = {
      provider: dto.provider,
      model: dto.model,
      temperature: 0.7,
      maxTokens: 4096,
    };

    try {
      const response = await provider.generate({
        systemPrompt,
        userPrompt,
        config,
      });

      // 5. Parse and validate response
      const reportSections = this.parseAIResponse(response.content);

      // 6. Store the generated report
      const storedReport = await this.storeReport(
        organizationId,
        userId,
        dto.parcel_id,
        dto.provider,
        reportSections,
        aggregatedData,
      );

      return {
        success: true,
        report: storedReport,
        sections: reportSections,
        metadata: {
          provider: response.provider,
          model: response.model,
          tokensUsed: response.tokensUsed,
          generatedAt: response.generatedAt,
          dataRange: {
            start: dto.data_start_date,
            end: dto.data_end_date,
          },
        },
      };
    } catch (error) {
      this.logger.error(`AI generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to generate AI report: ${error.message}`,
      );
    }
  }

  async getAvailableProviders(): Promise<AIProviderInfoDto[]> {
    return [
      {
        provider: AIProvider.OPENAI,
        available: this.providers.get(AIProvider.OPENAI)?.validateConfig() || false,
        name: 'ChatGPT (OpenAI)',
      },
      {
        provider: AIProvider.GEMINI,
        available: this.providers.get(AIProvider.GEMINI)?.validateConfig() || false,
        name: 'Gemini (Google)',
      },
    ];
  }

  private async aggregateParcelData(
    organizationId: string,
    parcelId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AggregatedParcelData> {
    const supabase = this.databaseService.getAdminClient();
    const now = new Date();
    const defaultEndDate = endDate || now.toISOString().split('T')[0];
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const defaultStartDate = startDate || sixMonthsAgo.toISOString().split('T')[0];

    // Fetch parcel info with farm
    const { data: parcel, error: parcelError } = await supabase
      .from('parcels')
      .select(
        `
        id, name, area, area_unit, soil_type, irrigation_type,
        crop_type, tree_type, tree_count, planting_year, variety, rootstock,
        boundary,
        farms!inner(id, organization_id)
      `,
      )
      .eq('id', parcelId)
      .single();

    if (parcelError || !parcel) {
      this.logger.error(`Parcel fetch error: ${parcelError?.message}`);
      throw new BadRequestException('Parcel not found');
    }

    // Verify organization access
    if ((parcel as any).farms?.organization_id !== organizationId) {
      throw new BadRequestException('Access denied to this parcel');
    }

    // Fetch latest soil analysis
    const { data: soilAnalyses } = await supabase
      .from('analyses')
      .select('*')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'soil')
      .order('analysis_date', { ascending: false })
      .limit(1);

    // Fetch latest water analysis
    const { data: waterAnalyses } = await supabase
      .from('analyses')
      .select('*')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'water')
      .order('analysis_date', { ascending: false })
      .limit(1);

    // Fetch latest plant analysis
    const { data: plantAnalyses } = await supabase
      .from('analyses')
      .select('*')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'plant')
      .order('analysis_date', { ascending: false })
      .limit(1);

    // Fetch satellite indices
    const { data: satelliteData } = await supabase
      .from('satellite_indices_data')
      .select('*')
      .eq('parcel_id', parcelId)
      .gte('date', defaultStartDate)
      .lte('date', defaultEndDate)
      .order('date', { ascending: true });

    // Build aggregated response
    return this.buildAggregatedData(
      parcel,
      soilAnalyses?.[0],
      waterAnalyses?.[0],
      plantAnalyses?.[0],
      satelliteData || [],
      defaultStartDate,
      defaultEndDate,
    );
  }

  private buildAggregatedData(
    parcel: any,
    soilAnalysis: any,
    waterAnalysis: any,
    plantAnalysis: any,
    satelliteData: any[],
    startDate: string,
    endDate: string,
  ): AggregatedParcelData {
    // Process satellite data trends
    const ndviSeries = satelliteData.filter((d) => d.index_name === 'NDVI');
    const ndmiSeries = satelliteData.filter((d) => d.index_name === 'NDMI');

    const calculateTrend = (series: any[]) => {
      if (series.length < 2)
        return { direction: 'stable' as const, changePercent: 0 };
      const first = series[0]?.mean_value || 0;
      const last = series[series.length - 1]?.mean_value || 0;
      const change = first !== 0 ? ((last - first) / first) * 100 : 0;
      return {
        direction:
          change > 5
            ? ('increasing' as const)
            : change < -5
              ? ('decreasing' as const)
              : ('stable' as const),
        changePercent: change,
      };
    };

    // Get latest values for each index
    const latestByIndex: Record<string, { date: string; index_name: string; mean_value: number }> = {};
    for (const curr of satelliteData) {
      if (!latestByIndex[curr.index_name] || curr.date > latestByIndex[curr.index_name].date) {
        latestByIndex[curr.index_name] = curr;
      }
    }

    // Extract soil data from JSONB
    const soilData = soilAnalysis?.data || {};

    // Extract water data from JSONB
    const waterData = waterAnalysis?.data || {};

    // Extract plant data from JSONB
    const plantData = plantAnalysis?.data || {};

    return {
      parcel: {
        id: parcel.id,
        name: parcel.name,
        area: parcel.area || 0,
        areaUnit: parcel.area_unit || 'ha',
        soilType: parcel.soil_type,
        irrigationType: parcel.irrigation_type,
        cropType: parcel.crop_type,
        treeType: parcel.tree_type,
        treeCount: parcel.tree_count,
        plantingYear: parcel.planting_year,
        variety: parcel.variety,
        rootstock: parcel.rootstock,
      },
      soilAnalysis: soilAnalysis
        ? {
            latestDate: soilAnalysis.analysis_date,
            phLevel: soilData.ph_level,
            organicMatter: soilData.organic_matter_percentage,
            nitrogenPpm: soilData.nitrogen_ppm,
            phosphorusPpm: soilData.phosphorus_ppm,
            potassiumPpm: soilData.potassium_ppm,
            texture: soilData.texture,
            cec: soilData.cec_meq_per_100g,
            ec: soilData.salinity_level,
            calcium: soilData.calcium_ppm,
            magnesium: soilData.magnesium_ppm,
            sulfur: soilData.sulfur_ppm,
            iron: soilData.iron_ppm,
            zinc: soilData.zinc_ppm,
            manganese: soilData.manganese_ppm,
            copper: soilData.copper_ppm,
            boron: soilData.boron_ppm,
          }
        : undefined,
      waterAnalysis: waterAnalysis
        ? {
            latestDate: waterAnalysis.analysis_date,
            ph: waterData.ph_level,
            ec: waterData.ec_ds_per_m,
            tds: waterData.tds_ppm,
            nitrates: waterData.nitrate_ppm,
            chlorides: waterData.chloride_ppm,
            hardness: waterData.hardness_ppm,
            sar: waterData.sar,
          }
        : undefined,
      plantAnalysis: plantAnalysis
        ? {
            latestDate: plantAnalysis.analysis_date,
            nitrogenPercent: plantData.nitrogen_percent,
            phosphorusPercent: plantData.phosphorus_percent,
            potassiumPercent: plantData.potassium_percent,
            chlorophyllIndex: plantData.chlorophyll_index,
          }
        : undefined,
      satelliteIndices: {
        period: { start: startDate, end: endDate },
        latestData: {
          date: Object.values(latestByIndex)[0]?.date || endDate,
          ndvi: latestByIndex['NDVI']?.mean_value,
          ndmi: latestByIndex['NDMI']?.mean_value,
          ndre: latestByIndex['NDRE']?.mean_value,
          gci: latestByIndex['GCI']?.mean_value,
          savi: latestByIndex['SAVI']?.mean_value,
        },
        trends: {
          ndvi: calculateTrend(ndviSeries),
          ndmi: calculateTrend(ndmiSeries),
        },
        timeSeries: satelliteData
          .filter((d) => d.index_name === 'NDVI' || d.index_name === 'NDMI')
          .reduce(
            (acc, d) => {
              const existing = acc.find((item) => item.date === d.date);
              if (existing) {
                existing[d.index_name.toLowerCase()] = d.mean_value;
              } else {
                acc.push({
                  date: d.date,
                  [d.index_name.toLowerCase()]: d.mean_value,
                });
              }
              return acc;
            },
            [] as Array<{ date: string; ndvi?: number; ndmi?: number }>,
          ),
      },
      weather: {
        // Weather data would come from weatherClimateService
        // For now, using placeholder values that will be enhanced later
        period: { start: startDate, end: endDate },
        temperatureSummary: {
          avgMin: 10,
          avgMax: 25,
          avgMean: 17.5,
        },
        precipitationTotal: 150,
        drySpellsCount: 2,
        frostDays: 0,
      },
    };
  }

  private parseAIResponse(content: string): AIReportSections {
    try {
      // Extract JSON from response (handle markdown code blocks if present)
      let jsonStr = content;

      // Check for markdown code blocks
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/```\s*([\s\S]*?)\s*```/);

      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // Try to find JSON object directly
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonStr = objectMatch[0];
        }
      }

      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (!parsed.executiveSummary || !parsed.healthAssessment) {
        throw new Error('Missing required fields in AI response');
      }

      return parsed as AIReportSections;
    } catch (error) {
      this.logger.error(
        `Failed to parse AI response: ${error.message}`,
        content.substring(0, 500),
      );
      throw new InternalServerErrorException(
        'Invalid AI response format. Please try again.',
      );
    }
  }

  private async storeReport(
    organizationId: string,
    userId: string,
    parcelId: string,
    provider: AIProvider,
    sections: AIReportSections,
    aggregatedData: AggregatedParcelData,
  ) {
    const supabase = this.databaseService.getAdminClient();
    const now = new Date();

    const { data, error } = await supabase
      .from('parcel_reports')
      .insert({
        parcel_id: parcelId,
        template_id: 'ai-generated',
        title: `Rapport IA - ${aggregatedData.parcel.name} - ${now.toLocaleDateString('fr-FR')}`,
        status: 'completed',
        generated_at: now.toISOString(),
        generated_by: userId,
        metadata: {
          type: 'ai_report',
          provider,
          sections,
          health_score: sections.healthAssessment.overallScore,
          recommendations_count: sections.recommendations.length,
          risk_alerts_count: sections.riskAlerts.length,
          data_snapshot: {
            parcel: aggregatedData.parcel,
            satellite_period: aggregatedData.satelliteIndices.period,
            has_soil_analysis: !!aggregatedData.soilAnalysis,
            has_water_analysis: !!aggregatedData.waterAnalysis,
            has_plant_analysis: !!aggregatedData.plantAnalysis,
          },
        },
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to store report: ${error.message}`);
      throw new InternalServerErrorException('Failed to save report');
    }

    return data;
  }
}
