import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PoolClient } from 'pg';
import { ProductApplicationsService } from './product-applications.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService, OPERATIONAL_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  setupTableMock,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';
import { CreateProductApplicationDto } from './dto/create-product-application.dto';

describe('ProductApplicationsService', () => {
  type QueryValues = unknown[] | null | undefined;
  type PgResult = { rows: unknown[] };
  type QueryHandler = (query: string, values?: QueryValues) => Promise<PgResult>;

  let service: ProductApplicationsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: {
    getAdminClient: jest.Mock;
    getPgPool: jest.Mock;
  };
  let mockPool: {
    query: jest.Mock<Promise<PgResult>, [string, QueryValues]>;
    connect: jest.Mock<Promise<PoolClient>, []>;
  };
  let mockPgClient: {
    query: jest.Mock<Promise<PgResult>, [string, QueryValues]>;
    release: jest.Mock<void, []>;
  };
  let mockNotificationsService: {
    createNotificationsForRoles: jest.Mock<Promise<void>, [string, string[], string, NotificationType, string, string | undefined, Record<string, unknown>]>;
  };
  let mockAccountingAutomationService: {
    resolveAccountId: jest.Mock<Promise<string | null>, [string, string, string]>;
    createJournalEntryFromCost: jest.Mock<Promise<unknown>, [string, string, string, number, Date, string, string, string | undefined]>;
  };

  const applicationId = '550e8400-e29b-41d4-a716-446655441001';
  const warehouseId = '550e8400-e29b-41d4-a716-446655441002';
  const stockMovementId = '550e8400-e29b-41d4-a716-446655441003';
  const productId = '550e8400-e29b-41d4-a716-446655441004';
  const dto: CreateProductApplicationDto = {
    farm_id: TEST_IDS.farm,
    parcel_id: TEST_IDS.parcel,
    product_id: productId,
    application_date: '2026-04-16',
    quantity_used: 5,
    area_treated: 2,
    cost: 250,
    currency: 'MAD',
    notes: 'Apply before irrigation',
    task_id: TEST_IDS.task,
    images: ['https://example.com/app.jpg'],
  };

  const createThenableResult = <T>(builder: MockQueryBuilder, result: T): MockQueryBuilder => {
    builder.then.mockImplementation(
      (resolve: (value: T) => void, reject?: (reason?: unknown) => void) => {
        resolve(result);
        return Promise.resolve(result).then(resolve, reject);
      },
    );
    return builder;
  };

  const configureFromMocks = (
    tableMap: Record<string, MockQueryBuilder | MockQueryBuilder[]>,
  ): void => {
    const counts = new Map<string, number>();

    mockClient.from.mockImplementation((table: string) => {
      const entry = tableMap[table];
      if (Array.isArray(entry)) {
        const index = counts.get(table) ?? 0;
        counts.set(table, index + 1);
        return entry[index] ?? entry[entry.length - 1] ?? createMockQueryBuilder();
      }

      return entry ?? createMockQueryBuilder();
    });
  };

  const createPgQueryMock = (handler: QueryHandler) =>
    jest.fn<Promise<PgResult>, [string, QueryValues]>(async (query, values) => {
      if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
        return { rows: [] };
      }

      return handler(query, values);
    });

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockPgClient = {
      query: createPgQueryMock(async () => ({ rows: [] })),
      release: jest.fn(),
    };
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: warehouseId }] }),
      connect: jest.fn(async () => mockPgClient as unknown as PoolClient),
    };
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
      getPgPool: jest.fn(() => mockPool),
    };
    mockNotificationsService = {
      createNotificationsForRoles: jest.fn().mockResolvedValue(undefined),
    };
    mockAccountingAutomationService = {
      resolveAccountId: jest.fn().mockResolvedValue('account-id'),
      createJournalEntryFromCost: jest.fn().mockResolvedValue({ id: 'journal-entry-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductApplicationsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AccountingAutomationService, useValue: mockAccountingAutomationService },
      ],
    }).compile();

    service = module.get<ProductApplicationsService>(ProductApplicationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listProductApplications', () => {
    it('returns scoped applications transformed for the API response', async () => {
      const applicationsBuilder = setupTableMock(mockClient, 'product_applications');
      applicationsBuilder.select.mockReturnValue(applicationsBuilder);
      applicationsBuilder.eq.mockReturnValue(applicationsBuilder);
      applicationsBuilder.order.mockReturnValue(applicationsBuilder);
      createThenableResult(applicationsBuilder, {
        data: [
          {
            id: applicationId,
            organization_id: TEST_IDS.organization,
            product_id: productId,
            quantity_used: 5,
            items: { item_name: 'Copper Sulfate', default_unit: 'L' },
            farms: { name: 'Main Farm' },
            parcels: { name: 'Parcel A' },
            tasks: { id: TEST_IDS.task, title: 'Spraying', status: 'done', task_type: 'treatment' },
          },
        ],
        error: null,
      });

      const result = await service.listProductApplications(TEST_IDS.user, TEST_IDS.organization);

      expect(result).toEqual({
        success: true,
        applications: [
          expect.objectContaining({
            id: applicationId,
            inventory: { name: 'Copper Sulfate', unit: 'L' },
            farm: { name: 'Main Farm' },
            parcel: { name: 'Parcel A' },
            task: {
              id: TEST_IDS.task,
              title: 'Spraying',
              status: 'done',
              task_type: 'treatment',
            },
          }),
        ],
        total: 1,
      });
      expect(applicationsBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(applicationsBuilder.order).toHaveBeenCalledWith('application_date', { ascending: false });
    });

    it('returns an empty list when the organization has no applications', async () => {
      const applicationsBuilder = setupTableMock(mockClient, 'product_applications');
      applicationsBuilder.select.mockReturnValue(applicationsBuilder);
      applicationsBuilder.eq.mockReturnValue(applicationsBuilder);
      applicationsBuilder.order.mockReturnValue(applicationsBuilder);
      createThenableResult(applicationsBuilder, { data: [], error: null });

      const result = await service.listProductApplications(TEST_IDS.user, TEST_IDS.organization);

      expect(result).toEqual({ success: true, applications: [], total: 0 });
    });

    it('throws InternalServerErrorException when listing fails', async () => {
      const applicationsBuilder = setupTableMock(mockClient, 'product_applications');
      applicationsBuilder.select.mockReturnValue(applicationsBuilder);
      applicationsBuilder.eq.mockReturnValue(applicationsBuilder);
      applicationsBuilder.order.mockReturnValue(applicationsBuilder);
      createThenableResult(applicationsBuilder, {
        data: null,
        error: { message: 'db down' },
      });

      await expect(
        service.listProductApplications(TEST_IDS.user, TEST_IDS.organization),
      ).rejects.toThrow(new InternalServerErrorException('Failed to fetch product applications'));
    });
  });

  describe('createProductApplication', () => {
    it('creates an application, deducts scoped stock, and triggers accounting', async () => {
      mockPgClient.query = createPgQueryMock(async (query, values) => {
        if (query.includes('SELECT id FROM stock_movements') && query.includes('FOR UPDATE')) {
          expect(values).toEqual([TEST_IDS.organization, productId, warehouseId, null]);
          return { rows: [{ id: 'lock-row' }] };
        }

        if (query.includes('SELECT COALESCE(SUM(quantity), 0) as balance')) {
          expect(values).toEqual([TEST_IDS.organization, productId, warehouseId, null]);
          return { rows: [{ balance: '9' }] };
        }

        if (query.includes('SELECT default_unit FROM items')) {
          expect(values).toEqual([productId, TEST_IDS.organization]);
          return { rows: [{ default_unit: 'L' }] };
        }

        if (query.includes('SELECT id, remaining_quantity, cost_per_unit') && query.includes('FROM stock_valuation')) {
          expect(values).toEqual([TEST_IDS.organization, productId, warehouseId]);
          return { rows: [{ id: 'batch-1', remaining_quantity: '9', cost_per_unit: '20' }] };
        }

        if (query.includes('UPDATE stock_valuation')) {
          expect(values).toEqual([5, 'batch-1']);
          return { rows: [] };
        }

        if (query.includes('INSERT INTO stock_movements')) {
          expect(values).toEqual([
            TEST_IDS.organization,
            productId,
            warehouseId,
            'OUT',
            dto.application_date,
            -5,
            'L',
            -5,
            20,
            -100,
            'ProductApplication',
            null,
            dto.notes,
          ]);
          return { rows: [{ id: stockMovementId }] };
        }

        if (query.includes('INSERT INTO product_applications')) {
          expect(values).toEqual([
            TEST_IDS.organization,
            dto.farm_id,
            dto.parcel_id,
            dto.product_id,
            dto.application_date,
            dto.quantity_used,
            dto.area_treated,
            dto.cost,
            dto.currency,
            dto.notes,
            dto.task_id,
            dto.images,
          ]);
          return {
            rows: [
              {
                id: applicationId,
                organization_id: TEST_IDS.organization,
                quantity_used: dto.quantity_used,
                product_id: dto.product_id,
              },
            ],
          };
        }

        if (query.includes('UPDATE stock_movements') && query.includes('SET reference_id = $1')) {
          expect(values).toEqual([applicationId, stockMovementId]);
          return { rows: [] };
        }

        throw new Error(`Unexpected query: ${query}`);
      });
      mockPool.connect.mockResolvedValue(mockPgClient as unknown as PoolClient);

      const result = await service.createProductApplication(
        TEST_IDS.user,
        TEST_IDS.organization,
        dto,
      );

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE organization_id = $1'), [
        TEST_IDS.organization,
      ]);
      expect(result).toEqual({
        success: true,
        application: expect.objectContaining({
          id: applicationId,
          stock_movement_id: stockMovementId,
        }),
      });
      expect(mockAccountingAutomationService.resolveAccountId).toHaveBeenNthCalledWith(
        1,
        TEST_IDS.organization,
        'cost_type',
        'materials',
      );
      expect(mockAccountingAutomationService.createJournalEntryFromCost).toHaveBeenCalledWith(
        TEST_IDS.organization,
        applicationId,
        'materials',
        100,
        new Date(dto.application_date),
        `Product application: ${dto.product_id}`,
        TEST_IDS.user,
        dto.parcel_id,
      );
      expect(mockNotificationsService.createNotificationsForRoles).toHaveBeenCalledWith(
        TEST_IDS.organization,
        OPERATIONAL_ROLES,
        TEST_IDS.user,
        NotificationType.PRODUCT_APPLICATION_COMPLETED,
        '🧪 Product applied: 5 L',
        dto.notes,
        {
          applicationId,
          productId: dto.product_id,
          parcelId: dto.parcel_id,
          quantity: dto.quantity_used,
        },
      );
    });

    it('throws BadRequestException when no active warehouse exists', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        service.createProductApplication(TEST_IDS.user, TEST_IDS.organization, dto),
      ).rejects.toThrow(
        new BadRequestException(
          'No active warehouse found for this organization. Please create a warehouse first.',
        ),
      );
    });

    it('throws BadRequestException when stock is insufficient', async () => {
      mockPgClient.query = createPgQueryMock(async (query) => {
        if (query.includes('SELECT id FROM stock_movements') && query.includes('FOR UPDATE')) {
          return { rows: [] };
        }

        if (query.includes('SELECT COALESCE(SUM(quantity), 0) as balance')) {
          return { rows: [{ balance: '2' }] };
        }

        throw new Error(`Unexpected query: ${query}`);
      });
      mockPool.connect.mockResolvedValue(mockPgClient as unknown as PoolClient);

      await expect(
        service.createProductApplication(TEST_IDS.user, TEST_IDS.organization, dto),
      ).rejects.toThrow(new BadRequestException('Insufficient stock: available 2, required 5'));
      expect(mockAccountingAutomationService.createJournalEntryFromCost).not.toHaveBeenCalled();
    });
  });

  describe('deleteProductApplication', () => {
    it('deletes the scoped application and reverses stock and accounting records', async () => {
      const journalEntriesBuilder = setupTableMock(mockClient, 'journal_entries');
      journalEntriesBuilder.select.mockReturnValue(journalEntriesBuilder);
      journalEntriesBuilder.eq.mockReturnValue(journalEntriesBuilder);
      createThenableResult(journalEntriesBuilder, {
        data: [{ id: 'journal-1' }],
        error: null,
      });

      mockPgClient.query = createPgQueryMock(async (query, values) => {
        if (query.includes('SELECT * FROM product_applications')) {
          expect(values).toEqual([applicationId, TEST_IDS.organization]);
          return { rows: [{ id: applicationId, product_id: productId, quantity_used: 5 }] };
        }

        if (query.includes('SELECT * FROM stock_movements')) {
          expect(values).toEqual([applicationId, TEST_IDS.organization]);
          return { rows: [{ id: stockMovementId, warehouse_id: warehouseId }] };
        }

        if (query.includes('SELECT id FROM stock_valuation')) {
          expect(values).toEqual([TEST_IDS.organization, productId, warehouseId]);
          return { rows: [{ id: 'valuation-1' }] };
        }

        if (query.includes('UPDATE stock_valuation')) {
          expect(values).toEqual([5, 'valuation-1']);
          return { rows: [] };
        }

        if (query.includes('DELETE FROM stock_movements WHERE id = $1')) {
          expect(values).toEqual([stockMovementId]);
          return { rows: [] };
        }

        if (query.includes('DELETE FROM journal_entry_items WHERE journal_entry_id = $1')) {
          expect(values).toEqual(['journal-1']);
          return { rows: [] };
        }

        if (query.includes('DELETE FROM journal_entries WHERE id = $1')) {
          expect(values).toEqual(['journal-1']);
          return { rows: [] };
        }

        if (query.includes('DELETE FROM product_applications WHERE id = $1')) {
          expect(values).toEqual([applicationId]);
          return { rows: [] };
        }

        throw new Error(`Unexpected query: ${query}`);
      });
      mockPool.connect.mockResolvedValue(mockPgClient as unknown as PoolClient);

      const result = await service.deleteProductApplication(
        TEST_IDS.user,
        TEST_IDS.organization,
        applicationId,
      );

      expect(result).toEqual({
        success: true,
        message: 'Product application deleted successfully',
      });
      expect(journalEntriesBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(journalEntriesBuilder.eq).toHaveBeenCalledWith('reference_id', applicationId);
    });

    it('throws NotFoundException when the scoped application does not exist', async () => {
      mockPgClient.query = createPgQueryMock(async (query) => {
        if (query.includes('SELECT * FROM product_applications')) {
          return { rows: [] };
        }

        throw new Error(`Unexpected query: ${query}`);
      });
      mockPool.connect.mockResolvedValue(mockPgClient as unknown as PoolClient);

      await expect(
        service.deleteProductApplication(TEST_IDS.user, TEST_IDS.organization, applicationId),
      ).rejects.toThrow(new NotFoundException('Product application not found'));
    });
  });

  describe('getAvailableProducts', () => {
    it('returns organization-scoped aggregated product availability with variants', async () => {
      const stockBuilder = setupTableMock(mockClient, 'stock_valuation');
      stockBuilder.select.mockReturnValue(stockBuilder);
      stockBuilder.eq.mockReturnValue(stockBuilder);
      stockBuilder.gt.mockReturnValue(stockBuilder);
      createThenableResult(stockBuilder, {
        data: [
          { item_id: productId, variant_id: 'variant-1', remaining_quantity: '2.5' },
          { item_id: productId, variant_id: null, remaining_quantity: '1.5' },
        ],
        error: null,
      });

      const itemsBuilder = setupTableMock(mockClient, 'items');
      itemsBuilder.select.mockReturnValue(itemsBuilder);
      itemsBuilder.in.mockReturnValue(itemsBuilder);
      itemsBuilder.eq.mockReturnValue(itemsBuilder);
      createThenableResult(itemsBuilder, {
        data: [{ id: productId, item_name: 'Copper Sulfate', default_unit: 'L' }],
        error: null,
      });

      const variantsBuilder = setupTableMock(mockClient, 'product_variants');
      variantsBuilder.select.mockReturnValue(variantsBuilder);
      variantsBuilder.in.mockReturnValue(variantsBuilder);
      variantsBuilder.eq.mockReturnValue(variantsBuilder);
      createThenableResult(variantsBuilder, {
        data: [
          {
            id: 'variant-1',
            item_id: productId,
            variant_name: '5L Drum',
            work_units: { code: 'drum' },
          },
        ],
        error: null,
      });

      configureFromMocks({
        stock_valuation: stockBuilder,
        items: itemsBuilder,
        product_variants: variantsBuilder,
      });

      const result = await service.getAvailableProducts(TEST_IDS.user, TEST_IDS.organization);

      expect(result).toEqual({
        success: true,
        products: [
          {
            id: productId,
            name: 'Copper Sulfate',
            quantity: 4,
            unit: 'L',
            variants: [
              {
                id: 'variant-1',
                name: '5L Drum',
                quantity: 2.5,
                unit: 'drum',
              },
            ],
          },
        ],
        total: 1,
      });
      expect(stockBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(stockBuilder.gt).toHaveBeenCalledWith('remaining_quantity', 0);
    });

    it('returns an empty list when no stock is available', async () => {
      const stockBuilder = setupTableMock(mockClient, 'stock_valuation');
      stockBuilder.select.mockReturnValue(stockBuilder);
      stockBuilder.eq.mockReturnValue(stockBuilder);
      stockBuilder.gt.mockReturnValue(stockBuilder);
      createThenableResult(stockBuilder, { data: [], error: null });

      configureFromMocks({ stock_valuation: stockBuilder });

      const result = await service.getAvailableProducts(TEST_IDS.user, TEST_IDS.organization);

      expect(result).toEqual({ success: true, products: [], total: 0 });
    });

    it('throws InternalServerErrorException when stock lookup fails', async () => {
      const stockBuilder = setupTableMock(mockClient, 'stock_valuation');
      stockBuilder.select.mockReturnValue(stockBuilder);
      stockBuilder.eq.mockReturnValue(stockBuilder);
      stockBuilder.gt.mockReturnValue(stockBuilder);
      createThenableResult(stockBuilder, {
        data: null,
        error: { message: 'valuation failed' },
      });

      configureFromMocks({ stock_valuation: stockBuilder });

      await expect(
        service.getAvailableProducts(TEST_IDS.user, TEST_IDS.organization),
      ).rejects.toThrow(new InternalServerErrorException('Failed to fetch available products'));
    });
  });
});
