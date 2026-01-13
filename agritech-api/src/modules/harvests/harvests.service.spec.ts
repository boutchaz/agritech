import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { HarvestsService } from './harvests.service';
import { DatabaseService } from '../database/database.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import { ReceptionBatchesService } from '../reception-batches/reception-batches.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';
import { SortDirection } from '../../common/dto/paginated-query.dto';

describe('HarvestsService', () => {
  let service: HarvestsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };
  let mockAccountingService: { createJournalEntryFromCost: jest.Mock };
  let mockReceptionBatchesService: { create: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const MOCK_HARVESTS = [
    {
      id: 'harvest-1',
      organization_id: TEST_IDS.organization,
      farm_id: 'farm-1',
      parcel_id: 'parcel-1',
      crop_id: 'crop-1',
      harvest_date: '2024-06-15',
      quantity: 1000,
      unit: 'kg',
      status: 'stored',
      lot_number: 'LOT-2024-0001',
      is_partial: false,
      quality_grade: 'A',
      intended_for: 'market',
      created_at: '2024-06-15T00:00:00Z',
    },
    {
      id: 'harvest-2',
      organization_id: TEST_IDS.organization,
      farm_id: 'farm-1',
      parcel_id: 'parcel-1',
      crop_id: 'crop-1',
      harvest_date: '2024-06-16',
      quantity: 500,
      unit: 'kg',
      status: 'stored',
      lot_number: 'LOT-2024-0002-P',
      is_partial: true,
      quality_grade: 'B',
      intended_for: 'processing',
      created_at: '2024-06-16T00:00:00Z',
    },
  ];

  const VALID_STATUSES = ['stored', 'sold', 'spoiled', 'processed'];
  const VALID_QUALITY_GRADES = ['A', 'B', 'C', 'D'];
  const VALID_UNITS = ['kg', 'tons', 'lbs', 'boxes', 'crates'];
  const VALID_INTENDED_FOR = ['market', 'processing', 'storage', 'seed'];

  const PAYMENT_TERMS = ['CASH', 'CREDIT'];

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockAccountingService = {
      createJournalEntryFromCost: jest.fn(),
    };
    mockReceptionBatchesService = {
      create: jest.fn(),
    };

    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HarvestsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        {
          provide: AccountingAutomationService,
          useValue: mockAccountingService,
        },
        {
          provide: ReceptionBatchesService,
          useValue: mockReceptionBatchesService,
        },
      ],
    }).compile();

    service = module.get<HarvestsService>(HarvestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function setupOrganizationAccessMock(organizationId: string, userId: string, hasAccess = true) {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.maybeSingle.mockResolvedValue(
      hasAccess
        ? mockQueryResult({ organization_id: organizationId, user_id: userId })
        : mockQueryResult(null, null)
    );
    return queryBuilder;
  }

  function setupWarehouseMock(organizationId: string, exists = true) {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.limit.mockReturnValue(queryBuilder);
    queryBuilder.maybeSingle.mockResolvedValue(
      exists
        ? mockQueryResult({ id: 'warehouse-1', organization_id: organizationId })
        : mockQueryResult(null, null)
    );
    return queryBuilder;
  }

  // ============================================================
  // PARAMETERIZED TESTS - CRUD OPERATIONS
  // ============================================================

  describe('findAll (Parameterized)', () => {
    it.each(VALID_STATUSES)('should filter by status: %s', async (status) => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.in.mockReturnValue(harvestQuery);
      harvestQuery.gte.mockReturnValue(harvestQuery);
      harvestQuery.lte.mockReturnValue(harvestQuery);
      harvestQuery.order.mockReturnValue(harvestQuery);
      harvestQuery.range.mockResolvedValue(
        mockQueryResult([MOCK_HARVESTS[0]])
      );

      const countQuery = createMockQueryBuilder();
      countQuery.eq.mockReturnValue(countQuery);
      countQuery.in.mockReturnValue(countQuery);
      countQuery.gte.mockReturnValue(countQuery);
      countQuery.lte.mockReturnValue(countQuery);
      countQuery.limit.mockResolvedValue({ data: [], error: null, count: 1 });

      mockClient.from
        .mockReturnValueOnce(orgQuery)
        .mockReturnValueOnce(countQuery)
        .mockReturnValueOnce(harvestQuery);

      const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
        status: status,
      });

      expect(result.data).toBeDefined();
      expect(harvestQuery.in).toHaveBeenCalledWith('status', [status]);
    });

    it.each(VALID_UNITS)('should handle harvests with unit: %s', async (unit) => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvest = { ...MOCK_HARVESTS[0], unit: unit };

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.order.mockReturnValue(harvestQuery);
      harvestQuery.range.mockResolvedValue(mockQueryResult([harvest]));

      const countQuery = createMockQueryBuilder();
      countQuery.eq.mockReturnValue(countQuery);
      countQuery.limit.mockResolvedValue({ data: [], error: null, count: 1 });

      mockClient.from
        .mockReturnValueOnce(orgQuery)
        .mockReturnValueOnce(countQuery)
        .mockReturnValueOnce(harvestQuery);

      const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization);

      expect(result.data[0].unit).toBe(unit);
    });
  });

  describe('create (Parameterized)', () => {
    it.each(VALID_QUALITY_GRADES)(
      'should create harvest with quality_grade: %s',
      async (grade) => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const harvestWithId = {
          ...MOCK_HARVESTS[0],
          id: 'harvest-new-id',
          quality_grade: grade,
        };

        const harvestQuery = createMockQueryBuilder();
        harvestQuery.eq.mockReturnValue(harvestQuery);
        harvestQuery.like.mockReturnValue(harvestQuery);
        harvestQuery.limit.mockReturnValueOnce(harvestQuery);
        harvestQuery.limit.mockResolvedValueOnce({ data: [], error: null, count: 0 });
        harvestQuery.insert.mockReturnValue(harvestQuery);
        harvestQuery.select.mockReturnValue(harvestQuery);
        harvestQuery.single.mockResolvedValue(
          mockQueryResult(harvestWithId)
        );

        const warehouseQuery = setupWarehouseMock(TEST_IDS.organization);

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'harvest_records') return harvestQuery;
          if (table === 'warehouses') return warehouseQuery;
          return createMockQueryBuilder();
        });

        const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
          farm_id: 'farm-1',
          parcel_id: 'parcel-1',
          harvest_date: '2024-06-15',
          quantity: 1000,
          unit: 'kg',
          quality_grade: grade,
        });

        expect(result.quality_grade).toBe(grade);
      }
    );

    it.each(VALID_INTENDED_FOR)(
      'should create harvest with intended_for: %s',
      async (intendedFor) => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const harvestWithId = {
          ...MOCK_HARVESTS[0],
          id: 'harvest-new-id',
          intended_for: intendedFor,
        };

        const harvestQuery = createMockQueryBuilder();
        harvestQuery.eq.mockReturnValue(harvestQuery);
        harvestQuery.like.mockReturnValue(harvestQuery);
        harvestQuery.limit.mockReturnValueOnce(harvestQuery);
        harvestQuery.limit.mockResolvedValueOnce({ data: [], error: null, count: 0 });
        harvestQuery.insert.mockReturnValue(harvestQuery);
        harvestQuery.select.mockReturnValue(harvestQuery);
        harvestQuery.single.mockResolvedValue(
          mockQueryResult(harvestWithId)
        );

        const warehouseQuery = setupWarehouseMock(TEST_IDS.organization);

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'harvest_records') return harvestQuery;
          if (table === 'warehouses') return warehouseQuery;
          return createMockQueryBuilder();
        });

        const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
          farm_id: 'farm-1',
          parcel_id: 'parcel-1',
          harvest_date: '2024-06-15',
          quantity: 1000,
          unit: 'kg',
          intended_for: intendedFor,
        });

        expect(result.intended_for).toBe(intendedFor);
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('sellHarvest', () => {
      it('should reject selling already sold harvest', async () => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const harvestQuery = createMockQueryBuilder();
        harvestQuery.eq.mockReturnValue(harvestQuery);
        harvestQuery.maybeSingle.mockResolvedValue(
          mockQueryResult({
            ...MOCK_HARVESTS[0],
            status: 'sold', // Already sold
          })
        );

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'harvest_records') return harvestQuery;
          return createMockQueryBuilder();
        });

        await expect(
          service.sellHarvest(TEST_IDS.user, TEST_IDS.organization, 'harvest-1', {
            sale_date: '2024-06-15',
            quantity_sold: 500,
            price_per_unit: 10,
            payment_terms: 'cash' as any,
          })
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.sellHarvest(TEST_IDS.user, TEST_IDS.organization, 'harvest-1', {
            sale_date: '2024-06-15',
            quantity_sold: 500,
            price_per_unit: 10,
            payment_terms: 'cash' as any,
          })
        ).rejects.toThrow('already been sold');
      });

      it('should reject selling spoiled harvest', async () => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const harvestQuery = createMockQueryBuilder();
        harvestQuery.eq.mockReturnValue(harvestQuery);
        harvestQuery.maybeSingle.mockResolvedValue(
          mockQueryResult({
            ...MOCK_HARVESTS[0],
            status: 'spoiled',
          })
        );

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'harvest_records') return harvestQuery;
          return createMockQueryBuilder();
        });

        await expect(
          service.sellHarvest(TEST_IDS.user, TEST_IDS.organization, 'harvest-1', {
            sale_date: '2024-06-15',
            quantity_sold: 500,
            price_per_unit: 10,
            payment_terms: 'cash' as any,
          })
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.sellHarvest(TEST_IDS.user, TEST_IDS.organization, 'harvest-1', {
            sale_date: '2024-06-15',
            quantity_sold: 500,
            price_per_unit: 10,
            payment_terms: 'cash' as any,
          })
        ).rejects.toThrow('Cannot sell spoiled harvest');
      });

      it('should reject selling more than available quantity', async () => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const harvestQuery = createMockQueryBuilder();
        harvestQuery.eq.mockReturnValue(harvestQuery);
        harvestQuery.maybeSingle.mockResolvedValue(
          mockQueryResult({
            ...MOCK_HARVESTS[0],
            quantity: 500, // Only 500 available
          })
        );

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'harvest_records') return harvestQuery;
          return createMockQueryBuilder();
        });

        await expect(
          service.sellHarvest(TEST_IDS.user, TEST_IDS.organization, 'harvest-1', {
            sale_date: '2024-06-15',
            quantity_sold: 1000, // Trying to sell 1000
            price_per_unit: 10,
            payment_terms: 'cash' as any,
          })
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.sellHarvest(TEST_IDS.user, TEST_IDS.organization, 'harvest-1', {
            sale_date: '2024-06-15',
            quantity_sold: 1000,
            price_per_unit: 10,
            payment_terms: 'cash' as any,
          })
        ).rejects.toThrow('Only 500 kg available');
      });
    });

    describe('findOne', () => {
      it('should throw NotFoundException when harvest not found', async () => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const harvestQuery = createMockQueryBuilder();
        harvestQuery.eq.mockReturnValue(harvestQuery);
        harvestQuery.maybeSingle.mockResolvedValue(mockQueryResult(null, null));

        mockClient.from
          .mockReturnValueOnce(orgQuery)
          .mockReturnValueOnce(harvestQuery);

        await expect(
          service.findOne(TEST_IDS.user, TEST_IDS.organization, 'non-existent')
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('update', () => {
      it('should throw NotFoundException when updating non-existent harvest', async () => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const harvestQuery = createMockQueryBuilder();
        harvestQuery.eq.mockReturnValue(harvestQuery);
        harvestQuery.maybeSingle.mockResolvedValue(mockQueryResult(null, null));

        mockClient.from
          .mockReturnValueOnce(orgQuery)
          .mockReturnValueOnce(harvestQuery)
          .mockReturnValueOnce(harvestQuery);

        await expect(
          service.update(TEST_IDS.user, TEST_IDS.organization, 'non-existent', {
            quantity: 500,
          })
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('remove', () => {
      it('should throw NotFoundException when deleting non-existent harvest', async () => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const harvestQuery = createMockQueryBuilder();
        harvestQuery.eq.mockReturnValue(harvestQuery);
        harvestQuery.maybeSingle.mockResolvedValue(mockQueryResult(null, null));

        mockClient.from
          .mockReturnValueOnce(orgQuery)
          .mockReturnValueOnce(harvestQuery)
          .mockReturnValueOnce(harvestQuery);

        await expect(
          service.remove(TEST_IDS.user, TEST_IDS.organization, 'non-existent')
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Lot Number Generation', () => {
    it('should generate sequential lot numbers', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.like.mockReturnValue(harvestQuery);

      // First call: count existing
      harvestQuery.limit.mockReturnValueOnce(harvestQuery);
      harvestQuery.limit.mockResolvedValueOnce({ data: [], error: null, count: 5 }); // 5 existing

      // Insert
      harvestQuery.insert.mockReturnValue(harvestQuery);
      harvestQuery.select.mockReturnValue(harvestQuery);
      harvestQuery.single.mockResolvedValue(
        mockQueryResult(MOCK_HARVESTS[0])
      );

      const warehouseQuery = setupWarehouseMock(TEST_IDS.organization);

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'warehouses') return warehouseQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        farm_id: 'farm-1',
        parcel_id: 'parcel-1',
        harvest_date: '2024-06-15',
        quantity: 1000,
        unit: 'kg',
      });

      // Should generate LOT-2024-0006 (5 existing + 1)
      expect(result.lot_number).toMatch(/^LOT-2024-\d{4}$/);
    });

    it('should generate partial harvest lot numbers with -P suffix', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.like.mockReturnValue(harvestQuery);
      harvestQuery.order.mockReturnValue(harvestQuery);

      // Check for previous partials (none found)
      harvestQuery.not.mockReturnValue(harvestQuery);
      harvestQuery.maybeSingle.mockResolvedValue(mockQueryResult(null, null));

      // Count
      harvestQuery.limit.mockReturnValueOnce(harvestQuery);
      harvestQuery.limit.mockResolvedValueOnce({ data: [], error: null, count: 0 });

      // Insert
      harvestQuery.insert.mockReturnValue(harvestQuery);
      harvestQuery.select.mockReturnValue(harvestQuery);
      harvestQuery.single.mockResolvedValue(
        mockQueryResult(MOCK_HARVESTS[1])
      );

      const warehouseQuery = setupWarehouseMock(TEST_IDS.organization);

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'warehouses') return warehouseQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        farm_id: 'farm-1',
        parcel_id: 'parcel-1',
        harvest_date: '2024-06-15',
        quantity: 500,
        unit: 'kg',
        is_partial: true,
      });

      expect(result.lot_number).toMatch(/-P$/);
    });

    it('should increment partial harvest lot numbers', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.like.mockReturnValue(harvestQuery);
      harvestQuery.order.mockReturnValue(harvestQuery);
      harvestQuery.not.mockReturnValue(harvestQuery);

      // Previous partials found
      harvestQuery.maybeSingle
        .mockResolvedValueOnce(
          mockQueryResult({
            lot_number: 'LOT-2024-0003-P',
          })
        )
        .mockResolvedValueOnce(
          mockQueryResult({
            ...MOCK_HARVESTS[1],
            id: 'harvest-new',
            lot_number: 'LOT-2024-0004-P',
          })
        );

      harvestQuery.insert.mockReturnValue(harvestQuery);
      harvestQuery.select.mockReturnValue(harvestQuery);
      harvestQuery.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_HARVESTS[1],
          id: 'harvest-new',
          lot_number: 'LOT-2024-0004-P',
        })
      );

      const warehouseQuery = setupWarehouseMock(TEST_IDS.organization);

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'warehouses') return warehouseQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        farm_id: 'farm-1',
        parcel_id: 'parcel-1',
        harvest_date: '2024-06-15',
        quantity: 500,
        unit: 'kg',
        is_partial: true,
        harvest_task_id: 'task-1',
      });

      // Should be LOT-2024-0004-P (incremented from 0003)
      expect(result.lot_number).toBe('LOT-2024-0004-P');
    });
  });

  describe('Behavior - Reception Batch Auto-Creation', () => {
    it('should automatically create reception batch for new harvest', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.like.mockReturnValue(harvestQuery);
      harvestQuery.limit.mockReturnValueOnce(harvestQuery);
      harvestQuery.limit.mockResolvedValueOnce({ data: [], error: null, count: 0 });

      harvestQuery.insert.mockReturnValue(harvestQuery);
      harvestQuery.select.mockReturnValue(harvestQuery);

      // Store the created harvest to return it with the generated lot number
      let createdHarvest = null;
      harvestQuery.single.mockImplementation(() => {
        const insertCall = harvestQuery.insert.mock.calls[harvestQuery.insert.mock.calls.length - 1];
        const insertData = insertCall[0];
        createdHarvest = {
          ...MOCK_HARVESTS[0],
          id: 'harvest-new-id',
          ...insertData,
        };
        return Promise.resolve(mockQueryResult(createdHarvest));
      });

      const warehouseQuery = setupWarehouseMock(TEST_IDS.organization, true);

      mockReceptionBatchesService.create.mockResolvedValue({
        id: 'batch-1',
        lot_code: 'LOT-2024-0001',
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'warehouses') return warehouseQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        farm_id: 'farm-1',
        parcel_id: 'parcel-1',
        harvest_date: '2024-06-15',
        quantity: 1000,
        unit: 'kg',
      });

      expect(mockReceptionBatchesService.create).toHaveBeenCalledWith(
        TEST_IDS.user,
        TEST_IDS.organization,
        expect.objectContaining({
          harvest_id: result.id,
          lot_code: result.lot_number,
        })
      );
    });

    it('should handle missing reception center gracefully', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.like.mockReturnValue(harvestQuery);
      harvestQuery.limit.mockReturnValueOnce(harvestQuery);
      harvestQuery.limit.mockResolvedValueOnce({ data: [], error: null, count: 0 });
      harvestQuery.insert.mockReturnValue(harvestQuery);
      harvestQuery.select.mockReturnValue(harvestQuery);
      harvestQuery.single.mockResolvedValue(
        mockQueryResult(MOCK_HARVESTS[0])
      );

      const warehouseQuery = setupWarehouseMock(TEST_IDS.organization, false);

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'warehouses') return warehouseQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        farm_id: 'farm-1',
        parcel_id: 'parcel-1',
        harvest_date: '2024-06-15',
        quantity: 1000,
        unit: 'kg',
      });

      // Should still create harvest successfully
      expect(result.lot_number).toBeDefined();
      expect(mockReceptionBatchesService.create).not.toHaveBeenCalled();
    });

    it('should not fail harvest creation when reception batch creation fails', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.like.mockReturnValue(harvestQuery);
      harvestQuery.limit.mockReturnValueOnce(harvestQuery);
      harvestQuery.limit.mockResolvedValueOnce({ data: [], error: null, count: 0 });
      harvestQuery.insert.mockReturnValue(harvestQuery);
      harvestQuery.select.mockReturnValue(harvestQuery);
      harvestQuery.single.mockResolvedValue(
        mockQueryResult(MOCK_HARVESTS[0])
      );

      const warehouseQuery = setupWarehouseMock(TEST_IDS.organization, true);

      mockReceptionBatchesService.create.mockRejectedValue(
        new Error('Reception batch creation failed')
      );

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'warehouses') return warehouseQuery;
        return createMockQueryBuilder();
      });

      // Should not throw
      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        farm_id: 'farm-1',
        parcel_id: 'parcel-1',
        harvest_date: '2024-06-15',
        quantity: 1000,
        unit: 'kg',
      });

      expect(result.lot_number).toBeDefined();
    });
  });

  describe('Behavior - Harvest Sale with Journal Entries', () => {
    it('should create journal entry for cash sale', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.maybeSingle
        .mockResolvedValueOnce(mockQueryResult(MOCK_HARVESTS[0]))
        .mockResolvedValueOnce(
          mockQueryResult({
            id: 'journal-1',
            entry_number: 'JE-2024-00001',
            total_debit: 5000,
            total_credit: 5000,
          })
        );

      // Account mapping
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'account_mappings') {
          const mappingQuery = createMockQueryBuilder();
          mappingQuery.eq.mockReturnValue(mappingQuery);
          mappingQuery.maybeSingle.mockResolvedValue(
            mockQueryResult({
              account_id: 'revenue-acc',
              metadata: {
                ar_account_id: 'ar-acc',
                cash_account_id: 'cash-acc',
              },
            })
          );
          return mappingQuery;
        }
        if (table === 'journal_entries') {
          const jeQuery = createMockQueryBuilder();
          jeQuery.insert.mockReturnValue(jeQuery);
          jeQuery.select.mockReturnValue(jeQuery);
          jeQuery.single.mockResolvedValue(
            mockQueryResult({
              id: 'journal-1',
              entry_number: 'JE-2024-00001',
              total_debit: 5000,
              total_credit: 5000,
            })
          );
          return jeQuery;
        }
        if (table === 'journal_items') {
          const itemsQuery = createMockQueryBuilder();
          itemsQuery.insert.mockResolvedValue(mockQueryResult([]));
          return itemsQuery;
        }
        return createMockQueryBuilder();
      });

      const result = await service.sellHarvest(
        TEST_IDS.user,
        TEST_IDS.organization,
        'harvest-1',
        {
          sale_date: '2024-06-15',
          quantity_sold: 500,
          price_per_unit: 10,
          payment_terms: 'cash' as any,
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.payment_terms).toBe('cash');
    });

    it('should create journal entry for credit sale', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.maybeSingle
        .mockResolvedValueOnce(mockQueryResult(MOCK_HARVESTS[0]))
        .mockResolvedValueOnce(
          mockQueryResult({
            id: 'journal-1',
            total_debit: 5000,
            total_credit: 5000,
          })
        );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'account_mappings') {
          const mappingQuery = createMockQueryBuilder();
          mappingQuery.eq.mockReturnValue(mappingQuery);
          mappingQuery.maybeSingle.mockResolvedValue(
            mockQueryResult({
              account_id: 'revenue-acc',
              metadata: {
                ar_account_id: 'ar-acc',
                cash_account_id: 'cash-acc',
              },
            })
          );
          return mappingQuery;
        }
        if (table === 'journal_entries') {
          const jeQuery = createMockQueryBuilder();
          jeQuery.insert.mockReturnValue(jeQuery);
          jeQuery.select.mockReturnValue(jeQuery);
          jeQuery.single.mockResolvedValue(
            mockQueryResult({
              id: 'journal-1',
              total_debit: 5000,
              total_credit: 5000,
            })
          );
          return jeQuery;
        }
        if (table === 'journal_items') {
          const itemsQuery = createMockQueryBuilder();
          itemsQuery.insert.mockResolvedValue(mockQueryResult([]));
          return itemsQuery;
        }
        return createMockQueryBuilder();
      });

      const result = await service.sellHarvest(
        TEST_IDS.user,
        TEST_IDS.organization,
        'harvest-1',
        {
          sale_date: '2024-06-15',
          quantity_sold: 500,
          price_per_unit: 10,
          payment_terms: 'credit' as any,
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.payment_terms).toBe('credit');
    });

    it('should handle sale without account mapping gracefully', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.maybeSingle.mockResolvedValueOnce(mockQueryResult(MOCK_HARVESTS[0]));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'account_mappings') {
          const mappingQuery = createMockQueryBuilder();
          mappingQuery.eq.mockReturnValue(mappingQuery);
          mappingQuery.maybeSingle.mockResolvedValue(mockQueryResult(null, null)); // No mapping
          return mappingQuery;
        }
        return createMockQueryBuilder();
      });

      const result = await service.sellHarvest(
        TEST_IDS.user,
        TEST_IDS.organization,
        'harvest-1',
        {
          sale_date: '2024-06-15',
          quantity_sold: 500,
          price_per_unit: 10,
          payment_terms: 'cash' as any,
        }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('no journal entry created');
    });

    it('should validate journal entry balance', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.maybeSingle
        .mockResolvedValueOnce(mockQueryResult(MOCK_HARVESTS[0]))
        .mockResolvedValueOnce(
          mockQueryResult({
            id: 'journal-1',
            total_debit: 5000,
            total_credit: 4900, // Unbalanced!
          })
        );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'account_mappings') {
          const mappingQuery = createMockQueryBuilder();
          mappingQuery.eq.mockReturnValue(mappingQuery);
          mappingQuery.maybeSingle.mockResolvedValue(
            mockQueryResult({
              account_id: 'revenue-acc',
              metadata: {
                ar_account_id: 'ar-acc',
                cash_account_id: 'cash-acc',
              },
            })
          );
          return mappingQuery;
        }
        if (table === 'journal_entries') {
          const jeQuery = createMockQueryBuilder();
          jeQuery.insert.mockReturnValue(jeQuery);
          jeQuery.select.mockReturnValue(jeQuery);
          jeQuery.single.mockResolvedValue(
            mockQueryResult({
              id: 'journal-1',
              total_debit: 5000,
              total_credit: 4900,
            })
          );
          jeQuery.delete.mockReturnValue(jeQuery);
          return jeQuery;
        }
        if (table === 'journal_items') {
          const itemsQuery = createMockQueryBuilder();
          itemsQuery.insert.mockResolvedValue(mockQueryResult([]));
          return itemsQuery;
        }
        return createMockQueryBuilder();
      });

      // Should still succeed but indicate error
      const result = await service.sellHarvest(
        TEST_IDS.user,
        TEST_IDS.organization,
        'harvest-1',
        {
          sale_date: '2024-06-15',
          quantity_sold: 500,
          price_per_unit: 10,
          payment_terms: 'cash' as any,
        }
      );

      // Journal entry creation failed but harvest still sold
      expect(result.success).toBe(true);
      expect(result.message).toContain('journal entry creation failed');
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle harvest with zero quantity', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestWithId = {
        ...MOCK_HARVESTS[0],
        id: 'harvest-new',
        quantity: 0,
      };

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.like.mockReturnValue(harvestQuery);
      harvestQuery.limit.mockReturnValueOnce(harvestQuery);
      harvestQuery.limit.mockResolvedValueOnce({ data: [], error: null, count: 0 });
      harvestQuery.insert.mockReturnValue(harvestQuery);
      harvestQuery.select.mockReturnValue(harvestQuery);
      harvestQuery.single.mockResolvedValue(
        mockQueryResult(harvestWithId)
      );

      const warehouseQuery = setupWarehouseMock(TEST_IDS.organization);

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'warehouses') return warehouseQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        farm_id: 'farm-1',
        parcel_id: 'parcel-1',
        harvest_date: '2024-06-15',
        quantity: 0,
        unit: 'kg',
      });

      expect(result.quantity).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.order.mockReturnValue(harvestQuery);
      harvestQuery.range.mockResolvedValue(mockQueryResult(MOCK_HARVESTS));

      // Create a combined query that handles both count and data queries
      const combinedQuery = createMockQueryBuilder();
      combinedQuery.eq.mockReturnValue(combinedQuery);
      combinedQuery.select.mockReturnValue(combinedQuery);
      combinedQuery.head.mockReturnValue(combinedQuery);
      combinedQuery.order.mockReturnValue(harvestQuery);
      // The count query is awaited directly, not via limit
      // We need to make the query itself return the count
      combinedQuery.limit.mockReturnValue({ data: [], error: null, count: 25 });
      // Make the query itself promise-like for the count query
      Object.defineProperty(combinedQuery, 'then', {
        value: (resolve) => Promise.resolve({ data: [], error: null, count: 25 }).then(resolve),
        writable: false,
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return combinedQuery;
        return createMockQueryBuilder();
      });

      const result = await service.findAll(
        TEST_IDS.user,
        TEST_IDS.organization,
        {
          page: 2,
          pageSize: 10,
        }
      );

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(Math.ceil(25 / 10));
      expect(harvestQuery.range).toHaveBeenCalledWith(10, 19);
    });

    it('should handle sorting by different fields', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.order.mockReturnValue(harvestQuery);
      harvestQuery.range.mockResolvedValue(mockQueryResult(MOCK_HARVESTS));

      const countQuery = createMockQueryBuilder();
      countQuery.eq.mockReturnValue(countQuery);
      countQuery.limit.mockResolvedValue({ data: [], error: null, count: 2 });

      mockClient.from
        .mockReturnValueOnce(orgQuery)
        .mockReturnValueOnce(countQuery)
        .mockReturnValueOnce(harvestQuery);

      await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
        sortBy: 'quantity',
        sortDir: SortDirection.ASC,
      });

      expect(harvestQuery.order).toHaveBeenCalledWith('quantity', {
        ascending: true,
      });
    });

    it('should filter by date range', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.gte.mockReturnValue(harvestQuery);
      harvestQuery.lte.mockReturnValue(harvestQuery);
      harvestQuery.order.mockReturnValue(harvestQuery);
      harvestQuery.range.mockResolvedValue(mockQueryResult(MOCK_HARVESTS));

      const countQuery = createMockQueryBuilder();
      countQuery.eq.mockReturnValue(countQuery);
      countQuery.gte.mockReturnValue(countQuery);
      countQuery.lte.mockReturnValue(countQuery);
      countQuery.limit.mockResolvedValue({ data: [], error: null, count: 2 });

      mockClient.from
        .mockReturnValueOnce(orgQuery)
        .mockReturnValueOnce(countQuery)
        .mockReturnValueOnce(harvestQuery);

      await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      });

      expect(harvestQuery.gte).toHaveBeenCalledWith('harvest_date', '2024-01-01');
      expect(harvestQuery.lte).toHaveBeenCalledWith('harvest_date', '2024-12-31');
    });
  });

  // ============================================================
  // AGRICULTURAL-SPECIFIC TESTS
  // ============================================================

  describe('Agricultural Features', () => {
    it('should track harvest by crop type', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestWithId = {
        ...MOCK_HARVESTS[0],
        id: 'harvest-new-id',
        crop_id: 'tomato',
      };

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.like.mockReturnValue(harvestQuery);
      harvestQuery.limit.mockReturnValueOnce(harvestQuery);
      harvestQuery.limit.mockResolvedValueOnce({ data: [], error: null, count: 0 });
      harvestQuery.insert.mockReturnValue(harvestQuery);
      harvestQuery.select.mockReturnValue(harvestQuery);
      harvestQuery.single.mockResolvedValue(
        mockQueryResult(harvestWithId)
      );

      const warehouseQuery = setupWarehouseMock(TEST_IDS.organization);

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'warehouses') return warehouseQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        farm_id: 'farm-1',
        parcel_id: 'parcel-1',
        crop_id: 'tomato',
        harvest_date: '2024-06-15',
        quantity: 1000,
        unit: 'kg',
      });

      expect(result.crop_id).toBe('tomato');
    });

    it('should record quality metrics', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestWithId = {
        ...MOCK_HARVESTS[0],
        id: 'harvest-new-id',
        quality_grade: 'A',
        quality_score: 95,
        quality_notes: 'Excellent quality, uniform size',
      };

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.like.mockReturnValue(harvestQuery);
      harvestQuery.limit.mockReturnValueOnce(harvestQuery);
      harvestQuery.limit.mockResolvedValueOnce({ data: [], error: null, count: 0 });
      harvestQuery.insert.mockReturnValue(harvestQuery);
      harvestQuery.select.mockReturnValue(harvestQuery);
      harvestQuery.single.mockResolvedValue(
        mockQueryResult(harvestWithId)
      );

      const warehouseQuery = setupWarehouseMock(TEST_IDS.organization);

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'warehouses') return warehouseQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        farm_id: 'farm-1',
        parcel_id: 'parcel-1',
        harvest_date: '2024-06-15',
        quantity: 1000,
        unit: 'kg',
        quality_grade: 'A',
        quality_score: 95,
        quality_notes: 'Excellent quality, uniform size',
      });

      expect(result.quality_grade).toBe('A');
      expect(result.quality_score).toBe(95);
    });

    it('should link harvest to task for traceability', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestWithId = {
        ...MOCK_HARVESTS[0],
        id: 'harvest-new-id',
        harvest_task_id: 'task-123',
      };

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.like.mockReturnValue(harvestQuery);
      harvestQuery.limit.mockReturnValueOnce(harvestQuery);
      harvestQuery.limit.mockResolvedValueOnce({ data: [], error: null, count: 0 });
      harvestQuery.insert.mockReturnValue(harvestQuery);
      harvestQuery.select.mockReturnValue(harvestQuery);
      harvestQuery.single.mockResolvedValue(
        mockQueryResult(harvestWithId)
      );

      const warehouseQuery = setupWarehouseMock(TEST_IDS.organization);

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'organization_users') return orgQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'warehouses') return warehouseQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        farm_id: 'farm-1',
        parcel_id: 'parcel-1',
        harvest_date: '2024-06-15',
        quantity: 1000,
        unit: 'kg',
        harvest_task_id: 'task-123',
      });

      expect(result.harvest_task_id).toBe('task-123');
    });
  });
});
