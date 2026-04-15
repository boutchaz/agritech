import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import { StockReservationsService } from './stock-reservations.service';
import { DatabaseService } from '../database/database.service';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('StockReservationsService', () => {
  type QueryResult = { rows: any[]; rowCount?: number };
  type QueryHandler = (query: string, values?: unknown[]) => QueryResult | Promise<QueryResult>;
  type QueryMock = jest.MockedFunction<QueryHandler>;

  let service: StockReservationsService;
  let moduleRef: TestingModule;
  let mockDatabaseService: {
    getPgPool: jest.Mock;
  };
  let mockPool: {
    connect: jest.Mock<() => Promise<PoolClient>>;
  };
  let mockPgClient: {
    query: QueryMock;
    release: jest.Mock<() => void>;
  };

  const pgResult = (rows: any[] = [], rowCount?: number): Promise<QueryResult> =>
    Promise.resolve({ rows, rowCount });

  const createPgQueryMock = (handler?: QueryHandler): QueryMock => {
    const mock = jest.fn<QueryHandler>();
    mock.mockImplementation(async (query: string, values?: unknown[]) => {
      if (
        query.includes('BEGIN') ||
        query.includes('COMMIT') ||
        query.includes('ROLLBACK')
      ) {
        return { rows: [] };
      }

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

    mockPool = {
      connect: jest.fn<() => Promise<PoolClient>>().mockResolvedValue(mockPgClient as unknown as PoolClient),
    };

    mockDatabaseService = {
      getPgPool: jest.fn(() => mockPool),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        StockReservationsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = moduleRef.get<StockReservationsService>(StockReservationsService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    await moduleRef.close();
  });

  it('reserveStock succeeds when sufficient available', async () => {
    mockPgClient.query = createPgQueryMock((query: string) => {
      if (query.includes('SUM(quantity), 0) as total')) {
        return pgResult([{ total: '20' }]);
      }

      if (query.includes('SUM(quantity), 0) as reserved')) {
        return pgResult([{ reserved: '5' }]);
      }

      if (query.includes('INSERT INTO stock_reservations')) {
        return pgResult([{ id: 'res1', quantity: 10, status: 'active' }]);
      }

      return pgResult();
    });

    const result = await service.reserveStock({
      organizationId: TEST_IDS.organization,
      itemId: 'item1',
      warehouseId: 'wh1',
      quantity: 10,
      reservedBy: TEST_IDS.user,
      referenceType: 'stock_entry',
      referenceId: 'se1',
    });

    expect(result).toEqual(expect.objectContaining({ id: 'res1', status: 'active' }));
  });

  it('reserveStock fails when insufficient available quantity remains', async () => {
    mockPgClient.query = createPgQueryMock((query: string) => {
      if (query.includes('SUM(quantity), 0) as total')) {
        return pgResult([{ total: '10' }]);
      }

      if (query.includes('SUM(quantity), 0) as reserved')) {
        return pgResult([{ reserved: '6' }]);
      }

      return pgResult();
    });

    await expect(
      service.reserveStock({
        organizationId: TEST_IDS.organization,
        itemId: 'item1',
        warehouseId: 'wh1',
        quantity: 5,
        reservedBy: TEST_IDS.user,
        referenceType: 'stock_entry',
        referenceId: 'se1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('releaseReservation sets status to released', async () => {
    mockPgClient.query = createPgQueryMock(() => pgResult());

    await service.releaseReservation('res1', TEST_IDS.organization);

    expect(mockPgClient.query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'released'"),
      ['res1', TEST_IDS.organization],
    );
  });

  it('fulfillReservation sets status to fulfilled', async () => {
    mockPgClient.query = createPgQueryMock(() => pgResult());

    await service.fulfillReservation('res1', TEST_IDS.organization);

    expect(mockPgClient.query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'fulfilled'"),
      ['res1', TEST_IDS.organization],
    );
  });

  it('getAvailableQuantity subtracts active reservations from total stock', async () => {
    mockPgClient.query = createPgQueryMock((query: string) => {
      if (query.includes('FROM stock_movements')) {
        return pgResult([{ total: '25' }]);
      }

      if (query.includes('FROM stock_reservations')) {
        return pgResult([{ reserved: '7' }]);
      }

      return pgResult();
    });

    const result = await service.getAvailableQuantity(
      TEST_IDS.organization,
      'item1',
      'wh1',
      'variant1',
    );

    expect(result).toBe(18);
  });
});
