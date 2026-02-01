import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PieceWorkService } from './piece-work.service';
import { DatabaseService } from '../database/database.service';
import { PieceWorkPaymentStatus } from './dto';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS, TEST_DATES } from '../../../test/helpers/test-utils';

describe('PieceWorkService', () => {
  let service: PieceWorkService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const MOCK_PIECE_WORK_RECORDS = [
    {
      id: 'piece-1',
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      worker_id: TEST_IDS.worker,
      work_date: TEST_DATES.today,
      work_unit_id: 'unit-1',
      task_id: TEST_IDS.task,
      parcel_id: TEST_IDS.parcel,
      units_completed: 100,
      rate_per_unit: 5,
      total_amount: 500,
      quality_rating: 4.5,
      start_time: '08:00',
      end_time: '17:00',
      break_duration: 60,
      notes: 'Good work',
      payment_status: 'pending',
      verified_by: null,
      verified_at: null,
      worker: { id: TEST_IDS.worker, first_name: 'Ahmed', last_name: 'Benali' },
      work_unit: { id: 'unit-1', name: 'Kilograms', code: 'KG' },
      task: { id: TEST_IDS.task, title: 'Harvesting' },
      parcel: { id: TEST_IDS.parcel, name: 'Parcel A' },
    },
    {
      id: 'piece-2',
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      worker_id: 'worker-2',
      work_date: TEST_DATES.yesterday,
      work_unit_id: 'unit-2',
      task_id: TEST_IDS.task,
      parcel_id: TEST_IDS.parcel,
      units_completed: 150,
      rate_per_unit: 3,
      total_amount: 450,
      quality_rating: 4.0,
      payment_status: 'approved',
      verified_by: TEST_IDS.user,
      verified_at: TEST_DATES.today,
      worker: { id: 'worker-2', first_name: 'Fatima', last_name: 'Zahra' },
      work_unit: { id: 'unit-2', name: 'Pieces', code: 'PC' },
      task: { id: TEST_IDS.task, title: 'Harvesting' },
      parcel: { id: TEST_IDS.parcel, name: 'Parcel A' },
    },
  ];

  const PAYMENT_STATUSES = Object.values(PieceWorkPaymentStatus);

  const QUALITY_RATINGS = [1, 2, 3, 4, 5, 4.5, 3.5, 2.5];

  const INVALID_IDS = ['', '   ', '\t\n', null, undefined];

  const FILTER_SCENARIOS = [
    { description: 'worker filter', filters: { worker_id: TEST_IDS.worker } },
    { description: 'task filter', filters: { task_id: TEST_IDS.task } },
    { description: 'parcel filter', filters: { parcel_id: TEST_IDS.parcel } },
    { description: 'date range filter', filters: { start_date: TEST_DATES.lastWeek, end_date: TEST_DATES.today } },
    { description: 'payment status filter', filters: { payment_status: PieceWorkPaymentStatus.PENDING } },
    { description: 'search filter', filters: { search: 'harvest' } },
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
        PieceWorkService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<PieceWorkService>(PieceWorkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function setupPieceWorkQuery(records: any[], shouldExist: boolean = true) {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.gte.mockReturnValue(queryBuilder);
    queryBuilder.lte.mockReturnValue(queryBuilder);
    queryBuilder.ilike.mockReturnValue(queryBuilder);
    queryBuilder.then.mockResolvedValue(mockQueryResult(records));
    queryBuilder.single.mockReturnValue(queryBuilder);
    queryBuilder.maybeSingle.mockResolvedValue(
      shouldExist ? mockQueryResult(records[0]) : mockQueryResult(null, null)
    );
    queryBuilder.insert.mockReturnValue(queryBuilder);
    queryBuilder.update.mockReturnValue(queryBuilder);
    queryBuilder.delete.mockReturnValue(queryBuilder);
    mockClient.from.mockReturnValue(queryBuilder);
    return queryBuilder;
  }

  // ============================================================
  // PARAMETERIZED TESTS - FILTERS
  // ============================================================

  describe('findAll with filters (Parameterized)', () => {
    it.each(FILTER_SCENARIOS)(
      'should apply $description correctly',
      async ({ filters }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.gte.mockReturnValue(queryBuilder);
        queryBuilder.lte.mockReturnValue(queryBuilder);
        queryBuilder.ilike.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_PIECE_WORK_RECORDS));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(
          TEST_IDS.organization,
          TEST_IDS.farm,
          filters
        );

        expect(result).toBeDefined();
        expect(mockClient.from).toHaveBeenCalledWith('piece_work_records');
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
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.then.mockResolvedValue(
            mockQueryResult(null, { message: 'Invalid organization' })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          await expect(
            service.findAll(orgId as any, TEST_IDS.farm)
          ).rejects.toThrow();
        }
      );

      it('should handle database error gracefully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(
          mockQueryResult(null, { message: 'Database connection failed' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.findAll(TEST_IDS.organization, TEST_IDS.farm)
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('findOne', () => {
      it.each(INVALID_IDS)(
        'should handle invalid record ID: %s',
        async (id) => {
          await expect(
            service.findOne(id as any, TEST_IDS.organization)
          ).rejects.toThrow();
        }
      );

      it('should throw NotFoundException for non-existent record', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null, null));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.findOne('non-existent', TEST_IDS.organization)
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.findOne('non-existent', TEST_IDS.organization)
        ).rejects.toThrow('Piece work record not found');
      });
    });

    describe('create', () => {
      it.each([
        { units_completed: -10, rate_per_unit: 5, description: 'negative units' },
        { units_completed: 100, rate_per_unit: -5, description: 'negative rate' },
        { units_completed: 0, rate_per_unit: 5, description: 'zero units' },
      ])(
        'should handle invalid calculation for $description',
        async ({ units_completed, rate_per_unit }) => {
          const createDto = {
            worker_id: TEST_IDS.worker,
            work_date: TEST_DATES.today,
            work_unit_id: 'unit-1',
            units_completed,
            rate_per_unit,
          };

          const queryBuilder = createMockQueryBuilder();
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.insert.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult({
              id: 'piece-1',
              total_amount: units_completed * rate_per_unit,
            })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          const result = await service.create(
            createDto as any,
            TEST_IDS.organization,
            TEST_IDS.farm,
            TEST_IDS.user
          );

          expect(result).toBeDefined();
        }
      );

      it('should set default payment_status to pending', async () => {
        const createDto = {
          worker_id: TEST_IDS.worker,
          work_date: TEST_DATES.today,
          work_unit_id: 'unit-1',
          units_completed: 100,
          rate_per_unit: 5,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'piece-1',
            total_amount: 500,
            payment_status: 'pending',
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          createDto as any,
          TEST_IDS.organization,
          TEST_IDS.farm,
          TEST_IDS.user
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ payment_status: 'pending' })
        );
      });

      it('should handle missing optional fields', async () => {
        const createDto = {
          worker_id: TEST_IDS.worker,
          work_date: TEST_DATES.today,
          work_unit_id: 'unit-1',
          units_completed: 100,
          rate_per_unit: 5,
          // task_id, parcel_id, quality_rating, start_time, end_time, break_duration, notes not provided
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'piece-1',
            total_amount: 500,
            task_id: null,
            parcel_id: null,
            quality_rating: null,
            start_time: null,
            end_time: null,
            break_duration: 0,
            notes: null,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          createDto as any,
          TEST_IDS.organization,
          TEST_IDS.farm,
          TEST_IDS.user
        );

        expect(result).toBeDefined();
      });
    });

    describe('update', () => {
      it('should recalculate total_amount when units_completed changes', async () => {
        const updatedUnits = 150;
        const originalRate = 5;
        const expectedTotal = updatedUnits * originalRate;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult(MOCK_PIECE_WORK_RECORDS[0])
        );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            ...MOCK_PIECE_WORK_RECORDS[0],
            units_completed: updatedUnits,
            total_amount: expectedTotal,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.update(
          MOCK_PIECE_WORK_RECORDS[0].id,
          TEST_IDS.organization,
          { units_completed: updatedUnits }
        );

        expect(queryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            units_completed: updatedUnits,
            total_amount: expectedTotal,
          })
        );
      });

      it('should recalculate total_amount when rate_per_unit changes', async () => {
        const updatedRate = 7;
        const originalUnits = 100;
        const expectedTotal = originalUnits * updatedRate;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult(MOCK_PIECE_WORK_RECORDS[0])
        );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            ...MOCK_PIECE_WORK_RECORDS[0],
            rate_per_unit: updatedRate,
            total_amount: expectedTotal,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.update(
          MOCK_PIECE_WORK_RECORDS[0].id,
          TEST_IDS.organization,
          { rate_per_unit: updatedRate }
        );

        expect(queryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            rate_per_unit: updatedRate,
            total_amount: expectedTotal,
          })
        );
      });

      it('should throw NotFoundException when updating non-existent record', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null, null));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update('non-existent', TEST_IDS.organization, {
            units_completed: 150,
          })
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('delete', () => {
      it('should prevent deletion of paid records', async () => {
        const paidRecord = {
          ...MOCK_PIECE_WORK_RECORDS[0],
          payment_status: 'paid',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(paidRecord));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.delete(paidRecord.id, TEST_IDS.organization)
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.delete(paidRecord.id, TEST_IDS.organization)
        ).rejects.toThrow('Cannot delete a piece work record that has been paid');
      });

      it('should allow deletion of pending records', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult(MOCK_PIECE_WORK_RECORDS[0])
        );
        queryBuilder.delete.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.delete(
          MOCK_PIECE_WORK_RECORDS[0].id,
          TEST_IDS.organization
        );

        expect(result).toEqual({ message: 'Piece work record deleted successfully' });
      });
    });

    describe('verify', () => {
      it('should update verification fields correctly', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            ...MOCK_PIECE_WORK_RECORDS[0],
            verified_by: TEST_IDS.user,
            verified_at: expect.any(String),
            payment_status: 'approved',
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.verify(
          MOCK_PIECE_WORK_RECORDS[0].id,
          TEST_IDS.organization,
          TEST_IDS.user
        );

        expect(queryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            verified_by: TEST_IDS.user,
            payment_status: 'approved',
          })
        );
        expect(result).toBeDefined();
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Piece Work CRUD', () => {
    describe('findAll', () => {
      it('should return records with worker, work_unit, task, and parcel info', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_PIECE_WORK_RECORDS));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(
          TEST_IDS.organization,
          TEST_IDS.farm
        );

        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty('worker');
        expect(result[0]).toHaveProperty('work_unit');
        expect(result[0]).toHaveProperty('task');
        expect(result[0]).toHaveProperty('parcel');
      });

      it('should default order by work_date descending', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_PIECE_WORK_RECORDS));
        mockClient.from.mockReturnValue(queryBuilder);

        await service.findAll(TEST_IDS.organization, TEST_IDS.farm);

        expect(queryBuilder.order).toHaveBeenCalledWith('work_date', {
          ascending: false,
        });
      });

      it('should return empty array when no records exist', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(
          TEST_IDS.organization,
          TEST_IDS.farm
        );

        expect(result).toEqual([]);
      });
    });

    describe('create', () => {
      it('should calculate total_amount correctly', async () => {
        const createDto = {
          worker_id: TEST_IDS.worker,
          work_date: TEST_DATES.today,
          work_unit_id: 'unit-1',
          units_completed: 100,
          rate_per_unit: 5.5,
        };

        const expectedTotal = 550;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'piece-1',
            total_amount: expectedTotal,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          createDto as any,
          TEST_IDS.organization,
          TEST_IDS.farm,
          TEST_IDS.user
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            total_amount: expectedTotal,
          })
        );
      });

      it('should include organization and farm context', async () => {
        const createDto = {
          worker_id: TEST_IDS.worker,
          work_date: TEST_DATES.today,
          work_unit_id: 'unit-1',
          units_completed: 100,
          rate_per_unit: 5,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({ id: 'piece-1' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await service.create(
          createDto as any,
          TEST_IDS.organization,
          TEST_IDS.farm,
          TEST_IDS.user
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            organization_id: TEST_IDS.organization,
            farm_id: TEST_IDS.farm,
            created_by: TEST_IDS.user,
          })
        );
      });

      it('should attempt to increment work_unit usage count', async () => {
        const createDto = {
          worker_id: TEST_IDS.worker,
          work_date: TEST_DATES.today,
          work_unit_id: 'unit-1',
          units_completed: 100,
          rate_per_unit: 5,
        };

        const recordQuery = createMockQueryBuilder();
        recordQuery.select.mockReturnValue(recordQuery);
        recordQuery.insert.mockReturnValue(recordQuery);
        recordQuery.single.mockResolvedValue(
          mockQueryResult({ id: 'piece-1' })
        );

        const workUnitQuery = createMockQueryBuilder();
        workUnitQuery.select.mockReturnValue(workUnitQuery);
        workUnitQuery.eq.mockReturnValue(workUnitQuery);
        workUnitQuery.maybeSingle.mockResolvedValue(
          mockQueryResult({ usage_count: 2 })
        );
        workUnitQuery.update.mockReturnValue(workUnitQuery);

        mockClient.from.mockImplementation((table) => {
          if (table === 'piece_work_records') {
            return recordQuery;
          }
          return workUnitQuery;
        });

        await service.create(
          createDto as any,
          TEST_IDS.organization,
          TEST_IDS.farm,
          TEST_IDS.user
        );

        expect(workUnitQuery.update).toHaveBeenCalledWith({ usage_count: 3 });
      });
    });

    describe('update', () => {
      it('should handle partial updates without affecting total_amount', async () => {
        const updateDto = { notes: 'Updated notes' };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult(MOCK_PIECE_WORK_RECORDS[0])
        );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            ...MOCK_PIECE_WORK_RECORDS[0],
            notes: 'Updated notes',
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.update(
          MOCK_PIECE_WORK_RECORDS[0].id,
          TEST_IDS.organization,
          updateDto
        );

        expect(result.notes).toBe('Updated notes');
        expect(queryBuilder.update).not.toHaveBeenCalledWith(
          expect.objectContaining({ total_amount: expect.any(Number) })
        );
      });
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Quality Rating Edge Cases', () => {
      it.each(QUALITY_RATINGS)(
        'should handle quality rating of %s',
        async (rating) => {
          const createDto = {
            worker_id: TEST_IDS.worker,
            work_date: TEST_DATES.today,
            work_unit_id: 'unit-1',
            units_completed: 100,
            rate_per_unit: 5,
            quality_rating: rating,
          };

          const queryBuilder = createMockQueryBuilder();
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.insert.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult({ id: 'piece-1', quality_rating: rating })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          const result = await service.create(
            createDto as any,
            TEST_IDS.organization,
            TEST_IDS.farm,
            TEST_IDS.user
          );

          expect(result).toBeDefined();
        }
      );

      it('should handle null quality rating', async () => {
        const createDto = {
          worker_id: TEST_IDS.worker,
          work_date: TEST_DATES.today,
          work_unit_id: 'unit-1',
          units_completed: 100,
          rate_per_unit: 5,
          quality_rating: null,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({ id: 'piece-1', quality_rating: null })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          createDto as any,
          TEST_IDS.organization,
          TEST_IDS.farm,
          TEST_IDS.user
        );

        expect(result).toBeDefined();
      });
    });

    describe('Time Tracking Edge Cases', () => {
      it('should handle break_duration of 0', async () => {
        const createDto = {
          worker_id: TEST_IDS.worker,
          work_date: TEST_DATES.today,
          work_unit_id: 'unit-1',
          units_completed: 100,
          rate_per_unit: 5,
          start_time: '08:00',
          end_time: '17:00',
          break_duration: 0,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({ id: 'piece-1', break_duration: 0 })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          createDto as any,
          TEST_IDS.organization,
          TEST_IDS.farm,
          TEST_IDS.user
        );

        expect(result).toBeDefined();
      });

      it('should handle missing time fields', async () => {
        const createDto = {
          worker_id: TEST_IDS.worker,
          work_date: TEST_DATES.today,
          work_unit_id: 'unit-1',
          units_completed: 100,
          rate_per_unit: 5,
          // start_time, end_time, break_duration not provided
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'piece-1',
            start_time: null,
            end_time: null,
            break_duration: 0,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          createDto as any,
          TEST_IDS.organization,
          TEST_IDS.farm,
          TEST_IDS.user
        );

        expect(result).toBeDefined();
      });
    });

    describe('Payment Status Transitions', () => {
      it.each(PAYMENT_STATUSES)(
        'should handle record with payment_status: %s',
        async (status) => {
          const record = {
            ...MOCK_PIECE_WORK_RECORDS[0],
            payment_status: status,
          };

          const queryBuilder = createMockQueryBuilder();
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(record));
          mockClient.from.mockReturnValue(queryBuilder);

          // Attempt to delete (should fail only if paid)
          if (status === 'paid') {
            await expect(
              service.delete(record.id, TEST_IDS.organization)
            ).rejects.toThrow(BadRequestException);
          } else {
            const deleteQB = createMockQueryBuilder();
            deleteQB.eq.mockReturnValue(deleteQB);
            mockClient.from.mockReturnValue(deleteQB);

            const result = await service.delete(
              record.id,
              TEST_IDS.organization
            );
            expect(result).toBeDefined();
          }
        }
      );
    });

    describe('Calculation Edge Cases', () => {
      it('should handle very large units_completed values', async () => {
        const createDto = {
          worker_id: TEST_IDS.worker,
          work_date: TEST_DATES.today,
          work_unit_id: 'unit-1',
          units_completed: 1000000,
          rate_per_unit: 0.01,
        };

        const expectedTotal = 10000;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({ id: 'piece-1', total_amount: expectedTotal })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          createDto as any,
          TEST_IDS.organization,
          TEST_IDS.farm,
          TEST_IDS.user
        );

        expect(result).toBeDefined();
      });

      it('should handle decimal rate_per_unit values', async () => {
        const createDto = {
          worker_id: TEST_IDS.worker,
          work_date: TEST_DATES.today,
          work_unit_id: 'unit-1',
          units_completed: 100,
          rate_per_unit: 5.75,
        };

        const expectedTotal = 575;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({ id: 'piece-1', total_amount: expectedTotal })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          createDto as any,
          TEST_IDS.organization,
          TEST_IDS.farm,
          TEST_IDS.user
        );

        expect(result).toBeDefined();
      });
    });

    describe('Search Functionality', () => {
      it('should handle empty search string', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.ilike.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_PIECE_WORK_RECORDS));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, TEST_IDS.farm, {
          search: '',
        });

        expect(result).toBeDefined();
      });

      it('should handle search with special characters', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.ilike.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_PIECE_WORK_RECORDS));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, TEST_IDS.farm, {
          search: "Côte d'Ivoire",
        });

        expect(result).toBeDefined();
      });
    });

    describe('Date Range Edge Cases', () => {
      it('should handle start_date equal to end_date', async () => {
        const sameDate = TEST_DATES.today;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.gte.mockReturnValue(queryBuilder);
        queryBuilder.lte.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_PIECE_WORK_RECORDS));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(
          TEST_IDS.organization,
          TEST_IDS.farm,
          {
            start_date: sameDate,
            end_date: sameDate,
          }
        );

        expect(result).toBeDefined();
      });

      it('should handle end_date before start_date', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.gte.mockReturnValue(queryBuilder);
        queryBuilder.lte.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(
          TEST_IDS.organization,
          TEST_IDS.farm,
          {
            start_date: TEST_DATES.today,
            end_date: TEST_DATES.yesterday,
          }
        );

        // Should return empty result since no dates match the range
        expect(result).toEqual([]);
      });
    });
  });

  // ============================================================
  // PARAMETERIZED TESTS - PAYMENT STATUSES
  // ============================================================

  describe('Payment Status Workflows (Parameterized)', () => {
    it.each([
      { from: 'pending', to: 'approved', action: 'verify' },
      { from: 'pending', to: 'paid', action: 'process_payment' },
      { from: 'approved', to: 'paid', action: 'process_payment' },
    ])(
      'should handle transition from $from to $to via $action',
      async ({ from, to }) => {
        const record = {
          ...MOCK_PIECE_WORK_RECORDS[0],
          payment_status: from,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(record));
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({ ...record, payment_status: to })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        if (to === 'approved') {
          const result = await service.verify(
            record.id,
            TEST_IDS.organization,
            TEST_IDS.user
          );
          expect(result.payment_status).toBe('approved');
        }
      }
    );
  });

  // ============================================================
  // VERIFICATION WORKFLOW TESTS
  // ============================================================

  describe('Verification Workflow', () => {
    it('should set verified_at timestamp when verifying', async () => {
      const beforeVerification = new Date();

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_PIECE_WORK_RECORDS[0],
          verified_at: new Date().toISOString(),
        })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.verify(
        MOCK_PIECE_WORK_RECORDS[0].id,
        TEST_IDS.organization,
        TEST_IDS.user
      );

      const afterVerification = new Date();

      expect(result.verified_at).toBeDefined();
      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          verified_by: TEST_IDS.user,
          verified_at: expect.any(String),
        })
      );
    });

    it('should not allow verification of already verified records', async () => {
      const alreadyVerified = {
        ...MOCK_PIECE_WORK_RECORDS[0],
        verified_by: 'other-user',
        verified_at: TEST_DATES.yesterday,
        payment_status: 'approved',
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult(alreadyVerified)
      );
      mockClient.from.mockReturnValue(queryBuilder);

      // Service should still update, allowing re-verification
      const result = await service.verify(
        alreadyVerified.id,
        TEST_IDS.organization,
        TEST_IDS.user
      );

      expect(result).toBeDefined();
    });
  });
});
