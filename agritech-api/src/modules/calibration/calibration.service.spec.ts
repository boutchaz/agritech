import { Test, TestingModule } from '@nestjs/testing';
import { CalibrationService } from './calibration.service';
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
import { agromindCalibrationFixture } from './fixtures/test-fixture';
import { CalibrationStateMachine } from './calibration-state-machine';
import { NutritionOptionService } from './nutrition-option.service';

const mockStateMachine = {
  transitionPhase: jest.fn(),
};

const mockNutritionOptionService = {
  suggestNutritionOption: jest.fn(),
};

describe('CalibrationService', () => {
  let service: CalibrationService;
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
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: CalibrationStateMachine, useValue: mockStateMachine },
        { provide: NutritionOptionService, useValue: mockNutritionOptionService },
      ],
    }).compile();

    service = module.get<CalibrationService>(CalibrationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockStateMachine.transitionPhase.mockReset();
    mockNutritionOptionService.suggestNutritionOption.mockReset();
    delete process.env.SATELLITE_SERVICE_URL;
  });

  it('getLatestCalibration returns null when no calibrations exist for the parcel', async () => {
    const calibrationQuery = createMockQueryBuilder();
    calibrationQuery.select.mockReturnValue(calibrationQuery);
    calibrationQuery.eq.mockReturnValue(calibrationQuery);
    calibrationQuery.order.mockReturnValue(calibrationQuery);
    calibrationQuery.limit.mockReturnValue(calibrationQuery);
    calibrationQuery.maybeSingle.mockResolvedValue(mockQueryResult(null));

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'calibrations') return calibrationQuery;
      return createMockQueryBuilder();
    });

    await expect(service.getLatestCalibration(parcelId, organizationId)).resolves.toBeNull();
  });

  it('startCalibrationV2 rejects when parcel is already calibrating', async () => {
    const parcelQuery = createMockQueryBuilder();
    parcelQuery.select.mockReturnValue(parcelQuery);
    parcelQuery.eq.mockReturnValue(parcelQuery);
    parcelQuery.single.mockResolvedValue(
      mockQueryResult({
        id: parcelId,
        crop_type: agromindCalibrationFixture.parcel.crop_type,
        planting_system: agromindCalibrationFixture.parcel.system,
        planting_year: 2015,
        variety: 'picholine_marocaine',
        ai_phase: 'calibrating',
        boundary: parcelBoundary,
        farms: { organization_id: organizationId },
      }),
    );

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelQuery;
      return createMockQueryBuilder();
    });

    await expect(
      service.startCalibrationV2(parcelId, organizationId, {}),
    ).rejects.toThrow('already in progress');
  });

  it('executeCalibrationV2 assembles full payload and updates calibration + parcel state', async () => {
    const satelliteQuery = createMockQueryBuilder();
    satelliteQuery.select.mockReturnValue(satelliteQuery);
    satelliteQuery.eq.mockReturnValue(satelliteQuery);
    satelliteQuery.gte.mockReturnValue(satelliteQuery);
    satelliteQuery.in.mockReturnValue(satelliteQuery);
    satelliteQuery.order.mockReturnValue(satelliteQuery);
    setupThenableMock(satelliteQuery, [
      { date: '2025-01-01', index_name: 'NDVI', mean_value: 0.55 },
      { date: '2025-01-01', index_name: 'NDRE', mean_value: 0.21 },
      { date: '2025-01-01', index_name: 'NDMI', mean_value: 0.17 },
      { date: '2025-01-01', index_name: 'GCI', mean_value: 1.25 },
      { date: '2025-01-01', index_name: 'EVI', mean_value: 0.32 },
      { date: '2025-01-01', index_name: 'SAVI', mean_value: 0.40 },
    ]);

    const weatherQuery = createMockQueryBuilder();
    weatherQuery.select.mockReturnValue(weatherQuery);
    weatherQuery.eq.mockReturnValue(weatherQuery);
    weatherQuery.gte.mockReturnValue(weatherQuery);
    weatherQuery.order.mockReturnValue(weatherQuery);
    setupThenableMock(weatherQuery, [
      {
        date: '2025-01-01',
        latitude: 31.7,
        longitude: -7.1,
        temperature_min: 8,
        temperature_max: 20,
        temperature_mean: 14,
        relative_humidity_mean: 50,
        wind_speed_max: 12,
        shortwave_radiation_sum: 14,
        precipitation_sum: 1,
        et0_fao_evapotranspiration: 1.8,
        gdd_olivier: null,
        chill_hours: null,
      },
    ]);

    const analysesQuery = createMockQueryBuilder();
    analysesQuery.select.mockReturnValue(analysesQuery);
    analysesQuery.eq.mockReturnValue(analysesQuery);
    analysesQuery.in.mockReturnValue(analysesQuery);
    analysesQuery.order.mockReturnValue(analysesQuery);
    setupThenableMock(analysesQuery, [
      { analysis_type: 'soil', analysis_date: '2025-01-10', data: { ph: 7.1 } },
      { analysis_type: 'water', analysis_date: '2025-01-11', data: { ec: 1.1 } },
    ]);

    const harvestQuery = createMockQueryBuilder();
    harvestQuery.select.mockReturnValue(harvestQuery);
    harvestQuery.eq.mockReturnValue(harvestQuery);
    harvestQuery.order.mockReturnValue(harvestQuery);
    setupThenableMock(harvestQuery, [
      { harvest_date: '2024-10-01', quantity: 1200, unit: 'kg' },
    ]);

    const cropReferenceQuery = createMockQueryBuilder();
    cropReferenceQuery.select.mockReturnValue(cropReferenceQuery);
    cropReferenceQuery.eq.mockReturnValue(cropReferenceQuery);
    cropReferenceQuery.maybeSingle.mockResolvedValue(
      mockQueryResult({ reference_data: { varietes: [] } }),
    );

    const calibrationUpdateQuery = createMockQueryBuilder();
    calibrationUpdateQuery.update.mockReturnValue(calibrationUpdateQuery);
    calibrationUpdateQuery.eq.mockReturnValue(calibrationUpdateQuery);
    setupThenableMock(calibrationUpdateQuery, null);

    const parcelUpdateQuery = createMockQueryBuilder();
    parcelUpdateQuery.update.mockReturnValue(parcelUpdateQuery);
    parcelUpdateQuery.eq.mockReturnValue(parcelUpdateQuery);
    setupThenableMock(parcelUpdateQuery, null);

    let parcelUpdateCalls = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'satellite_indices_data') return satelliteQuery;
      if (table === 'weather_daily_data') return weatherQuery;
      if (table === 'analyses') return analysesQuery;
      if (table === 'harvest_records') return harvestQuery;
      if (table === 'crop_ai_references') return cropReferenceQuery;
      if (table === 'calibrations') return calibrationUpdateQuery;
      if (table === 'parcels') {
        parcelUpdateCalls += 1;
        return parcelUpdateQuery;
      }
      return createMockQueryBuilder();
    });

    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ crop_type: 'olivier', updated_rows: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            parcel_id: parcelId,
            maturity_phase: 'pleine_production',
            step3: {
              global_percentiles: {
                NDVI: { p50: 0.55 },
                NDRE: { p50: 0.21 },
                NDMI: { p50: 0.17 },
              },
            },
            step4: { mean_dates: { peak: '2025-06-01' } },
            step5: { anomalies: [{ type: 'sudden_drop' }] },
            step6: { yield_potential: { minimum: 1000, maximum: 1500 } },
            step7: {
              zone_summary: [
                { class_name: 'C', surface_percent: 40 },
                { class_name: 'B', surface_percent: 35 },
              ],
              spatial_pattern_type: 'mixed',
            },
            step8: { health_score: { total: 84 } },
            confidence: { total_score: 86, normalized_score: 0.86 },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    await (service as unknown as { executeCalibrationV2: (...args: unknown[]) => Promise<void> }).executeCalibrationV2(
      'calibration-v2-001',
      parcelId,
      organizationId,
      {
        id: parcelId,
        cropType: 'olivier',
        system: 'intensif',
        boundary: parcelBoundary,
        organizationId,
        variety: 'picholine_marocaine',
        plantingYear: 2010,
        aiPhase: 'disabled',
      },
      {},
    );

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://satellite-service.test/api/calibration/v2/precompute-gdd',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'http://satellite-service.test/api/calibration/v2/run',
      expect.objectContaining({ method: 'POST' }),
    );

    const v2Body = fetchSpy.mock.calls[1]?.[1]?.body;
    expect(typeof v2Body).toBe('string');
    if (typeof v2Body !== 'string') {
      throw new Error('V2 calibration request body should be a string');
    }
    const parsed = JSON.parse(v2Body) as Record<string, unknown>;
    expect(parsed.calibration_input).toBeDefined();
    expect(parsed.satellite_images).toBeDefined();
    expect(parsed.weather_rows).toBeDefined();

    expect(calibrationUpdateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        calibration_version: 'v2',
        health_score: 84,
        yield_potential_min: 1000,
        yield_potential_max: 1500,
        maturity_phase: 'pleine_production',
        anomaly_count: 1,
      }),
    );

    expect(parcelUpdateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        ai_calibration_id: 'calibration-v2-001',
        ai_enabled: true,
      }),
    );

    expect(mockStateMachine.transitionPhase).toHaveBeenCalledWith(
      parcelId,
      'calibrating',
      'awaiting_validation',
      organizationId,
    );
  });
});
