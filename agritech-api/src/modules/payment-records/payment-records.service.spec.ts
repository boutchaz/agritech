import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentRecordsService } from './payment-records.service';
import { DatabaseService } from '../database/database.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('PaymentRecordsService', () => {
  let service: PaymentRecordsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };
  let mockAccountingService: Partial<AccountingAutomationService>;
  let mockNotificationsService: Partial<NotificationsService>;

  const MOCK_PAYMENTS = [
    {
      id: TEST_IDS.payment,
      organization_id: TEST_IDS.organization,
      worker_id: TEST_IDS.worker,
      payment_type: 'salary',
      status: 'draft',
      base_amount: 5000,
      bonuses: 500,
      deductions: 200,
      overtime_amount: 0,
      advance_deduction: 0,
      net_amount: 5300,
      period_start: '2024-06-01',
      period_end: '2024-06-30',
      created_at: '2024-07-01',
    },
    {
      id: 'pay-2',
      organization_id: TEST_IDS.organization,
      worker_id: 'worker-2',
      payment_type: 'daily_wage',
      status: 'approved',
      base_amount: 3000,
      bonuses: 0,
      deductions: 0,
      overtime_amount: 100,
      advance_deduction: 0,
      net_amount: 3100,
      period_start: '2024-06-01',
      period_end: '2024-06-30',
      created_at: '2024-07-01',
    },
  ];

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };
    mockAccountingService = {
      createJournalEntry: jest.fn().mockResolvedValue(undefined),
    };
    mockNotificationsService = {
      createNotificationsForUsers: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentRecordsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: AccountingAutomationService, useValue: mockAccountingService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<PaymentRecordsService>(PaymentRecordsService);
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
  // computeNetAmount (static)
  // ============================================================

  describe('computeNetAmount', () => {
    it('should compute net amount correctly', () => {
      const result = PaymentRecordsService.computeNetAmount({
        base_amount: 5000,
        bonuses: 500,
        deductions: 200,
        overtime_amount: 100,
        advance_deduction: 50,
      });
      expect(result).toBe(5350);
    });

    it('should handle missing fields', () => {
      const result = PaymentRecordsService.computeNetAmount({ base_amount: 1000 });
      expect(result).toBe(1000);
    });
  });

  // ============================================================
  // getAll — uses paginate() helper with 'payment_summary' view
  // ============================================================

  describe('getAll', () => {
    it('should return PaginatedResponse shape', async () => {
      setupPaginateMock(MOCK_PAYMENTS, 2);

      const result = await service.getAll(TEST_IDS.organization);

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

      const result = await service.getAll(TEST_IDS.organization);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should throw on database error', async () => {
      setupPaginateMock(null as any, 0, { message: 'DB failure' });

      await expect(service.getAll(TEST_IDS.organization)).rejects.toThrow(
        'Failed to fetch payment_summary',
      );
    });

    it('should apply status filter', async () => {
      const { countBuilder } = setupPaginateMock([MOCK_PAYMENTS[0]], 1);

      await service.getAll(TEST_IDS.organization, { status: 'draft' });

      expect(countBuilder.in).toHaveBeenCalledWith('status', ['draft']);
    });

    it('should apply payment_type filter', async () => {
      const { countBuilder } = setupPaginateMock([MOCK_PAYMENTS[0]], 1);

      await service.getAll(TEST_IDS.organization, { payment_type: 'salary' });

      expect(countBuilder.in).toHaveBeenCalledWith('payment_type', ['salary']);
    });

    it('should apply worker_id filter', async () => {
      const { countBuilder } = setupPaginateMock([MOCK_PAYMENTS[0]], 1);

      await service.getAll(TEST_IDS.organization, { worker_id: TEST_IDS.worker });

      expect(countBuilder.eq).toHaveBeenCalledWith('worker_id', TEST_IDS.worker);
    });

    it('should apply farm_id filter', async () => {
      const { countBuilder } = setupPaginateMock([MOCK_PAYMENTS[0]], 1);

      await service.getAll(TEST_IDS.organization, { farm_id: TEST_IDS.farm });

      expect(countBuilder.eq).toHaveBeenCalledWith('farm_id', TEST_IDS.farm);
    });

    it('should apply period_start filter', async () => {
      const { countBuilder } = setupPaginateMock(MOCK_PAYMENTS, 2);

      await service.getAll(TEST_IDS.organization, { period_start: '2024-06-01' });

      expect(countBuilder.gte).toHaveBeenCalledWith('period_start', '2024-06-01');
    });

    it('should filter by organization_id', async () => {
      const { countBuilder } = setupPaginateMock(MOCK_PAYMENTS, 2);

      await service.getAll(TEST_IDS.organization);

      expect(countBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
    });
  });

  // ============================================================
  // getById
  // ============================================================

  describe('getById', () => {
    it('should return a single payment with deductions and bonuses', async () => {
      // payment_summary query
      const paymentBuilder = createMockQueryBuilder();
      paymentBuilder.single.mockResolvedValue(mockQueryResult(MOCK_PAYMENTS[0]));

      // payment_deductions query
      const deductionsBuilder = createMockQueryBuilder();
      deductionsBuilder.then.mockImplementation((resolve) => {
        const result = { data: [{ id: 'ded-1', amount: 200 }], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      // payment_bonuses query
      const bonusesBuilder = createMockQueryBuilder();
      bonusesBuilder.then.mockImplementation((resolve) => {
        const result = { data: [{ id: 'bon-1', amount: 500 }], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'payment_summary') return paymentBuilder;
        if (table === 'payment_deductions') return deductionsBuilder;
        if (table === 'payment_bonuses') return bonusesBuilder;
        return createMockQueryBuilder();
      });

      const result = await service.getById(TEST_IDS.organization, TEST_IDS.payment);

      expect(result).toHaveProperty('id', TEST_IDS.payment);
      expect(result).toHaveProperty('deductions_list');
      expect(result).toHaveProperty('bonuses_list');
      expect(result.deductions_list).toHaveLength(1);
      expect(result.bonuses_list).toHaveLength(1);
    });

    it('should throw NotFoundException when payment not found', async () => {
      const paymentBuilder = createMockQueryBuilder();
      paymentBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'Not found' }),
      );
      mockClient.from.mockReturnValue(paymentBuilder);

      await expect(service.getById(TEST_IDS.organization, 'non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
