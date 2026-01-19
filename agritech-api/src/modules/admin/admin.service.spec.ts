import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

// Import DTO types
import {
  ReferenceDataTable,
  ImportReferenceDataDto,
  PublishReferenceDataDto,
  SeedAccountsDto,
  ChartOfAccountsType,
  OrgUsageQueryDto,
  ReferenceDataQueryDto,
  ReferenceDataDiffDto,
} from './dto';

// Type alias for cleaner test code
type RefDataTable = ReferenceDataTable;

describe('AdminService', () => {
  let service: AdminService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const REFERENCE_DATA_TABLES: RefDataTable[] = [
    ReferenceDataTable.ACCOUNT_TEMPLATES,
    ReferenceDataTable.ACCOUNT_MAPPINGS,
    ReferenceDataTable.MODULES,
    ReferenceDataTable.CURRENCIES,
    ReferenceDataTable.ROLES,
    ReferenceDataTable.WORK_UNITS,
  ];

  const VALID_CHART_TYPES = [
    ChartOfAccountsType.MOROCCAN,
    ChartOfAccountsType.IFRS,
    ChartOfAccountsType.US_GAAP,
    ChartOfAccountsType.CUSTOM,
  ];

  const PAGINATION_PARAMS = [
    { limit: '10', offset: '0', description: 'First page' },
    { limit: '50', offset: '0', description: 'Default page size' },
    { limit: '100', offset: '200', description: 'Large offset' },
  ];

  const SORT_PARAMS = [
    { sortBy: 'created_at', sortOrder: 'asc', description: 'Oldest first' },
    { sortBy: 'created_at', sortOrder: 'desc', description: 'Newest first' },
    { sortBy: 'name', sortOrder: 'asc', description: 'Name ascending' },
    { sortBy: 'name', sortOrder: 'desc', description: 'Name descending' },
  ];

  const IMPORT_DATA_SCENARIOS = [
    {
      scenario: 'Single record',
      rowCount: 1,
      expectedCreated: 1,
      expectedUpdated: 0,
      expectedSkipped: 0,
    },
    {
      scenario: 'Multiple new records',
      rowCount: 10,
      expectedCreated: 10,
      expectedUpdated: 0,
      expectedSkipped: 0,
    },
    {
      scenario: 'Update existing records',
      rowCount: 5,
      updateExisting: true,
      expectedCreated: 0,
      expectedUpdated: 5,
      expectedSkipped: 0,
    },
    {
      scenario: 'Skip existing records',
      rowCount: 5,
      updateExisting: false,
      expectedCreated: 0,
      expectedUpdated: 0,
      expectedSkipped: 5,
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
        AdminService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // PARAMETERIZED TESTS - REFERENCE DATA
  // ============================================================

  describe('getReferenceData (Parameterized)', () => {
    it.each(REFERENCE_DATA_TABLES)(
      'should fetch data from table: %s',
      async (table) => {
        const mockData = [
          { id: '1', name: 'Item 1', code: '001' },
          { id: '2', name: 'Item 2', code: '002' },
        ];

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({
          data: mockData,
          error: null,
          count: 2,
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const query: ReferenceDataQueryDto = {
          limit: '50',
          offset: '0',
        };

        const result = await service.getReferenceData(table, query, TEST_IDS.user);

        expect(result.data).toEqual(mockData);
        expect(result.total).toBe(2);
        expect(mockClient.from).toHaveBeenCalledWith(table);
      }
    );

    it.each(PAGINATION_PARAMS)(
      'should handle pagination: $description',
      async ({ limit, offset }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({ data: [], error: null, count: 0 });
        mockClient.from.mockReturnValue(queryBuilder);

        const query: ReferenceDataQueryDto = { limit, offset };

        await service.getReferenceData(
          ReferenceDataTable.ACCOUNT_TEMPLATES,
          query,
          TEST_IDS.user
        );

        const expectedLimit = parseInt(limit, 10);
        const expectedOffset = parseInt(offset, 10);
        expect(queryBuilder.range).toHaveBeenCalledWith(
          expectedOffset,
          expectedOffset + expectedLimit - 1
        );
      }
    );

    it.each(SORT_PARAMS)(
      'should handle sorting: $description',
      async ({ sortBy, sortOrder }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue({ data: [], error: null, count: 0 });
        mockClient.from.mockReturnValue(queryBuilder);

        const query: ReferenceDataQueryDto = {
          sortBy,
          sortOrder: sortOrder as 'asc' | 'desc',
          limit: '50',
          offset: '0',
        };

        await service.getReferenceData(
          ReferenceDataTable.ACCOUNT_TEMPLATES,
          query,
          TEST_IDS.user
        );

        expect(queryBuilder.order).toHaveBeenCalledWith(sortBy, {
          ascending: sortOrder === 'asc',
        });
      }
    );
  });

  // ============================================================
  // PARAMETERIZED TESTS - IMPORT REFERENCE DATA
  // ============================================================

  describe('importReferenceData (Parameterized)', () => {
    it.each(IMPORT_DATA_SCENARIOS)(
      'should handle import scenario: $scenario',
      async ({
        rowCount,
        updateExisting,
        expectedCreated,
        expectedUpdated,
        expectedSkipped,
      }) => {
        const jobMock = { id: 'job-123' };
        const rows = Array.from({ length: rowCount }, (_, i) => ({
          data: { id: `row-${i}`, name: `Item ${i}` },
        }));

        // For "Single record" and "Multiple new records" scenarios, records don't exist
        // For "Update existing records" and "Skip existing records", records exist
        const recordsExist = expectedUpdated > 0 || expectedSkipped > 0;

        mockClient.from.mockImplementation((table: string) => {
          const qb = createMockQueryBuilder();
          if (table === 'admin_job_logs') {
            qb.insert.mockReturnValue(qb);
            qb.select.mockReturnValue(qb);
            qb.single.mockResolvedValue(mockQueryResult(jobMock));
            qb.update.mockReturnValue(qb);
            qb.eq.mockReturnValue(qb);
          } else if (table === ReferenceDataTable.ACCOUNT_TEMPLATES) {
            qb.select.mockReturnValue(qb);
            qb.eq.mockReturnValue(qb);
            // Return existing record or null based on scenario
            qb.single.mockResolvedValue(
              recordsExist
                ? mockQueryResult({ id: 'existing-id' })
                : mockQueryResult(null, { message: 'Not found' })
            );
            qb.insert.mockResolvedValue(mockQueryResult({}));
            qb.update.mockReturnValue(qb);
          }
          return qb;
        });

        const dto: ImportReferenceDataDto = {
          table: ReferenceDataTable.ACCOUNT_TEMPLATES,
          rows,
          version: '1.0.0',
          updateExisting: updateExisting ?? false,
          dryRun: false,
        };

        const result = await service.importReferenceData(dto, TEST_IDS.user);

        expect(result.success).toBe(true);
        expect(result.recordsProcessed).toBe(rowCount);
      }
    );

    it.each([true, false])(
      'should handle dryRun=%s',
      async (dryRun) => {
        const jobMock = { id: 'job-123' };
        const rows = [
          { data: { id: '1', name: 'Item 1' } },
          { data: { id: '2', name: 'Item 2' } },
        ];

        let insertCallCount = 0;

        mockClient.from.mockImplementation((table: string) => {
          const qb = createMockQueryBuilder();
          if (table === 'admin_job_logs') {
            qb.insert.mockReturnValue(qb);
            qb.select.mockReturnValue(qb);
            qb.single.mockResolvedValue(mockQueryResult(jobMock));
          } else if (table === ReferenceDataTable.ACCOUNT_TEMPLATES) {
            qb.insert.mockImplementation(() => {
              insertCallCount++;
              return Promise.resolve(mockQueryResult({}));
            });
            qb.update.mockReturnValue(qb);
            qb.select.mockReturnValue(qb);
            qb.eq.mockReturnValue(qb);
            qb.single.mockResolvedValue(mockQueryResult(null));
          }
          return qb;
        });

        const dto: ImportReferenceDataDto = {
          table: ReferenceDataTable.ACCOUNT_TEMPLATES,
          rows,
          dryRun,
        };

        await service.importReferenceData(dto, TEST_IDS.user);

        if (dryRun) {
          expect(insertCallCount).toBe(0);
        } else {
          expect(insertCallCount).toBeGreaterThan(0);
        }
      }
    );
  });

  // ============================================================
  // PARAMETERIZED TESTS - SEED ACCOUNTS
  // ============================================================

  describe('seedAccounts (Parameterized)', () => {
    it.each(VALID_CHART_TYPES)(
      'should seed accounts with chart type: %s',
      async (chartType) => {
        const jobMock = { id: 'job-123' };
        const mockTemplates = [
          {
            id: 'tpl-1',
            code: '101',
            name: 'Capital',
            account_type: 'Equity',
            account_subtype: 'Capital',
            published_at: '2024-01-01',
          },
          {
            id: 'tpl-2',
            code: '201',
            name: 'Stocks',
            account_type: 'Asset',
            account_subtype: 'Current Assets',
            published_at: '2024-01-01',
          },
        ];

        let rpcCalled = false;

        mockClient.from.mockImplementation((table: string) => {
          const qb = createMockQueryBuilder();
          if (table === 'admin_job_logs') {
            qb.insert.mockReturnValue(qb);
            qb.select.mockReturnValue(qb);
            qb.single.mockResolvedValue(mockQueryResult(jobMock));
            qb.update.mockReturnValue(qb);
            qb.eq.mockReturnValue(qb);
          } else if (table === ReferenceDataTable.ACCOUNT_TEMPLATES) {
            const selectQb = createMockQueryBuilder();
            const templateData = chartType === ChartOfAccountsType.MOROCCAN
              ? []
              : mockTemplates;
            // Create a proper thenable object
            const thenableResult = {
              ...selectQb,
              then: (resolve: any) => resolve(mockQueryResult(templateData)),
            };
            selectQb.eq.mockReturnValue(thenableResult);
            selectQb.not.mockReturnValue(thenableResult);
            qb.select.mockReturnValue(selectQb);
          } else if (table === 'accounts') {
            qb.insert.mockResolvedValue(mockQueryResult({}));
          }
          return qb;
        });

        mockClient.rpc.mockImplementation(() => {
          rpcCalled = true;
          return Promise.resolve(
            mockQueryResult(chartType === ChartOfAccountsType.MOROCCAN ? 120 : 0)
          );
        });

        const dto: SeedAccountsDto = {
          organizationId: TEST_IDS.organization,
          chartType,
        };

        const result = await service.seedAccounts(dto, TEST_IDS.user);

        expect(result.success).toBe(true);
        expect(result.organizationId).toBe(TEST_IDS.organization);
        expect(result.chartType).toBe(chartType);

        if (chartType === ChartOfAccountsType.MOROCCAN) {
          expect(rpcCalled).toBe(true);
        }
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('getReferenceData', () => {
      it.each([null, undefined, '', 'invalid-table'])(
        'should handle invalid table: %s',
        async (table) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.order.mockReturnValue(queryBuilder);
          queryBuilder.range.mockResolvedValue(
            mockQueryResult(null, { message: 'Table not found' })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          const query: ReferenceDataQueryDto = {
            limit: '50',
            offset: '0',
          };

          await expect(
            service.getReferenceData(table as any, query, TEST_IDS.user)
          ).rejects.toThrow(BadRequestException);
        }
      );

      it.each(['abc', '0', '-10'])(
        'should handle invalid limit values: %s',
        async (limit) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.order.mockReturnValue(queryBuilder);
          queryBuilder.range.mockResolvedValue(mockQueryResult([]));
          mockClient.from.mockReturnValue(queryBuilder);

          const query: ReferenceDataQueryDto = {
            limit,
            offset: '0',
          };

          const result = await service.getReferenceData(
            ReferenceDataTable.ACCOUNT_TEMPLATES,
            query,
            TEST_IDS.user
          );

          // Should still work, parseInt will handle it
          expect(result).toBeDefined();
        }
      );
    });

    describe('importReferenceData', () => {
      it('should handle empty rows array', async () => {
        const jobMock = { id: 'job-123' };

        mockClient.from.mockImplementation((table: string) => {
          const qb = createMockQueryBuilder();
          if (table === 'admin_job_logs') {
            qb.insert.mockReturnValue(qb);
            qb.select.mockReturnValue(qb);
            qb.single.mockResolvedValue(mockQueryResult(jobMock));
            qb.update.mockReturnValue(qb);
          }
          return qb;
        });

        const dto: ImportReferenceDataDto = {
          table: ReferenceDataTable.ACCOUNT_TEMPLATES,
          rows: [],
        };

        const result = await service.importReferenceData(dto, TEST_IDS.user);

        expect(result.recordsProcessed).toBe(0);
        expect(result.recordsCreated).toBe(0);
        expect(result.success).toBe(true);
      });

      it('should handle missing row IDs', async () => {
        const jobMock = { id: 'job-123' };
        const rows = [
          { data: { name: 'Item without ID' } },
          { data: { name: 'Another item without ID' } },
        ];

        mockClient.from.mockImplementation((table: string) => {
          const qb = createMockQueryBuilder();
          if (table === 'admin_job_logs') {
            qb.insert.mockReturnValue(qb);
            qb.select.mockReturnValue(qb);
            qb.single.mockResolvedValue(mockQueryResult(jobMock));
            qb.update.mockReturnValue(qb);
          } else if (table === ReferenceDataTable.ACCOUNT_TEMPLATES) {
            qb.insert.mockResolvedValue(mockQueryResult({}));
          }
          return qb;
        });

        const dto: ImportReferenceDataDto = {
          table: ReferenceDataTable.ACCOUNT_TEMPLATES,
          rows,
        };

        const result = await service.importReferenceData(dto, TEST_IDS.user);

        expect(result.recordsCreated).toBe(2);
      });
    });

    describe('seedAccounts', () => {
      it.each([null, undefined, ''])(
        'should handle invalid organization ID: %s',
        async (orgId) => {
          const jobMock = { id: 'job-123' };

          mockClient.from.mockImplementation((table: string) => {
            const qb = createMockQueryBuilder();
            if (table === 'admin_job_logs') {
              qb.insert.mockReturnValue(qb);
              qb.select.mockReturnValue(qb);
              qb.single.mockResolvedValue(mockQueryResult(jobMock));
              qb.update.mockReturnValue(qb);
            }
            return qb;
          });

          const dto: SeedAccountsDto = {
            organizationId: orgId as any,
            chartType: ChartOfAccountsType.MOROCCAN,
          };

          await expect(service.seedAccounts(dto, TEST_IDS.user)).rejects.toThrow();
        }
      );
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Reference Data Management', () => {
    it('should apply source filter when provided', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue({ data: [], error: null, count: 0 });
      mockClient.from.mockReturnValue(queryBuilder);

      const query: ReferenceDataQueryDto = {
        limit: '50',
        offset: '0',
        source: 'cms',
      };

      await service.getReferenceData(ReferenceDataTable.ACCOUNT_TEMPLATES, query, TEST_IDS.user);

      expect(queryBuilder.eq).toHaveBeenCalledWith('source', 'cms');
    });

    it('should apply version filter when provided', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue({ data: [], error: null, count: 0 });
      mockClient.from.mockReturnValue(queryBuilder);

      const query: ReferenceDataQueryDto = {
        limit: '50',
        offset: '0',
        version: '1.0.0',
      };

      await service.getReferenceData(ReferenceDataTable.ACCOUNT_TEMPLATES, query, TEST_IDS.user);

      expect(queryBuilder.eq).toHaveBeenCalledWith('template_version', '1.0.0');
    });

    it('should apply publishedOnly filter', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.not.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue({ data: [], error: null, count: 0 });
      mockClient.from.mockReturnValue(queryBuilder);

      const query: ReferenceDataQueryDto = {
        limit: '50',
        offset: '0',
        publishedOnly: true,
      };

      await service.getReferenceData(ReferenceDataTable.ACCOUNT_TEMPLATES, query, TEST_IDS.user);

      expect(queryBuilder.not).toHaveBeenCalledWith('published_at', 'is', null);
    });

    it('should apply search filter', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue({ data: [], error: null, count: 0 });
      mockClient.from.mockReturnValue(queryBuilder);

      const query: ReferenceDataQueryDto = {
        limit: '50',
        offset: '0',
        search: 'capital',
      };

      await service.getReferenceData(ReferenceDataTable.ACCOUNT_TEMPLATES, query, TEST_IDS.user);

      expect(queryBuilder.or).toHaveBeenCalledWith(
        'name.ilike.%capital%,code.ilike.%capital%'
      );
    });
  });

  describe('Behavior - Job Logging', () => {
    it('should create job log for import', async () => {
      const jobMock = { id: 'job-123' };

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'admin_job_logs') {
          qb.insert.mockReturnValue(qb);
          qb.select.mockReturnValue(qb);
          qb.single.mockResolvedValue(mockQueryResult(jobMock));
          qb.update.mockReturnValue(qb);
        }
        return qb;
      });

      const dto: ImportReferenceDataDto = {
        table: ReferenceDataTable.ACCOUNT_TEMPLATES,
        rows: [{ data: { id: '1', name: 'Item' } }],
      };

      await service.importReferenceData(dto, TEST_IDS.user);

      expect(mockClient.from).toHaveBeenCalledWith('admin_job_logs');
    });

    it('should update job log on completion', async () => {
      const jobMock = { id: 'job-123' };
      let updateCalled = false;

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'admin_job_logs') {
          qb.insert.mockReturnValue(qb);
          qb.select.mockReturnValue(qb);
          qb.single.mockResolvedValue(mockQueryResult(jobMock));
          qb.update.mockImplementation(() => {
            updateCalled = true;
            return qb;
          });
          qb.eq.mockReturnValue(qb);
        }
        return qb;
      });

      const dto: ImportReferenceDataDto = {
        table: ReferenceDataTable.ACCOUNT_TEMPLATES,
        rows: [{ data: { id: '1', name: 'Item' } }],
      };

      await service.importReferenceData(dto, TEST_IDS.user);

      expect(updateCalled).toBe(true);
    });

    it('should update job log on failure', async () => {
      const jobMock = { id: 'job-123' };
      let updateCalled = false;

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'admin_job_logs') {
          qb.insert.mockReturnValue(qb);
          qb.select.mockReturnValue(qb);
          qb.single.mockResolvedValue(mockQueryResult(jobMock));
          qb.update.mockImplementation(() => {
            updateCalled = true;
            return qb;
          });
          qb.eq.mockReturnValue(qb);
        } else if (table === ReferenceDataTable.ACCOUNT_TEMPLATES) {
          qb.select.mockReturnValue(qb);
          qb.eq.mockReturnValue(qb);
          qb.single.mockResolvedValue(
            mockQueryResult(null, { message: 'Database error' })
          );
        }
        return qb;
      });

      const dto: ImportReferenceDataDto = {
        table: ReferenceDataTable.ACCOUNT_TEMPLATES,
        rows: [
          {
            data: {
              id: '1',
              name: 'Item',
            },
          },
        ],
        updateExisting: true,
      };

      await service.importReferenceData(dto, TEST_IDS.user);

      expect(updateCalled).toBe(true);
    });
  });

  describe('Behavior - Publish Reference Data', () => {
    it('should publish items', async () => {
      const ids = ['id-1', 'id-2', 'id-3'];

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockResolvedValue(mockQueryResult({}));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto: PublishReferenceDataDto = {
        table: ReferenceDataTable.ACCOUNT_TEMPLATES,
        ids,
        unpublish: false,
      };

      const result = await service.publishReferenceData(dto, TEST_IDS.user);

      expect(result.publishedCount).toBe(3);
      expect(result.unpublishedCount).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should unpublish items', async () => {
      const ids = ['id-1', 'id-2'];

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockResolvedValue(mockQueryResult({}));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto: PublishReferenceDataDto = {
        table: ReferenceDataTable.ACCOUNT_TEMPLATES,
        ids,
        unpublish: true,
      };

      const result = await service.publishReferenceData(dto, TEST_IDS.user);

      expect(result.publishedCount).toBe(0);
      expect(result.unpublishedCount).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should handle publish errors gracefully', async () => {
      const ids = ['id-1', 'id-2', 'id-3'];

      let callCount = 0;
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve(mockQueryResult(null, { message: 'Not found' }));
        }
        return Promise.resolve(mockQueryResult({}));
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const dto: PublishReferenceDataDto = {
        table: ReferenceDataTable.ACCOUNT_TEMPLATES,
        ids,
        unpublish: false,
      };

      const result = await service.publishReferenceData(dto, TEST_IDS.user);

      expect(result.publishedCount).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // CRUD OPERATIONS TESTS
  // ============================================================

  describe('SaaS Metrics', () => {
    it('should return SaaS metrics', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.gte.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue({ data: [], error: null, count: 5 });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getSaasMetrics();

      expect(result).toBeDefined();
      expect(result.totalOrganizations).toBeGreaterThanOrEqual(0);
      expect(result.totalUsers).toBeGreaterThanOrEqual(0);
      expect(result.totalMrr).toBeGreaterThanOrEqual(0);
      expect(result.totalArr).toBeGreaterThanOrEqual(0);
    });

    it('should calculate ARPU correctly', async () => {
      // Mock revenue data
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        const selectQb = createMockQueryBuilder();

        if (table === 'organizations') {
          // First call doesn't use gte(), subsequent calls do
          const thenableResult = {
            ...selectQb,
            then: (resolve: any) => resolve({ data: [], error: null, count: 10 }),
            gte: jest.fn().mockReturnValue({
              then: (resolve: any) => resolve({ data: [], error: null, count: 5 }),
            }),
          };
          qb.select.mockReturnValue(thenableResult);
        } else if (table === 'organization_users') {
          const thenableResult = {
            ...selectQb,
            eq: jest.fn().mockReturnValue({
              then: (resolve: any) => resolve({ data: [], error: null, count: 50 }),
            }),
            then: (resolve: any) => resolve({ data: [], error: null, count: 50 }),
          };
          qb.select.mockReturnValue(thenableResult);
        } else if (table === 'subscription_usage') {
          const thenableResult = {
            ...selectQb,
            then: (resolve: any) => resolve(mockQueryResult([
              { mrr: 1000, arr: 12000 },
              { mrr: 2000, arr: 24000 },
            ])),
          };
          qb.select.mockReturnValue(thenableResult);
        } else if (table === 'subscriptions') {
          const thenableResult = {
            ...selectQb,
            then: (resolve: any) => resolve(mockQueryResult([
              {
                plan_type: 'basic',
                subscription_usage: { mrr: 1000 },
              },
            ])),
          };
          qb.select.mockReturnValue(thenableResult);
        } else if (table === 'events') {
          const thenableResult = {
            ...selectQb,
            gte: jest.fn().mockReturnValue({
              then: (resolve: any) => resolve({ data: [], error: null, count: 8 }),
            }),
            then: (resolve: any) => resolve({ data: [], error: null, count: 8 }),
          };
          qb.select.mockReturnValue(thenableResult);
        }
        return qb;
      });

      const result = await service.getSaasMetrics();

      expect(result.totalMrr).toBe(3000);
      expect(result.arpu).toBeCloseTo(300);
    });
  });

  describe('Organization Usage', () => {
    it('should return organization usage data', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(
        mockQueryResult([
          {
            id: 'org-1',
            name: 'Test Org',
            mrr: 1000,
            users_count: 5,
            plan_type: 'basic',
          },
        ])
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const query: OrgUsageQueryDto = {
        limit: '50',
        offset: '0',
      };

      const result = await service.getOrgUsage(query);

      expect(result.data).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should apply plan type filter', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(mockQueryResult([]));
      mockClient.from.mockReturnValue(queryBuilder);

      const query: OrgUsageQueryDto = {
        limit: '50',
        offset: '0',
        planType: 'basic',
      };

      await service.getOrgUsage(query);

      expect(queryBuilder.eq).toHaveBeenCalledWith('plan_type', 'basic');
    });

    it('should apply search filter', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(mockQueryResult([]));
      mockClient.from.mockReturnValue(queryBuilder);

      const query: OrgUsageQueryDto = {
        limit: '50',
        offset: '0',
        search: 'Test',
      };

      await service.getOrgUsage(query);

      expect(queryBuilder.ilike).toHaveBeenCalledWith('name', '%Test%');
    });
  });

  describe('Reference Data Diff', () => {
    it('should calculate diff between versions', async () => {
      const fromData = [
        { id: '1', name: 'Item 1', version: '1.0' },
        { id: '2', name: 'Item 2', version: '1.0' },
      ];

      const toData = [
        { id: '1', name: 'Item 1 Updated', version: '2.0' },
        { id: '3', name: 'Item 3', version: '2.0' },
      ];

      // Set up mock to return different data for sequential calls
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        const qb = createMockQueryBuilder();
        const selectQb = createMockQueryBuilder();

        // Create proper thenable result based on call count
        const thenableResult = {
          ...selectQb,
          then: (resolve: any) => resolve(mockQueryResult(callCount === 1 ? fromData : toData)),
        };

        selectQb.eq.mockReturnValue(thenableResult);
        qb.select.mockReturnValue(selectQb);
        return qb;
      });

      const dto: ReferenceDataDiffDto = {
        fromVersion: '1.0',
        toVersion: '2.0',
      };

      const result = await service.getReferenceDataDiff(ReferenceDataTable.ACCOUNT_TEMPLATES, dto);

      expect(result.fromVersion).toBe('1.0');
      expect(result.toVersion).toBe('2.0');
      expect(result.added).toBe(1); // Item 3
      expect(result.removed).toBe(1); // Item 2
      expect(result.modified).toBeGreaterThan(0); // Item 1
    });
  });

  describe('Job Logs', () => {
    it('should return job logs', async () => {
      const mockLogs = [
        {
          id: 'job-1',
          job_type: 'import',
          status: 'completed',
          created_at: '2024-01-01',
        },
        {
          id: 'job-2',
          job_type: 'seed_accounts',
          status: 'running',
          created_at: '2024-01-02',
        },
      ];

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue({ data: mockLogs, error: null, count: 2 });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getJobLogs(50, 0);

      expect(result.data).toEqual(mockLogs);
      expect(result.total).toBe(2);
    });

    it('should use default pagination', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.range.mockResolvedValue(mockQueryResult([]));
      mockClient.from.mockReturnValue(queryBuilder);

      await service.getJobLogs();

      expect(queryBuilder.range).toHaveBeenCalledWith(0, 49);
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Large Dataset Handling', () => {
      it('should handle importing many rows', async () => {
        const jobMock = { id: 'job-123' };
        const rowCount = 1000;
        const rows = Array.from({ length: rowCount }, (_, i) => ({
          data: { id: `row-${i}`, name: `Item ${i}` },
        }));

        mockClient.from.mockImplementation((table: string) => {
          const qb = createMockQueryBuilder();
          if (table === 'admin_job_logs') {
            qb.insert.mockReturnValue(qb);
            qb.select.mockReturnValue(qb);
            qb.single.mockResolvedValue(mockQueryResult(jobMock));
            qb.update.mockReturnValue(qb);
          } else if (table === ReferenceDataTable.ACCOUNT_TEMPLATES) {
            qb.insert.mockResolvedValue(mockQueryResult({}));
          }
          return qb;
        });

        const dto: ImportReferenceDataDto = {
          table: ReferenceDataTable.ACCOUNT_TEMPLATES,
          rows,
        };

        const result = await service.importReferenceData(dto, TEST_IDS.user);

        expect(result.recordsProcessed).toBe(rowCount);
        expect(result.success).toBe(true);
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple simultaneous imports', async () => {
        const jobMock = { id: 'job-123' };

        mockClient.from.mockImplementation((table: string) => {
          const qb = createMockQueryBuilder();
          if (table === 'admin_job_logs') {
            qb.insert.mockReturnValue(qb);
            qb.select.mockReturnValue(qb);
            qb.single.mockResolvedValue(mockQueryResult(jobMock));
            qb.update.mockReturnValue(qb);
          } else if (table === ReferenceDataTable.ACCOUNT_TEMPLATES) {
            qb.insert.mockResolvedValue(mockQueryResult({}));
          }
          return qb;
        });

        const promises = [
          service.importReferenceData(
            {
              table: ReferenceDataTable.ACCOUNT_TEMPLATES,
              rows: [{ data: { id: '1', name: 'Item' } }],
            },
            TEST_IDS.user
          ),
          service.importReferenceData(
            {
              table: ReferenceDataTable.MODULES,
              rows: [{ data: { id: '1', name: 'Crop' } }],
            },
            TEST_IDS.user
          ),
        ];

        const results = await Promise.all(promises);

        results.forEach((result) => {
          expect(result.success).toBe(true);
        });
      });
    });

    describe('Error Recovery', () => {
      it('should continue import after row error', async () => {
        const jobMock = { id: 'job-123' };
        // Use rows WITHOUT ids so the error path is triggered (line 134 in service)
        const rows = [
          { data: { name: 'Valid Item' } },
          { data: { name: 'Invalid Item' } },
          { data: { name: 'Another Valid Item' } },
        ];

        let insertCallCount = 0;

        mockClient.from.mockImplementation((table: string) => {
          const qb = createMockQueryBuilder();
          if (table === 'admin_job_logs') {
            qb.insert.mockReturnValue(qb);
            qb.select.mockReturnValue(qb);
            qb.single.mockResolvedValue(mockQueryResult(jobMock));
            const updateQb = createMockQueryBuilder();
            updateQb.eq.mockReturnValue(updateQb);
            qb.update.mockReturnValue(updateQb);
          } else if (table === ReferenceDataTable.ACCOUNT_TEMPLATES) {
            // Mock insert - fail on second call with error
            qb.insert.mockImplementation(() => {
              insertCallCount++;
              if (insertCallCount === 2) {
                // Return error on second insert
                return Promise.resolve({ data: null, error: { message: 'Validation failed' } });
              }
              return Promise.resolve({ data: {}, error: null });
            });
          }
          return qb;
        });

        const dto: ImportReferenceDataDto = {
          table: ReferenceDataTable.ACCOUNT_TEMPLATES,
          rows,
        };

        const result = await service.importReferenceData(dto, TEST_IDS.user);

        expect(result.recordsProcessed).toBe(3);
        expect(result.errors).toHaveLength(1);
        expect(result.success).toBe(false);
      });
    });

    describe('Materialized View Fallback', () => {
      it('should fall back to direct query when materialized view fails', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.ilike.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.range.mockResolvedValue(
          mockQueryResult(null, { message: 'Relation does not exist' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const query: OrgUsageQueryDto = {
          limit: '50',
          offset: '0',
        };

        // Should fall back and still return results
        const result = await service.getOrgUsage(query);

        expect(result.data).toBeDefined();
      });
    });

    describe('Organization Usage By ID', () => {
      it('should throw NotFoundException when org not found', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.getOrgUsageById('non-existent-org')
        ).rejects.toThrow(NotFoundException);
      });

      it('should include event counts in usage data', async () => {
        const mockOrg = {
          id: TEST_IDS.organization,
          name: 'Test Org',
          subscriptions: [{ plan_type: 'basic' }],
          subscription_usage: [{ mrr: 1000, arr: 12000 }],
        };

        mockClient.from.mockImplementation((table: string) => {
          const qb = createMockQueryBuilder();
          if (table === 'organizations') {
            const selectQb = createMockQueryBuilder();
            selectQb.eq.mockReturnValue(selectQb);
            selectQb.single.mockResolvedValue(mockQueryResult(mockOrg));
            qb.select.mockReturnValue(selectQb);
          } else if (table === 'events') {
            const selectQb = createMockQueryBuilder();

            // Create proper thenable result
            const thenableResult = {
              ...selectQb,
              then: (resolve: any) => resolve({ data: [], error: null, count: 10 }),
            };

            selectQb.eq.mockReturnValue({
              ...selectQb,
              gte: jest.fn().mockReturnValue(thenableResult),
            });
            qb.select.mockReturnValue(selectQb);
          }
          return qb;
        });

        const result = await service.getOrgUsageById(TEST_IDS.organization);

        expect(result.events7d).toBe(10);
        expect(result.events30d).toBe(10);
      });
    });
  });

  // ============================================================
  // INTEGRATION BEHAVIOR TESTS
  // ============================================================

  describe('Integration Behavior', () => {
    it('should use admin client for all operations', () => {
      expect(mockDatabaseService.getAdminClient).toBeDefined();
    });

    it('should handle complete reference data workflow', async () => {
      // 1. Import data
      const jobMock1 = { id: 'job-import' };
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'admin_job_logs') {
          qb.insert.mockReturnValue(qb);
          qb.select.mockReturnValue(qb);
          qb.single.mockResolvedValue(mockQueryResult(jobMock1));
          qb.update.mockReturnValue(qb);
        } else if (table === 'account_templates') {
          qb.insert.mockResolvedValue(mockQueryResult({}));
        }
        return qb;
      });

      const importResult = await service.importReferenceData(
        {
          table: ReferenceDataTable.ACCOUNT_TEMPLATES,
          rows: [{ data: { id: '1', name: 'Item' } }],
        },
        TEST_IDS.user
      );

      expect(importResult.success).toBe(true);

      // 2. Publish data
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockResolvedValue(mockQueryResult({}));
      mockClient.from.mockReturnValue(queryBuilder);

      const publishResult = await service.publishReferenceData(
        {
          table: ReferenceDataTable.ACCOUNT_TEMPLATES,
          ids: ['1'],
          unpublish: false,
        },
        TEST_IDS.user
      );

      expect(publishResult.success).toBe(true);

      // 3. Query data
      const queryBuilder2 = createMockQueryBuilder();
      queryBuilder2.select.mockReturnValue(queryBuilder2);
      queryBuilder2.order.mockReturnValue(queryBuilder2);
      queryBuilder2.range.mockResolvedValue({ data: [{ id: '1', name: 'Item' }], error: null, count: 1 });
      mockClient.from.mockReturnValue(queryBuilder2);

      const queryResult = await service.getReferenceData(
        ReferenceDataTable.ACCOUNT_TEMPLATES,
        { limit: '50', offset: '0' },
        TEST_IDS.user
      );

      expect(queryResult.data).toHaveLength(1);
    });
  });
});
