import { BadRequestException, NotFoundException } from '@nestjs/common';
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
import { AiRecommendationsService } from './ai-recommendations.service';

describe('AiRecommendationsService', () => {
  let service: AiRecommendationsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const organizationId = '11111111-1111-1111-1111-111111111111';
  const parcelId = '22222222-2222-2222-2222-222222222222';
  const recommendationId = '33333333-3333-3333-3333-333333333333';

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiRecommendationsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AiRecommendationsService>(AiRecommendationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getRecommendations returns org-scoped results for a parcel', async () => {
    const recommendationsQuery = createMockQueryBuilder();
    recommendationsQuery.select.mockReturnValue(recommendationsQuery);
    recommendationsQuery.eq.mockReturnValue(recommendationsQuery);
    recommendationsQuery.order.mockReturnValue(recommendationsQuery);

    const recommendations = [
      {
        id: recommendationId,
        parcel_id: parcelId,
        organization_id: organizationId,
        calibration_id: null,
        status: 'pending',
        constat: 'Constat',
        diagnostic: 'Diagnostic',
        action: 'Action',
        conditions: 'Conditions',
        suivi: 'Suivi',
        crop_type: 'olivier',
        alert_code: 'AI-REC-001',
        priority: 'high',
        valid_from: '2026-03-12T00:00:00.000Z',
        valid_until: '2026-03-20T00:00:00.000Z',
        executed_at: null,
        execution_notes: null,
        created_at: '2026-03-12T10:00:00.000Z',
        updated_at: '2026-03-12T10:00:00.000Z',
      },
    ];
    setupThenableMock(recommendationsQuery, recommendations);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'ai_recommendations') {
        return recommendationsQuery;
      }

      return createMockQueryBuilder();
    });

    const result = await service.getRecommendations(parcelId, organizationId);

    expect(result).toEqual(recommendations);
    expect(recommendationsQuery.eq).toHaveBeenCalledWith('parcel_id', parcelId);
    expect(recommendationsQuery.eq).toHaveBeenCalledWith(
      'organization_id',
      organizationId,
    );
    expect(recommendationsQuery.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
  });

  it('getRecommendation throws 404 when the recommendation does not exist', async () => {
    const lookupQuery = createLookupQuery(null);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'ai_recommendations') {
        return lookupQuery;
      }

      return createMockQueryBuilder();
    });

    await expect(
      service.getRecommendation(recommendationId, organizationId),
    ).rejects.toThrow(NotFoundException);
  });

  it('executeRecommendation rejects a pending recommendation', async () => {
    const lookupQuery = createLookupQuery({
      id: recommendationId,
      parcel_id: parcelId,
      organization_id: organizationId,
      calibration_id: null,
      status: 'pending',
      constat: 'Constat',
      diagnostic: 'Diagnostic',
      action: 'Action',
      conditions: null,
      suivi: null,
      crop_type: 'olivier',
      alert_code: 'AI-REC-001',
      priority: 'high',
      valid_from: null,
      valid_until: null,
      executed_at: null,
      execution_notes: null,
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T10:00:00.000Z',
    });

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'ai_recommendations') {
        return lookupQuery;
      }

      return createMockQueryBuilder();
    });

    await expect(
      service.executeRecommendation(
        recommendationId,
        organizationId,
        'Apply treatment tomorrow',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(lookupQuery.eq).toHaveBeenCalledWith('id', recommendationId);
    expect(lookupQuery.eq).toHaveBeenCalledWith('organization_id', organizationId);
  });

  it('validateRecommendation updates a pending recommendation to validated', async () => {
    const lookupQuery = createLookupQuery({
      id: recommendationId,
      parcel_id: parcelId,
      organization_id: organizationId,
      calibration_id: null,
      status: 'pending',
      constat: 'Constat',
      diagnostic: 'Diagnostic',
      action: 'Action',
      conditions: null,
      suivi: null,
      crop_type: 'olivier',
      alert_code: 'AI-REC-001',
      priority: 'high',
      valid_from: null,
      valid_until: null,
      executed_at: null,
      execution_notes: null,
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T10:00:00.000Z',
    });
    const updateQuery = createMutationQuery({
      id: recommendationId,
      parcel_id: parcelId,
      organization_id: organizationId,
      calibration_id: null,
      status: 'validated',
      constat: 'Constat',
      diagnostic: 'Diagnostic',
      action: 'Action',
      conditions: null,
      suivi: null,
      crop_type: 'olivier',
      alert_code: 'AI-REC-001',
      priority: 'high',
      valid_from: null,
      valid_until: null,
      executed_at: null,
      execution_notes: null,
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T10:05:00.000Z',
    });

    let recommendationCalls = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table !== 'ai_recommendations') {
        return createMockQueryBuilder();
      }

      recommendationCalls += 1;
      return recommendationCalls === 1 ? lookupQuery : updateQuery;
    });

    const result = await service.validateRecommendation(
      recommendationId,
      organizationId,
    );

    expect(result.status).toBe('validated');
    expect(updateQuery.update).toHaveBeenCalledWith({ status: 'validated' });
    expect(updateQuery.eq).toHaveBeenCalledWith('id', recommendationId);
    expect(updateQuery.eq).toHaveBeenCalledWith('organization_id', organizationId);
  });

  it('executeRecommendation creates a product_applications row with ai_recommendation_id FK', async () => {
    const farmId = '44444444-4444-4444-4444-444444444444';
    const productId = '55555555-5555-5555-5555-555555555555';
    const executionNotes = 'Apply treatment tomorrow';
    const lookupQuery = createLookupQuery({
      id: recommendationId,
      parcel_id: parcelId,
      organization_id: organizationId,
      calibration_id: null,
      status: 'validated',
      constat: 'Constat',
      diagnostic: 'Diagnostic',
      action: 'Apply foliar spray',
      conditions: null,
      suivi: null,
      crop_type: 'olivier',
      alert_code: 'AI-REC-001',
      priority: 'high',
      valid_from: null,
      valid_until: null,
      executed_at: null,
      execution_notes: null,
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T10:00:00.000Z',
    });
    const updateQuery = createMutationQuery({
      id: recommendationId,
      parcel_id: parcelId,
      organization_id: organizationId,
      calibration_id: null,
      status: 'executed',
      constat: 'Constat',
      diagnostic: 'Diagnostic',
      action: 'Apply foliar spray',
      conditions: null,
      suivi: null,
      crop_type: 'olivier',
      alert_code: 'AI-REC-001',
      priority: 'high',
      valid_from: null,
      valid_until: null,
      executed_at: '2026-03-12T12:00:00.000Z',
      execution_notes: executionNotes,
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T12:00:00.000Z',
    });
    const parcelQuery = createLookupQuery({
      farm_id: farmId,
      area: 3.5,
      calculated_area: null,
    });
    const itemQuery = createLookupQuery({
      id: productId,
    });
    const productApplicationQuery = createInsertQuery({
      id: '66666666-6666-6666-6666-666666666666',
      ai_recommendation_id: recommendationId,
      organization_id: organizationId,
      farm_id: farmId,
      parcel_id: parcelId,
      product_id: productId,
      application_date: '2026-03-12T12:00:00.000Z',
      quantity_used: 1,
      area_treated: 3.5,
      cost: 0,
      currency: 'MAD',
      notes: executionNotes,
      task_id: null,
      images: null,
      created_at: '2026-03-12T12:00:00.000Z',
      updated_at: '2026-03-12T12:00:00.000Z',
    });

    let recommendationCalls = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'ai_recommendations') {
        recommendationCalls += 1;
        return recommendationCalls === 1 ? lookupQuery : updateQuery;
      }

      if (table === 'parcels') {
        return parcelQuery;
      }

      if (table === 'items') {
        return itemQuery;
      }

      if (table === 'product_applications') {
        return productApplicationQuery;
      }

      return createMockQueryBuilder();
    });

    const result = await service.executeRecommendation(
      recommendationId,
      organizationId,
      executionNotes,
    );

    expect(result.status).toBe('executed');
    expect(result.product_application).toEqual(
      expect.objectContaining({
        ai_recommendation_id: recommendationId,
        product_id: productId,
      }),
    );
    expect(productApplicationQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        ai_recommendation_id: recommendationId,
        organization_id: organizationId,
        parcel_id: parcelId,
        farm_id: farmId,
        product_id: productId,
        quantity_used: 1,
        area_treated: 3.5,
        notes: executionNotes,
        application_date: expect.any(String),
      }),
    );
  });

  function createLookupQuery(data: unknown): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue(mockQueryResult(data));
    return query;
  }

  function createMutationQuery(data: unknown): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.update.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.single.mockResolvedValue(mockQueryResult(data));
    return query;
  }

  function createInsertQuery(data: unknown): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.insert.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.single.mockResolvedValue(mockQueryResult(data));
    return query;
  }
});
