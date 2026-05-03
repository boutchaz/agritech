import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LeaveEncashmentsService } from './leave-encashments.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('LeaveEncashmentsService', () => {
  let service: LeaveEncashmentsService;
  let mockClient: MockSupabaseClient;
  let pgQuery: jest.Mock;
  let mockNotifications: { createNotification: jest.Mock };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    pgQuery = jest.fn();
    mockNotifications = { createNotification: jest.fn().mockResolvedValue(undefined) };

    const mockDb = {
      getAdminClient: () => mockClient,
      executeInPgTransaction: jest.fn(async (fn: any) => fn({ query: pgQuery })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveEncashmentsService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = module.get(LeaveEncashmentsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('rejects when allocation belongs to a different worker (cross-tenant guard)', async () => {
      pgQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 'alloc-1',
          remaining_days: 10,
          used_days: 0,
          encashed_days: 0,
          total_days: 10,
          worker_id: 'OTHER-worker',
        }],
      });

      await expect(
        service.create(TEST_IDS.organization, TEST_IDS.user, {
          worker_id: 'expected-worker',
          leave_type_id: 'lt-1',
          leave_allocation_id: 'alloc-1',
          days_encashed: 2,
          amount_per_day: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects insufficient balance', async () => {
      pgQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 'alloc-1',
          remaining_days: 1,
          used_days: 9,
          encashed_days: 0,
          total_days: 10,
          worker_id: 'worker-1',
        }],
      });

      await expect(
        service.create(TEST_IDS.organization, TEST_IDS.user, {
          worker_id: 'worker-1',
          leave_type_id: 'lt-1',
          leave_allocation_id: 'alloc-1',
          days_encashed: 5,
          amount_per_day: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rounds money to 2 decimals (3 days × 33.33 = 99.99, not 99.98999...)', async () => {
      pgQuery
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{
            id: 'alloc-1',
            remaining_days: 10,
            used_days: 0,
            encashed_days: 0,
            total_days: 10,
            worker_id: 'worker-1',
          }],
        })
        .mockImplementationOnce((_sql: string, params: any[]) => {
          const totalAmountParam = params[6];
          expect(totalAmountParam).toBe(99.99);
          return Promise.resolve({
            rowCount: 1,
            rows: [{ id: 'enc-1', total_amount: 99.99 }],
          });
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const workerBuilder = createMockQueryBuilder();
      workerBuilder.eq.mockReturnValue(workerBuilder);
      workerBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ user_id: null }));
      mockClient.from.mockReturnValue(workerBuilder);

      const result = await service.create(TEST_IDS.organization, TEST_IDS.user, {
        worker_id: 'worker-1',
        leave_type_id: 'lt-1',
        leave_allocation_id: 'alloc-1',
        days_encashed: 3,
        amount_per_day: 33.33,
      });

      expect(result.total_amount).toBe(99.99);
    });
  });

  describe('cancel — authorization', () => {
    const buildGetOne = (encashment: any) => {
      const b = createMockQueryBuilder();
      b.eq.mockReturnValue(b);
      b.single.mockResolvedValue(mockQueryResult(encashment));
      return b;
    };

    it('non-admin cannot cancel an approved encashment (Forbidden)', async () => {
      const enc = { id: 'enc-1', status: 'approved', worker_id: 'w-1', days_encashed: 2, leave_allocation_id: 'a-1' };
      mockClient.from.mockReturnValue(buildGetOne(enc));

      await expect(
        service.cancel(TEST_IDS.organization, TEST_IDS.user, 'enc-1', 'farm_worker'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('non-owner non-admin cannot cancel pending encashment (Forbidden)', async () => {
      const enc = { id: 'enc-1', status: 'pending', worker_id: 'w-other', days_encashed: 2, leave_allocation_id: 'a-1' };
      const getOneBuilder = buildGetOne(enc);

      const workerBuilder = createMockQueryBuilder();
      workerBuilder.eq.mockReturnValue(workerBuilder);
      workerBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ user_id: 'someone-else' }));

      mockClient.from
        .mockReturnValueOnce(getOneBuilder)
        .mockReturnValueOnce(workerBuilder);

      await expect(
        service.cancel(TEST_IDS.organization, TEST_IDS.user, 'enc-1', 'farm_worker'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('admin can cancel an approved encashment, allocation counter reverses', async () => {
      const enc = { id: 'enc-1', status: 'approved', worker_id: 'w-1', days_encashed: 2, leave_allocation_id: 'a-1' };
      mockClient.from.mockReturnValue(buildGetOne(enc));

      pgQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await service.cancel(TEST_IDS.organization, TEST_IDS.user, 'enc-1', 'organization_admin');

      expect(pgQuery).toHaveBeenCalledTimes(2);
      const secondCallSql = pgQuery.mock.calls[1][0];
      expect(secondCallSql).toMatch(/leave_allocations/);
      expect(secondCallSql).toMatch(/GREATEST/);
    });
  });
});
