import { Test, TestingModule } from '@nestjs/testing';
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
import {
  AiAlertsService,
  CreateAiAlertInput,
} from './ai-alerts.service';

describe('AiAlertsService', () => {
  let service: AiAlertsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const organizationId = '11111111-1111-1111-1111-111111111111';
  const parcelId = '22222222-2222-2222-2222-222222222222';
  const alertId = '33333333-3333-3333-3333-333333333333';

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAlertsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AiAlertsService>(AiAlertsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getAlerts returns only AI alerts', async () => {
    const alertsQuery = createMockQueryBuilder();
    alertsQuery.select.mockReturnValue(alertsQuery);
    alertsQuery.eq.mockReturnValue(alertsQuery);
    alertsQuery.order.mockReturnValue(alertsQuery);

    const aiAlerts = [
      {
        id: alertId,
        parcel_id: parcelId,
        organization_id: organizationId,
        alert_type: 'ai_drought_stress',
        severity: 'warning',
        title: 'AI drought stress',
        description: 'Vegetation stress detected',
        acknowledged_at: null,
        resolved_at: null,
        is_ai_generated: true,
        alert_code: 'AI-001',
        category: 'water',
        priority: 'high',
        entry_threshold: null,
        exit_threshold: null,
        trigger_data: { ndmi: -0.24 },
        satellite_reading_id: null,
        action_delay: null,
        created_at: '2026-03-12T10:00:00.000Z',
        updated_at: '2026-03-12T10:00:00.000Z',
      },
    ];
    setupThenableMock(alertsQuery, aiAlerts);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'performance_alerts') {
        return alertsQuery;
      }

      return createMockQueryBuilder();
    });

    const result = await service.getAlerts(parcelId, organizationId);

    expect(result).toEqual(aiAlerts);
    expect(alertsQuery.eq).toHaveBeenCalledWith('parcel_id', parcelId);
    expect(alertsQuery.eq).toHaveBeenCalledWith('organization_id', organizationId);
    expect(alertsQuery.eq).toHaveBeenCalledWith('is_ai_generated', true);
    expect(alertsQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('acknowledgeAlert updates the correct row', async () => {
    const lookupQuery = createLookupQuery();
    const updateQuery = createMutationQuery({
      id: alertId,
      parcel_id: parcelId,
      organization_id: organizationId,
      alert_type: 'ai_heat_stress',
      severity: 'critical',
      title: 'AI heat stress',
      description: 'Heat spike expected',
      acknowledged_at: '2026-03-12T11:00:00.000Z',
      resolved_at: null,
      is_ai_generated: true,
      alert_code: 'AI-002',
      category: 'climate',
      priority: 'high',
      entry_threshold: null,
      exit_threshold: null,
      trigger_data: null,
      satellite_reading_id: null,
      action_delay: null,
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T11:00:00.000Z',
    });

    let performanceAlertsCalls = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table !== 'performance_alerts') {
        return createMockQueryBuilder();
      }

      performanceAlertsCalls += 1;
      return performanceAlertsCalls === 1 ? lookupQuery : updateQuery;
    });

    await service.acknowledgeAlert(alertId, organizationId);

    expect(lookupQuery.eq).toHaveBeenCalledWith('id', alertId);
    expect(lookupQuery.eq).toHaveBeenCalledWith('organization_id', organizationId);
    expect(lookupQuery.eq).toHaveBeenCalledWith('is_ai_generated', true);
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        acknowledged_at: expect.any(String),
      }),
    );
    expect(updateQuery.eq).toHaveBeenCalledWith('id', alertId);
    expect(updateQuery.eq).toHaveBeenCalledWith('organization_id', organizationId);
    expect(updateQuery.eq).toHaveBeenCalledWith('is_ai_generated', true);
  });

  it('createAiAlert inserts a valid AI alert type', async () => {
    const insertQuery = createMutationQuery({
      id: alertId,
      parcel_id: parcelId,
      organization_id: organizationId,
      alert_type: 'ai_pest_risk',
      severity: 'warning',
      title: 'AI pest risk',
      description: 'Pest pressure is rising',
      acknowledged_at: null,
      resolved_at: null,
      is_ai_generated: true,
      alert_code: 'AI-003',
      category: 'pest',
      priority: 'medium',
      entry_threshold: 0.7,
      exit_threshold: 0.5,
      trigger_data: { confidence: 0.82 },
      satellite_reading_id: null,
      action_delay: 2,
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T10:00:00.000Z',
    });

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'performance_alerts') {
        return insertQuery;
      }

      return createMockQueryBuilder();
    });

    const payload: CreateAiAlertInput = {
      parcel_id: parcelId,
      organization_id: organizationId,
      alert_type: 'ai_pest_risk',
      severity: 'warning',
      title: 'AI pest risk',
      description: 'Pest pressure is rising',
      alert_code: 'AI-003',
      category: 'pest',
      priority: 'medium',
      entry_threshold: 0.7,
      exit_threshold: 0.5,
      trigger_data: { confidence: 0.82 },
      action_delay: 2,
    };

    const result = await service.createAiAlert(payload);

    expect(result.alert_type).toBe('ai_pest_risk');
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        alert_type: 'ai_pest_risk',
        severity: 'warning',
        is_ai_generated: true,
      }),
    );
  });

  function createLookupQuery(): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue(mockQueryResult({ id: alertId }));
    return query;
  }

  function createMutationQuery(data: unknown): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.insert.mockReturnValue(query);
    query.update.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.single.mockResolvedValue(mockQueryResult(data));
    return query;
  }
});
