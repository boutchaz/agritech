import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReceptionBatchesService } from './reception-batches.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('ReceptionBatchesService', () => {
  let service: ReceptionBatchesService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const BATCH_STATUSES = ['received', 'quality_checked', 'decision_made', 'processed', 'cancelled'];
  const QUALITY_GRADES = ['A', 'B', 'C', 'D', 'Premium', 'Standard'];
  const DECISION_TYPES = ['accept', 'reject', 'conditional', 'reprocess'];

  const MOCK_RECEPTION_BATCHES = [
    {
      id: 'rb1',
      organization_id: TEST_IDS.organization,
      batch_code: 'RB-20240101-0001',
      warehouse_id: 'wh1',
      parcel_id: TEST_IDS.parcel,
      crop_id: 'crop1',
      harvest_id: 'harvest1',
      reception_date: '2024-01-01',
      received_by: TEST_IDS.user,
      status: 'received',
      decision: 'pending',
      weight: 1000,
      unit: 'kg',
      quantity: 500,
      variety: 'Tomato',
    },
    {
      id: 'rb2',
      organization_id: TEST_IDS.organization,
      batch_code: 'RB-20240101-0002',
      warehouse_id: 'wh1',
      parcel_id: TEST_IDS.parcel,
      crop_id: 'crop1',
      reception_date: '2024-01-01',
      received_by: TEST_IDS.user,
      status: 'quality_checked',
      decision: 'pending',
      quality_grade: 'A',
      quality_checked_by: TEST_IDS.user,
      quality_checked_at: '2024-01-01T10:00:00Z',
      weight: 800,
      unit: 'kg',
    },
    {
      id: 'rb3',
      organization_id: TEST_IDS.organization,
      batch_code: 'RB-20240101-0003',
      warehouse_id: 'wh1',
      reception_date: '2024-01-01',
      received_by: TEST_IDS.user,
      status: 'decision_made',
      decision: 'accept',
      decision_by: TEST_IDS.user,
      decision_date: '2024-01-01',
      destination_warehouse_id: 'wh2',
      weight: 1200,
      unit: 'kg',
    },
    {
      id: 'rb4',
      organization_id: TEST_IDS.organization,
      batch_code: 'RB-20240101-0004',
      warehouse_id: 'wh1',
      reception_date: '2024-01-01',
      received_by: TEST_IDS.user,
      status: 'processed',
      decision: 'accept',
      weight: 900,
      unit: 'kg',
    },
  ];

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
        ReceptionBatchesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<ReceptionBatchesService>(ReceptionBatchesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // PARAMETERIZED TESTS - BATCH STATUSES AND DECISIONS
  // ============================================================

  describe('Batch Statuses and Decisions (Parameterized)', () => {
    it.each(BATCH_STATUSES)('should handle batch status: %s', async (status) => {
      const mockBatch = {
        id: 'rb1',
        organization_id: TEST_IDS.organization,
        status: status,
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.then.mockResolvedValue(mockQueryResult([mockBatch]));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
        status: status as any,
      });

      expect(result).toBeDefined();
      expect(queryBuilder.eq).toHaveBeenCalledWith('status', status);
    });

    it.each(DECISION_TYPES)('should handle decision type: %s', async (decision) => {
      const mockBatch = {
        id: 'rb1',
        organization_id: TEST_IDS.organization,
        decision: decision,
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.then.mockResolvedValue(mockQueryResult([mockBatch]));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
        decision: decision as any,
      });

      expect(result).toBeDefined();
      expect(queryBuilder.eq).toHaveBeenCalledWith('decision', decision);
    });
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('create', () => {
      it('should reject creation without organization access', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'Not found' }));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.create(
            TEST_IDS.user,
            TEST_IDS.organization,
            {
              warehouse_id: 'wh1',
              weight: 1000,
              unit: 'kg',
            } as any
          )
        ).rejects.toThrow(NotFoundException);
      });

      it('should reject creation with missing required fields', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'member1' }));
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Missing required field' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.create(
            TEST_IDS.user,
            TEST_IDS.organization,
            {} as any
          )
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('updateQualityControl', () => {
      it('should reject update for non-existent batch', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(mockQueryResult(null, { message: 'Not found' }));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.updateQualityControl(
            TEST_IDS.user,
            TEST_IDS.organization,
            'non-existent',
            { quality_grade: 'A' } as any
          )
        ).rejects.toThrow(NotFoundException);
      });

      it.each(['cancelled', 'processed'])(
        'should reject quality control update for %s batch',
        async (status) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.single
            .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
            .mockResolvedValueOnce(
              mockQueryResult({ id: 'rb1', status: status })
            );
          mockClient.from.mockReturnValue(queryBuilder);

          await expect(
            service.updateQualityControl(
              TEST_IDS.user,
              TEST_IDS.organization,
              'rb1',
              { quality_grade: 'A' } as any
            )
          ).rejects.toThrow(BadRequestException);
          await expect(
            service.updateQualityControl(
              TEST_IDS.user,
              TEST_IDS.organization,
              'rb1',
              { quality_grade: 'A' } as any
            )
          ).rejects.toThrow(`Cannot update quality control for ${status} batch`);
        }
      );
    });

    describe('makeDecision', () => {
      it('should reject decision for non-existent batch', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(mockQueryResult(null, { message: 'Not found' }));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.makeDecision(
            TEST_IDS.user,
            TEST_IDS.organization,
            'non-existent',
            { decision: 'accept' } as any
          )
        ).rejects.toThrow(NotFoundException);
      });

      it('should reject decision for non-quality-checked batch', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'received',
              quality_grade: null,
            })
          );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.makeDecision(
            TEST_IDS.user,
            TEST_IDS.organization,
            'rb1',
            { decision: 'accept' } as any
          )
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.makeDecision(
            TEST_IDS.user,
            TEST_IDS.organization,
            'rb1',
            { decision: 'accept' } as any
          )
        ).rejects.toThrow('Batch must be quality checked before making decision');
      });
    });

    describe('processPayment', () => {
      it('should reject payment for non-existent batch', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(mockQueryResult(null, { message: 'Not found' }));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.processPayment(
            TEST_IDS.user,
            TEST_IDS.organization,
            'non-existent',
            { amount: 1000 } as any
          )
        ).rejects.toThrow(NotFoundException);
      });

      it('should reject payment for batch without decision', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'quality_checked',
              decision: 'pending',
            })
          );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.processPayment(
            TEST_IDS.user,
            TEST_IDS.organization,
            'rb1',
            { amount: 1000 } as any
          )
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.processPayment(
            TEST_IDS.user,
            TEST_IDS.organization,
            'rb1',
            { amount: 1000 } as any
          )
        ).rejects.toThrow('Decision must be made before processing payment');
      });
    });

    describe('cancel', () => {
      it('should reject cancellation of processed batch', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({ id: 'rb1', status: 'processed' })
          );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.cancel(TEST_IDS.user, TEST_IDS.organization, 'rb1')
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.cancel(TEST_IDS.user, TEST_IDS.organization, 'rb1')
        ).rejects.toThrow('Cannot cancel processed batch');
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Batch Lifecycle', () => {
    describe('create', () => {
      it('should create initial reception batch', async () => {
        const createDto = {
          warehouse_id: 'wh1',
          parcel_id: TEST_IDS.parcel,
          crop_id: 'crop1',
          reception_date: '2024-01-01',
          weight: 1000,
          unit: 'kg',
          variety: 'Tomato',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              organization_id: TEST_IDS.organization,
              batch_code: 'RB-20240101-0001',
              status: 'received',
              decision: 'pending',
              created_by: TEST_IDS.user,
              ...createDto,
            })
          );
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        // Mock count for batch code generation
        let fromCallCount = 0;
        mockClient.from.mockImplementation(() => {
          fromCallCount++;
          const countBuilder = createMockQueryBuilder();
          countBuilder.select.mockReturnValue(countBuilder);
          countBuilder.eq.mockReturnValue(countBuilder);
          if (fromCallCount === 1) {
            // First call is for organization_members
            return queryBuilder;
          } else if (fromCallCount === 2) {
            // Second call is for counting batches
            countBuilder.head = jest.fn().mockReturnValue(countBuilder);
            countBuilder.then = jest.fn().mockResolvedValue({
              data: null,
              error: null,
              count: 0,
            });
            return countBuilder;
          } else {
            // Third call is for inserting batch
            return queryBuilder;
          }
        });

        const result = await service.create(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto as any
        );

        expect(result).toBeDefined();
        expect(result.status).toBe('received');
        expect(result.decision).toBe('pending');
        expect(result.batch_code).toBeDefined();
      });

      it('should verify organization access before creation', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'Not found' }));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.create(
            TEST_IDS.user,
            TEST_IDS.organization,
            {
              warehouse_id: 'wh1',
              weight: 1000,
              unit: 'kg',
            } as any
          )
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateQualityControl', () => {
      it('should update quality control information', async () => {
        const updateDto = {
          quality_grade: 'A',
          quality_notes: 'Excellent quality',
          defects_percentage: 2,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({ id: 'rb1', status: 'received' })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'quality_checked',
              ...updateDto,
              updated_by: TEST_IDS.user,
            })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.updateQualityControl(
          TEST_IDS.user,
          TEST_IDS.organization,
          'rb1',
          updateDto as any
        );

        expect(result).toBeDefined();
        expect(result.status).toBe('quality_checked');
        expect(queryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            quality_grade: 'A',
            quality_notes: 'Excellent quality',
          })
        );
      });

      it('should update status to quality_checked', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({ id: 'rb1', status: 'received' })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'quality_checked',
            })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.updateQualityControl(
          TEST_IDS.user,
          TEST_IDS.organization,
          'rb1',
          { quality_grade: 'A' } as any
        );

        expect(result.status).toBe('quality_checked');
      });
    });

    describe('makeDecision', () => {
      it('should make accept decision with destination warehouse', async () => {
        const decisionDto = {
          decision: 'accept',
          decision_notes: 'Quality approved',
          destination_warehouse_id: 'wh2',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'quality_checked',
              quality_grade: 'A',
            })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'decision_made',
              decision: 'accept',
              decision_by: TEST_IDS.user,
              decision_date: expect.any(String),
              ...decisionDto,
            })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.makeDecision(
          TEST_IDS.user,
          TEST_IDS.organization,
          'rb1',
          decisionDto as any
        );

        expect(result).toBeDefined();
        expect(result.decision).toBe('accept');
        expect(result.status).toBe('decision_made');
      });

      it('should make reject decision', async () => {
        const decisionDto = {
          decision: 'reject',
          decision_notes: 'Quality not acceptable',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'quality_checked',
              quality_grade: 'C',
            })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'decision_made',
              decision: 'reject',
              ...decisionDto,
            })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.makeDecision(
          TEST_IDS.user,
          TEST_IDS.organization,
          'rb1',
          decisionDto as any
        );

        expect(result.decision).toBe('reject');
      });

      it('should accept batch that is received (not yet quality checked)', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'received',
              quality_grade: null,
            })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'decision_made',
              decision: 'accept',
            })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.makeDecision(
          TEST_IDS.user,
          TEST_IDS.organization,
          'rb1',
          { decision: 'accept' } as any
        );

        expect(result.decision).toBe('accept');
      });
    });

    describe('processPayment', () => {
      it('should process payment and create payment record', async () => {
        const paymentDto = {
          create_payment: true,
          worker_id: 'worker1',
          amount: 1000,
          payment_type: 'per_unit',
          payment_method: 'bank_transfer',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'decision_made',
              decision: 'accept',
              harvest_id: 'harvest1',
              weight: 1000,
              quality_grade: 'A',
            })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'processed',
            })
          )
          .mockResolvedValueOnce(
            mockQueryResult({ harvest_task_id: 'task1' })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'payment1',
            })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.processPayment(
          TEST_IDS.user,
          TEST_IDS.organization,
          'rb1',
          paymentDto as any
        );

        expect(result).toBeDefined();
        expect(result.batch).toBeDefined();
        expect(result.payment_record_id).toBeDefined();
      });

      it('should process payment and create journal entry', async () => {
        const paymentDto = {
          create_payment: false,
          create_journal_entry: true,
          amount: 1000,
          debit_account_id: 'acc1',
          credit_account_id: 'acc2',
          journal_description: 'Harvest payment',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'decision_made',
              decision: 'accept',
            })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'processed',
            })
          )
          .mockResolvedValueOnce(mockQueryResult({ count: 0 }))
          .mockResolvedValueOnce(
            mockQueryResult({ id: 'je1' })
          )
          .mockResolvedValueOnce(mockQueryResult(null));
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.processPayment(
          TEST_IDS.user,
          TEST_IDS.organization,
          'rb1',
          paymentDto as any
        );

        expect(result).toBeDefined();
        expect(result.journal_entry_id).toBeDefined();
      });

      it('should update batch status to processed after payment', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'decision_made',
              decision: 'accept',
            })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'processed',
            })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.processPayment(
          TEST_IDS.user,
          TEST_IDS.organization,
          'rb1',
          { amount: 1000 } as any
        );

        expect(result.batch.status).toBe('processed');
      });
    });

    describe('cancel', () => {
      it('should cancel draft batch', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'received',
            })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'cancelled',
            })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.cancel(TEST_IDS.user, TEST_IDS.organization, 'rb1');

        expect(result.status).toBe('cancelled');
        expect(queryBuilder.update).toHaveBeenCalledWith({
          status: 'cancelled',
          updated_at: expect.any(String),
          updated_by: TEST_IDS.user,
        });
      });

      it('should cancel quality_checked batch', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'quality_checked',
            })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'cancelled',
            })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.cancel(TEST_IDS.user, TEST_IDS.organization, 'rb1');

        expect(result.status).toBe('cancelled');
      });
    });

    describe('update', () => {
      it('should update draft batch', async () => {
        const updateDto = {
          weight: 1200,
          variety: 'Improved variety',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'received',
            })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              ...updateDto,
            })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.update(
          TEST_IDS.user,
          TEST_IDS.organization,
          'rb1',
          updateDto
        );

        expect(result).toBeDefined();
        expect(queryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            ...updateDto,
            updated_at: expect.any(String),
            updated_by: TEST_IDS.user,
          })
        );
      });

      it('should reject update of cancelled batch', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'cancelled',
            })
          );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update(
            TEST_IDS.user,
            TEST_IDS.organization,
            'rb1',
            { weight: 1200 }
          )
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject update of processed batch', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'processed',
            })
          );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update(
            TEST_IDS.user,
            TEST_IDS.organization,
            'rb1',
            { weight: 1200 }
          )
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('Behavior - Filtering and Queries', () => {
    describe('findAll', () => {
      it('should return all batches with filters', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.gte.mockReturnValue(queryBuilder);
        queryBuilder.lte.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_RECEPTION_BATCHES));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
          warehouse_id: 'wh1',
          status: 'received',
          decision: 'pending',
          quality_grade: 'A',
          date_from: '2024-01-01',
          date_to: '2024-12-31',
        });

        expect(result).toBeDefined();
        expect(queryBuilder.eq).toHaveBeenCalledWith('warehouse_id', 'wh1');
        expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'received');
        expect(queryBuilder.eq).toHaveBeenCalledWith('decision', 'pending');
        expect(queryBuilder.eq).toHaveBeenCalledWith('quality_grade', 'A');
      });

      it('should filter by harvest_id', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([MOCK_RECEPTION_BATCHES[0]]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
          harvest_id: 'harvest1',
        });

        expect(result).toBeDefined();
        expect(queryBuilder.eq).toHaveBeenCalledWith('harvest_id', 'harvest1');
      });

      it('should filter by crop_id', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_RECEPTION_BATCHES));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
          crop_id: 'crop1',
        });

        expect(result).toBeDefined();
        expect(queryBuilder.eq).toHaveBeenCalledWith('crop_id', 'crop1');
      });

      it('should filter by parcel_id', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_RECEPTION_BATCHES));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
          parcel_id: TEST_IDS.parcel,
        });

        expect(result).toBeDefined();
        expect(queryBuilder.eq).toHaveBeenCalledWith('parcel_id', TEST_IDS.parcel);
      });
    });

    describe('findOne', () => {
      it('should return batch with all relations', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            ...MOCK_RECEPTION_BATCHES[0],
            warehouse: { id: 'wh1', name: 'Main Warehouse' },
            parcel: {
              id: TEST_IDS.parcel,
              name: 'Parcel A',
              farm: { id: 'farm1', name: 'Farm 1' },
            },
            crop: { id: 'crop1', name: 'Tomato' },
            harvest: {
              id: 'harvest1',
              harvest_date: '2024-01-01',
              quantity: 1000,
            },
            receiver: {
              id: TEST_IDS.user,
              first_name: 'John',
              last_name: 'Doe',
            },
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findOne(TEST_IDS.user, TEST_IDS.organization, 'rb1');

        expect(result).toBeDefined();
        expect(result.warehouse).toBeDefined();
        expect(result.parcel).toBeDefined();
        expect(result.crop).toBeDefined();
      });

      it('should throw NotFoundException when batch not found', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.findOne(TEST_IDS.user, TEST_IDS.organization, 'non-existent')
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Batch Code Generation', () => {
      it('should generate sequential batch codes', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'member1' }));
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);

        let batchCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return queryBuilder;
          } else if (table === 'reception_batches') {
            const countBuilder = createMockQueryBuilder();
            countBuilder.select.mockReturnValue(countBuilder);
            countBuilder.eq.mockReturnValue(countBuilder);
            countBuilder.head = jest.fn().mockReturnValue(countBuilder);
            countBuilder.then = jest.fn().mockResolvedValue({
              data: null,
              error: null,
              count: batchCount++,
            });
            return countBuilder;
          }
          return queryBuilder;
        });

        // Create first batch
        const result1 = await service.create(
          TEST_IDS.user,
          TEST_IDS.organization,
          {
            warehouse_id: 'wh1',
            weight: 1000,
            unit: 'kg',
          } as any
        );

        expect(result1.batch_code).toBeDefined();
      });
    });

    describe('Organization Access', () => {
      it('should verify organization access for all operations', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'Not found' }));
        queryBuilder.then.mockResolvedValue(mockQueryResult([]));
        mockClient.from.mockReturnValue(queryBuilder);

        // findAll should verify access
        await service.findAll(TEST_IDS.user, TEST_IDS.organization);
        expect(queryBuilder.single).toHaveBeenCalled();

        // findOne should verify access
        await expect(
          service.findOne(TEST_IDS.user, 'other-org', 'rb1')
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('Weight and Quantity Handling', () => {
      it.each([
        { weight: 0, unit: 'kg', shouldReject: true },
        { weight: -100, unit: 'kg', shouldReject: true },
        { weight: 1000, unit: 'kg', shouldReject: false },
        { weight: 0.5, unit: 'tons', shouldReject: false },
      ])('should handle weight: $weight $unit', async ({ weight, unit, shouldReject }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              weight: weight,
              unit: unit,
            })
          );
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        if (shouldReject) {
          await expect(
            service.create(
              TEST_IDS.user,
              TEST_IDS.organization,
              {
                warehouse_id: 'wh1',
                weight: weight,
                unit: unit,
              } as any
            )
          ).rejects.toThrow();
        } else {
          const result = await service.create(
            TEST_IDS.user,
            TEST_IDS.organization,
            {
              warehouse_id: 'wh1',
              weight: weight,
              unit: unit,
            } as any
          );
          expect(result).toBeDefined();
        }
      });
    });

    describe('Quality Control Edge Cases', () => {
      it('should handle missing quality_grade in quality check', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({ id: 'rb1', status: 'received' })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'quality_checked',
              quality_grade: null,
            })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.updateQualityControl(
          TEST_IDS.user,
          TEST_IDS.organization,
          'rb1',
          { quality_notes: 'Inspected' } as any
        );

        expect(result.status).toBe('quality_checked');
        expect(result.quality_grade).toBeNull();
      });
    });

    describe('Decision Processing Edge Cases', () => {
      it('should handle conditional decision', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'quality_checked',
              quality_grade: 'B',
            })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'decision_made',
              decision: 'conditional',
              decision_notes: 'Accept with price adjustment',
            })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.makeDecision(
          TEST_IDS.user,
          TEST_IDS.organization,
          'rb1',
          {
            decision: 'conditional',
            decision_notes: 'Accept with price adjustment',
          } as any
        );

        expect(result.decision).toBe('conditional');
      });
    });

    describe('Payment Processing Edge Cases', () => {
      it('should calculate net amount when not provided', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'decision_made',
              decision: 'accept',
            })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'processed',
            })
          )
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'payment1',
            })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.processPayment(
          TEST_IDS.user,
          TEST_IDS.organization,
          'rb1',
          {
            create_payment: true,
            worker_id: 'worker1',
            units_completed: 100,
            rate_per_unit: 10,
            payment_type: 'per_unit',
          } as any
        );

        expect(result).toBeDefined();
        expect(result.payment_record_id).toBeDefined();
      });

      it('should handle journal entry creation failure', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
          .mockResolvedValueOnce(
            mockQueryResult({
              id: 'rb1',
              status: 'decision_made',
              decision: 'accept',
            })
          )
          .mockResolvedValueOnce(mockQueryResult({ count: 0 }))
          .mockResolvedValueOnce(
            mockQueryResult(null, { message: 'Journal creation failed' })
          );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.processPayment(
            TEST_IDS.user,
            TEST_IDS.organization,
            'rb1',
            {
              create_journal_entry: true,
              debit_account_id: 'acc1',
              credit_account_id: 'acc2',
            } as any
          )
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple simultaneous batch creations', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'member1' }));
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_members') {
            return queryBuilder;
          } else {
            const countBuilder = createMockQueryBuilder();
            countBuilder.select.mockReturnValue(countBuilder);
            countBuilder.eq.mockReturnValue(countBuilder);
            countBuilder.head = jest.fn().mockReturnValue(countBuilder);
            countBuilder.then = jest.fn().mockResolvedValue({
              data: null,
              error: null,
              count: Math.floor(Math.random() * 100),
            });
            return countBuilder;
          }
        });

        const promises = [1, 2, 3].map((i) =>
          service.create(
            TEST_IDS.user,
            TEST_IDS.organization,
            {
              warehouse_id: `wh${i}`,
              weight: 1000 * i,
              unit: 'kg',
            } as any
          )
        );

        const results = await Promise.all(promises);

        results.forEach((result) => {
          expect(result).toBeDefined();
          expect(result.batch_code).toBeDefined();
        });
      });
    });
  });

  // ============================================================
  // INTEGRATION-LIKE TESTS
  // ============================================================

  describe('Integration Scenarios', () => {
    it('should support full batch lifecycle', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'member1' }));
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);

      let fromCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        fromCallCount++;
        if (table === 'organization_members') {
          return queryBuilder;
        } else {
          const countBuilder = createMockQueryBuilder();
          countBuilder.select.mockReturnValue(countBuilder);
          countBuilder.eq.mockReturnValue(countBuilder);
          countBuilder.head = jest.fn().mockReturnValue(countBuilder);
          countBuilder.then = jest.fn().mockResolvedValue({
            data: null,
            error: null,
            count: fromCallCount - 1,
          });
          return countBuilder;
        }
      });

      // Step 1: Create reception batch
      const created = await service.create(
        TEST_IDS.user,
        TEST_IDS.organization,
        {
          warehouse_id: 'wh1',
          weight: 1000,
          unit: 'kg',
        } as any
      );
      expect(created.status).toBe('received');

      // Step 2: Update quality control
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
        .mockResolvedValueOnce(
          mockQueryResult({ id: created.id, status: 'received' })
        )
        .mockResolvedValueOnce(
          mockQueryResult({
            id: created.id,
            status: 'quality_checked',
            quality_grade: 'A',
          })
        );

      const qualityChecked = await service.updateQualityControl(
        TEST_IDS.user,
        TEST_IDS.organization,
        created.id,
        { quality_grade: 'A' } as any
      );
      expect(qualityChecked.status).toBe('quality_checked');

      // Step 3: Make decision
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
        .mockResolvedValueOnce(
          mockQueryResult({
            id: created.id,
            status: 'quality_checked',
            quality_grade: 'A',
          })
        )
        .mockResolvedValueOnce(
          mockQueryResult({
            id: created.id,
            status: 'decision_made',
            decision: 'accept',
          })
        );

      const decisionMade = await service.makeDecision(
        TEST_IDS.user,
        TEST_IDS.organization,
        created.id,
        { decision: 'accept', destination_warehouse_id: 'wh2' } as any
      );
      expect(decisionMade.decision).toBe('accept');

      // Step 4: Process payment
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult({ id: 'member1' }))
        .mockResolvedValueOnce(
          mockQueryResult({
            id: created.id,
            status: 'decision_made',
            decision: 'accept',
          })
        )
        .mockResolvedValueOnce(
          mockQueryResult({
            id: created.id,
            status: 'processed',
          })
        );

      const processed = await service.processPayment(
        TEST_IDS.user,
        TEST_IDS.organization,
        created.id,
        { amount: 1000 } as any
      );
      expect(processed.batch.status).toBe('processed');
    });
  });
});
