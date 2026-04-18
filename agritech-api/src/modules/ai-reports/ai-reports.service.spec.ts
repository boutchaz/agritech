import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIReportsService } from './ai-reports.service';
import { DatabaseService } from '../database/database.service';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { ZaiProvider } from './providers/zai.provider';
import { OrganizationAISettingsService } from '../organization-ai-settings/organization-ai-settings.service';
import { AiQuotaService } from '../ai-quota/ai-quota.service';
import { WeatherProvider } from '../chat/providers/weather.provider';
import {
  createMockDatabaseService,
  createMockSupabaseClient,
  createMockQueryBuilder,
  MockDatabaseService,
  MockSupabaseClient,
  setupThenableMock,
  setupTableMock,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS, createMockConfigService } from '../../../test/helpers/test-utils';
import { AIProvider } from './interfaces';
import { AgromindReportType } from './interfaces/agromind-prompts.interfaces';
import { GenerateAIReportDto } from './dto';

function thenableProxy(data: any, error: any = null, extra: Record<string, any> = {}) {
  const result = { data, error, ...extra };
  const promise = Promise.resolve(result);
  const builder = createMockQueryBuilder();
  return new Proxy(builder, {
    get(target, prop) {
      if (prop === 'then') return promise.then.bind(promise);
      const val = (target as unknown as Record<PropertyKey, unknown>)[prop];
      if (typeof val === 'function') {
        return (...args: any[]) => {
          val.apply(target, args);
          return thenableProxy(data, error, extra);
        };
      }
      return val;
    },
  });
}

function getPrivateMethod<T extends (...args: never[]) => unknown>(
  instance: object,
  name: string,
): T {
  const prototype = Object.getPrototypeOf(instance) as Record<string, unknown>;
  const method = Reflect.get(prototype, name);

  if (typeof method !== 'function') {
    throw new Error(`Private method ${name} not found`);
  }

  return method.bind(instance) as T;
}

