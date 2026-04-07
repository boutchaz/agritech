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
import { AIReportsService } from '../ai-reports/ai-reports.service';
import { SatelliteCacheService } from '../satellite-indices/satellite-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AnnualPlanService } from '../annual-plan/annual-plan.service';
import { SatelliteProxyService } from '../satellite-indices/satellite-proxy.service';
import { CalibrationReviewAdapter } from './calibration-review.adapter';

const mockAIReportsService = {
  generateReport: jest.fn().mockResolvedValue({ sections: {}, report: {} }),
};

const mockSatelliteProxyService = {
  proxy: jest.fn(),
};

const mockCalibrationReviewAdapter = {
  transform: jest.fn(),
};

const mockStateMachine = {
  transitionPhase: jest.fn(),
};

const mockNutritionOptionService = {
  suggestNutritionOption: jest.fn(),
};

const mockSatelliteCacheService = {
  syncParcelSatelliteData: jest.fn(),
};

const mockNotificationsService = {
  createNotification: jest.fn(),
};

const mockNotificationsGateway = {
  emitToOrganization: jest.fn(),
};

const mockAnnualPlanService = {
  ensurePlan: jest.fn(),
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
        { provide: AIReportsService, useValue: mockAIReportsService },
        { provide: SatelliteCacheService, useValue: mockSatelliteCacheService },
        { provide: SatelliteProxyService, useValue: mockSatelliteProxyService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
        { provide: AnnualPlanService, useValue: mockAnnualPlanService },
        { provide: CalibrationReviewAdapter, useValue: mockCalibrationReviewAdapter },
      ],
    }).compile();

    service = module.get<CalibrationService>(CalibrationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockStateMachine.transitionPhase.mockReset();
    mockNutritionOptionService.suggestNutritionOption.mockReset();
    mockSatelliteCacheService.syncParcelSatelliteData.mockReset();
    mockNotificationsService.createNotification.mockReset();
    mockNotificationsGateway.emitToOrganization.mockReset();
    mockAnnualPlanService.ensurePlan.mockReset();
    mockSatelliteProxyService.proxy.mockReset();
    mockCalibrationReviewAdapter.transform.mockReset();
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

  it('startCalibration recovers stuck calibrating then starts', async () => {
    let aiPhase = 'calibrating';

    const parcelQuery = createMockQueryBuilder();
    parcelQuery.select.mockReturnValue(parcelQuery);
    parcelQuery.eq.mockReturnValue(parcelQuery);
    parcelQuery.single.mockImplementation(async () =>
      mockQueryResult({
        id: parcelId,
        crop_type: agromindCalibrationFixture.parcel.crop_type,
        planting_system: agromindCalibrationFixture.parcel.system,
        planting_year: 2015,
        variety: 'picholine_marocaine',
        ai_phase: aiPhase,
        boundary: parcelBoundary,
        organization_id: organizationId,
        farms: { organization_id: organizationId },
      }),
    );

    const listQuery = createMockQueryBuilder();
    listQuery.select.mockReturnValue(listQuery);
    listQuery.eq.mockReturnValue(listQuery);
    listQuery.order.mockReturnValue(listQuery);
    setupThenableMock(listQuery, [
      {
        profile_snapshot: { recovery: { previous_ai_phase: 'ready_calibration' } },
        started_at: new Date().toISOString(),
      },
    ]);

    const updateQuery = createMockQueryBuilder();
    updateQuery.update.mockReturnValue(updateQuery);
    updateQuery.eq.mockReturnValue(updateQuery);
    setupThenableMock(updateQuery, null);

    const insertQuery = createMockQueryBuilder();
    insertQuery.insert.mockReturnValue(insertQuery);
    insertQuery.select.mockReturnValue(insertQuery);
    insertQuery.single.mockResolvedValue(
      mockQueryResult({
        id: 'new-calibration-id',
        parcel_id: parcelId,
        organization_id: organizationId,
        status: 'in_progress',
        type: 'initial',
        calibration_version: 'v3',
        profile_snapshot: {},
      }),
    );

    mockStateMachine.transitionPhase.mockImplementation(
      async (_pid, from: string, to: string) => {
        if (from === 'calibrating' && to === 'ready_calibration') {
          aiPhase = 'ready_calibration';
        }
        if (from === 'ready_calibration' && to === 'calibrating') {
          aiPhase = 'calibrating';
        }
      },
    );

    let calibrationsCalls = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelQuery;
      if (table === 'calibrations') {
        calibrationsCalls += 1;
        if (calibrationsCalls === 1) return listQuery;
        if (calibrationsCalls === 2) return updateQuery;
        return insertQuery;
      }
      return createMockQueryBuilder();
    });

    const result = await service.startCalibration(parcelId, organizationId, {}, {
      skipReadinessCheck: true,
    });

    expect(result.status).toBe('in_progress');
    expect(mockStateMachine.transitionPhase).toHaveBeenCalledWith(
      parcelId,
      'calibrating',
      'ready_calibration',
      organizationId,
    );
    expect(mockStateMachine.transitionPhase).toHaveBeenCalledWith(
      parcelId,
      'ready_calibration',
      'calibrating',
      organizationId,
    );
  });

  it('startCalibration restores the previous parcel phase when calibration creation fails', async () => {
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
        ai_phase: 'active',
        boundary: parcelBoundary,
        organization_id: organizationId,
        farms: { organization_id: organizationId },
      }),
    );

    const calibrationInsertQuery = createMockQueryBuilder();
    calibrationInsertQuery.insert.mockReturnValue(calibrationInsertQuery);
    calibrationInsertQuery.select.mockReturnValue(calibrationInsertQuery);
    calibrationInsertQuery.single.mockResolvedValue(
      mockQueryResult(null, { message: 'insert failed' }),
    );

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelQuery;
      if (table === 'calibrations') return calibrationInsertQuery;
      return createMockQueryBuilder();
    });

    await expect(
      service.startCalibration(parcelId, organizationId, {}, { skipReadinessCheck: true }),
    ).rejects.toThrow('Failed to create calibration: insert failed');

    expect(mockStateMachine.transitionPhase).toHaveBeenNthCalledWith(
      1,
      parcelId,
      'active',
      'calibrating',
      organizationId,
    );
    expect(mockStateMachine.transitionPhase).toHaveBeenNthCalledWith(
      2,
      parcelId,
      'calibrating',
      'active',
      organizationId,
    );
  });

  it('startPartialRecalibration restores the previous parcel phase when calibration creation fails', async () => {
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
        ai_phase: 'active',
        boundary: parcelBoundary,
        organization_id: organizationId,
        irrigation_frequency: 'weekly',
        water_quantity_per_session: 25,
        water_source: 'well',
        langue: 'fr',
        farms: { organization_id: organizationId },
      }),
    );

    const calibrationInsertQuery = createMockQueryBuilder();
    calibrationInsertQuery.insert.mockReturnValue(calibrationInsertQuery);
    calibrationInsertQuery.select.mockReturnValue(calibrationInsertQuery);
    calibrationInsertQuery.single.mockResolvedValue(
      mockQueryResult(null, { message: 'partial insert failed' }),
    );

    jest
      .spyOn(service as never, 'getLatestCompletedCalibration' as never)
      .mockResolvedValue({
        id: 'baseline-001',
        status: 'completed',
        calibration_data: { output: { health_score: 82 } },
        completed_at: '2026-03-10T10:00:00.000Z',
      } as never);
    jest
      .spyOn(service as never, 'buildUpdatedBlocksForMotif' as never)
      .mockResolvedValue({ soil_analysis: { ph: 7.1 } } as never);
    jest
      .spyOn(service as never, 'runPartialRecalibrationInBackground' as never)
      .mockResolvedValue(undefined as never);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelQuery;
      if (table === 'calibrations') return calibrationInsertQuery;
      return createMockQueryBuilder();
    });

    await expect(
      service.startPartialRecalibration(parcelId, organizationId, {
        mode_calibrage: 'partial',
        recalibration_motif: 'new_soil_analysis',
      }),
    ).rejects.toThrow('Failed to create partial recalibration: partial insert failed');

    expect(mockStateMachine.transitionPhase).toHaveBeenNthCalledWith(
      1,
      parcelId,
      'active',
      'calibrating',
      organizationId,
    );
    expect(mockStateMachine.transitionPhase).toHaveBeenNthCalledWith(
      2,
      parcelId,
      'calibrating',
      'active',
      organizationId,
    );
  });

  it('runCalibrationInBackground assembles full payload and updates calibration + parcel state', async () => {
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
    calibrationUpdateQuery.select.mockReturnValue(calibrationUpdateQuery);
    let calibrationMaybeSingleCalls = 0;
    calibrationUpdateQuery.maybeSingle.mockImplementation(async () => {
      calibrationMaybeSingleCalls += 1;
      if (calibrationMaybeSingleCalls === 1) {
        return mockQueryResult({ status: 'in_progress' });
      }
      if (calibrationMaybeSingleCalls === 2) {
        return mockQueryResult({ calibration_data: {} });
      }
      return mockQueryResult({ status: 'in_progress' });
    });
    setupThenableMock(calibrationUpdateQuery, [{ id: 'calibration-001' }]);

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

    mockSatelliteProxyService.proxy
      .mockResolvedValueOnce({
        pixels: [
          { lon: -7.5, lat: 33.5, value: 0.55 },
          { lon: -7.4999, lat: 33.5, value: 0.52 },
        ],
        bounds: { min_lon: -7.5, max_lon: -7.4999, min_lat: 33.5, max_lat: 33.5001 },
        scale: 10,
        count: 2,
        stats: { min: 0.52, max: 0.55, mean: 0.535, median: 0.535, std: 0.015 },
      })
      .mockResolvedValueOnce({ crop_type: 'olivier', updated_rows: 1 })
      .mockResolvedValueOnce({
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
      });

    await (service as unknown as { runCalibrationInBackground: (...args: unknown[]) => Promise<void> }).runCalibrationInBackground(
      'calibration-001',
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

    expect(mockSatelliteProxyService.proxy).toHaveBeenCalledTimes(3);
    expect(mockSatelliteProxyService.proxy).toHaveBeenNthCalledWith(
      1,
      'POST',
      '/calibration/v2/extract-raster',
      expect.objectContaining({ body: expect.any(Object), organizationId }),
    );
    expect(mockSatelliteProxyService.proxy).toHaveBeenNthCalledWith(
      2,
      'POST',
      '/calibration/v2/precompute-gdd',
      expect.objectContaining({ body: expect.any(Object), organizationId }),
    );
    expect(mockSatelliteProxyService.proxy).toHaveBeenNthCalledWith(
      3,
      'POST',
      '/calibration/v2/run',
      expect.objectContaining({ body: expect.any(Object), organizationId }),
    );

    const runCall = mockSatelliteProxyService.proxy.mock.calls[2];
    const runOptions = runCall?.[2] as { body?: Record<string, unknown> };
    const parsed = runOptions?.body as Record<string, unknown>;
    expect(parsed).toBeDefined();
    expect(parsed.calibration_input).toBeDefined();
    expect(parsed.satellite_images).toBeDefined();
    expect(parsed.weather_rows).toBeDefined();

    expect(calibrationUpdateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        calibration_version: 'v3',
        health_score: 84,
        yield_potential_min: 1000,
        yield_potential_max: 1500,
        phase_age: 'pleine_production',
        anomaly_count: 1,
      }),
    );

    expect(parcelUpdateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        ai_calibration_id: 'calibration-001',
      }),
    );

    expect(mockStateMachine.transitionPhase).toHaveBeenCalledWith(
      parcelId,
      'calibrating',
      'calibrated',
      organizationId,
    );
    expect(mockStateMachine.transitionPhase).toHaveBeenCalledTimes(1);
  });
});
