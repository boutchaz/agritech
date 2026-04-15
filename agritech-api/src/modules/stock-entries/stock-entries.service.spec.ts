import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
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
import { StockAccountingService } from './stock-accounting.service';
import { SequencesService } from '../sequences/sequences.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StockReservationsService } from './stock-reservations.service';
import { StockEntryApprovalsService } from './stock-entry-approvals.service';

describe('StockEntriesService', () => {
  type QueryResult = { rows: any[] };
  type QueryHandler = (query: string, values?: unknown[]) => QueryResult | Promise<QueryResult>;
  type QueryMock = jest.MockedFunction<QueryHandler>;

  let service: StockEntriesService;
  let moduleRef: TestingModule;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: {
    getAdminClient: jest.Mock;
    getPgPool: jest.Mock;
  };
  let mockPool: {
    connect: jest.Mock<() => Promise<PoolClient>>;
  };
  let mockPgClient: {
    query: QueryMock;
    release: jest.Mock<() => void>;
  };
  let mockStockAccountingService: {
    createJournalEntryForStockEntry: jest.Mock<
      (...args: any[]) => Promise<{ success: boolean; error?: string }>
    >;
    createReversalJournalEntry: jest.Mock<
      (...args: any[]) => Promise<{ success: boolean; error?: string }>
    >;
  };
  let mockSequencesService: {
    generateStockEntryNumber: jest.Mock<(organizationId: string) => Promise<string>>;
    generateJournalEntryNumber: jest.Mock<(organizationId: string) => Promise<string>>;
  };
  let mockNotificationsService: {
    createNotificationsForUsers: jest.Mock<(...args: any[]) => Promise<void>>;
  };
  let mockStockReservationsService: {
    reserveStock: jest.Mock<(...args: any[]) => Promise<any>>;
    releaseReservation: jest.Mock<(...args: any[]) => Promise<void>>;
    fulfillReservation: jest.Mock<(...args: any[]) => Promise<void>>;
    releaseReservationsForReference: jest.Mock<(...args: any[]) => Promise<void>>;
    fulfillReservationsForReference: jest.Mock<(...args: any[]) => Promise<void>>;
    getReservedQuantity: jest.Mock<(...args: any[]) => Promise<number>>;
    expireReservations: jest.Mock<(...args: any[]) => Promise<number>>;
    getAvailableQuantity: jest.Mock<(...args: any[]) => Promise<number>>;
  };
  let mockStockEntryApprovalsService: {
    assertApprovedForPosting: jest.Mock<(...args: any[]) => Promise<void>>;
  };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const STOCK_ENTRY_TYPES = [
    StockEntryType.MATERIAL_RECEIPT,
    StockEntryType.MATERIAL_ISSUE,
    StockEntryType.STOCK_TRANSFER,
    StockEntryType.STOCK_RECONCILIATION,
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

  const pgResult = (rows: any[] = []): Promise<QueryResult> => Promise.resolve({ rows });

  const createEntryRow = (
    dto: {
      organization_id: string;
      entry_type: StockEntryType;
      entry_date: string;
      from_warehouse_id?: string;
      to_warehouse_id?: string;
      status?: StockEntryStatus;
      created_by?: string;
    },
    overrides: Record<string, unknown> = {}
  ) => ({
    id: 'se1',
    organization_id: dto.organization_id,
    entry_type: dto.entry_type,
    entry_number: 'SE-20240101-0001',
    entry_date: dto.entry_date,
    from_warehouse_id: dto.from_warehouse_id ?? null,
    to_warehouse_id: dto.to_warehouse_id ?? null,
    status: dto.status ?? StockEntryStatus.DRAFT,
    created_by: dto.created_by ?? null,
    ...overrides,
  });

  const createItemRow = (
    item: {
      item_id: string;
      item_name?: string;
      quantity: number;
      unit: string;
      source_warehouse_id?: string;
      target_warehouse_id?: string;
      cost_per_unit?: number;
      system_quantity?: number;
      physical_quantity?: number;
      valuation_method?: ValuationMethod;
    },
    overrides: Record<string, unknown> = {}
  ) => ({
    id: 'sei1',
    item_id: item.item_id,
    item_name: item.item_name ?? null,
    quantity: item.quantity,
    unit: item.unit,
    source_warehouse_id: item.source_warehouse_id ?? null,
    target_warehouse_id: item.target_warehouse_id ?? null,
    cost_per_unit: item.cost_per_unit ?? null,
    system_quantity: item.system_quantity ?? null,
    physical_quantity: item.physical_quantity ?? null,
    valuation_method: item.valuation_method,
    ...overrides,
  });

  const createPgQueryMock = (handler?: QueryHandler): QueryMock => {
    const mock = jest.fn<QueryHandler>();
    mock.mockImplementation(async (query: string, values?: unknown[]) => {
      if (
        query.includes('BEGIN') ||
        query.includes('COMMIT') ||
        query.includes('ROLLBACK')
      ) {
        return { rows: [] };
      }

      if (handler) {
        return handler(query, values);
      }

      return { rows: [] };
    });

    return mock;
  };

  const setThenableResult = <T>(queryBuilder: MockQueryBuilder, result: { data: T; error: any }) => {
    queryBuilder.then.mockImplementation((resolve: (value: { data: T; error: any }) => void) => {
      resolve(result);
      return Promise.resolve(result);
    });
  };

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockPgClient = {
      query: createPgQueryMock(),
      release: jest.fn<() => void>(),
    };

    mockPool = {
      connect: jest.fn<() => Promise<PoolClient>>().mockResolvedValue(mockPgClient as unknown as PoolClient),
    };

    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
      getPgPool: jest.fn(() => mockPool),
    };

    mockStockAccountingService = {
      createJournalEntryForStockEntry: jest
        .fn<(...args: any[]) => Promise<{ success: boolean; error?: string }>>()
        .mockResolvedValue({ success: true }),
      createReversalJournalEntry: jest
        .fn<(...args: any[]) => Promise<{ success: boolean; error?: string }>>()
        .mockResolvedValue({ success: true }),
    };

    mockSequencesService = {
      generateStockEntryNumber: jest
        .fn<(organizationId: string) => Promise<string>>()
        .mockResolvedValue('SE-REV-0001'),
      generateJournalEntryNumber: jest
        .fn<(organizationId: string) => Promise<string>>()
        .mockResolvedValue('JE-REV-0001'),
    };

    mockNotificationsService = {
      createNotificationsForUsers: jest.fn<(...args: any[]) => Promise<void>>().mockResolvedValue(undefined),
    };

    mockStockReservationsService = {
      reserveStock: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ id: 'res1' }),
      releaseReservation: jest.fn<(...args: any[]) => Promise<void>>().mockResolvedValue(undefined),
      fulfillReservation: jest.fn<(...args: any[]) => Promise<void>>().mockResolvedValue(undefined),
      releaseReservationsForReference: jest.fn<(...args: any[]) => Promise<void>>().mockResolvedValue(undefined),
      fulfillReservationsForReference: jest.fn<(...args: any[]) => Promise<void>>().mockResolvedValue(undefined),
      getReservedQuantity: jest.fn<(...args: any[]) => Promise<number>>().mockResolvedValue(0),
      expireReservations: jest.fn<(...args: any[]) => Promise<number>>().mockResolvedValue(0),
      getAvailableQuantity: jest.fn<(...args: any[]) => Promise<number>>().mockResolvedValue(0),
    };

    mockStockEntryApprovalsService = {
      assertApprovedForPosting: jest.fn<(...args: any[]) => Promise<void>>().mockResolvedValue(undefined),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        StockEntriesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: StockAccountingService, useValue: mockStockAccountingService },
        { provide: SequencesService, useValue: mockSequencesService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: StockReservationsService, useValue: mockStockReservationsService },
        { provide: StockEntryApprovalsService, useValue: mockStockEntryApprovalsService },
      ],
    }).compile();

    service = moduleRef.get<StockEntriesService>(StockEntriesService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    await moduleRef.close();
  });

  // ============================================================
  // PARAMETERIZED TESTS - STOCK ENTRY TYPES
  // ============================================================

  describe('Stock Entry Types (Parameterized)', () => {
    it.each(STOCK_ENTRY_TYPES)(
      'should validate warehouse requirements for %s',
      async (entryType) => {
        const dto = {
          organization_id: TEST_IDS.organization,
          entry_type: entryType,
          entry_date: '2024-01-01',
          items: [{ item_id: 'item1', quantity: 10, unit: 'kg' }],
        } as any;

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
            dto.items[0].system_quantity = 10;
            dto.items[0].physical_quantity = 10;
            break;
        }

        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('INSERT INTO stock_entries')) {
            return pgResult([createEntryRow(dto)]);
          }

          if (query.includes('INSERT INTO stock_entry_items')) {
            return pgResult([createItemRow(dto.items[0])]);
          }

          return pgResult();
        });

        await expect(service.createStockEntry(dto)).resolves.toEqual(
          expect.objectContaining({
            entry_type: entryType,
          })
        );
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
          setThenableResult(queryBuilder, mockQueryResult([]));
          mockClient.from.mockReturnValue(queryBuilder);

          const result = await service.findAll(orgId as any);

          expect(result).toEqual({
            data: [],
            total: 0,
            page: 1,
            pageSize: 50,
            totalPages: 0,
          });
        }
      );

      it('should handle database errors gracefully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
          setThenableResult(queryBuilder, mockQueryResult(null, { message: 'Database connection failed' }));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.findAll(TEST_IDS.organization)).rejects.toThrow(
          'Failed to fetch stock_entries: Database connection failed'
        );
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
        mockPgClient.query = createPgQueryMock(() => pgResult());

        await expect(
          service.updateStockEntry('non-existent', TEST_IDS.organization, TEST_IDS.user, {
            entry_date: new Date('2024-01-01'),
          })
        ).rejects.toThrow(NotFoundException);
      });

      it('should reject update of posted entry', async () => {
        mockPgClient.query = createPgQueryMock(() =>
          pgResult([{ id: 'se1', status: StockEntryStatus.POSTED }])
        );

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
        mockPgClient.query = createPgQueryMock(() => pgResult());

        await expect(
          service.postStockEntry('non-existent', TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow(NotFoundException);
      });

      it('should reject posting of already posted entry', async () => {
        mockPgClient.query = createPgQueryMock(() =>
          pgResult([
            {
              id: 'se1',
              status: StockEntryStatus.POSTED,
              stock_entry_items: [],
            },
          ])
        );

        await expect(
          service.postStockEntry('se1', TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.postStockEntry('se1', TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow('Stock entry is already posted');
      });

      it('should reject posting of cancelled entry', async () => {
        mockPgClient.query = createPgQueryMock(() =>
          pgResult([
            {
              id: 'se1',
              status: StockEntryStatus.CANCELLED,
              stock_entry_items: [],
            },
          ])
        );

        await expect(
          service.postStockEntry('se1', TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.postStockEntry('se1', TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow('Cannot post a cancelled stock entry');
      });

      it('should block unapproved submitted entries from posting', async () => {
        mockStockEntryApprovalsService.assertApprovedForPosting.mockRejectedValueOnce(
          new BadRequestException('Stock entry requires approval before posting'),
        );

        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('FROM stock_entries se')) {
            return pgResult([
              {
                id: 'se1',
                organization_id: TEST_IDS.organization,
                entry_type: StockEntryType.MATERIAL_RECEIPT,
                entry_number: 'SE-001',
                status: StockEntryStatus.SUBMITTED,
                to_warehouse_id: 'wh1',
                stock_entry_items: [],
              },
            ]);
          }

          return pgResult();
        });

        await expect(
          service.postStockEntry('se1', TEST_IDS.organization, TEST_IDS.user),
        ).rejects.toThrow('Stock entry requires approval before posting');

        expect(mockStockEntryApprovalsService.assertApprovedForPosting).toHaveBeenCalledWith(
          'se1',
          TEST_IDS.organization,
          mockPgClient,
        );
      });

      it('should allow approved submitted entries to post', async () => {
        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('FROM stock_entries se')) {
            return pgResult([
              {
                id: 'se1',
                organization_id: TEST_IDS.organization,
                entry_type: StockEntryType.MATERIAL_RECEIPT,
                entry_number: 'SE-001',
                status: StockEntryStatus.SUBMITTED,
                to_warehouse_id: 'wh1',
                stock_entry_items: [],
              },
            ]);
          }

          if (query.includes('SELECT id, name, is_active FROM warehouses')) {
            return pgResult([{ id: 'wh1', name: 'Main Warehouse', is_active: true }]);
          }

          if (query.includes('UPDATE stock_entries') || query.includes('organization_users')) {
            return pgResult();
          }

          return pgResult();
        });

        await expect(
          service.postStockEntry('se1', TEST_IDS.organization, TEST_IDS.user),
        ).resolves.toEqual(
          expect.objectContaining({
            message: 'Stock entry posted successfully',
          }),
        );

        expect(mockStockEntryApprovalsService.assertApprovedForPosting).toHaveBeenCalledWith(
          'se1',
          TEST_IDS.organization,
          mockPgClient,
        );
      });
    });

    describe('deleteStockEntry', () => {
      it('should reject deletion of non-existent entry', async () => {
        mockPgClient.query = createPgQueryMock(() => pgResult());

        await expect(
          service.deleteStockEntry('non-existent', TEST_IDS.organization)
        ).rejects.toThrow(NotFoundException);
      });

      it('should reject deletion of posted entry', async () => {
        mockPgClient.query = createPgQueryMock(() =>
          pgResult([{ id: 'se1', status: StockEntryStatus.POSTED }])
        );

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
        setThenableResult(queryBuilder, mockQueryResult(MOCK_STOCK_ENTRIES));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization);

        expect(result).toEqual(
          expect.objectContaining({
            data: MOCK_STOCK_ENTRIES,
          })
        );
        expect(mockClient.from).toHaveBeenCalledWith('stock_entries');
      });

      it('should filter by entry_type', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        setThenableResult(queryBuilder, mockQueryResult([MOCK_STOCK_ENTRIES[0]]));
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
        setThenableResult(queryBuilder, mockQueryResult([MOCK_STOCK_ENTRIES[1]]));
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
        setThenableResult(queryBuilder, mockQueryResult(MOCK_STOCK_ENTRIES));
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
        setThenableResult(queryBuilder, mockQueryResult(MOCK_STOCK_ENTRIES));
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

        mockSequencesService.generateStockEntryNumber.mockResolvedValue('SE-20240101-0001');
        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('INSERT INTO stock_entries')) {
            return pgResult([createEntryRow(dto)]);
          }

          if (query.includes('INSERT INTO stock_entry_items')) {
            return pgResult([createItemRow(dto.items[0])]);
          }

          return pgResult();
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

        mockSequencesService.generateStockEntryNumber.mockResolvedValue('SE-20240101-0001');
        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('INSERT INTO stock_entries')) {
            return pgResult([
              createEntryRow(dto, {
                posted_at: new Date('2024-01-01T00:00:00.000Z'),
              }),
            ]);
          }

          if (query.includes('INSERT INTO stock_entry_items')) {
            return pgResult([createItemRow(dto.items[0])]);
          }

          if (
            query.includes('INSERT INTO stock_movements') ||
            query.includes('INSERT INTO stock_valuation')
          ) {
            return pgResult();
          }

          return pgResult();
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
        setThenableResult(queryBuilder, mockQueryResult(MOCK_STOCK_MOVEMENTS));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStockMovements(TEST_IDS.organization);

        expect(result).toEqual(
          expect.objectContaining({
            data: MOCK_STOCK_MOVEMENTS,
          })
        );
        expect(mockClient.from).toHaveBeenCalledWith('stock_movements');
      });

      it('should filter movements by item_id', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        setThenableResult(queryBuilder, mockQueryResult([MOCK_STOCK_MOVEMENTS[0]]));
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
        setThenableResult(queryBuilder, mockQueryResult(MOCK_STOCK_MOVEMENTS));
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
        setThenableResult(queryBuilder, mockQueryResult([MOCK_STOCK_MOVEMENTS[0]]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStockMovements(TEST_IDS.organization, {
          movement_type: 'IN',
        });

        expect(result).toBeDefined();
        expect(queryBuilder.eq).toHaveBeenCalledWith('movement_type', 'IN');
      });
    });

    describe('getStockDashboard', () => {
      it('should return stock dashboard summary', async () => {
        const valuationBuilder = createMockQueryBuilder();
        valuationBuilder.eq.mockReturnValue(valuationBuilder);
        valuationBuilder.gt.mockReturnValue(valuationBuilder);
        setThenableResult(valuationBuilder, mockQueryResult([
          { total_cost: '150.50' },
          { total_cost: 49.5 },
        ]));

        const stockLevelsBuilder = createMockQueryBuilder();
        stockLevelsBuilder.eq.mockReturnValue(stockLevelsBuilder);
        setThenableResult(stockLevelsBuilder, mockQueryResult([
          { item_id: 'item1', quantity: '5' },
        ]));

        const itemsBuilder = createMockQueryBuilder();
        itemsBuilder.eq.mockReturnValue(itemsBuilder);
        itemsBuilder.is.mockReturnValue(itemsBuilder);
        itemsBuilder.gt.mockReturnValue(itemsBuilder);
        setThenableResult(itemsBuilder, mockQueryResult([
          { id: 'item1', item_code: 'ITM-001', item_name: 'NPK Fertilizer', reorder_point: 20 },
        ]));

        const pendingBuilder = createMockQueryBuilder();
        pendingBuilder.select.mockReturnValue(pendingBuilder);
        pendingBuilder.eq.mockReturnValue(pendingBuilder);
        pendingBuilder.in.mockResolvedValue({ count: 3, error: null });

        const recentBuilder = createMockQueryBuilder();
        recentBuilder.select.mockReturnValue(recentBuilder);
        recentBuilder.eq.mockReturnValue(recentBuilder);
        recentBuilder.gte.mockResolvedValue({ count: 7, error: null });

        const warehousesBuilder = createMockQueryBuilder();
        warehousesBuilder.select.mockReturnValue(warehousesBuilder);
        warehousesBuilder.eq.mockReturnValue(warehousesBuilder);
        warehousesBuilder.is.mockResolvedValue({ count: 2, error: null });

        mockClient.from.mockImplementation((table: string) => {
          switch (table) {
            case 'stock_valuation':
              return valuationBuilder;
            case 'warehouse_stock_levels':
              return stockLevelsBuilder;
            case 'items':
              return itemsBuilder;
            case 'stock_entries':
              return pendingBuilder;
            case 'stock_movements':
              return recentBuilder;
            case 'warehouses':
              return warehousesBuilder;
            default:
              return createMockQueryBuilder();
          }
        });

        const result = await service.getStockDashboard(TEST_IDS.organization);

        expect(result).toEqual({
          totalStockValue: 200,
          lowStockAlertsCount: 1,
          lowStockItems: [
            { id: 'item1', item_code: 'ITM-001', item_name: 'NPK Fertilizer', reorder_point: 20 },
          ],
          pendingEntriesCount: 3,
          recentMovementsCount: 7,
          warehouseCount: 2,
        });
      });
    });

    describe('getReorderSuggestions', () => {
      it('should return only items below reorder point', async () => {
        const itemsBuilder = createMockQueryBuilder();
        itemsBuilder.eq.mockReturnValue(itemsBuilder);
        itemsBuilder.is.mockReturnValue(itemsBuilder);
        itemsBuilder.gt.mockReturnValue(itemsBuilder);
        setThenableResult(itemsBuilder, mockQueryResult([
          {
            id: 'item1',
            item_code: 'ITM-001',
            item_name: 'NPK Fertilizer',
            default_unit: 'kg',
            reorder_point: 20,
            reorder_quantity: 50,
            variants: [],
          },
          {
            id: 'item2',
            item_code: 'ITM-002',
            item_name: 'Corn Seeds',
            default_unit: 'kg',
            reorder_point: 10,
            reorder_quantity: 25,
            variants: [],
          },
        ]));

        const stockLevelsBuilder = createMockQueryBuilder();
        stockLevelsBuilder.eq.mockReturnValue(stockLevelsBuilder);
        setThenableResult(stockLevelsBuilder, mockQueryResult([
          { item_id: 'item1', quantity: '8' },
          { item_id: 'item1', quantity: '2' },
          { item_id: 'item2', quantity: '12' },
        ]));

        mockClient.from.mockImplementation((table: string) => {
          switch (table) {
            case 'items':
              return itemsBuilder;
            case 'warehouse_stock_levels':
              return stockLevelsBuilder;
            default:
              return createMockQueryBuilder();
          }
        });

        const result = await service.getReorderSuggestions(TEST_IDS.organization);

        expect(result).toEqual([
          expect.objectContaining({
            itemId: 'item1',
            itemCode: 'ITM-001',
            itemName: 'NPK Fertilizer',
            currentStock: 10,
            reorderPoint: 20,
            shortfall: 10,
            suggestedOrderQty: 50,
            unit: 'kg',
          }),
        ]);
      });

      it('should throw when items query fails', async () => {
        const itemsBuilder = createMockQueryBuilder();
        itemsBuilder.eq.mockReturnValue(itemsBuilder);
        itemsBuilder.is.mockReturnValue(itemsBuilder);
        itemsBuilder.gt.mockReturnValue(itemsBuilder);
        setThenableResult(itemsBuilder, mockQueryResult(null, { message: 'boom' }));
        mockClient.from.mockImplementation((table: string) => {
          if (table === 'items') {
            return itemsBuilder;
          }
          return createMockQueryBuilder();
        });

        await expect(service.getReorderSuggestions(TEST_IDS.organization)).rejects.toThrow(
          'Failed to fetch reorder suggestions: boom',
        );
      });
    });

    describe('getSystemQuantity', () => {
      it('should return warehouse system quantity for base item stock', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.is.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValueOnce({ data: { quantity: '14.5' }, error: null });
        queryBuilder.maybeSingle.mockResolvedValueOnce({ data: { default_unit: 'kg' }, error: null });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getSystemQuantity(
          TEST_IDS.organization,
          'item1',
          'wh1',
        );

        expect(result).toEqual({ quantity: 14.5, unit: 'kg' });
        expect(queryBuilder.is).toHaveBeenCalledWith('variant_id', null);
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      });

      it('should filter by variant when variant_id is provided', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValueOnce({ data: { quantity: 5 }, error: null });
        queryBuilder.maybeSingle.mockResolvedValueOnce({ data: { default_unit: 'pcs' }, error: null });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getSystemQuantity(
          TEST_IDS.organization,
          'item1',
          'wh1',
          'variant1',
        );

        expect(result).toEqual({ quantity: 5, unit: 'pcs' });
        expect(queryBuilder.eq).toHaveBeenCalledWith('variant_id', 'variant1');
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
      const transactionQueryMock = jest.fn<QueryHandler>();
      transactionQueryMock.mockImplementation((query: string) => {
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
        if (query.includes('INSERT INTO stock_entries')) {
          return { rows: [createEntryRow(dto)] };
        }
        if (query.includes('INSERT INTO stock_entry_items')) {
          return { rows: [createItemRow(dto.items[0])] };
        }
        return { rows: [] };
      });
      mockPgClient.query = transactionQueryMock;

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
      const transactionQueryMock = jest.fn<QueryHandler>();
      transactionQueryMock.mockImplementation((query: string) => {
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
      mockPgClient.query = transactionQueryMock;

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

      mockPgClient.query = createPgQueryMock(() => pgResult());
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

        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('BEGIN')) return { rows: [] };
          if (query.includes('INSERT INTO stock_entries')) {
            return pgResult([createEntryRow(dto)]);
          }
          if (query.includes('INSERT INTO stock_entry_items')) {
            return pgResult([createItemRow(dto.items[0])]);
          }
          if (query.includes('SELECT COALESCE(SUM(quantity)')) {
            // Return insufficient balance
            return pgResult([{ balance: '100' }]);
          }
          return pgResult();
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

          mockPgClient.query = createPgQueryMock((query: string) => {
            if (query.includes('INSERT INTO stock_entries')) {
              return pgResult([
                createEntryRow(dto, {
                  entry_number: 'SE-REV-0001',
                }),
              ]);
            }
            if (query.includes('INSERT INTO stock_entry_items')) {
              return pgResult([
                createItemRow(dto.items[0], {
                  valuation_method: valuationMethod,
                }),
              ]);
            }
            if (query.includes('SELECT COALESCE(SUM(quantity)')) {
              return pgResult([{ balance: '1000' }]);
            }
            if (query.includes('FROM stock_valuation')) {
              // Return valuation batches
              return pgResult([
                { id: 'val1', remaining_quantity: '50', cost_per_unit: '50' },
                { id: 'val2', remaining_quantity: '30', cost_per_unit: '55' },
              ]);
            }
            if (query.includes('UPDATE stock_valuation')) {
              return pgResult();
            }
            if (query.includes('INSERT INTO stock_movements')) {
              return pgResult();
            }
            return pgResult();
          });

          const result = await service.createStockEntry(dto);

          expect(result).toBeDefined();
        }
      );

      describe('Moving Average Valuation', () => {
        it('should compute weighted average cost across all batches', async () => {
          const dto = {
            organization_id: TEST_IDS.organization,
            entry_type: StockEntryType.MATERIAL_ISSUE,
            entry_date: '2024-01-01',
            from_warehouse_id: 'wh1',
            items: [
              {
                item_id: 'item1',
                quantity: 50,
                unit: 'kg',
                valuation_method: ValuationMethod.MOVING_AVERAGE,
              },
            ],
            status: StockEntryStatus.POSTED,
          } as any;

          let movementParams: any[] = [];

          mockPgClient.query = createPgQueryMock((query: string, params?: any[]) => {
            if (query.includes('INSERT INTO stock_entries')) {
              return pgResult([
                createEntryRow(dto, {
                  entry_number: 'SE-REV-0001',
                }),
              ]);
            }
            if (query.includes('INSERT INTO stock_entry_items')) {
              return pgResult([
                createItemRow(dto.items[0], {
                  valuation_method: ValuationMethod.MOVING_AVERAGE,
                }),
              ]);
            }
            if (query.includes('SELECT id FROM stock_movements')) {
              return pgResult();
            }
            if (query.includes('SELECT COALESCE(SUM(quantity), 0) as balance')) {
              return pgResult([{ balance: '100' }]);
            }
            if (query.includes('SELECT valuation_method FROM items WHERE id = $1')) {
              return pgResult([{ valuation_method: ValuationMethod.MOVING_AVERAGE }]);
            }
            if (query.includes('FROM stock_valuation') && query.includes('ORDER BY created_at ASC')) {
              return pgResult([
                { id: 'val1', remaining_quantity: '50', cost_per_unit: '10' },
                { id: 'val2', remaining_quantity: '30', cost_per_unit: '15' },
                { id: 'val3', remaining_quantity: '20', cost_per_unit: '20' },
              ]);
            }
            if (query.includes('UPDATE stock_valuation')) {
              return pgResult();
            }
            if (query.includes('INSERT INTO stock_movements')) {
              movementParams = params || [];
              return pgResult();
            }
            return pgResult();
          });

          await service.createStockEntry(dto);

          expect(movementParams[9]).toBeCloseTo(13.5);
          expect(movementParams[10]).toBeCloseTo(-675);
        });

        it('should reduce all batches proportionally for moving average', async () => {
          const dto = {
            organization_id: TEST_IDS.organization,
            entry_type: StockEntryType.MATERIAL_ISSUE,
            entry_date: '2024-01-01',
            from_warehouse_id: 'wh1',
            items: [
              {
                item_id: 'item1',
                quantity: 50,
                unit: 'kg',
                valuation_method: ValuationMethod.MOVING_AVERAGE,
              },
            ],
            status: StockEntryStatus.POSTED,
          } as any;

          const valuationUpdates: Array<{ quantity: number; batchId: string }> = [];

          mockPgClient.query = createPgQueryMock((query: string, params?: any[]) => {
            if (query.includes('INSERT INTO stock_entries')) {
              return pgResult([
                createEntryRow(dto, {
                  entry_number: 'SE-REV-0001',
                }),
              ]);
            }
            if (query.includes('INSERT INTO stock_entry_items')) {
              return pgResult([
                createItemRow(dto.items[0], {
                  valuation_method: ValuationMethod.MOVING_AVERAGE,
                }),
              ]);
            }
            if (query.includes('SELECT id FROM stock_movements')) {
              return pgResult();
            }
            if (query.includes('SELECT COALESCE(SUM(quantity), 0) as balance')) {
              return pgResult([{ balance: '100' }]);
            }
            if (query.includes('SELECT valuation_method FROM items WHERE id = $1')) {
              return pgResult([{ valuation_method: ValuationMethod.MOVING_AVERAGE }]);
            }
            if (query.includes('FROM stock_valuation') && query.includes('ORDER BY created_at ASC')) {
              return pgResult([
                { id: 'val1', remaining_quantity: '50', cost_per_unit: '10' },
                { id: 'val2', remaining_quantity: '30', cost_per_unit: '15' },
                { id: 'val3', remaining_quantity: '20', cost_per_unit: '20' },
              ]);
            }
            if (query.includes('UPDATE stock_valuation')) {
              valuationUpdates.push({ quantity: params?.[0], batchId: params?.[1] });
              return pgResult();
            }
            if (query.includes('INSERT INTO stock_movements')) {
              return pgResult();
            }
            return pgResult();
          });

          await service.createStockEntry(dto);

          expect(valuationUpdates).toHaveLength(3);
          expect(valuationUpdates).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ batchId: 'val1', quantity: 25 }),
              expect.objectContaining({ batchId: 'val2', quantity: 15 }),
              expect.objectContaining({ batchId: 'val3', quantity: 10 }),
            ])
          );
        });

        it('should throw when insufficient total valuation for moving average', async () => {
          const dto = {
            organization_id: TEST_IDS.organization,
            entry_type: StockEntryType.MATERIAL_ISSUE,
            entry_date: '2024-01-01',
            from_warehouse_id: 'wh1',
            items: [
              {
                item_id: 'item1',
                quantity: 100,
                unit: 'kg',
                valuation_method: ValuationMethod.MOVING_AVERAGE,
              },
            ],
            status: StockEntryStatus.POSTED,
          } as any;

          mockPgClient.query = createPgQueryMock((query: string) => {
            if (query.includes('INSERT INTO stock_entries')) {
              return pgResult([
                createEntryRow(dto, {
                  entry_number: 'SE-REV-0001',
                }),
              ]);
            }
            if (query.includes('INSERT INTO stock_entry_items')) {
              return pgResult([
                createItemRow(dto.items[0], {
                  valuation_method: ValuationMethod.MOVING_AVERAGE,
                }),
              ]);
            }
            if (query.includes('SELECT id FROM stock_movements')) {
              return pgResult();
            }
            if (query.includes('SELECT COALESCE(SUM(quantity), 0) as balance')) {
              return pgResult([{ balance: '100' }]);
            }
            if (query.includes('SELECT valuation_method FROM items WHERE id = $1')) {
              return pgResult([{ valuation_method: ValuationMethod.MOVING_AVERAGE }]);
            }
            if (query.includes('FROM stock_valuation') && query.includes('ORDER BY created_at ASC')) {
              return pgResult([
                { id: 'val1', remaining_quantity: '25', cost_per_unit: '10' },
                { id: 'val2', remaining_quantity: '25', cost_per_unit: '15' },
              ]);
            }
            return pgResult();
          });

          await expect(service.createStockEntry(dto)).rejects.toThrow(BadRequestException);
          await expect(service.createStockEntry(dto)).rejects.toThrow('Insufficient valuation');
        });
      });
    });

    describe('Stock Entry Reversal', () => {
      it('should reverse a posted material receipt', async () => {
        let originalStatusUpdateParams: any[] = [];

        mockPgClient.query = createPgQueryMock((query: string, params?: any[]) => {
          if (query.includes('FROM stock_entries se') && query.includes('FOR UPDATE OF se')) {
            return {
              rows: [
                {
                  id: 'se1',
                  organization_id: TEST_IDS.organization,
                  entry_type: StockEntryType.MATERIAL_RECEIPT,
                  entry_number: 'SE-20240101-0001',
                  entry_date: '2024-01-01',
                  to_warehouse_id: 'wh1',
                  status: StockEntryStatus.POSTED,
                  stock_entry_items: [
                    {
                      id: 'sei1',
                      line_number: 1,
                      item_id: 'item1',
                      item_name: 'NPK Fertilizer',
                      quantity: 10,
                      unit: 'kg',
                      cost_per_unit: 50,
                    },
                  ],
                },
              ],
            };
          }
          if (query.includes("WHERE reference_type = 'reversal'")) {
            return { rows: [] };
          }
          if (query.includes('INSERT INTO stock_entries')) {
            return {
              rows: [
                {
                  id: 'se-rev-1',
                  organization_id: TEST_IDS.organization,
                  entry_number: 'SE-REV-0001',
                  entry_date: '2024-01-02',
                },
              ],
            };
          }
          if (query.includes('INSERT INTO stock_entry_items')) {
            return { rows: [] };
          }
          if (query.includes('FROM stock_valuation') && query.includes('stock_entry_id = $5')) {
            return {
              rows: [{ id: 'val1', remaining_quantity: '10', cost_per_unit: '50' }],
            };
          }
          if (query.includes('UPDATE stock_valuation')) {
            return { rows: [] };
          }
          if (query.includes('INSERT INTO stock_movements')) {
            return { rows: [] };
          }
          if (query.includes('UPDATE stock_entries SET status = $1')) {
            originalStatusUpdateParams = params || [];
            return { rows: [] };
          }
          return { rows: [] };
        });

        const result = await service.reverseStockEntry(
          'se1',
          TEST_IDS.organization,
          TEST_IDS.user,
          'Damaged goods'
        );

        expect(result).toEqual(
          expect.objectContaining({
            original_entry_id: 'se1',
            reversal_entry_id: 'se-rev-1',
            reversal_number: 'SE-REV-0001',
          })
        );
        expect(originalStatusUpdateParams[0]).toBe(StockEntryStatus.REVERSED);
      });

      it('should reverse a posted material issue and restore valuation', async () => {
        const valuationInsertParams: any[][] = [];
        const movementInsertParams: any[][] = [];

        mockPgClient.query = createPgQueryMock((query: string, params?: any[]) => {
          if (query.includes('FROM stock_entries se') && query.includes('FOR UPDATE OF se')) {
            return {
              rows: [
                {
                  id: 'se-issue-1',
                  organization_id: TEST_IDS.organization,
                  entry_type: StockEntryType.MATERIAL_ISSUE,
                  entry_number: 'SE-ISS-0001',
                  entry_date: '2024-01-01',
                  from_warehouse_id: 'wh-source',
                  status: StockEntryStatus.POSTED,
                  stock_entry_items: [
                    {
                      id: 'sei-issue-1',
                      line_number: 1,
                      item_id: 'item1',
                      item_name: 'NPK Fertilizer',
                      quantity: 6,
                      unit: 'kg',
                      cost_per_unit: 42,
                      variant_id: 'variant1',
                      batch_number: 'BATCH-1',
                    },
                  ],
                },
              ],
            };
          }
          if (query.includes("WHERE reference_type = 'reversal'")) {
            return { rows: [] };
          }
          if (query.includes('INSERT INTO stock_entries')) {
            return {
              rows: [
                {
                  id: 'se-rev-issue-1',
                  organization_id: TEST_IDS.organization,
                  entry_number: 'SE-REV-0002',
                  entry_date: '2024-01-02',
                },
              ],
            };
          }
          if (query.includes('INSERT INTO stock_entry_items')) {
            return { rows: [] };
          }
          if (query.includes('INSERT INTO stock_valuation')) {
            valuationInsertParams.push(params || []);
            return { rows: [] };
          }
          if (query.includes('INSERT INTO stock_movements')) {
            movementInsertParams.push(params || []);
            return { rows: [] };
          }
          if (query.includes('UPDATE stock_entries SET status = $1')) {
            return { rows: [] };
          }
          return { rows: [] };
        });

        await service.reverseStockEntry(
          'se-issue-1',
          TEST_IDS.organization,
          TEST_IDS.user,
          'Issued to wrong farm'
        );

        expect(valuationInsertParams).toHaveLength(1);
        expect(valuationInsertParams[0]).toEqual([
          TEST_IDS.organization,
          'item1',
          'variant1',
          'wh-source',
          6,
          42,
          'se-rev-issue-1',
          'BATCH-1',
          null,
          6,
        ]);

        expect(movementInsertParams).toHaveLength(1);
        expect(movementInsertParams[0][4]).toBe('IN');
        expect(movementInsertParams[0][6]).toBe(6);
        expect(movementInsertParams[0][9]).toBe(42);
      });

      it('should reverse a posted stock transfer between warehouses', async () => {
        const valuationUpdateParams: any[][] = [];
        const valuationInsertParams: any[][] = [];
        const movementInsertParams: any[][] = [];

        mockPgClient.query = createPgQueryMock((query: string, params?: any[]) => {
          if (query.includes('FROM stock_entries se') && query.includes('FOR UPDATE OF se')) {
            return {
              rows: [
                {
                  id: 'se-transfer-1',
                  organization_id: TEST_IDS.organization,
                  entry_type: StockEntryType.STOCK_TRANSFER,
                  entry_number: 'SE-TRF-0001',
                  entry_date: '2024-01-01',
                  from_warehouse_id: 'wh-source',
                  to_warehouse_id: 'wh-target',
                  status: StockEntryStatus.POSTED,
                  stock_entry_items: [
                    {
                      id: 'sei-transfer-1',
                      line_number: 1,
                      item_id: 'item1',
                      item_name: 'NPK Fertilizer',
                      quantity: 4,
                      unit: 'kg',
                      cost_per_unit: 18,
                      variant_id: 'variant1',
                      batch_number: 'LOT-77',
                    },
                  ],
                },
              ],
            };
          }
          if (query.includes("WHERE reference_type = 'reversal'")) {
            return { rows: [] };
          }
          if (query.includes('INSERT INTO stock_entries')) {
            return {
              rows: [
                {
                  id: 'se-rev-transfer-1',
                  organization_id: TEST_IDS.organization,
                  entry_number: 'SE-REV-0003',
                  entry_date: '2024-01-02',
                },
              ],
            };
          }
          if (query.includes('INSERT INTO stock_entry_items')) {
            return { rows: [] };
          }
          if (query.includes('FROM stock_valuation') && query.includes('stock_entry_id = $5')) {
            return { rows: [{ id: 'val-transfer-1', remaining_quantity: '4', cost_per_unit: '18' }] };
          }
          if (query.includes('UPDATE stock_valuation')) {
            valuationUpdateParams.push(params || []);
            return { rows: [] };
          }
          if (query.includes('INSERT INTO stock_valuation')) {
            valuationInsertParams.push(params || []);
            return { rows: [] };
          }
          if (query.includes('INSERT INTO stock_movements')) {
            movementInsertParams.push(params || []);
            return { rows: [] };
          }
          if (query.includes('UPDATE stock_entries SET status = $1')) {
            return { rows: [] };
          }
          return { rows: [] };
        });

        await service.reverseStockEntry(
          'se-transfer-1',
          TEST_IDS.organization,
          TEST_IDS.user,
          'Transfer posted to wrong warehouse'
        );

        expect(valuationUpdateParams).toEqual([[4, 'val-transfer-1']]);
        expect(valuationInsertParams).toHaveLength(1);
        expect(valuationInsertParams[0][3]).toBe('wh-source');
        expect(valuationInsertParams[0][4]).toBe(4);

        expect(movementInsertParams).toHaveLength(2);
        expect(movementInsertParams[0][3]).toBe('wh-target');
        expect(movementInsertParams[0][4]).toBe('TRANSFER');
        expect(movementInsertParams[0][6]).toBe(-4);
        expect(movementInsertParams[1][3]).toBe('wh-source');
        expect(movementInsertParams[1][4]).toBe('TRANSFER');
        expect(movementInsertParams[1][6]).toBe(4);
      });

      it('should reject reversal of draft entry', async () => {
        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('FROM stock_entries se') && query.includes('FOR UPDATE OF se')) {
            return {
              rows: [
                {
                  id: 'se1',
                  organization_id: TEST_IDS.organization,
                  entry_type: StockEntryType.MATERIAL_RECEIPT,
                  entry_number: 'SE-20240101-0001',
                  status: StockEntryStatus.DRAFT,
                  stock_entry_items: [],
                },
              ],
            };
          }
          return { rows: [] };
        });

        await expect(
          service.reverseStockEntry('se1', TEST_IDS.organization, TEST_IDS.user, 'Wrong entry')
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject reversal of already reversed entry', async () => {
        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('FROM stock_entries se') && query.includes('FOR UPDATE OF se')) {
            return {
              rows: [
                {
                  id: 'se1',
                  organization_id: TEST_IDS.organization,
                  entry_type: StockEntryType.MATERIAL_RECEIPT,
                  entry_number: 'SE-20240101-0001',
                  status: StockEntryStatus.POSTED,
                  stock_entry_items: [],
                },
              ],
            };
          }
          if (query.includes("WHERE reference_type = 'reversal'")) {
            return { rows: [{ id: 'se-rev-1', entry_number: 'SE-REV-0001' }] };
          }
          return { rows: [] };
        });

        await expect(
          service.reverseStockEntry('se1', TEST_IDS.organization, TEST_IDS.user, 'Duplicate')
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject reversal without reason', async () => {
        await expect(
          service.reverseStockEntry('se1', TEST_IDS.organization, TEST_IDS.user, '')
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.reverseStockEntry('se1', TEST_IDS.organization, TEST_IDS.user, '')
        ).rejects.toThrow('Reversal reason is required');
      });
    });

    describe('Cancel Safety', () => {
      it('should reject cancellation of posted entry', async () => {
        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('SELECT id, status FROM stock_entries') && query.includes('FOR UPDATE')) {
            return { rows: [{ id: 'se1', status: StockEntryStatus.POSTED }] };
          }
          return { rows: [] };
        });

        await expect(
          service.cancelStockEntry('se1', TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.cancelStockEntry('se1', TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow('reversal');
      });

      it('should reject cancellation of reversed entry', async () => {
        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('SELECT id, status FROM stock_entries') && query.includes('FOR UPDATE')) {
            return { rows: [{ id: 'se1', status: StockEntryStatus.REVERSED }] };
          }
          return { rows: [] };
        });

        await expect(
          service.cancelStockEntry('se1', TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow(BadRequestException);
      });
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

        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('INSERT INTO stock_entries')) {
            return pgResult([createEntryRow(dto)]);
          }
          if (query.includes('INSERT INTO stock_entry_items')) {
            return pgResult([createItemRow(dto.items[0])]);
          }
          if (query.includes('INSERT INTO stock_movements')) {
            return pgResult();
          }
          if (query.includes('INSERT INTO stock_valuation')) {
            return pgResult();
          }
          return pgResult();
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

        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('INSERT INTO stock_entries')) {
            return pgResult([createEntryRow(dto)]);
          }
          if (query.includes('INSERT INTO stock_entry_items')) {
            return pgResult([createItemRow(dto.items[0])]);
          }
          if (query.includes('SELECT COALESCE(SUM(quantity)')) {
            return pgResult([{ balance: '100' }]);
          }
          if (query.includes('FROM stock_valuation')) {
            return pgResult([
              { id: 'val1', remaining_quantity: '50', cost_per_unit: '50' },
              { id: 'val2', remaining_quantity: '30', cost_per_unit: '55' },
            ]);
          }
          if (query.includes('UPDATE stock_valuation')) {
            return pgResult();
          }
          if (query.includes('INSERT INTO stock_movements')) {
            return pgResult();
          }
          return pgResult();
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
              quantity: 1,
              unit: 'kg',
              system_quantity: 100,
              physical_quantity: 100,
            },
          ],
          status: StockEntryStatus.POSTED,
        } as any;

        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('INSERT INTO stock_entries')) {
            return pgResult([createEntryRow(dto)]);
          }
          if (query.includes('INSERT INTO stock_entry_items')) {
            return pgResult([createItemRow(dto.items[0])]);
          }
          return pgResult();
        });

        const result = await service.createStockEntry(dto);

        expect(result).toBeDefined();
      });
    });

  describe('Concurrent Operations', () => {
      it('should handle multiple simultaneous stock entry requests', async () => {
        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('INSERT INTO stock_entries')) {
            return {
              rows: [{ ...createEntryRow({
                organization_id: TEST_IDS.organization,
                entry_type: StockEntryType.MATERIAL_RECEIPT,
                entry_date: '2024-01-01',
                to_warehouse_id: 'wh1',
                status: StockEntryStatus.DRAFT,
              }), id: `se${Math.random()}` }],
            };
          }
          if (query.includes('INSERT INTO stock_entry_items')) {
            return { rows: [{ id: `sei${Math.random()}` }] };
          }
          return { rows: [] };
        });

        const promises = STOCK_ENTRY_TYPES.slice(0, 2).map((entryType) => {
          const dto = {
            organization_id: TEST_IDS.organization,
            entry_type: entryType,
            entry_date: '2024-01-01',
            items: [{ item_id: 'item1', quantity: 10, unit: 'kg' }],
            status: StockEntryStatus.DRAFT,
          } as any;

          if (entryType === StockEntryType.MATERIAL_RECEIPT) {
            dto.to_warehouse_id = 'wh1';
          }

          if (entryType === StockEntryType.MATERIAL_ISSUE) {
            dto.from_warehouse_id = 'wh1';
          }

          return service.createStockEntry(dto);
        });

        const results = await Promise.all(promises);

        results.forEach((result) => {
          expect(result).toBeDefined();
        });
    });
  });

  describe('Batch and expiry helpers', () => {
    it('should return grouped active batches', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.not.mockReturnValue(queryBuilder);
      queryBuilder.gt.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      setThenableResult(queryBuilder, mockQueryResult([
        {
          batch_number: 'LOT-001',
          item_id: 'item1',
          warehouse_id: 'wh1',
          variant_id: null,
          quantity: 10,
          remaining_quantity: 4,
          cost_per_unit: 5,
          total_cost: 20,
          valuation_date: '2024-01-10',
          item: { id: 'item1', item_code: 'ITM1', item_name: 'Fertilizer', default_unit: 'kg' },
          warehouse: { id: 'wh1', name: 'Main' },
          stock_entry: { id: 'se1', entry_number: 'SE-1', entry_date: '2024-01-10', items: [{ batch_number: 'LOT-001', expiry_date: '2024-06-01' }] },
        },
        {
          batch_number: 'LOT-001',
          item_id: 'item1',
          warehouse_id: 'wh1',
          variant_id: null,
          quantity: 6,
          remaining_quantity: 2,
          cost_per_unit: 5,
          total_cost: 10,
          valuation_date: '2024-01-11',
          item: { id: 'item1', item_code: 'ITM1', item_name: 'Fertilizer', default_unit: 'kg' },
          warehouse: { id: 'wh1', name: 'Main' },
          stock_entry: { id: 'se2', entry_number: 'SE-2', entry_date: '2024-01-11', items: [{ batch_number: 'LOT-001', expiry_date: '2024-05-15' }] },
        },
      ]));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getBatches(TEST_IDS.organization, { item_id: 'item1', warehouse_id: 'wh1' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('item_id', 'item1');
      expect(queryBuilder.eq).toHaveBeenCalledWith('warehouse_id', 'wh1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        batchNumber: 'LOT-001',
        remainingQuantity: 6,
        expiryDate: '2024-05-15',
      }));
    });

    it('should group expiry alerts by urgency', async () => {
      const now = new Date();
      const toIsoDate = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

      mockPgClient.query = createPgQueryMock(() => ({
        rows: [
          { id: 'sei-expired', item_id: 'item1', batch_number: 'OLD', expiry_date: toIsoDate(-1), remaining_quantity: 5, item_name: 'Fertilizer', default_unit: 'kg', warehouse_name: 'Main' },
          { id: 'sei-critical', item_id: 'item1', batch_number: 'CRIT', expiry_date: toIsoDate(10), remaining_quantity: 3, item_name: 'Seeds', default_unit: 'kg', warehouse_name: 'Main' },
          { id: 'sei-warning', item_id: 'item1', batch_number: 'WARN', expiry_date: toIsoDate(45), remaining_quantity: 2, item_name: 'Pesticide', default_unit: 'L', warehouse_name: 'Main' },
          { id: 'sei-attention', item_id: 'item1', batch_number: 'ATTN', expiry_date: toIsoDate(75), remaining_quantity: 1, item_name: 'Oil', default_unit: 'L', warehouse_name: 'Main' },
        ],
        rowCount: 4,
      }));
      mockPgClient.release = jest.fn();

      const result = await service.getExpiryAlerts(TEST_IDS.organization, 90);

      expect(result).toHaveLength(4);
      expect(result.filter((a: any) => a.urgency === 'expired')).toHaveLength(1);
      expect(result.filter((a: any) => a.urgency === 'critical')).toHaveLength(1);
      expect(result.filter((a: any) => a.urgency === 'warning')).toHaveLength(1);
      expect(result.filter((a: any) => a.urgency === 'attention')).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'sei-expired',
        urgency: 'expired',
        warehouseName: 'Main',
        unit: 'kg',
      }));
    });

    it('should return FEFO suggestions sorted by earliest expiry first', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.gt.mockReturnValue(queryBuilder);
      setThenableResult(queryBuilder, mockQueryResult([
        {
          id: 'val-2',
          item_id: 'item1',
          warehouse_id: 'wh1',
          variant_id: null,
          batch_number: 'LATE',
          remaining_quantity: 10,
          cost_per_unit: 4,
          valuation_date: '2024-01-02',
          stock_entry: { id: 'se2', entry_number: 'SE-2', items: [{ batch_number: 'LATE', expiry_date: '2024-07-01' }] },
        },
        {
          id: 'val-1',
          item_id: 'item1',
          warehouse_id: 'wh1',
          variant_id: null,
          batch_number: 'EARLY',
          remaining_quantity: 5,
          cost_per_unit: 3,
          valuation_date: '2024-01-01',
          stock_entry: { id: 'se1', entry_number: 'SE-1', items: [{ batch_number: 'EARLY', expiry_date: '2024-05-01' }] },
        },
      ]));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getFEFOSuggestion(TEST_IDS.organization, 'item1', 'wh1');

      expect(result.map((row: any) => row.batch_number)).toEqual(['EARLY', 'LATE']);
      expect(result[0].expiry_date).toBe('2024-05-01');
    });
  });

  describe('Reservation Lifecycle Integration', () => {
      it('should reserve stock when creating a draft material issue', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          created_by: TEST_IDS.user,
          entry_type: StockEntryType.MATERIAL_ISSUE,
          entry_date: '2024-01-01',
          from_warehouse_id: 'wh1',
          status: StockEntryStatus.DRAFT,
          items: [{ item_id: 'item1', quantity: 10, unit: 'kg', variant_id: 'variant1' }],
        } as any;

        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('INSERT INTO stock_entries')) {
            return pgResult([createEntryRow(dto)]);
          }

          if (query.includes('INSERT INTO stock_entry_items')) {
            return pgResult([createItemRow(dto.items[0], { variant_id: 'variant1' })]);
          }

          return pgResult();
        });

        await service.createStockEntry(dto);

        expect(mockStockReservationsService.reserveStock).toHaveBeenCalledWith(
          {
            organizationId: TEST_IDS.organization,
            itemId: 'item1',
            variantId: 'variant1',
            warehouseId: 'wh1',
            quantity: 10,
            reservedBy: TEST_IDS.user,
            referenceType: 'stock_entry',
            referenceId: 'se1',
          },
          mockPgClient,
        );
      });

      it('should not reserve stock when creating a posted material receipt', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          created_by: TEST_IDS.user,
          entry_type: StockEntryType.MATERIAL_RECEIPT,
          entry_date: '2024-01-01',
          to_warehouse_id: 'wh1',
          status: StockEntryStatus.POSTED,
          items: [{ item_id: 'item1', quantity: 10, unit: 'kg', cost_per_unit: 12 }],
        } as any;

        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('INSERT INTO stock_entries')) {
            return pgResult([createEntryRow(dto)]);
          }

          if (query.includes('INSERT INTO stock_entry_items')) {
            return pgResult([createItemRow(dto.items[0])]);
          }

          if (query.includes('INSERT INTO stock_movements') || query.includes('INSERT INTO stock_valuation')) {
            return pgResult();
          }

          return pgResult();
        });

        await service.createStockEntry(dto);

        expect(mockStockReservationsService.reserveStock).not.toHaveBeenCalled();
      });

      it('should not reserve stock when creating a posted stock reconciliation', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          created_by: TEST_IDS.user,
          entry_type: StockEntryType.STOCK_RECONCILIATION,
          entry_date: '2024-01-01',
          to_warehouse_id: 'wh1',
          status: StockEntryStatus.POSTED,
          items: [
            {
              item_id: 'item1',
              quantity: 1,
              unit: 'kg',
              system_quantity: 100,
              physical_quantity: 105,
              cost_per_unit: 12,
            },
          ],
        } as any;

        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('INSERT INTO stock_entries')) {
            return pgResult([createEntryRow(dto)]);
          }

          if (query.includes('INSERT INTO stock_entry_items')) {
            return pgResult([createItemRow(dto.items[0])]);
          }

          if (query.includes('INSERT INTO stock_movements') || query.includes('INSERT INTO stock_valuation')) {
            return pgResult();
          }

          return pgResult();
        });

        await service.createStockEntry(dto);

        expect(mockStockReservationsService.reserveStock).not.toHaveBeenCalled();
      });

      it('should fulfill reservations when posting a stock entry', async () => {
        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('FROM stock_entries se')) {
            return pgResult([
              {
                id: 'se1',
                organization_id: TEST_IDS.organization,
                entry_type: StockEntryType.MATERIAL_RECEIPT,
                entry_number: 'SE-001',
                status: StockEntryStatus.DRAFT,
                to_warehouse_id: 'wh1',
                stock_entry_items: [],
              },
            ]);
          }

          if (query.includes('SELECT id, name, is_active FROM warehouses')) {
            return pgResult([{ id: 'wh1', name: 'Main Warehouse', is_active: true }]);
          }

          if (query.includes('UPDATE stock_entries') || query.includes('organization_users')) {
            return pgResult();
          }

          return pgResult();
        });

        await service.postStockEntry('se1', TEST_IDS.organization, TEST_IDS.user);

        expect(mockStockReservationsService.fulfillReservationsForReference).toHaveBeenCalledWith(
          'stock_entry',
          'se1',
          TEST_IDS.organization,
          mockPgClient,
        );
      });

      it('should release reservations when cancelling a stock entry', async () => {
        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('SELECT id, status FROM stock_entries') && query.includes('FOR UPDATE')) {
            return pgResult([{ id: 'se1', status: StockEntryStatus.DRAFT }]);
          }

          if (query.includes('UPDATE stock_entries')) {
            return pgResult([{ id: 'se1', status: StockEntryStatus.CANCELLED }]);
          }

          return pgResult();
        });

        await service.cancelStockEntry('se1', TEST_IDS.organization, TEST_IDS.user);

        expect(mockStockReservationsService.releaseReservationsForReference).toHaveBeenCalledWith(
          'stock_entry',
          'se1',
          TEST_IDS.organization,
          mockPgClient,
        );
      });

      it('should release reservations when deleting a draft stock entry', async () => {
        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('SELECT id, status FROM stock_entries')) {
            return pgResult([{ id: 'se1', status: StockEntryStatus.DRAFT }]);
          }

          if (
            query.includes('DELETE FROM stock_entry_items') ||
            query.includes('DELETE FROM stock_entries')
          ) {
            return pgResult();
          }

          return pgResult();
        });

        await service.deleteStockEntry('se1', TEST_IDS.organization);

        expect(mockStockReservationsService.releaseReservationsForReference).toHaveBeenCalledWith(
          'stock_entry',
          'se1',
          TEST_IDS.organization,
          mockPgClient,
        );
      });

      it('should block posting a material issue for an expired batch', async () => {
        const dto = {
          organization_id: TEST_IDS.organization,
          created_by: TEST_IDS.user,
          entry_type: StockEntryType.MATERIAL_ISSUE,
          entry_date: '2024-01-01',
          from_warehouse_id: 'wh1',
          status: StockEntryStatus.POSTED,
          items: [{ item_id: 'item1', quantity: 2, unit: 'kg', batch_number: 'EXPIRED-1' }],
        } as any;

        mockPgClient.query = createPgQueryMock((query: string) => {
          if (query.includes('INSERT INTO stock_entries')) {
            return pgResult([createEntryRow(dto)]);
          }

          if (query.includes('INSERT INTO stock_entry_items')) {
            return pgResult([createItemRow(dto.items[0], { batch_number: 'EXPIRED-1' })]);
          }

          if (query.includes('SELECT id FROM stock_movements')) {
            return pgResult([{ id: 'sm1' }]);
          }

          if (query.includes('SELECT COALESCE(SUM(quantity), 0) as balance')) {
            return pgResult([{ balance: '10' }]);
          }

          if (query.includes('SELECT COALESCE(SUM(quantity), 0) as reserved')) {
            return pgResult([{ reserved: '0' }]);
          }

          if (query.includes('SELECT sei.expiry_date')) {
            return pgResult([{ expiry_date: '2024-01-01' }]);
          }

          return pgResult();
        });

        await expect(service.createStockEntry(dto)).rejects.toThrow(BadRequestException);
        await expect(service.createStockEntry(dto)).rejects.toThrow('Cannot issue expired batch EXPIRED-1');
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
        queryBuilder.order.mockReturnValue(queryBuilder);
        setThenableResult(queryBuilder, mockQueryResult(mockBalances));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getOpeningStockBalances(TEST_IDS.organization);

        expect(result).toEqual(mockBalances);
      });

      it('should filter balances by item_id', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        setThenableResult(queryBuilder, mockQueryResult([]));
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
        queryBuilder.order.mockReturnValue(queryBuilder);
        setThenableResult(queryBuilder, mockQueryResult([]));
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
        queryBuilder.order.mockReturnValue(queryBuilder);
        setThenableResult(queryBuilder, mockQueryResult(mockMappings));
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
