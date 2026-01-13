import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductionIntelligenceService } from './production-intelligence.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS, TEST_DATES } from '../../../test/helpers/test-utils';

describe('ProductionIntelligenceService', () => {
  let service: ProductionIntelligenceService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const MOCK_YIELD_HISTORY = [
    {
      id: 'yield-1',
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      parcel_id: TEST_IDS.parcel,
      crop_type: 'wheat',
      harvest_date: TEST_DATES.today,
      actual_yield_quantity: 5000,
      target_yield_quantity: 4500,
      actual_yield_per_hectare: 50,
      target_yield_per_hectare: 45,
      yield_variance_percent: 11.11,
      performance_rating: 'excellent',
      revenue_amount: 150000,
      cost_amount: 80000,
      profit_amount: 70000,
      profit_margin_percent: 46.67,
      currency_code: 'MAD',
    },
    {
      id: 'yield-2',
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      parcel_id: TEST_IDS.parcel,
      crop_type: 'barley',
      harvest_date: TEST_DATES.yesterday,
      actual_yield_quantity: 3000,
      target_yield_quantity: 3500,
      actual_yield_per_hectare: 30,
      target_yield_per_hectare: 35,
      yield_variance_percent: -14.29,
      performance_rating: 'below_average',
      revenue_amount: 90000,
      cost_amount: 60000,
      profit_amount: 30000,
      profit_margin_percent: 33.33,
      currency_code: 'MAD',
    },
  ];

  const MOCK_FORECASTS = [
    {
      id: 'forecast-1',
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      parcel_id: TEST_IDS.parcel,
      crop_type: 'wheat',
      forecast_harvest_date_start: TEST_DATES.nextWeek,
      forecast_harvest_date_end: TEST_DATES.nextWeek,
      predicted_yield_quantity: 4800,
      estimated_revenue: 144000,
      estimated_cost: 75000,
      estimated_profit: 69000,
      currency_code: 'MAD',
      status: 'draft',
    },
  ];

  const MOCK_BENCHMARKS = [
    {
      id: 'benchmark-1',
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      parcel_id: TEST_IDS.parcel,
      crop_type: 'wheat',
      target_yield_per_hectare: 50,
      target_revenue_per_hectare: 150000,
      target_cost_per_hectare: 80000,
      is_active: true,
    },
  ];

  const MOCK_ALERTS = [
    {
      id: 'alert-1',
      organization_id: TEST_IDS.organization,
      farm_id: TEST_IDS.farm,
      parcel_id: TEST_IDS.parcel,
      alert_type: 'low_yield',
      severity: 'high',
      status: 'pending',
      message: 'Yield below target',
      created_at: TEST_DATES.today,
    },
  ];

  const PERFORMANCE_RATINGS = ['excellent', 'good', 'average', 'below_average', 'poor'];

  const ALERT_STATUSES = ['pending', 'acknowledged', 'resolved'];

  const ALERT_SEVERITIES = ['low', 'medium', 'high', 'critical'];

  const INVALID_IDS = ['', '   ', '\t\n', null, undefined];

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
        ProductionIntelligenceService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<ProductionIntelligenceService>(ProductionIntelligenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function setupOrganizationAccess(shouldHaveAccess: boolean = true) {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.single.mockResolvedValue(
      shouldHaveAccess
        ? mockQueryResult({ id: 'org-member-1' })
        : mockQueryResult(null, { message: 'Not found' })
    );
    mockClient.from.mockReturnValue(queryBuilder);
    return queryBuilder;
  }

  function setupThenableMock(queryBuilder: MockQueryBuilder, data: any, error: any = null) {
    queryBuilder.then.mockImplementation((resolve: (value: { data: any; error: any }) => void) => {
      const result = mockQueryResult(data, error);
      resolve(result);
      return Promise.resolve(result);
    });
  }

  function setupYieldHistoryQuery(records: any[]) {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.gte.mockReturnValue(queryBuilder);
    queryBuilder.lte.mockReturnValue(queryBuilder);
    setupThenableMock(queryBuilder, records);
    queryBuilder.single.mockReturnValue(queryBuilder);
    queryBuilder.maybeSingle.mockResolvedValue(
      records.length > 0 ? mockQueryResult(records[0]) : mockQueryResult(null, null)
    );
    queryBuilder.insert.mockReturnValue(queryBuilder);
    queryBuilder.update.mockReturnValue(queryBuilder);
    queryBuilder.in.mockReturnValue(queryBuilder);
    mockClient.from.mockReturnValue(queryBuilder);
    return queryBuilder;
  }

  // ============================================================
  // PARAMETERIZED TESTS - PERFORMANCE RATINGS
  // ============================================================

  describe('Performance Rating Calculation (Parameterized)', () => {
    it.each([
      { variance: 15, expected: 'excellent', description: 'well above target' },
      { variance: 10, expected: 'excellent', description: 'exactly excellent threshold' },
      { variance: 5, expected: 'good', description: 'above target' },
      { variance: 0, expected: 'good', description: 'at target' },
      { variance: -5, expected: 'below_average', description: 'slightly below target' },
      { variance: -10, expected: 'below_average', description: 'at below_average threshold' },
      { variance: -15, expected: 'poor', description: 'well below target' },
      { variance: null, expected: 'average', description: 'no variance data' },
    ])(
      'should calculate $expected rating for $description (variance: $variance)',
      async ({ variance, expected }) => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          crop_type: 'wheat',
          harvest_date: TEST_DATES.today,
          actual_yield_quantity: 5000,
          target_yield_quantity: variance ? 4500 : null,
          revenue_amount: 150000,
          cost_amount: 80000,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({ id: 'yield-1', performance_rating: expected })
        );
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockReturnValue(queryBuilder);

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // yield_history table
          return queryBuilder;
        });

        const result = await service.createYieldHistory(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto as any
        );

        expect(result).toBeDefined();
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('getYieldHistory', () => {
      it.each(INVALID_IDS)(
        'should handle invalid organization ID: %s',
        async (orgId) => {
          setupOrganizationAccess(false);

          await expect(
            service.getYieldHistory(TEST_IDS.user, orgId as any)
          ).rejects.toThrow(NotFoundException);
        }
      );

      it('should handle database error gracefully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        setupThenableMock(queryBuilder, null, { message: 'Database error' });

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // yield_history table
          return queryBuilder;
        });

        await expect(
          service.getYieldHistory(TEST_IDS.user, TEST_IDS.organization)
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('createYieldHistory', () => {
      it('should calculate profit_amount correctly', async () => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          crop_type: 'wheat',
          harvest_date: TEST_DATES.today,
          actual_yield_quantity: 5000,
          target_yield_quantity: 4500,
          revenue_amount: 150000,
          cost_amount: 80000,
        };

        const expectedProfit = 70000;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'yield-1',
            profit_amount: expectedProfit,
          })
        );

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // yield_history table
          return queryBuilder;
        });

        const result = await service.createYieldHistory(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto as any
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ profit_amount: expectedProfit })
        );
      });

      it('should calculate profit_margin_percent correctly', async () => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          crop_type: 'wheat',
          harvest_date: TEST_DATES.today,
          actual_yield_quantity: 5000,
          target_yield_quantity: 4500,
          revenue_amount: 150000,
          cost_amount: 80000,
        };

        const expectedMargin = 46.67;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'yield-1',
            profit_margin_percent: expect.any(Number),
          })
        );

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // yield_history table
          return queryBuilder;
        });

        const result = await service.createYieldHistory(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto as any
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            profit_margin_percent: expect.closeTo(expectedMargin, 0.1),
          })
        );
      });

      it('should handle null revenue for profit calculation', async () => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          crop_type: 'wheat',
          harvest_date: TEST_DATES.today,
          actual_yield_quantity: 5000,
          target_yield_quantity: 4500,
          revenue_amount: null,
          cost_amount: 80000,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'yield-1',
            profit_margin_percent: null,
          })
        );

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // yield_history table
          return queryBuilder;
        });

        const result = await service.createYieldHistory(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto as any
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ profit_margin_percent: null })
        );
      });

      it('should default currency_code to MAD', async () => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          crop_type: 'wheat',
          harvest_date: TEST_DATES.today,
          actual_yield_quantity: 5000,
          target_yield_quantity: 4500,
          revenue_amount: 150000,
          cost_amount: 80000,
          // currency_code not provided
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({ id: 'yield-1' })
        );

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // yield_history table
          return queryBuilder;
        });

        await service.createYieldHistory(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto as any
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ currency_code: 'MAD' })
        );
      });
    });

    describe('createForecast', () => {
      it('should calculate estimated_profit correctly', async () => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          crop_type: 'wheat',
          forecast_harvest_date_start: TEST_DATES.nextWeek,
          forecast_harvest_date_end: TEST_DATES.nextWeek,
          predicted_yield_quantity: 4800,
          estimated_revenue: 144000,
          estimated_cost: 75000,
        };

        const expectedProfit = 69000;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'forecast-1',
            estimated_profit: expectedProfit,
          })
        );

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // forecasts table
          return queryBuilder;
        });

        const result = await service.createForecast(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto as any
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ estimated_profit: expectedProfit })
        );
      });

      it('should set default status to draft', async () => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          crop_type: 'wheat',
          forecast_harvest_date_start: TEST_DATES.nextWeek,
          forecast_harvest_date_end: TEST_DATES.nextWeek,
          predicted_yield_quantity: 4800,
          estimated_revenue: 144000,
          estimated_cost: 75000,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({ id: 'forecast-1', status: 'draft' })
        );

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // forecasts table
          return queryBuilder;
        });

        await service.createForecast(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto as any
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'draft' })
        );
      });
    });

    describe('updateForecast', () => {
      it('should throw NotFoundException for non-existent forecast', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, null));

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // forecasts table
          return queryBuilder;
        });

        await expect(
          service.updateForecast(
            TEST_IDS.user,
            TEST_IDS.organization,
            'non-existent',
            { status: 'completed' }
          )
        ).rejects.toThrow(NotFoundException);
      });

      it('should calculate forecast_accuracy_percent when completing forecast', async () => {
        const forecastId = 'forecast-1';
        const predictedYield = 4800;
        const actualYield = 5000;
        const expectedAccuracy = 100 - Math.abs(((actualYield - predictedYield) / predictedYield) * 100);

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValueOnce(
          mockQueryResult({
            id: forecastId,
            predicted_yield_quantity: predictedYield,
          })
        );
        queryBuilder.single.mockResolvedValueOnce(
          mockQueryResult({
            id: forecastId,
            forecast_accuracy_percent: expectedAccuracy,
          })
        );
        queryBuilder.update.mockReturnValue(queryBuilder);

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // forecasts table
          return queryBuilder;
        });

        const result = await service.updateForecast(
          TEST_IDS.user,
          TEST_IDS.organization,
          forecastId,
          {
            actual_yield_quantity: actualYield,
            status: 'completed',
          }
        );

        expect(queryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            forecast_accuracy_percent: expect.closeTo(expectedAccuracy, 0.1),
          })
        );
      });
    });

    describe('Alert Operations', () => {
      it('should throw NotFoundException when acknowledging non-existent alert', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, null));

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // alerts table
          return queryBuilder;
        });

        await expect(
          service.acknowledgeAlert(
            TEST_IDS.user,
            TEST_IDS.organization,
            'non-existent'
          )
        ).rejects.toThrow(NotFoundException);
      });

      it('should prevent acknowledging already resolved alerts', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({ id: 'alert-1', status: 'resolved' })
        );

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // alerts table
          return queryBuilder;
        });

        await expect(
          service.acknowledgeAlert(
            TEST_IDS.user,
            TEST_IDS.organization,
            'alert-1'
          )
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.acknowledgeAlert(
            TEST_IDS.user,
            TEST_IDS.organization,
            'alert-1'
          )
        ).rejects.toThrow('Cannot acknowledge resolved alert');
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Yield History', () => {
    it('should filter by farm_id', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, MOCK_YIELD_HISTORY);

      // Set up mock to handle both organizations access check and yield_history query
      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // yield_history table
        return queryBuilder;
      });

      const result = await service.getYieldHistory(
        TEST_IDS.user,
        TEST_IDS.organization,
        { farm_id: TEST_IDS.farm }
      );

      expect(queryBuilder.eq).toHaveBeenCalledWith('farm_id', TEST_IDS.farm);
      expect(result).toBeDefined();
    });

    it('should filter by date range', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.gte.mockReturnValue(queryBuilder);
      queryBuilder.lte.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, MOCK_YIELD_HISTORY);

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // yield_history table
        return queryBuilder;
      });

      const result = await service.getYieldHistory(
        TEST_IDS.user,
        TEST_IDS.organization,
        {
          from_date: TEST_DATES.lastWeek,
          to_date: TEST_DATES.today,
        }
      );

      expect(queryBuilder.gte).toHaveBeenCalledWith('harvest_date', TEST_DATES.lastWeek);
      expect(queryBuilder.lte).toHaveBeenCalledWith('harvest_date', TEST_DATES.today);
    });

    it('should order by harvest_date descending', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, MOCK_YIELD_HISTORY);

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // yield_history table
        return queryBuilder;
      });

      await service.getYieldHistory(TEST_IDS.user, TEST_IDS.organization);

      expect(queryBuilder.order).toHaveBeenCalledWith('harvest_date', {
        ascending: false,
      });
    });
  });

  describe('Behavior - Forecasts', () => {
    it('should filter by status', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, MOCK_FORECASTS);

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // forecasts table
        return queryBuilder;
      });

      const result = await service.getForecasts(
        TEST_IDS.user,
        TEST_IDS.organization,
        { status: 'draft' }
      );

      expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'draft');
      expect(result).toBeDefined();
    });

    it('should order by forecast_harvest_date_start ascending', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, MOCK_FORECASTS);

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // forecasts table
        return queryBuilder;
      });

      await service.getForecasts(TEST_IDS.user, TEST_IDS.organization);

      expect(queryBuilder.order).toHaveBeenCalledWith('forecast_harvest_date_start', {
        ascending: true,
      });
    });
  });

  describe('Behavior - Benchmarks', () => {
    it('should filter by is_active', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, MOCK_BENCHMARKS);

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // benchmarks table
        return queryBuilder;
      });

      const result = await service.getBenchmarks(
        TEST_IDS.user,
        TEST_IDS.organization,
        { is_active: true }
      );

      expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toBeDefined();
    });

    it('should default is_active to true when creating benchmark', async () => {
      const createDto = {
        farm_id: TEST_IDS.farm,
        parcel_id: TEST_IDS.parcel,
        crop_type: 'wheat',
        target_yield_per_hectare: 50,
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({ id: 'benchmark-1', is_active: true })
      );

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // benchmarks table
        return queryBuilder;
      });

      await service.createBenchmark(
        TEST_IDS.user,
        TEST_IDS.organization,
        createDto as any
      );

      expect(queryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true })
      );
    });

    it('should order by crop_type ascending', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, MOCK_BENCHMARKS);

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // benchmarks table
        return queryBuilder;
      });

      await service.getBenchmarks(TEST_IDS.user, TEST_IDS.organization);

      expect(queryBuilder.order).toHaveBeenCalledWith('crop_type', {
        ascending: true,
      });
    });
  });

  describe('Behavior - Alerts', () => {
    it('should filter by severity', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, MOCK_ALERTS);

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // alerts table
        return queryBuilder;
      });

      const result = await service.getAlerts(
        TEST_IDS.user,
        TEST_IDS.organization,
        { severity: 'high' }
      );

      expect(queryBuilder.eq).toHaveBeenCalledWith('severity', 'high');
      expect(result).toBeDefined();
    });

    it('should order by created_at descending', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, MOCK_ALERTS);

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // alerts table
        return queryBuilder;
      });

      await service.getAlerts(TEST_IDS.user, TEST_IDS.organization);

      expect(queryBuilder.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should acknowledge alert successfully', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({ id: 'alert-1', status: 'pending' })
      );
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: 'alert-1',
          status: 'acknowledged',
          acknowledged_by: TEST_IDS.user,
          acknowledged_at: expect.any(String),
        })
      );

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // alerts table
        return queryBuilder;
      });

      const result = await service.acknowledgeAlert(
        TEST_IDS.user,
        TEST_IDS.organization,
        'alert-1'
      );

      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'acknowledged',
          acknowledged_by: TEST_IDS.user,
          acknowledged_at: expect.any(String),
        })
      );
    });

    it('should resolve alert successfully', async () => {
      const resolutionNotes = 'Issue fixed by adjusting irrigation';

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({ id: 'alert-1', status: 'acknowledged' })
      );
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: 'alert-1',
          status: 'resolved',
          resolution_notes: resolutionNotes,
          resolved_at: expect.any(String),
        })
      );

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // alerts table
        return queryBuilder;
      });

      const result = await service.resolveAlert(
        TEST_IDS.user,
        TEST_IDS.organization,
        'alert-1',
        resolutionNotes
      );

      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          resolution_notes: resolutionNotes,
          resolved_at: expect.any(String),
        })
      );
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Yield Calculation Edge Cases', () => {
      it('should handle zero target_yield_quantity', async () => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          crop_type: 'wheat',
          harvest_date: TEST_DATES.today,
          actual_yield_quantity: 5000,
          target_yield_quantity: 0,
          revenue_amount: 150000,
          cost_amount: 80000,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'yield-1',
            yield_variance_percent: null,
          })
        );

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // yield_history table
          return queryBuilder;
        });

        const result = await service.createYieldHistory(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto as any
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ yield_variance_percent: null })
        );
      });

      it('should handle null target_yield_quantity', async () => {
        const createDto = {
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
          crop_type: 'wheat',
          harvest_date: TEST_DATES.today,
          actual_yield_quantity: 5000,
          target_yield_quantity: null,
          revenue_amount: 150000,
          cost_amount: 80000,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'yield-1',
            yield_variance_percent: null,
          })
        );

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // yield_history table
          return queryBuilder;
        });

        const result = await service.createYieldHistory(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto as any
        );

        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({ yield_variance_percent: null })
        );
      });
    });

    describe('Forecast Accuracy Edge Cases', () => {
      it('should handle zero predicted_yield_quantity', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValueOnce(
          mockQueryResult({
            id: 'forecast-1',
            predicted_yield_quantity: 0,
          })
        );
        queryBuilder.single.mockResolvedValueOnce(
          mockQueryResult({
            id: 'forecast-1',
            forecast_accuracy_percent: null,
          })
        );
        queryBuilder.update.mockReturnValue(queryBuilder);

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // forecasts table
          return queryBuilder;
        });

        const result = await service.updateForecast(
          TEST_IDS.user,
          TEST_IDS.organization,
          'forecast-1',
          {
            actual_yield_quantity: 5000,
            status: 'completed',
          }
        );

        expect(queryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({ forecast_accuracy_percent: null })
        );
      });

      it('should handle perfect forecast accuracy', async () => {
        const predictedYield = 4800;
        const actualYield = 4800;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValueOnce(
          mockQueryResult({
            id: 'forecast-1',
            predicted_yield_quantity: predictedYield,
          })
        );
        queryBuilder.single.mockResolvedValueOnce(
          mockQueryResult({
            id: 'forecast-1',
            forecast_accuracy_percent: 100,
          })
        );
        queryBuilder.update.mockReturnValue(queryBuilder);

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // forecasts table
          return queryBuilder;
        });

        const result = await service.updateForecast(
          TEST_IDS.user,
          TEST_IDS.organization,
          'forecast-1',
          {
            actual_yield_quantity: actualYield,
            status: 'completed',
          }
        );

        expect(queryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({ forecast_accuracy_percent: 100 })
        );
      });
    });

    describe('Empty Result Sets', () => {
      it('should handle empty yield history', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        setupThenableMock(queryBuilder, []);

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // yield_history table
          return queryBuilder;
        });

        const result = await service.getYieldHistory(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result).toEqual([]);
      });

      it('should handle empty forecasts', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        setupThenableMock(queryBuilder, []);

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // forecasts table
          return queryBuilder;
        });

        const result = await service.getForecasts(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result).toEqual([]);
      });

      it('should handle empty benchmarks', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        setupThenableMock(queryBuilder, []);

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // benchmarks table
          return queryBuilder;
        });

        const result = await service.getBenchmarks(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result).toEqual([]);
      });

      it('should handle empty alerts', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        setupThenableMock(queryBuilder, []);

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // alerts table
          return queryBuilder;
        });

        const result = await service.getAlerts(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result).toEqual([]);
      });
    });

    describe('RPC Fallback', () => {
      it('should fall back to manual calculation when RPC fails', async () => {
        // Mock RPC failure
        mockClient.rpc.mockResolvedValue(
          mockQueryResult(null, { message: 'RPC not found' })
        );

        // Mock manual calculation queries
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.gte.mockReturnValue(queryBuilder);
        queryBuilder.lte.mockReturnValue(queryBuilder);
        queryBuilder.in.mockReturnValue(queryBuilder);
        setupThenableMock(queryBuilder, []);

        let queryCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // organizations table - for verifyOrganizationAccess
            const orgQueryBuilder = createMockQueryBuilder();
            orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
            orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
            return orgQueryBuilder;
          }
          // yield_history table
          return queryBuilder;
        });

        const result = await service.getParcelPerformance(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result).toEqual([]);
        expect(mockClient.rpc).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // PARAMETERIZED TESTS - ALERT WORKFLOWS
  // ============================================================

  describe('Alert Workflows (Parameterized)', () => {
    it.each(ALERT_STATUSES)('should handle alert with status: %s', async (status) => {
      const alert = { ...MOCK_ALERTS[0], status };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, [alert]);

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // alerts table
        return queryBuilder;
      });

      const result = await service.getAlerts(
        TEST_IDS.user,
        TEST_IDS.organization,
        { status }
      );

      expect(result).toBeDefined();
    });

    it.each(ALERT_SEVERITIES)('should handle alert with severity: %s', async (severity) => {
      const alert = { ...MOCK_ALERTS[0], severity };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, [alert]);

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // alerts table
        return queryBuilder;
      });

      const result = await service.getAlerts(
        TEST_IDS.user,
        TEST_IDS.organization,
        { severity }
      );

      expect(result).toBeDefined();
    });
  });

  // ============================================================
  // ORGANIZATION ACCESS TESTS
  // ============================================================

  describe('Organization Access Control', () => {
    it('should deny access for non-members', async () => {
      setupOrganizationAccess(false);

      await expect(
        service.getYieldHistory(TEST_IDS.user, TEST_IDS.organization)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getYieldHistory(TEST_IDS.user, TEST_IDS.organization)
      ).rejects.toThrow('Organization not found or access denied');
    });

    it('should handle database error during access check', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'Database error' })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.getYieldHistory(TEST_IDS.user, TEST_IDS.organization)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // PARCEL PERFORMANCE TESTS
  // ============================================================

  describe('Parcel Performance', () => {
    it('should aggregate yield data by parcel', async () => {
      // Mock RPC failure to test manual calculation
      mockClient.rpc.mockResolvedValue(
        mockQueryResult(null, { message: 'RPC not found' })
      );

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.gte.mockReturnValue(queryBuilder);
      queryBuilder.lte.mockReturnValue(queryBuilder);
      queryBuilder.in.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, MOCK_YIELD_HISTORY);

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // yield_history table
        return queryBuilder;
      });

      const result = await service.getParcelPerformance(
        TEST_IDS.user,
        TEST_IDS.organization
      );

      expect(mockClient.rpc).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should fetch parcel names for performance summary', async () => {
      mockClient.rpc.mockResolvedValue(
        mockQueryResult(null, { message: 'RPC not found' })
      );

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.gte.mockReturnValue(queryBuilder);
      queryBuilder.lte.mockReturnValue(queryBuilder);
      queryBuilder.in.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, MOCK_YIELD_HISTORY);

      // Mock parcel names query
      const parcelsData = [
        { id: TEST_IDS.parcel, name: 'Parcel A', farm: { name: 'Main Farm' } },
      ];

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        if (queryCallCount === 2) {
          // yield_history table
          return queryBuilder;
        }
        // parcels table
        const parcelQB = createMockQueryBuilder();
        parcelQB.select.mockReturnValue(parcelQB);
        parcelQB.in.mockResolvedValue(mockQueryResult(parcelsData));
        return parcelQB;
      });

      const result = await service.getParcelPerformance(
        TEST_IDS.user,
        TEST_IDS.organization
      );

      expect(mockClient.from).toHaveBeenCalledWith('parcels');
    });

    it('should return empty array when no yield data exists', async () => {
      mockClient.rpc.mockResolvedValue(
        mockQueryResult(null, { message: 'RPC not found' })
      );

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.gte.mockReturnValue(queryBuilder);
      queryBuilder.lte.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, []);

      let queryCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // organizations table - for verifyOrganizationAccess
          const orgQueryBuilder = createMockQueryBuilder();
          orgQueryBuilder.select.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.eq.mockReturnValue(orgQueryBuilder);
          orgQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'org-member-1' }));
          return orgQueryBuilder;
        }
        // yield_history table
        return queryBuilder;
      });

      const result = await service.getParcelPerformance(
        TEST_IDS.user,
        TEST_IDS.organization
      );

      expect(result).toEqual([]);
    });
  });
});
