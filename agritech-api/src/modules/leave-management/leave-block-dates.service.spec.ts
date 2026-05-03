import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LeaveBlockDatesService } from './leave-block-dates.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('LeaveBlockDatesService', () => {
  let service: LeaveBlockDatesService;
  let mockClient: MockSupabaseClient;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveBlockDatesService,
        { provide: DatabaseService, useValue: { getAdminClient: () => mockClient } },
      ],
    }).compile();
    service = module.get(LeaveBlockDatesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create — multi-tenant guard', () => {
    it('rejects a foreign-org leave_type_id', async () => {
      const leaveTypeBuilder = createMockQueryBuilder();
      leaveTypeBuilder.eq.mockReturnValue(leaveTypeBuilder);
      leaveTypeBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));
      mockClient.from.mockReturnValue(leaveTypeBuilder);

      await expect(
        service.create(TEST_IDS.organization, TEST_IDS.user, {
          block_date: '2026-12-25',
          reason: 'Holiday',
          leave_type_id: 'foreign-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('inserts when leave_type_id belongs to org', async () => {
      const leaveTypeBuilder = createMockQueryBuilder();
      leaveTypeBuilder.eq.mockReturnValue(leaveTypeBuilder);
      leaveTypeBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ id: 'lt-1' }));

      const insertBuilder = createMockQueryBuilder();
      insertBuilder.insert.mockReturnValue(insertBuilder);
      insertBuilder.select.mockReturnValue(insertBuilder);
      insertBuilder.single.mockResolvedValue(
        mockQueryResult({ id: 'block-1', block_date: '2026-12-25', reason: 'Holiday' }),
      );

      mockClient.from
        .mockReturnValueOnce(leaveTypeBuilder)
        .mockReturnValueOnce(insertBuilder);

      const result = await service.create(TEST_IDS.organization, TEST_IDS.user, {
        block_date: '2026-12-25',
        reason: 'Holiday',
        leave_type_id: 'lt-1',
      });
      expect(result.id).toBe('block-1');
    });
  });

  describe('overlapsBlockDate — error surfacing', () => {
    it('throws (not silently false) when the underlying query errors', async () => {
      const builder = createMockQueryBuilder();
      builder.eq.mockReturnValue(builder);
      builder.gte.mockReturnValue(builder);
      builder.lte.mockReturnValue(builder);
      builder.limit.mockResolvedValue(mockQueryResult(null, { message: 'connection refused' }));
      mockClient.from.mockReturnValue(builder);

      await expect(
        service.overlapsBlockDate(TEST_IDS.organization, '2026-01-01', '2026-01-05'),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns true when at least one block-date row overlaps', async () => {
      const builder = createMockQueryBuilder();
      builder.eq.mockReturnValue(builder);
      builder.gte.mockReturnValue(builder);
      builder.lte.mockReturnValue(builder);
      builder.limit.mockResolvedValue(mockQueryResult([{ id: 'b-1' }]));
      mockClient.from.mockReturnValue(builder);

      const overlaps = await service.overlapsBlockDate(
        TEST_IDS.organization,
        '2026-01-01',
        '2026-01-05',
      );
      expect(overlaps).toBe(true);
    });
  });
});
