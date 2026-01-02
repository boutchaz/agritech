import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { PaymentType, PaymentStatus } from './dto';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS, TEST_DATES } from '../../../test/helpers/test-utils';
import {
  mockPayments,
  mockInvoices,
  mockAccounts,
  mockBankAccounts,
  createPaymentDto,
} from '../../../test/fixtures/accounting.fixture';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };
  let mockSequencesService: { generatePaymentNumber: jest.Mock };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };
    mockSequencesService = {
      generatePaymentNumber: jest.fn().mockResolvedValue('PAY-2024-00001'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: SequencesService, useValue: mockSequencesService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a payment with generated number', async () => {
      const dto = createPaymentDto();
      const expectedPayment = {
        id: 'new-payment-id',
        ...dto,
        payment_number: 'PAY-2024-00001',
        status: 'draft',
        organization_id: TEST_IDS.organization,
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(expectedPayment));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(
        dto as any,
        TEST_IDS.organization,
        TEST_IDS.user,
      );

      expect(result).toEqual(expectedPayment);
      expect(mockSequencesService.generatePaymentNumber).toHaveBeenCalledWith(
        TEST_IDS.organization,
      );
      expect(mockClient.from).toHaveBeenCalledWith('accounting_payments');
      expect(queryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: TEST_IDS.organization,
          payment_number: 'PAY-2024-00001',
          payment_type: dto.payment_type,
          amount: dto.amount,
          status: 'draft',
        }),
      );
    });

    it('should throw BadRequestException on database error', async () => {
      const dto = createPaymentDto();
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'Database error' }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.create(dto as any, TEST_IDS.organization, TEST_IDS.user),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    const createThenableQueryBuilder = (data: any) => {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve(mockQueryResult(data)),
      };
      return qb;
    };

    it('should return all payments for organization', async () => {
      const payments = [mockPayments.draftReceive, mockPayments.submittedReceive];
      const queryBuilder = createThenableQueryBuilder(payments);
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(TEST_IDS.organization);

      expect(result).toEqual(payments);
      expect(mockClient.from).toHaveBeenCalledWith('accounting_payments');
      expect(queryBuilder.eq).toHaveBeenCalledWith(
        'organization_id',
        TEST_IDS.organization,
      );
    });

    it('should apply payment_type filter', async () => {
      const payments = [mockPayments.draftReceive];
      const queryBuilder = createThenableQueryBuilder(payments);
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, { payment_type: 'receive' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('payment_type', 'receive');
    });

    it('should apply status filter', async () => {
      const queryBuilder = createThenableQueryBuilder([]);
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, { status: 'draft' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'draft');
    });

    it('should apply date range filters', async () => {
      const queryBuilder = createThenableQueryBuilder([]);
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, {
        date_from: TEST_DATES.lastWeek,
        date_to: TEST_DATES.today,
      });

      expect(queryBuilder.gte).toHaveBeenCalledWith('payment_date', TEST_DATES.lastWeek);
      expect(queryBuilder.lte).toHaveBeenCalledWith('payment_date', TEST_DATES.today);
    });
  });

  describe('findOne', () => {
    it('should return payment by ID', async () => {
      const payment = { ...mockPayments.draftReceive, allocations: [] };
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(payment));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findOne(
        mockPayments.draftReceive.id,
        TEST_IDS.organization,
      );

      expect(result).toEqual(payment);
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', mockPayments.draftReceive.id);
      expect(queryBuilder.eq).toHaveBeenCalledWith(
        'organization_id',
        TEST_IDS.organization,
      );
    });

    it('should throw NotFoundException when payment not found', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'Not found' }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.findOne('non-existent-id', TEST_IDS.organization),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('allocatePayment', () => {
    const setupAllocationMocks = (
      payment: any,
      invoices: any[],
      accounts: any[],
    ) => {
      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();

        if (table === 'accounting_payments') {
          if (callCount === 0) {
            qb.single.mockResolvedValue(mockQueryResult(payment));
            callCount++;
          } else {
            qb.single.mockResolvedValue(mockQueryResult({ ...payment, status: 'submitted' }));
          }
        } else if (table === 'invoices') {
          qb.in = jest.fn().mockReturnThis();
          qb.single.mockResolvedValue(mockQueryResult(invoices[0]));
          qb.eq.mockImplementation(() => {
            qb.select.mockReturnThis();
            return qb;
          });
        } else if (table === 'payment_allocations') {
          qb.insert.mockReturnValue({ error: null });
        } else if (table === 'accounts') {
          qb.in = jest.fn().mockReturnThis();
          qb.select.mockReturnThis();
          qb.eq.mockReturnThis();
        } else if (table === 'bank_accounts') {
          qb.single.mockResolvedValue(mockQueryResult(mockBankAccounts.primary));
        } else if (table === 'journal_entries') {
          qb.single.mockResolvedValue(
            mockQueryResult({ id: 'je-new', entry_number: 'JE-2024-00001' }),
          );
        } else if (table === 'journal_items') {
          qb.insert.mockReturnValue({ error: null });
        }

        return qb;
      });

      mockClient.rpc.mockResolvedValue(mockQueryResult('JE-2024-00001'));
    };

    it('should reject allocation when payment is not draft', async () => {
      const submittedPayment = { ...mockPayments.submittedReceive };
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(submittedPayment));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.allocatePayment(
          submittedPayment.id,
          { allocations: [{ invoice_id: 'inv-1', amount: 100 }] },
          TEST_IDS.organization,
          TEST_IDS.user,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when allocation total does not match payment amount', async () => {
      const payment = { ...mockPayments.draftReceive, amount: 1000 };
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(payment));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.allocatePayment(
          payment.id,
          { allocations: [{ invoice_id: 'inv-1', amount: 500 }] },
          TEST_IDS.organization,
          TEST_IDS.user,
        ),
      ).rejects.toThrow('Total allocated amount');
    });
  });

  describe('updateStatus', () => {
    it('should update status from draft to submitted', async () => {
      const payment = { ...mockPayments.draftReceive, allocations: [] };
      const updatedPayment = { ...payment, status: 'submitted' };

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        const qb = createMockQueryBuilder();
        if (callCount === 0) {
          qb.single.mockResolvedValue(mockQueryResult(payment));
        } else {
          qb.single.mockResolvedValue(mockQueryResult(updatedPayment));
        }
        callCount++;
        return qb;
      });

      const result = await service.updateStatus(
        payment.id,
        { status: PaymentStatus.SUBMITTED },
        TEST_IDS.organization,
      );

      expect(result.status).toBe('submitted');
    });

    it('should reject invalid status transition from submitted to draft', async () => {
      const payment = { ...mockPayments.submittedReceive, allocations: [] };
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(payment));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.updateStatus(
          payment.id,
          { status: PaymentStatus.DRAFT },
          TEST_IDS.organization,
        ),
      ).rejects.toThrow('Invalid status transition');
    });

    it('should reject status change from reconciled', async () => {
      const payment = {
        ...mockPayments.submittedReceive,
        status: 'reconciled',
        allocations: [],
      };
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(payment));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.updateStatus(
          payment.id,
          { status: PaymentStatus.CANCELLED },
          TEST_IDS.organization,
        ),
      ).rejects.toThrow('Invalid status transition');
    });

    it('should allow transition from draft to cancelled', async () => {
      const payment = { ...mockPayments.draftReceive, allocations: [] };
      const cancelledPayment = { ...payment, status: 'cancelled' };

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        const qb = createMockQueryBuilder();
        if (callCount === 0) {
          qb.single.mockResolvedValue(mockQueryResult(payment));
        } else {
          qb.single.mockResolvedValue(mockQueryResult(cancelledPayment));
        }
        callCount++;
        return qb;
      });

      const result = await service.updateStatus(
        payment.id,
        { status: PaymentStatus.CANCELLED },
        TEST_IDS.organization,
      );

      expect(result.status).toBe('cancelled');
    });
  });

  describe('delete', () => {
    it('should delete draft payment without allocations', async () => {
      const payment = { ...mockPayments.draftReceive, allocations: [] };

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'accounting_payments') {
          qb.single.mockResolvedValue(mockQueryResult(payment));
          qb.delete.mockReturnThis();
        } else if (table === 'payment_allocations') {
          qb.limit.mockResolvedValue(mockQueryResult([]));
        }
        return qb;
      });

      const result = await service.delete(payment.id, TEST_IDS.organization);

      expect(result).toEqual({ message: 'Payment deleted successfully' });
    });

    it('should reject deletion of non-draft payment', async () => {
      const payment = { ...mockPayments.submittedReceive, allocations: [] };
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(payment));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.delete(payment.id, TEST_IDS.organization),
      ).rejects.toThrow('Only draft payments can be deleted');
    });

    it('should reject deletion of payment with allocations', async () => {
      const payment = { ...mockPayments.draftReceive, allocations: [] };

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'accounting_payments') {
          qb.single.mockResolvedValue(mockQueryResult(payment));
        } else if (table === 'payment_allocations') {
          qb.limit.mockResolvedValue(mockQueryResult([{ id: 'alloc-1' }]));
        }
        return qb;
      });

      await expect(
        service.delete(payment.id, TEST_IDS.organization),
      ).rejects.toThrow('Cannot delete payment with allocations');
    });
  });

  describe('validateStatusTransition (private)', () => {
    it('should validate all allowed transitions', async () => {
      const validTransitions = [
        { from: 'draft', to: 'submitted' },
        { from: 'draft', to: 'cancelled' },
        { from: 'submitted', to: 'reconciled' },
        { from: 'submitted', to: 'cancelled' },
      ];

      for (const { from, to } of validTransitions) {
        const payment = { ...mockPayments.draftReceive, status: from, allocations: [] };
        const updatedPayment = { ...payment, status: to };

        let callCount = 0;
        mockClient.from.mockImplementation(() => {
          const qb = createMockQueryBuilder();
          if (callCount === 0) {
            qb.single.mockResolvedValue(mockQueryResult(payment));
          } else {
            qb.single.mockResolvedValue(mockQueryResult(updatedPayment));
          }
          callCount++;
          return qb;
        });

        const result = await service.updateStatus(
          payment.id,
          { status: to as PaymentStatus },
          TEST_IDS.organization,
        );
        expect(result.status).toBe(to);
      }
    });
  });
});
