import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  mockQueryResult,
  MockDatabaseService,
  MockQueryBuilder,
  MockSupabaseClient,
  createMockSupabaseClient,
  setupThenableMock,
} from '../../../test/helpers/mock-database.helper';
import { AnnualPlanService } from './annual-plan.service';

describe('AnnualPlanService', () => {
  let service: AnnualPlanService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const organizationId = '11111111-1111-1111-1111-111111111111';
  const parcelId = '22222222-2222-2222-2222-222222222222';
  const planId = '33333333-3333-3333-3333-333333333333';

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnualPlanService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AnnualPlanService>(AnnualPlanService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('generatePlan creates 12 monthly interventions for olivier', async () => {
    const parcelQuery = createLookupQuery({
      id: parcelId,
      crop_type: 'olivier',
      variety: 'Picholine Marocaine',
      ai_calibration_id: null,
    });
    const cropReferenceQuery = createLookupQuery({
      reference_data: createOliveReferenceData(),
    });
    const annualPlanInsertQuery = createSingleInsertQuery({
      id: planId,
      parcel_id: parcelId,
      organization_id: organizationId,
      calibration_id: null,
      year: 2026,
      status: 'draft',
      crop_type: 'olivier',
      variety: 'Picholine Marocaine',
      plan_data: null,
      validated_at: null,
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T10:00:00.000Z',
    });

    let insertedInterventions: Record<string, unknown>[] = [];
    const interventionInsertQuery = createManyInsertQuery(() =>
      insertedInterventions.map((intervention, index) => ({
        id: `intervention-${index + 1}`,
        annual_plan_id: planId,
        parcel_id: parcelId,
        organization_id: organizationId,
        month: intervention.month,
        week: null,
        intervention_type: intervention.intervention_type,
        description: intervention.description,
        product: intervention.product,
        dose: null,
        unit: null,
        status: 'planned',
        executed_at: null,
        notes: intervention.notes,
        created_at: '2026-03-12T10:00:00.000Z',
        updated_at: '2026-03-12T10:00:00.000Z',
      })),
    );
    interventionInsertQuery.insert.mockImplementation((payload: Record<string, unknown>[]) => {
      insertedInterventions = payload;
      return interventionInsertQuery;
    });

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') {
        return parcelQuery;
      }

      if (table === 'crop_ai_references') {
        return cropReferenceQuery;
      }

      if (table === 'annual_plans') {
        return annualPlanInsertQuery;
      }

      if (table === 'plan_interventions') {
        return interventionInsertQuery;
      }

      return createMockQueryBuilder();
    });

    const result = await service.generatePlan(parcelId, organizationId, 2026);

    expect(result.interventions).toHaveLength(12);
    expect(insertedInterventions).toHaveLength(12);
    expect(insertedInterventions.map((item) => item.month)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(interventionInsertQuery.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          month: 2,
          intervention_type: 'NPK+micro+biostim+irrigation',
        }),
      ]),
    );
  });

  it('ensurePlan returns the existing draft plan without regenerating it', async () => {
    const annualPlanQuery = createLookupQuery({
      id: planId,
      parcel_id: parcelId,
      organization_id: organizationId,
      calibration_id: 'calibration-001',
      year: 2026,
      status: 'draft',
      crop_type: 'olivier',
      variety: 'Picholine Marocaine',
      plan_data: { source: 'manual-edits' },
      validated_at: null,
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-20T10:00:00.000Z',
    });
    const interventionsQuery = createInterventionsQuery([
      createInterventionRecord(2, 'planned'),
      createInterventionRecord(1, 'planned'),
    ]);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'annual_plans') {
        return annualPlanQuery;
      }

      if (table === 'plan_interventions') {
        return interventionsQuery;
      }

      return createMockQueryBuilder();
    });

    const regenerateSpy = jest.spyOn(service, 'regeneratePlan');

    const result = await service.ensurePlan(parcelId, organizationId, 2026);

    expect(regenerateSpy).not.toHaveBeenCalled();
    expect(result.id).toBe(planId);
    expect(result.plan_data).toEqual({ source: 'manual-edits' });
    expect(result.interventions.map((intervention) => intervention.month)).toEqual([1, 2]);
  });

  it('getSummary returns intervention status counts', async () => {
    const annualPlanQuery = createLatestPlanQuery({
      id: planId,
      parcel_id: parcelId,
      organization_id: organizationId,
      calibration_id: null,
      season: '2026',
      status: 'draft',
      crop_type: 'olivier',
      variety: 'Picholine Marocaine',
      plan_data: null,
      validated_at: null,
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T10:00:00.000Z',
    });
    const interventionsQuery = createInterventionsQuery([
      createInterventionRecord(1, 'planned'),
      createInterventionRecord(2, 'executed'),
      createInterventionRecord(3, 'skipped'),
      createInterventionRecord(4, 'planned'),
    ]);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'annual_plans') {
        return annualPlanQuery;
      }

      if (table === 'plan_interventions') {
        return interventionsQuery;
      }

      return createMockQueryBuilder();
    });

    const summary = await service.getSummary(parcelId, organizationId);

    expect(summary).toEqual({
      plan_id: planId,
      parcel_id: parcelId,
      season: '2026',
      status: 'draft',
      total_interventions: 4,
      executed: 1,
      planned: 2,
      skipped: 1,
    });
  });

  it('validatePlan transitions draft plans to validated', async () => {
    const lookupQuery = createLookupQuery({
      id: planId,
      parcel_id: parcelId,
      organization_id: organizationId,
      calibration_id: null,
      year: 2026,
      status: 'draft',
      crop_type: 'olivier',
      variety: 'Picholine Marocaine',
      plan_data: null,
      validated_at: null,
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T10:00:00.000Z',
    });
    const updateQuery = createUpdateQuery({
      id: planId,
      parcel_id: parcelId,
      organization_id: organizationId,
      calibration_id: null,
      year: 2026,
      status: 'validated',
      crop_type: 'olivier',
      variety: 'Picholine Marocaine',
      plan_data: null,
      validated_at: '2026-03-12T12:00:00.000Z',
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T12:00:00.000Z',
    });

    const interventionsAfterValidate = createInterventionsQuery([]);

    let planCallCount = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'plan_interventions') {
        return interventionsAfterValidate;
      }

      if (table !== 'annual_plans') {
        return createMockQueryBuilder();
      }

      planCallCount += 1;
      return planCallCount === 1 ? lookupQuery : updateQuery;
    });

    const result = await service.validatePlan(planId, organizationId);

    expect(result.status).toBe('validated');
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'validated', validated_at: expect.any(String) }),
    );
  });

  it('validatePlan rejects non-draft plans', async () => {
    const lookupQuery = createLookupQuery({
      id: planId,
      parcel_id: parcelId,
      organization_id: organizationId,
      calibration_id: null,
      year: 2026,
      status: 'validated',
      crop_type: 'olivier',
      variety: 'Picholine Marocaine',
      plan_data: null,
      validated_at: '2026-03-12T12:00:00.000Z',
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T12:00:00.000Z',
    });

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'annual_plans') {
        return lookupQuery;
      }

      return createMockQueryBuilder();
    });

    await expect(service.validatePlan(planId, organizationId)).rejects.toThrow(
      BadRequestException,
    );
  });

  describe('getValidatedPlanOrNull', () => {
    it('returns plan with interventions when a validated plan exists', async () => {
      const validatedPlanRow = {
        id: planId,
        parcel_id: parcelId,
        organization_id: organizationId,
        season: '2025-2026',
        status: 'validated',
        crop_type: 'olivier',
        variety: 'Picholine Marocaine',
        plan_data: null,
        validated_at: '2026-03-12T12:00:00.000Z',
        calibration_id: null,
        created_at: '2026-03-10T10:00:00.000Z',
        updated_at: null,
      };

      const annualQuery = createMockQueryBuilder();
      annualQuery.select.mockReturnValue(annualQuery);
      annualQuery.eq.mockReturnValue(annualQuery);
      annualQuery.in.mockReturnValue(annualQuery);
      annualQuery.order.mockReturnValue(annualQuery);
      annualQuery.limit.mockReturnValue(annualQuery);
      annualQuery.maybeSingle.mockResolvedValue(mockQueryResult(validatedPlanRow));

      const interventionsQuery = createInterventionsQuery([
        createInterventionRecord(3, 'planned'),
      ]);

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'annual_plans') {
          return annualQuery;
        }
        if (table === 'plan_interventions') {
          return interventionsQuery;
        }
        return createMockQueryBuilder();
      });

      const result = await service.getValidatedPlanOrNull(parcelId, organizationId);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('validated');
      expect(result!.interventions).toHaveLength(1);
      expect(annualQuery.in).toHaveBeenCalledWith('status', ['validated', 'active']);
    });

    it('returns null when no validated or active plan exists', async () => {
      const annualQuery = createMockQueryBuilder();
      annualQuery.select.mockReturnValue(annualQuery);
      annualQuery.eq.mockReturnValue(annualQuery);
      annualQuery.in.mockReturnValue(annualQuery);
      annualQuery.order.mockReturnValue(annualQuery);
      annualQuery.limit.mockReturnValue(annualQuery);
      annualQuery.maybeSingle.mockResolvedValue(mockQueryResult(null));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'annual_plans') {
          return annualQuery;
        }
        return createMockQueryBuilder();
      });

      const result = await service.getValidatedPlanOrNull(parcelId, organizationId);

      expect(result).toBeNull();
    });
  });

  function createLookupQuery(data: unknown): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue(mockQueryResult(data));
    return query;
  }

  function createSingleInsertQuery(data: unknown): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.insert.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.single.mockResolvedValue(mockQueryResult(data));
    return query;
  }

  function createManyInsertQuery(
    getData: () => unknown[],
  ): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.insert.mockReturnValue(query);
    query.select.mockReturnValue(query);
    setupThenableMock(query, getData());
    query.select.mockImplementation(() => {
      setupThenableMock(query, getData());
      return query;
    });
    return query;
  }

  function createLatestPlanQuery(data: unknown): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue(mockQueryResult(data));
    return query;
  }

  function createInterventionsQuery(data: unknown[]): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    setupThenableMock(query, data);
    return query;
  }

  function createUpdateQuery(data: unknown): MockQueryBuilder {
    const query = createMockQueryBuilder();
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.single.mockResolvedValue(mockQueryResult(data));
    return query;
  }

  function createOliveReferenceData(): Record<string, unknown> {
    return {
      plan_annuel: {
        calendrier_type_intensif: {
          jan: { phyto: 'huile_blanche', irrigation: 'faible' },
          fev: {
            NPK: 'TSP_fond_N1',
            micro: 'Fe-EDDHA',
            biostim: 'humiques_amines',
            irrigation: 'reprise',
          },
          mar: {
            NPK: 'N2',
            micro: 'Zn_Mn_foliaire',
            biostim: 'algues',
            phyto: 'Cu_si_taille',
            irrigation: 'progressive',
          },
          avr: { NPK: 'N3_K', irrigation: 'croissante' },
          mai: { NPK: 'K', micro: 'B_floraison', phyto: 'mouche_si_seuil' },
          juin: { NPK: 'K_N', micro: 'Fe-EDDHA', irrigation: 'maximum' },
          juil: { NPK: 'K', biostim: 'algues', irrigation: 'maximum' },
          aout: { NPK: 'K_dernier', irrigation: 'maximum_ou_RDI' },
          sept: { biostim: 'humiques', irrigation: 'reduction' },
          oct: { phyto: 'Cu_oeil_paon', irrigation: 'reduction' },
          nov: {
            NPK: 'N_reconstitution',
            biostim: 'humiques_granule',
            phyto: 'Cu_oeil_paon',
          },
          dec: { biostim: 'amines_post_recolte', irrigation: 'tres_faible' },
        },
      },
    };
  }

  function createInterventionRecord(
    month: number,
    status: 'planned' | 'executed' | 'skipped',
  ) {
    return {
      id: `intervention-${month}`,
      annual_plan_id: planId,
      parcel_id: parcelId,
      organization_id: organizationId,
      month,
      week: null,
      intervention_type: 'monthly_plan',
      description: `Month ${month}`,
      product: null,
      dose: null,
      unit: null,
      status,
      executed_at: status === 'executed' ? '2026-03-12T12:00:00.000Z' : null,
      notes: null,
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T10:00:00.000Z',
    };
  }
});
