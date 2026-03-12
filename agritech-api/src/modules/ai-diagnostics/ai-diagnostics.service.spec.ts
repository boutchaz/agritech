import { Test, TestingModule } from '@nestjs/testing';
import { agromindCalibrationFixture } from '../calibration/fixtures/test-fixture';
import { DatabaseService } from '../database/database.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  mockQueryResult,
  MockDatabaseService,
  MockSupabaseClient,
  setupThenableMock,
} from '../../../test/helpers/mock-database.helper';
import { AiDiagnosticsService } from './ai-diagnostics.service';

describe('AiDiagnosticsService', () => {
  let service: AiDiagnosticsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const organizationId = 'org-001';
  const parcelId = agromindCalibrationFixture.parcel.id;

  beforeEach(async () => {
    process.env.SATELLITE_SERVICE_URL = 'http://satellite-service.test';
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiDiagnosticsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AiDiagnosticsService>(AiDiagnosticsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    delete process.env.SATELLITE_SERVICE_URL;
  });

  it('getDiagnostics returns scenario H for the calibration fixture values', async () => {
    const parcelQuery = createParcelQuery();

    const calibrationQuery = createMockQueryBuilder();
    calibrationQuery.select.mockReturnValue(calibrationQuery);
    calibrationQuery.eq.mockReturnValue(calibrationQuery);
    calibrationQuery.order.mockReturnValue(calibrationQuery);
    calibrationQuery.limit.mockReturnValue(calibrationQuery);
    calibrationQuery.maybeSingle.mockResolvedValue(
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

    const satelliteQuery = createMockQueryBuilder();
    satelliteQuery.select.mockReturnValue(satelliteQuery);
    satelliteQuery.eq.mockReturnValue(satelliteQuery);
    satelliteQuery.gte.mockReturnValue(satelliteQuery);
    satelliteQuery.order.mockReturnValue(satelliteQuery);
    setupThenableMock(satelliteQuery, agromindCalibrationFixture.satellite_readings);

    const weatherQuery = createMockQueryBuilder();
    weatherQuery.select.mockReturnValue(weatherQuery);
    weatherQuery.eq.mockReturnValue(weatherQuery);
    weatherQuery.gte.mockReturnValue(weatherQuery);
    weatherQuery.order.mockReturnValue(weatherQuery);
    setupThenableMock(
      weatherQuery,
      agromindCalibrationFixture.weather_readings.map((reading) => ({
        date: reading.date,
        precipitation_sum: reading.precip,
        et0_fao_evapotranspiration: reading.et0,
      })),
    );

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelQuery;
      if (table === 'calibrations') return calibrationQuery;
      if (table === 'satellite_indices_data') return satelliteQuery;
      if (table === 'weather_daily_data') return weatherQuery;
      return createMockQueryBuilder();
    });

    const result = await service.getDiagnostics(parcelId, organizationId);

    expect(result.scenario_code).toBe('H');
    expect(result.scenario).toBe('Normal state');
    expect(result.confidence).toBe(0.85);
    expect(result.indicators.ndvi_trend).toBe('stable');
    expect(result.indicators.ndre_status).toBe('normal');
  });

  it('getWaterBalance classifies a negative balance as deficit', async () => {
    const parcelQuery = createParcelQuery();
    const weatherQuery = createMockQueryBuilder();
    weatherQuery.select.mockReturnValue(weatherQuery);
    weatherQuery.eq.mockReturnValue(weatherQuery);
    weatherQuery.gte.mockReturnValue(weatherQuery);
    weatherQuery.order.mockReturnValue(weatherQuery);
    setupThenableMock(weatherQuery, [
      {
        date: '2026-03-01',
        precipitation_sum: 2,
        et0_fao_evapotranspiration: 15,
      },
      {
        date: '2026-03-02',
        precipitation_sum: 3,
        et0_fao_evapotranspiration: 16,
      },
    ]);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelQuery;
      if (table === 'weather_daily_data') return weatherQuery;
      return createMockQueryBuilder();
    });

    const result = await service.getWaterBalance(parcelId, organizationId);

    expect(result.total_precip).toBe(5);
    expect(result.total_et0).toBe(31);
    expect(result.water_balance).toBe(-26);
    expect(result.status).toBe('deficit');
  });

  it('getTrends classifies a negative NDVI slope as declining', async () => {
    const parcelQuery = createParcelQuery();
    const satelliteQuery = createMockQueryBuilder();
    satelliteQuery.select.mockReturnValue(satelliteQuery);
    satelliteQuery.eq.mockReturnValue(satelliteQuery);
    satelliteQuery.gte.mockReturnValue(satelliteQuery);
    satelliteQuery.order.mockReturnValue(satelliteQuery);
    setupThenableMock(satelliteQuery, [
      { date: '2026-01-01', ndvi: 0.62, ndre: 0.24, ndmi: 0.2 },
      { date: '2026-01-02', ndvi: 0.58, ndre: 0.23, ndmi: 0.19 },
      { date: '2026-01-03', ndvi: 0.53, ndre: 0.21, ndmi: 0.18 },
      { date: '2026-01-04', ndvi: 0.48, ndre: 0.19, ndmi: 0.17 },
    ]);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelQuery;
      if (table === 'satellite_indices_data') return satelliteQuery;
      return createMockQueryBuilder();
    });

    const result = await service.getTrends(parcelId, organizationId);

    expect(result.ndvi_trend).toBe('declining');
    expect(result.slope).toBeLessThan(-0.001);
    expect(result.period_days).toBe(4);
  });

  function createParcelQuery() {
    const parcelQuery = createMockQueryBuilder();
    parcelQuery.select.mockReturnValue(parcelQuery);
    parcelQuery.eq.mockReturnValue(parcelQuery);
    parcelQuery.single.mockResolvedValue(
      mockQueryResult({
        id: parcelId,
        crop_type: agromindCalibrationFixture.parcel.crop_type,
        farms: { organization_id: organizationId },
      }),
    );
    return parcelQuery;
  }
});
