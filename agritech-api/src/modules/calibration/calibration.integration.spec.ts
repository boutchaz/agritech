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
import { CalibrationStateMachine } from './calibration-state-machine';
import { NutritionOptionService } from './nutrition-option.service';
import { AIReportsService } from '../ai-reports/ai-reports.service';
import { AnnualPlanService } from '../annual-plan/annual-plan.service';
import { SatelliteCacheService } from '../satellite-indices/satellite-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { SatelliteProxyService } from '../satellite-indices/satellite-proxy.service';
import { CalibrationReviewAdapter } from './calibration-review.adapter';

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

const mockAIReportsService = {
  generateReport: jest.fn().mockResolvedValue({ sections: {}, report: {} }),
};

const mockAnnualPlanService = {
  ensurePlan: jest.fn(),
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

describe('Calibration integration', () => {
  let diagnosticsService: AiDiagnosticsService;
  let alertsService: AiAlertsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const organizationId = 'org-001';
  const parcelId = agromindCalibrationFixture.parcel.id;
const lookbackBase = new Date();
lookbackBase.setDate(lookbackBase.getDate() - 730);

const toIsoDate = (d: Date): string => d.toISOString().split('T')[0];

  beforeEach(async () => {
    process.env.SATELLITE_SERVICE_URL = 'http://satellite-service.test';
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: DatabaseService, useValue: mockDatabaseService },
        CalibrationService,
        { provide: CalibrationStateMachine, useValue: mockStateMachine },
        { provide: NutritionOptionService, useValue: mockNutritionOptionService },
        { provide: AIReportsService, useValue: mockAIReportsService },
        { provide: AnnualPlanService, useValue: mockAnnualPlanService },
        { provide: SatelliteCacheService, useValue: mockSatelliteCacheService },
        { provide: SatelliteProxyService, useValue: mockSatelliteProxyService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
        { provide: CalibrationReviewAdapter, useValue: mockCalibrationReviewAdapter },
        AiDiagnosticsService,
        AiAlertsService,
      ],
    }).compile();

    diagnosticsService = module.get<AiDiagnosticsService>(AiDiagnosticsService);
    alertsService = module.get<AiAlertsService>(AiAlertsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockStateMachine.transitionPhase.mockReset();
    mockNutritionOptionService.suggestNutritionOption.mockReset();
    delete process.env.SATELLITE_SERVICE_URL;
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
    expect(result.indicators.p50_ndvi).toBe(0.55);
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

  function createDiagnosticsParcelQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.single.mockResolvedValue(
      mockQueryResult({
        id: parcelId,
        crop_type: agromindCalibrationFixture.parcel.crop_type,
        ai_phase: 'active',
        farms: { organization_id: organizationId },
      }),
    );
    return query;
  }

  function createDiagnosticsSatelliteQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
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
        ];
      }),
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
      agromindCalibrationFixture.weather_readings.map((reading, index) => {
        const readingDate = new Date(lookbackBase);
        readingDate.setDate(readingDate.getDate() + index);
        return {
          date: toIsoDate(readingDate),
          temperature_min: reading.temp_min,
          precipitation_sum: reading.precip,
          et0_fao_evapotranspiration: reading.et0,
        };
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
        p50_ndvi: agromindCalibrationFixture.expected_output.baseline_ndvi,
        p50_ndre: 0.21,
        p50_ndmi: 0.17,
        baseline_data: {
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

});
