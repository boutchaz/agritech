import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import { StockEntryApprovalsService } from './stock-entry-approvals.service';
import { DatabaseService } from '../database/database.service';
import { StockReservationsService } from './stock-reservations.service';
import { StockEntryStatus, StockEntryType } from './dto/create-stock-entry.dto';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('StockEntryApprovalsService', () => {
  type QueryResult = { rows: any[] };
  type QueryHandler = (query: string, values?: unknown[]) => QueryResult | Promise<QueryResult>;
  type QueryMock = jest.MockedFunction<QueryHandler>;

  let service: StockEntryApprovalsService;
  let moduleRef: TestingModule;
  let mockPgClient: {
    query: QueryMock;
    release: jest.Mock<() => void>;
  };
  let mockDatabaseService: {
    executeInPgTransaction: any;
    getPgPool: any;
  };
  let mockStockReservationsService: {
    releaseReservationsForReference: jest.Mock<(...args: any[]) => Promise<void>>;
  };

  const pgResult = (rows: any[] = []): Promise<QueryResult> => Promise.resolve({ rows });

  const createPgQueryMock = (handler?: QueryHandler): QueryMock => {
    const mock = jest.fn<QueryHandler>();
    mock.mockImplementation(async (query: string, values?: unknown[]) => {
      if (handler) {
        return handler(query, values);
      }

      return { rows: [] };
    });

    return mock;
  };

  beforeEach(async () => {
    mockPgClient = {
      query: createPgQueryMock(),
      release: jest.fn<() => void>(),
    };

    mockDatabaseService = {
      executeInPgTransaction: jest.fn(async (operation: (client: PoolClient) => Promise<unknown>) =>
        operation(mockPgClient as unknown as PoolClient),
      ),
      getPgPool: jest.fn(() => ({
        connect: jest.fn(async () => mockPgClient as unknown as PoolClient),
      })),
    };

    mockStockReservationsService = {
      releaseReservationsForReference: jest.fn<(...args: any[]) => Promise<void>>().mockResolvedValue(undefined),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        StockEntryApprovalsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: StockReservationsService, useValue: mockStockReservationsService },
      ],
    }).compile();

    service = moduleRef.get<StockEntryApprovalsService>(StockEntryApprovalsService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    await moduleRef.close();
  });

  it('requestApproval changes entry status to Submitted', async () => {
    mockPgClient.query = createPgQueryMock((query: string) => {
      if (query.includes('FROM stock_entries')) {
        return pgResult([{ id: 'se1', organization_id: TEST_IDS.organization, status: StockEntryStatus.DRAFT }]);
      }

      if (query.includes('FROM stock_entry_approvals')) {
        return pgResult([]);
      }

      if (query.includes('INSERT INTO stock_entry_approvals')) {
        return pgResult([{ id: 'approval1', stock_entry_id: 'se1', status: 'pending' }]);
      }

      if (query.includes('UPDATE stock_entries')) {
        return pgResult([{ id: 'se1', status: StockEntryStatus.SUBMITTED }]);
      }

      return pgResult();
    });

    const result = await service.requestApproval('se1', TEST_IDS.organization, TEST_IDS.user);

    expect(result).toEqual(expect.objectContaining({ id: 'approval1', status: 'pending' }));
    expect(mockPgClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE stock_entries'),
      [StockEntryStatus.SUBMITTED, TEST_IDS.user, 'se1', TEST_IDS.organization],
    );
  });

  it('approveEntry sets approval status to approved', async () => {
    mockPgClient.query = createPgQueryMock((query: string) => {
      if (query.includes('FROM stock_entry_approvals sea')) {
        return pgResult([{ id: 'approval1', stock_entry_id: 'se1', organization_id: TEST_IDS.organization, status: 'pending' }]);
      }

      if (query.includes("SET status = 'approved'")) {
        return pgResult([{ id: 'approval1', stock_entry_id: 'se1', status: 'approved', approved_by: TEST_IDS.user }]);
      }

      return pgResult();
    });

    const result = await service.approveEntry('approval1', TEST_IDS.organization, TEST_IDS.user);

    expect(result).toEqual(
      expect.objectContaining({
        id: 'approval1',
        status: 'approved',
        approved_by: TEST_IDS.user,
      }),
    );
  });

  it('rejectEntry reverts entry status to Draft and stores reason', async () => {
    mockPgClient.query = createPgQueryMock((query: string) => {
      if (query.includes('FROM stock_entry_approvals sea')) {
        return pgResult([{ id: 'approval1', stock_entry_id: 'se1', organization_id: TEST_IDS.organization, status: 'pending' }]);
      }

      if (query.includes("SET status = 'rejected'")) {
        return pgResult([
          {
            id: 'approval1',
            stock_entry_id: 'se1',
            status: 'rejected',
            rejection_reason: 'Need manager review',
          },
        ]);
      }

      if (query.includes('UPDATE stock_entries')) {
        return pgResult([{ id: 'se1', status: StockEntryStatus.DRAFT }]);
      }

      return pgResult();
    });

    const result = await service.rejectEntry(
      'approval1',
      TEST_IDS.organization,
      TEST_IDS.user,
      'Need manager review',
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'approval1',
        status: 'rejected',
        rejection_reason: 'Need manager review',
      }),
    );
    expect(mockPgClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE stock_entries'),
      [StockEntryStatus.DRAFT, TEST_IDS.user, 'se1', TEST_IDS.organization],
    );
    expect(mockStockReservationsService.releaseReservationsForReference).toHaveBeenCalledWith(
      'stock_entry',
      'se1',
      TEST_IDS.organization,
      mockPgClient,
    );
  });

  it('requiresApproval returns correct values for role matrix', async () => {
    await expect(
      service.requiresApproval('day_laborer', StockEntryType.MATERIAL_RECEIPT, 100),
    ).resolves.toBe(true);
    await expect(
      service.requiresApproval('farm_worker', StockEntryType.MATERIAL_ISSUE, 100),
    ).resolves.toBe(true);
    await expect(
      service.requiresApproval('farm_manager', StockEntryType.STOCK_TRANSFER, 10001),
    ).resolves.toBe(true);
    await expect(
      service.requiresApproval('farm_manager', StockEntryType.STOCK_TRANSFER, 10000),
    ).resolves.toBe(false);
    await expect(
      service.requiresApproval('farm_manager', StockEntryType.MATERIAL_RECEIPT, 50000),
    ).resolves.toBe(false);
    await expect(
      service.requiresApproval('organization_admin', StockEntryType.STOCK_TRANSFER, 999999),
    ).resolves.toBe(false);
    await expect(
      service.requiresApproval('system_admin', StockEntryType.STOCK_TRANSFER, 999999),
    ).resolves.toBe(false);
  });

  it('rejectEntry requires a reason', async () => {
    await expect(
      service.rejectEntry('approval1', TEST_IDS.organization, TEST_IDS.user, ''),
    ).rejects.toThrow(new BadRequestException('Rejection reason is required'));
  });
});