function createFetchResponse(body: unknown, ok = true, statusText = 'OK'): Response {
  return {
    ok,
    statusText,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe('AIReportsService', () => {
  let service: AIReportsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;
  let mockConfigService: Partial<ConfigService>;
  let mockOpenaiProvider: any;
  let mockGeminiProvider: any;
  let mockGroqProvider: any;
  let mockZaiProvider: any;
  let mockAiSettingsService: any;
  let mockWeatherProvider: any;
  let mockAiQuotaService: any;

  const organizationId = TEST_IDS.organization;
  const userId = TEST_IDS.user;
  const parcelId = TEST_IDS.parcel;

  const mockParcelWithFarm = {
    id: parcelId,
    name: 'Test Parcel',
    boundary: [[-7.1, 31.8], [-7.1, 31.85], [-7.15, 31.85], [-7.15, 31.8]],
    farms: { organization_id: organizationId },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);
    mockConfigService = createMockConfigService();

    mockOpenaiProvider = {
      generate: jest.fn(),
      validateConfig: jest.fn().mockReturnValue(true),
      getProviderName: jest.fn().mockReturnValue(AIProvider.OPENAI),
      setApiKey: jest.fn(),
    };

    mockGeminiProvider = {
      generate: jest.fn(),
      validateConfig: jest.fn().mockReturnValue(false),
      getProviderName: jest.fn().mockReturnValue(AIProvider.GEMINI),
      setApiKey: jest.fn(),
    };

    mockGroqProvider = {
      generate: jest.fn(),
      validateConfig: jest.fn().mockReturnValue(false),
      getProviderName: jest.fn().mockReturnValue(AIProvider.GROQ),
      setApiKey: jest.fn(),
    };

    mockZaiProvider = {
      generate: jest.fn(),
      validateConfig: jest.fn().mockReturnValue(false),
      getProviderName: jest.fn().mockReturnValue(AIProvider.ZAI),
      setApiKey: jest.fn(),
    };

    mockAiSettingsService = {
      getDecryptedApiKey: jest.fn().mockResolvedValue(null),
      getProviderSettings: jest.fn().mockResolvedValue([]),
    };

    mockWeatherProvider = {
      isConfigured: jest.fn().mockReturnValue(false),
    };

    mockAiQuotaService = {
      checkQuota: jest.fn().mockResolvedValue({ allowed: true, isByok: false }),
      consumeOne: jest.fn().mockResolvedValue(undefined),
      logUsage: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIReportsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OpenAIProvider, useValue: mockOpenaiProvider },
        { provide: GeminiProvider, useValue: mockGeminiProvider },
        { provide: GroqProvider, useValue: mockGroqProvider },
        { provide: ZaiProvider, useValue: mockZaiProvider },
        { provide: OrganizationAISettingsService, useValue: mockAiSettingsService },
        { provide: WeatherProvider, useValue: mockWeatherProvider },
        { provide: AiQuotaService, useValue: mockAiQuotaService },
      ],
    }).compile();

    service = module.get<AIReportsService>(AIReportsService);
  });

  describe('getDataAvailability', () => {
    it('should return data availability for a parcel', async () => {
      const satelliteData = [
        { date: '2026-01-15', index_name: 'NDVI' },
        { date: '2026-02-15', index_name: 'NDMI' },
      ];

      const satelliteThenable = thenableProxy(satelliteData);
      const analysisThenable = thenableProxy([{ id: 'a1', analysis_date: '2026-01-10' }]);

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'parcels' && callCount <= 2) {
          const b = createMockQueryBuilder();
          b.select.mockReturnValue(b);
          b.eq.mockReturnValue(b);
          b.single.mockResolvedValueOnce({ data: mockParcelWithFarm, error: null });
          b.lte.mockReturnValue(b);
          b.gte.mockReturnValue(b);
          b.order.mockReturnValue(b);
          return b;
        }
        if (table === 'satellite_indices_data') {
          return thenableProxy(satelliteData, null, { count: satelliteData.length });
        }
        if (table === 'analyses') {
          return analysisThenable;
        }
        return thenableProxy([]);
      });

      const result = await service.getDataAvailability(organizationId, parcelId);

      expect(result.parcel.name).toBe('Test Parcel');
      expect(result.satellite.dataPoints).toBe(2);
      expect(result.soil.available).toBe(true);
    });

    it('should throw BadRequestException if parcel not found', async () => {
      const builder = setupTableMock(mockClient, 'parcels');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      await expect(service.getDataAvailability(organizationId, 'nonexistent')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if parcel belongs to different org', async () => {
      const builder = setupTableMock(mockClient, 'parcels');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.single.mockResolvedValueOnce({
        data: { ...mockParcelWithFarm, farms: { organization_id: 'other-org' } },
        error: null,
      });

      await expect(service.getDataAvailability(organizationId, parcelId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAvailableProviders', () => {
    it('should return providers with OpenAI available via env config', async () => {
      mockOpenaiProvider.validateConfig.mockReturnValue(true);

      const result = await service.getAvailableProviders(organizationId);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            provider: AIProvider.OPENAI,
            available: true,
          }),
        ]),
      );
    });

    it('should include ZAI first if available', async () => {
      mockZaiProvider.validateConfig.mockReturnValue(true);

      const result = await service.getAvailableProviders(organizationId);

      expect(result[0].provider).toBe(AIProvider.ZAI);
      expect(result[0].available).toBe(true);
    });

    it('should check org settings when organizationId provided', async () => {
      mockAiSettingsService.getProviderSettings.mockResolvedValueOnce([
        { provider: 'gemini', configured: true, enabled: true },
      ]);

      const result = await service.getAvailableProviders(organizationId);

      expect(mockAiSettingsService.getProviderSettings).toHaveBeenCalledWith(organizationId);
    });

    it('should handle org settings fetch error gracefully', async () => {
      mockAiSettingsService.getProviderSettings.mockRejectedValueOnce(new Error('Settings error'));

      const result = await service.getAvailableProviders(organizationId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('resolveProvider', () => {
    it('should prefer non-ZAI provider when available', async () => {
      mockOpenaiProvider.validateConfig.mockReturnValue(true);
      mockZaiProvider.validateConfig.mockReturnValue(true);

      const result = await service.resolveProvider(organizationId);

      expect(result.provider).toBe(AIProvider.OPENAI);
      expect(result.model).toBe('gpt-4o');
    });

    it('should fall back to ZAI when no org providers available', async () => {
      mockOpenaiProvider.validateConfig.mockReturnValue(false);
      mockGeminiProvider.validateConfig.mockReturnValue(false);
      mockGroqProvider.validateConfig.mockReturnValue(false);
      mockZaiProvider.validateConfig.mockReturnValue(true);

      const result = await service.resolveProvider(organizationId);

      expect(result.provider).toBe(AIProvider.ZAI);
    });

    it('should default to ZAI with empty model when nothing is available', async () => {
      mockOpenaiProvider.validateConfig.mockReturnValue(false);
      mockZaiProvider.validateConfig.mockReturnValue(false);

      const result = await service.resolveProvider(organizationId);

      expect(result.provider).toBe(AIProvider.ZAI);
      expect(result.model).toBe('');
    });
  });

  describe('generateCalibrationSummary', () => {
    const blockA = {
      health_score: 75,
      health_label: 'Bon',
      confidence_score: 80,
      confidence_level: 'high',
      yield_range: { min: 3, max: 5, unit: 't/ha' },
      strengths: [{ component: 'NDVI', phrase: 'Bonne vigueur' }],
      concerns: [{ component: 'NDMI', phrase: 'Stress hydrique léger', severity: 'low' }],
    };

    it('should return null when quota exceeded', async () => {
      mockAiQuotaService.checkQuota.mockResolvedValueOnce({ allowed: false });

      const result = await service.generateCalibrationSummary(organizationId, userId, blockA);

      expect(result).toBeNull();
    });

    it('should return null when no API key available', async () => {
      mockAiSettingsService.getDecryptedApiKey.mockResolvedValue(null);
      (mockConfigService.get as jest.Mock).mockReturnValue(undefined);

      const result = await service.generateCalibrationSummary(organizationId, userId, blockA);

      expect(result).toBeNull();
    });

    it('should generate summary and consume quota on success', async () => {
      mockOpenaiProvider.validateConfig.mockReturnValue(true);
      mockAiSettingsService.getDecryptedApiKey.mockResolvedValue('test-key');
      mockOpenaiProvider.generate.mockResolvedValueOnce({
        content: 'La parcelle montre une bonne santé globale.',
        provider: AIProvider.OPENAI,
        model: 'gpt-4o',
        tokensUsed: 150,
        generatedAt: new Date(),
      });

      const result = await service.generateCalibrationSummary(organizationId, userId, blockA);

      expect(result).toBe('La parcelle montre une bonne santé globale.');
      expect(mockOpenaiProvider.setApiKey).toHaveBeenCalledWith('test-key');
      expect(mockAiQuotaService.consumeOne).toHaveBeenCalled();
    });

    it('should return null on generation error', async () => {
      mockOpenaiProvider.validateConfig.mockReturnValue(true);
      mockAiSettingsService.getDecryptedApiKey.mockResolvedValue('test-key');
      mockOpenaiProvider.generate.mockRejectedValueOnce(new Error('API error'));

      const result = await service.generateCalibrationSummary(organizationId, userId, blockA);

      expect(result).toBeNull();
    });
  });

  describe('generateReport', () => {
    const dto: GenerateAIReportDto = {
      parcel_id: parcelId,
      provider: AIProvider.OPENAI,
      model: 'gpt-4o',
      data_start_date: '2026-01-01',
      data_end_date: '2026-03-31',
      reportType: AgromindReportType.GENERAL,
      language: 'fr',
    };

    it('should throw BadRequestException if no API key configured', async () => {
      mockAiSettingsService.getDecryptedApiKey.mockResolvedValue(null);
      (mockConfigService.get as jest.Mock).mockReturnValue(undefined);

      await expect(service.generateReport(organizationId, userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for unknown provider', async () => {
      const invalidDto = { ...dto, provider: 'unknown' as unknown as AIProvider };
      mockAiSettingsService.getDecryptedApiKey.mockResolvedValue('key');

      await expect(
        service.generateReport(organizationId, userId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no API key available for the provider', async () => {
      mockAiSettingsService.getDecryptedApiKey.mockResolvedValue(null);
      (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return undefined;
        return undefined;
      });

      await expect(service.generateReport(organizationId, userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createReportJob', () => {
    it('should create a job and return job info', async () => {
      const jobData = {
        id: 'job-001',
        status: 'pending',
        progress: 0,
        created_at: '2026-04-16T10:00:00Z',
      };

      const builder = setupTableMock(mockClient, 'ai_report_jobs');
      builder.select.mockReturnValue(builder);
      builder.single.mockResolvedValueOnce({ data: jobData, error: null });

      const result = await service.createReportJob(organizationId, userId, {
        parcel_id: parcelId,
        provider: AIProvider.OPENAI,
        model: 'gpt-4o',
        data_start_date: '2026-01-01',
        data_end_date: '2026-03-31',
        reportType: AgromindReportType.GENERAL,
      });

      expect(result.job_id).toBe('job-001');
      expect(result.status).toBe('pending');
    });

    it('should throw InternalServerErrorException if job creation fails', async () => {
      const builder = setupTableMock(mockClient, 'ai_report_jobs');
      builder.select.mockReturnValue(builder);
      builder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      });

      await expect(
        service.createReportJob(organizationId, userId, {
          parcel_id: parcelId,
          provider: AIProvider.OPENAI,
          data_start_date: '2026-01-01',
          data_end_date: '2026-03-31',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for a valid job', async () => {
      const job = {
        id: 'job-001',
        status: 'completed',
        progress: 100,
        error_message: null,
        report_id: 'report-001',
        result: { success: true },
        created_at: '2026-04-16T10:00:00Z',
        started_at: '2026-04-16T10:00:01Z',
        completed_at: '2026-04-16T10:00:30Z',
      };

      const builder = setupTableMock(mockClient, 'ai_report_jobs');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.single.mockResolvedValueOnce({ data: job, error: null });

      const result = await service.getJobStatus(organizationId, 'job-001');

      expect(result.job_id).toBe('job-001');
      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
    });

    it('should throw BadRequestException if job not found', async () => {
      const builder = setupTableMock(mockClient, 'ai_report_jobs');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      await expect(service.getJobStatus(organizationId, 'nonexistent')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listJobs', () => {
    it('should return list of jobs for organization', async () => {
      const jobs = [
        { id: 'job-001', parcel_id: parcelId, provider: 'openai', status: 'completed', progress: 100 },
        { id: 'job-002', parcel_id: parcelId, provider: 'gemini', status: 'pending', progress: 0 },
      ];

      const builder = setupTableMock(mockClient, 'ai_report_jobs');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.order.mockReturnValue(builder);
      builder.limit.mockReturnValue(thenableProxy(jobs));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'ai_report_jobs') return builder;
        return thenableProxy([]);
      });

      const result = await service.listJobs(organizationId);

      expect(result.jobs).toEqual(jobs);
    });

    it('should filter by status when provided', async () => {
      const jobsResult = [
        { id: 'job-001', parcel_id: parcelId, provider: 'openai', status: 'pending', progress: 0 },
      ];

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'ai_report_jobs') {
          const b = createMockQueryBuilder();
          b.select.mockReturnValue(b);
          b.eq.mockReturnValue(b);
          b.order.mockReturnValue(b);
          b.limit.mockReturnValue(thenableProxy(jobsResult));
          b.in.mockReturnValue(b);
          b.or.mockReturnValue(b);
          b.update.mockReturnValue(b);
          return b;
        }
        return thenableProxy([]);
      });

      const result = await service.listJobs(organizationId, 'pending');

      expect(result.jobs).toEqual(jobsResult);
    });

    it('should throw InternalServerErrorException on query error', async () => {
      const builder = setupTableMock(mockClient, 'ai_report_jobs');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.order.mockReturnValue(builder);
      builder.limit.mockReturnValue(thenableProxy(null, { message: 'DB error' }));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'ai_report_jobs') return builder;
        return thenableProxy(null, { message: 'DB error' });
      });

      await expect(service.listJobs(organizationId)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('validateAnalysis', () => {
    const validateAnalysis = () =>
      getPrivateMethod<
        (organizationId: string, parcelId: string, startDate?: string, endDate?: string) => Promise<any>
      >(service, 'validateAnalysis');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-16T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('should return validation result with high accuracy when all data sources are present', async () => {
      const satelliteRows = [
        { date: '2026-04-14', cloud_coverage_percentage: 4 },
        { date: '2026-04-12', cloud_coverage_percentage: 6 },
      ];
      const analysisMap = {
        soil: { analysis_date: '2026-02-10' },
        water: { analysis_date: '2026-02-15' },
        plant: { analysis_date: '2026-04-01' },
      };
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          createFetchResponse({
            daily: {
              time: ['2026-04-10', '2026-04-11', '2026-04-12', '2026-04-13', '2026-04-14', '2026-04-15'],
            },
          }),
        );

      let satelliteCalls = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'parcels') {
          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.single.mockResolvedValue({
            data: { id: parcelId, boundary: mockParcelWithFarm.boundary },
            error: null,
          });
          return builder;
        }

        if (table === 'satellite_indices_data') {
          satelliteCalls += 1;
          if (satelliteCalls === 1) {
            return thenableProxy(satelliteRows);
          }

          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.order.mockReturnValue(builder);
          builder.limit.mockReturnValue(builder);
          builder.maybeSingle.mockResolvedValue({
            data: { date: '2026-04-15', cloud_coverage_percentage: 5 },
            error: null,
          });
          return builder;
        }

        if (table === 'analyses') {
          const builder = createMockQueryBuilder();
          let analysisType = '';
          builder.select.mockReturnValue(builder);
          builder.eq.mockImplementation((field: string, value: string) => {
            if (field === 'analysis_type') {
              analysisType = value;
            }
            return builder;
          });
          builder.order.mockReturnValue(builder);
          builder.limit.mockReturnValue(builder);
          builder.maybeSingle.mockImplementation(async () => ({
            data: analysisMap[analysisType as keyof typeof analysisMap] ?? null,
            error: null,
          }));
          return builder;
        }

        return createMockQueryBuilder();
      });

      const result = await validateAnalysis()(organizationId, parcelId, '2026-04-10', '2026-04-15');

      expect(result.status).toBe('ready');
      expect(result.accuracy).toBe(100);
      expect(result.missingData).toEqual([]);
      expect(result.satellite.imageCount).toBe(2);
      expect(result.satellite.ageDays).toBe(1);
      expect(result.weather.status).toBe('available');
      expect(result.weather.completeness).toBeGreaterThan(100);
      expect(result.soil.isValid).toBe(true);
      expect(result.water.isValid).toBe(true);
      expect(result.plant.isValid).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should return missing data flags when satellite and weather data are missing', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'parcels') {
          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.single.mockResolvedValue({
            data: { id: parcelId, boundary: null },
            error: null,
          });
          return builder;
        }

        if (table === 'satellite_indices_data') {
          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.gte.mockReturnValue(builder);
          builder.lte.mockReturnValue(builder);
          builder.order.mockReturnValue(builder);
          builder.limit.mockReturnValue(builder);
          setupThenableMock(builder, []);
          builder.maybeSingle.mockResolvedValue({ data: null, error: null });
          return builder;
        }

        if (table === 'analyses') {
          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.order.mockReturnValue(builder);
          builder.limit.mockReturnValue(builder);
          builder.maybeSingle.mockResolvedValue({ data: null, error: null });
          return builder;
        }

        return createMockQueryBuilder();
      });

      const result = await validateAnalysis()(organizationId, parcelId);

      expect(result.status).toBe('blocked');
      expect(result.accuracy).toBe(0);
      expect(result.missingData).toEqual(expect.arrayContaining(['satellite', 'weather']));
      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Fetch at least 2 satellite images'),
          expect.stringContaining('Weather data is missing'),
          expect.stringContaining('Add soil analysis'),
          expect.stringContaining('Add water analysis'),
          expect.stringContaining('Add plant analysis'),
        ]),
      );
    });

    it('should flag stale satellite data and calculate daysSinceLastSatellite correctly', async () => {
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          createFetchResponse({
            daily: {
              time: ['2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12', '2026-04-13', '2026-04-14', '2026-04-15'],
            },
          }),
        );

      let satelliteCalls = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'parcels') {
          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.single.mockResolvedValue({
            data: { id: parcelId, boundary: mockParcelWithFarm.boundary },
            error: null,
          });
          return builder;
        }

        if (table === 'satellite_indices_data') {
          satelliteCalls += 1;
          if (satelliteCalls === 1) {
            return thenableProxy([
              { date: '2026-04-06', cloud_coverage_percentage: 5 },
              { date: '2026-04-05', cloud_coverage_percentage: 6 },
            ]);
          }

          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.order.mockReturnValue(builder);
          builder.limit.mockReturnValue(builder);
          builder.maybeSingle.mockResolvedValue({
            data: { date: '2026-04-06', cloud_coverage_percentage: 5 },
            error: null,
          });
          return builder;
        }

        if (table === 'analyses') {
          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.order.mockReturnValue(builder);
          builder.limit.mockReturnValue(builder);
          builder.maybeSingle.mockResolvedValue({ data: null, error: null });
          return builder;
        }

        return createMockQueryBuilder();
      });

      const result = await validateAnalysis()(organizationId, parcelId, '2026-04-09', '2026-04-15');

      expect(result.satellite.status).toBe('stale');
      expect(result.satellite.ageDays).toBe(10);
      expect(result.weather.status).toBe('available');
      expect(result.weather.completeness).toBeGreaterThan(100);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle missing parcel gracefully without throwing', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'parcels') {
          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });
          return builder;
        }

        if (table === 'satellite_indices_data') {
          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.gte.mockReturnValue(builder);
          builder.lte.mockReturnValue(builder);
          builder.order.mockReturnValue(builder);
          builder.limit.mockReturnValue(builder);
          setupThenableMock(builder, []);
          builder.maybeSingle.mockResolvedValue({ data: null, error: null });
          return builder;
        }

        if (table === 'analyses') {
          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.order.mockReturnValue(builder);
          builder.limit.mockReturnValue(builder);
          builder.maybeSingle.mockResolvedValue({ data: null, error: null });
          return builder;
        }

        return createMockQueryBuilder();
      });

      const result = await validateAnalysis()(organizationId, parcelId);

      expect(result.status).toBe('blocked');
      expect(result.weather.status).toBe('missing');
      expect(result.missingData).toEqual(expect.arrayContaining(['satellite', 'weather']));
    });
  });

  describe('recalibrate', () => {
    it('should return the validation result unchanged', async () => {
      const validationResult = {
        status: 'warning',
        accuracy: 60,
        missingData: ['weather'],
        recommendations: ['Fetch weather data'],
      };
      const validateSpy = jest
        .spyOn(
          service as unknown as {
            validateAnalysis: (organizationId: string, parcelId: string, startDate?: string, endDate?: string) => Promise<any>;
          },
          'validateAnalysis',
        )
        .mockResolvedValue(validationResult);

      const result = await service.recalibrate(organizationId, parcelId, {
        forceRefetch: false,
        autoFetch: false,
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      });

      expect(result).toBe(validationResult);
      expect(validateSpy).toHaveBeenCalledWith(organizationId, parcelId, '2026-01-01', '2026-03-31');
    });

    it('should log missing data when autoFetch is enabled', async () => {
      const logger = Reflect.get(service as object, 'logger') as { log: (...args: string[]) => void };
      const logSpy = jest.spyOn(logger, 'log');
      jest
        .spyOn(
          service as unknown as {
            validateAnalysis: (organizationId: string, parcelId: string) => Promise<any>;
          },
          'validateAnalysis',
        )
        .mockResolvedValue({
          status: 'blocked',
          accuracy: 25,
          missingData: ['weather', 'satellite'],
          recommendations: [],
        });

      await service.recalibrate(organizationId, parcelId, {
        forceRefetch: true,
        autoFetch: true,
      });

      expect(logSpy).toHaveBeenCalledWith(
        'Auto-fetch enabled for missing data: weather, satellite',
      );
    });
  });

  describe('fetchData', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should fetch weather and satellite data for a parcel', async () => {
      mockWeatherProvider.isConfigured.mockReturnValue(true);
      (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'SATELLITE_SERVICE_URL') return 'http://satellite.test';
        return undefined;
      });

      const weatherUpsertBuilder = createMockQueryBuilder();
      const satelliteUpsertBuilder = createMockQueryBuilder();
      let parcelCalls = 0;

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'parcels') {
          parcelCalls += 1;
          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.single.mockResolvedValue({
            data:
              parcelCalls === 1
                ? { id: parcelId, boundary: mockParcelWithFarm.boundary, name: 'Test Parcel' }
                : { farms: { organization_id: organizationId } },
            error: null,
          });
          return builder;
        }

        if (table === 'weather_data') {
          return weatherUpsertBuilder;
        }

        if (table === 'satellite_indices_data') {
          return satelliteUpsertBuilder;
        }

        return createMockQueryBuilder();
      });

      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          createFetchResponse({
            daily: {
              time: ['2026-04-14', '2026-04-15'],
              temperature_2m_min: [10, 12],
              temperature_2m_mean: [18, 19],
              temperature_2m_max: [24, 26],
              precipitation_sum: [0, 3],
              relative_humidity_2m: [45, 50],
            },
          }),
        )
        .mockResolvedValueOnce(
          createFetchResponse({
            date: '2026-04-15',
            cloud_coverage: 5,
            indices: [
              { index: 'NDVI', value: 0.62 },
              { index: 'NDMI', value: 0.31 },
            ],
          }),
        );

      const result = await service.fetchData(organizationId, parcelId, {
        dataSources: ['weather', 'satellite'],
      });

      expect(result.success).toBe(true);
      expect(result.fetched).toEqual(expect.arrayContaining(['weather', 'satellite']));
      expect(result.pending).toEqual([]);
      expect(weatherUpsertBuilder.upsert).toHaveBeenCalledTimes(2);
      expect(satelliteUpsertBuilder.upsert).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle missing boundary gracefully', async () => {
      mockWeatherProvider.isConfigured.mockReturnValue(true);
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'parcels') {
          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.single.mockResolvedValue({
            data: { id: parcelId, boundary: null, name: 'No Boundary' },
            error: null,
          });
          return builder;
        }

        return createMockQueryBuilder();
      });

      const result = await service.fetchData(organizationId, parcelId, {
        dataSources: ['weather'],
      });

      expect(result.success).toBe(false);
      expect(result.fetched).toEqual([]);
      expect(result.pending).toEqual(['weather']);
    });

    it('should handle API errors', async () => {
      mockWeatherProvider.isConfigured.mockReturnValue(true);
      (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'SATELLITE_SERVICE_URL') return 'http://satellite.test';
        return undefined;
      });

      let parcelCalls = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'parcels') {
          parcelCalls += 1;
          const builder = createMockQueryBuilder();
          builder.select.mockReturnValue(builder);
          builder.eq.mockReturnValue(builder);
          builder.single.mockResolvedValue({
            data:
              parcelCalls === 1
                ? { id: parcelId, boundary: mockParcelWithFarm.boundary, name: 'Test Parcel' }
                : { farms: { organization_id: organizationId } },
            error: null,
          });
          return builder;
        }

        return createMockQueryBuilder();
      });

      jest
        .spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Weather down'))
        .mockResolvedValueOnce(createFetchResponse('boom', false, 'Server Error'));

      const result = await service.fetchData(organizationId, parcelId, {
        dataSources: ['weather', 'satellite'],
      });

      expect(result.success).toBe(false);
      expect(result.pending).toEqual(expect.arrayContaining(['weather', 'satellite']));
    });
  });

  describe('private persistence and parsing helpers', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should store report with health assessment, recommendations, and risk alerts', async () => {
      const storeReport = getPrivateMethod<
        (
          organizationId: string,
          userId: string,
          parcelId: string,
          provider: AIProvider,
          sections: Record<string, unknown>,
          parcelName: string,
          dataSnapshot: unknown,
          reportType: AgromindReportType,
        ) => Promise<any>
      >(service, 'storeReport');

      const storedRow = { id: 'report-123' };
      const builder = setupTableMock(mockClient, 'parcel_reports');
      builder.insert.mockReturnValue(builder);
      builder.select.mockReturnValue(builder);
      builder.single.mockResolvedValue({ data: storedRow, error: null });

      const sections = {
        healthAssessment: { overallScore: 84 },
        recommendations: [{ id: 1 }, { id: 2 }],
        riskAlerts: [{ id: 1 }],
      };

      const result = await storeReport(
        organizationId,
        userId,
        parcelId,
        AIProvider.OPENAI,
        sections,
        'Parcel Nord',
        { snapshot: true },
        AgromindReportType.GENERAL,
      );

      expect(result).toBe(storedRow);
      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          parcel_id: parcelId,
          generated_by: userId,
          metadata: expect.objectContaining({
            health_score: 84,
            recommendations_count: 2,
            risk_alerts_count: 1,
            provider: AIProvider.OPENAI,
          }),
        }),
      );
    });

    it('should handle database error when storing a report', async () => {
      const storeReport = getPrivateMethod<
        (
          organizationId: string,
          userId: string,
          parcelId: string,
          provider: AIProvider,
          sections: Record<string, unknown>,
          parcelName: string,
          dataSnapshot: unknown,
          reportType: AgromindReportType,
        ) => Promise<any>
      >(service, 'storeReport');

      const builder = setupTableMock(mockClient, 'parcel_reports');
      builder.insert.mockReturnValue(builder);
      builder.select.mockReturnValue(builder);
      builder.single.mockResolvedValue({ data: null, error: { message: 'insert failed' } });

      await expect(
        storeReport(
          organizationId,
          userId,
          parcelId,
          AIProvider.OPENAI,
          {},
          'Parcel Nord',
          null,
          AgromindReportType.GENERAL,
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should parse JSON wrapped in a markdown code block', () => {
      const parseAIResponse = getPrivateMethod<(content: string) => Record<string, unknown>>(
        service,
        'parseAIResponse',
      );

      expect(parseAIResponse('```json\n{"summary":"ok"}\n```')).toEqual({ summary: 'ok' });
    });

    it('should parse plain JSON', () => {
      const parseAIResponse = getPrivateMethod<(content: string) => Record<string, unknown>>(
        service,
        'parseAIResponse',
      );

      expect(parseAIResponse('{"summary":"plain"}')).toEqual({ summary: 'plain' });
    });

    it('should handle invalid JSON', () => {
      const parseAIResponse = getPrivateMethod<(content: string) => Record<string, unknown>>(
        service,
        'parseAIResponse',
      );

      expect(() => parseAIResponse('not json')).toThrow(InternalServerErrorException);
    });

    it('should handle an empty response', () => {
      const parseAIResponse = getPrivateMethod<(content: string) => Record<string, unknown>>(
        service,
        'parseAIResponse',
      );

      expect(() => parseAIResponse('')).toThrow(InternalServerErrorException);
    });
  });

  describe('job processing helpers', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should find jobs stuck beyond the threshold and mark them as failed', async () => {
      const cleanupStuckJobs = getPrivateMethod<(organizationId: string) => Promise<void>>(
        service,
        'cleanupStuckJobs',
      );

      let calls = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'ai_report_jobs') {
          calls += 1;
          if (calls === 1) {
            return thenableProxy([
              { id: 'job-1', status: 'processing', started_at: '2026-04-16T10:00:00Z', created_at: '2026-04-16T09:59:00Z' },
              { id: 'job-2', status: 'pending', started_at: null, created_at: '2026-04-16T09:58:00Z' },
            ]);
          }

          return thenableProxy([]);
        }

        return createMockQueryBuilder();
      });

      await cleanupStuckJobs(organizationId);

      expect(mockClient.from).toHaveBeenCalledWith('ai_report_jobs');
    });

    it('should handle an empty stuck jobs list', async () => {
      const cleanupStuckJobs = getPrivateMethod<(organizationId: string) => Promise<void>>(
        service,
        'cleanupStuckJobs',
      );

      const builder = setupTableMock(mockClient, 'ai_report_jobs');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.in.mockReturnValue(builder);
      builder.or.mockReturnValue(thenableProxy([]));

      await cleanupStuckJobs(organizationId);

      expect(builder.update).not.toHaveBeenCalled();
    });

    it('should process a background job from generation to completion', async () => {
      const processJobInBackground = getPrivateMethod<
        (jobId: string, organizationId: string, userId: string, dto: GenerateAIReportDto) => Promise<void>
      >(service, 'processJobInBackground');

      const jobBuilder = setupTableMock(mockClient, 'ai_report_jobs');
      jobBuilder.update.mockReturnValue(jobBuilder);
      jobBuilder.eq.mockReturnValue(jobBuilder);
      setupThenableMock(jobBuilder, []);

      jest
        .spyOn(
          service as unknown as {
            calibrateParcelData: (organizationId: string, parcelId: string, startDate?: string, endDate?: string) => Promise<void>;
          },
          'calibrateParcelData',
        )
        .mockResolvedValue(undefined);
      jest
        .spyOn(
          service as unknown as {
            buildReportPayload: (organizationId: string, dto: GenerateAIReportDto) => Promise<any>;
          },
          'buildReportPayload',
        )
        .mockResolvedValue({
          systemPrompt: 'system',
          userPrompt: 'user',
          parcelName: 'Parcel',
          dataSnapshot: { snapshot: true },
          reportType: AgromindReportType.GENERAL,
        });
      jest
        .spyOn(
          service as unknown as {
            parseAIResponse: (content: string) => Record<string, unknown>;
          },
          'parseAIResponse',
        )
        .mockReturnValue({ summary: 'ok' });
      jest
        .spyOn(
          service as unknown as {
            storeReport: (
              organizationId: string,
              userId: string,
              parcelId: string,
              provider: AIProvider,
              sections: Record<string, unknown>,
              parcelName: string,
              dataSnapshot: unknown,
              reportType: AgromindReportType,
            ) => Promise<any>;
          },
          'storeReport',
        )
        .mockResolvedValue({ id: 'report-001' });

      mockAiSettingsService.getDecryptedApiKey.mockResolvedValue('test-key');
      mockOpenaiProvider.generate.mockResolvedValue({
        content: '{"summary":"ok"}',
        provider: AIProvider.OPENAI,
        model: 'gpt-4o',
        tokensUsed: 123,
        generatedAt: new Date('2026-04-16T12:00:00.000Z'),
      });

      await processJobInBackground('job-001', organizationId, userId, {
        parcel_id: parcelId,
        provider: AIProvider.OPENAI,
        model: 'gpt-4o',
        data_start_date: '2026-01-01',
        data_end_date: '2026-03-31',
        reportType: AgromindReportType.GENERAL,
      });

      expect(mockOpenaiProvider.setApiKey).toHaveBeenCalledWith('test-key');
      expect(jobBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed', progress: 100, report_id: 'report-001' }),
      );
    });
  });

  describe('private utility helpers', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-16T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('should cover numeric and date helper methods', () => {
      const toNumber = getPrivateMethod<(value: unknown) => number | undefined>(service, 'toNumber');
      const getDefaultDateRange = getPrivateMethod<
        (startDate?: string, endDate?: string) => { defaultStartDate: string; defaultEndDate: string }
      >(service, 'getDefaultDateRange');
      const classifyConfidenceLevel = getPrivateMethod<(value: unknown) => string>(
        service,
        'classifyConfidenceLevel',
      );
      const diffDays = getPrivateMethod<(start: string, end: string) => number>(service, 'diffDays');
      const averageDefined = getPrivateMethod<(values: Array<number | undefined>) => number | undefined>(
        service,
        'averageDefined',
      );
      const countConsecutiveDryDays = getPrivateMethod<
        (rows: Array<Record<string, unknown>>) => number
      >(service, 'countConsecutiveDryDays');
      const inferEvaluationWindowDays = getPrivateMethod<
        (indicator: string | null, action: string | null) => number
      >(service, 'inferEvaluationWindowDays');
      const monthNumberToLabel = getPrivateMethod<(month: number) => string>(
        service,
        'monthNumberToLabel',
      );

      expect(toNumber(42)).toBe(42);
      expect(toNumber('12.5')).toBe(12.5);
      expect(toNumber(null)).toBeUndefined();
      expect(toNumber(undefined)).toBeUndefined();
      expect(toNumber('abc')).toBeUndefined();

      expect(getDefaultDateRange()).toEqual({
        defaultStartDate: '2025-10-16',
        defaultEndDate: '2026-04-16',
      });
      expect(getDefaultDateRange('2026-01-01', '2026-03-31')).toEqual({
        defaultStartDate: '2026-01-01',
        defaultEndDate: '2026-03-31',
      });

      expect(classifyConfidenceLevel(0.8)).toBe('elevee');
      expect(classifyConfidenceLevel(60)).toBe('moyenne');
      expect(classifyConfidenceLevel(20)).toBe('faible');
      expect(classifyConfidenceLevel('nope')).toBe('moyenne');

      expect(diffDays('2026-04-01', '2026-04-16')).toBe(15);
      expect(diffDays('bad', '2026-04-16')).toBe(0);

      expect(averageDefined([1, undefined, 3])).toBe(2);
      expect(averageDefined([undefined, undefined])).toBeUndefined();

      expect(
        countConsecutiveDryDays([
          { precipitation_sum: 5 },
          { precipitation_sum: 0.1 },
          { precipitation_sum: 0 },
          { precipitation_sum: 0.2 },
        ]),
      ).toBe(3);

      expect(inferEvaluationWindowDays('NDMI', 'irrigation')).toBe(7);
      expect(inferEvaluationWindowDays('NDRE', 'fertigation')).toBe(14);
      expect(inferEvaluationWindowDays('NDVI', 'observation')).toBe(10);

      expect(monthNumberToLabel(1)).toBe('janvier');
      expect(monthNumberToLabel(12)).toBe('decembre');
      expect(monthNumberToLabel(50)).toBe('decembre');
    });

    it('should map soil, water, and plant analyses into report payload structures', () => {
      const mapAnalysisToSoilData = getPrivateMethod<(analysis: { analysis_date: string; data: unknown } | null) => Record<string, unknown> | undefined>(
        service,
        'mapAnalysisToSoilData',
      );
      const mapAnalysisToWaterData = getPrivateMethod<(analysis: { analysis_date: string; data: unknown } | null) => Record<string, unknown> | undefined>(
        service,
        'mapAnalysisToWaterData',
      );
      const mapAnalysisToPlantData = getPrivateMethod<(analysis: { analysis_date: string; data: unknown } | null) => Record<string, unknown> | undefined>(
        service,
        'mapAnalysisToPlantData',
      );

      expect(
        mapAnalysisToSoilData({
          analysis_date: '2026-03-01',
          data: { ph_level: '7.4', organic_matter_percentage: 2.1, total_limestone: '12' },
        }),
      ).toEqual(
        expect.objectContaining({
          latestDate: '2026-03-01',
          phLevel: 7.4,
          organicMatter: 2.1,
          totalLimestone: 12,
        }),
      );
      expect(
        mapAnalysisToWaterData({
          analysis_date: '2026-03-02',
          data: { ph_level: '6.8', sodium: '22', bicarbonates: '140' },
        }),
      ).toEqual(
        expect.objectContaining({ latestDate: '2026-03-02', ph: 6.8, sodium: 22, bicarbonates: 140 }),
      );
      expect(
        mapAnalysisToPlantData({
          analysis_date: '2026-03-03',
          data: { nitrogen_percent: '2.4', calcium: '1.2', sodium_percent: '0.1' },
        }),
      ).toEqual(
        expect.objectContaining({ latestDate: '2026-03-03', nitrogenPercent: 2.4, calcium: 1.2, sodium: 0.1 }),
      );
      expect(mapAnalysisToSoilData(null)).toBeUndefined();
    });

    it('should build current satellite data and recent trends', () => {
      const buildCurrentSatelliteData = getPrivateMethod<
        (
          rows: Array<{ date: string; index_name: string; mean_value: number | string | null; cloud_coverage_percentage?: number | null }>,
          percentiles: Record<string, { p10?: number; p25?: number; p50?: number; p75?: number; p90?: number }>,
          fallbackDate: string,
        ) => Record<string, unknown>
      >(service, 'buildCurrentSatelliteData');
      const buildRecentSatelliteTrends = getPrivateMethod<
        (rows: Array<{ date: string; index_name: string; mean_value: number | string | null }>) => Record<string, unknown> | undefined
      >(service, 'buildRecentSatelliteTrends');

      const current = buildCurrentSatelliteData(
        [
          { date: '2026-04-10', index_name: 'NDVI', mean_value: '0.5', cloud_coverage_percentage: 12 },
          { date: '2026-04-12', index_name: 'NDVI', mean_value: '0.7', cloud_coverage_percentage: 12 },
          { date: '2026-04-12', index_name: 'NDMI', mean_value: 0.33, cloud_coverage_percentage: 12 },
        ],
        { ndvi: { p75: 0.8, p25: 0.4 }, ndmi: { p75: 0.4, p25: 0.2 } },
        '2026-04-01',
      );

      expect(current).toEqual(
        expect.objectContaining({
          date: '2026-04-12',
          quality: 'bonne',
          ndvi: 0.7,
          ndmi: 0.33,
          ndviPosition: 'P25-P75',
        }),
      );

      expect(
        buildRecentSatelliteTrends([
          { date: '2026-04-12', index_name: 'NDVI', mean_value: 0.7 },
          { date: '2026-04-10', index_name: 'NDVI', mean_value: 0.5 },
          { date: '2026-04-08', index_name: 'NDVI', mean_value: 0.4 },
          { date: '2026-04-12', index_name: 'NDMI', mean_value: 0.3 },
        ]),
      ).toEqual(
        expect.objectContaining({
          ndvi: expect.arrayContaining([{ date: '2026-04-12', value: 0.7 }]),
          ndmi: expect.arrayContaining([{ date: '2026-04-12', value: 0.3 }]),
        }),
      );
      expect(buildRecentSatelliteTrends([])).toBeUndefined();
    });

    it('should fetch same period last year snapshot', async () => {
      const fetchSamePeriodLastYearSnapshot = getPrivateMethod<
        (parcelId: string, endDate: string) => Promise<Record<string, unknown> | undefined>
      >(service, 'fetchSamePeriodLastYearSnapshot');

      const builder = setupTableMock(mockClient, 'satellite_indices_data');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.gte.mockReturnValue(builder);
      builder.lte.mockReturnValue(builder);
      builder.in.mockReturnValue(builder);
      builder.order.mockReturnValue(thenableProxy([
        { date: '2025-04-15', index_name: 'NDVI', mean_value: '0.62' },
        { date: '2025-04-15', index_name: 'NDMI', mean_value: '0.28' },
      ]));

      const result = await fetchSamePeriodLastYearSnapshot(parcelId, '2026-04-16');

      expect(result).toEqual({
        date: '2025-04-15',
        values: { ndvi: 0.62, ndmi: 0.28 },
      });
    });

    it('should fetch weather summaries and fall back to defaults', async () => {
      const fetchWeatherData = getPrivateMethod<
        (boundary: unknown, startDate: string, endDate: string) => Promise<Record<string, unknown>>
      >(service, 'fetchWeatherData');
      const getDefaultWeatherData = getPrivateMethod<
        (startDate: string, endDate: string) => Record<string, unknown>
      >(service, 'getDefaultWeatherData');

      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          createFetchResponse({
            daily: {
              time: ['2026-04-10', '2026-04-11', '2026-04-12', '2026-04-13', '2026-04-14'],
              temperature_2m_min: [-1, 0, 1, 2, 3],
              temperature_2m_mean: [5, 6, 7, 8, 9],
              temperature_2m_max: [10, 11, 12, 13, 14],
              precipitation_sum: [0, 0, 0, 0, 0],
            },
          }),
        )
        .mockResolvedValueOnce(createFetchResponse({}, false, 'Bad Request'));

      const weather = await fetchWeatherData(mockParcelWithFarm.boundary, '2026-04-10', '2026-04-14');

      expect(weather).toEqual(
        expect.objectContaining({
          precipitationTotal: 0,
          drySpellsCount: 1,
          frostDays: 1,
          temperatureSummary: { avgMin: 1, avgMax: 12, avgMean: 7 },
        }),
      );

      expect(getDefaultWeatherData('2026-04-01', '2026-04-07')).toEqual({
        period: { start: '2026-04-01', end: '2026-04-07' },
        temperatureSummary: { avgMin: 0, avgMax: 0, avgMean: 0 },
        precipitationTotal: 0,
        drySpellsCount: 0,
        frostDays: 0,
      });
      expect(await fetchWeatherData(null, '2026-04-01', '2026-04-07')).toEqual(
        getDefaultWeatherData('2026-04-01', '2026-04-07'),
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
