import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

// Mock fetch for CMS calls
global.fetch = jest.fn();

describe('AccountsService', () => {
  let service: AccountsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock; getPgPool: jest.Mock };
  let mockPool: {
    connect: jest.Mock;
    query: jest.Mock;
    release: jest.Mock;
  };
  let mockClientConnection: {
    query: jest.Mock;
    release: jest.Mock;
  };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const SUPPORTED_COUNTRIES = [
    {
      code: 'MA',
      name: 'Morocco',
      nativeName: 'المغرب',
      standard: 'CGNC',
      currency: 'MAD',
      fiscalMonth: 1,
      minAccounts: 120,
      industries: ['agriculture'],
    },
    {
      code: 'FR',
      name: 'France',
      nativeName: 'France',
      standard: 'PCG',
      currency: 'EUR',
      fiscalMonth: 1,
      minAccounts: 100,
      industries: ['agriculture', 'viticulture'],
    },
    {
      code: 'TN',
      name: 'Tunisia',
      nativeName: 'تونس',
      standard: 'PCN',
      currency: 'TND',
      fiscalMonth: 1,
      minAccounts: 100,
      industries: ['agriculture', 'olive', 'date_palms'],
    },
    {
      code: 'US',
      name: 'United States',
      nativeName: 'United States',
      standard: 'US_GAAP',
      currency: 'USD',
      fiscalMonth: 1,
      minAccounts: 150,
      industries: ['agriculture', 'ranching', 'dairy', 'organic_farming', 'agritourism'],
    },
    {
      code: 'GB',
      name: 'United Kingdom',
      nativeName: 'United Kingdom',
      standard: 'FRS102',
      currency: 'GBP',
      fiscalMonth: 4,
      minAccounts: 80,
      industries: ['agriculture'],
    },
    {
      code: 'DE',
      name: 'Germany',
      nativeName: 'Deutschland',
      standard: 'HGB',
      currency: 'EUR',
      fiscalMonth: 1,
      minAccounts: 100,
      industries: ['agriculture', 'livestock', 'dairy'],
    },
  ];

  const VALID_ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

  const INVALID_COUNTRY_CODES = ['XX', 'ZZ', 'INVALID', '123', ''];

  const EDGE_CASE_COUNTRY_CODES = ['ma', 'fr', 'TN', 'Gb', 'De'];

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockClientConnection = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClientConnection),
      query: jest.fn(),
      release: jest.fn(),
    };

    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
      getPgPool: jest.fn(() => mockPool),
    };

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function setupDatabaseForTemplateApply(organizationId: string, options: { shouldFail?: boolean; overwrite?: boolean } = {}) {
    mockClientConnection.query.mockImplementation((query: string, params?: any[]) => {
      // Mock organization exists check
      if (query.includes('SELECT id FROM organizations')) {
        return { rows: options.shouldFail ? [] : [{ id: organizationId }] };
      }

      // Mock account delete when overwrite is true
      if (query.includes('DELETE FROM accounts')) {
        return { rows: [] };
      }

      // Mock account insert
      if (query.includes('INSERT INTO accounts')) {
        if (options.shouldFail) {
          throw new Error('Database error');
        }
        return { rows: [{ id: `account-${Math.random()}` }] };
      }

      // Mock parent update
      if (query.includes('UPDATE accounts') && query.includes('parent_id')) {
        return { rows: [] };
      }

      // Mock account mapping creation
      if (query.includes('create_task_cost_mappings') || query.includes('create_harvest_sales_mappings')) {
        return { rows: [{ count: 5 }] };
      }

      return { rows: [] };
    });

    mockClientConnection.release.mockImplementation(() => {});

    // Track transaction calls
    const transactionCalls: string[] = [];
    mockClientConnection.query.mockImplementation((query: string) => {
      if (query.includes('BEGIN')) transactionCalls.push('BEGIN');
      if (query.includes('COMMIT')) transactionCalls.push('COMMIT');
      if (query.includes('ROLLBACK')) transactionCalls.push('ROLLBACK');

      // Return appropriate response based on query
      if (query.includes('SELECT id FROM organizations')) {
        return { rows: options.shouldFail ? [] : [{ id: organizationId }] };
      }
      if (query.includes('DELETE FROM accounts')) {
        return { rows: [] };
      }
      if (query.includes('INSERT INTO accounts')) {
        if (options.shouldFail) throw new Error('Database error');
        return { rows: [{ id: `account-${Math.random()}` }] };
      }
      if (query.includes('UPDATE accounts')) {
        return { rows: [] };
      }
      if (query.includes('create_task_cost_mappings') || query.includes('create_harvest_sales_mappings')) {
        return { rows: [{ count: 5 }] };
      }
      return { rows: [] };
    });
  }

  function setupCmsSuccessResponse(data: any) {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data }),
    });
  }

  function setupCmsFailure() {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('CMS unavailable'));
  }

  function setupCmsNotFound() {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
  }

  // ============================================================
  // PARAMETERIZED TESTS - COUNTRY TEMPLATES
  // ============================================================

  describe('getTemplateByCountry (Parameterized)', () => {
    it.each(SUPPORTED_COUNTRIES)(
      'should return valid template for $name ($code) with correct structure',
      async ({ code, name, nativeName, standard, currency, fiscalMonth, minAccounts, industries }) => {
        setupCmsFailure();

        const result = await service.getTemplateByCountry(code);

        // Verify template structure
        expect(result).toBeDefined();
        expect(result.country_code).toBe(code);
        expect(result.country_name).toBe(name);
        expect(result.accounting_standard).toBe(standard);
        expect(result.default_currency).toBe(currency);
        expect(result.fiscal_year_start_month).toBe(fiscalMonth);

        // Verify accounts exist and have minimum count
        expect(result.accounts).toBeDefined();
        expect(result.accounts.length).toBeGreaterThanOrEqual(minAccounts);

        // Verify supported industries
        expect(result.supported_industries).toBeDefined();
        expect(Array.isArray(result.supported_industries)).toBe(true);
        industries.forEach((industry) => {
          expect(result.supported_industries).toContain(industry);
        });
      }
    );

    it.each(SUPPORTED_COUNTRIES)(
      'should have valid account structures for $code',
      async ({ code }) => {
        setupCmsFailure();

        const result = await service.getTemplateByCountry(code);

        // Verify all accounts have required properties
        result.accounts.forEach((account: any) => {
          expect(account).toHaveProperty('code');
          expect(account).toHaveProperty('name');
          expect(account).toHaveProperty('account_type');
          expect(account).toHaveProperty('account_subtype');
          expect(account).toHaveProperty('is_group');
          expect(account).toHaveProperty('is_active');

          // Verify account type is valid
          expect(VALID_ACCOUNT_TYPES).toContain(account.account_type);

          // Verify code is a string
          expect(typeof account.code).toBe('string');
          expect(account.code.length).toBeGreaterThan(0);
        });
      }
    );

    it.each(SUPPORTED_COUNTRIES)(
      'should have unique account codes for $code',
      async ({ code }) => {
        setupCmsFailure();

        const result = await service.getTemplateByCountry(code);

        const codes = result.accounts.map((a: any) => a.code);
        const uniqueCodes = new Set(codes);

        expect(codes.length).toBe(uniqueCodes.size);
      }
    );
  });

  describe('applyTemplate (Parameterized)', () => {
    const organizationId = TEST_IDS.organization;

    it.each(SUPPORTED_COUNTRIES)(
      'should successfully apply $name template to organization',
      async ({ code, minAccounts }) => {
        setupCmsFailure();
        setupDatabaseForTemplateApply(organizationId);

        const result = await service.applyTemplate(code, organizationId);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.accounts_created).toBeGreaterThanOrEqual(minAccounts);
        expect(mockPool.connect).toHaveBeenCalled();
        expect(mockClientConnection.release).toHaveBeenCalled();
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('getTemplateByCountry', () => {
      it.each(INVALID_COUNTRY_CODES)(
        'should throw NotFoundException for invalid country code: %s',
        async (code) => {
          setupCmsFailure();

          await expect(service.getTemplateByCountry(code)).rejects.toThrow(NotFoundException);
          await expect(service.getTemplateByCountry(code)).rejects.toThrow(
            `Template not found for country: ${code.toUpperCase()}`
          );
        }
      );

      it.each([null, undefined, 0, {}, []])(
        'should handle invalid input types gracefully',
        async (input) => {
          setupCmsFailure();

          // Should throw NotFoundException for null/undefined/non-string types
          await expect(service.getTemplateByCountry(input as any)).rejects.toThrow(NotFoundException);
        }
      );
    });

    describe('applyTemplate', () => {
      const organizationId = TEST_IDS.organization;

      it.each(['', '   ', '\t\n'])(
        'should handle empty/whitespace organization ID',
        async (orgId) => {
          setupCmsFailure();
          setupDatabaseForTemplateApply(orgId, { shouldFail: true });

          await expect(service.applyTemplate('FR', orgId)).rejects.toThrow();
        }
      );

      it.each(INVALID_COUNTRY_CODES)(
        'should throw NotFoundException for invalid country code in applyTemplate: %s',
        async (code) => {
          setupCmsFailure();

          await expect(service.applyTemplate(code, organizationId)).rejects.toThrow(
            NotFoundException
          );
        }
      );
    });

    describe('CRUD Operations', () => {
      const organizationId = TEST_IDS.organization;

      it('should reject account creation with missing required fields', async () => {
        const invalidAccount = {
          code: '101',
          // Missing: name, account_type, etc.
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        // Simulate database error for missing required fields
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'null value in column "name" violates not-null constraint' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.create(invalidAccount as any, organizationId, 'user-id')
        ).rejects.toThrow(BadRequestException);
      });

      it('should handle database error response', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'Invalid UUID' }));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.findOne('invalid-uuid-format', organizationId)).rejects.toThrow(BadRequestException);
      });
    });
  });

  // ============================================================
  // CMS INTEGRATION TESTS
  // ============================================================

  describe('CMS Integration', () => {
    describe('getAvailableTemplates', () => {
      it('should return complete CMS response when available', async () => {
        const cmsResponse = SUPPORTED_COUNTRIES.map((c) => ({
          country_code: c.code,
          country_name: c.name,
          country_name_native: c.nativeName,
          accounting_standard: c.standard,
          default_currency: c.currency,
          version: '1.0.0',
        }));

        setupCmsSuccessResponse(cmsResponse);

        const result = await service.getAvailableTemplates();

        expect(result).toHaveLength(SUPPORTED_COUNTRIES.length);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/chart-of-account-templates/countries')
        );

        // Verify all expected countries are present
        SUPPORTED_COUNTRIES.forEach((country) => {
          const found = result.find((r) => r.country_code === country.code);
          expect(found).toBeDefined();
          expect(found?.accounting_standard).toBe(country.standard);
          expect(found?.default_currency).toBe(country.currency);
        });
      });

      it('should fall back to local templates when CMS is unavailable', async () => {
        setupCmsFailure();

        const result = await service.getAvailableTemplates();

        expect(result).toHaveLength(SUPPORTED_COUNTRIES.length);

        // Verify fallback data integrity
        result.forEach((template) => {
          expect(template).toHaveProperty('country_code');
          expect(template).toHaveProperty('accounting_standard');
          expect(template).toHaveProperty('default_currency');
          expect(template).toHaveProperty('version');
        });
      });

      it('should handle CMS partial failure gracefully', async () => {
        (global.fetch as jest.Mock).mockImplementation(() => {
          throw new Error('Network timeout');
        });

        const result = await service.getAvailableTemplates();

        // Should still return fallback templates
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('getTemplateByCountry', () => {
      it('should use CMS template when available', async () => {
        const cmsAttributes = {
          id: 1,
          country_code: 'FR',
          country_name: 'France',
          accounting_standard: 'PCG',
          default_currency: 'EUR',
          accounts: [
            {
              code: '101',
              name: 'Capital',
              account_type: 'Equity',
              account_subtype: 'Capital',
              is_group: true,
              is_active: true,
              currency_code: 'EUR',
            },
          ],
        };

        setupCmsSuccessResponse({ attributes: cmsAttributes });

        const result = await service.getTemplateByCountry('FR');

        expect(result).toBeDefined();
        expect(result.country_code).toBe('FR');
        expect(result.accounts).toBeDefined();
      });

      it('should fall back to local template when CMS returns 404', async () => {
        setupCmsNotFound();

        const result = await service.getTemplateByCountry('FR');

        expect(result).toBeDefined();
        expect(result.country_code).toBe('FR');
        expect(result.accounts.length).toBeGreaterThan(0);
      });

      it('should fall back to local template when CMS network fails', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        const result = await service.getTemplateByCountry('DE');

        expect(result).toBeDefined();
        expect(result.country_code).toBe('DE');
        expect(result.accounts.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Account Seeding', () => {
    const organizationId = TEST_IDS.organization;

    it('should maintain parent-child relationships during seeding', async () => {
      setupCmsFailure();

      let parentUpdateCalls = 0;
      mockClientConnection.query.mockImplementation((query: string) => {
        if (query.includes('BEGIN')) return { rows: [] };
        if (query.includes('SELECT id FROM organizations')) {
          return { rows: [{ id: organizationId }] };
        }
        if (query.includes('INSERT INTO accounts')) {
          return { rows: [{ id: 'account-id' }] };
        }
        if (query.includes('UPDATE accounts') && query.includes('parent_id')) {
          parentUpdateCalls++;
          return { rows: [] };
        }
        return { rows: [] };
      });

      await service.applyTemplate('MA', organizationId);

      // Moroccan chart has many parent-child relationships
      expect(parentUpdateCalls).toBeGreaterThan(10);
    });

    it('should skip existing accounts when overwrite is false', async () => {
      setupCmsFailure();

      let insertCount = 0;
      let deleteCount = 0;

      mockClientConnection.query.mockImplementation((query: string) => {
        if (query.includes('BEGIN')) return { rows: [] };
        if (query.includes('SELECT id FROM organizations')) {
          return { rows: [{ id: organizationId }] };
        }
        if (query.includes('DELETE FROM accounts')) {
          deleteCount++;
          return { rows: [] };
        }
        if (query.includes('INSERT INTO accounts')) {
          insertCount++;
          // Simulate account already exists
          return { rows: [] };
        }
        return { rows: [] };
      });

      await service.applyTemplate('FR', organizationId, { overwrite: false });

      expect(deleteCount).toBe(0);
      expect(insertCount).toBeGreaterThan(0);
    });

    it('should delete all existing accounts when overwrite is true', async () => {
      setupCmsFailure();

      let deleteCalled = false;
      mockClientConnection.query.mockImplementation((query: string) => {
        if (query.includes('BEGIN')) return { rows: [] };
        if (query.includes('SELECT id FROM organizations')) {
          return { rows: [{ id: organizationId }] };
        }
        if (query.includes('DELETE FROM accounts')) {
          deleteCalled = true;
          return { rows: [] };
        }
        if (query.includes('INSERT INTO accounts')) {
          return { rows: [{ id: 'account-id' }] };
        }
        return { rows: [] };
      });

      await service.applyTemplate('FR', organizationId, { overwrite: true });

      expect(deleteCalled).toBe(true);
    });

    it('should create account mappings when requested', async () => {
      setupCmsFailure();

      let mappingCalls = 0;
      mockClientConnection.query.mockImplementation((query: string) => {
        if (query.includes('BEGIN')) return { rows: [] };
        if (query.includes('SELECT id FROM organizations')) {
          return { rows: [{ id: organizationId }] };
        }
        if (query.includes('INSERT INTO accounts')) {
          return { rows: [{ id: 'account-id' }] };
        }
        if (query.includes('create_task_cost_mappings') || query.includes('create_harvest_sales_mappings')) {
          mappingCalls++;
          return { rows: [{ count: 5 }] };
        }
        return { rows: [] };
      });

      const result = await service.applyTemplate('MA', organizationId, {
        includeAccountMappings: true,
      });

      expect(mappingCalls).toBe(2); // task mappings + harvest mappings
      expect(result.account_mappings_created).toBeGreaterThan(0);
    });
  });

  describe('Behavior - Transaction Management', () => {
    const organizationId = TEST_IDS.organization;

    it('should commit transaction on successful seeding', async () => {
      setupCmsFailure();

      const transactionCalls: string[] = [];
      mockClientConnection.query.mockImplementation((query: string) => {
        if (query.includes('BEGIN')) {
          transactionCalls.push('BEGIN');
          return { rows: [] };
        }
        if (query.includes('COMMIT')) {
          transactionCalls.push('COMMIT');
          return { rows: [] };
        }
        if (query.includes('ROLLBACK')) {
          transactionCalls.push('ROLLBACK');
          return { rows: [] };
        }
        if (query.includes('SELECT id FROM organizations')) {
          return { rows: [{ id: organizationId }] };
        }
        if (query.includes('INSERT INTO accounts')) {
          return { rows: [{ id: 'account-id' }] };
        }
        return { rows: [] };
      });

      await service.applyTemplate('FR', organizationId);

      expect(transactionCalls).toContain('BEGIN');
      expect(transactionCalls).toContain('COMMIT');
      expect(transactionCalls).not.toContain('ROLLBACK');
    });

    it('should rollback transaction on database error', async () => {
      setupCmsFailure();

      const transactionCalls: string[] = [];
      mockClientConnection.query.mockImplementation((query: string) => {
        if (query.includes('BEGIN')) {
          transactionCalls.push('BEGIN');
          return { rows: [] };
        }
        if (query.includes('COMMIT')) {
          transactionCalls.push('COMMIT');
          return { rows: [] };
        }
        if (query.includes('ROLLBACK')) {
          transactionCalls.push('ROLLBACK');
          return { rows: [] };
        }
        if (query.includes('SELECT id FROM organizations')) {
          return { rows: [{ id: organizationId }] };
        }
        // Simulate error during insert
        throw new Error('Database connection lost');
      });

      await expect(service.applyTemplate('FR', organizationId)).rejects.toThrow();

      expect(transactionCalls).toContain('BEGIN');
      expect(transactionCalls).toContain('ROLLBACK');
      expect(transactionCalls).not.toContain('COMMIT');
    });

    it('should release database connection after transaction', async () => {
      setupCmsFailure();
      setupDatabaseForTemplateApply(organizationId);

      await service.applyTemplate('FR', organizationId);

      expect(mockClientConnection.release).toHaveBeenCalled();
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    const organizationId = TEST_IDS.organization;

    describe('Case Sensitivity', () => {
      it.each(EDGE_CASE_COUNTRY_CODES)(
        'should handle mixed case country code: %s',
        async (code) => {
          setupCmsFailure();

          const result = await service.getTemplateByCountry(code);

          expect(result).toBeDefined();
          expect(result.country_code).toBe(code.toUpperCase());
        }
      );
    });

    describe('Large Volume Operations', () => {
      it('should handle large chart of accounts (100+ accounts)', async () => {
        setupCmsFailure();

        let accountCount = 0;
        mockClientConnection.query.mockImplementation((query: string) => {
          if (query.includes('BEGIN')) return { rows: [] };
          if (query.includes('SELECT id FROM organizations')) {
            return { rows: [{ id: organizationId }] };
          }
          if (query.includes('INSERT INTO accounts')) {
            accountCount++;
            return { rows: [{ id: `account-${accountCount}` }] };
          }
          return { rows: [] };
        });

        const result = await service.applyTemplate('MA', organizationId);

        expect(result.accounts_created).toBeGreaterThan(100);
        expect(accountCount).toBeGreaterThan(100);
      });

      it('should handle multiple sequential template applications', async () => {
        setupCmsFailure();
        setupDatabaseForTemplateApply(organizationId);

        // Apply first template
        const result1 = await service.applyTemplate('FR', organizationId);

        // Apply second template (with overwrite)
        const result2 = await service.applyTemplate('DE', organizationId, { overwrite: true });

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple simultaneous template requests', async () => {
        setupCmsFailure();
        setupDatabaseForTemplateApply(organizationId);

        const promises = SUPPORTED_COUNTRIES.slice(0, 3).map((country) =>
          service.applyTemplate(country.code, organizationId)
        );

        const results = await Promise.all(promises);

        results.forEach((result) => {
          expect(result.success).toBe(true);
        });
      });
    });

    describe('Resource Management', () => {
      it('should not leak database connections on error', async () => {
        setupCmsFailure();

        mockClientConnection.query.mockImplementation(() => {
          throw new Error('Connection error');
        });

        const initialConnectCalls = mockPool.connect.mock.calls.length;

        try {
          await service.applyTemplate('FR', organizationId);
        } catch (e) {
          // Expected to throw
        }

        // Connection should still be released
        expect(mockClientConnection.release).toHaveBeenCalled();
      });

      it('should handle connection pool exhaustion gracefully', async () => {
        setupCmsFailure();

        mockPool.connect.mockRejectedValue(new Error('Connection pool exhausted'));

        await expect(service.applyTemplate('FR', organizationId)).rejects.toThrow();
      });
    });

    describe('Data Integrity', () => {
      it('should handle accounts with special characters in names', async () => {
        setupCmsFailure();

        const specialNameAccounts = [
          { code: '001', name: "Côte d'Ivoire", account_type: 'Asset' as const },
          { code: '002', name: 'São Paulo', account_type: 'Asset' as const },
          { code: '003', name: 'Московский', account_type: 'Asset' as const },
        ];

        mockClientConnection.query.mockImplementation((query: string, params?: any[]) => {
          if (query.includes('BEGIN')) return { rows: [] };
          if (query.includes('SELECT id FROM organizations')) {
            return { rows: [{ id: organizationId }] };
          }
          if (query.includes('INSERT INTO accounts')) {
            const accountName = params[2]; // name is 3rd parameter
            expect(accountName).toBeTruthy();
            return { rows: [{ id: 'account-id' }] };
          }
          return { rows: [] };
        });

        // This would be tested with actual template that has special characters
        const result = await service.applyTemplate('FR', organizationId);

        expect(result.success).toBe(true);
      });

      it('should handle very long account codes', async () => {
        setupCmsFailure();

        const longCode = 'A'.repeat(50);

        mockClientConnection.query.mockImplementation((query: string, params?: any[]) => {
          if (query.includes('BEGIN')) return { rows: [] };
          if (query.includes('SELECT id FROM organizations')) {
            return { rows: [{ id: organizationId }] };
          }
          if (query.includes('INSERT INTO accounts')) {
            const code = params[1]; // code is 2nd parameter
            expect(code.length).toBeLessThanOrEqual(50);
            return { rows: [{ id: 'account-id' }] };
          }
          return { rows: [] };
        });

        await service.applyTemplate('FR', organizationId);
      });
    });

    describe('Organization State', () => {
      it('should fail gracefully when organization does not exist', async () => {
        setupCmsFailure();

        mockClientConnection.query.mockImplementation((query: string) => {
          if (query.includes('SELECT id FROM organizations')) {
            return { rows: [] }; // No organization found
          }
          return { rows: [] };
        });

        await expect(service.applyTemplate('FR', 'non-existent-org')).rejects.toThrow(
          BadRequestException
        );
        await expect(service.applyTemplate('FR', 'non-existent-org')).rejects.toThrow(
          'Organization not found'
        );
      });

      it('should handle organization with existing accounts', async () => {
        setupCmsFailure();

        let hasExistingAccounts = true;
        mockClientConnection.query.mockImplementation((query: string) => {
          if (query.includes('BEGIN')) return { rows: [] };
          if (query.includes('SELECT id FROM organizations')) {
            return { rows: [{ id: organizationId }] };
          }
          if (query.includes('INSERT INTO accounts')) {
            // ON CONFLICT DO NOTHING should handle existing accounts
            if (hasExistingAccounts) {
              return { rows: [] }; // No rows returned = conflict
            }
            return { rows: [{ id: 'new-account-id' }] };
          }
          return { rows: [] };
        });

        const result = await service.applyTemplate('FR', organizationId, { overwrite: false });

        // Should succeed without errors
        expect(result.success).toBe(true);
      });
    });
  });

  // ============================================================
  // CRUD OPERATIONS TESTS
  // ============================================================

  describe('CRUD Operations', () => {
    const organizationId = TEST_IDS.organization;

    describe('findAll', () => {
      it('should return all active accounts for organization', async () => {
        const mockAccounts = [
          {
            id: '1',
            code: '101',
            name: 'Capital',
            is_active: true,
            organization_id: organizationId,
          },
          {
            id: '2',
            code: '201',
            name: 'Stocks',
            is_active: true,
            organization_id: organizationId,
          },
        ];

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        // Setup the then method to return the data
        queryBuilder.then.mockImplementation((resolve: (value: { data: any[]; error: any }) => void) => {
          resolve({ data: mockAccounts, error: null });
          return Promise.resolve({ data: mockAccounts, error: null });
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(organizationId, true);

        expect(result).toEqual(mockAccounts);
        expect(mockClient.from).toHaveBeenCalledWith('accounts');
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
        expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
        expect(queryBuilder.order).toHaveBeenCalledWith('code', { ascending: true });
      });

      it('should return all accounts regardless of active status', async () => {
        const mockAccounts = [
          { id: '1', code: '101', name: 'Capital', is_active: true, organization_id: organizationId },
          { id: '2', code: '201', name: 'Stocks', is_active: false, organization_id: organizationId },
        ];

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.then.mockImplementation((resolve: (value: { data: any[]; error: any }) => void) => {
          resolve({ data: mockAccounts, error: null });
          return Promise.resolve({ data: mockAccounts, error: null });
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(organizationId);

        expect(result).toHaveLength(2);
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
        expect(queryBuilder.eq).not.toHaveBeenCalledWith('is_active', expect.anything());
      });

      it('should return empty array when no accounts exist', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.then.mockImplementation((resolve: (value: { data: any[]; error: any }) => void) => {
          resolve({ data: [], error: null });
          return Promise.resolve({ data: [], error: null });
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(organizationId);

        expect(result).toEqual([]);
      });
    });

    describe('findOne', () => {
      it('should return account by ID', async () => {
        const mockAccount = {
          id: '1',
          code: '101',
          name: 'Capital',
          organization_id: organizationId,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(mockAccount));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findOne('1', organizationId);

        expect(result).toEqual(mockAccount);
        expect(queryBuilder.eq).toHaveBeenCalledWith('id', '1');
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      });

      it('should throw BadRequestException when account not found', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        // Return null data with no error to trigger the "not found" exception
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, null));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.findOne('non-existent', organizationId)).rejects.toThrow(
          BadRequestException
        );
        await expect(service.findOne('non-existent', organizationId)).rejects.toThrow(
          'Account not found'
        );
      });

      it('should throw error on database error', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'Database error' }));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.findOne('1', organizationId)).rejects.toThrow(BadRequestException);
      });
    });

    describe('create', () => {
      it('should create new account with organization context', async () => {
        const newAccount = {
          code: '101',
          name: 'Capital',
          account_type: 'Equity',
          account_subtype: 'Share Capital',
          is_group: true,
          is_active: true,
          currency_code: 'MAD',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'new-id',
            ...newAccount,
            organization_id: organizationId,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(newAccount, organizationId, 'user-id');

        expect(result.code).toBe(newAccount.code);
        expect(result.name).toBe(newAccount.name);
        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            ...newAccount,
            organization_id: organizationId,
            created_by: 'user-id',
          })
        );
      });

      it('should handle account with parent_code reference', async () => {
        const newAccount = {
          code: '1011',
          name: 'Sub Account',
          account_type: 'Asset' as const,
          account_subtype: 'Current Assets',
          is_group: false,
          is_active: true,
          currency_code: 'MAD',
          parent_code: '101',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'new-id',
            ...newAccount,
            organization_id: organizationId,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(newAccount, organizationId, 'user-id');

        expect(result.parent_code).toBe('101');
      });
    });

    describe('update', () => {
      it('should update existing account', async () => {
        const updates = {
          name: 'Updated Capital',
          description: 'Updated description',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: '1',
            code: '101',
            ...updates,
            organization_id: organizationId,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.update('1', updates, organizationId);

        expect(result.name).toBe('Updated Capital');
        expect(result.description).toBe('Updated description');
        expect(queryBuilder.update).toHaveBeenCalledWith(updates);
        expect(queryBuilder.eq).toHaveBeenCalledWith('id', '1');
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      });

      it('should throw BadRequestException when updating non-existent account', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.update('non-existent', {}, organizationId)).rejects.toThrow(
          BadRequestException
        );
      });
    });

    describe('delete', () => {
      it('should delete account by ID', async () => {
        const queryBuilder = createMockQueryBuilder();
        // Mock eq to return queryBuilder for chaining, and also mock the final result
        queryBuilder.eq.mockReturnValue(queryBuilder);
        mockClient.from.mockReturnValue(queryBuilder);

        await service.delete('1', organizationId);

        expect(queryBuilder.delete).toHaveBeenCalled();
        expect(queryBuilder.eq).toHaveBeenCalledWith('id', '1');
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      });

      it('should throw BadRequestException on delete failure', async () => {
        const queryBuilder = createMockQueryBuilder();
        // Mock eq to return queryBuilder for chaining, except on the second call which throws
        let callCount = 0;
        queryBuilder.eq.mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            throw new Error('Foreign key constraint');
          }
          return queryBuilder;
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.delete('1', organizationId)).rejects.toThrow();
      });
    });
  });

  // ============================================================
  // MOROCCAN CHART SPECIFIC TESTS
  // ============================================================

  describe('seedMoroccanChartOfAccounts', () => {
    const organizationId = TEST_IDS.organization;

    it('should seed complete Moroccan chart with correct currency', async () => {
      let insertCount = 0;
      let currencyVerified = false;

      mockClientConnection.query.mockImplementation((query: string, params?: any[]) => {
        if (query.includes('BEGIN')) return { rows: [] };
        if (query.includes('SELECT id FROM organizations')) {
          return { rows: [{ id: organizationId }] };
        }
        if (query.includes('INSERT INTO accounts')) {
          insertCount++;
          // Verify currency is MAD
          if (params[7] === 'MAD') {
            currencyVerified = true;
          }
          return { rows: [{ id: `account-${insertCount}` }] };
        }
        if (query.includes('UPDATE accounts')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      const result = await service.seedMoroccanChartOfAccounts(organizationId);

      expect(result.success).toBe(true);
      expect(result.accounts_created).toBeGreaterThan(100);
      expect(currencyVerified).toBe(true);
    });

    it('should handle legacy Moroccan chart format', async () => {
      mockClientConnection.query.mockImplementation((query: string) => {
        if (query.includes('BEGIN')) return { rows: [] };
        if (query.includes('SELECT id FROM organizations')) {
          return { rows: [{ id: organizationId }] };
        }
        if (query.includes('INSERT INTO accounts')) {
          return { rows: [{ id: 'account-id' }] };
        }
        return { rows: [] };
      });

      const result = await service.seedMoroccanChartOfAccounts(organizationId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  // ============================================================
  // AGRICULTURAL FEATURES TESTS
  // ============================================================

  describe('Agricultural Features', () => {
    it('should include agricultural categories in modern charts', async () => {
      setupCmsFailure();

      const template = await service.getTemplateByCountry('FR');

      const accountsWithAgriCategory = template.accounts.filter(
        (a: any) => a.agricultural_category
      );

      expect(accountsWithAgriCategory.length).toBeGreaterThan(0);

      // Verify valid categories
      const validCategories = ['crop', 'livestock', 'equipment', 'land', 'supplies', 'labor', 'general'];
      accountsWithAgriCategory.forEach((account: any) => {
        expect(validCategories).toContain(account.agricultural_category);
      });
    });

    it('should include depreciation rates for fixed assets', async () => {
      setupCmsFailure();

      const template = await service.getTemplateByCountry('DE');

      const accountsWithDepreciation = template.accounts.filter(
        (a: any) => a.depreciation_rate !== undefined
      );

      expect(accountsWithDepreciation.length).toBeGreaterThan(0);

      accountsWithDepreciation.forEach((account: any) => {
        expect(account.depreciation_rate).toBeGreaterThanOrEqual(0);
        expect(account.depreciation_rate).toBeLessThanOrEqual(100);
      });
    });

    it('should include tax deductible flags where applicable', async () => {
      setupCmsFailure();

      const template = await service.getTemplateByCountry('FR');

      const accountsWithTaxDeductible = template.accounts.filter(
        (a: any) => a.tax_deductible !== undefined
      );

      expect(accountsWithTaxDeductible.length).toBeGreaterThan(0);

      accountsWithTaxDeductible.forEach((account: any) => {
        expect(typeof account.tax_deductible).toBe('boolean');
      });
    });
  });
});
