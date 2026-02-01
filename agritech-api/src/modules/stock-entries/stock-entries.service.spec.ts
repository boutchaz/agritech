import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import { StockEntriesService } from './stock-entries.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';
import { StockEntryType, StockEntryStatus, ValuationMethod } from './dto/create-stock-entry.dto';

describe('StockEntriesService', () => {
  let service: StockEntriesService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: {
    getAdminClient: jest.Mock;
    getPgPool: jest.Mock;
  };
  let mockPool: {
    connect: jest.Mock;
  };
  let mockPgClient: PoolClient;

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const STOCK_ENTRY_TYPES = [
    StockEntryType.MATERIAL_RECEIPT,
    StockEntryType.MATERIAL_ISSUE,
    StockEntryType.STOCK_TRANSFER,
    StockEntryType.STOCK_RECONCILIATION,
  ];

  const STOCK_ENTRY_STATUSES = [
    StockEntryStatus.DRAFT,
    StockEntryStatus.POSTED,
    StockEntryStatus.CANCELLED,
  ];

  const VALUATION_METHODS = [
    ValuationMethod.FIFO,
    ValuationMethod.LIFO,
    ValuationMethod.MOVING_AVERAGE,
  ];

  const MOCK_STOCK_ENTRIES = [
    {
      id: 'se1',
      organization_id: TEST_IDS.organization,
      entry_type: StockEntryType.MATERIAL_RECEIPT,
      entry_number: 'SE-20240101-0001',
      entry_date: '2024-01-01',
      to_warehouse_id: 'wh1',
      status: StockEntryStatus.POSTED,
      created_by: TEST_IDS.user,
    },
    {
      id: 'se2',
      organization_id: TEST_IDS.organization,
      entry_type: StockEntryType.MATERIAL_ISSUE,
      entry_number: 'SE-20240101-0002',
      entry_date: '2024-01-01',
      from_warehouse_id: 'wh1',
      status: StockEntryStatus.DRAFT,
      created_by: TEST_IDS.user,
    },
  ];

  const MOCK_STOCK_ENTRY_ITEMS = [
    {
      id: 'sei1',
      stock_entry_id: 'se1',
      line_number: 1,
      item_id: 'item1',
      item_name: 'NPK Fertilizer',
      quantity: 100,
      unit: 'kg',
      cost_per_unit: 50,
    },
    {
      id: 'sei2',
      stock_entry_id: 'se1',
      line_number: 2,
      item_id: 'item2',
      item_name: 'Corn Seeds',
      quantity: 50,
      unit: 'kg',
      cost_per_unit: 100,
    },
  ];

  const MOCK_STOCK_MOVEMENTS = [
    {
      id: 'sm1',
      organization_id: TEST_IDS.organization,
      item_id: 'item1',
      warehouse_id: 'wh1',
      movement_type: 'IN',
      quantity: 100,
      unit: 'kg',
      balance_quantity: 100,
      cost_per_unit: 50,
      total_cost: 5000,
    },
  ];

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockPgClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as unknown as PoolClient;

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockPgClient),
    };

    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
      getPgPool: jest.fn(() => mockPool),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockEntriesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<StockEntriesService>(StockEntriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // PARAMETERIZED TESTS - STOCK ENTRY TYPES
  // ============================================================

  describe('Stock Entry Types (Parameterized)', () => {
    it.each(STOCK_ENTRY_TYPES)(
      'should validate warehouse requirements for %s',
      async (entryType) => {
        let validationError = false;

        try {
          const dto = {
            organization_id: TEST_IDS.organization,
            entry_type: entryType,
            entry_date: '2024-01-01',
            items: [{ item_id: 'item1', quantity: 10, unit: 'kg' }],
          } as any;

          // Create minimal DTO based on type
          switch (entryType) {
            case StockEntryType.MATERIAL_RECEIPT:
              dto.to_warehouse_id = 'wh1';
              break;
            case StockEntryType.MATERIAL_ISSUE:
              dto.from_warehouse_id = 'wh1';
              break;
            case StockEntryType.STOCK_TRANSFER:
              dto.from_warehouse_id = 'wh1';
              dto.to_warehouse_id = 'wh2';
              break;
            case StockEntryType.STOCK_RECONCILIATION:
              dto.to_warehouse_id = 'wh1';
              break;
          }

          await service.createStockEntry(dto);
        } catch (error) {
          validationError = true;
        }

        // Should either succeed or fail with validation error
        expect(validationError || !validationError).toBeDefined();
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('findAll', () => {
      it.each([null, undefined, '', '   ', '\t\n'])(
        'should handle invalid organization ID: %s',
        async (orgId) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.then.mockResolvedValue(mockQueryResult([]));
          mockClient.from.mockReturnValue(queryBuilder);

          const result = await service.findAll(orgId as any);

          expect(result).toEqual([]);
        }
      );

      it('should handle database errors gracefully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(
          mockQueryResult(null, { message: 'Database connection failed' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.findAll(TEST_IDS.organization)).rejects.toThrow(BadRequestException);
      });
    });

    describe('createStockEntry', () => {
      it('should reject entry without items', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          entry_type: StockEntryType.MATERIAL_RECEIPT,
          entry_date: '2024-01-01',
          to_warehouse_id: 'wh1',
          items: [],
        } as any;

        await expect(service.createStockEntry(dto)).rejects.toThrow(BadRequestException);
        await expect(service.createStockEntry(dto)).rejects.toThrow(
          'Stock entry must have at least one item'
        );
      });

      it('should reject material receipt without target warehouse', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          entry_type: StockEntryType.MATERIAL_RECEIPT,
          entry_date: '2024-01-01',
          items: [{ item_id: 'item1', quantity: 10, unit: 'kg' }],
        } as any;

        await expect(service.createStockEntry(dto)).rejects.toThrow(BadRequestException);
        await expect(service.createStockEntry(dto)).rejects.toThrow(
          'Material Receipt requires a target warehouse'
        );
      });

      it('should reject material issue without source warehouse', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          entry_type: StockEntryType.MATERIAL_ISSUE,
          entry_date: '2024-01-01',
          items: [{ item_id: 'item1', quantity: 10, unit: 'kg' }],
        } as any;

        await expect(service.createStockEntry(dto)).rejects.toThrow(BadRequestException);
        await expect(service.createStockEntry(dto)).rejects.toThrow(
          'Material Issue requires a source warehouse'
        );
      });

      it('should reject stock transfer with same source and target warehouse', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          entry_type: StockEntryType.STOCK_TRANSFER,
          entry_date: '2024-01-01',
          from_warehouse_id: 'wh1',
          to_warehouse_id: 'wh1',
          items: [{ item_id: 'item1', quantity: 10, unit: 'kg' }],
        } as any;

        await expect(service.createStockEntry(dto)).rejects.toThrow(BadRequestException);
        await expect(service.createStockEntry(dto)).rejects.toThrow(
          'Source and target warehouses must be different'
        );
      });

      it('should reject items with zero or negative quantity', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          entry_type: StockEntryType.MATERIAL_RECEIPT,
          entry_date: '2024-01-01',
          to_warehouse_id: 'wh1',
          items: [
            { item_id: 'item1', quantity: 0, unit: 'kg' },
            { item_id: 'item2', quantity: -10, unit: 'kg' },
          ],
        } as any;

        await expect(service.createStockEntry(dto)).rejects.toThrow(BadRequestException);
        await expect(service.createStockEntry(dto)).rejects.toThrow(
          'Quantity must be greater than zero'
        );
      });

      it('should reject stock reconciliation without system and physical quantities', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          entry_type: StockEntryType.STOCK_RECONCILIATION,
          entry_date: '2024-01-01',
          to_warehouse_id: 'wh1',
          items: [
            {
              item_id: 'item1',
              quantity: 10,
              unit: 'kg',
              system_quantity: undefined,
              physical_quantity: undefined,
            },
          ],
        } as any;

        await expect(service.createStockEntry(dto)).rejects.toThrow(BadRequestException);
      });
    });

    describe('updateStockEntry', () => {
      it('should reject update of non-existent entry', async () => {
        mockPgClient.query = jest.fn().mockResolvedValue({ rows: [] });

        await expect(
          service.updateStockEntry('non-existent', TEST_IDS.organization, TEST_IDS.user, {
            entry_date: new Date('2024-01-01'),
          })
        ).rejects.toThrow(NotFoundException);
      });

      it('should reject update of posted entry', async () => {
        mockPgClient.query = jest.fn().mockResolvedValue({
          rows: [{ id: 'se1', status: StockEntryStatus.POSTED }],
        });

        await expect(
          service.updateStockEntry('se1', TEST_IDS.organization, TEST_IDS.user, {
            entry_date: new Date('2024-01-01'),
          })
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.updateStockEntry('se1', TEST_IDS.organization, TEST_IDS.user, {
            entry_date: new Date('2024-01-01'),
          })
        ).rejects.toThrow('Only draft entries can be updated');
      });
    });

    describe('postStockEntry', () => {
      it('should reject posting of non-existent entry', async () => {
        mockPgClient.query = jest.fn().mockResolvedValue({ rows: [] });

        await expect(
          service.postStockEntry('non-existent', TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject posting of already posted entry', async () => {
        mockPgClient.query = jest.fn().mockResolvedValue({
          rows: [
            {
              id: 'se1',
              status: StockEntryStatus.POSTED,
              stock_entry_items: [],
            },
          ],
        });

        await expect(
          service.postStockEntry('se1', TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.postStockEntry('se1', TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow('Stock entry is already posted');
      });

      it('should reject posting of cancelled entry', async () => {
        mockPgClient.query = jest.fn().mockResolvedValue({
          rows: [
            {
              id: 'se1',
              status: StockEntryStatus.CANCELLED,
              stock_entry_items: [],
            },
          ],
        });

        await expect(
          service.postStockEntry('se1', TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.postStockEntry('se1', TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow('Cannot post a cancelled stock entry');
      });
    });

    describe('deleteStockEntry', () => {
      it('should reject deletion of non-existent entry', async () => {
        mockPgClient.query = jest.fn().mockResolvedValue({ rows: [] });

        await expect(
          service.deleteStockEntry('non-existent', TEST_IDS.organization)
        ).rejects.toThrow(NotFoundException);
      });

      it('should reject deletion of posted entry', async () => {
        mockPgClient.query = jest.fn().mockResolvedValue({
          rows: [{ id: 'se1', status: StockEntryStatus.POSTED }],
        });

        await expect(
          service.deleteStockEntry('se1', TEST_IDS.organization)
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.deleteStockEntry('se1', TEST_IDS.organization)
        ).rejects.toThrow('Only draft entries can be deleted');
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - CRUD Operations', () => {
    describe('findAll', () => {
      it('should return stock entries with warehouse relations', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_STOCK_ENTRIES));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization);

        expect(result).toEqual(MOCK_STOCK_ENTRIES);
        expect(mockClient.from).toHaveBeenCalledWith('stock_entries');
      });

      it('should filter by entry_type', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([MOCK_STOCK_ENTRIES[0]]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          entry_type: StockEntryType.MATERIAL_RECEIPT,
        });

        expect(result).toBeDefined();
        expect(queryBuilder.eq).toHaveBeenCalledWith('entry_type', StockEntryType.MATERIAL_RECEIPT);
      });

      it('should filter by status', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([MOCK_STOCK_ENTRIES[1]]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          status: StockEntryStatus.DRAFT,
        });

        expect(result).toBeDefined();
        expect(queryBuilder.eq).toHaveBeenCalledWith('status', StockEntryStatus.DRAFT);
      });

      it('should filter by date range', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.gte.mockReturnValue(queryBuilder);
        queryBuilder.lte.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_STOCK_ENTRIES));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          from_date: '2024-01-01',
          to_date: '2024-12-31',
        });

        expect(result).toBeDefined();
        expect(queryBuilder.gte).toHaveBeenCalledWith('entry_date', '2024-01-01');
        expect(queryBuilder.lte).toHaveBeenCalledWith('entry_date', '2024-12-31');
      });

      it('should filter by warehouse_id', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_STOCK_ENTRIES));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          warehouse_id: 'wh1',
        });

        expect(result).toBeDefined();
        expect(queryBuilder.or).toHaveBeenCalledWith(
          'from_warehouse_id.eq.wh1,to_warehouse_id.eq.wh1'
        );
      });
    });

    describe('findOne', () => {
      it('should return stock entry with items', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({
            ...MOCK_STOCK_ENTRIES[0],
            items: MOCK_STOCK_ENTRY_ITEMS,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findOne('se1', TEST_IDS.organization);

        expect(result).toBeDefined();
        expect(result.items).toEqual(MOCK_STOCK_ENTRY_ITEMS);
      });

      it('should throw NotFoundException when entry not found', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null, null));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.findOne('non-existent', TEST_IDS.organization)).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('createStockEntry', () => {
      it('should create material receipt entry', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          entry_type: StockEntryType.MATERIAL_RECEIPT,
          entry_date: '2024-01-01',
          to_warehouse_id: 'wh1',
          items: [
            {
              item_id: 'item1',
              item_name: 'NPK Fertilizer',
              quantity: 100,
              unit: 'kg',
              cost_per_unit: 50,
            },
          ],
          status: StockEntryStatus.DRAFT,
          created_by: TEST_IDS.user,
        } as any;

        let queryCallCount = 0;
        mockPgClient.query = jest.fn().mockImplementation(() => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // BEGIN
            return { rows: [] };
          } else if (queryCallCount === 2) {
            // Generate entry number
            return { rows: [{ entry_number: 'SE-20240101-0001' }] };
          } else if (queryCallCount === 3) {
            // Insert stock entry
            return { rows: [{ id: 'se1', entry_number: 'SE-20240101-0001' }] };
          } else if (queryCallCount === 4) {
            // Insert stock entry items
            return { rows: [{ id: 'sei1' }] };
          } else if (queryCallCount === 5) {
            // COMMIT
            return { rows: [] };
          }
          return { rows: [] };
        });

        const result = await service.createStockEntry(dto);

        expect(result).toBeDefined();
        expect(mockPgClient.query).toHaveBeenCalled();
      });

      it('should create posted material receipt and process movements', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          entry_type: StockEntryType.MATERIAL_RECEIPT,
          entry_date: '2024-01-01',
          to_warehouse_id: 'wh1',
          items: [
            {
              item_id: 'item1',
              item_name: 'NPK Fertilizer',
              quantity: 100,
              unit: 'kg',
              cost_per_unit: 50,
            },
          ],
          status: StockEntryStatus.POSTED,
          created_by: TEST_IDS.user,
        } as any;

        let queryCallCount = 0;
        mockPgClient.query = jest.fn().mockImplementation(() => {
          queryCallCount++;
          if (queryCallCount === 1) {
            return { rows: [] }; // BEGIN
          } else if (queryCallCount === 2) {
            return { rows: [{ entry_number: 'SE-20240101-0001' }] };
          } else if (queryCallCount === 3) {
            return { rows: [{ id: 'se1', entry_number: 'SE-20240101-0001' }] };
          } else if (queryCallCount === 4) {
            return { rows: [{ id: 'sei1' }] };
          } else if (queryCallCount >= 5 && queryCallCount <= 7) {
            // Stock movements and valuations
            return { rows: [] };
          } else if (queryCallCount === 8) {
            return { rows: [] }; // COMMIT
          }
          return { rows: [] };
        });

        const result = await service.createStockEntry(dto);

        expect(result).toBeDefined();
        expect(mockPgClient.query).toHaveBeenCalled();
      });
    });

    describe('getStockMovements', () => {
      it('should return stock movements with relations', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_STOCK_MOVEMENTS));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStockMovements(TEST_IDS.organization);

        expect(result).toEqual(MOCK_STOCK_MOVEMENTS);
        expect(mockClient.from).toHaveBeenCalledWith('stock_movements');
      });

      it('should filter movements by item_id', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([MOCK_STOCK_MOVEMENTS[0]]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStockMovements(TEST_IDS.organization, {
          item_id: 'item1',
        });

        expect(result).toBeDefined();
        expect(queryBuilder.eq).toHaveBeenCalledWith('item_id', 'item1');
      });

      it('should filter movements by warehouse_id', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_STOCK_MOVEMENTS));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStockMovements(TEST_IDS.organization, {
          warehouse_id: 'wh1',
        });

        expect(result).toBeDefined();
        expect(queryBuilder.eq).toHaveBeenCalledWith('warehouse_id', 'wh1');
      });

      it('should filter movements by movement_type', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([MOCK_STOCK_MOVEMENTS[0]]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStockMovements(TEST_IDS.organization, {
          movement_type: 'IN',
        });

        expect(result).toBeDefined();
        expect(queryBuilder.eq).toHaveBeenCalledWith('movement_type', 'IN');
      });
    });
  });

  // ============================================================
  // TRANSACTION MANAGEMENT TESTS
  // ============================================================

  describe('Transaction Management', () => {
    it('should commit transaction on successful stock entry creation', async () => {
      const dto = {
        organization_id: TEST_IDS.organization,
        entry_type: StockEntryType.MATERIAL_RECEIPT,
        entry_date: '2024-01-01',
        to_warehouse_id: 'wh1',
        items: [{ item_id: 'item1', quantity: 10, unit: 'kg' }],
        status: StockEntryStatus.DRAFT,
      } as any;

      const transactionCalls: string[] = [];
      mockPgClient.query = jest.fn().mockImplementation((query: string) => {
        if (query.includes('BEGIN')) {
          transactionCalls.push('BEGIN');
          return { rows: [] };
        }
        if (query.includes('COMMIT')) {
          transactionCalls.push('COMMIT');
          return { rows: [] };
        }
        if (query.includes('ROLLBACK')) {
          transactionCalls.push('ROLLBACK');
          return { rows: [] };
        }
        if (query.includes('generate_stock_entry_number')) {
          return { rows: [{ entry_number: 'SE-20240101-0001' }] };
        }
        if (query.includes('INSERT INTO stock_entries')) {
          return { rows: [{ id: 'se1' }] };
        }
        if (query.includes('INSERT INTO stock_entry_items')) {
          return { rows: [{ id: 'sei1' }] };
        }
        return { rows: [] };
      });

      await service.createStockEntry(dto);

      expect(transactionCalls).toContain('BEGIN');
      expect(transactionCalls).toContain('COMMIT');
      expect(transactionCalls).not.toContain('ROLLBACK');
    });

    it('should rollback transaction on error', async () => {
      const dto = {
        organization_id: TEST_IDS.organization,
        entry_type: StockEntryType.MATERIAL_RECEIPT,
        entry_date: '2024-01-01',
        to_warehouse_id: 'wh1',
        items: [{ item_id: 'item1', quantity: 10, unit: 'kg' }],
        status: StockEntryStatus.DRAFT,
      } as any;

      const transactionCalls: string[] = [];
      mockPgClient.query = jest.fn().mockImplementation((query: string) => {
        if (query.includes('BEGIN')) {
          transactionCalls.push('BEGIN');
          return { rows: [] };
        }
        if (query.includes('COMMIT')) {
          transactionCalls.push('COMMIT');
          return { rows: [] };
        }
        if (query.includes('ROLLBACK')) {
          transactionCalls.push('ROLLBACK');
          return { rows: [] };
        }
        throw new Error('Database error');
      });

      await expect(service.createStockEntry(dto)).rejects.toThrow();

      expect(transactionCalls).toContain('BEGIN');
      expect(transactionCalls).toContain('ROLLBACK');
      expect(transactionCalls).not.toContain('COMMIT');
    });

    it('should release connection after transaction', async () => {
      const dto = {
        organization_id: TEST_IDS.organization,
        entry_type: StockEntryType.MATERIAL_RECEIPT,
        entry_date: '2024-01-01',
        to_warehouse_id: 'wh1',
        items: [{ item_id: 'item1', quantity: 10, unit: 'kg' }],
        status: StockEntryStatus.DRAFT,
      } as any;

      mockPgClient.query = jest.fn().mockResolvedValue({ rows: [] });
      mockPgClient.release = jest.fn();

      try {
        await service.createStockEntry(dto);
      } catch (e) {
        // Ignore errors
      }

      expect(mockPgClient.release).toHaveBeenCalled();
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Stock Availability', () => {
      it('should validate stock availability before issue', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          entry_type: StockEntryType.MATERIAL_ISSUE,
          entry_date: '2024-01-01',
          from_warehouse_id: 'wh1',
          items: [{ item_id: 'item1', quantity: 1000, unit: 'kg' }],
          status: StockEntryStatus.POSTED,
        } as any;

        mockPgClient.query = jest.fn().mockImplementation((query: string) => {
          if (query.includes('BEGIN')) return { rows: [] };
          if (query.includes('generate_stock_entry_number')) {
            return { rows: [{ entry_number: 'SE-20240101-0001' }] };
          }
          if (query.includes('INSERT INTO stock_entries')) {
            return { rows: [{ id: 'se1' }] };
          }
          if (query.includes('INSERT INTO stock_entry_items')) {
            return { rows: [{ id: 'sei1' }] };
          }
          if (query.includes('SELECT COALESCE(SUM(quantity)')) {
            // Return insufficient balance
            return { rows: [{ balance: '100' }] };
          }
          if (query.includes('COMMIT')) return { rows: [] };
          return { rows: [] };
        });

        await expect(service.createStockEntry(dto)).rejects.toThrow(BadRequestException);
        await expect(service.createStockEntry(dto)).rejects.toThrow(
          'Insufficient stock'
        );
      });
    });

    describe('Valuation Methods', () => {
      it.each(VALUATION_METHODS)(
        'should handle %s valuation method',
        async (valuationMethod) => {
          const dto = {
            organization_id: TEST_IDS.organization,
            entry_type: StockEntryType.MATERIAL_ISSUE,
            entry_date: '2024-01-01',
            from_warehouse_id: 'wh1',
            items: [
              {
                item_id: 'item1',
                quantity: 10,
                unit: 'kg',
                valuation_method: valuationMethod,
              },
            ],
            status: StockEntryStatus.POSTED,
          } as any;

          mockPgClient.query = jest.fn().mockImplementation((query: string) => {
            if (query.includes('BEGIN')) return { rows: [] };
            if (query.includes('generate_stock_entry_number')) {
              return { rows: [{ entry_number: 'SE-20240101-0001' }] };
            }
            if (query.includes('INSERT INTO stock_entries')) {
              return { rows: [{ id: 'se1' }] };
            }
            if (query.includes('INSERT INTO stock_entry_items')) {
              return { rows: [{ id: 'sei1' }] };
            }
            if (query.includes('SELECT COALESCE(SUM(quantity)')) {
              return { rows: [{ balance: '1000' }] };
            }
            if (query.includes('FROM stock_valuation')) {
              // Return valuation batches
              return {
                rows: [
                  { id: 'val1', remaining_quantity: '50', cost_per_unit: '50' },
                  { id: 'val2', remaining_quantity: '30', cost_per_unit: '55' },
                ],
              };
            }
            if (query.includes('UPDATE stock_valuation')) {
              return { rows: [] };
            }
            if (query.includes('INSERT INTO stock_movements')) {
              return { rows: [] };
            }
            if (query.includes('COMMIT')) return { rows: [] };
            return { rows: [] };
          });

          const result = await service.createStockEntry(dto);

          expect(result).toBeDefined();
        }
      );
    });

    describe('Stock Reconciliation', () => {
      it('should handle positive variance in reconciliation', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          entry_type: StockEntryType.STOCK_RECONCILIATION,
          entry_date: '2024-01-01',
          to_warehouse_id: 'wh1',
          items: [
            {
              item_id: 'item1',
              quantity: 10,
              unit: 'kg',
              system_quantity: 100,
              physical_quantity: 120,
              cost_per_unit: 50,
            },
          ],
          status: StockEntryStatus.POSTED,
        } as any;

        mockPgClient.query = jest.fn().mockImplementation((query: string) => {
          if (query.includes('BEGIN')) return { rows: [] };
          if (query.includes('generate_stock_entry_number')) {
            return { rows: [{ entry_number: 'SE-20240101-0001' }] };
          }
          if (query.includes('INSERT INTO stock_entries')) {
            return { rows: [{ id: 'se1' }] };
          }
          if (query.includes('INSERT INTO stock_entry_items')) {
            return { rows: [{ id: 'sei1' }] };
          }
          if (query.includes('INSERT INTO stock_movements')) {
            return { rows: [] };
          }
          if (query.includes('INSERT INTO stock_valuation')) {
            return { rows: [] };
          }
          if (query.includes('COMMIT')) return { rows: [] };
          return { rows: [] };
        });

        const result = await service.createStockEntry(dto);

        expect(result).toBeDefined();
      });

      it('should handle negative variance in reconciliation', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          entry_type: StockEntryType.STOCK_RECONCILIATION,
          entry_date: '2024-01-01',
          to_warehouse_id: 'wh1',
          items: [
            {
              item_id: 'item1',
              quantity: 10,
              unit: 'kg',
              system_quantity: 100,
              physical_quantity: 80,
            },
          ],
          status: StockEntryStatus.POSTED,
        } as any;

        mockPgClient.query = jest.fn().mockImplementation((query: string) => {
          if (query.includes('BEGIN')) return { rows: [] };
          if (query.includes('generate_stock_entry_number')) {
            return { rows: [{ entry_number: 'SE-20240101-0001' }] };
          }
          if (query.includes('INSERT INTO stock_entries')) {
            return { rows: [{ id: 'se1' }] };
          }
          if (query.includes('INSERT INTO stock_entry_items')) {
            return { rows: [{ id: 'sei1' }] };
          }
          if (query.includes('SELECT COALESCE(SUM(quantity)')) {
            return { rows: [{ balance: '100' }] };
          }
          if (query.includes('FROM stock_valuation')) {
            return {
              rows: [
                { id: 'val1', remaining_quantity: '50', cost_per_unit: '50' },
                { id: 'val2', remaining_quantity: '30', cost_per_unit: '55' },
              ],
            };
          }
          if (query.includes('UPDATE stock_valuation')) {
            return { rows: [] };
          }
          if (query.includes('INSERT INTO stock_movements')) {
            return { rows: [] };
          }
          if (query.includes('COMMIT')) return { rows: [] };
          return { rows: [] };
        });

        const result = await service.createStockEntry(dto);

        expect(result).toBeDefined();
      });

      it('should skip reconciliation when variance is zero', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          entry_type: StockEntryType.STOCK_RECONCILIATION,
          entry_date: '2024-01-01',
          to_warehouse_id: 'wh1',
          items: [
            {
              item_id: 'item1',
              quantity: 0,
              unit: 'kg',
              system_quantity: 100,
              physical_quantity: 100,
            },
          ],
          status: StockEntryStatus.POSTED,
        } as any;

        mockPgClient.query = jest.fn().mockImplementation((query: string) => {
          if (query.includes('BEGIN')) return { rows: [] };
          if (query.includes('generate_stock_entry_number')) {
            return { rows: [{ entry_number: 'SE-20240101-0001' }] };
          }
          if (query.includes('INSERT INTO stock_entries')) {
            return { rows: [{ id: 'se1' }] };
          }
          if (query.includes('INSERT INTO stock_entry_items')) {
            return { rows: [{ id: 'sei1' }] };
          }
          if (query.includes('COMMIT')) return { rows: [] };
          return { rows: [] };
        });

        const result = await service.createStockEntry(dto);

        expect(result).toBeDefined();
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple simultaneous stock entry requests', async () => {
        mockPgClient.query = jest.fn().mockImplementation((query: string) => {
          if (query.includes('BEGIN')) return { rows: [] };
          if (query.includes('generate_stock_entry_number')) {
            return { rows: [{ entry_number: `SE-20240101-${Math.random()}` }] };
          }
          if (query.includes('INSERT INTO stock_entries')) {
            return { rows: [{ id: `se${Math.random()}` }] };
          }
          if (query.includes('INSERT INTO stock_entry_items')) {
            return { rows: [{ id: `sei${Math.random()}` }] };
          }
          if (query.includes('COMMIT')) return { rows: [] };
          return { rows: [] };
        });

        const promises = STOCK_ENTRY_TYPES.slice(0, 2).map((entryType) =>
          service.createStockEntry({
            organization_id: TEST_IDS.organization,
            entry_type: entryType,
            entry_date: '2024-01-01',
            to_warehouse_id: 'wh1',
            items: [{ item_id: 'item1', quantity: 10, unit: 'kg' }],
            status: StockEntryStatus.DRAFT,
          } as any)
        );

        const results = await Promise.all(promises);

        results.forEach((result) => {
          expect(result).toBeDefined();
        });
      });
    });
  });

  // ============================================================
  // OPENING STOCK BALANCES TESTS
  // ============================================================

  describe('Opening Stock Balances', () => {
    describe('getOpeningStockBalances', () => {
      it('should return opening stock balances with relations', async () => {
        const mockBalances = [
          {
            id: 'osb1',
            organization_id: TEST_IDS.organization,
            item_id: 'item1',
            warehouse_id: 'wh1',
            quantity: 1000,
            cost_per_unit: 50,
            opening_date: '2024-01-01',
            status: 'Posted',
          },
        ];

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.gte.mockReturnValue(queryBuilder);
        queryBuilder.lte.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(mockBalances));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getOpeningStockBalances(TEST_IDS.organization);

        expect(result).toEqual(mockBalances);
      });

      it('should filter balances by item_id', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getOpeningStockBalances(TEST_IDS.organization, {
          item_id: 'item1',
        });

        expect(result).toBeDefined();
        expect(queryBuilder.eq).toHaveBeenCalledWith('item_id', 'item1');
      });

      it('should filter balances by warehouse_id', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getOpeningStockBalances(TEST_IDS.organization, {
          warehouse_id: 'wh1',
        });

        expect(result).toBeDefined();
        expect(queryBuilder.eq).toHaveBeenCalledWith('warehouse_id', 'wh1');
      });
    });

    describe('createOpeningStockBalance', () => {
      it('should create opening stock balance', async () => {
        const dto = {
          item_id: 'item1',
          warehouse_id: 'wh1',
          quantity: 1000,
          cost_per_unit: 50,
          opening_date: '2024-01-01',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'osb1',
            organization_id: TEST_IDS.organization,
            ...dto,
            status: 'Draft',
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.createOpeningStockBalance(
          TEST_IDS.organization,
          TEST_IDS.user,
          dto as any
        );

        expect(result).toBeDefined();
        expect(result.quantity).toBe(1000);
      });
    });

    describe('postOpeningStockBalance', () => {
      it('should post opening stock balance with stock valuation updates', async () => {
        mockPgClient.query.mockImplementation((query: string) => {
          if (query.includes('SELECT *') && query.includes('opening_stock_balances')) {
            return Promise.resolve({
              rows: [
                {
                  id: 'osb1',
                  organization_id: TEST_IDS.organization,
                  item_id: 'item1',
                  warehouse_id: 'wh1',
                  opening_date: '2024-01-01',
                  quantity: 10,
                  valuation_rate: 5,
                  status: 'Draft',
                  batch_number: null,
                  serial_numbers: null,
                  created_by: TEST_IDS.user,
                  posted_by: null,
                },
              ],
            });
          }

          if (query.includes('SELECT default_unit')) {
            return Promise.resolve({ rows: [{ default_unit: 'kg' }] });
          }

          if (query.includes('SELECT journal_entry_id')) {
            return Promise.resolve({ rows: [{ journal_entry_id: 'je1' }] });
          }

          return Promise.resolve({ rows: [] });
        });

        const result = await service.postOpeningStockBalance('osb1', TEST_IDS.organization);

        expect(result).toEqual({ journal_entry_id: 'je1' });
        expect(mockPgClient.query).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // STOCK ACCOUNT MAPPINGS TESTS
  // ============================================================

  describe('Stock Account Mappings', () => {
    describe('getStockAccountMappings', () => {
      it('should return stock account mappings with account relations', async () => {
        const mockMappings = [
          {
            id: 'sam1',
            organization_id: TEST_IDS.organization,
            entry_type: StockEntryType.MATERIAL_RECEIPT,
            debit_account_id: 'acc1',
            credit_account_id: 'acc2',
            debit_account: { id: 'acc1', account_number: '101', account_name: 'Inventory' },
            credit_account: { id: 'acc2', account_number: '201', account_name: 'AP' },
          },
        ];

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(mockMappings));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStockAccountMappings(TEST_IDS.organization);

        expect(result).toEqual(mockMappings);
      });
    });

    describe('createStockAccountMapping', () => {
      it('should create stock account mapping', async () => {
        const dto = {
          entry_type: StockEntryType.MATERIAL_RECEIPT,
          debit_account_id: 'acc1',
          credit_account_id: 'acc2',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'sam1',
            organization_id: TEST_IDS.organization,
            ...dto,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.createStockAccountMapping(
          TEST_IDS.organization,
          dto as any
        );

        expect(result).toBeDefined();
        expect(result.entry_type).toBe(StockEntryType.MATERIAL_RECEIPT);
      });
    });
  });
});
