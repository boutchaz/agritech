import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, expect, it, jest } from '@jest/globals';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { SequencesService } from '../../sequences/sequences.service';
import { StockAccountingService } from '../stock-accounting.service';
import { StockEntryApprovalsService } from '../stock-entry-approvals.service';
import { StockEntriesService } from '../stock-entries.service';
import { StockReservationsService } from '../stock-reservations.service';
import { StockEntryType, ValuationMethod } from '../dto/create-stock-entry.dto';
import { AccountsService } from '../../accounts/accounts.service';

type ValuationResult = {
  totalCost: number;
  consumedBatches: Array<{ batchId: string; quantity: number; cost: number }>;
};

type MockQueryResult = {
  rows: Array<Record<string, unknown>>;
};

type MockClient = {
  query: jest.Mock;
};

type ValuationInvoker = (
  client: MockClient,
  organizationId: string,
  itemId: string,
  variantId: string | null,
  warehouseId: string,
  quantity: number,
  method?: ValuationMethod,
  options?: { preferExpiryDate?: boolean; itemName?: string },
) => Promise<ValuationResult>;

type ReversalInvoker = (
  client: MockClient,
  originalEntry: Record<string, unknown>,
  reversalEntry: Record<string, unknown>,
  item: Record<string, unknown>,
  reversalItem: Record<string, unknown>,
) => Promise<void>;

const createMockClient = (...results: MockQueryResult[]): MockClient => {
  const queue = [...results];
  const query = jest.fn(async () => queue.shift() ?? { rows: [] });
  return { query };
};

const mockDatabaseService = {
  getAdminClient: jest.fn(),
  getPgPool: jest.fn(),
  getPool: jest.fn(),
};

const mockSequencesService = {
  generateStockEntryNumber: jest.fn(),
};

const mockStockAccountingService = {
  createJournalEntryForStockEntry: jest.fn(),
  createReversalJournalEntry: jest.fn(),
};

const mockNotificationsService = {
  createNotificationsForUsers: jest.fn(),
};

const mockStockReservationsService = {
  reserveStock: jest.fn(),
  releaseReservationsForReference: jest.fn(),
  fulfillReservationsForReference: jest.fn(),
};

const mockStockEntryApprovalsService = {
  assertApprovedForPosting: jest.fn(),
  resolveUserRole: jest.fn(),
  requiresApproval: jest.fn(),
  requestApprovalInTransaction: jest.fn(),
};

const mockAccountsService = {
  seedMoroccanChartOfAccounts: jest.fn(),
};

