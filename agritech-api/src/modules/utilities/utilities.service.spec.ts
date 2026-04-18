import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('UtilitiesService', () => {
  let service: UtilitiesService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  const MOCK_UTILITIES = [
    {
      id: 'util-1',
      farm_id: TEST_IDS.farm,
      type: 'electricity',
      provider: 'ONEE',
      amount: 1500,
      billing_date: '2024-06-01',
      payment_status: 'paid',
    },
    {
      id: 'util-2',
      farm_id: TEST_IDS.farm,
      type: 'water',
      provider: 'ONEE',
      amount: 800,
      billing_date: '2024-06-15',
      payment_status: 'pending',
    },
  ];

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UtilitiesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<UtilitiesService>(UtilitiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper: mock verifyOrganizationAccess
  function setupOrgAccessMock() {
    const orgBuilder = createMockQueryBuilder();
    orgBuilder.maybeSingle.mockResolvedValue(
      mockQueryResult({ organization_id: TEST_IDS.organization }),
    );
    return orgBuilder;
  }

  // Helper for paginate() pattern with org access: org check + count + data
  function setupPaginateWithAccess(data: any[], count: number, error: any = null) {
    const orgBuilder = setupOrgAccessMock();

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

    let fromCallCount = 0;
    mockClient.from.mockImplementation((table: string) => {
      fromCallCount++;
      if (table === 'organization_users') return orgBuilder;
      // First utilities call = count, second = data
      if (table === 'utilities') {
        // Track utilities-specific calls
        const utilitiesCallIndex = fromCallCount;
        if (utilitiesCallIndex % 2 === 0) return countBuilder;
        return dataBuilder;
      }
      return createMockQueryBuilder();
    });

    return { orgBuilder, countBuilder, dataBuilder };
  }

  // ============================================================
  // findAll — uses paginate() helper
  // ============================================================

  describe('findAll', () => {
    it('should return PaginatedResponse shape', async () => {
      const orgBuilder = setupOrgAccessMock();

      const countBuilder = createMockQueryBuilder();
      countBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: null, count: 2 };
        resolve(result);
        return Promise.resolve(result);
      });

      const dataBuilder = createMockQueryBuilder();
      dataBuilder.then.mockImplementation((resolve) => {
        const result = { data: MOCK_UTILITIES, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      let utilitiesCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        utilitiesCallCount++;
        if (utilitiesCallCount === 1) return countBuilder;
        return dataBuilder;
      });

      const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization, TEST_IDS.farm);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should handle empty results', async () => {
      const orgBuilder = setupOrgAccessMock();

      const countBuilder = createMockQueryBuilder();
      countBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: null, count: 0 };
        resolve(result);
        return Promise.resolve(result);
      });

      const dataBuilder = createMockQueryBuilder();
      dataBuilder.then.mockImplementation((resolve) => {
        const result = { data: [], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      let utilitiesCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        utilitiesCallCount++;
        if (utilitiesCallCount === 1) return countBuilder;
        return dataBuilder;
      });

      const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization, TEST_IDS.farm);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should throw on database error', async () => {
      const orgBuilder = setupOrgAccessMock();

      const countBuilder = createMockQueryBuilder();
      countBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: null, count: 0 };
        resolve(result);
        return Promise.resolve(result);
      });

      const dataBuilder = createMockQueryBuilder();
      dataBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: { message: 'DB failure' } };
        resolve(result);
        return Promise.resolve(result);
      });

      let utilitiesCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        utilitiesCallCount++;
        if (utilitiesCallCount === 1) return countBuilder;
        return dataBuilder;
      });

      await expect(
        service.findAll(TEST_IDS.user, TEST_IDS.organization, TEST_IDS.farm),
      ).rejects.toThrow('Failed to fetch utilities');
    });

    it('should apply farm_id filter via paginate', async () => {
      const orgBuilder = setupOrgAccessMock();

      const countBuilder = createMockQueryBuilder();
      countBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: null, count: 2 };
        resolve(result);
        return Promise.resolve(result);
      });

      const dataBuilder = createMockQueryBuilder();
      dataBuilder.then.mockImplementation((resolve) => {
        const result = { data: MOCK_UTILITIES, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      let utilitiesCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        utilitiesCallCount++;
        if (utilitiesCallCount === 1) return countBuilder;
        return dataBuilder;
      });

      await service.findAll(TEST_IDS.user, TEST_IDS.organization, TEST_IDS.farm);

      expect(countBuilder.eq).toHaveBeenCalledWith('farm_id', TEST_IDS.farm);
      expect(dataBuilder.eq).toHaveBeenCalledWith('farm_id', TEST_IDS.farm);
    });

    it('should throw ForbiddenException when user has no org access', async () => {
      const orgBuilder = createMockQueryBuilder();
      orgBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        return createMockQueryBuilder();
      });

      await expect(
        service.findAll(TEST_IDS.user, TEST_IDS.organization, TEST_IDS.farm),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // findOne
  // ============================================================

  describe('findOne', () => {
    it('should return a single utility', async () => {
      const orgBuilder = setupOrgAccessMock();

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(MOCK_UTILITIES[0]));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        return queryBuilder;
      });

      const result = await service.findOne(TEST_IDS.user, TEST_IDS.organization, TEST_IDS.farm, 'util-1');

      expect(result).toEqual(MOCK_UTILITIES[0]);
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'util-1');
      expect(queryBuilder.eq).toHaveBeenCalledWith('farm_id', TEST_IDS.farm);
    });

    it('should throw NotFoundException when utility not found', async () => {
      const orgBuilder = setupOrgAccessMock();

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        return queryBuilder;
      });

      await expect(
        service.findOne(TEST_IDS.user, TEST_IDS.organization, TEST_IDS.farm, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // create
  // ============================================================

  describe('create', () => {
    it('should insert and return a utility', async () => {
      const orgBuilder = setupOrgAccessMock();

      // Verify farm
      const farmBuilder = createMockQueryBuilder();
      farmBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ id: TEST_IDS.farm }));

      // Insert
      const insertBuilder = createMockQueryBuilder();
      insertBuilder.insert.mockReturnValue(insertBuilder);
      insertBuilder.select.mockReturnValue(insertBuilder);
      insertBuilder.single.mockResolvedValue(
        mockQueryResult({ ...MOCK_UTILITIES[0], id: 'util-new' }),
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        if (table === 'farms') return farmBuilder;
        return insertBuilder;
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        farm_id: TEST_IDS.farm,
        type: 'electricity',
        amount: 1500,
        billing_date: '2024-06-01',
      } as any);

      expect(result).toHaveProperty('id', 'util-new');
    });
  });

  // ============================================================
  // update
  // ============================================================

  describe('update', () => {
    it('should patch and return a utility', async () => {
      const orgBuilder = setupOrgAccessMock();

      // Verify utility exists
      const existingBuilder = createMockQueryBuilder();
      existingBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ id: 'util-1', farm_id: TEST_IDS.farm }),
      );

      // Verify farm
      const farmBuilder = createMockQueryBuilder();
      farmBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ id: TEST_IDS.farm }));

      // Update
      const updateBuilder = createMockQueryBuilder();
      updateBuilder.update.mockReturnValue(updateBuilder);
      updateBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ ...MOCK_UTILITIES[0], amount: 2000 }),
      );

      let utilitiesCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        if (table === 'farms') return farmBuilder;
        if (table === 'utilities') {
          utilitiesCallCount++;
          if (utilitiesCallCount === 1) return existingBuilder;
          return updateBuilder;
        }
        return createMockQueryBuilder();
      });

      const result = await service.update(
        TEST_IDS.user,
        TEST_IDS.organization,
        TEST_IDS.farm,
        'util-1',
        { amount: 2000 } as any,
      );

      expect(result).toHaveProperty('amount', 2000);
    });
  });

  // ============================================================
  // remove
  // ============================================================

  describe('remove', () => {
    it('should delete and return success message', async () => {
      const orgBuilder = setupOrgAccessMock();

      // Verify utility exists
      const existingBuilder = createMockQueryBuilder();
      existingBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ id: 'util-1', farm_id: TEST_IDS.farm }),
      );

      // Verify farm
      const farmBuilder = createMockQueryBuilder();
      farmBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ id: TEST_IDS.farm }));

      // Delete
      const deleteBuilder = createMockQueryBuilder();
      deleteBuilder.delete.mockReturnValue(deleteBuilder);
      deleteBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      let utilitiesCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        if (table === 'farms') return farmBuilder;
        if (table === 'utilities') {
          utilitiesCallCount++;
          if (utilitiesCallCount === 1) return existingBuilder;
          return deleteBuilder;
        }
        return createMockQueryBuilder();
      });

      const result = await service.remove(
        TEST_IDS.user,
        TEST_IDS.organization,
        TEST_IDS.farm,
        'util-1',
      );

      expect(result).toEqual({ message: 'Utility deleted successfully' });
    });
  });
});
