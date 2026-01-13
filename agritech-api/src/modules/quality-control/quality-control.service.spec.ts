import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { QualityControlService } from './quality-control.service';
import { DatabaseService } from '../database/database.service';
import { InspectionStatus, InspectionType } from './dto';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS, TEST_DATES } from '../../../test/helpers/test-utils';

describe('QualityControlService', () => {
  let service: QualityControlService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const MOCK_INSPECTIONS = [
    {
      id: 'inspection-1',
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      parcel_id: TEST_IDS.parcel,
      crop_cycle_id: 'cycle-1',
      inspector_id: TEST_IDS.user,
      type: InspectionType.HARVEST,
      status: InspectionStatus.PENDING,
      inspection_date: new Date(TEST_DATES.today),
      overall_score: 85,
      sample_size: 10,
      results: '{"defects": 2, "quality": "high"}',
      notes: 'Good quality expected',
      created_at: TEST_DATES.today,
      updated_at: TEST_DATES.today,
    },
    {
      id: 'inspection-2',
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      parcel_id: TEST_IDS.parcel,
      crop_cycle_id: 'cycle-1',
      inspector_id: TEST_IDS.user,
      type: InspectionType.PLANTING,
      status: InspectionStatus.PASSED,
      inspection_date: new Date(TEST_DATES.yesterday),
      overall_score: 92,
      sample_size: 15,
      results: '{"defects": 1, "quality": "excellent"}',
      notes: 'Excellent harvest quality',
      created_at: TEST_DATES.yesterday,
      updated_at: TEST_DATES.yesterday,
    },
    {
      id: 'inspection-3',
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      parcel_id: TEST_IDS.parcel,
      crop_cycle_id: 'cycle-2',
      inspector_id: TEST_IDS.user,
      type: InspectionType.SOIL,
      status: InspectionStatus.IN_PROGRESS,
      inspection_date: new Date(TEST_DATES.today),
      overall_score: null,
      sample_size: 5,
      results: null,
      notes: 'Currently inspecting',
      created_at: TEST_DATES.today,
      updated_at: TEST_DATES.today,
    },
  ];

  const INSPECTION_TYPES = Object.values(InspectionType);

  const INSPECTION_STATUSES = Object.values(InspectionStatus);

  const QUALITY_SCORES = [0, 50, 75, 85, 90, 95, 100];

  const INVALID_IDS = ['', '   ', '\t\n', null, undefined];

  const FILTER_SCENARIOS = [
    { description: 'type filter', filters: { type: InspectionType.HARVEST } },
    { description: 'status filter', filters: { status: InspectionStatus.PASSED } },
    { description: 'farm filter', filters: { farm_id: TEST_IDS.farm } },
    { description: 'parcel filter', filters: { parcel_id: TEST_IDS.parcel } },
    { description: 'inspector filter', filters: { inspector_id: TEST_IDS.user } },
    { description: 'date range filter', filters: { inspection_date_from: new Date(TEST_DATES.lastWeek), inspection_date_to: new Date(TEST_DATES.today) } },
    { description: 'score range filter', filters: { min_overall_score: 80, max_overall_score: 100 } },
    { description: 'search filter', filters: { search: 'quality' } },
  ];

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityControlService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<QualityControlService>(QualityControlService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function setupInspectionQuery(inspections: any[], shouldExist: boolean = true) {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.gte.mockReturnValue(queryBuilder);
    queryBuilder.lte.mockReturnValue(queryBuilder);
    queryBuilder.or.mockReturnValue(queryBuilder);
    queryBuilder.order.mockReturnValue(queryBuilder);
    queryBuilder.range.mockReturnValue(queryBuilder);
    queryBuilder.single.mockReturnValue(queryBuilder);
    queryBuilder.maybeSingle.mockResolvedValue(
      shouldExist ? mockQueryResult(inspections[0]) : mockQueryResult(null, null)
    );
    queryBuilder.insert.mockReturnValue(queryBuilder);
    queryBuilder.update.mockReturnValue(queryBuilder);
    queryBuilder.delete.mockReturnValue(queryBuilder);
    mockClient.from.mockReturnValue(queryBuilder);
    return queryBuilder;
  }

  // ============================================================
  // PARAMETERIZED TESTS - FILTERS
  // ============================================================

  describe('findAll with filters (Parameterized)', () => {
    it.each(FILTER_SCENARIOS)(
      'should apply $description correctly',
      async ({ filters }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.gte.mockReturnValue(queryBuilder);
        queryBuilder.lte.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: MOCK_INSPECTIONS,
          error: null,
          count: MOCK_INSPECTIONS.length,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(
          TEST_IDS.organization,
          filters
        );

        expect(result).toBeDefined();
        expect(result.data).toEqual(MOCK_INSPECTIONS);
        expect(result.total).toBe(MOCK_INSPECTIONS.length);
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('findAll', () => {
      it.each(INVALID_IDS)(
        'should handle invalid organization ID: %s',
        async (orgId) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.order.mockReturnValue(queryBuilder);
          queryBuilder.range.mockResolvedValue({
            data: null,
            error: { message: 'Invalid organization' },
            count: null,
          });
          mockClient.from.mockReturnValue(queryBuilder);

          await expect(
            service.findAll(orgId as any)
          ).rejects.toThrow();
        }
      );

      it('should handle database error gracefully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
          count: null,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.findAll(TEST_IDS.organization)).rejects.toThrow();
      });

      it('should handle null data response', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: null,
          error: null,
          count: 0,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization);

        expect(result.data).toEqual([]);
        expect(result.total).toBe(0);
      });
    });

    describe('findOne', () => {
      it.each(INVALID_IDS)(
        'should handle invalid inspection ID: %s',
        async (id) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          });
          mockClient.from.mockReturnValue(queryBuilder);

          await expect(
            service.findOne(id as any, TEST_IDS.organization)
          ).rejects.toThrow();
        }
      );

      it('should throw error for non-existent inspection', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.findOne('non-existent', TEST_IDS.organization)
        ).rejects.toThrow();
      });
    });

    describe('create', () => {
      it('should set default status to PENDING when not provided', async () => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          type: 'pre_harvest',
          inspection_date: TEST_DATES.today,
          // status not provided
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: {
            id: 'inspection-1',
            status: InspectionStatus.PENDING,
          },
          error: null,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          TEST_IDS.organization,
          TEST_IDS.user,
          createDto as any
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ status: InspectionStatus.PENDING })
        );
      });

      it('should use provided status when given', async () => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          type: 'pre_harvest',
          inspection_date: TEST_DATES.today,
          status: InspectionStatus.IN_PROGRESS,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: {
            id: 'inspection-1',
            status: InspectionStatus.IN_PROGRESS,
          },
          error: null,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          TEST_IDS.organization,
          TEST_IDS.user,
          createDto as any
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ status: InspectionStatus.IN_PROGRESS })
        );
      });

      it('should handle missing optional fields', async () => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          type: 'pre_harvest',
          inspection_date: TEST_DATES.today,
          // crop_cycle_id, inspector_id, overall_score, sample_size, results, notes not provided
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: { id: 'inspection-1' },
          error: null,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          TEST_IDS.organization,
          TEST_IDS.user,
          createDto as any
        );

        expect(result).toBeDefined();
      });
    });

    describe('update', () => {
      it('should throw NotFoundException for non-existent inspection', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: null,
          error: null,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update(
            'non-existent',
            TEST_IDS.organization,
            TEST_IDS.user,
            { notes: 'Updated' }
          )
        ).rejects.toThrow(NotFoundException);
      });

      it('should include updated_by and updated_at', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: MOCK_INSPECTIONS[0],
          error: null,
        });
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: { ...MOCK_INSPECTIONS[0], notes: 'Updated' },
          error: null,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.update(
          MOCK_INSPECTIONS[0].id,
          TEST_IDS.organization,
          TEST_IDS.user,
          { notes: 'Updated' }
        );

        expect(queryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            updated_by: TEST_IDS.user,
            updated_at: expect.any(String),
          })
        );
      });
    });

    describe('remove', () => {
      it('should throw NotFoundException for non-existent inspection', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: null,
          error: null,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.remove('non-existent', TEST_IDS.organization)
        ).rejects.toThrow(NotFoundException);
      });

      it('should prevent deletion of in-progress inspections', async () => {
        const inProgressInspection = MOCK_INSPECTIONS[2]; // IN_PROGRESS status

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: inProgressInspection,
          error: null,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.remove(inProgressInspection.id, TEST_IDS.organization)
        ).rejects.toThrow(ConflictException);
        await expect(
          service.remove(inProgressInspection.id, TEST_IDS.organization)
        ).rejects.toThrow('Cannot delete');
      });

      it('should allow deletion of pending inspections', async () => {
        const pendingInspection = MOCK_INSPECTIONS[0]; // PENDING status

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: pendingInspection,
          error: null,
        });
        queryBuilder.delete.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.remove(
          pendingInspection.id,
          TEST_IDS.organization
        );

        expect(result).toEqual({ id: pendingInspection.id });
        expect(queryBuilder.delete).toHaveBeenCalled();
      });

      it('should allow deletion of passed inspections', async () => {
        const passedInspection = MOCK_INSPECTIONS[1]; // PASSED status

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: passedInspection,
          error: null,
        });
        queryBuilder.delete.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.remove(
          passedInspection.id,
          TEST_IDS.organization
        );

        expect(result).toEqual({ id: passedInspection.id });
        expect(queryBuilder.delete).toHaveBeenCalled();
      });
    });

    describe('updateStatus', () => {
      it('should throw NotFoundException for non-existent inspection', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: null,
          error: null,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.updateStatus(
            'non-existent',
            TEST_IDS.organization,
            TEST_IDS.user,
            InspectionStatus.PASSED
          )
        ).rejects.toThrow(NotFoundException);
      });

      it('should update status successfully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS[0],
          error: null,
        });
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValueOnce({
          data: { ...MOCK_INSPECTIONS[0], status: InspectionStatus.PASSED },
          error: null,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.updateStatus(
          MOCK_INSPECTIONS[0].id,
          TEST_IDS.organization,
          TEST_IDS.user,
          InspectionStatus.PASSED
        );

        expect(queryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: InspectionStatus.PASSED,
            updated_by: TEST_IDS.user,
            updated_at: expect.any(String),
          })
        );
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Quality Inspections CRUD', () => {
    describe('findAll', () => {
      it('should return paginated results', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: MOCK_INSPECTIONS,
          error: null,
          count: 20,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          page: '1',
          pageSize: '10',
        });

        expect(result.data).toEqual(MOCK_INSPECTIONS);
        expect(result.total).toBe(20);
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(10);
        expect(result.totalPages).toBe(2);
      });

      it('should default to page 1 and pageSize 12', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: MOCK_INSPECTIONS,
          error: null,
          count: MOCK_INSPECTIONS.length,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization);

        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(12);
      });

      it('should apply sort order', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: MOCK_INSPECTIONS,
          error: null,
          count: MOCK_INSPECTIONS.length,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await service.findAll(TEST_IDS.organization, {
          sortBy: 'inspection_date',
          sortDir: 'asc',
        });

        expect(queryBuilder.order).toHaveBeenCalledWith('inspection_date', {
          ascending: true,
        });
      });

      it('should default sort to inspection_date descending', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: MOCK_INSPECTIONS,
          error: null,
          count: MOCK_INSPECTIONS.length,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await service.findAll(TEST_IDS.organization);

        expect(queryBuilder.order).toHaveBeenCalledWith('inspection_date', {
          ascending: false,
        });
      });

      it('should search in notes and results fields', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: MOCK_INSPECTIONS,
          error: null,
          count: MOCK_INSPECTIONS.length,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await service.findAll(TEST_IDS.organization, {
          search: 'quality',
        });

        expect(queryBuilder.or).toHaveBeenCalledWith(
          expect.stringContaining('notes.ilike')
        );
        expect(queryBuilder.or).toHaveBeenCalledWith(
          expect.stringContaining('results.ilike')
        );
      });
    });

    describe('create', () => {
      it('should include organization context', async () => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          type: 'pre_harvest',
          inspection_date: TEST_DATES.today,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: { id: 'inspection-1' },
          error: null,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await service.create(
          TEST_IDS.organization,
          TEST_IDS.user,
          createDto as any
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            organization_id: TEST_IDS.organization,
            created_by: TEST_IDS.user,
          })
        );
      });
    });

    describe('getStatistics', () => {
      it('should calculate statistics correctly', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);

        // Mock byType query
        queryBuilder.eq.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS,
          error: null,
        });

        // Mock byStatus query
        queryBuilder.eq.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS,
          error: null,
        });

        // Mock scores query
        queryBuilder.eq.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS.filter((i) => i.overall_score !== null),
          error: null,
        });

        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStatistics(TEST_IDS.organization);

        expect(result.total).toBe(MOCK_INSPECTIONS.length);
        expect(result.averageScore).toBeDefined();
        expect(result.byType).toBeDefined();
        expect(result.byStatus).toBeDefined();
      });

      it('should handle inspections with null scores', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);

        queryBuilder.eq.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS,
          error: null,
        });

        queryBuilder.eq.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS,
          error: null,
        });

        queryBuilder.eq.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS.filter((i) => i.overall_score !== null),
          error: null,
        });

        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStatistics(TEST_IDS.organization);

        const validScores = MOCK_INSPECTIONS.filter((i) => i.overall_score !== null);
        const expectedAvg = validScores.reduce((sum, i) => sum + (i.overall_score || 0), 0) / validScores.length;

        expect(result.averageScore).toBeCloseTo(expectedAvg, 1);
      });

      it('should handle empty inspections array', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);

        queryBuilder.eq.mockResolvedValueOnce({
          data: [],
          error: null,
        });

        queryBuilder.eq.mockResolvedValueOnce({
          data: [],
          error: null,
        });

        queryBuilder.eq.mockResolvedValueOnce({
          data: [],
          error: null,
        });

        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStatistics(TEST_IDS.organization);

        expect(result.total).toBe(0);
        expect(result.averageScore).toBe(0);
        expect(result.byType).toEqual({});
        expect(result.byStatus).toEqual({});
      });

      it('should count by type correctly', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);

        queryBuilder.eq.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS,
          error: null,
        });

        queryBuilder.eq.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS,
          error: null,
        });

        queryBuilder.eq.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS.filter((i) => i.overall_score !== null),
          error: null,
        });

        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStatistics(TEST_IDS.organization);

        expect(result.byType).toBeDefined();
        expect(result.byType['pre_harvest']).toBe(1);
        expect(result.byType['post_harvest']).toBe(1);
        expect(result.byType['storage']).toBe(1);
      });

      it('should count by status correctly', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);

        queryBuilder.eq.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS,
          error: null,
        });

        queryBuilder.eq.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS,
          error: null,
        });

        queryBuilder.eq.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS.filter((i) => i.overall_score !== null),
          error: null,
        });

        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStatistics(TEST_IDS.organization);

        expect(result.byStatus).toBeDefined();
        expect(result.byStatus[InspectionStatus.PENDING]).toBe(1);
        expect(result.byStatus[InspectionStatus.PASSED]).toBe(1);
        expect(result.byStatus[InspectionStatus.IN_PROGRESS]).toBe(1);
      });
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Quality Score Edge Cases', () => {
      it.each(QUALITY_SCORES)(
        'should handle quality score of %s',
        async (score) => {
          const createDto = {
            farm_id: TEST_IDS.farm,
            parcel_id: TEST_IDS.parcel,
            type: 'pre_harvest',
            inspection_date: TEST_DATES.today,
            overall_score: score,
          };

          const queryBuilder = createMockQueryBuilder();
          queryBuilder.insert.mockReturnValue(queryBuilder);
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue({
            data: { id: 'inspection-1', overall_score: score },
            error: null,
          });
          mockClient.from.mockReturnValue(queryBuilder);

          const result = await service.create(
            TEST_IDS.organization,
            TEST_IDS.user,
            createDto as any
          );

          expect(result).toBeDefined();
        }
      );

      it('should handle null overall_score', async () => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          type: 'pre_harvest',
          inspection_date: TEST_DATES.today,
          overall_score: null,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: { id: 'inspection-1', overall_score: null },
          error: null,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          TEST_IDS.organization,
          TEST_IDS.user,
          createDto as any
        );

        expect(result).toBeDefined();
      });
    });

    describe('Pagination Edge Cases', () => {
      it('should handle page beyond total pages', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: [],
          error: null,
          count: 10,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          page: '5',
          pageSize: '10',
        });

        expect(result.data).toEqual([]);
        expect(result.totalPages).toBe(1);
      });

      it('should handle pageSize of 1', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: [MOCK_INSPECTIONS[0]],
          error: null,
          count: MOCK_INSPECTIONS.length,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          page: '1',
          pageSize: '1',
        });

        expect(result.data).toHaveLength(1);
        expect(result.totalPages).toBe(MOCK_INSPECTIONS.length);
      });

      it('should handle large pageSize', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: MOCK_INSPECTIONS,
          error: null,
          count: MOCK_INSPECTIONS.length,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          page: '1',
          pageSize: '1000',
        });

        expect(result.totalPages).toBe(1);
      });
    });

    describe('Date Range Edge Cases', () => {
      it('should handle start_date equal to end_date', async () => {
        const sameDate = TEST_DATES.today;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.gte.mockReturnValue(queryBuilder);
        queryBuilder.lte.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: MOCK_INSPECTIONS,
          error: null,
          count: MOCK_INSPECTIONS.length,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          inspection_date_from: new Date(sameDate),
          inspection_date_to: new Date(sameDate),
        });

        expect(queryBuilder.gte).toHaveBeenCalledWith('inspection_date', sameDate);
        expect(queryBuilder.lte).toHaveBeenCalledWith('inspection_date', sameDate);
      });

      it('should handle end_date before start_date', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.gte.mockReturnValue(queryBuilder);
        queryBuilder.lte.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          inspection_date_from: new Date(TEST_DATES.today),
          inspection_date_to: new Date(TEST_DATES.yesterday),
        });

        expect(result.data).toEqual([]);
      });
    });

    describe('Score Range Edge Cases', () => {
      it('should handle min_overall_score equal to max_overall_score', async () => {
        const sameScore = 85;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.gte.mockReturnValue(queryBuilder);
        queryBuilder.lte.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: MOCK_INSPECTIONS.filter((i) => i.overall_score === sameScore),
          error: null,
          count: 1,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          min_overall_score: sameScore,
          max_overall_score: sameScore,
        });

        expect(queryBuilder.gte).toHaveBeenCalledWith('overall_score', sameScore);
        expect(queryBuilder.lte).toHaveBeenCalledWith('overall_score', sameScore);
      });

      it('should handle min_overall_score greater than max_overall_score', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.gte.mockReturnValue(queryBuilder);
        queryBuilder.lte.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          min_overall_score: 90,
          max_overall_score: 80,
        });

        expect(result.data).toEqual([]);
      });
    });

    describe('Status Transition Edge Cases', () => {
      it.each(INSPECTION_STATUSES)('should handle status: %s', async (status) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValueOnce({
          data: MOCK_INSPECTIONS[0],
          error: null,
        });
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValueOnce({
          data: { ...MOCK_INSPECTIONS[0], status },
          error: null,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.updateStatus(
          MOCK_INSPECTIONS[0].id,
          TEST_IDS.organization,
          TEST_IDS.user,
          status
        );

        expect(result.status).toBe(status);
      });
    });
  });

  // ============================================================
  // PARAMETERIZED TESTS - INSPECTION TYPES
  // ============================================================

  describe('Inspection Types (Parameterized)', () => {
    it.each(INSPECTION_TYPES)('should handle inspection type: %s', async (type) => {
      const createDto = {
        farm_id: TEST_IDS.farm,
        parcel_id: TEST_IDS.parcel,
        type,
        inspection_date: TEST_DATES.today,
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue({
        data: { id: 'inspection-1', type },
        error: null,
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(
        TEST_IDS.organization,
        TEST_IDS.user,
        createDto as any
      );

      expect(result.type).toBe(type);
    });
  });

  // ============================================================
  // SEARCH FUNCTIONALITY TESTS
  // ============================================================

  describe('Search Functionality', () => {
    it('should handle empty search string', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue({
        data: MOCK_INSPECTIONS,
        error: null,
        count: MOCK_INSPECTIONS.length,
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(TEST_IDS.organization, {
        search: '',
      });

      expect(result).toBeDefined();
    });

    it('should handle search with special characters', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue({
        data: MOCK_INSPECTIONS,
        error: null,
        count: MOCK_INSPECTIONS.length,
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(TEST_IDS.organization, {
        search: "Côte d'Ivoire",
      });

      expect(result).toBeDefined();
    });

    it('should handle search with wildcards', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue({
        data: MOCK_INSPECTIONS,
        error: null,
        count: MOCK_INSPECTIONS.length,
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(TEST_IDS.organization, {
        search: '%quality%',
      });

      expect(result).toBeDefined();
    });
  });

  // ============================================================
  // RESULTS FIELD HANDLING
  // ============================================================

  describe('Results Field Handling', () => {
    it('should handle null results field', async () => {
      const createDto = {
        farm_id: TEST_IDS.farm,
        parcel_id: TEST_IDS.parcel,
        type: 'pre_harvest',
        inspection_date: TEST_DATES.today,
        results: null,
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue({
        data: { id: 'inspection-1', results: null },
        error: null,
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(
        TEST_IDS.organization,
        TEST_IDS.user,
        createDto as any
      );

      expect(result).toBeDefined();
    });

    it('should handle complex results object', async () => {
      const complexResults = {
        defects: [
          { type: 'pest_damage', severity: 'low', count: 2 },
          { type: 'nutrient_deficiency', severity: 'medium', count: 1 },
        ],
        quality_metrics: {
          color: 'excellent',
          size: 'good',
          texture: 'excellent',
        },
        overall_assessment: 'high_quality',
        recommendations: ['Increase irrigation', 'Monitor pest activity'],
      };

      const createDto = {
        farm_id: TEST_IDS.farm,
        parcel_id: TEST_IDS.parcel,
        type: 'pre_harvest',
        inspection_date: TEST_DATES.today,
        results: complexResults,
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue({
        data: { id: 'inspection-1', results: complexResults },
        error: null,
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(
        TEST_IDS.organization,
        TEST_IDS.user,
        createDto as any
      );

      expect(result).toBeDefined();
    });
  });

  // ============================================================
  // DELETION RESTRICTIONS TESTS
  // ============================================================

  describe('Deletion Restrictions', () => {
    it('should allow deletion of cancelled inspections', async () => {
      const cancelledInspection = {
        ...MOCK_INSPECTIONS[0],
        status: InspectionStatus.CANCELLED,
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue({
        data: cancelledInspection,
        error: null,
      });
      queryBuilder.delete.mockReturnValue(queryBuilder);
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.remove(
        cancelledInspection.id,
        TEST_IDS.organization
      );

      expect(result).toEqual({ id: cancelledInspection.id });
    });

    it.each([
      InspectionStatus.PENDING,
      InspectionStatus.PASSED,
      InspectionStatus.CANCELLED,
    ])(
      'should allow deletion of inspection with status: %s',
      async (status) => {
        const inspection = { ...MOCK_INSPECTIONS[0], status };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue({
          data: inspection,
          error: null,
        });
        queryBuilder.delete.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.remove(inspection.id, TEST_IDS.organization);

        expect(result).toEqual({ id: inspection.id });
      }
    );
  });
});
