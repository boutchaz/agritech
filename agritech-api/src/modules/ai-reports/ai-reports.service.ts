import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
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
import { OrganizationAISettingsService } from '../organization-ai-settings/organization-ai-settings.service';
import { AIProviderType } from '../organization-ai-settings/dto';

@Injectable()
export class AIReportsService {
  private readonly logger = new Logger(AIReportsService.name);
  private readonly providers: Map<AIProvider, IAIProvider>;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly openaiProvider: OpenAIProvider,
    private readonly geminiProvider: GeminiProvider,
    private readonly groqProvider: GroqProvider,
    @Inject(forwardRef(() => OrganizationAISettingsService))
    private readonly aiSettingsService: OrganizationAISettingsService,
  ) {
    this.providers = new Map<AIProvider, IAIProvider>();
    this.providers.set(AIProvider.OPENAI, openaiProvider);
    this.providers.set(AIProvider.GEMINI, geminiProvider);
    this.providers.set(AIProvider.GROQ, groqProvider);
  }

  async generateReport(organizationId: string, userId: string, dto: GenerateAIReportDto) {
    this.logger.log(
      `Generating AI report for parcel ${dto.parcel_id} using ${dto.provider}`,
    );

    // 1. Get API key from organization settings
    const providerType = dto.provider as unknown as AIProviderType;
    const apiKey = await this.aiSettingsService.getDecryptedApiKey(
      organizationId,
      providerType,
    );

    // Fallback to environment variable if not configured in DB
    let envApiKey: string | undefined;
    switch (dto.provider) {
      case AIProvider.OPENAI:
        envApiKey = this.configService.get<string>('OPENAI_API_KEY');
        break;
      case AIProvider.GEMINI:
        envApiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
        break;
      case AIProvider.GROQ:
        envApiKey = this.configService.get<string>('GROQ_API_KEY');
        break;
    }

    const effectiveApiKey = apiKey || envApiKey;

    if (!effectiveApiKey) {
      throw new BadRequestException(
        `AI provider ${dto.provider} is not configured. Please configure it in your organization settings.`,
      );
    }

    // 2. Get the provider and set the API key dynamically
    const provider = this.providers.get(dto.provider);
    if (!provider) {
      throw new BadRequestException(`Unknown AI provider: ${dto.provider}`);
    }

    // Set the API key on the provider for this request
    provider.setApiKey(effectiveApiKey);

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

  async getDataAvailability(
    organizationId: string,
    parcelId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const supabase = this.databaseService.getAdminClient();
    const now = new Date();
    const defaultEndDate = endDate || now.toISOString().split('T')[0];
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const defaultStartDate = startDate || sixMonthsAgo.toISOString().split('T')[0];

    const { data: parcel, error: parcelError } = await supabase
      .from('parcels')
      .select(`
        id, name, boundary,
        farms!inner(id, organization_id)
      `)
      .eq('id', parcelId)
      .single();

    if (parcelError || !parcel) {
      throw new BadRequestException('Parcel not found');
    }

    const parcelFarms = parcel.farms as unknown as { organization_id: string }[];
    if (!parcelFarms?.[0] || parcelFarms[0].organization_id !== organizationId) {
      throw new BadRequestException('Access denied to this parcel');
    }

    const { data: satelliteData, count: satelliteCount } = await supabase
      .from('satellite_indices_data')
      .select('date, index_name', { count: 'exact' })
      .eq('parcel_id', parcelId)
      .gte('date', defaultStartDate)
      .lte('date', defaultEndDate)
      .order('date', { ascending: true });

    const satelliteDates = satelliteData?.map((d) => d.date) || [];
    const uniqueIndices = [...new Set(satelliteData?.map((d) => d.index_name) || [])];

    const { data: soilAnalysis } = await supabase
      .from('analyses')
      .select('id, analysis_date')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'soil')
      .order('analysis_date', { ascending: false })
      .limit(1);

    const { data: waterAnalysis } = await supabase
      .from('analyses')
      .select('id, analysis_date')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'water')
      .order('analysis_date', { ascending: false })
      .limit(1);

    const { data: plantAnalysis } = await supabase
      .from('analyses')
      .select('id, analysis_date')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'plant')
      .order('analysis_date', { ascending: false })
      .limit(1);

    const hasBoundary = !!(parcel.boundary && Array.isArray(parcel.boundary) && parcel.boundary.length > 0);

    return {
      parcel: {
        id: parcel.id,
        name: parcel.name,
        hasBoundary,
      },
      satellite: {
        available: (satelliteCount || 0) > 0,
        dataPoints: satelliteCount || 0,
        indices: uniqueIndices,
        dateRange: satelliteDates.length > 0
          ? {
              earliest: satelliteDates[0],
              latest: satelliteDates[satelliteDates.length - 1],
            }
          : null,
      },
      soil: {
        available: !!(soilAnalysis && soilAnalysis.length > 0),
        lastAnalysisDate: soilAnalysis?.[0]?.analysis_date || null,
      },
      water: {
        available: !!(waterAnalysis && waterAnalysis.length > 0),
        lastAnalysisDate: waterAnalysis?.[0]?.analysis_date || null,
      },
      plant: {
        available: !!(plantAnalysis && plantAnalysis.length > 0),
        lastAnalysisDate: plantAnalysis?.[0]?.analysis_date || null,
      },
      weather: {
        available: hasBoundary,
      },
      period: {
        start: defaultStartDate,
        end: defaultEndDate,
      },
    };
  }

  async getAvailableProviders(organizationId?: string): Promise<AIProviderInfoDto[]> {
    // Check organization-specific settings if organizationId is provided
    let orgSettings: Map<string, boolean> = new Map();

    if (organizationId) {
      try {
        const settings = await this.aiSettingsService.getProviderSettings(organizationId);
        settings.forEach((s) => {
          orgSettings.set(s.provider, s.configured && s.enabled);
        });
      } catch (error) {
        this.logger.warn(`Failed to fetch org AI settings: ${error.message}`);
      }
    }

    // Check if provider is available either from org settings or env vars
    const openaiAvailable =
      orgSettings.get(AIProviderType.OPENAI) ||
      this.providers.get(AIProvider.OPENAI)?.validateConfig() ||
      false;

    const geminiAvailable =
      orgSettings.get(AIProviderType.GEMINI) ||
      this.providers.get(AIProvider.GEMINI)?.validateConfig() ||
      false;

    const groqAvailable =
      orgSettings.get(AIProviderType.GROQ) ||
      this.providers.get(AIProvider.GROQ)?.validateConfig() ||
      false;

    return [
      {
        provider: AIProvider.OPENAI,
        available: openaiAvailable,
        name: 'ChatGPT (OpenAI)',
      },
      {
        provider: AIProvider.GEMINI,
        available: geminiAvailable,
        name: 'Gemini (Google)',
      },
      {
        provider: AIProvider.GROQ,
        available: groqAvailable,
        name: 'Groq (LLaMA)',
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

  private async buildAggregatedData(
    parcel: any,
    soilAnalysis: any,
    waterAnalysis: any,
    plantAnalysis: any,
    satelliteData: any[],
    startDate: string,
    endDate: string,
  ): Promise<AggregatedParcelData> {
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
      weather: await this.fetchWeatherData(parcel.boundary, startDate, endDate),
    };
  }

  private async fetchWeatherData(
    boundary: any,
    startDate: string,
    endDate: string,
  ): Promise<{
    period: { start: string; end: string };
    temperatureSummary: { avgMin: number; avgMax: number; avgMean: number };
    precipitationTotal: number;
    drySpellsCount: number;
    frostDays: number;
  }> {
    try {
      if (!boundary || !Array.isArray(boundary) || boundary.length === 0) {
        this.logger.warn('No parcel boundary available for weather data');
        return this.getDefaultWeatherData(startDate, endDate);
      }

      // Calculate centroid from boundary
      let sumLat = 0;
      let sumLon = 0;
      const coords = boundary as number[][];

      // Check if coordinates are in Web Mercator and convert to WGS84
      const firstCoord = coords[0];
      const isWebMercator = Math.abs(firstCoord[0]) > 180 || Math.abs(firstCoord[1]) > 90;

      coords.forEach(([x, y]) => {
        if (isWebMercator) {
          const lon = (x / 20037508.34) * 180;
          const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
          sumLon += lon;
          sumLat += lat;
        } else {
          sumLon += x;
          sumLat += y;
        }
      });

      const latitude = sumLat / coords.length;
      const longitude = sumLon / coords.length;

      // Fetch weather data from Open-Meteo Archive API
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        start_date: startDate,
        end_date: endDate,
        daily: 'temperature_2m_min,temperature_2m_mean,temperature_2m_max,precipitation_sum',
        timezone: 'auto',
      });

      const response = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?${params}`,
      );

      if (!response.ok) {
        this.logger.warn(`Open-Meteo API error: ${response.statusText}`);
        return this.getDefaultWeatherData(startDate, endDate);
      }

      const data = await response.json();

      if (!data.daily || !data.daily.time) {
        return this.getDefaultWeatherData(startDate, endDate);
      }

      // Calculate summary statistics
      const temps_min = data.daily.temperature_2m_min.filter((t: number) => t !== null);
      const temps_max = data.daily.temperature_2m_max.filter((t: number) => t !== null);
      const temps_mean = data.daily.temperature_2m_mean.filter((t: number) => t !== null);
      const precips = data.daily.precipitation_sum.filter((p: number) => p !== null);

      const avgMin = temps_min.length > 0 
        ? temps_min.reduce((a: number, b: number) => a + b, 0) / temps_min.length 
        : 0;
      const avgMax = temps_max.length > 0 
        ? temps_max.reduce((a: number, b: number) => a + b, 0) / temps_max.length 
        : 0;
      const avgMean = temps_mean.length > 0 
        ? temps_mean.reduce((a: number, b: number) => a + b, 0) / temps_mean.length 
        : 0;
      const precipitationTotal = precips.reduce((a: number, b: number) => a + b, 0);

      // Count dry spells (5+ consecutive days with < 1mm)
      let drySpellsCount = 0;
      let consecutiveDryDays = 0;
      for (const precip of data.daily.precipitation_sum) {
        if (precip !== null && precip < 1) {
          consecutiveDryDays++;
          if (consecutiveDryDays === 5) {
            drySpellsCount++;
          }
        } else {
          consecutiveDryDays = 0;
        }
      }

      // Count frost days (min temp < 0)
      const frostDays = temps_min.filter((t: number) => t < 0).length;

      return {
        period: { start: startDate, end: endDate },
        temperatureSummary: {
          avgMin: Math.round(avgMin * 10) / 10,
          avgMax: Math.round(avgMax * 10) / 10,
          avgMean: Math.round(avgMean * 10) / 10,
        },
        precipitationTotal: Math.round(precipitationTotal),
        drySpellsCount,
        frostDays,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch weather data: ${error.message}`);
      return this.getDefaultWeatherData(startDate, endDate);
    }
  }

  private getDefaultWeatherData(startDate: string, endDate: string) {
    return {
      period: { start: startDate, end: endDate },
      temperatureSummary: { avgMin: 0, avgMax: 0, avgMean: 0 },
      precipitationTotal: 0,
      drySpellsCount: 0,
      frostDays: 0,
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
