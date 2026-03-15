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
import { ZaiProvider } from './providers/zai.provider';
import { WeatherProvider } from '../chat/providers/weather.provider';
import {
  AIProvider,
  AggregatedParcelData,
  AIProviderConfig,
  IAIProvider,
  AgromindReportType,
  ParcelCalibrationInput,
  ParcelOperationalInput,
  AnnualPlanInput,
  PostRecommendationFollowUpInput,
} from './interfaces';
import { GenerateAIReportDto, AIProviderInfoDto, CalibrationStatusDto, CalibrateRequestDto, FetchDataRequestDto } from './dto';
import {
  AGRICULTURAL_EXPERT_SYSTEM_PROMPT,
  CALIBRATION_EXPERT_SYSTEM_PROMPT,
  RECOMMENDATIONS_EXPERT_SYSTEM_PROMPT,
  ANNUAL_PLAN_EXPERT_SYSTEM_PROMPT,
  FOLLOWUP_EXPERT_SYSTEM_PROMPT,
  buildUserPrompt,
  buildCalibrationPrompt,
  buildRecommendationsPrompt,
  buildAnnualPlanPrompt,
  buildFollowUpPrompt,
} from './prompts';
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
    private readonly zaiProvider: ZaiProvider,
    @Inject(forwardRef(() => OrganizationAISettingsService))
    private readonly aiSettingsService: OrganizationAISettingsService,
    private readonly weatherProvider: WeatherProvider,
  ) {
    this.providers = new Map<AIProvider, IAIProvider>();
    this.providers.set(AIProvider.OPENAI, openaiProvider);
    this.providers.set(AIProvider.GEMINI, geminiProvider);
    this.providers.set(AIProvider.GROQ, groqProvider);
    this.providers.set(AIProvider.ZAI, zaiProvider);
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
      case AIProvider.ZAI:
        envApiKey = this.configService.get<string>('ZAI_API_KEY');
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

    // 2. Calibrate and refresh data if needed
    await this.calibrateParcelData(
      organizationId,
      dto.parcel_id,
      dto.data_start_date,
      dto.data_end_date,
    );

    const reportPayload = await this.buildReportPayload(organizationId, dto);

    // 5. Generate AI response
    const config: AIProviderConfig = {
      provider: dto.provider,
      model: dto.model,
      temperature: 0.7,
      maxTokens: 16384,
    };

    try {
        const response = await provider.generate({
        systemPrompt: reportPayload.systemPrompt,
        userPrompt: reportPayload.userPrompt,
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
        reportPayload.parcelName,
        reportPayload.dataSnapshot,
        reportPayload.reportType,
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

    const parcelWithFarm = parcel as unknown as { farms: { organization_id: string } };
    if (parcelWithFarm.farms?.organization_id !== organizationId) {
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
    const orgSettings: Map<string, boolean> = new Map();

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

    // Z.ai (Platform AI) is always available if system API key is configured
    // It's the default platform AI service, so we check system config first
    const zaiAvailable =
      this.providers.get(AIProvider.ZAI)?.validateConfig() ||
      orgSettings.get(AIProviderType.ZAI) ||
      false;

    // Return providers with Platform AI (zai) first if available
    const providersList = [
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

    // Add Platform AI first if available, otherwise don't include it
    if (zaiAvailable) {
      providersList.unshift({
        provider: AIProvider.ZAI,
        available: zaiAvailable,
        name: 'Platform AI',
      });
    }

    return providersList;
  }

  /**
   * Validate analysis data - comprehensive calibration and validation
   * Returns detailed status with accuracy scoring and recommendations
   */
  async validateAnalysis(
    organizationId: string,
    parcelId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CalibrationStatusDto> {
    const supabase = this.databaseService.getAdminClient();
    const now = new Date();
    const defaultEndDate = endDate || now.toISOString().split('T')[0];
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const defaultStartDate = startDate || sixMonthsAgo.toISOString().split('T')[0];

    this.logger.log(`Validating data for parcel ${parcelId} (${defaultStartDate} to ${defaultEndDate})`);

    // Get parcel info for boundary
    const { data: parcel } = await supabase
      .from('parcels')
      .select('id, boundary')
      .eq('id', parcelId)
      .single();

    // ===== PHASE 1: SATELLITE DATA VALIDATION =====
    const { data: satelliteData } = await supabase
      .from('satellite_indices_data')
      .select('date, cloud_coverage_percentage')
      .eq('parcel_id', parcelId)
      .gte('date', defaultStartDate)
      .lte('date', defaultEndDate)
      .order('date', { ascending: false });

    const { data: latestSatellite } = await supabase
      .from('satellite_indices_data')
      .select('date, cloud_coverage_percentage')
      .eq('parcel_id', parcelId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const satelliteImageCount = satelliteData?.length || 0;
    const daysSinceLastSatellite = latestSatellite?.date
      ? Math.floor((now.getTime() - new Date(latestSatellite.date).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    const endDateObj = new Date(defaultEndDate);
    const daysSinceEndDate = Math.floor((now.getTime() - endDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate average cloud coverage
    const avgCloudCoverage = satelliteData && satelliteData.length > 0
      ? satelliteData.reduce((sum, d) => sum + (d.cloud_coverage_percentage || 0), 0) / satelliteData.length
      : null;

    const satelliteStatus: 'available' | 'stale' | 'missing' = 
      satelliteImageCount === 0 ? 'missing' :
      daysSinceLastSatellite !== null && daysSinceLastSatellite > 7 && daysSinceEndDate <= 7 ? 'stale' :
      'available';

    const satelliteValid = satelliteImageCount >= 2 && 
      (avgCloudCoverage === null || avgCloudCoverage <= 10) &&
      satelliteStatus !== 'missing';

    // ===== PHASE 2: WEATHER DATA VALIDATION =====
    let weatherStatus: 'available' | 'incomplete' | 'missing' = 'missing';
    let weatherCompleteness = 0;
    let weatherLatestDate: string | null = null;
    let weatherAgeHours: number | null = null;

    if (parcel?.boundary && Array.isArray(parcel.boundary) && parcel.boundary.length > 0) {
      try {
        // Calculate centroid
        const coords = parcel.boundary as number[][];
        const firstCoord = coords[0];
        const isWebMercator = Math.abs(firstCoord[0]) > 180 || Math.abs(firstCoord[1]) > 90;
        
        let sumLat = 0, sumLon = 0;
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

        // Fetch weather data
        const params = new URLSearchParams({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          start_date: defaultStartDate,
          end_date: defaultEndDate,
          daily: 'temperature_2m_min,temperature_2m_mean,temperature_2m_max,precipitation_sum',
          timezone: 'auto',
        });

        const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
        if (response.ok) {
          const data = await response.json();
          if (data.daily && data.daily.time) {
            const totalDays = Math.ceil((endDateObj.getTime() - new Date(defaultStartDate).getTime()) / (1000 * 60 * 60 * 24));
            const availableDays = data.daily.time.length;
            weatherCompleteness = totalDays > 0 ? (availableDays / totalDays) * 100 : 0;
            weatherLatestDate = data.daily.time[data.daily.time.length - 1] || null;
            
            if (weatherLatestDate) {
              const latestDate = new Date(weatherLatestDate);
              weatherAgeHours = Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60));
            }

            weatherStatus = weatherCompleteness >= 80 ? 'available' : 'incomplete';
          }
        }
      } catch (error) {
        this.logger.warn(`Weather data fetch failed: ${error.message}`);
      }
    }

    const weatherValid = weatherStatus === 'available' && weatherCompleteness >= 80;

    // ===== PHASE 3: OPTIONAL DATA VALIDATION =====
    const { data: latestSoil } = await supabase
      .from('analyses')
      .select('analysis_date')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'soil')
      .order('analysis_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: latestWater } = await supabase
      .from('analyses')
      .select('analysis_date')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'water')
      .order('analysis_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: latestPlant } = await supabase
      .from('analyses')
      .select('analysis_date')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'plant')
      .order('analysis_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const calculateAgeDays = (date: string | null): number | null => {
      if (!date) return null;
      return Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    };

    const soilAgeDays = calculateAgeDays(latestSoil?.analysis_date || null);
    const waterAgeDays = calculateAgeDays(latestWater?.analysis_date || null);
    const plantAgeDays = calculateAgeDays(latestPlant?.analysis_date || null);

    const soilValid = latestSoil && soilAgeDays !== null && soilAgeDays < 365;
    const waterValid = latestWater && waterAgeDays !== null && waterAgeDays < 365;
    const plantValid = latestPlant && plantAgeDays !== null && plantAgeDays < 180;

    // ===== PHASE 4: ACCURACY SCORING =====
    let accuracy = 0;
    if (satelliteValid && weatherValid) {
      accuracy = 50; // Base score for critical data
      if (soilValid) accuracy += 15;
      if (waterValid) accuracy += 15;
      if (plantValid) accuracy += 20;
    } else if (satelliteValid || weatherValid) {
      accuracy = 25; // Partial critical data
    }

    // ===== PHASE 5: STATUS DETERMINATION =====
    let status: 'ready' | 'warning' | 'blocked' = 'ready';
    const missingData: string[] = [];
    const recommendations: string[] = [];

    if (!satelliteValid) {
      if (satelliteImageCount < 2) {
        missingData.push('satellite');
        recommendations.push('Fetch at least 2 satellite images for accurate analysis');
      } else if (satelliteStatus === 'stale') {
        recommendations.push('Satellite data is stale (>7 days). Consider refreshing.');
      }
    }

    if (!weatherValid) {
      if (weatherStatus === 'missing') {
        missingData.push('weather');
        recommendations.push('Weather data is missing. Fetch weather data for the analysis period.');
      } else if (weatherCompleteness < 80) {
        recommendations.push(`Weather data is incomplete (${weatherCompleteness.toFixed(0)}%). Fetch missing dates.`);
      }
    }

    if (!soilValid && !latestSoil) {
      recommendations.push('Add soil analysis for better accuracy (recommended)');
    } else if (soilAgeDays !== null && soilAgeDays >= 365) {
      recommendations.push('Soil analysis is outdated (>1 year). Consider updating.');
    }

    if (!waterValid && !latestWater) {
      recommendations.push('Add water analysis for better accuracy (recommended)');
    } else if (waterAgeDays !== null && waterAgeDays >= 365) {
      recommendations.push('Water analysis is outdated (>1 year). Consider updating.');
    }

    if (!plantValid && !latestPlant) {
      recommendations.push('Add plant analysis for better accuracy (recommended)');
    } else if (plantAgeDays !== null && plantAgeDays >= 180) {
      recommendations.push('Plant analysis is outdated (>6 months). Consider updating.');
    }

    // Determine final status
    if (!satelliteValid || !weatherValid) {
      status = 'blocked';
    } else if (accuracy < 75 || recommendations.length > 0) {
      status = 'warning';
    }

    // Calculate next auto-refresh (7 days from now)
    const nextAutoRefresh = new Date(now);
    nextAutoRefresh.setDate(nextAutoRefresh.getDate() + 7);

    return {
      status,
      accuracy,
      missingData,
      recommendations,
      lastValidated: now.toISOString(),
      nextAutoRefresh: nextAutoRefresh.toISOString(),
      satellite: {
        status: satelliteStatus,
        imageCount: satelliteImageCount,
        latestDate: latestSatellite?.date || null,
        ageDays: daysSinceLastSatellite,
        cloudCoverage: avgCloudCoverage,
        isValid: satelliteValid,
      },
      weather: {
        status: weatherStatus,
        completeness: weatherCompleteness,
        latestDate: weatherLatestDate,
        ageHours: weatherAgeHours,
        isValid: weatherValid,
      },
      soil: {
        present: !!latestSoil,
        latestDate: latestSoil?.analysis_date || null,
        ageDays: soilAgeDays,
        isValid: soilValid,
      },
      water: {
        present: !!latestWater,
        latestDate: latestWater?.analysis_date || null,
        ageDays: waterAgeDays,
        isValid: waterValid,
      },
      plant: {
        present: !!latestPlant,
        latestDate: latestPlant?.analysis_date || null,
        ageDays: plantAgeDays,
        isValid: plantValid,
      },
    };
  }

  /**
   * Recalibrate data - force refresh and re-validation
   */
  async recalibrate(
    organizationId: string,
    parcelId: string,
    dto: CalibrateRequestDto,
  ): Promise<CalibrationStatusDto> {
    this.logger.log(`Recalibrating data for parcel ${parcelId} (force: ${dto.forceRefetch}, autoFetch: ${dto.autoFetch})`);

    // If force refresh, we could invalidate cache here
    // For now, just re-run validation
    const status = await this.validateAnalysis(
      organizationId,
      parcelId,
      dto.startDate,
      dto.endDate,
    );

    // Auto-fetch missing data if enabled
    if (dto.autoFetch && status.missingData.length > 0) {
      // TODO: Trigger satellite/weather fetch based on missingData
      this.logger.log(`Auto-fetch enabled for missing data: ${status.missingData.join(', ')}`);
    }

    return status;
  }

  /**
   * Fetch missing data for a parcel
   * Currently supports weather data fetching
   * Satellite data fetching requires external API integration (TODO)
   */
  async fetchData(
    organizationId: string,
    parcelId: string,
    dto: FetchDataRequestDto,
  ): Promise<{ success: boolean; message: string; fetched?: string[]; pending?: string[] }> {
    this.logger.log(`Fetching data for parcel ${parcelId}: ${dto.dataSources.join(', ')}`);

    const supabase = this.databaseService.getAdminClient();
    const fetched: string[] = [];
    const pending: string[] = [];

    // Verify parcel belongs to organization
    const { data: parcel } = await supabase
      .from('parcels')
      .select('id, boundary, name')
      .eq('id', parcelId)
      .single();

    if (!parcel) {
      throw new BadRequestException('Parcel not found');
    }

    // Fetch weather data if requested
    if (dto.dataSources.includes('weather')) {
      if (!this.weatherProvider.isConfigured()) {
        this.logger.warn('Weather provider not configured');
        pending.push('weather');
      } else {
        try {
          if (parcel.boundary && parcel.boundary.length > 0) {
            // Ensure coordinates are in WGS84
            const wgs84Boundary = WeatherProvider.ensureWGS84(parcel.boundary);
            const { latitude, longitude } = WeatherProvider.calculateCentroid(wgs84Boundary);

            // Fetch historical weather data using Open-Meteo Archive API
            // Get the date range (default to last 6 months if not provided)
            const now = new Date();
            const endDate = now.toISOString().split('T')[0];
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const startDate = sixMonthsAgo.toISOString().split('T')[0];

            const params = new URLSearchParams({
              latitude: latitude.toString(),
              longitude: longitude.toString(),
              start_date: startDate,
              end_date: endDate,
              daily: 'temperature_2m_min,temperature_2m_mean,temperature_2m_max,precipitation_sum,relative_humidity_2m',
              timezone: 'auto',
            });

            const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
            if (response.ok) {
              const weatherData = await response.json();
              if (weatherData.daily && weatherData.daily.time && weatherData.daily.time.length > 0) {
                // Store weather data for each day
                for (let i = 0; i < weatherData.daily.time.length; i++) {
                  const date = weatherData.daily.time[i];
                  await supabase
                    .from('weather_data')
                    .upsert({
                      parcel_id: parcelId,
                      date: date,
                      latitude,
                      longitude,
                      temperature_min: weatherData.daily.temperature_2m_min[i],
                      temperature_mean: weatherData.daily.temperature_2m_mean[i],
                      temperature_max: weatherData.daily.temperature_2m_max[i],
                      precipitation_sum: weatherData.daily.precipitation_sum[i],
                      relative_humidity_2m: weatherData.daily.relative_humidity_2m?.[i] || null,
                      data_source: 'open-meteo-archive',
                      fetched_at: now.toISOString()
                    }, {
                      onConflict: 'parcel_id,date'
                    });
                }
                fetched.push('weather');
                this.logger.log(`Successfully stored ${weatherData.daily.time.length} days of weather data for parcel ${parcelId}`);
              } else {
                this.logger.warn('Weather API returned no data');
                pending.push('weather');
              }
            } else {
              this.logger.warn(`Weather API error: ${response.statusText}`);
              pending.push('weather');
            }
          } else {
            this.logger.warn(`Parcel ${parcelId} has no boundary, cannot fetch weather`);
            pending.push('weather');
          }
        } catch (error) {
          this.logger.error(`Failed to fetch weather data: ${error.message}`);
          pending.push('weather');
        }
      }
    }

    // Satellite data fetching - integrate with satellite API service
    if (dto.dataSources.includes('satellite')) {
      try {
        // Get the satellite API URL from config
        const satelliteApiUrl = this.configService.get<string>('SATELLITE_SERVICE_URL') ||
                               this.configService.get<string>('VITE_BACKEND_SERVICE_URL') ||
                               'http://localhost:8001';

        // Get the parcel's farm to get organization context
        const { data: parcelWithFarm } = await supabase
          .from('parcels')
          .select('farms!inner(organization_id)')
          .eq('id', parcelId)
          .single();

        if (!parcelWithFarm || !parcelWithFarm.farms) {
          throw new Error('Parcel farm not found');
        }

        const orgId = (parcelWithFarm as any).farms.organization_id;

        // Convert boundary to GeoJSON if available
        let geometry = undefined;
        if (parcel.boundary && parcel.boundary.length > 0) {
          // Convert Web Mercator to WGS84 if needed
          const coords = parcel.boundary as number[][];
          const firstCoord = coords[0];
          const isWebMercator = Math.abs(firstCoord[0]) > 180 || Math.abs(firstCoord[1]) > 90;

          const wgs84Coords = coords.map(([x, y]) => {
            if (isWebMercator) {
              const lon = (x / 20037508.34) * 180;
              const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
              return [lon, lat];
            }
            return [x, y];
          });

          // Ensure polygon is closed
          if (wgs84Coords.length > 0) {
            const first = wgs84Coords[0];
            const last = wgs84Coords[wgs84Coords.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
              wgs84Coords.push([first[0], first[1]]);
            }
          }

          geometry = {
            type: 'Polygon',
            coordinates: [wgs84Coords]
          };
        }

        // Prepare the satellite API request
        const now = new Date();
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const requestBody = {
          aoi: {
            geometry: geometry || {
              type: 'Polygon',
              coordinates: [[
                [-7.0926, 31.7917], // Default fallback coords
                [-7.0926, 31.8],
                [-7.1, 31.8],
                [-7.1, 31.7917],
                [-7.0926, 31.7917]
              ]]
            },
            name: parcel.name
          },
          date_range: {
            start_date: sixMonthsAgo.toISOString().split('T')[0],
            end_date: now.toISOString().split('T')[0]
          },
          indices: ['NDVI', 'NDMI', 'NDRE'],
          cloud_coverage: 20
        };

        this.logger.log(`Calling satellite API at ${satelliteApiUrl}/api/indices/calculate`);

        // Call satellite API
        const response = await fetch(`${satelliteApiUrl}/api/indices/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-organization-id': orgId
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Satellite API error: ${response.status} - ${errorText}`);
        }

        const satelliteData = await response.json();
        this.logger.log(`Satellite API returned ${satelliteData.indices?.length || 0} indices`);

        // Store satellite indices in database
        if (satelliteData.indices && Array.isArray(satelliteData.indices)) {
          for (const indexResult of satelliteData.indices) {
            try {
              await supabase
                .from('satellite_indices_data')
                .upsert({
                  parcel_id: parcelId,
                  organization_id: orgId,
                  date: satelliteData.date || new Date().toISOString().split('T')[0],
                  index_name: indexResult.index,
                  mean_value: indexResult.value,
                  cloud_coverage_percentage: satelliteData.cloud_coverage || 0,
                  metadata: {
                    source: 'ai-reports-fetch',
                    aoi_name: parcel.name
                  }
                }, {
                  onConflict: 'parcel_id,date,index_name'
                });
            } catch (err) {
              this.logger.warn(`Failed to store satellite index ${indexResult.index}: ${err.message}`);
            }
          }
          fetched.push('satellite');
          this.logger.log(`Successfully stored ${satelliteData.indices.length} satellite indices for parcel ${parcelId}`);
        } else {
          this.logger.warn('Satellite API returned no indices');
          pending.push('satellite');
        }
      } catch (error) {
        this.logger.error(`Failed to fetch satellite data: ${error.message}`);
        pending.push('satellite');
      }
    }

    return {
      success: fetched.length > 0,
      message: `Data fetch completed. Fetched: ${fetched.join(', ') || 'none'}. ${pending.length > 0 ? `Pending implementation: ${pending.join(', ')}` : ''}`,
      fetched,
      pending,
    };
  }


  /**
   * Legacy calibration method (kept for backward compatibility)
   * Now calls validateAnalysis internally
   */
  private async calibrateParcelData(
    organizationId: string,
    parcelId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<void> {
    const status = await this.validateAnalysis(organizationId, parcelId, startDate, endDate);
    if (status.status === 'blocked') {
      this.logger.warn(`Analysis blocked due to missing critical data: ${status.missingData.join(', ')}`);
    }
  }

  private getDefaultDateRange(startDate?: string, endDate?: string) {
    const now = new Date();
    const defaultEndDate = endDate || now.toISOString().split('T')[0];
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const defaultStartDate = startDate || sixMonthsAgo.toISOString().split('T')[0];

    return { defaultStartDate, defaultEndDate };
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private async buildReportPayload(organizationId: string, dto: GenerateAIReportDto): Promise<{
    reportType: AgromindReportType;
    systemPrompt: string;
    userPrompt: string;
    parcelName: string;
    dataSnapshot: unknown;
  }> {
    const reportType = dto.reportType || AgromindReportType.GENERAL;
    const language = dto.language || 'fr';

    switch (reportType) {
      case AgromindReportType.CALIBRATION: {
        const calibrationData = await this.aggregateCalibrationData(
          organizationId,
          dto.parcel_id,
          dto.data_start_date,
          dto.data_end_date,
        );

        return {
          reportType,
          systemPrompt: CALIBRATION_EXPERT_SYSTEM_PROMPT,
          userPrompt: buildCalibrationPrompt(calibrationData, language),
          parcelName: calibrationData.parcel.name,
          dataSnapshot: calibrationData,
        };
      }
      case AgromindReportType.RECOMMENDATIONS: {
        const operationalData = await this.aggregateOperationalData(
          organizationId,
          dto.parcel_id,
          dto.data_start_date,
          dto.data_end_date,
        );

        return {
          reportType,
          systemPrompt: RECOMMENDATIONS_EXPERT_SYSTEM_PROMPT,
          userPrompt: buildRecommendationsPrompt(operationalData, language),
          parcelName: operationalData.parcel.name,
          dataSnapshot: operationalData,
        };
      }
      case AgromindReportType.ANNUAL_PLAN: {
        const annualPlanData = await this.aggregateAnnualPlanData(
          organizationId,
          dto.parcel_id,
          dto.data_start_date,
          dto.data_end_date,
        );

        return {
          reportType,
          systemPrompt: ANNUAL_PLAN_EXPERT_SYSTEM_PROMPT,
          userPrompt: buildAnnualPlanPrompt(annualPlanData, language),
          parcelName: annualPlanData.parcel.name,
          dataSnapshot: annualPlanData,
        };
      }
      case AgromindReportType.FOLLOWUP: {
        const followUpData = await this.aggregateFollowUpData(
          organizationId,
          dto.parcel_id,
          dto.data_start_date,
          dto.data_end_date,
        );

        return {
          reportType,
          systemPrompt: FOLLOWUP_EXPERT_SYSTEM_PROMPT,
          userPrompt: buildFollowUpPrompt(followUpData, language),
          parcelName: followUpData.parcel.name,
          dataSnapshot: followUpData,
        };
      }
      case AgromindReportType.GENERAL:
      default: {
        const aggregatedData = await this.aggregateParcelData(
          organizationId,
          dto.parcel_id,
          dto.data_start_date,
          dto.data_end_date,
        );

        return {
          reportType: AgromindReportType.GENERAL,
          systemPrompt: AGRICULTURAL_EXPERT_SYSTEM_PROMPT,
          userPrompt: buildUserPrompt(aggregatedData, language),
          parcelName: aggregatedData.parcel.name,
          dataSnapshot: aggregatedData,
        };
      }
    }
  }

  private async aggregateCalibrationData(
    organizationId: string,
    parcelId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ParcelCalibrationInput> {
    const baseData = await this.aggregateParcelData(organizationId, parcelId, startDate, endDate);
    const supabase = this.databaseService.getAdminClient();
    const { defaultStartDate, defaultEndDate } = this.getDefaultDateRange(startDate, endDate);

    const { data: parcelDetails } = await supabase
      .from('parcels')
      .select('id, name, planting_system, planting_density')
      .eq('id', parcelId)
      .single();

    const { data: soilAnalysis } = await supabase
      .from('analyses')
      .select('analysis_date, data')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'soil')
      .order('analysis_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: waterAnalysis } = await supabase
      .from('analyses')
      .select('analysis_date, data')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'water')
      .order('analysis_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: plantAnalysis } = await supabase
      .from('analyses')
      .select('analysis_date, data')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'plant')
      .order('analysis_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const indices = ['NDVI', 'NIRV', 'NIRVP', 'NDMI', 'NDRE', 'MSI', 'EVI', 'MSAVI', 'GCI'];
    const { data: satelliteSeries } = await supabase
      .from('satellite_indices_data')
      .select('date, index_name, mean_value')
      .eq('parcel_id', parcelId)
      .gte('date', defaultStartDate)
      .lte('date', defaultEndDate)
      .in('index_name', indices)
      .order('date', { ascending: true });

    const timeSeries: Record<string, Array<{ date: string; value: number }>> = {};
    const latestValues: Record<string, number> = {};

    for (const index of indices) {
      timeSeries[index.toLowerCase()] = [];
    }

    for (const item of satelliteSeries || []) {
      const indexKey = item.index_name.toLowerCase();
      const value = this.toNumber(item.mean_value);

      if (!timeSeries[indexKey] || value === undefined) {
        continue;
      }

      timeSeries[indexKey].push({ date: item.date, value });
      latestValues[indexKey] = value;
    }

    const validScenes = new Set((satelliteSeries || []).map((entry) => entry.date)).size;
    const coverageMonths = new Set(
      (satelliteSeries || []).map((entry) => {
        const [year, month] = entry.date.split('-');
        return `${year}-${month}`;
      }),
    ).size;

    const soilData = (soilAnalysis?.data as Record<string, unknown> | null) || null;
    const waterData = (waterAnalysis?.data as Record<string, unknown> | null) || null;
    const plantData = (plantAnalysis?.data as Record<string, unknown> | null) || null;

    return {
      parcel: {
        id: baseData.parcel.id,
        name: baseData.parcel.name,
        area: baseData.parcel.area,
        areaUnit: baseData.parcel.areaUnit,
        cropType: baseData.parcel.cropType,
        treeType: baseData.parcel.treeType,
        variety: baseData.parcel.variety,
        rootstock: baseData.parcel.rootstock,
        plantingYear: baseData.parcel.plantingYear,
        treeCount: baseData.parcel.treeCount,
        plantingSystem:
          (typeof parcelDetails?.planting_system === 'string' && parcelDetails.planting_system) ||
          undefined,
        soilType: baseData.parcel.soilType,
        irrigationType: baseData.parcel.irrigationType,
      },
      satelliteHistory: {
        period: {
          start: defaultStartDate,
          end: defaultEndDate,
        },
        validScenes,
        coverageMonths,
        timeSeries,
        latestValues: {
          ndvi: latestValues.ndvi,
          nirv: latestValues.nirv,
          nirvp: latestValues.nirvp,
          ndmi: latestValues.ndmi,
          ndre: latestValues.ndre,
          msi: latestValues.msi,
          evi: latestValues.evi,
          msavi: latestValues.msavi,
          gci: latestValues.gci,
        },
      },
      weather: {
        period: baseData.weather.period,
        temperatureSummary: baseData.weather.temperatureSummary,
        precipitationTotal: baseData.weather.precipitationTotal,
        frostDays: baseData.weather.frostDays,
        drySpellsCount: baseData.weather.drySpellsCount,
      },
      soilAnalysis: soilAnalysis
        ? {
            latestDate: soilAnalysis.analysis_date,
            phLevel: baseData.soilAnalysis?.phLevel,
            ec: baseData.soilAnalysis?.ec,
            texture: baseData.soilAnalysis?.texture,
            organicMatter: baseData.soilAnalysis?.organicMatter,
            totalLimestone:
              this.toNumber(soilData?.total_limestone_percentage) || this.toNumber(soilData?.total_limestone),
            activeLimestone:
              this.toNumber(soilData?.active_limestone_percentage) || this.toNumber(soilData?.active_limestone),
            cec: baseData.soilAnalysis?.cec,
            nitrogenPpm: baseData.soilAnalysis?.nitrogenPpm,
            phosphorusPpm: baseData.soilAnalysis?.phosphorusPpm,
            potassiumPpm: baseData.soilAnalysis?.potassiumPpm,
            calcium: baseData.soilAnalysis?.calcium,
            magnesium: baseData.soilAnalysis?.magnesium,
            iron: baseData.soilAnalysis?.iron,
            zinc: baseData.soilAnalysis?.zinc,
            manganese: baseData.soilAnalysis?.manganese,
            copper: baseData.soilAnalysis?.copper,
            boron: baseData.soilAnalysis?.boron,
          }
        : undefined,
      waterAnalysis: waterAnalysis
        ? {
            latestDate: waterAnalysis.analysis_date,
            ph: baseData.waterAnalysis?.ph,
            ec: baseData.waterAnalysis?.ec,
            sar: baseData.waterAnalysis?.sar,
            sodium: this.toNumber(waterData?.sodium_mg_l) || this.toNumber(waterData?.sodium),
            chlorides: baseData.waterAnalysis?.chlorides,
            bicarbonates:
              this.toNumber(waterData?.bicarbonate_mg_l) || this.toNumber(waterData?.bicarbonates),
            boron: this.toNumber(waterData?.boron_mg_l) || this.toNumber(waterData?.boron),
            nitrates: baseData.waterAnalysis?.nitrates,
            tds: baseData.waterAnalysis?.tds,
          }
        : undefined,
      plantAnalysis: plantAnalysis
        ? {
            latestDate: plantAnalysis.analysis_date,
            nitrogenPercent: baseData.plantAnalysis?.nitrogenPercent,
            phosphorusPercent: baseData.plantAnalysis?.phosphorusPercent,
            potassiumPercent: baseData.plantAnalysis?.potassiumPercent,
            calcium: this.toNumber(plantData?.calcium_percent) || this.toNumber(plantData?.calcium),
            magnesium: this.toNumber(plantData?.magnesium_percent) || this.toNumber(plantData?.magnesium),
            iron: this.toNumber(plantData?.iron_ppm) || this.toNumber(plantData?.iron),
            zinc: this.toNumber(plantData?.zinc_ppm) || this.toNumber(plantData?.zinc),
            manganese: this.toNumber(plantData?.manganese_ppm) || this.toNumber(plantData?.manganese),
            boron: this.toNumber(plantData?.boron_ppm) || this.toNumber(plantData?.boron),
            copper: this.toNumber(plantData?.copper_ppm) || this.toNumber(plantData?.copper),
            sodium: this.toNumber(plantData?.sodium_percent) || this.toNumber(plantData?.sodium),
            chloride: this.toNumber(plantData?.chloride_percent) || this.toNumber(plantData?.chloride),
          }
        : undefined,
      yieldHistory:
        baseData.yieldHistory?.map((entry) => ({
          year: entry.year,
          season: entry.season,
          yieldPerHa: entry.yieldPerHa,
          qualityGrade: entry.qualityGrade,
        })) || [],
      operationsHistory:
        baseData.tasks?.map((task) => ({
          date: task.date,
          type: task.type,
          description: task.description,
        })) || [],
    };
  }

  private async aggregateOperationalData(
    _organizationId: string,
    _parcelId: string,
    _startDate?: string,
    _endDate?: string,
  ): Promise<ParcelOperationalInput> {
    throw new BadRequestException('Not yet implemented: requires completed calibration report');
  }

  private async aggregateAnnualPlanData(
    organizationId: string,
    parcelId: string,
    _startDate?: string,
    _endDate?: string,
  ): Promise<AnnualPlanInput> {
    const supabase = this.databaseService.getAdminClient();

    const { data: parcel } = await supabase
      .from('parcels')
      .select(
        'id, name, crop_type, area, area_unit, variety, planting_year, planting_system, planting_density, tree_count, soil_type, irrigation_type, water_source, ai_nutrition_option, ai_calibration_id',
      )
      .eq('id', parcelId)
      .single();

    if (!parcel) {
      throw new BadRequestException('Parcel not found');
    }

    const { data: calibration } = await supabase
      .from('calibrations')
      .select(
        'calibration_data, health_score, confidence_score, yield_potential_min, yield_potential_max, maturity_phase',
      )
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!calibration) {
      throw new BadRequestException(
        'No completed calibration found - annual plan requires calibration first',
      );
    }

    const calibrationData =
      calibration.calibration_data &&
      typeof calibration.calibration_data === 'object' &&
      !Array.isArray(calibration.calibration_data)
        ? (calibration.calibration_data as Record<string, unknown>)
        : null;

    const v2Output =
      calibrationData?.output &&
      typeof calibrationData.output === 'object' &&
      !Array.isArray(calibrationData.output)
        ? (calibrationData.output as Record<string, unknown>)
        : {};

    const aiAnalysis =
      calibrationData?.ai_analysis &&
      typeof calibrationData.ai_analysis === 'object' &&
      !Array.isArray(calibrationData.ai_analysis)
        ? (calibrationData.ai_analysis as Record<string, unknown>)
        : {};

    const alternanceStatus = this.extractAlternanceStatus(v2Output) ?? 'indetermine';
    const soilManagementMode = this.extractSoilManagementMode(aiAnalysis) ?? 'C';

    const { data: soilAnalysis } = await supabase
      .from('analyses')
      .select('analysis_date, data')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'soil')
      .order('analysis_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: waterAnalysis } = await supabase
      .from('analyses')
      .select('analysis_date, data')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'water')
      .order('analysis_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: plantAnalysis } = await supabase
      .from('analyses')
      .select('analysis_date, data')
      .eq('parcel_id', parcelId)
      .eq('analysis_type', 'plant')
      .order('analysis_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: harvestRecords } = await supabase
      .from('harvest_records')
      .select('harvest_date, quantity, unit, quality_grade')
      .eq('parcel_id', parcelId)
      .order('harvest_date', { ascending: false })
      .limit(10);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const season =
      currentMonth >= 9
        ? `${currentYear}/${currentYear + 1}`
        : `${currentYear - 1}/${currentYear}`;

    const area = this.toNumber(parcel.area) || 0;
    const areaForYield = area > 0 ? area : 1;
    const plantingYear = this.toNumber(parcel.planting_year);
    const density = this.toNumber(parcel.planting_density);

    return {
      season,
      generationDate: new Date().toISOString().split('T')[0],
      parcel: {
        id: parcel.id,
        name: parcel.name ?? 'Parcelle',
        area,
        areaUnit: typeof parcel.area_unit === 'string' ? parcel.area_unit : 'ha',
        cropType: typeof parcel.crop_type === 'string' ? parcel.crop_type : undefined,
        variety: typeof parcel.variety === 'string' ? parcel.variety : undefined,
        plantingSystem:
          typeof parcel.planting_system === 'string' ? parcel.planting_system : undefined,
        plantingYear,
        age: plantingYear ? currentYear - plantingYear : undefined,
        density,
        treeCount: this.toNumber(parcel.tree_count),
        soilType: typeof parcel.soil_type === 'string' ? parcel.soil_type : undefined,
        irrigationType:
          typeof parcel.irrigation_type === 'string' ? parcel.irrigation_type : undefined,
        waterSource: typeof parcel.water_source === 'string' ? parcel.water_source : undefined,
        nutritionOption:
          typeof parcel.ai_nutrition_option === 'string' ? parcel.ai_nutrition_option : 'A',
        productionTarget: 'huile_qualite',
      },
      baseline: {
        confidenceScore:
          typeof calibration.confidence_score === 'number'
            ? calibration.confidence_score * 100
            : 50,
        healthScore:
          typeof calibration.health_score === 'number' ? calibration.health_score : 50,
        yieldPotential: {
          low:
            typeof calibration.yield_potential_min === 'number'
              ? calibration.yield_potential_min
              : 0,
          high:
            typeof calibration.yield_potential_max === 'number'
              ? calibration.yield_potential_max
              : 0,
        },
        alternanceStatus,
        soilManagementMode,
      },
      soilAnalysis: this.mapAnalysisToSoilData(soilAnalysis),
      waterAnalysis: this.mapAnalysisToWaterData(waterAnalysis),
      plantAnalysis: this.mapAnalysisToPlantData(plantAnalysis),
      yieldHistory: (harvestRecords || []).map((record) => {
        const year =
          typeof record.harvest_date === 'string' && record.harvest_date
            ? new Date(record.harvest_date).getFullYear()
            : currentYear;
        return {
          year: Number.isFinite(year) ? year : currentYear,
          yieldPerHa: (this.toNumber(record.quantity) || 0) / areaForYield,
        };
      }),
    };
  }

  private mapAnalysisToSoilData(
    analysis: { analysis_date: string; data: unknown } | null,
  ): AnnualPlanInput['soilAnalysis'] {
    if (!analysis) {
      return undefined;
    }

    const data =
      analysis.data && typeof analysis.data === 'object' && !Array.isArray(analysis.data)
        ? (analysis.data as Record<string, unknown>)
        : {};

    return {
      latestDate: analysis.analysis_date,
      phLevel: this.toNumber(data.ph_level),
      ec: this.toNumber(data.salinity_level),
      texture: typeof data.texture === 'string' ? data.texture : undefined,
      organicMatter: this.toNumber(data.organic_matter_percentage),
      totalLimestone:
        this.toNumber(data.total_limestone_percentage) || this.toNumber(data.total_limestone),
      activeLimestone:
        this.toNumber(data.active_limestone_percentage) || this.toNumber(data.active_limestone),
      cec: this.toNumber(data.cec_meq_per_100g),
      nitrogenPpm: this.toNumber(data.nitrogen_ppm),
      phosphorusPpm: this.toNumber(data.phosphorus_ppm),
      potassiumPpm: this.toNumber(data.potassium_ppm),
      calcium: this.toNumber(data.calcium_ppm),
      magnesium: this.toNumber(data.magnesium_ppm),
      iron: this.toNumber(data.iron_ppm),
      zinc: this.toNumber(data.zinc_ppm),
      manganese: this.toNumber(data.manganese_ppm),
      copper: this.toNumber(data.copper_ppm),
      boron: this.toNumber(data.boron_ppm),
    };
  }

  private mapAnalysisToWaterData(
    analysis: { analysis_date: string; data: unknown } | null,
  ): AnnualPlanInput['waterAnalysis'] {
    if (!analysis) {
      return undefined;
    }

    const data =
      analysis.data && typeof analysis.data === 'object' && !Array.isArray(analysis.data)
        ? (analysis.data as Record<string, unknown>)
        : {};

    return {
      latestDate: analysis.analysis_date,
      ph: this.toNumber(data.ph_level),
      ec: this.toNumber(data.ec_ds_per_m),
      sar: this.toNumber(data.sar),
      sodium: this.toNumber(data.sodium_mg_l) || this.toNumber(data.sodium),
      chlorides: this.toNumber(data.chloride_ppm),
      bicarbonates: this.toNumber(data.bicarbonate_mg_l) || this.toNumber(data.bicarbonates),
      boron: this.toNumber(data.boron_mg_l) || this.toNumber(data.boron),
      nitrates: this.toNumber(data.nitrate_ppm),
      tds: this.toNumber(data.tds_ppm),
    };
  }

  private mapAnalysisToPlantData(
    analysis: { analysis_date: string; data: unknown } | null,
  ): AnnualPlanInput['plantAnalysis'] {
    if (!analysis) {
      return undefined;
    }

    const data =
      analysis.data && typeof analysis.data === 'object' && !Array.isArray(analysis.data)
        ? (analysis.data as Record<string, unknown>)
        : {};

    return {
      latestDate: analysis.analysis_date,
      nitrogenPercent: this.toNumber(data.nitrogen_percent),
      phosphorusPercent: this.toNumber(data.phosphorus_percent),
      potassiumPercent: this.toNumber(data.potassium_percent),
      calcium: this.toNumber(data.calcium_percent) || this.toNumber(data.calcium),
      magnesium: this.toNumber(data.magnesium_percent) || this.toNumber(data.magnesium),
      iron: this.toNumber(data.iron_ppm) || this.toNumber(data.iron),
      zinc: this.toNumber(data.zinc_ppm) || this.toNumber(data.zinc),
      manganese: this.toNumber(data.manganese_ppm) || this.toNumber(data.manganese),
      boron: this.toNumber(data.boron_ppm) || this.toNumber(data.boron),
      copper: this.toNumber(data.copper_ppm) || this.toNumber(data.copper),
      sodium: this.toNumber(data.sodium_percent) || this.toNumber(data.sodium),
      chloride: this.toNumber(data.chloride_percent) || this.toNumber(data.chloride),
    };
  }

  private extractAlternanceStatus(v2Output: Record<string, unknown>): string | null {
    const step6 =
      v2Output.step6 && typeof v2Output.step6 === 'object' && !Array.isArray(v2Output.step6)
        ? (v2Output.step6 as Record<string, unknown>)
        : null;

    if (!step6) {
      return null;
    }

    const alternance =
      step6.alternance_info &&
      typeof step6.alternance_info === 'object' &&
      !Array.isArray(step6.alternance_info)
        ? (step6.alternance_info as Record<string, unknown>)
        : null;

    if (!alternance) {
      return null;
    }

    return typeof alternance.status === 'string' ? alternance.status : null;
  }

  private extractSoilManagementMode(aiAnalysis: Record<string, unknown>): string | null {
    const soilMode =
      aiAnalysis.soilManagementMode &&
      typeof aiAnalysis.soilManagementMode === 'object' &&
      !Array.isArray(aiAnalysis.soilManagementMode)
        ? (aiAnalysis.soilManagementMode as Record<string, unknown>)
        : null;

    if (!soilMode) {
      return null;
    }

    return typeof soilMode.recommended === 'string' ? soilMode.recommended : null;
  }

  private async aggregateFollowUpData(
    _organizationId: string,
    _parcelId: string,
    _startDate?: string,
    _endDate?: string,
  ): Promise<PostRecommendationFollowUpInput> {
    throw new BadRequestException('Not yet implemented: requires completed calibration report');
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

    // Fetch tasks/operations
    const { data: tasks } = await supabase
      .from('tasks')
      .select('date, type, description')
      .eq('parcel_id', parcelId)
      .gte('date', defaultStartDate)
      .lte('date', defaultEndDate)
      .order('date', { ascending: false })
      .limit(50);

    // Fetch recent harvests (last 2 years for context)
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const { data: harvests } = await supabase
      .from('harvest_records')
      .select('harvest_date, quantity, unit, quality_grade, quality_score')
      .eq('parcel_id', parcelId)
      .gte('harvest_date', twoYearsAgo.toISOString().split('T')[0])
      .order('harvest_date', { ascending: false })
      .limit(20);

    // Fetch active crop cycle
    const { data: cropCycle } = await supabase
      .from('crop_cycles')
      .select('*')
      .eq('parcel_id', parcelId)
      .in('status', ['planned', 'land_prep', 'growing', 'harvesting'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch yield history (last 3 years)
    const threeYearsAgo = new Date(now);
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const { data: yieldHistory } = await supabase
      .from('yield_history')
      .select('season, year, yield_per_hectare, quality_grade, performance_rating')
      .eq('parcel_id', parcelId)
      .gte('year', threeYearsAgo.getFullYear())
      .order('year', { ascending: false })
      .order('season', { ascending: false });

    // Fetch active performance alerts
    const { data: performanceAlerts } = await supabase
      .from('performance_alerts')
      .select('alert_type, severity, description, created_at')
      .eq('parcel_id', parcelId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    // Build aggregated response
    return this.buildAggregatedData(
      parcel,
      soilAnalyses?.[0],
      waterAnalyses?.[0],
      plantAnalyses?.[0],
      satelliteData || [],
      tasks || [],
      harvests || [],
      cropCycle || null,
      yieldHistory || [],
      performanceAlerts || [],
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
    tasks: any[],
    harvests: any[],
    cropCycle: any | null,
    yieldHistory: any[],
    performanceAlerts: any[],
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
      tasks: tasks.map((t) => ({
        date: t.date,
        type: t.type,
        description: t.description,
      })),
      harvests: harvests.map((h) => ({
        date: h.harvest_date,
        quantity: h.quantity,
        unit: h.unit,
        qualityGrade: h.quality_grade,
        qualityScore: h.quality_score,
      })),
      cropCycle: cropCycle
        ? {
            cycleName: cropCycle.cycle_name || cropCycle.cycle_code,
            status: cropCycle.status,
            plantingDate: cropCycle.planting_date,
            expectedHarvestStart: cropCycle.expected_harvest_start,
            expectedHarvestEnd: cropCycle.expected_harvest_end,
            actualHarvestStart: cropCycle.actual_harvest_start,
            actualHarvestEnd: cropCycle.actual_harvest_end,
            expectedYieldPerHa: cropCycle.expected_yield_per_ha,
            actualYieldPerHa: cropCycle.actual_yield_per_ha,
            totalCosts: cropCycle.total_costs,
            totalRevenue: cropCycle.total_revenue,
            netProfit: cropCycle.net_profit,
          }
        : undefined,
      yieldHistory: yieldHistory.map((yh) => ({
        season: yh.season,
        year: yh.year,
        yieldPerHa: yh.yield_per_hectare,
        qualityGrade: yh.quality_grade,
        performanceRating: yh.performance_rating,
      })),
      performanceAlerts: performanceAlerts.map((pa) => ({
        type: pa.alert_type,
        severity: pa.severity,
        description: pa.description,
        date: pa.created_at,
      })),
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

  private parseAIResponse(content: string): Record<string, unknown> {
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

      const parsed = JSON.parse(jsonStr) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('AI response must be a JSON object');
      }

      return parsed as Record<string, unknown>;
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
    sections: Record<string, unknown>,
    parcelName: string,
    dataSnapshot: unknown,
    reportType: AgromindReportType,
  ) {
    const supabase = this.databaseService.getAdminClient();
    const now = new Date();

    const recommendations = Array.isArray(sections.recommendations)
      ? sections.recommendations.length
      : 0;
    const riskAlerts = Array.isArray(sections.riskAlerts)
      ? sections.riskAlerts.length
      : 0;
    const healthAssessment = sections.healthAssessment;
    const healthScore =
      healthAssessment &&
      typeof healthAssessment === 'object' &&
      !Array.isArray(healthAssessment) &&
      typeof (healthAssessment as Record<string, unknown>).overallScore === 'number'
        ? (healthAssessment as Record<string, unknown>).overallScore
        : undefined;

    const { data, error } = await supabase
      .from('parcel_reports')
      .insert({
        parcel_id: parcelId,
        template_id: 'ai-generated',
        title: `Rapport IA - ${reportType} - ${parcelName} - ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        status: 'completed',
        generated_at: now.toISOString(),
        generated_by: userId,
        metadata: {
          type: 'ai_report',
          report_type: reportType,
          organization_id: organizationId,
          provider,
          sections,
          health_score: healthScore,
          recommendations_count: recommendations,
          risk_alerts_count: riskAlerts,
          data_snapshot: dataSnapshot,
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

  async createReportJob(organizationId: string, userId: string, dto: GenerateAIReportDto) {
    const supabase = this.databaseService.getAdminClient();

    const { data: job, error } = await supabase
      .from('ai_report_jobs')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        parcel_id: dto.parcel_id,
        provider: dto.provider,
        model: dto.model,
        language: dto.language || 'fr',
        data_start_date: dto.data_start_date,
        data_end_date: dto.data_end_date,
        status: 'pending',
        progress: 0,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create job: ${error.message}`);
      throw new InternalServerErrorException('Failed to create report job');
    }

    this.processJobInBackground(job.id, organizationId, userId, dto);

    return {
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      created_at: job.created_at,
    };
  }

  private async processJobInBackground(
    jobId: string,
    organizationId: string,
    userId: string,
    dto: GenerateAIReportDto,
  ) {
    const supabase = this.databaseService.getAdminClient();
    const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max for entire job
    let timeoutId: NodeJS.Timeout | null = null;
    let isCompleted = false;

    const markJobFailed = async (errorMessage: string) => {
      if (isCompleted) return;
      isCompleted = true;
      if (timeoutId) clearTimeout(timeoutId);
      
      try {
        await supabase
          .from('ai_report_jobs')
          .update({ 
            status: 'failed', 
            completed_at: new Date().toISOString(), 
            error_message: errorMessage 
          })
          .eq('id', jobId);
      } catch (updateError) {
        this.logger.error(`Failed to update job ${jobId} status: ${updateError.message}`);
      }
    };

    const updateProgress = async (progress: number, status: string = 'processing') => {
      if (isCompleted) return;
      try {
        await supabase
          .from('ai_report_jobs')
          .update({ 
            status, 
            progress, 
            ...(status === 'processing' && progress === 10 ? { started_at: new Date().toISOString() } : {}) 
          })
          .eq('id', jobId);
      } catch (error) {
        this.logger.warn(`Failed to update progress for job ${jobId}: ${error.message}`);
      }
    };

    timeoutId = setTimeout(async () => {
      this.logger.error(`Job ${jobId} timed out after ${JOB_TIMEOUT_MS / 1000}s`);
      await markJobFailed('Job timed out. The AI analysis took too long. Please try again.');
    }, JOB_TIMEOUT_MS);

    try {
      await updateProgress(10, 'processing');

      await updateProgress(20);
      const providerType = dto.provider as unknown as AIProviderType;
      const apiKey = await this.aiSettingsService.getDecryptedApiKey(organizationId, providerType);
      
      let envApiKey: string | undefined;
      switch (dto.provider) {
        case AIProvider.OPENAI: envApiKey = this.configService.get<string>('OPENAI_API_KEY'); break;
        case AIProvider.GEMINI: envApiKey = this.configService.get<string>('GOOGLE_AI_API_KEY'); break;
        case AIProvider.GROQ: envApiKey = this.configService.get<string>('GROQ_API_KEY'); break;
        case AIProvider.ZAI: envApiKey = this.configService.get<string>('ZAI_API_KEY'); break;
      }
      const effectiveApiKey = apiKey || envApiKey;
      if (!effectiveApiKey) throw new BadRequestException(`AI provider ${dto.provider} is not configured.`);

      const provider = this.providers.get(dto.provider);
      if (!provider) throw new BadRequestException(`Unknown AI provider: ${dto.provider}`);
      provider.setApiKey(effectiveApiKey);

      await updateProgress(30);
      await this.calibrateParcelData(organizationId, dto.parcel_id, dto.data_start_date, dto.data_end_date);

      await updateProgress(50);
      const reportPayload = await this.buildReportPayload(organizationId, dto);

      await updateProgress(60);
      await updateProgress(70);
      const config: AIProviderConfig = { provider: dto.provider, model: dto.model, temperature: 0.7, maxTokens: 16384 };
      
      this.logger.log(`Job ${jobId}: Starting AI generation with ${dto.provider}`);
      const response = await provider.generate({
        systemPrompt: reportPayload.systemPrompt,
        userPrompt: reportPayload.userPrompt,
        config,
      });
      this.logger.log(`Job ${jobId}: AI generation completed`);

      if (isCompleted) {
        this.logger.warn(`Job ${jobId} already marked as completed/failed, skipping result storage`);
        return;
      }
      
      await updateProgress(90);
      const reportSections = this.parseAIResponse(response.content);
      const storedReport = await this.storeReport(
        organizationId,
        userId,
        dto.parcel_id,
        dto.provider,
        reportSections,
        reportPayload.parcelName,
        reportPayload.dataSnapshot,
        reportPayload.reportType,
      );

      const result = {
        success: true,
        report: storedReport,
        sections: reportSections,
        metadata: {
          provider: response.provider,
          model: response.model,
          tokensUsed: response.tokensUsed,
          generatedAt: response.generatedAt,
          dataRange: { start: dto.data_start_date, end: dto.data_end_date },
        },
      };

      if (timeoutId) clearTimeout(timeoutId);
      isCompleted = true;

      await supabase
        .from('ai_report_jobs')
        .update({ status: 'completed', completed_at: new Date().toISOString(), progress: 100, report_id: storedReport?.id, result })
        .eq('id', jobId);

      this.logger.log(`Job ${jobId} completed successfully`);
    } catch (error) {
      this.logger.error(`Job ${jobId} failed: ${error.message}`, error.stack);
      await markJobFailed(error.message || 'Unknown error occurred during AI report generation');
    }
  }

  async getJobStatus(organizationId: string, jobId: string) {
    const supabase = this.databaseService.getAdminClient();

    const { data: job, error } = await supabase
      .from('ai_report_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !job) {
      throw new BadRequestException('Job not found');
    }

    return {
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      error_message: job.error_message,
      report_id: job.report_id,
      result: job.result,
      created_at: job.created_at,
      started_at: job.started_at,
      completed_at: job.completed_at,
    };
  }

  async listJobs(organizationId: string, status?: string, limit: number = 10) {
    const supabase = this.databaseService.getAdminClient();

    await this.cleanupStuckJobs(organizationId);

    let query = supabase
      .from('ai_report_jobs')
      .select('id, parcel_id, provider, status, progress, created_at, completed_at, error_message')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query;

    if (error) {
      this.logger.error(`Failed to list jobs: ${error.message}`);
      throw new InternalServerErrorException('Failed to list jobs');
    }

    return { jobs };
  }

  private async cleanupStuckJobs(organizationId: string): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const STUCK_THRESHOLD_MS = 5 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

    try {
      const { data: stuckJobs, error: fetchError } = await supabase
        .from('ai_report_jobs')
        .select('id, status, started_at, created_at')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'processing'])
        .or(`started_at.lt.${cutoffTime},and(started_at.is.null,created_at.lt.${cutoffTime})`);

      if (fetchError) {
        this.logger.warn(`Failed to fetch stuck jobs: ${fetchError.message}`);
        return;
      }

      if (stuckJobs && stuckJobs.length > 0) {
        const stuckIds = stuckJobs.map(j => j.id);
        this.logger.warn(`Found ${stuckIds.length} stuck jobs, marking as failed: ${stuckIds.join(', ')}`);

        const { error: updateError } = await supabase
          .from('ai_report_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: 'Job timed out. The analysis took too long and was automatically cancelled.',
          })
          .in('id', stuckIds);

        if (updateError) {
          this.logger.error(`Failed to update stuck jobs: ${updateError.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error cleaning up stuck jobs: ${error.message}`);
    }
  }
}
