import { Test, TestingModule } from '@nestjs/testing';
import { ProfitabilityService } from './profitability.service';
import { DatabaseService } from '../database/database.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('ProfitabilityService', () => {
  let service: ProfitabilityService;
  let mockClient: MockSupabaseClient;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfitabilityService,
        {
          provide: DatabaseService,
          useValue: { getAdminClient: jest.fn(() => mockClient) },
        },
        {
          provide: AccountingAutomationService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ProfitabilityService>(ProfitabilityService);
  });

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Creates a chainable Supabase query builder mock that resolves to { data, error }.
   * All chaining methods (.select, .eq, .gte, .lte, .order) return `this`.
   * Awaiting or calling .then() resolves the data.
   */
  function createResolvingQueryBuilder(data: any[], error: any = null) {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      // Make awaitable — supabase queries are thenables
      then: jest.fn((resolve: any) => resolve({ data, error })),
    };
    return qb;
  }

  function setupCostsAndRevenues(
    costs: any[],
    revenues: any[],
  ) {
    const costsQb = createResolvingQueryBuilder(costs);
    const revenuesQb = createResolvingQueryBuilder(revenues);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'costs') return costsQb;
      if (table === 'revenues') return revenuesQb;
      return createResolvingQueryBuilder([]);
    });
  }

  // ============================================================
  // PROFITABILITY AGGREGATION TESTS
  // ============================================================

  describe('getProfitability', () => {
    it('calculates correct totals from costs and revenues', async () => {
      setupCostsAndRevenues(
        [
          { amount: 12000, cost_type: 'labor', parcel_id: 'p1', parcel: { name: 'Olives' } },
          { amount: 5000, cost_type: 'materials', parcel_id: 'p1', parcel: { name: 'Olives' } },
          { amount: 8000, cost_type: 'labor', parcel_id: 'p2', parcel: { name: 'Citrus' } },
        ],
        [
          { amount: 35000, revenue_type: 'harvest', parcel_id: 'p1', parcel: { name: 'Olives' } },
          { amount: 20000, revenue_type: 'harvest', parcel_id: 'p2', parcel: { name: 'Citrus' } },
        ],
      );

      const result = await service.getProfitability(TEST_IDS.organization, {});

      // Totals: costs=25,000, revenue=55,000
      expect(result.totalCosts).toBe(25000);
      expect(result.totalRevenue).toBe(55000);
      expect(result.netProfit).toBe(30000);
      // Margin: 30,000 / 55,000 * 100 ≈ 54.55%
      expect(result.profitMargin).toBeCloseTo(54.55, 1);
    });

    it('groups costs by type correctly', async () => {
      setupCostsAndRevenues(
        [
          { amount: 10000, cost_type: 'labor' },
          { amount: 3000, cost_type: 'materials' },
          { amount: 7000, cost_type: 'labor' },
        ],
        [],
      );

      const result = await service.getProfitability(TEST_IDS.organization, {});

      expect(result.costBreakdown).toEqual({
        labor: 17000,
        materials: 3000,
      });
    });

    it('groups revenues by type correctly', async () => {
      setupCostsAndRevenues(
        [],
        [
          { amount: 40000, revenue_type: 'harvest' },
          { amount: 5000, revenue_type: 'subsidy' },
          { amount: 10000, revenue_type: 'harvest' },
        ],
      );

      const result = await service.getProfitability(TEST_IDS.organization, {});

      expect(result.revenueBreakdown).toEqual({
        harvest: 50000,
        subsidy: 5000,
      });
    });

    it('computes per-parcel profitability with margins', async () => {
      setupCostsAndRevenues(
        [
          { amount: 8000, cost_type: 'labor', parcel_id: 'p1', parcel: { name: 'Olives A' } },
          { amount: 2000, cost_type: 'labor', parcel_id: 'p2', parcel: { name: 'Wheat B' } },
        ],
        [
          { amount: 15000, revenue_type: 'harvest', parcel_id: 'p1', parcel: { name: 'Olives A' } },
          { amount: 1000, revenue_type: 'harvest', parcel_id: 'p2', parcel: { name: 'Wheat B' } },
        ],
      );

      const result = await service.getProfitability(TEST_IDS.organization, {});

      expect(result.byParcel).toHaveLength(2);

      const olives = result.byParcel.find((p: any) => p.parcel_id === 'p1');
      expect(olives.total_costs).toBe(8000);
      expect(olives.total_revenue).toBe(15000);
      expect(olives.net_profit).toBe(7000);
      expect(olives.profit_margin).toBeCloseTo(46.67, 1);

      const wheat = result.byParcel.find((p: any) => p.parcel_id === 'p2');
      expect(wheat.net_profit).toBe(-1000);
      expect(wheat.profit_margin).toBe(-100);
    });

    it('returns 0 margin when revenue is 0 (no division by zero)', async () => {
      setupCostsAndRevenues(
        [{ amount: 5000, cost_type: 'labor' }],
        [],
      );

      const result = await service.getProfitability(TEST_IDS.organization, {});

      expect(result.totalRevenue).toBe(0);
      expect(result.netProfit).toBe(-5000);
      expect(result.profitMargin).toBe(0);
    });

    it('handles empty data (no costs, no revenues)', async () => {
      setupCostsAndRevenues([], []);

      const result = await service.getProfitability(TEST_IDS.organization, {});

      expect(result.totalCosts).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.netProfit).toBe(0);
      expect(result.profitMargin).toBe(0);
      expect(result.byParcel).toHaveLength(0);
    });

    it('assigns "Non assigné" for entries without parcel_id', async () => {
      setupCostsAndRevenues(
        [{ amount: 1000, cost_type: 'other' }],
        [{ amount: 2000, revenue_type: 'other' }],
      );

      const result = await service.getProfitability(TEST_IDS.organization, {});

      expect(result.byParcel).toHaveLength(1);
      expect(result.byParcel[0].parcel_name).toBe('Non assigné');
      expect(result.byParcel[0].net_profit).toBe(1000);
    });

    it('parcel with only costs has undefined margin', async () => {
      setupCostsAndRevenues(
        [{ amount: 5000, cost_type: 'labor', parcel_id: 'p1', parcel: { name: 'Test' } }],
        [],
      );

      const result = await service.getProfitability(TEST_IDS.organization, {});

      expect(result.byParcel[0].total_revenue).toBe(0);
      expect(result.byParcel[0].profit_margin).toBeUndefined();
    });

    it('realistic Moroccan farm: olive + citrus season', async () => {
      setupCostsAndRevenues(
        [
          { amount: 12000, cost_type: 'labor', parcel_id: 'p1', parcel: { name: 'Olives Meknes' } },
          { amount: 5000, cost_type: 'materials', parcel_id: 'p1', parcel: { name: 'Olives Meknes' } },
          { amount: 3000, cost_type: 'equipment', parcel_id: 'p1', parcel: { name: 'Olives Meknes' } },
          { amount: 8000, cost_type: 'labor', parcel_id: 'p2', parcel: { name: 'Citrus Agadir' } },
          { amount: 4000, cost_type: 'materials', parcel_id: 'p2', parcel: { name: 'Citrus Agadir' } },
        ],
        [
          { amount: 35000, revenue_type: 'harvest', parcel_id: 'p1', parcel: { name: 'Olives Meknes' } },
          { amount: 5000, revenue_type: 'subsidy', parcel_id: 'p1', parcel: { name: 'Olives Meknes' } },
          { amount: 20000, revenue_type: 'harvest', parcel_id: 'p2', parcel: { name: 'Citrus Agadir' } },
        ],
      );

      const result = await service.getProfitability(TEST_IDS.organization, {});

      // Total: costs=32,000, revenue=60,000, profit=28,000
      expect(result.totalCosts).toBe(32000);
      expect(result.totalRevenue).toBe(60000);
      expect(result.netProfit).toBe(28000);
      expect(result.profitMargin).toBeCloseTo(46.67, 1);

      // Cost breakdown
      expect(result.costBreakdown.labor).toBe(20000);
      expect(result.costBreakdown.materials).toBe(9000);
      expect(result.costBreakdown.equipment).toBe(3000);

      // Revenue breakdown
      expect(result.revenueBreakdown.harvest).toBe(55000);
      expect(result.revenueBreakdown.subsidy).toBe(5000);
    });
  });
});