describe('StockEntriesService — Valuation', () => {
  let service: StockEntriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockEntriesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: SequencesService, useValue: mockSequencesService },
        { provide: StockAccountingService, useValue: mockStockAccountingService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: StockReservationsService, useValue: mockStockReservationsService },
        { provide: StockEntryApprovalsService, useValue: mockStockEntryApprovalsService },
        { provide: AccountsService, useValue: mockAccountsService },
      ],
    }).compile();

    service = module.get<StockEntriesService>(StockEntriesService);
    jest.clearAllMocks();
  });

  describe('FIFO valuation', () => {
    it('should consume oldest batches first and produce deterministic COGS', async () => {
      const client = createMockClient(
        {
          rows: [
            { id: 'batch-a', remaining_quantity: '10', cost_per_unit: '100', expiry_date: null },
            { id: 'batch-b', remaining_quantity: '5', cost_per_unit: '120', expiry_date: null },
          ],
        },
        { rows: [] },
        { rows: [] },
      );

      const consumeValuation: ValuationInvoker = Reflect.get(service, 'consumeValuation').bind(service);

      const result = await consumeValuation(
        client,
        'org-1',
        'item-1',
        null,
        'warehouse-1',
        12,
        ValuationMethod.FIFO,
      );

      expect(result.totalCost).toBe(1240);
      expect(result.consumedBatches).toEqual([
        { batchId: 'batch-a', quantity: 10, cost: 1000 },
        { batchId: 'batch-b', quantity: 2, cost: 240 },
      ]);
      expect(client.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE stock_valuation'),
        [10, 'batch-a'],
      );
      expect(client.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE stock_valuation'),
        [2, 'batch-b'],
      );
    });
  });

  describe('Moving Average valuation', () => {
    it('should calculate weighted average after each receipt', async () => {
      const client = createMockClient(
        {
          rows: [
            { id: 'batch-a', remaining_quantity: '10', cost_per_unit: '100' },
            { id: 'batch-b', remaining_quantity: '10', cost_per_unit: '200' },
          ],
        },
        { rows: [] },
        { rows: [] },
      );

      const consumeValuation: ValuationInvoker = Reflect.get(service, 'consumeValuation').bind(service);

      const result = await consumeValuation(
        client,
        'org-1',
        'item-1',
        null,
        'warehouse-1',
        5,
        ValuationMethod.MOVING_AVERAGE,
      );

      expect(result.totalCost).toBe(750);
      expect(result.consumedBatches).toHaveLength(2);
      expect(result.consumedBatches[0]).toEqual({ batchId: 'batch-a', quantity: 2.5, cost: 375 });
      expect(result.consumedBatches[1]).toEqual({ batchId: 'batch-b', quantity: 2.5, cost: 375 });
      expect(client.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE stock_valuation'),
        [2.5, 'batch-a'],
      );
      expect(client.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE stock_valuation'),
        [2.5, 'batch-b'],
      );
    });
  });

  describe('Valuation reversal', () => {
    it('should restore stock_valuation on cancel/reversal', async () => {
      const client = createMockClient(
        { rows: [{ cost_per_unit: '103.3333333333', total_cost: '1240' }] },
        { rows: [] },
        { rows: [{ current_balance: '8' }] },
        { rows: [] },
      );

      const processReversalMovements: ReversalInvoker = Reflect.get(service, 'processReversalMovements').bind(service);

      await processReversalMovements(
        client,
        {
          id: 'entry-1',
          organization_id: 'org-1',
          entry_type: StockEntryType.MATERIAL_ISSUE,
          from_warehouse_id: 'warehouse-1',
        },
        {
          id: 'reversal-1',
          entry_date: '2026-01-10',
        },
        {
          id: 'item-line-1',
          item_id: 'item-1',
          variant_id: null,
          quantity: 12,
          unit: 'kg',
          cost_per_unit: 103.3333333333,
          batch_number: 'BATCH-01',
          serial_number: null,
        },
        {
          id: 'reversal-item-line-1',
        },
      );

      expect(client.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO stock_valuation'),
        expect.any(Array),
      );
      expect(client.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO stock_movements'),
        expect.any(Array),
      );

      const movementParams = client.query.mock.calls[3][1] as unknown[];
      const valuationInsertParams = client.query.mock.calls[1][1] as unknown[];
      expect(valuationInsertParams.slice(0, 6)).toEqual([
        'org-1',
        'item-1',
        null,
        'warehouse-1',
        12,
        expect.any(Number),
      ]);
      expect(valuationInsertParams[6]).toBeCloseTo(1240, 8);
      expect(valuationInsertParams.slice(7)).toEqual(['reversal-1', 'BATCH-01', null, 12]);

      expect(movementParams.slice(0, 9)).toEqual([
        'org-1',
        'item-1',
        null,
        'warehouse-1',
        'IN',
        '2026-01-10',
        12,
        'kg',
        20,
      ]);
      expect(movementParams[9]).toBeCloseTo(103.33333333333333, 8);
      expect(movementParams[10]).toBeCloseTo(1240, 8);
      expect(movementParams.slice(11)).toEqual(['reversal-1', 'reversal-item-line-1', 'BATCH-01', null]);
    });
  });

  describe('FEFO policy', () => {
    it('should skip expired batches and issue from valid ones', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const client = createMockClient(
        {
          rows: [
            { id: 'expired-batch', remaining_quantity: '5', cost_per_unit: '50', expiry_date: yesterday.toISOString() },
            { id: 'valid-batch', remaining_quantity: '10', cost_per_unit: '60', expiry_date: nextMonth.toISOString() },
          ],
        },
        { rows: [] },
      );

      const consumeValuation: ValuationInvoker = Reflect.get(service, 'consumeValuation').bind(service);

      const result = await consumeValuation(
        client,
        'org-1',
        'item-1',
        null,
        'warehouse-1',
        3,
        ValuationMethod.FIFO,
        { preferExpiryDate: true, itemName: 'Seed lot' },
      );

      expect(result.totalCost).toBe(180);
      expect(result.consumedBatches).toEqual([{ batchId: 'valid-batch', quantity: 3, cost: 180 }]);
      expect(client.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE stock_valuation'),
        [3, 'valid-batch'],
      );
    });

    it('should throw when all batches are expired', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const client = createMockClient({
          rows: [
            { id: 'expired-a', remaining_quantity: '5', cost_per_unit: '50', expiry_date: yesterday.toISOString() },
            { id: 'expired-b', remaining_quantity: '10', cost_per_unit: '60', expiry_date: yesterday.toISOString() },
          ],
        });

      const consumeValuation: ValuationInvoker = Reflect.get(service, 'consumeValuation').bind(service);

      await expect(
        consumeValuation(
          client,
          'org-1',
          'item-1',
          null,
          'warehouse-1',
          3,
          ValuationMethod.FIFO,
          { preferExpiryDate: true, itemName: 'Seed lot' },
        ),
      ).rejects.toThrow(new BadRequestException('All available batches for item Seed lot have expired'));
    });
  });
});
