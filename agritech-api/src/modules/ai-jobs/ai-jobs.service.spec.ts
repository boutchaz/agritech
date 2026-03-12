import { Test, TestingModule } from '@nestjs/testing';
import { AiAlertsService } from '../ai-alerts/ai-alerts.service';
import { AiDiagnosticsService } from '../ai-diagnostics/ai-diagnostics.service';
import { AiRecommendationsService } from '../ai-recommendations/ai-recommendations.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  mockQueryResult,
  setupThenableMock,
  MockDatabaseService,
  MockQueryBuilder,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { AiJobsService } from './ai-jobs.service';

describe('AiJobsService', () => {
  let service: AiJobsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;
  let diagnosticsService: jest.Mocked<Pick<AiDiagnosticsService, 'getDiagnostics'>>;
  let alertsService: jest.Mocked<Pick<AiAlertsService, 'createAiAlert'>>;
  let recommendationsService: jest.Mocked<
    Pick<AiRecommendationsService, 'createRecommendation'>
  >;
  let fetchMock: jest.MockedFunction<typeof fetch>;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);
    diagnosticsService = {
      getDiagnostics: jest.fn(),
    };
    alertsService = {
      createAiAlert: jest.fn(),
    };
    recommendationsService = {
      createRecommendation: jest.fn(),
    };
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiJobsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: AiDiagnosticsService, useValue: diagnosticsService },
        { provide: AiAlertsService, useValue: alertsService },
        { provide: AiRecommendationsService, useValue: recommendationsService },
      ],
    }).compile();

    service = module.get<AiJobsService>(AiJobsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: originalFetch,
    });
  });

  it('runDailyWeatherFetch calls the historical weather API and isolates parcel failures', async () => {
    const parcelsQuery = createThenableQuery([
      {
        id: 'parcel-1',
        organization_id: 'org-1',
        crop_type: 'olive',
        boundary: null,
      },
      {
        id: 'parcel-2',
        organization_id: 'org-2',
        crop_type: 'olive',
        boundary: [[-7.5, 33.6], [-7.51, 33.6], [-7.5, 33.61]],
      },
    ]);
    const weatherUpsertQuery = createThenableQuery([]);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelsQuery;
      if (table === 'weather_daily_data') return weatherUpsertQuery;
      return createMockQueryBuilder();
    });

    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        latitude: 33.6,
        longitude: -7.5,
        source: 'open-meteo-archive',
        data: [
          {
            date: '2026-03-12',
            temperature_min: 9,
            temperature_max: 20,
            precipitation_sum: 1.2,
            et0_fao_evapotranspiration: 3.4,
          },
        ],
      }),
    );

    const result = await service.runDailyWeatherFetch();

    expect(result).toEqual({ processed: 2, succeeded: 1, failed: 1, skipped: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/weather/historical');
    expect(weatherUpsertQuery.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          latitude: 33.6,
          longitude: -7.5,
          date: '2026-03-12',
        }),
      ]),
      { onConflict: 'latitude,longitude,date' },
    );
  });

  it('runDailyAiPipelineTrigger runs diagnostics and creates alerts without propagating parcel errors', async () => {
    const parcelsQuery = createThenableQuery([
      {
        id: 'parcel-1',
        organization_id: 'org-1',
        crop_type: 'olive',
        boundary: [[-7.5, 33.6], [-7.51, 33.6], [-7.5, 33.61]],
      },
      {
        id: 'parcel-2',
        organization_id: 'org-2',
        crop_type: 'olive',
        boundary: [[-7.4, 33.5], [-7.41, 33.5], [-7.4, 33.51]],
      },
    ]);
    const satelliteQuery = createMockQueryBuilder();
    satelliteQuery.select.mockReturnValue(satelliteQuery);
    satelliteQuery.eq.mockReturnValue(satelliteQuery);
    satelliteQuery.gte.mockReturnValue(satelliteQuery);
    satelliteQuery.order.mockReturnValue(satelliteQuery);
    satelliteQuery.limit.mockReturnValue(satelliteQuery);
    satelliteQuery.maybeSingle
      .mockResolvedValueOnce(mockQueryResult({ date: '2026-03-11' }))
      .mockResolvedValueOnce(mockQueryResult({ date: '2026-03-11' }));

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelsQuery;
      if (table === 'satellite_indices_data') return satelliteQuery;
      return createMockQueryBuilder();
    });

    diagnosticsService.getDiagnostics
      .mockRejectedValueOnce(new Error('diagnostics failed'))
      .mockResolvedValueOnce({
        scenario: 'Severe stress detected',
        scenario_code: 'D',
        confidence: 0.9,
        description: 'Strong vegetation stress detected.',
        indicators: {
          reading_date: '2026-03-12',
          baseline_ndvi: 0.5,
          current_ndvi: 0.2,
          ndvi_delta: -0.3,
          ndvi_band: 'alert',
          ndvi_trend: 'declining',
          baseline_ndre: 0.3,
          current_ndre: 0.1,
          ndre_delta: -0.2,
          ndre_status: 'low',
          ndre_trend: 'declining',
          baseline_ndmi: 0.2,
          current_ndmi: 0.1,
          ndmi_delta: -0.1,
          ndmi_trend: 'declining',
          water_balance: -25,
          weather_anomaly: true,
        },
      });
    alertsService.createAiAlert.mockResolvedValue({
      id: 'alert-1',
      parcel_id: 'parcel-2',
      organization_id: 'org-2',
      alert_type: 'ai_drought_stress',
      severity: 'critical',
      title: 'AI: Severe stress detected',
      description: 'Strong vegetation stress detected.',
      acknowledged_at: null,
      resolved_at: null,
      is_ai_generated: true,
      alert_code: 'AI-SCENARIO-D',
      category: 'ai_pipeline',
      priority: 'high',
      entry_threshold: null,
      exit_threshold: null,
      trigger_data: null,
      satellite_reading_id: null,
      action_delay: null,
      created_at: '2026-03-12T00:00:00.000Z',
      updated_at: '2026-03-12T00:00:00.000Z',
    });

    const result = await service.runDailyAiPipelineTrigger();

    expect(result).toEqual({ processed: 2, succeeded: 1, failed: 1, skipped: 0 });
    expect(diagnosticsService.getDiagnostics).toHaveBeenCalledTimes(2);
    expect(alertsService.createAiAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        parcel_id: 'parcel-2',
        organization_id: 'org-2',
        alert_type: 'ai_drought_stress',
        severity: 'critical',
      }),
    );
  });

  it('runDailyAiPipelineTrigger skips alert creation when unresolved alert already exists', async () => {
    const parcelsQuery = createThenableQuery([
      {
        id: 'parcel-1',
        organization_id: 'org-1',
        crop_type: 'olive',
        boundary: [[-7.5, 33.6], [-7.51, 33.6], [-7.5, 33.61]],
      },
    ]);
    const satelliteQuery = createMockQueryBuilder();
    satelliteQuery.select.mockReturnValue(satelliteQuery);
    satelliteQuery.eq.mockReturnValue(satelliteQuery);
    satelliteQuery.gte.mockReturnValue(satelliteQuery);
    satelliteQuery.order.mockReturnValue(satelliteQuery);
    satelliteQuery.limit.mockReturnValue(satelliteQuery);
    satelliteQuery.maybeSingle.mockResolvedValueOnce(
      mockQueryResult({ date: '2026-03-11' }),
    );

    const alertsQuery = createMockQueryBuilder();
    alertsQuery.select.mockReturnValue(alertsQuery);
    alertsQuery.eq.mockReturnValue(alertsQuery);
    alertsQuery.is.mockReturnValue(alertsQuery);
    alertsQuery.limit.mockReturnValue(alertsQuery);
    alertsQuery.maybeSingle.mockResolvedValueOnce(
      mockQueryResult({ id: 'existing-alert-1' }),
    );

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelsQuery;
      if (table === 'satellite_indices_data') return satelliteQuery;
      if (table === 'performance_alerts') return alertsQuery;
      return createMockQueryBuilder();
    });

    diagnosticsService.getDiagnostics.mockResolvedValueOnce({
      scenario: 'Severe stress detected',
      scenario_code: 'D',
      confidence: 0.9,
      description: 'Strong vegetation stress detected.',
      indicators: {
        reading_date: '2026-03-12',
        baseline_ndvi: 0.5,
        current_ndvi: 0.2,
        ndvi_delta: -0.3,
        ndvi_band: 'alert',
        ndvi_trend: 'declining',
        baseline_ndre: 0.3,
        current_ndre: 0.1,
        ndre_delta: -0.2,
        ndre_status: 'low',
        ndre_trend: 'declining',
        baseline_ndmi: 0.2,
        current_ndmi: 0.1,
        ndmi_delta: -0.1,
        ndmi_trend: 'declining',
        water_balance: -25,
        weather_anomaly: true,
      },
    });

    const result = await service.runDailyAiPipelineTrigger();

    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0, skipped: 0 });
    expect(alertsService.createAiAlert).not.toHaveBeenCalled();
    expect(alertsQuery.eq).toHaveBeenCalledWith('parcel_id', 'parcel-1');
    expect(alertsQuery.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(alertsQuery.eq).toHaveBeenCalledWith('alert_code', 'AI-SCENARIO-D');
    expect(alertsQuery.eq).toHaveBeenCalledWith('is_ai_generated', true);
    expect(alertsQuery.is).toHaveBeenCalledWith('resolved_at', null);
  });

  it('runDailyAiPipelineTrigger creates alert and recommendation for stress scenarios', async () => {
    const parcel = {
      id: 'parcel-1',
      organization_id: 'org-1',
      crop_type: 'olive',
      boundary: [[-7.5, 33.6], [-7.51, 33.6], [-7.5, 33.61]],
    };
    const parcelsQuery = createThenableQuery([parcel]);
    const satelliteQuery = createMockQueryBuilder();
    satelliteQuery.select.mockReturnValue(satelliteQuery);
    satelliteQuery.eq.mockReturnValue(satelliteQuery);
    satelliteQuery.gte.mockReturnValue(satelliteQuery);
    satelliteQuery.order.mockReturnValue(satelliteQuery);
    satelliteQuery.limit.mockReturnValue(satelliteQuery);
    satelliteQuery.maybeSingle.mockResolvedValueOnce(mockQueryResult({ date: '2026-03-11' }));

    const alertsQuery = createMockQueryBuilder();
    alertsQuery.select.mockReturnValue(alertsQuery);
    alertsQuery.eq.mockReturnValue(alertsQuery);
    alertsQuery.is.mockReturnValue(alertsQuery);
    alertsQuery.limit.mockReturnValue(alertsQuery);
    alertsQuery.maybeSingle.mockResolvedValueOnce(mockQueryResult(null));

    const recommendationQuery = createMockQueryBuilder();
    recommendationQuery.select.mockReturnValue(recommendationQuery);
    recommendationQuery.eq.mockReturnValue(recommendationQuery);
    recommendationQuery.limit.mockReturnValue(recommendationQuery);
    recommendationQuery.maybeSingle.mockResolvedValueOnce(mockQueryResult(null));

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelsQuery;
      if (table === 'satellite_indices_data') return satelliteQuery;
      if (table === 'performance_alerts') return alertsQuery;
      if (table === 'ai_recommendations') return recommendationQuery;
      return createMockQueryBuilder();
    });

    diagnosticsService.getDiagnostics.mockResolvedValueOnce({
      scenario: 'Moderate stress detected',
      scenario_code: 'C',
      confidence: 0.82,
      description: 'NDVI is showing moderate decline over the last week.',
      indicators: {
        reading_date: '2026-03-12',
        baseline_ndvi: 0.62,
        current_ndvi: 0.48,
        ndvi_delta: -0.14,
        ndvi_band: 'vigilance',
        ndvi_trend: 'declining',
        baseline_ndre: 0.31,
        current_ndre: 0.24,
        ndre_delta: -0.07,
        ndre_status: 'normal',
        ndre_trend: 'declining',
        baseline_ndmi: 0.22,
        current_ndmi: 0.17,
        ndmi_delta: -0.05,
        ndmi_trend: 'declining',
        water_balance: -12,
        weather_anomaly: false,
      },
    });
    recommendationsService.createRecommendation.mockResolvedValue({
      id: 'reco-1',
      parcel_id: parcel.id,
      organization_id: parcel.organization_id,
      status: 'pending',
    } as any);

    const result = await service.runDailyAiPipelineTrigger();

    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0, skipped: 0 });
    expect(alertsService.createAiAlert).toHaveBeenCalledTimes(1);
    expect(recommendationsService.createRecommendation).toHaveBeenCalledTimes(1);
    expect(recommendationsService.createRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        parcel_id: parcel.id,
        alert_code: 'AI-SCENARIO-C',
        priority: 'medium',
      }),
      parcel.organization_id,
    );
  });

  it('runDailyAiPipelineTrigger does not create alert or recommendation for non-stress scenarios', async () => {
    const parcelsQuery = createThenableQuery([
      {
        id: 'parcel-1',
        organization_id: 'org-1',
        crop_type: 'olive',
        boundary: [[-7.5, 33.6], [-7.51, 33.6], [-7.5, 33.61]],
      },
    ]);
    const satelliteQuery = createMockQueryBuilder();
    satelliteQuery.select.mockReturnValue(satelliteQuery);
    satelliteQuery.eq.mockReturnValue(satelliteQuery);
    satelliteQuery.gte.mockReturnValue(satelliteQuery);
    satelliteQuery.order.mockReturnValue(satelliteQuery);
    satelliteQuery.limit.mockReturnValue(satelliteQuery);
    satelliteQuery.maybeSingle.mockResolvedValueOnce(mockQueryResult({ date: '2026-03-11' }));

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelsQuery;
      if (table === 'satellite_indices_data') return satelliteQuery;
      return createMockQueryBuilder();
    });

    diagnosticsService.getDiagnostics.mockResolvedValueOnce({
      scenario: 'Healthy vegetation state',
      scenario_code: 'A',
      confidence: 0.96,
      description: 'Vegetation indices are stable and within expected ranges.',
      indicators: {
        reading_date: '2026-03-12',
        baseline_ndvi: 0.6,
        current_ndvi: 0.61,
        ndvi_delta: 0.01,
        ndvi_band: 'optimal',
        ndvi_trend: 'stable',
        baseline_ndre: 0.3,
        current_ndre: 0.31,
        ndre_delta: 0.01,
        ndre_status: 'normal',
        ndre_trend: 'stable',
        baseline_ndmi: 0.2,
        current_ndmi: 0.21,
        ndmi_delta: 0.01,
        ndmi_trend: 'stable',
        water_balance: 4,
        weather_anomaly: false,
      },
    });

    const result = await service.runDailyAiPipelineTrigger();

    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0, skipped: 0 });
    expect(alertsService.createAiAlert).not.toHaveBeenCalled();
    expect(recommendationsService.createRecommendation).not.toHaveBeenCalled();
  });

  it('runDailyAiPipelineTrigger skips recommendation creation when pending recommendation exists', async () => {
    const parcelsQuery = createThenableQuery([
      {
        id: 'parcel-1',
        organization_id: 'org-1',
        crop_type: 'olive',
        boundary: [[-7.5, 33.6], [-7.51, 33.6], [-7.5, 33.61]],
      },
    ]);
    const satelliteQuery = createMockQueryBuilder();
    satelliteQuery.select.mockReturnValue(satelliteQuery);
    satelliteQuery.eq.mockReturnValue(satelliteQuery);
    satelliteQuery.gte.mockReturnValue(satelliteQuery);
    satelliteQuery.order.mockReturnValue(satelliteQuery);
    satelliteQuery.limit.mockReturnValue(satelliteQuery);
    satelliteQuery.maybeSingle.mockResolvedValueOnce(mockQueryResult({ date: '2026-03-11' }));

    const alertsQuery = createMockQueryBuilder();
    alertsQuery.select.mockReturnValue(alertsQuery);
    alertsQuery.eq.mockReturnValue(alertsQuery);
    alertsQuery.is.mockReturnValue(alertsQuery);
    alertsQuery.limit.mockReturnValue(alertsQuery);
    alertsQuery.maybeSingle.mockResolvedValueOnce(mockQueryResult(null));

    const recommendationQuery = createMockQueryBuilder();
    recommendationQuery.select.mockReturnValue(recommendationQuery);
    recommendationQuery.eq.mockReturnValue(recommendationQuery);
    recommendationQuery.limit.mockReturnValue(recommendationQuery);
    recommendationQuery.maybeSingle.mockResolvedValueOnce(
      mockQueryResult({ id: 'existing-reco-1' }),
    );

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelsQuery;
      if (table === 'satellite_indices_data') return satelliteQuery;
      if (table === 'performance_alerts') return alertsQuery;
      if (table === 'ai_recommendations') return recommendationQuery;
      return createMockQueryBuilder();
    });

    diagnosticsService.getDiagnostics.mockResolvedValueOnce({
      scenario: 'Moderate stress detected',
      scenario_code: 'C',
      confidence: 0.84,
      description: 'NDVI and NDMI trends indicate stress conditions.',
      indicators: {
        reading_date: '2026-03-12',
        baseline_ndvi: 0.58,
        current_ndvi: 0.44,
        ndvi_delta: -0.14,
        ndvi_band: 'vigilance',
        ndvi_trend: 'declining',
        baseline_ndre: 0.29,
        current_ndre: 0.23,
        ndre_delta: -0.06,
        ndre_status: 'normal',
        ndre_trend: 'declining',
        baseline_ndmi: 0.21,
        current_ndmi: 0.15,
        ndmi_delta: -0.06,
        ndmi_trend: 'declining',
        water_balance: -10,
        weather_anomaly: false,
      },
    });

    const result = await service.runDailyAiPipelineTrigger();

    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0, skipped: 0 });
    expect(alertsService.createAiAlert).toHaveBeenCalledTimes(1);
    expect(recommendationsService.createRecommendation).not.toHaveBeenCalled();
  });

  it('runMonthlyPlanReminder checks planned interventions for the current month', async () => {
    const planInterventionsQuery = createThenableQuery([
      {
        id: 'intervention-1',
        organization_id: 'org-1',
        parcel_id: 'parcel-1',
        month: new Date().getUTCMonth() + 1,
        status: 'planned',
        description: 'Apply biostimulant',
      },
    ]);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'plan_interventions') return planInterventionsQuery;
      return createMockQueryBuilder();
    });

    const result = await service.runMonthlyPlanReminder();

    expect(result).toEqual({
      month: new Date().getUTCMonth() + 1,
      reminders: 1,
    });
    expect(planInterventionsQuery.eq).toHaveBeenCalledWith(
      'month',
      new Date().getUTCMonth() + 1,
    );
    expect(planInterventionsQuery.eq).toHaveBeenCalledWith('status', 'planned');
  });

  it('runWeeklyForecastUpdate calls the forecast API and stores forecast rows', async () => {
    const parcelsQuery = createThenableQuery([
      {
        id: 'parcel-1',
        organization_id: 'org-1',
        crop_type: 'olive',
        boundary: [[-7.5, 33.6], [-7.51, 33.6], [-7.5, 33.61]],
      },
    ]);
    const forecastsUpsertQuery = createThenableQuery([]);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelsQuery;
      if (table === 'weather_forecasts') return forecastsUpsertQuery;
      return createMockQueryBuilder();
    });

    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        latitude: 33.6,
        longitude: -7.5,
        source: 'open-meteo-forecast',
        data: [
          {
            date: '2026-03-13',
            temperature_min: 10,
            temperature_max: 21,
            temperature_mean: 15,
            precipitation_sum: 0,
            wind_speed_max: 12,
            et0_fao_evapotranspiration: 3.1,
          },
        ],
      }),
    );

    const result = await service.runWeeklyForecastUpdate();

    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0, skipped: 0 });
    expect(fetchMock.mock.calls[0][0]).toContain('/api/weather/forecast');
    expect(fetchMock.mock.calls[0][0]).toContain('days=7');
    expect(forecastsUpsertQuery.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          latitude: 33.6,
          longitude: -7.5,
          target_date: '2026-03-13',
        }),
      ]),
      { onConflict: 'latitude,longitude,forecast_date,target_date' },
    );
  });

  it('runDailyRecommendationWeatherVerification expires pending recommendations and isolates update errors', async () => {
    const recommendationsQuery = createThenableQuery([
      {
        id: 'recommendation-1',
        organization_id: 'org-1',
        parcel_id: 'parcel-1',
        status: 'pending',
        valid_until: '2026-03-11T00:00:00.000Z',
      },
      {
        id: 'recommendation-2',
        organization_id: 'org-1',
        parcel_id: 'parcel-2',
        status: 'pending',
        valid_until: '2026-03-11T00:00:00.000Z',
      },
    ]);
    const updateQuery = createThenableQuery(null);
    updateQuery.then
      .mockImplementationOnce((resolve: (value: { data: null; error: { message: string } }) => void) => {
        const result = { data: null, error: { message: 'update failed' } };
        resolve(result);
        return Promise.resolve(result);
      })
      .mockImplementationOnce((resolve: (value: { data: null; error: null }) => void) => {
        const result = { data: null, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'ai_recommendations') {
        const recommendationCalls = mockClient.from.mock.calls.filter(
          ([name]) => name === 'ai_recommendations',
        ).length;
        return recommendationCalls === 1 ? recommendationsQuery : updateQuery;
      }
      return createMockQueryBuilder();
    });

    const result = await service.runDailyRecommendationWeatherVerification();

    expect(result).toEqual({ processed: 2, expired: 1, failed: 1 });
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'expired',
        updated_at: expect.any(String),
      }),
    );
  });

  function createThenableQuery(data: unknown): MockQueryBuilder {
    const query = createMockQueryBuilder();
    setupThenableMock(query, data);
    return query;
  }

  function createJsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
});
