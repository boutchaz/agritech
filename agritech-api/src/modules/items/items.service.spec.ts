import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ItemsService } from './items.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('ItemsService', () => {
  let service: ItemsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  const MOCK_ITEMS = [
    {
      id: 'item-1',
      organization_id: TEST_IDS.organization,
      item_code: 'ITM-2024-00001',
      item_name: 'NPK Fertilizer',
      default_unit: 'kg',
      is_active: true,
      item_group: { id: 'grp-1', name: 'Fertilizers', code: 'FERT', path: '/FERT' },
    },
    {
      id: 'item-2',
      organization_id: TEST_IDS.organization,
      item_code: 'ITM-2024-00002',
      item_name: 'Wheat Seeds',
      default_unit: 'kg',
      is_active: true,
      item_group: null,
    },
  ];

  const MOCK_ITEM_GROUPS = [
    {
      id: 'grp-1',
      organization_id: TEST_IDS.organization,
      name: 'Fertilizers',
      code: 'FERT',
      is_active: true,
    },
    {
      id: 'grp-2',
      organization_id: TEST_IDS.organization,
      name: 'Seeds',
      code: 'SEED',
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
        ItemsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper for services using TWO queries (count + data)
  function setupPaginateMock(
    data: any[],
    count: number,
    error: any = null,
  ) {
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
  // findAllItems
  // ============================================================

  describe('findAllItems', () => {
    it('should return PaginatedResponse shape', async () => {
      setupPaginateMock(MOCK_ITEMS, 2);

      const result = await service.findAllItems(TEST_IDS.organization);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should handle empty results', async () => {
      setupPaginateMock([], 0);

      const result = await service.findAllItems(TEST_IDS.organization);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should throw on database error', async () => {
      setupPaginateMock(null as any, 0, { message: 'DB failure' });

      await expect(service.findAllItems(TEST_IDS.organization)).rejects.toThrow(BadRequestException);
    });

    it('should apply item_group_id filter', async () => {
      const { countBuilder, dataBuilder } = setupPaginateMock([MOCK_ITEMS[0]], 1);

      await service.findAllItems(TEST_IDS.organization, { item_group_id: 'grp-1' });

      expect(countBuilder.eq).toHaveBeenCalledWith('item_group_id', 'grp-1');
    });

    it('should apply is_active filter', async () => {
      const { countBuilder } = setupPaginateMock(MOCK_ITEMS, 2);

      await service.findAllItems(TEST_IDS.organization, { is_active: true });

      expect(countBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  // ============================================================
  // findAllItemGroups
  // ============================================================

  describe('findAllItemGroups', () => {
    it('should return PaginatedResponse shape', async () => {
      setupPaginateMock(MOCK_ITEM_GROUPS, 2);

      const result = await service.findAllItemGroups(TEST_IDS.organization);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should handle empty results', async () => {
      setupPaginateMock([], 0);

      const result = await service.findAllItemGroups(TEST_IDS.organization);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should throw on database error', async () => {
      setupPaginateMock(null as any, 0, { message: 'DB failure' });

      await expect(service.findAllItemGroups(TEST_IDS.organization)).rejects.toThrow(BadRequestException);
    });

    it('should apply is_active filter', async () => {
      const { countBuilder } = setupPaginateMock(MOCK_ITEM_GROUPS, 2);

      await service.findAllItemGroups(TEST_IDS.organization, { is_active: true });

      expect(countBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  // ============================================================
  // findOneItem
  // ============================================================

  describe('findOneItem', () => {
    it('should return a single item', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_ITEMS[0]));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findOneItem('item-1', TEST_IDS.organization);

      expect(result).toEqual(MOCK_ITEMS[0]);
      expect(mockClient.from).toHaveBeenCalledWith('items');
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'item-1');
      expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
    });

    it('should throw BadRequestException on error', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'Not found' }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(service.findOneItem('non-existent', TEST_IDS.organization))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // createItem
  // ============================================================

  describe('createItem', () => {
    it('should insert and return an item', async () => {
      // Mock for generateItemCode query
      const codeBuilder = createMockQueryBuilder();
      codeBuilder.then.mockImplementation((resolve) => {
        const result = { data: [], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      // Mock for insert
      const insertBuilder = createMockQueryBuilder();
      insertBuilder.insert.mockReturnValue(insertBuilder);
      insertBuilder.select.mockReturnValue(insertBuilder);
      insertBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: 'item-new',
          organization_id: TEST_IDS.organization,
          item_code: 'ITM-2024-00001',
          item_name: 'New Item',
        }),
      );

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) return codeBuilder;
        return insertBuilder;
      });

      const result = await service.createItem({
        organization_id: TEST_IDS.organization,
        item_name: 'New Item',
        default_unit: 'kg',
        created_by: TEST_IDS.user,
      } as any);

      expect(result).toHaveProperty('id', 'item-new');
    });
  });

  // ============================================================
  // updateItem
  // ============================================================

  describe('updateItem', () => {
    it('should patch and return an item', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({ ...MOCK_ITEMS[0], item_name: 'Updated Fertilizer' }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.updateItem(
        'item-1',
        TEST_IDS.organization,
        TEST_IDS.user,
        { item_name: 'Updated Fertilizer' } as any,
      );

      expect(result).toHaveProperty('item_name', 'Updated Fertilizer');
    });
  });

  // ============================================================
  // deleteItem
  // ============================================================

  describe('deleteItem', () => {
    it('should delete and return success message', async () => {
      // Check stock_entry_items
      const stockCheckBuilder = createMockQueryBuilder();
      stockCheckBuilder.then.mockImplementation((resolve) => {
        const result = { data: [], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      // Check invoice_items
      const invoiceCheckBuilder = createMockQueryBuilder();
      invoiceCheckBuilder.then.mockImplementation((resolve) => {
        const result = { data: [], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      // Delete
      const deleteBuilder = createMockQueryBuilder();
      deleteBuilder.delete.mockReturnValue(deleteBuilder);
      deleteBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'stock_entry_items') return stockCheckBuilder;
        if (table === 'invoice_items') return invoiceCheckBuilder;
        return deleteBuilder;
      });

      const result = await service.deleteItem('item-1', TEST_IDS.organization);

      expect(result).toEqual({ message: 'Item deleted successfully' });
    });

    it('should throw if item is used in stock transactions', async () => {
      const stockCheckBuilder = createMockQueryBuilder();
      stockCheckBuilder.then.mockImplementation((resolve) => {
        const result = { data: [{ id: 'sei-1' }], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'stock_entry_items') return stockCheckBuilder;
        return createMockQueryBuilder();
      });

      await expect(service.deleteItem('item-1', TEST_IDS.organization))
        .rejects.toThrow(BadRequestException);
    });
  });
});
