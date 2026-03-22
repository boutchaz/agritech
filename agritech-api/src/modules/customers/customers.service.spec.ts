import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('CustomersService', () => {
  let service: CustomersService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  const MOCK_CUSTOMERS = [
    {
      id: 'cust-1',
      organization_id: TEST_IDS.organization,
      name: 'Acme Corp',
      customer_code: 'ACME-001',
      customer_type: 'wholesale',
      is_active: true,
    },
    {
      id: 'cust-2',
      organization_id: TEST_IDS.organization,
      name: 'Retail Store',
      customer_code: 'RET-001',
      customer_type: 'retail',
      is_active: true,
    },
  ];

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // findAll — uses TWO queries: count + data
  // ============================================================

  describe('findAll', () => {
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
        // First .from('customers') is the count query, second is the data query
        if (callIndex % 2 === 1) return countBuilder;
        return dataBuilder;
      });

      return { countBuilder, dataBuilder };
    }

    it('should return PaginatedResponse shape', async () => {
      setupPaginateMock(MOCK_CUSTOMERS, 2);

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

      await expect(service.findAll(TEST_IDS.organization)).rejects.toThrow('Failed to fetch customers');
    });

    it('should apply name filter with ilike', async () => {
      const { countBuilder, dataBuilder } = setupPaginateMock([MOCK_CUSTOMERS[0]], 1);

      await service.findAll(TEST_IDS.organization, { name: 'Acme' } as any);

      expect(countBuilder.ilike).toHaveBeenCalledWith('name', '%Acme%');
      expect(dataBuilder.ilike).toHaveBeenCalledWith('name', '%Acme%');
    });

    it('should apply customer_type filter', async () => {
      const { countBuilder, dataBuilder } = setupPaginateMock([MOCK_CUSTOMERS[0]], 1);

      await service.findAll(TEST_IDS.organization, { customer_type: 'wholesale' } as any);

      expect(countBuilder.eq).toHaveBeenCalledWith('customer_type', 'wholesale');
      expect(dataBuilder.eq).toHaveBeenCalledWith('customer_type', 'wholesale');
    });

    it('should apply is_active filter', async () => {
      const { countBuilder, dataBuilder } = setupPaginateMock(MOCK_CUSTOMERS, 2);

      await service.findAll(TEST_IDS.organization, { is_active: false } as any);

      expect(countBuilder.eq).toHaveBeenCalledWith('is_active', false);
    });

    it('should default is_active to true when not specified', async () => {
      const { countBuilder } = setupPaginateMock(MOCK_CUSTOMERS, 2);

      await service.findAll(TEST_IDS.organization);

      expect(countBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  // ============================================================
  // findOne
  // ============================================================

  describe('findOne', () => {
    it('should return a single customer', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_CUSTOMERS[0]));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findOne('cust-1', TEST_IDS.organization);

      expect(result).toEqual(MOCK_CUSTOMERS[0]);
      expect(mockClient.from).toHaveBeenCalledWith('customers');
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'cust-1');
      expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
    });

    it('should throw NotFoundException when customer not found', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'Not found' }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(service.findOne('non-existent', TEST_IDS.organization))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // create
  // ============================================================

  describe('create', () => {
    it('should insert and return a customer', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: 'cust-new',
          organization_id: TEST_IDS.organization,
          name: 'New Customer',
          is_active: true,
        }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(
        { name: 'New Customer' } as any,
        TEST_IDS.organization,
        TEST_IDS.user,
      );

      expect(result).toHaveProperty('id', 'cust-new');
      expect(queryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: TEST_IDS.organization,
          name: 'New Customer',
          created_by: TEST_IDS.user,
        }),
      );
    });
  });

  // ============================================================
  // update
  // ============================================================

  describe('update', () => {
    it('should patch and return a customer', async () => {
      // findOne mock
      const findOneBuilder = createMockQueryBuilder();
      findOneBuilder.single.mockResolvedValue(mockQueryResult(MOCK_CUSTOMERS[0]));

      // update mock
      const updateBuilder = createMockQueryBuilder();
      updateBuilder.update.mockReturnValue(updateBuilder);
      updateBuilder.select.mockReturnValue(updateBuilder);
      updateBuilder.single.mockResolvedValue(
        mockQueryResult({ ...MOCK_CUSTOMERS[0], name: 'Updated Corp' }),
      );

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) return findOneBuilder;
        return updateBuilder;
      });

      const result = await service.update('cust-1', { name: 'Updated Corp' } as any, TEST_IDS.organization);

      expect(result).toHaveProperty('name', 'Updated Corp');
    });
  });

  // ============================================================
  // delete (soft delete)
  // ============================================================

  describe('delete', () => {
    it('should soft-delete and return success message', async () => {
      // findOne mock
      const findOneBuilder = createMockQueryBuilder();
      findOneBuilder.single.mockResolvedValue(mockQueryResult(MOCK_CUSTOMERS[0]));

      // update (soft delete) mock
      const deleteBuilder = createMockQueryBuilder();
      deleteBuilder.update.mockReturnValue(deleteBuilder);
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

      const result = await service.delete('cust-1', TEST_IDS.organization);

      expect(result).toEqual({ message: 'Customer deleted successfully' });
    });
  });
});
