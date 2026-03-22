import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CalibrationStateMachine } from './calibration-state-machine';
import { CalibrationService } from './calibration.service';
import { agromindCalibrationFixture } from './fixtures/test-fixture';
import { DatabaseService } from '../database/database.service';
import { NutritionOptionService } from './nutrition-option.service';
import { AIReportsService } from '../ai-reports/ai-reports.service';
import { SatelliteCacheService } from '../satellite-indices/satellite-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AnnualPlanService } from '../annual-plan/annual-plan.service';
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

const mockStateMachine = {
  transitionPhase: jest.fn(),
};

const mockNutritionOptionService = {
  suggestNutritionOption: jest.fn(),
};

const mockAIReportsService = {
  generateReport: jest.fn().mockResolvedValue({ sections: {}, report: {} }),
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

const organizationId = 'org-001';
const parcelId = agromindCalibrationFixture.parcel.id;
const calibrationId = 'calibration-v2-001';
const parcelBoundary = [
  [-7.1, 31.7],
  [-7.1, 31.8],
  [-7.0, 31.8],
  [-7.0, 31.7],
  [-7.1, 31.7],
];

const lookbackBase = new Date();
lookbackBase.setDate(lookbackBase.getDate() - 730);

const mockAnnualPlanService = {
  ensurePlan: jest.fn().mockResolvedValue({
    id: 'plan-001',
    parcel_id: parcelId,
    organization_id: organizationId,
    year: 2026,
    status: 'draft',
    interventions: [],
  }),
};

const toIsoDate = (d: Date): string => d.toISOString().split('T')[0];

const v2OutputFixture = {
  step1: {
    satellite_extraction: {
      series: { NDVI: [0.35, 0.42, 0.55, 0.63, 0.68] },
      total_readings: 50,
    },
  },
  step2: {
    weather_stats: {
      total_days: 365,
      avg_temp: 18.5,
    },
  },
  step3: {
    global_percentiles: {
      NDVI: { p10: 0.35, p25: 0.42, p50: 0.55, p75: 0.63, p90: 0.68 },
      NDRE: { p50: 0.21 },
      NDMI: { p50: 0.17 },
    },
    percentiles: {
      NDVI: { p10: 0.35, p25: 0.42, p50: 0.55, p75: 0.63, p90: 0.68 },
    },
  },
  step4: {
    phenology: {
      current_stage: 'fruit_development',
      gdd_accumulated: 1800,
    },
    mean_dates: {
      fruit_development: '2025-06-01',
    },
  },
  step5: {
    anomalies: [],
  },
  step6: {
    yield_potential: {
      minimum: 4.2,
      maximum: 8.1,
    },
  },
  step7: {
    zone_distribution: { A: 0.35, B: 0.3, C: 0.2, D: 0.1, E: 0.05 },
    zone_summary: [
      { class_name: 'A', surface_percent: 35 },
      { class_name: 'B', surface_percent: 30 },
      { class_name: 'C', surface_percent: 20 },
      { class_name: 'D', surface_percent: 10 },
      { class_name: 'E', surface_percent: 5 },
    ],
  },
  step8: {
    health_score: {
      total: 72,
      vigor: 75,
      homogeneity: 68,
    },
  },
  confidence: {
    normalized_score: 0.63,
    total_score: 75,
  },
  maturity_phase: 'adult',
};

describe('Calibration V2 integration', () => {
  let calibrationService: CalibrationService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  beforeEach(async () => {
    process.env.SATELLITE_SERVICE_URL = 'http://satellite-service.test';
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);
    mockStateMachine.transitionPhase.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalibrationService,
        { provide: CalibrationStateMachine, useValue: mockStateMachine },
        { provide: NutritionOptionService, useValue: mockNutritionOptionService },
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: AIReportsService, useValue: mockAIReportsService },
        { provide: SatelliteCacheService, useValue: mockSatelliteCacheService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
        { provide: AnnualPlanService, useValue: mockAnnualPlanService },
      ],
    }).compile();

    calibrationService = module.get<CalibrationService>(CalibrationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockStateMachine.transitionPhase.mockReset();
    mockNutritionOptionService.suggestNutritionOption.mockReset();
    mockSatelliteCacheService.syncParcelSatelliteData.mockReset();
    mockNotificationsService.createNotification.mockReset();
    mockNotificationsGateway.emitToOrganization.mockReset();
    mockAnnualPlanService.ensurePlan.mockClear();
    delete process.env.SATELLITE_SERVICE_URL;
  });

  it('startCalibration creates in-progress v2 calibration and transitions to awaiting_validation after background completion', async () => {
    const state = setupV2StatefulMock('disabled');
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(mockV2FetchImplementation);

    mockStateMachine.transitionPhase.mockImplementation(async (pid, _from, to, orgId) => {
      if (pid === parcelId && orgId === organizationId) {
        state.parcel.ai_phase = to;
      }
    });

    const startResult = await calibrationService.startCalibration(parcelId, organizationId, {});

    expect(startResult.status).toBe('in_progress');
    expect((startResult as { calibration_version?: string }).calibration_version).toBe('v2');
    expect(mockStateMachine.transitionPhase).toHaveBeenCalledWith(
      parcelId,
      'disabled',
      'calibrating',
      organizationId,
    );

    await flushBackgroundTasks();

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://satellite-service.test/api/calibration/v2/run',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(state.calibration.status).toBe('completed');
    expect(state.parcel.ai_phase).toBe('awaiting_validation');
    expect(mockStateMachine.transitionPhase).toHaveBeenCalledWith(
      parcelId,
      'calibrating',
      'awaiting_validation',
      organizationId,
    );
  });

  it('completes the full happy path flow end-to-end from disabled to active', async () => {
    const state = setupV2StatefulMock('disabled');
    jest.spyOn(global, 'fetch').mockImplementation(mockV2FetchImplementation);
    mockNutritionOptionService.suggestNutritionOption.mockResolvedValue({
      suggested_option: 'A',
      confidence: 0.73,
      reason: 'Highest expected growth response',
    });

    mockStateMachine.transitionPhase.mockImplementation(async (pid, _from, to, orgId) => {
      if (pid === parcelId && orgId === organizationId) {
        state.parcel.ai_phase = to;
      }
    });

    await calibrationService.startCalibration(parcelId, organizationId, {});
    await flushBackgroundTasks();

    expect(state.parcel.ai_phase).toBe('awaiting_validation');

    await calibrationService.validateCalibration(calibrationId, organizationId);
    expect(state.parcel.ai_phase).toBe('awaiting_nutrition_option');

    const suggestion = await calibrationService.getNutritionSuggestion(parcelId, organizationId);
    await calibrationService.confirmNutritionOption(
      calibrationId,
      organizationId,
      suggestion.suggested_option,
    );

    expect(state.parcel.ai_phase).toBe('active');
    expect(state.parcel.ai_nutrition_option).toBe(suggestion.suggested_option);
  });

  it('validateCalibration marks validation as true and transitions to awaiting_nutrition_option', async () => {
    const state = setupV2StatefulMock('awaiting_validation', {
      status: 'completed',
      completed_at: new Date().toISOString(),
      calibration_data: {
        version: 'v2',
        output: v2OutputFixture,
        validation: { validated: false, validated_at: null },
      },
    });

    mockStateMachine.transitionPhase.mockImplementation(async (pid, _from, to, orgId) => {
      if (pid === parcelId && orgId === organizationId) {
        state.parcel.ai_phase = to;
      }
    });

    const validated = await calibrationService.validateCalibration(calibrationId, organizationId);

    const validatedData = validated.calibration_data as {
      validation?: { validated?: boolean; validated_at?: string | null };
    };
    expect(validatedData.validation?.validated).toBe(true);
    expect(validatedData.validation?.validated_at).toEqual(expect.any(String));
    expect(mockStateMachine.transitionPhase).toHaveBeenCalledWith(
      parcelId,
      'awaiting_validation',
      'awaiting_nutrition_option',
      organizationId,
    );
  });

  it('getNutritionSuggestion returns suggested option and delegates to nutrition service', async () => {
    setupV2StatefulMock('awaiting_nutrition_option');
    mockNutritionOptionService.suggestNutritionOption.mockResolvedValue({
      suggested_option: 'C',
      confidence: 0.77,
      reason: 'Nitrogen and potassium balance',
    });

    const suggestion = await calibrationService.getNutritionSuggestion(parcelId, organizationId);

    expect(['A', 'B', 'C']).toContain(suggestion.suggested_option);
    expect(mockNutritionOptionService.suggestNutritionOption).toHaveBeenCalledWith(
      parcelId,
      organizationId,
    );
  });

  it('confirmNutritionOption persists ai_nutrition_option and transitions to active', async () => {
    const state = setupV2StatefulMock('awaiting_nutrition_option', {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    mockStateMachine.transitionPhase.mockImplementation(async (pid, _from, to, orgId) => {
      if (pid === parcelId && orgId === organizationId) {
        state.parcel.ai_phase = to;
      }
    });

    const result = await calibrationService.confirmNutritionOption(calibrationId, organizationId, 'B');

    expect(result).toEqual({
      calibration_id: calibrationId,
      parcel_id: parcelId,
      option: 'B',
      ai_phase: 'active',
    });
    expect(state.parcel.ai_nutrition_option).toBe('B');
    expect(mockStateMachine.transitionPhase).toHaveBeenCalledWith(
      parcelId,
      'awaiting_nutrition_option',
      'active',
      organizationId,
    );
  });

  it('getCalibrationReport returns complete report including v2 output payload', async () => {
    setupV2StatefulMock('active', {
      status: 'completed',
      completed_at: new Date().toISOString(),
      calibration_data: {
        version: 'v2',
        output: v2OutputFixture,
        validation: { validated: true, validated_at: new Date().toISOString() },
      },
    });

    const report = await calibrationService.getCalibrationReport(parcelId, organizationId);

    expect(report).not.toBeNull();
    expect(report?.calibration.id).toBe(calibrationId);
    expect(report?.report.output).toMatchObject({
      maturity_phase: 'adult',
      step1: { satellite_extraction: { total_readings: 50 } },
      step8: { health_score: { total: 72 } },
      confidence: { normalized_score: 0.63 },
    });
  });

  it('startCalibration rejects concurrent calibration when ai_phase is calibrating', async () => {
    setupV2StatefulMock('calibrating');

    await expect(calibrationService.startCalibration(parcelId, organizationId, {})).rejects.toThrow(
      BadRequestException,
    );
    await expect(calibrationService.startCalibration(parcelId, organizationId, {})).rejects.toThrow(
      'already in progress',
    );
  });

  it('allows recalibration when parcel ai_phase is awaiting_validation', async () => {
    setupV2StatefulMock('awaiting_validation');
    jest.spyOn(global, 'fetch').mockImplementation(mockV2FetchImplementation);

    const result = await calibrationService.startCalibration(parcelId, organizationId, {});

    expect(result.status).toBe('in_progress');
    expect(mockStateMachine.transitionPhase).toHaveBeenCalledWith(
      parcelId,
      'awaiting_validation',
      'calibrating',
      organizationId,
    );
  });

  it('validateCalibration rejects when parcel is not in awaiting_validation', async () => {
    setupV2StatefulMock('disabled', {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    await expect(calibrationService.validateCalibration(calibrationId, organizationId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('confirmNutritionOption rejects when parcel is not in awaiting_nutrition_option', async () => {
    setupV2StatefulMock('awaiting_validation', {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    await expect(
      calibrationService.confirmNutritionOption(calibrationId, organizationId, 'A'),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows recalibration when parcel ai_phase is active', async () => {
    setupV2StatefulMock('active');
    jest.spyOn(global, 'fetch').mockImplementation(mockV2FetchImplementation);

    const result = await calibrationService.startCalibration(parcelId, organizationId, {});

    expect(result.status).toBe('in_progress');
    expect(mockStateMachine.transitionPhase).toHaveBeenCalledWith(
      parcelId,
      'active',
      'calibrating',
      organizationId,
    );
  });

  it('auto-activates a full recalibration started from an active parcel', async () => {
    const state = setupV2StatefulMock('active');
    state.parcel.ai_nutrition_option = 'B';
    jest.spyOn(global, 'fetch').mockImplementation(mockV2FetchImplementation);

    mockStateMachine.transitionPhase.mockImplementation(async (pid, _from, to, orgId) => {
      if (pid === parcelId && orgId === organizationId) {
        state.parcel.ai_phase = to;
      }
    });

    await calibrationService.startCalibration(parcelId, organizationId, {});
    await flushBackgroundTasks();

    expect(state.parcel.ai_phase).toBe('active');
    expect(
      (state.calibration.calibration_data as { validation?: { validated?: boolean } }).validation?.validated,
    ).toBe(true);
    expect(mockAnnualPlanService.ensurePlan).toHaveBeenCalledWith(
      parcelId,
      organizationId,
    );
    expect(mockStateMachine.transitionPhase).toHaveBeenCalledWith(
      parcelId,
      'awaiting_validation',
      'active',
      organizationId,
    );
  });

  it('auto-activates annual recalibration and triggers annual plan generation', async () => {
    const state = setupV2StatefulMock('active');
    state.parcel.ai_nutrition_option = 'A';
    jest.spyOn(global, 'fetch').mockImplementation(mockV2FetchImplementation);

    mockStateMachine.transitionPhase.mockImplementation(async (pid, _from, to, orgId) => {
      if (pid === parcelId && orgId === organizationId) {
        state.parcel.ai_phase = to;
      }
    });

    await calibrationService.startCalibration(parcelId, organizationId, {
      mode_calibrage: 'annual',
      recalibration_motif: 'post_campaign',
    });
    await flushBackgroundTasks();

    expect(state.parcel.ai_phase).toBe('active');
    expect(state.calibration.mode_calibrage).toBe('annual');
    expect(
      (state.calibration.calibration_data as { validation?: { validated?: boolean } }).validation?.validated,
    ).toBe(true);
    expect(mockAnnualPlanService.ensurePlan).toHaveBeenCalledWith(
      parcelId,
      organizationId,
    );
  });

  it('auto-activates partial recalibration after completion', async () => {
    const state = setupV2StatefulMock('active', {
      status: 'completed',
      completed_at: new Date().toISOString(),
      calibration_data: {
        version: 'v2',
        output: v2OutputFixture,
        validation: { validated: true, validated_at: new Date().toISOString() },
      },
    });
    state.parcel.ai_nutrition_option = 'C';
    jest.spyOn(global, 'fetch').mockImplementation(mockV2FetchImplementation);

    mockStateMachine.transitionPhase.mockImplementation(async (pid, _from, to, orgId) => {
      if (pid === parcelId && orgId === organizationId) {
        state.parcel.ai_phase = to;
      }
    });

    await calibrationService.startPartialRecalibration(parcelId, organizationId, {
      mode_calibrage: 'partial',
      recalibration_motif: 'new_soil_analysis',
    });
    await flushBackgroundTasks();

    expect(state.parcel.ai_phase).toBe('active');
    expect(state.calibration.mode_calibrage).toBe('partial');
    expect(
      (state.calibration.calibration_data as { validation?: { validated?: boolean } }).validation?.validated,
    ).toBe(true);
    expect(mockStateMachine.transitionPhase).toHaveBeenCalledWith(
      parcelId,
      'awaiting_validation',
      'active',
      organizationId,
    );
  });

  function setupV2StatefulMock(
    initialAiPhase: string,
    calibrationOverrides?: Record<string, unknown>,
  ): {
    parcel: {
      ai_phase: string;
      ai_calibration_id: string | null;
      ai_nutrition_option: 'A' | 'B' | 'C' | null;
    };
    calibration: Record<string, unknown>;
  } {
    const parcelState = {
      ai_phase: initialAiPhase,
      ai_calibration_id: null as string | null,
      ai_nutrition_option: null as 'A' | 'B' | 'C' | null,
    };

    const calibrationState: Record<string, unknown> = {
      id: calibrationId,
      parcel_id: parcelId,
      organization_id: organizationId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      completed_at: null,
      calibration_version: 'v2',
      calibration_data: {
        version: 'v2',
        validation: { validated: false, validated_at: null },
      },
      ...calibrationOverrides,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const parcelQuery = createStatefulParcelQuery(parcelState);
    const calibrationQuery = createStatefulCalibrationQuery(calibrationState);
    const satelliteQuery = createV2SatelliteQuery();
    const satelliteImagesQuery = createV2SatelliteQuery();
    const weatherQuery = createV2WeatherQuery();
    const analysesQuery = createAnalysesQuery();
    const harvestQuery = createHarvestQuery();
    const cropReferenceQuery = createCropReferenceQuery();
    let parcelTableCalls = 0;
    let calibrationTableCalls = 0;

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') {
        parcelTableCalls += 1;
        return parcelQuery;
      }
      if (table === 'satellite_indices_data') {
        return satelliteQuery;
      }
      if (table === 'satellite_images') {
        return satelliteImagesQuery;
      }
      if (table === 'weather_daily_data') {
        return weatherQuery;
      }
      if (table === 'analyses') {
        return analysesQuery;
      }
      if (table === 'harvest_records') {
        return harvestQuery;
      }
      if (table === 'crop_ai_references') {
        return cropReferenceQuery;
      }
      if (table === 'calibrations') {
        calibrationTableCalls += 1;
        return calibrationQuery;
      }
      return createMockQueryBuilder();
    });

    return { parcel: parcelState, calibration: calibrationState };
  }

  function createStatefulParcelQuery(parcelState: {
    ai_phase: string;
    ai_calibration_id: string | null;
    ai_nutrition_option: 'A' | 'B' | 'C' | null;
  }): MockQueryBuilder {
    const query = createMockQueryBuilder();
    let pendingUpdate: Record<string, unknown> | null = null;

    query.select.mockReturnValue(query);
    query.update.mockImplementation((payload: Record<string, unknown>) => {
      pendingUpdate = payload;
      return query;
    });
    query.eq.mockImplementation((column: string, value: string) => {
      if (pendingUpdate && column === 'id' && value === parcelId) {
        if (typeof pendingUpdate.ai_calibration_id === 'string') {
          parcelState.ai_calibration_id = pendingUpdate.ai_calibration_id;
        }
        if (
          pendingUpdate.ai_nutrition_option === 'A' ||
          pendingUpdate.ai_nutrition_option === 'B' ||
          pendingUpdate.ai_nutrition_option === 'C'
        ) {
          parcelState.ai_nutrition_option = pendingUpdate.ai_nutrition_option;
        }
        if (typeof pendingUpdate.ai_phase === 'string') {
          parcelState.ai_phase = pendingUpdate.ai_phase;
        }
      }
      return query;
    });
    query.single.mockImplementation(async () =>
      mockQueryResult({
        id: parcelId,
        crop_type: 'olivier',
        planting_system: agromindCalibrationFixture.parcel.system,
        planting_year: 2000,
        variety: agromindCalibrationFixture.parcel.variety,
        ai_phase: parcelState.ai_phase,
        boundary: parcelBoundary,
        organization_id: organizationId,
        farms: { organization_id: organizationId },
      }),
    );

    setupThenableMock(query, null);
    return query;
  }

  function createStatefulCalibrationQuery(
    calibrationState: Record<string, unknown>,
  ): MockQueryBuilder {
    const query = createMockQueryBuilder();
    let pendingInsert: Record<string, unknown> | null = null;
    let pendingUpdate: Record<string, unknown> | null = null;

    query.select.mockReturnValue(query);
    query.insert.mockImplementation((payload: Record<string, unknown>) => {
      pendingInsert = payload;
      return query;
    });
    query.update.mockImplementation((payload: Record<string, unknown>) => {
      pendingUpdate = payload;
      return query;
    });
    query.eq.mockImplementation((column: string, value: string) => {
      if (pendingUpdate && column === 'id' && value === calibrationId) {
        Object.assign(calibrationState, pendingUpdate, {
          updated_at: new Date().toISOString(),
        });
      }
      return query;
    });
    query.order.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.single.mockImplementation(async () => {
      if (pendingInsert) {
        Object.assign(calibrationState, pendingInsert, {
          id: calibrationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: null,
        });
        pendingInsert = null;
      }
      pendingUpdate = null;
      return mockQueryResult(calibrationState);
    });
    query.maybeSingle.mockImplementation(async () => mockQueryResult(calibrationState));

    setupThenableMock(query, null);
    return query;
  }

  function createV2SatelliteQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.gte.mockReturnValue(query);
    query.order.mockReturnValue(query);
    setupThenableMock(
      query,
      agromindCalibrationFixture.satellite_readings.flatMap((reading, index) => {
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
      }),
    );
    return query;
  }

  function createV2WeatherQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.gte.mockReturnValue(query);
    query.order.mockReturnValue(query);
    setupThenableMock(
      query,
      agromindCalibrationFixture.weather_readings.map((reading, index) => {
        const readingDate = new Date(lookbackBase);
        readingDate.setDate(readingDate.getDate() + index);
        return {
          date: toIsoDate(readingDate),
          latitude: 31.75,
          longitude: -7.05,
          temperature_min: reading.temp_min,
          temperature_max: reading.temp_max,
          temperature_mean: (reading.temp_min + reading.temp_max) / 2,
          relative_humidity_mean: 55,
          wind_speed_max: 14,
          shortwave_radiation_sum: 16,
          precipitation_sum: reading.precip,
          et0_fao_evapotranspiration: reading.et0,
          gdd_olivier: null,
          chill_hours: 0,
        };
      }),
    );
    return query;
  }

  function createAnalysesQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.order.mockReturnValue(query);
    setupThenableMock(query, [
      { analysis_type: 'soil', analysis_date: '2025-01-10', data: { ph: 7.2 } },
      { analysis_type: 'water', analysis_date: '2025-01-12', data: { ec: 1.3 } },
    ]);
    return query;
  }

  function createHarvestQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    setupThenableMock(query, [
      { harvest_date: '2024-10-01', quantity: 1400, unit: 'kg' },
      { harvest_date: '2025-10-01', quantity: 1500, unit: 'kg' },
    ]);
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

  async function flushBackgroundTasks(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  async function mockV2FetchImplementation(
    input: RequestInfo | URL,
  ): Promise<Response> {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.endsWith('/api/calibration/v2/precompute-gdd')) {
      return new Response(
        JSON.stringify({
          crop_type: 'olivier',
          updated_rows: agromindCalibrationFixture.weather_readings.length,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (url.endsWith('/api/calibration/v2/run')) {
      return new Response(JSON.stringify(v2OutputFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('unexpected url', { status: 404 });
  }
});
