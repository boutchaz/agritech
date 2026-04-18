import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS, TEST_DATES } from '../../../test/helpers/test-utils';

describe('WorkersService', () => {
  let service: WorkersService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const MOCK_WORKERS = [
    {
      id: 'worker-1',
      first_name: 'Ahmed',
      last_name: 'Benali',
      worker_type: 'permanent',
      monthly_salary: 5000,
      daily_rate: null,
      payment_frequency: 'monthly',
      is_active: true,
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      organizations: { name: 'Test Farm Co' },
      farms: { name: 'Main Farm' },
    },
    {
      id: 'worker-2',
      first_name: 'Fatima',
      last_name: 'Zahra',
      worker_type: 'seasonal',
      monthly_salary: null,
      daily_rate: 200,
      payment_frequency: 'daily',
      is_active: true,
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      organizations: { name: 'Test Farm Co' },
      farms: { name: 'Main Farm' },
    },
    {
      id: 'worker-3',
      first_name: 'Mohammed',
      last_name: 'Amrani',
      worker_type: 'metayage',
      metayage_type: 'percentage',
      metayage_percentage: 50,
      calculation_basis: 'revenue',
      is_active: true,
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      organizations: { name: 'Test Farm Co' },
      farms: { name: 'Main Farm' },
    },
  ];

  const WORKER_TYPES = ['permanent', 'seasonal', 'metayage', 'contractor'];

  const PAYMENT_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly'];

  const METAYAGE_TYPES = ['percentage', 'fixed_share', 'tiered'];

  const INVALID_IDS = ['', '   ', '\t\n', 'invalid-uuid', null, undefined];

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkersService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
        { provide: NotificationsService, useValue: { sendNotification: jest.fn(), createNotification: jest.fn() } },
        { provide: AccountingAutomationService, useValue: { createJournalEntryFromRevenue: jest.fn() } },
      ],
    }).compile();

    service = module.get<WorkersService>(WorkersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function setupOrganizationAccess(shouldHaveAccess: boolean = true) {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.maybeSingle.mockResolvedValue(
      shouldHaveAccess
        ? mockQueryResult({ organization_id: TEST_IDS.organization })
        : mockQueryResult(null, null)
    );
    mockClient.from.mockReturnValue(queryBuilder);
    return queryBuilder;
  }

  function setupWorkerQuery(worker: any, shouldExist: boolean = true) {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.order.mockReturnValue(queryBuilder);
    queryBuilder.single.mockReturnValue(queryBuilder);
    queryBuilder.maybeSingle.mockResolvedValue(
      shouldExist ? mockQueryResult(worker) : mockQueryResult(null, null)
    );
    queryBuilder.insert.mockReturnValue(queryBuilder);
    queryBuilder.update.mockReturnValue(queryBuilder);
    queryBuilder.delete.mockReturnValue(queryBuilder);
    mockClient.from.mockReturnValue(queryBuilder);
    return queryBuilder;
  }

  // ============================================================
  // PARAMETERIZED TESTS - WORKER TYPES
  // ============================================================

  describe('findAll with different worker types (Parameterized)', () => {
    it.each(WORKER_TYPES)(
      'should return workers filtered by type: %s',
      async (workerType) => {
        setupOrganizationAccess();

        const filteredWorkers = MOCK_WORKERS.filter(
          (w) => w.worker_type === workerType || workerType === 'all'
        );

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(filteredWorkers));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result).toBeDefined();
        expect(mockClient.from).toHaveBeenCalledWith('workers');
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('findAll', () => {
      it.each(INVALID_IDS)(
        'should handle invalid organization ID: %s',
        async (orgId) => {
          setupOrganizationAccess(false);

          await expect(
            service.findAll(TEST_IDS.user, orgId as any)
          ).rejects.toThrow(ForbiddenException);
        }
      );

      it('should handle null workers response', async () => {
        setupOrganizationAccess();

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(null));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result).toEqual([]);
      });

      it('should handle database error on workers query', async () => {
        setupOrganizationAccess();

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(
          mockQueryResult(null, { message: 'Database connection failed' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.findAll(TEST_IDS.user, TEST_IDS.organization)
        ).rejects.toThrow('Failed to fetch workers');
      });
    });

    describe('findOne', () => {
      it.each(INVALID_IDS)(
        'should handle invalid worker ID: %s',
        async (workerId) => {
          setupOrganizationAccess();

          await expect(
            service.findOne(
              TEST_IDS.user,
              TEST_IDS.organization,
              workerId as any
            )
          ).rejects.toThrow();
        }
      );

      it('should throw NotFoundException for non-existent worker', async () => {
        setupOrganizationAccess();

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null, null));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.findOne(TEST_IDS.user, TEST_IDS.organization, 'non-existent')
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.findOne(TEST_IDS.user, TEST_IDS.organization, 'non-existent')
        ).rejects.toThrow('Worker not found');
      });
    });

    describe('create', () => {
      it('should sanitize empty strings to null', async () => {
        setupOrganizationAccess();

        const createDto = {
          first_name: 'Test',
          last_name: 'Worker',
          email: '',
          phone: '',
          address: '',
          cin: '',
          position: '',
          date_of_birth: '',
          cnss_number: '',
          bank_account: '',
          payment_method: '',
          notes: '',
          monthly_salary: 0,
          daily_rate: 0,
          metayage_type: '',
          metayage_percentage: 0,
          calculation_basis: '',
          payment_frequency: '',
          metayage_contract_details: '',
          specialties: '',
          certifications: '',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'new-worker',
            ...createDto,
            organization_id: TEST_IDS.organization,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto as any
        );

        expect(result).toBeDefined();
        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            organization_id: TEST_IDS.organization,
            created_by: TEST_IDS.user,
            email: null,
            phone: null,
          })
        );
      });

      it.each([null, undefined, '', '   '])(
        'should handle invalid first_name: %s',
        async (firstName) => {
          setupOrganizationAccess();

          const createDto = {
            first_name: firstName,
            last_name: 'Worker',
          };

          await expect(
            service.create(TEST_IDS.user, TEST_IDS.organization, createDto as any)
          ).rejects.toThrow();
        }
      );
    });

    describe('update', () => {
      it.each(['monthly_salary', 'daily_rate', 'metayage_percentage'])(
        'should sanitize %s to null when 0',
        async (field) => {
          setupOrganizationAccess();

          const queryBuilder = createMockQueryBuilder();
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.maybeSingle.mockResolvedValue(
            mockQueryResult({ id: TEST_IDS.worker })
          );
          queryBuilder.update.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult({ id: TEST_IDS.worker, [field]: 0 })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          const updateDto = { [field]: 0 };
          const result = await service.update(
            TEST_IDS.user,
            TEST_IDS.organization,
            TEST_IDS.worker,
            updateDto
          );

          expect(result).toBeDefined();
        }
      );

      it('should throw NotFoundException for non-existent worker', async () => {
        setupOrganizationAccess();

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null, null));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update(
            TEST_IDS.user,
            TEST_IDS.organization,
            'non-existent',
            { first_name: 'Updated' }
          )
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deactivate', () => {
      it('should use provided end_date', async () => {
        setupOrganizationAccess();

        const endDate = '2024-12-31';

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({ id: TEST_IDS.worker })
        );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.worker,
            is_active: false,
            end_date: endDate,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.deactivate(
          TEST_IDS.user,
          TEST_IDS.organization,
          TEST_IDS.worker,
          endDate
        );

        expect(result).toBeDefined();
        expect(queryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            is_active: false,
            end_date: endDate,
          })
        );
      });

      it('should default to today when end_date not provided', async () => {
        setupOrganizationAccess();

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({ id: TEST_IDS.worker })
        );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.worker,
            is_active: false,
            end_date: TEST_DATES.today,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.deactivate(
          TEST_IDS.user,
          TEST_IDS.organization,
          TEST_IDS.worker
        );

        expect(result).toBeDefined();
      });
    });

    describe('remove', () => {
      it('should throw NotFoundException for non-existent worker', async () => {
        setupOrganizationAccess();

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null, null));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.remove(TEST_IDS.user, TEST_IDS.organization, 'non-existent')
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Worker CRUD', () => {
    describe('findAll', () => {
      it('should return all workers with organization and farm names', async () => {
        setupOrganizationAccess();

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_WORKERS));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result).toHaveLength(3);
        expect(result[0]).toHaveProperty('organization_name');
        expect(result[0]).toHaveProperty('farm_name');
        expect(result[0].organization_name).toBe('Test Farm Co');
        expect(result[0].farm_name).toBe('Main Farm');
      });

      it('should filter by farm_id when provided', async () => {
        setupOrganizationAccess();

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([MOCK_WORKERS[0]]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(
          TEST_IDS.user,
          TEST_IDS.organization,
          TEST_IDS.farm
        );

        expect(queryBuilder.eq).toHaveBeenCalledWith('farm_id', TEST_IDS.farm);
        expect(result).toBeDefined();
      });

      it('should order workers by last_name ascending', async () => {
        setupOrganizationAccess();

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_WORKERS));
        mockClient.from.mockReturnValue(queryBuilder);

        await service.findAll(TEST_IDS.user, TEST_IDS.organization);

        expect(queryBuilder.order).toHaveBeenCalledWith('last_name', {
          ascending: true,
        });
      });
    });

    describe('findActive', () => {
      it('should return only active workers', async () => {
        setupOrganizationAccess();

        const activeWorkers = MOCK_WORKERS.filter((w) => w.is_active);

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(activeWorkers));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findActive(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
        expect(result).toBeDefined();
      });
    });

    describe('getStats', () => {
      it('should calculate total paid across work records and payments', async () => {
        setupOrganizationAccess();

        const mockWorker = MOCK_WORKERS[0];
        const mockWorkRecords = [
          { amount_paid: 500, payment_status: 'paid' },
          { amount_paid: 300, payment_status: 'paid' },
          { amount_paid: 200, payment_status: 'pending' },
        ];
        const mockPaymentRecords = [
          { net_amount: 1000, status: 'paid' },
          { base_amount: 500, status: 'pending' },
        ];

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(mockWorker));
        mockClient.from.mockReturnValue(queryBuilder);

        // Mock work records query
        const workRecordsQueryBuilder = createMockQueryBuilder();
        workRecordsQueryBuilder.select.mockReturnValue(workRecordsQueryBuilder);
        workRecordsQueryBuilder.eq.mockReturnValue(workRecordsQueryBuilder);
        workRecordsQueryBuilder.then.mockResolvedValue(
          mockQueryResult(mockWorkRecords)
        );
        mockClient.from.mockImplementation((table: string) => {
          if (table === 'workers') return queryBuilder;
          if (table === 'work_records') return workRecordsQueryBuilder;
          return createMockQueryBuilder();
        });

        // Mock payment records query
        const paymentRecordsQueryBuilder = createMockQueryBuilder();
        paymentRecordsQueryBuilder.select.mockReturnValue(paymentRecordsQueryBuilder);
        paymentRecordsQueryBuilder.eq.mockReturnValue(paymentRecordsQueryBuilder);
        paymentRecordsQueryBuilder.then.mockResolvedValue(
          mockQueryResult(mockPaymentRecords)
        );

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) return queryBuilder; // workers
          if (queryCallCount === 2) return workRecordsQueryBuilder; // work_records
          return paymentRecordsQueryBuilder; // payment_records
        });

        const result = await service.getStats(
          TEST_IDS.user,
          TEST_IDS.organization,
          mockWorker.id
        );

        expect(result).toBeDefined();
        expect(result.worker).toEqual(mockWorker);
      });

      it('should include metayage settlements for metayage workers', async () => {
        setupOrganizationAccess();

        const metayageWorker = MOCK_WORKERS[2]; // metayage worker
        const mockSettlements = [
          { worker_share_amount: 5000, payment_status: 'paid' },
          { worker_share_amount: 3000, payment_status: 'pending' },
        ];

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(metayageWorker));

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) return queryBuilder; // workers
          if (queryCallCount === 2) return queryBuilder; // work_records
          if (queryCallCount === 3) return queryBuilder; // payment_records
          if (queryCallCount === 4) return queryBuilder; // metayage_settlements
          return createMockQueryBuilder();
        });

        queryBuilder.then.mockResolvedValue(
          mockQueryResult(mockSettlements)
        );

        const result = await service.getStats(
          TEST_IDS.user,
          TEST_IDS.organization,
          metayageWorker.id
        );

        expect(result).toBeDefined();
      });
    });

    describe('Work Records', () => {
      it('should create work record with worker context', async () => {
        setupOrganizationAccess();

        const workRecordData = {
          work_date: TEST_DATES.today,
          hours_worked: 8,
          amount_paid: 200,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({ id: TEST_IDS.worker })
        );
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({ id: 'work-record-1', ...workRecordData })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.createWorkRecord(
          TEST_IDS.user,
          TEST_IDS.organization,
          TEST_IDS.worker,
          workRecordData
        );

        expect(result).toBeDefined();
        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            worker_id: TEST_IDS.worker,
            created_by: TEST_IDS.user,
          })
        );
      });

      it('should filter work records by date range', async () => {
        setupOrganizationAccess();

        const startDate = TEST_DATES.lastWeek;
        const endDate = TEST_DATES.today;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.gte.mockReturnValue(queryBuilder);
        queryBuilder.lte.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([]));
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({ id: TEST_IDS.worker })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await service.getWorkRecords(
          TEST_IDS.user,
          TEST_IDS.organization,
          TEST_IDS.worker,
          startDate,
          endDate
        );

        expect(queryBuilder.gte).toHaveBeenCalledWith('work_date', startDate);
        expect(queryBuilder.lte).toHaveBeenCalledWith('work_date', endDate);
      });
    });
  });

  describe('Behavior - Métayage Operations', () => {
    it('should calculate metayage share using worker settings', async () => {
      const accessQuery = setupOrganizationAccess();
      const workerQuery = createMockQueryBuilder();
      workerQuery.eq.mockReturnValue(workerQuery);
      workerQuery.select.mockReturnValue(workerQuery);
      workerQuery.maybeSingle.mockResolvedValue(
        mockQueryResult({
          id: TEST_IDS.worker,
          metayage_percentage: 35,
          metayage_type: 'custom',
          calculation_basis: 'net_revenue',
        })
      );

      mockClient.from.mockImplementation((table) => {
        if (table === 'organization_users') {
          return accessQuery;
        }
        return workerQuery;
      });

      const result = await service.calculateMetayageShare(
        TEST_IDS.user,
        TEST_IDS.organization,
        TEST_IDS.worker,
        100000,
        30000
      );

      expect(result.share).toBe(24500);
    });

    it('should error when metayage percentage is missing', async () => {
      const accessQuery = setupOrganizationAccess();
      const workerQuery = createMockQueryBuilder();
      workerQuery.eq.mockReturnValue(workerQuery);
      workerQuery.select.mockReturnValue(workerQuery);
      workerQuery.maybeSingle.mockResolvedValue(
        mockQueryResult({
          id: TEST_IDS.worker,
          metayage_percentage: null,
          metayage_type: null,
          calculation_basis: 'gross_revenue',
        })
      );

      mockClient.from.mockImplementation((table) => {
        if (table === 'organization_users') {
          return accessQuery;
        }
        return workerQuery;
      });

      await expect(
        service.calculateMetayageShare(
          TEST_IDS.user,
          TEST_IDS.organization,
          TEST_IDS.worker,
          100000,
          30000
        )
      ).rejects.toThrow('Metayage percentage is not configured');
    });

    it('should create metayage settlement', async () => {
      setupOrganizationAccess();

      const settlementData = {
        period_start: TEST_DATES.lastWeek,
        period_end: TEST_DATES.today,
        gross_revenue: 100000,
        total_charges: 30000,
        worker_share_amount: 35000,
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ id: TEST_IDS.worker })
      );
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({ id: 'settlement-1', ...settlementData })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.createMetayageSettlement(
        TEST_IDS.user,
        TEST_IDS.organization,
        TEST_IDS.worker,
        settlementData
      );

      expect(result).toBeDefined();
      expect(queryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          worker_id: TEST_IDS.worker,
          created_by: TEST_IDS.user,
        })
      );
    });

    it('should get metayage settlements with parcel and farm info', async () => {
      setupOrganizationAccess();

      const mockSettlements = [
        {
          id: 'settlement-1',
          workers: { first_name: 'Mohammed', last_name: 'Amrani', metayage_type: 'percentage' },
          farms: { name: 'Main Farm' },
          parcels: { name: 'Parcel A' },
        },
      ];

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.then.mockResolvedValue(mockQueryResult(mockSettlements));
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ id: TEST_IDS.worker })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getMetayageSettlements(
        TEST_IDS.user,
        TEST_IDS.organization,
        TEST_IDS.worker
      );

      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('worker');
      expect(result[0]).toHaveProperty('farm_name');
      expect(result[0]).toHaveProperty('parcel_name');
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Array Handling', () => {
      it('should handle array format for organizations', async () => {
        setupOrganizationAccess();

        const workerWithArrayOrg = {
          ...MOCK_WORKERS[0],
          organizations: [{ name: 'Test Farm Co' }],
          farms: [{ name: 'Main Farm' }],
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(
          mockQueryResult([workerWithArrayOrg])
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result[0].organization_name).toBe('Test Farm Co');
        expect(result[0].farm_name).toBe('Main Farm');
      });

      it('should handle null organization/farm references', async () => {
        setupOrganizationAccess();

        const workerWithNullRefs = {
          ...MOCK_WORKERS[0],
          organizations: null,
          farms: null,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(
          mockQueryResult([workerWithNullRefs])
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result[0].organization_name).toBeUndefined();
        expect(result[0].farm_name).toBeUndefined();
      });
    });

    describe('Worker Type Specific Scenarios', () => {
      it.each([
        ['permanent', { monthly_salary: 5000, daily_rate: null }],
        ['seasonal', { monthly_salary: null, daily_rate: 200 }],
        ['metayage', { metayage_type: 'percentage', metayage_percentage: 50 }],
      ])(
        'should handle %s worker with specific fields',
        async (workerType, specificFields) => {
          setupOrganizationAccess();

          const worker = {
            first_name: 'Test',
            last_name: 'Worker',
            worker_type: workerType,
            ...specificFields,
          };

          const queryBuilder = createMockQueryBuilder();
          queryBuilder.insert.mockReturnValue(queryBuilder);
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult({
              id: 'new-worker',
              ...worker,
              organization_id: TEST_IDS.organization,
            })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          const result = await service.create(
            TEST_IDS.user,
            TEST_IDS.organization,
            worker as any
          );

          expect(result).toBeDefined();
        }
      );
    });

    describe('Organization Access', () => {
      it('should forbid access for non-organization members', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null, null));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.findAll(TEST_IDS.user, TEST_IDS.organization)
        ).rejects.toThrow(ForbiddenException);
        await expect(
          service.findAll(TEST_IDS.user, TEST_IDS.organization)
        ).rejects.toThrow('You do not have access to this organization');
      });

      it('should handle inactive organization members', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult(null, null)
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.findAll(TEST_IDS.user, TEST_IDS.organization)
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('Statistics Edge Cases', () => {
      it('should handle worker with no work records', async () => {
        setupOrganizationAccess();

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult(MOCK_WORKERS[0])
        );
        queryBuilder.then.mockResolvedValue(mockQueryResult([]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getStats(
          TEST_IDS.user,
          TEST_IDS.organization,
          MOCK_WORKERS[0].id
        );

        expect(result.totalWorkRecords).toBe(0);
        expect(result.totalPaid).toBe(0);
      });

      it('should handle null amounts in payment records', async () => {
        setupOrganizationAccess();

        const mockPayments = [
          { net_amount: null, base_amount: null, status: 'paid' },
          { net_amount: 1000, base_amount: null, status: 'paid' },
        ];

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult(MOCK_WORKERS[0])
        );

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount <= 2) return queryBuilder;
          const paymentQB = createMockQueryBuilder();
          paymentQB.eq.mockReturnValue(paymentQB);
          paymentQB.then.mockResolvedValue(mockQueryResult(mockPayments));
          return paymentQB;
        });

        const result = await service.getStats(
          TEST_IDS.user,
          TEST_IDS.organization,
          MOCK_WORKERS[0].id
        );

        expect(result).toBeDefined();
      });
    });

    describe('Update Edge Cases', () => {
      it('should handle partial updates without affecting other fields', async () => {
        setupOrganizationAccess();

        const updateDto = { first_name: 'Updated Name' };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({ id: TEST_IDS.worker })
        );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.worker,
            first_name: 'Updated Name',
            last_name: 'Original Last',
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.update(
          TEST_IDS.user,
          TEST_IDS.organization,
          TEST_IDS.worker,
          updateDto
        );

        expect(result.first_name).toBe('Updated Name');
        expect(result.last_name).toBe('Original Last');
      });
    });

    describe('Delete Operations', () => {
      it('should hard delete worker successfully', async () => {
        setupOrganizationAccess();

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({ id: TEST_IDS.worker })
        );
        queryBuilder.delete.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.remove(
          TEST_IDS.user,
          TEST_IDS.organization,
          TEST_IDS.worker
        );

        expect(result).toEqual({ message: 'Worker deleted successfully' });
        expect(queryBuilder.delete).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // PARAMETERIZED TESTS - PAYMENT SCENARIOS
  // ============================================================

  describe('Payment Scenarios (Parameterized)', () => {
    it.each(PAYMENT_FREQUENCIES)(
      'should handle worker with %s payment frequency',
      async (frequency) => {
        const worker = {
          first_name: 'Test',
          last_name: 'Worker',
          worker_type: 'permanent',
          payment_frequency: frequency,
          monthly_salary: 5000,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'new-worker',
            ...worker,
            organization_id: TEST_IDS.organization,
          })
        );
        // Set up the access check on the same query builder
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({ organization_id: TEST_IDS.organization })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          TEST_IDS.user,
          TEST_IDS.organization,
          worker as any
        );

        expect(result).toBeDefined();
      }
    );
  });

  describe('Métayage Calculations', () => {
    // Helper: set up a metayage worker mock
    function setupMetayageWorker(workerFields: Record<string, any>) {
      const accessQuery = setupOrganizationAccess();
      const workerQuery = createMockQueryBuilder();
      workerQuery.eq.mockReturnValue(workerQuery);
      workerQuery.select.mockReturnValue(workerQuery);
      workerQuery.maybeSingle.mockResolvedValue(
        mockQueryResult({ id: TEST_IDS.worker, ...workerFields }),
      );
      mockClient.from.mockImplementation((table) => {
        if (table === 'organization_users') return accessQuery;
        return workerQuery;
      });
    }

    // ── Traditional types resolve correct percentages ──────────

    it('khammass (1/5) → 20% of gross revenue', async () => {
      setupMetayageWorker({
        metayage_percentage: null,
        metayage_type: 'khammass',
        calculation_basis: 'gross_revenue',
      });
      const result = await service.calculateMetayageShare(
        TEST_IDS.user, TEST_IDS.organization, TEST_IDS.worker, 100000, 30000,
      );
      // 20% of 100,000 gross = 20,000
      expect(result.share).toBe(20000);
    });

    it('rebaa (1/4) → 25% of gross revenue', async () => {
      setupMetayageWorker({
        metayage_percentage: null,
        metayage_type: 'rebaa',
        calculation_basis: 'gross_revenue',
      });
      const result = await service.calculateMetayageShare(
        TEST_IDS.user, TEST_IDS.organization, TEST_IDS.worker, 100000, 30000,
      );
      // 25% of 100,000 gross = 25,000
      expect(result.share).toBe(25000);
    });

    it('tholth (1/3) → 33.33% of gross revenue', async () => {
      setupMetayageWorker({
        metayage_percentage: null,
        metayage_type: 'tholth',
        calculation_basis: 'gross_revenue',
      });
      const result = await service.calculateMetayageShare(
        TEST_IDS.user, TEST_IDS.organization, TEST_IDS.worker, 100000, 30000,
      );
      // 33.33% of 100,000 = 33,330
      expect(result.share).toBeCloseTo(33330, 0);
    });

    // ── Calculation basis: gross vs net ────────────────────────

    it('net_revenue basis deducts charges before applying percentage', async () => {
      setupMetayageWorker({
        metayage_percentage: 25,
        metayage_type: 'custom',
        calculation_basis: 'net_revenue',
      });
      const result = await service.calculateMetayageShare(
        TEST_IDS.user, TEST_IDS.organization, TEST_IDS.worker, 100000, 40000,
      );
      // net = 100,000 - 40,000 = 60,000; 25% of 60,000 = 15,000
      expect(result.share).toBe(15000);
    });

    it('gross_revenue basis ignores charges', async () => {
      setupMetayageWorker({
        metayage_percentage: 25,
        metayage_type: 'custom',
        calculation_basis: 'gross_revenue',
      });
      const result = await service.calculateMetayageShare(
        TEST_IDS.user, TEST_IDS.organization, TEST_IDS.worker, 100000, 40000,
      );
      // 25% of 100,000 gross = 25,000 (charges irrelevant)
      expect(result.share).toBe(25000);
    });

    it('defaults to gross_revenue when calculation_basis is null', async () => {
      setupMetayageWorker({
        metayage_percentage: 20,
        metayage_type: 'custom',
        calculation_basis: null,
      });
      const result = await service.calculateMetayageShare(
        TEST_IDS.user, TEST_IDS.organization, TEST_IDS.worker, 80000, 20000,
      );
      // Default = gross; 20% of 80,000 = 16,000
      expect(result.share).toBe(16000);
    });

    // ── Edge cases & validation ────────────────────────────────

    it('rejects when charges exceed gross revenue on net basis', async () => {
      setupMetayageWorker({
        metayage_percentage: 25,
        metayage_type: 'custom',
        calculation_basis: 'net_revenue',
      });
      await expect(
        service.calculateMetayageShare(
          TEST_IDS.user, TEST_IDS.organization, TEST_IDS.worker, 10000, 15000,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns 0 share when gross revenue is 0', async () => {
      setupMetayageWorker({
        metayage_percentage: 25,
        metayage_type: 'custom',
        calculation_basis: 'gross_revenue',
      });
      const result = await service.calculateMetayageShare(
        TEST_IDS.user, TEST_IDS.organization, TEST_IDS.worker, 0, 0,
      );
      expect(result.share).toBe(0);
    });

    it('worker not found throws NotFoundException', async () => {
      const accessQuery = setupOrganizationAccess();
      const workerQuery = createMockQueryBuilder();
      workerQuery.eq.mockReturnValue(workerQuery);
      workerQuery.select.mockReturnValue(workerQuery);
      workerQuery.maybeSingle.mockResolvedValue(mockQueryResult(null, null));
      mockClient.from.mockImplementation((table) => {
        if (table === 'organization_users') return accessQuery;
        return workerQuery;
      });

      await expect(
        service.calculateMetayageShare(
          TEST_IDS.user, TEST_IDS.organization, 'nonexistent', 100000,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    // ── Real-world Moroccan farm scenarios ─────────────────────

    it('olive harvest: Khammass on net revenue', async () => {
      setupMetayageWorker({
        metayage_percentage: null,
        metayage_type: 'khammass',
        calculation_basis: 'net_revenue',
      });
      // Olive season: gross 150,000 DH, charges 45,000 DH
      const result = await service.calculateMetayageShare(
        TEST_IDS.user, TEST_IDS.organization, TEST_IDS.worker, 150000, 45000,
      );
      // net = 105,000; 20% = 21,000 DH
      expect(result.share).toBe(21000);
    });

    it('citrus harvest: Rebaa on gross revenue', async () => {
      setupMetayageWorker({
        metayage_percentage: null,
        metayage_type: 'rebaa',
        calculation_basis: 'gross_revenue',
      });
      const result = await service.calculateMetayageShare(
        TEST_IDS.user, TEST_IDS.organization, TEST_IDS.worker, 200000, 60000,
      );
      // 25% of 200,000 gross = 50,000 DH
      expect(result.share).toBe(50000);
    });

    it('gross basis always gives worker more than net basis', async () => {
      setupMetayageWorker({
        metayage_percentage: 25,
        metayage_type: 'custom',
        calculation_basis: 'gross_revenue',
      });
      const grossResult = await service.calculateMetayageShare(
        TEST_IDS.user, TEST_IDS.organization, TEST_IDS.worker, 100000, 40000,
      );

      setupMetayageWorker({
        metayage_percentage: 25,
        metayage_type: 'custom',
        calculation_basis: 'net_revenue',
      });
      const netResult = await service.calculateMetayageShare(
        TEST_IDS.user, TEST_IDS.organization, TEST_IDS.worker, 100000, 40000,
      );

      expect(grossResult.share).toBeGreaterThan(netResult.share);
    });
  });
});
