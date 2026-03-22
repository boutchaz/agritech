import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('DeliveriesService', () => {
  let service: DeliveriesService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };
  let mockNotificationsService: Partial<NotificationsService>;

  const MOCK_DELIVERIES = [
    {
      id: 'del-1',
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      delivery_date: '2024-06-01',
      delivery_type: 'direct',
      customer_name: 'Acme Corp',
      status: 'pending',
      total_quantity: 100,
      total_amount: 5000,
    },
    {
      id: 'del-2',
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      delivery_date: '2024-06-02',
      delivery_type: 'pickup',
      customer_name: 'Store B',
      status: 'delivered',
      total_quantity: 50,
      total_amount: 2500,
    },
  ];

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };
    mockNotificationsService = {
      createNotificationsForUsers: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<DeliveriesService>(DeliveriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper: mock verifyOrganizationAccess (first .from call to organization_users)
  function setupOrgAccessMock() {
    const orgBuilder = createMockQueryBuilder();
    orgBuilder.single.mockResolvedValue(mockQueryResult({ id: 'ou-1' }));
    return orgBuilder;
  }

  // Helper for paginate() pattern: count query + data query + org access
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
      // deliveries count query, then deliveries data query
      if (fromCallCount % 2 === 0) return countBuilder;
      return dataBuilder;
    });

    return { orgBuilder, countBuilder, dataBuilder };
  }

  // ============================================================
  // getAll — uses paginate() helper (count + data)
  // ============================================================

  describe('getAll', () => {
    it('should return PaginatedResponse shape', async () => {
      setupPaginateWithAccess(MOCK_DELIVERIES, 2);

      const result = await service.getAll(TEST_IDS.user, TEST_IDS.organization);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should handle empty results', async () => {
      setupPaginateWithAccess([], 0);

      const result = await service.getAll(TEST_IDS.user, TEST_IDS.organization);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should throw on database error', async () => {
      setupPaginateWithAccess(null as any, 0, { message: 'DB failure' });

      await expect(
        service.getAll(TEST_IDS.user, TEST_IDS.organization),
      ).rejects.toThrow('Failed to fetch deliveries');
    });

    it('should apply status filter', async () => {
      const { countBuilder, dataBuilder } = setupPaginateWithAccess([MOCK_DELIVERIES[0]], 1);

      await service.getAll(TEST_IDS.user, TEST_IDS.organization, { status: 'pending' });

      // paginate uses the filters callback which calls .in for comma-separated
      expect(countBuilder.in).toHaveBeenCalledWith('status', ['pending']);
    });

    it('should apply farm_id filter', async () => {
      const { countBuilder } = setupPaginateWithAccess([MOCK_DELIVERIES[0]], 1);

      await service.getAll(TEST_IDS.user, TEST_IDS.organization, { farm_id: TEST_IDS.farm });

      expect(countBuilder.eq).toHaveBeenCalledWith('farm_id', TEST_IDS.farm);
    });

    it('should apply customer_name filter with ilike', async () => {
      const { countBuilder } = setupPaginateWithAccess([MOCK_DELIVERIES[0]], 1);

      await service.getAll(TEST_IDS.user, TEST_IDS.organization, { customer_name: 'Acme' });

      expect(countBuilder.ilike).toHaveBeenCalledWith('customer_name', '%Acme%');
    });
  });

  // ============================================================
  // getById
  // ============================================================

  describe('getById', () => {
    it('should return a single delivery with items and tracking', async () => {
      const orgBuilder = setupOrgAccessMock();

      const deliveryBuilder = createMockQueryBuilder();
      deliveryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_DELIVERIES[0]));

      const itemsBuilder = createMockQueryBuilder();
      itemsBuilder.then.mockImplementation((resolve) => {
        const result = { data: [{ id: 'di-1', quantity: 100 }], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      const trackingBuilder = createMockQueryBuilder();
      trackingBuilder.then.mockImplementation((resolve) => {
        const result = { data: [{ id: 'dt-1', status: 'in_transit' }], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        if (table === 'deliveries') return deliveryBuilder;
        if (table === 'delivery_items') return itemsBuilder;
        if (table === 'delivery_tracking') return trackingBuilder;
        return createMockQueryBuilder();
      });

      const result = await service.getById(TEST_IDS.user, TEST_IDS.organization, 'del-1');

      expect(result).toHaveProperty('id', 'del-1');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('tracking');
    });

    it('should throw NotFoundException when delivery not found', async () => {
      const orgBuilder = setupOrgAccessMock();

      const deliveryBuilder = createMockQueryBuilder();
      deliveryBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'Not found' }),
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        return deliveryBuilder;
      });

      await expect(
        service.getById(TEST_IDS.user, TEST_IDS.organization, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // create
  // ============================================================

  describe('create', () => {
    it('should insert and return a delivery', async () => {
      const orgBuilder = setupOrgAccessMock();

      const insertBuilder = createMockQueryBuilder();
      insertBuilder.insert.mockReturnValue(insertBuilder);
      insertBuilder.select.mockReturnValue(insertBuilder);
      insertBuilder.single.mockResolvedValue(
        mockQueryResult({ ...MOCK_DELIVERIES[0], id: 'del-new' }),
      );

      const itemsInsertBuilder = createMockQueryBuilder();
      itemsInsertBuilder.insert.mockReturnValue(itemsInsertBuilder);
      itemsInsertBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        if (table === 'delivery_items') return itemsInsertBuilder;
        return insertBuilder;
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        farm_id: TEST_IDS.farm,
        delivery_date: '2024-06-01',
        delivery_type: 'direct',
        customer_name: 'Acme Corp',
        items: [{ harvest_record_id: 'hr-1', quantity: 100, unit: 'kg', price_per_unit: 50 }],
      });

      expect(result).toHaveProperty('id', 'del-new');
    });
  });

  // ============================================================
  // cancel (used as delete/soft-delete equivalent)
  // ============================================================

  describe('cancel', () => {
    it('should cancel a delivery', async () => {
      const orgBuilder = setupOrgAccessMock();

      const updateBuilder = createMockQueryBuilder();
      updateBuilder.update.mockReturnValue(updateBuilder);
      updateBuilder.select.mockReturnValue(updateBuilder);
      updateBuilder.single.mockResolvedValue(
        mockQueryResult({ ...MOCK_DELIVERIES[0], status: 'cancelled' }),
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        return updateBuilder;
      });

      const result = await service.cancel(TEST_IDS.user, TEST_IDS.organization, 'del-1', 'Test reason');

      expect(result).toHaveProperty('status', 'cancelled');
    });
  });
});
