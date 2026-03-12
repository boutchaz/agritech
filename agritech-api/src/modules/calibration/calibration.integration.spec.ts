import { Test, TestingModule } from '@nestjs/testing';
import {
  AiAlertsService,
  CreateAiAlertInput,
} from '../ai-alerts/ai-alerts.service';
import { AiDiagnosticsService } from '../ai-diagnostics/ai-diagnostics.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  mockQueryResult,
  MockDatabaseService,
  MockQueryBuilder,
  MockSupabaseClient,
  setupThenableMock,
} from '../../../test/helpers/mock-database.helper';
import { agromindCalibrationFixture } from './fixtures/test-fixture';
import { CalibrationService } from './calibration.service';

describe('Calibration integration', () => {
  let calibrationService: CalibrationService;
  let diagnosticsService: AiDiagnosticsService;
  let alertsService: AiAlertsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const organizationId = 'org-001';
  const parcelId = agromindCalibrationFixture.parcel.id;
  const parcelBoundary = [
    [-7.1, 31.7],
    [-7.1, 31.8],
    [-7.0, 31.8],
    [-7.0, 31.7],
    [-7.1, 31.7],
  ];

  beforeEach(async () => {
    process.env.SATELLITE_SERVICE_URL = 'http://satellite-service.test';
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalibrationService,
        AiDiagnosticsService,
        AiAlertsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    calibrationService = module.get<CalibrationService>(CalibrationService);
    diagnosticsService = module.get<AiDiagnosticsService>(AiDiagnosticsService);
    alertsService = module.get<AiAlertsService>(AiAlertsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    delete process.env.SATELLITE_SERVICE_URL;
  });

  it('calibration produces baseline_ndvi close to 0.55 for fixture data', async () => {
    const parcelLookupQuery = createCalibrationParcelQuery();
    const satelliteQuery = createCalibrationSatelliteQuery();
    const weatherQuery = createCalibrationWeatherQuery();
    const cropReferenceQuery = createCropReferenceQuery();
    const calibrationInsertQuery = createCalibrationInsertQuery();
    const parcelUpdateQuery = createParcelUpdateQuery();

    let parcelTableCalls = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') {
        parcelTableCalls += 1;
        return parcelTableCalls === 1 ? parcelLookupQuery : parcelUpdateQuery;
      }
      if (table === 'satellite_indices_data') {
        return satelliteQuery;
      }
      if (table === 'weather_daily_data') {
        return weatherQuery;
      }
      if (table === 'crop_ai_references') {
        return cropReferenceQuery;
      }
      if (table === 'calibrations') {
        return calibrationInsertQuery;
      }
      return createMockQueryBuilder();
    });

    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (_input, init) => {
      if (typeof init?.body !== 'string') {
        throw new Error('Calibration request body should be a string');
      }

      const request = JSON.parse(init.body) as {
        satellite_readings: Array<{ ndvi: number; ndre: number; ndmi: number }>;
      };

      return new Response(
        JSON.stringify({
          baseline_ndvi: mean(request.satellite_readings.map((reading) => reading.ndvi)),
          baseline_ndre: mean(request.satellite_readings.map((reading) => reading.ndre)),
          baseline_ndmi: mean(request.satellite_readings.map((reading) => reading.ndmi)),
          confidence_score: agromindCalibrationFixture.expected_output.confidence_score,
          zone_classification: agromindCalibrationFixture.expected_output.zone_classification,
          phenology_stage: agromindCalibrationFixture.expected_output.phenology_stage,
          anomaly_count: 0,
          processing_time_ms: 12,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const result = await calibrationService.startCalibration(parcelId, organizationId, {});

    expect(typeof result.baseline_ndvi).toBe('number');
    if (typeof result.baseline_ndvi !== 'number') {
      throw new Error('baseline_ndvi should be a number');
    }

    expect(Math.abs(result.baseline_ndvi - 0.55)).toBeLessThanOrEqual(0.05);
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://satellite-service.test/api/calibration/run',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        }),
      }),
    );
    expect(calibrationInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        baseline_ndvi: expect.closeTo(0.55, 2),
      }),
    );
  });

  it('diagnostics returns scenario H (normal) for fixture calibration data', async () => {
    const parcelQuery = createDiagnosticsParcelQuery();
    const calibrationQuery = createDiagnosticsCalibrationQuery();
    const satelliteQuery = createDiagnosticsSatelliteQuery();
    const weatherQuery = createDiagnosticsWeatherQuery();

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') {
        return parcelQuery;
      }
      if (table === 'calibrations') {
        return calibrationQuery;
      }
      if (table === 'satellite_indices_data') {
        return satelliteQuery;
      }
      if (table === 'weather_daily_data') {
        return weatherQuery;
      }
      return createMockQueryBuilder();
    });

    const result = await diagnosticsService.getDiagnostics(parcelId, organizationId);

    expect(result.scenario_code).toBe('H');
    expect(result.scenario).toBe('Normal state');
    expect(result.indicators.baseline_ndvi).toBe(0.55);
    expect(result.indicators.current_ndvi).toBe(0.58);
  });

  it('alert creation with ai_drought_stress type succeeds', async () => {
    const alertInsertQuery = createAlertInsertQuery();
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'performance_alerts') {
        return alertInsertQuery;
      }
      return createMockQueryBuilder();
    });

    const payload: CreateAiAlertInput = {
      parcel_id: parcelId,
      organization_id: organizationId,
      alert_type: 'ai_drought_stress',
      severity: 'warning',
      title: 'AI drought stress detected',
      description: 'Diagnostics indicate water stress risk.',
      alert_code: 'AI-DR-001',
      category: 'water',
      priority: 'high',
      trigger_data: {
        scenario_code: 'H',
        baseline_ndvi: agromindCalibrationFixture.expected_output.baseline_ndvi,
      },
    };

    const result = await alertsService.createAiAlert(payload);

    expect(result.alert_type).toBe('ai_drought_stress');
    expect(alertInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        alert_type: 'ai_drought_stress',
        is_ai_generated: true,
      }),
    );
  });

  function createCalibrationParcelQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.single.mockResolvedValue(
      mockQueryResult({
        id: parcelId,
        crop_type: agromindCalibrationFixture.parcel.crop_type,
        system: agromindCalibrationFixture.parcel.system,
        boundary: parcelBoundary,
        farms: { organization_id: organizationId },
      }),
    );
    return query;
  }

  function createDiagnosticsParcelQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.single.mockResolvedValue(
      mockQueryResult({
        id: parcelId,
        crop_type: agromindCalibrationFixture.parcel.crop_type,
        farms: { organization_id: organizationId },
      }),
    );
    return query;
  }

  function createCalibrationSatelliteQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.gte.mockReturnValue(query);
    query.order.mockReturnValue(query);
    setupThenableMock(
      query,
      agromindCalibrationFixture.satellite_readings.flatMap((reading) => [
        { date: reading.date, index_name: 'NDVI', mean_value: reading.ndvi },
        { date: reading.date, index_name: 'NDRE', mean_value: reading.ndre },
        { date: reading.date, index_name: 'NDMI', mean_value: reading.ndmi },
        { date: reading.date, index_name: 'GCI', mean_value: reading.gci },
        { date: reading.date, index_name: 'EVI', mean_value: reading.evi },
        { date: reading.date, index_name: 'SAVI', mean_value: reading.savi },
      ]),
    );
    return query;
  }

  function createDiagnosticsSatelliteQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.gte.mockReturnValue(query);
    query.order.mockReturnValue(query);
    setupThenableMock(query, agromindCalibrationFixture.satellite_readings);
    return query;
  }

  function createCalibrationWeatherQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.gte.mockReturnValue(query);
    query.order.mockReturnValue(query);
    setupThenableMock(
      query,
      agromindCalibrationFixture.weather_readings.map((reading) => ({
        date: reading.date,
        temperature_min: reading.temp_min,
        temperature_max: reading.temp_max,
        precipitation_sum: reading.precip,
        et0_fao_evapotranspiration: reading.et0,
      })),
    );
    return query;
  }

  function createDiagnosticsWeatherQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.gte.mockReturnValue(query);
    query.order.mockReturnValue(query);
    setupThenableMock(
      query,
      agromindCalibrationFixture.weather_readings.map((reading) => ({
        date: reading.date,
        precipitation_sum: reading.precip,
        et0_fao_evapotranspiration: reading.et0,
      })),
    );
    return query;
  }

  function createCropReferenceQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue(
      mockQueryResult({
        reference_data: {
          seuils_satellite: {
            intensif: {
              NDVI: agromindCalibrationFixture.ndvi_thresholds,
            },
          },
        },
      }),
    );
    return query;
  }

  function createCalibrationInsertQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    let insertedPayload: Record<string, unknown> = {};

    query.insert.mockImplementation((payload: Record<string, unknown>) => {
      insertedPayload = payload;
      return query;
    });
    query.select.mockReturnValue(query);
    query.single.mockImplementation(async () =>
      mockQueryResult({
        id: 'calibration-001',
        ...insertedPayload,
        error_message: null,
        created_at: '2026-03-12T09:00:01.000Z',
        updated_at: '2026-03-12T09:00:01.000Z',
      }),
    );

    return query;
  }

  function createDiagnosticsCalibrationQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue(
      mockQueryResult({
        baseline_ndvi: agromindCalibrationFixture.expected_output.baseline_ndvi,
        baseline_ndre: 0.21,
        baseline_ndmi: 0.17,
        calibration_data: {
          thresholds: {
            optimal: [...agromindCalibrationFixture.ndvi_thresholds.optimal],
            vigilance: agromindCalibrationFixture.ndvi_thresholds.vigilance,
            alerte: agromindCalibrationFixture.ndvi_thresholds.alerte,
          },
        },
      }),
    );
    return query;
  }

  function createParcelUpdateQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    setupThenableMock(query, null);
    return query;
  }

  function createAlertInsertQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    let insertedPayload: Record<string, unknown> = {};

    query.insert.mockImplementation((payload: Record<string, unknown>) => {
      insertedPayload = payload;
      return query;
    });
    query.select.mockReturnValue(query);
    query.single.mockImplementation(async () =>
      mockQueryResult({
        id: 'alert-001',
        ...insertedPayload,
        acknowledged_at: null,
        resolved_at: null,
        satellite_reading_id: null,
        action_delay: null,
        created_at: '2026-03-12T10:00:00.000Z',
        updated_at: '2026-03-12T10:00:00.000Z',
      }),
    );

    return query;
  }

  function mean(values: number[]): number {
    const total = values.reduce((sum, value) => sum + value, 0);
    return Number((total / values.length).toFixed(2));
  }
});
