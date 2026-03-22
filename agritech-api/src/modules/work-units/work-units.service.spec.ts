import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkUnitsService } from './work-units.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('WorkUnitsService', () => {
  let service: WorkUnitsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  const MOCK_WORK_UNITS = [
    {
      id: 'wu-1',
      organization_id: TEST_IDS.organization,
      code: 'KG',
      name: 'Kilogram',
      unit_category: 'weight',
      is_active: true,
      usage_count: 5,
    },
    {
      id: 'wu-2',
      organization_id: TEST_IDS.organization,
      code: 'HA',
      name: 'Hectare',
      unit_category: 'area',
      is_active: true,
      usage_count: 0,
    },
  ];

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkUnitsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<WorkUnitsService>(WorkUnitsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper for paginate() pattern: count query + data query
  function setupPaginateMock(data: any[], count: number, error: any = null) {
    const countBuilder = createMockQueryBuilder();
    countBuilder.then.mockImplementation((resolve) => {
      const result = { data: null, error: null, count };
      resolve(result);
      return Promise.resolve(result);
    });

    const dataBuilder = createMockQueryBuilder();
    dataBuilder.then.mockImplementation((resolve) => {
      const result = { data, error };
      resolve(result);
      return Promise.resolve(result);
    });

    let callIndex = 0;
    mockClient.from.mockImplementation(() => {
      callIndex++;
      if (callIndex % 2 === 1) return countBuilder;
      return dataBuilder;
    });

    return { countBuilder, dataBuilder };
  }

  // ============================================================
  // findAll — uses paginate() helper
  // ============================================================

  describe('findAll', () => {
    it('should return PaginatedResponse shape', async () => {
      setupPaginateMock(MOCK_WORK_UNITS, 2);

      const result = await service.findAll(TEST_IDS.organization);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should handle empty results', async () => {
      setupPaginateMock([], 0);

      const result = await service.findAll(TEST_IDS.organization);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should throw on database error', async () => {
      setupPaginateMock(null as any, 0, { message: 'DB failure' });

      await expect(service.findAll(TEST_IDS.organization)).rejects.toThrow(
        'Failed to fetch work_units',
      );
    });

    it('should apply is_active filter', async () => {
      const { countBuilder } = setupPaginateMock(MOCK_WORK_UNITS, 2);

      await service.findAll(TEST_IDS.organization, { is_active: true } as any);

      expect(countBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should apply unit_category filter', async () => {
      const { countBuilder } = setupPaginateMock([MOCK_WORK_UNITS[0]], 1);

      await service.findAll(TEST_IDS.organization, { unit_category: 'weight' } as any);

      expect(countBuilder.eq).toHaveBeenCalledWith('unit_category', 'weight');
    });

    it('should apply search filter', async () => {
      const { countBuilder } = setupPaginateMock([MOCK_WORK_UNITS[0]], 1);

      await service.findAll(TEST_IDS.organization, { search: 'Kilo' } as any);

      expect(countBuilder.or).toHaveBeenCalledWith(
        'name.ilike.%Kilo%,code.ilike.%Kilo%',
      );
    });

    it('should filter by organization_id', async () => {
      const { countBuilder } = setupPaginateMock(MOCK_WORK_UNITS, 2);

      await service.findAll(TEST_IDS.organization);

      expect(countBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
    });
  });

  // ============================================================
  // findOne
  // ============================================================

  describe('findOne', () => {
    it('should return a single work unit', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(MOCK_WORK_UNITS[0]));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findOne('wu-1', TEST_IDS.organization);

      expect(result).toEqual(MOCK_WORK_UNITS[0]);
      expect(mockClient.from).toHaveBeenCalledWith('work_units');
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'wu-1');
      expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
    });

    it('should throw NotFoundException when not found', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(service.findOne('non-existent', TEST_IDS.organization))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // create
  // ============================================================

  describe('create', () => {
    it('should insert and return a work unit', async () => {
      // Check for duplicate
      const dupeBuilder = createMockQueryBuilder();
      dupeBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));

      // Insert
      const insertBuilder = createMockQueryBuilder();
      insertBuilder.insert.mockReturnValue(insertBuilder);
      insertBuilder.select.mockReturnValue(insertBuilder);
      insertBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: 'wu-new',
          organization_id: TEST_IDS.organization,
          code: 'TON',
          name: 'Tonne',
          unit_category: 'weight',
        }),
      );

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) return dupeBuilder;
        return insertBuilder;
      });

      const result = await service.create(
        { code: 'ton', name: 'Tonne', unit_category: 'weight' } as any,
        TEST_IDS.organization,
        TEST_IDS.user,
      );

      expect(result).toHaveProperty('id', 'wu-new');
      expect(result).toHaveProperty('code', 'TON');
    });

    it('should throw if duplicate code exists', async () => {
      const dupeBuilder = createMockQueryBuilder();
      dupeBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ id: 'wu-existing' }));
      mockClient.from.mockReturnValue(dupeBuilder);

      await expect(
        service.create(
          { code: 'KG', name: 'Kilogram', unit_category: 'weight' } as any,
          TEST_IDS.organization,
          TEST_IDS.user,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // update
  // ============================================================

  describe('update', () => {
    it('should patch and return a work unit', async () => {
      // findOne mock
      const findOneBuilder = createMockQueryBuilder();
      findOneBuilder.maybeSingle.mockResolvedValue(mockQueryResult(MOCK_WORK_UNITS[0]));

      // update mock
      const updateBuilder = createMockQueryBuilder();
      updateBuilder.update.mockReturnValue(updateBuilder);
      updateBuilder.select.mockReturnValue(updateBuilder);
      updateBuilder.single.mockResolvedValue(
        mockQueryResult({ ...MOCK_WORK_UNITS[0], name: 'Updated KG' }),
      );

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) return findOneBuilder;
        return updateBuilder;
      });

      const result = await service.update('wu-1', TEST_IDS.organization, { name: 'Updated KG' } as any);

      expect(result).toHaveProperty('name', 'Updated KG');
    });
  });

  // ============================================================
  // delete
  // ============================================================

  describe('delete', () => {
    it('should delete and return success message', async () => {
      // findOne mock (usage_count = 0)
      const findOneBuilder = createMockQueryBuilder();
      findOneBuilder.maybeSingle.mockResolvedValue(mockQueryResult(MOCK_WORK_UNITS[1]));

      // delete mock
      const deleteBuilder = createMockQueryBuilder();
      deleteBuilder.delete.mockReturnValue(deleteBuilder);
      deleteBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) return findOneBuilder;
        return deleteBuilder;
      });

      const result = await service.delete('wu-2', TEST_IDS.organization);

      expect(result).toEqual({ message: 'Work unit deleted successfully' });
    });

    it('should throw if work unit is in use', async () => {
      const findOneBuilder = createMockQueryBuilder();
      findOneBuilder.maybeSingle.mockResolvedValue(mockQueryResult(MOCK_WORK_UNITS[0])); // usage_count = 5
      mockClient.from.mockReturnValue(findOneBuilder);

      await expect(service.delete('wu-1', TEST_IDS.organization))
        .rejects.toThrow(BadRequestException);
    });
  });
});
