import { NotFoundException } from '@nestjs/common';
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

  it('startCalibration persists the completed calibration and links it to the parcel', async () => {
    const parcelQuery = createMockQueryBuilder();
    parcelQuery.select.mockReturnValue(parcelQuery);
    parcelQuery.eq.mockReturnValue(parcelQuery);
    parcelQuery.single.mockResolvedValue(
      mockQueryResult({
        id: parcelId,
        crop_type: agromindCalibrationFixture.parcel.crop_type,
        planting_system: agromindCalibrationFixture.parcel.system,
        boundary: parcelBoundary,
        farms: { organization_id: organizationId },
      }),
    );

    const lookbackBase = new Date();
    lookbackBase.setDate(lookbackBase.getDate() - 730);
    const toIsoDate = (d: Date) => d.toISOString().split('T')[0];

    const satelliteRows = agromindCalibrationFixture.satellite_readings.flatMap((reading, index) => {
      const readingDate = new Date(lookbackBase);
      readingDate.setDate(readingDate.getDate() + index);
      const date = toIsoDate(readingDate);
      return [
        { date, index_name: 'NDVI', mean_value: reading.ndvi },
        { date, index_name: 'NDRE', mean_value: reading.ndre },
        { date, index_name: 'NDMI', mean_value: reading.ndmi },
        { date, index_name: 'GCI', mean_value: reading.gci },
        { date, index_name: 'EVI', mean_value: reading.evi },
        { date, index_name: 'SAVI', mean_value: reading.savi },
      ];
    });
    const satelliteQuery = createMockQueryBuilder();
    satelliteQuery.select.mockReturnValue(satelliteQuery);
    satelliteQuery.eq.mockReturnValue(satelliteQuery);
    satelliteQuery.in.mockReturnValue(satelliteQuery);
    satelliteQuery.gte.mockReturnValue(satelliteQuery);
    satelliteQuery.order.mockReturnValue(satelliteQuery);
    setupThenableMock(satelliteQuery, satelliteRows);

    const weatherQuery = createMockQueryBuilder();
    weatherQuery.select.mockReturnValue(weatherQuery);
    weatherQuery.eq.mockReturnValue(weatherQuery);
    weatherQuery.gte.mockReturnValue(weatherQuery);
    weatherQuery.order.mockReturnValue(weatherQuery);
    setupThenableMock(
      weatherQuery,
      agromindCalibrationFixture.weather_readings.map((reading, index) => {
        const readingDate = new Date(lookbackBase);
        readingDate.setDate(readingDate.getDate() + index);
        return {
          date: toIsoDate(readingDate),
          temperature_min: reading.temp_min,
          temperature_max: reading.temp_max,
          precipitation_sum: reading.precip,
          et0_fao_evapotranspiration: reading.et0,
        };
      }),
    );

    const cropReferenceQuery = createMockQueryBuilder();
    cropReferenceQuery.select.mockReturnValue(cropReferenceQuery);
    cropReferenceQuery.eq.mockReturnValue(cropReferenceQuery);
    cropReferenceQuery.maybeSingle.mockResolvedValue(
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

    const insertedCalibration = {
      id: 'calibration-001',
      parcel_id: parcelId,
      organization_id: organizationId,
      status: 'completed',
      started_at: '2026-03-12T09:00:00.000Z',
      completed_at: '2026-03-12T09:00:01.000Z',
      baseline_ndvi: 0.55,
      baseline_ndre: 0.21,
      baseline_ndmi: 0.17,
      confidence_score: agromindCalibrationFixture.expected_output.confidence_score,
      zone_classification: agromindCalibrationFixture.expected_output.zone_classification,
      phenology_stage: agromindCalibrationFixture.expected_output.phenology_stage,
      calibration_data: {},
      error_message: null,
      created_at: '2026-03-12T09:00:01.000Z',
      updated_at: '2026-03-12T09:00:01.000Z',
    };
    const calibrationInsertQuery = createMockQueryBuilder();
    calibrationInsertQuery.insert.mockReturnValue(calibrationInsertQuery);
    calibrationInsertQuery.select.mockReturnValue(calibrationInsertQuery);
    calibrationInsertQuery.single.mockResolvedValue(mockQueryResult(insertedCalibration));

    const parcelUpdateQuery = createMockQueryBuilder();
    parcelUpdateQuery.update.mockReturnValue(parcelUpdateQuery);
    parcelUpdateQuery.eq.mockReturnValue(parcelUpdateQuery);
    setupThenableMock(parcelUpdateQuery, null);

    let parcelReads = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') {
        parcelReads += 1;
        return parcelReads === 1 ? parcelQuery : parcelUpdateQuery;
      }
      if (table === 'satellite_indices_data') return satelliteQuery;
      if (table === 'weather_daily_data') return weatherQuery;
      if (table === 'crop_ai_references') return cropReferenceQuery;
      if (table === 'calibrations') return calibrationInsertQuery;
      return createMockQueryBuilder();
    });

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          baseline_ndvi: 0.55,
          baseline_ndre: 0.21,
          baseline_ndmi: 0.17,
          confidence_score: 0.82,
          zone_classification: 'normal',
          phenology_stage: 'repos_vegetatif',
          anomaly_count: 0,
          processing_time_ms: 11,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const result = await service.startCalibration(parcelId, organizationId, {});

    expect(result).toEqual(insertedCalibration);
    expect(mockDatabaseService.getAdminClient).toHaveBeenCalled();
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

    const requestBody = fetchSpy.mock.calls[0]?.[1]?.body;
    expect(typeof requestBody).toBe('string');
    if (typeof requestBody !== 'string') {
      throw new Error('Calibration request body should be a string');
    }

    const parsedRequestBody = JSON.parse(requestBody) as Record<string, unknown>;
    expect(parsedRequestBody.crop_type).toBe(agromindCalibrationFixture.parcel.crop_type);
    expect(parsedRequestBody.system).toBe(agromindCalibrationFixture.parcel.system);
    expect(parsedRequestBody.satellite_readings).toHaveLength(
      agromindCalibrationFixture.satellite_readings.length,
    );
    expect(parsedRequestBody.weather_readings).toHaveLength(
      agromindCalibrationFixture.weather_readings.length,
    );
    expect(parcelUpdateQuery.update).toHaveBeenCalledWith({
      ai_calibration_id: insertedCalibration.id,
      ai_enabled: true,
      ai_phase: 'active',
    });
  });

  it('startCalibration throws NotFoundException when the parcel does not exist', async () => {
    const parcelQuery = createMockQueryBuilder();
    parcelQuery.select.mockReturnValue(parcelQuery);
    parcelQuery.eq.mockReturnValue(parcelQuery);
    parcelQuery.single.mockResolvedValue(mockQueryResult(null, { message: 'Parcel not found' }));
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelQuery;
      return createMockQueryBuilder();
    });

    await expect(service.startCalibration(parcelId, organizationId, {})).rejects.toThrow(
      NotFoundException,
    );
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
