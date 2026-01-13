import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CropCyclesService } from './crop-cycles.service';
import { CropCycleStatus } from './dto';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('CropCyclesService', () => {
  let service: CropCyclesService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const MOCK_CROP_CYCLES = [
    {
      id: 'cycle-1',
      organization_id: TEST_IDS.organization,
      farm_id: 'farm-1',
      parcel_id: 'parcel-1',
      name: 'Spring Tomatoes 2024',
      variety: 'Roma',
      crop_type: 'tomato',
      status: CropCycleStatus.ACTIVE,
      planting_date: '2024-03-01',
      expected_harvest_date: '2024-07-15',
      area_hectares: 5,
      expected_yield_kg_per_hectare: 50000,
      actual_yield_kg_per_hectare: null,
      planting_system: 'organic',
      irrigation_type: 'drip',
      created_by: TEST_IDS.user,
      created_at: '2024-03-01T00:00:00Z',
      updated_at: '2024-03-01T00:00:00Z',
    },
    {
      id: 'cycle-2',
      organization_id: TEST_IDS.organization,
      farm_id: 'farm-1',
      parcel_id: 'parcel-2',
      name: 'Winter Wheat 2023',
      variety: 'Hard Red',
      crop_type: 'wheat',
      status: CropCycleStatus.COMPLETED,
      planting_date: '2023-09-01',
      expected_harvest_date: '2024-02-28',
      area_hectares: 20,
      expected_yield_kg_per_hectare: 4000,
      actual_yield_kg_per_hectare: 4200,
      planting_system: 'conventional',
      irrigation_type: 'sprinkler',
      created_by: TEST_IDS.user,
      created_at: '2023-09-01T00:00:00Z',
      updated_at: '2024-02-28T00:00:00Z',
    },
    {
      id: 'cycle-3',
      organization_id: TEST_IDS.organization,
      farm_id: 'farm-2',
      parcel_id: 'parcel-3',
      name: 'Future Corn 2024',
      variety: 'Sweet Corn',
      crop_type: 'corn',
      status: CropCycleStatus.PLANNED,
      planting_date: '2024-05-01',
      expected_harvest_date: '2024-09-15',
      area_hectares: 10,
      expected_yield_kg_per_hectare: 8000,
      actual_yield_kg_per_hectare: null,
      planting_system: 'conventional',
      irrigation_type: 'drip',
      created_by: TEST_IDS.user,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const VALID_STATUSES = [
    CropCycleStatus.PLANNED,
    CropCycleStatus.ACTIVE,
    CropCycleStatus.PAUSED,
    CropCycleStatus.COMPLETED,
    CropCycleStatus.CANCELLED,
  ];

  const VALID_PLANTING_SYSTEMS = ['conventional', 'organic', 'biodynamic', 'hydroponic'];
  const VALID_IRRIGATION_TYPES = ['drip', 'sprinkler', 'flood', 'center_pivot', 'none'];

  const YIELD_SCENARIOS = [
    { expected: 5000, actual: 5500, description: 'above expected' },
    { expected: 5000, actual: 4500, description: 'below expected' },
    { expected: 5000, actual: 5000, description: 'exactly as expected' },
    { expected: 5000, actual: 0, description: 'not yet harvested' },
    { expected: 0, actual: 0, description: 'no yield data' },
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
        CropCyclesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<CropCyclesService>(CropCyclesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // PARAMETERIZED TESTS - CRUD OPERATIONS
  // ============================================================

  describe('findAll (Parameterized)', () => {
    it.each(VALID_STATUSES)('should filter by status: %s', async (status) => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.gte.mockReturnValue(queryBuilder);
      queryBuilder.lte.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(
        { data: [MOCK_CROP_CYCLES[0]], error: null, count: 1 }
      );

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(TEST_IDS.organization, {
        status: status,
      });

      expect(queryBuilder.eq).toHaveBeenCalledWith('status', status);
      expect(result.data).toBeDefined();
    });

    it.each(VALID_PLANTING_SYSTEMS)(
      'should handle cycles with planting_system: %s',
      async (system) => {
        const cycle = { ...MOCK_CROP_CYCLES[0], planting_system: system };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.ilike.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue(
          { data: [cycle], error: null, count: 1 }
        );

        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization);

        expect(result.data[0].planting_system).toBe(system);
      }
    );

    it.each(VALID_IRRIGATION_TYPES)(
      'should handle cycles with irrigation_type: %s',
      async (irrigation) => {
        const cycle = { ...MOCK_CROP_CYCLES[0], irrigation_type: irrigation };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.ilike.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue(
          { data: [cycle], error: null, count: 1 }
        );

        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization);

        expect(result.data[0].irrigation_type).toBe(irrigation);
      }
    );
  });

  describe('create (Parameterized)', () => {
    it.each(VALID_STATUSES)('should create cycle with status: %s', async (status) => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_CROP_CYCLES[0],
          status: status,
        })
      );

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(TEST_IDS.organization, TEST_IDS.user, {
        name: 'Test Cycle',
        variety: 'Test Variety',
        crop_type: 'test',
        status: status,
        area_hectares: 5,
        organization_id: TEST_IDS.organization,
        farm_id: 'farm-1',
        planting_date: new Date('2024-03-01'),
        expected_harvest_date: new Date('2024-07-15'),
      });

      expect(result.status).toBe(status);
    });
  });

  describe('updateStatus (Parameterized)', () => {
    it.each([
      [CropCycleStatus.PLANNED, CropCycleStatus.ACTIVE],
      [CropCycleStatus.ACTIVE, CropCycleStatus.PAUSED],
      [CropCycleStatus.PAUSED, CropCycleStatus.ACTIVE],
      [CropCycleStatus.ACTIVE, CropCycleStatus.COMPLETED],
      [CropCycleStatus.PLANNED, CropCycleStatus.CANCELLED],
    ])(
      'should transition status from %s to %s',
      async (fromStatus, toStatus) => {
        const existingCycle = { ...MOCK_CROP_CYCLES[0], status: fromStatus };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.single.mockResolvedValueOnce({
          data: existingCycle,
          error: null
        }).mockResolvedValueOnce({
          data: {
            ...existingCycle,
            status: toStatus,
            updated_by: TEST_IDS.user,
          },
          error: null
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.updateStatus(
          'cycle-1',
          TEST_IDS.organization,
          TEST_IDS.user,
          toStatus
        );

        expect(result.status).toBe(toStatus);
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('findOne', () => {
      it('should throw NotFoundException when cycle not found', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.single.mockResolvedValue({
          data: null,
          error: null
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.findOne('non-existent', TEST_IDS.organization)
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('update', () => {
      it('should throw NotFoundException when updating non-existent cycle', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.single.mockResolvedValue({
          data: null,
          error: null
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update('non-existent', TEST_IDS.organization, TEST_IDS.user, {
            name: 'Updated',
          })
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('remove', () => {
      it('should throw NotFoundException when deleting non-existent cycle', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.single.mockResolvedValue({
          data: null,
          error: null
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.remove('non-existent', TEST_IDS.organization)
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw ConflictException when deleting active cycle', async () => {
        const activeCycle = {
          ...MOCK_CROP_CYCLES[0],
          status: CropCycleStatus.ACTIVE,
        };

        const queryBuilder = createMockQueryBuilder();
        const findResult = { data: activeCycle, error: null };
        // Create a separate query builder for the findOne call
        const findBuilder = createMockQueryBuilder();
        findBuilder.single.mockResolvedValue(findResult);

        // Mock from to return findBuilder for the first call (findOne)
        // and queryBuilder for the second call (delete)
        mockClient.from.mockReturnValueOnce(findBuilder).mockReturnValueOnce(queryBuilder);

        await expect(
          service.remove('cycle-1', TEST_IDS.organization)
        ).rejects.toThrow('Cannot delete active crop cycle. Pause or complete it first.');
      });

      it('should allow deletion of planned cycles', async () => {
        const plannedCycle = {
          ...MOCK_CROP_CYCLES[0],
          status: CropCycleStatus.PLANNED,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.single.mockResolvedValue({
          data: plannedCycle,
          error: null
        });
        queryBuilder.delete.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.remove('cycle-1', TEST_IDS.organization);

        expect(result.id).toBe('cycle-1');
        expect(queryBuilder.delete).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Filtering and Searching', () => {
    it('should filter by farm_id', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(
        { data: [MOCK_CROP_CYCLES[0]], error: null, count: 1 }
      );

      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, {
        farm_id: 'farm-1',
      });

      expect(queryBuilder.eq).toHaveBeenCalledWith('farm_id', 'farm-1');
    });

    it('should filter by parcel_id', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(
        { data: [MOCK_CROP_CYCLES[0]], error: null, count: 1 }
      );

      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, {
        parcel_id: 'parcel-1',
      });

      expect(queryBuilder.eq).toHaveBeenCalledWith('parcel_id', 'parcel-1');
    });

    it('should filter by variety (case insensitive)', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(
        { data: [MOCK_CROP_CYCLES[0]], error: null, count: 1 }
      );

      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, {
        variety: 'roma',
      });

      expect(queryBuilder.ilike).toHaveBeenCalledWith('variety', '%roma%');
    });

    it('should filter by crop_type (case insensitive)', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(
        { data: [MOCK_CROP_CYCLES[0]], error: null, count: 1 }
      );

      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, {
        crop_type: 'tomato',
      });

      expect(queryBuilder.ilike).toHaveBeenCalledWith('crop_type', '%tomato%');
    });

    it('should filter by planting date range', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.gte.mockReturnValue(queryBuilder);
      queryBuilder.lte.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(
        { data: MOCK_CROP_CYCLES, error: null, count: 3 }
      );

      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, {
        planting_date_from: new Date('2024-01-01'),
        planting_date_to: new Date('2024-12-31'),
      });

      expect(queryBuilder.gte).toHaveBeenCalledWith('planting_date', new Date('2024-01-01'));
      expect(queryBuilder.lte).toHaveBeenCalledWith('planting_date', new Date('2024-12-31'));
    });

    it('should filter by expected harvest date range', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.gte.mockReturnValue(queryBuilder);
      queryBuilder.lte.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(
        { data: MOCK_CROP_CYCLES, error: null, count: 3 }
      );

      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, {
        expected_harvest_date_from: new Date('2024-06-01'),
        expected_harvest_date_to: new Date('2024-09-30'),
      });

      expect(queryBuilder.gte).toHaveBeenCalledWith(
        'expected_harvest_date',
        new Date('2024-06-01')
      );
      expect(queryBuilder.lte).toHaveBeenCalledWith(
        'expected_harvest_date',
        new Date('2024-09-30')
      );
    });

    it('should search across name and variety fields', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(
        { data: [MOCK_CROP_CYCLES[0]], error: null, count: 1 }
      );

      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, {
        search: 'tomato',
      });

      expect(queryBuilder.or).toHaveBeenCalledWith(
        'name.ilike.%tomato%,variety.ilike.%tomato%'
      );
    });
  });

  describe('Behavior - Sorting and Pagination', () => {
    it('should sort by planting_date ascending by default', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(
        { data: MOCK_CROP_CYCLES, error: null, count: 3 }
      );

      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization);

      expect(queryBuilder.order).toHaveBeenCalledWith('planting_date', {
        ascending: false, // Default is descending (newest first)
      });
    });

    it('should sort by custom field and direction', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(
        { data: MOCK_CROP_CYCLES, error: null, count: 3 }
      );

      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, {
        sortBy: 'name',
        sortDir: 'asc',
      });

      expect(queryBuilder.order).toHaveBeenCalledWith('name', {
        ascending: true,
      });
    });

    it('should paginate results correctly', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue({
        data: [MOCK_CROP_CYCLES[0]],
        error: null,
        count: 3
      });

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(TEST_IDS.organization, {
        page: 2,
        pageSize: 1,
      });

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(1);
      expect(result.totalPages).toBe(3);
      // Page 2 with pageSize 1 means: from = (2-1) * 1 = 1, to = 1 + 1 - 1 = 1
      expect(queryBuilder.range).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('Behavior - Statistics', () => {
    it('should calculate total count by status', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      // select returns queryBuilder for chaining, and the final result comes from the chain
      queryBuilder.select.mockReturnValue(queryBuilder);

      mockClient.from.mockReturnValue(queryBuilder);

      // Mock the chained calls to return data directly
      const selectBuilder1 = createMockQueryBuilder();
      selectBuilder1.eq.mockResolvedValue({ data: MOCK_CROP_CYCLES, error: null });
      queryBuilder.select.mockReturnValue(selectBuilder1);

      const result = await service.getStatistics(TEST_IDS.organization);

      expect(result.total).toBe(3);
      expect(result.byStatus).toBeDefined();
      expect(result.byStatus[CropCycleStatus.ACTIVE]).toBe(1);
      expect(result.byStatus[CropCycleStatus.COMPLETED]).toBe(1);
      expect(result.byStatus[CropCycleStatus.PLANNED]).toBe(1);
    });

    it('should calculate total area across all cycles', async () => {
      const queryBuilder = createMockQueryBuilder();

      // First select call (status)
      const selectBuilder1 = createMockQueryBuilder();
      selectBuilder1.eq.mockResolvedValue({ data: MOCK_CROP_CYCLES, error: null });

      // Second select call (areas)
      const selectBuilder2 = createMockQueryBuilder();
      selectBuilder2.eq.mockResolvedValue({ data: MOCK_CROP_CYCLES, error: null });

      // Third select call (yields)
      const selectBuilder3 = createMockQueryBuilder();
      selectBuilder3.eq.mockResolvedValue({ data: MOCK_CROP_CYCLES, error: null });

      queryBuilder.select
        .mockReturnValueOnce(selectBuilder1)
        .mockReturnValueOnce(selectBuilder2)
        .mockReturnValueOnce(selectBuilder3);

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getStatistics(TEST_IDS.organization);

      expect(result.totalArea).toBe(35); // 5 + 20 + 10
    });

    it('should calculate expected vs actual yield', async () => {
      const queryBuilder = createMockQueryBuilder();

      // First select call (status)
      const selectBuilder1 = createMockQueryBuilder();
      selectBuilder1.eq.mockResolvedValue({ data: MOCK_CROP_CYCLES, error: null });

      // Second select call (areas)
      const selectBuilder2 = createMockQueryBuilder();
      selectBuilder2.eq.mockResolvedValue({ data: MOCK_CROP_CYCLES, error: null });

      // Third select call (yields)
      const selectBuilder3 = createMockQueryBuilder();
      selectBuilder3.eq.mockResolvedValue({ data: MOCK_CROP_CYCLES, error: null });

      queryBuilder.select
        .mockReturnValueOnce(selectBuilder1)
        .mockReturnValueOnce(selectBuilder2)
        .mockReturnValueOnce(selectBuilder3);

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getStatistics(TEST_IDS.organization);

      // Expected: (5 * 50000) + (20 * 4000) + (10 * 8000) = 250000 + 80000 + 80000 = 410000
      expect(result.totalExpectedYield).toBe(410000);

      // Actual: (5 * 0) + (20 * 4200) + (10 * 0) = 0 + 84000 + 0 = 84000
      expect(result.totalActualYield).toBe(84000);
    });

    it('should handle empty statistics when no cycles exist', async () => {
      const queryBuilder = createMockQueryBuilder();

      // First select call (status)
      const selectBuilder1 = createMockQueryBuilder();
      selectBuilder1.eq.mockResolvedValue({ data: [], error: null });

      // Second select call (areas)
      const selectBuilder2 = createMockQueryBuilder();
      selectBuilder2.eq.mockResolvedValue({ data: [], error: null });

      // Third select call (yields)
      const selectBuilder3 = createMockQueryBuilder();
      selectBuilder3.eq.mockResolvedValue({ data: [], error: null });

      queryBuilder.select
        .mockReturnValueOnce(selectBuilder1)
        .mockReturnValueOnce(selectBuilder2)
        .mockReturnValueOnce(selectBuilder3);

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getStatistics(TEST_IDS.organization);

      expect(result.total).toBe(0);
      expect(result.totalArea).toBe(0);
      expect(result.totalExpectedYield).toBe(0);
      expect(result.totalActualYield).toBe(0);
      expect(result.byStatus).toEqual({});
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    it.each(YIELD_SCENARIOS)(
      'should handle yield scenario: $description',
      async ({ expected, actual }) => {
        const cycle = {
          ...MOCK_CROP_CYCLES[0],
          expected_yield_kg_per_hectare: expected,
          actual_yield_kg_per_hectare: actual,
        };

        const queryBuilder = createMockQueryBuilder();

        // First select call (status)
        const selectBuilder1 = createMockQueryBuilder();
        selectBuilder1.eq.mockResolvedValue({ data: [cycle], error: null });

        // Second select call (areas)
        const selectBuilder2 = createMockQueryBuilder();
        selectBuilder2.eq.mockResolvedValue({ data: [cycle], error: null });

        // Third select call (yields)
        const selectBuilder3 = createMockQueryBuilder();
        selectBuilder3.eq.mockResolvedValue({ data: [cycle], error: null });

        queryBuilder.select
          .mockReturnValueOnce(selectBuilder1)
          .mockReturnValueOnce(selectBuilder2)
          .mockReturnValueOnce(selectBuilder3);

        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStatistics(TEST_IDS.organization);

        expect(result.totalExpectedYield).toBe(expected * cycle.area_hectares);
        expect(result.totalActualYield).toBe(actual * cycle.area_hectares);
      }
    );

    it('should handle cycle with zero area', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_CROP_CYCLES[0],
          area_hectares: 0,
        })
      );

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(TEST_IDS.organization, TEST_IDS.user, {
        name: 'Tiny Cycle',
        variety: 'Test',
        crop_type: 'test',
        area_hectares: 0,
        organization_id: TEST_IDS.organization,
        farm_id: 'farm-1',
        planting_date: new Date('2024-03-01'),
        expected_harvest_date: new Date('2024-07-15'),
      });

      expect(result.area_hectares).toBe(0);
    });

    it('should handle cycle with very large area', async () => {
      const largeArea = 10000;

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_CROP_CYCLES[0],
          area_hectares: largeArea,
        })
      );

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(TEST_IDS.organization, TEST_IDS.user, {
        name: 'Massive Farm',
        variety: 'Wheat',
        crop_type: 'wheat',
        area_hectares: largeArea,
        organization_id: TEST_IDS.organization,
        farm_id: 'farm-1',
        planting_date: new Date('2024-03-01'),
        expected_harvest_date: new Date('2024-07-15'),
      });

      expect(result.area_hectares).toBe(largeArea);
    });

    it('should handle missing optional fields', async () => {
      const minimalCycle = {
        id: 'cycle-minimal',
        organization_id: TEST_IDS.organization,
        name: 'Minimal Cycle',
        variety: null,
        crop_type: null,
        status: CropCycleStatus.PLANNED,
        planting_date: null,
        expected_harvest_date: null,
        area_hectares: null,
        expected_yield_kg_per_hectare: null,
        actual_yield_kg_per_hectare: null,
        planting_system: null,
        irrigation_type: null,
        created_by: TEST_IDS.user,
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult(minimalCycle));

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(TEST_IDS.organization, TEST_IDS.user, {
        name: 'Minimal Cycle',
        organization_id: TEST_IDS.organization,
        farm_id: 'farm-1',
        variety: '',
        crop_type: '',
        planting_date: new Date('2024-03-01'),
        expected_harvest_date: new Date('2024-07-15'),
        area_hectares: 5,
      });

      expect(result.variety).toBeNull();
      expect(result.crop_type).toBeNull();
      expect(result.planting_date).toBeNull();
    });

    it('should handle campaign filtering', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(
        { data: [MOCK_CROP_CYCLES[0]], error: null, count: 1 }
      );

      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, {
        campaign_id: 'campaign-2024',
      });

      expect(queryBuilder.eq).toHaveBeenCalledWith('campaign_id', 'campaign-2024');
    });
  });

  // ============================================================
  // AGRICULTURAL-SPECIFIC TESTS
  // ============================================================

  describe('Agricultural Features', () => {
    it('should track variety for crop identification', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_CROP_CYCLES[0],
          variety: 'Cherry Tomato',
        })
      );

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(TEST_IDS.organization, TEST_IDS.user, {
        name: 'Cherry Tomatoes 2024',
        variety: 'Cherry Tomato',
        crop_type: 'tomato',
        area_hectares: 2,
        organization_id: TEST_IDS.organization,
        farm_id: 'farm-1',
        planting_date: new Date('2024-03-01'),
        expected_harvest_date: new Date('2024-07-15'),
      });

      expect(result.variety).toBe('Cherry Tomato');
    });

    it('should calculate yield per hectare', async () => {
      const area = 10;
      const expectedYield = 50000;
      const actualYield = 55000;

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_CROP_CYCLES[0],
          area_hectares: area,
          expected_yield_kg_per_hectare: expectedYield,
          actual_yield_kg_per_hectare: actualYield,
        })
      );

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(TEST_IDS.organization, TEST_IDS.user, {
        name: 'High Yield Corn',
        variety: 'Super Corn',
        crop_type: 'corn',
        area_hectares: area,
        expected_yield_kg_per_hectare: expectedYield,
        actual_yield_kg_per_hectare: actualYield,
        organization_id: TEST_IDS.organization,
        farm_id: 'farm-1',
        planting_date: new Date('2024-03-01'),
        expected_harvest_date: new Date('2024-07-15'),
      });

      // Total expected yield = 10 * 50000 = 500000 kg
      // Total actual yield = 10 * 55000 = 550000 kg
      expect(result.expected_yield_kg_per_hectare).toBe(expectedYield);
      expect(result.actual_yield_kg_per_hectare).toBe(actualYield);
    });

    it('should track planting and harvest dates', async () => {
      const plantingDate = new Date('2024-03-15');
      const expectedHarvestDate = new Date('2024-08-01');

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_CROP_CYCLES[0],
          planting_date: plantingDate,
          expected_harvest_date: expectedHarvestDate,
        })
      );

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(TEST_IDS.organization, TEST_IDS.user, {
        name: 'Summer Crop 2024',
        variety: 'Tomato',
        crop_type: 'tomato',
        planting_date: plantingDate,
        expected_harvest_date: expectedHarvestDate,
        area_hectares: 5,
        organization_id: TEST_IDS.organization,
        farm_id: 'farm-1',
      });

      expect(result.planting_date).toBe(plantingDate);
      expect(result.expected_harvest_date).toBe(expectedHarvestDate);
    });

    it('should prevent deletion of active cycles to protect data integrity', async () => {
      const activeCycle = {
        ...MOCK_CROP_CYCLES[0],
        status: CropCycleStatus.ACTIVE,
      };

      const queryBuilder = createMockQueryBuilder();
      const selectBuilder = createMockQueryBuilder();
      selectBuilder.eq.mockReturnValue(selectBuilder);
      selectBuilder.single.mockResolvedValue({
        data: activeCycle,
        error: null
      });
      queryBuilder.select.mockReturnValue(selectBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);

      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.remove('cycle-1', TEST_IDS.organization)
      ).rejects.toThrow(ConflictException);
      await expect(
        service.remove('cycle-1', TEST_IDS.organization)
      ).rejects.toThrow('Cannot delete active crop cycle. Pause or complete it first.');
    });

    it('should track who created and updated the cycle', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_CROP_CYCLES[0],
          created_by: 'user-1',
          updated_by: 'user-2',
        })
      );

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(TEST_IDS.organization, 'user-1', {
        name: 'Test Cycle',
        variety: 'Test',
        crop_type: 'test',
        area_hectares: 5,
        organization_id: TEST_IDS.organization,
        farm_id: 'farm-1',
        planting_date: new Date('2024-03-01'),
        expected_harvest_date: new Date('2024-07-15'),
      });

      expect(result.created_by).toBe('user-1');
    });
  });

  describe('Status Transition Validations', () => {
    it('should allow updating multiple fields along with status', async () => {
      const existingCycle = { ...MOCK_CROP_CYCLES[0] };

      const queryBuilder = createMockQueryBuilder();
      const selectBuilder = createMockQueryBuilder();
      selectBuilder.eq.mockReturnValue(selectBuilder);
      selectBuilder.single
        .mockResolvedValueOnce({
          data: existingCycle,
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            ...existingCycle,
            status: CropCycleStatus.COMPLETED,
            actual_yield_kg_per_hectare: 55000,
            notes: 'Excellent harvest',
            updated_by: TEST_IDS.user,
          },
          error: null
        });
      queryBuilder.select.mockReturnValue(selectBuilder);
      queryBuilder.update.mockReturnValue(selectBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.update(
        'cycle-1',
        TEST_IDS.organization,
        TEST_IDS.user,
        {
          status: CropCycleStatus.COMPLETED,
          actual_yield_kg_per_hectare: 55000,
          notes: 'Excellent harvest',
        }
      );

      expect(result.status).toBe(CropCycleStatus.COMPLETED);
      expect(result.actual_yield_kg_per_hectare).toBe(55000);
    });

    it('should preserve creation metadata on update', async () => {
      const existingCycle = {
        ...MOCK_CROP_CYCLES[0],
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'original-user',
      };

      const queryBuilder = createMockQueryBuilder();
      const selectBuilder = createMockQueryBuilder();
      selectBuilder.eq.mockReturnValue(selectBuilder);
      selectBuilder.single
        .mockResolvedValueOnce({
          data: existingCycle,
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            ...existingCycle,
            name: 'Updated Name',
            updated_by: TEST_IDS.user,
            updated_at: '2024-06-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            created_by: 'original-user',
          },
          error: null
        });
      queryBuilder.select.mockReturnValue(selectBuilder);
      queryBuilder.update.mockReturnValue(selectBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.update(
        'cycle-1',
        TEST_IDS.organization,
        TEST_IDS.user,
        {
          name: 'Updated Name',
        }
      );

      expect(result.created_at).toBe('2024-01-01T00:00:00Z');
      expect(result.created_by).toBe('original-user');
      expect(result.updated_by).toBe(TEST_IDS.user);
    });
  });
});
