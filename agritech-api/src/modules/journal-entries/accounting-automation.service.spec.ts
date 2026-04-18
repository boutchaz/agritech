import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountingAutomationService } from './accounting-automation.service';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  mockQueryResult,
  setupMultiTableMock,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('AccountingAutomationService', () => {
  let service: AccountingAutomationService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;
  let mockSequencesService: { generateJournalEntryNumber: jest.Mock };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);
    mockSequencesService = {
      generateJournalEntryNumber: jest.fn().mockResolvedValue('JE-2026-00001'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingAutomationService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: SequencesService, useValue: mockSequencesService },
      ],
    }).compile();

    service = module.get<AccountingAutomationService>(AccountingAutomationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveAccountId', () => {
    it('returns account_id from org-level mapping when found', async () => {
      const accountMappingsQuery = createMockQueryBuilder();
      accountMappingsQuery.maybeSingle.mockResolvedValue(
        mockQueryResult({ account_id: 'acc-3420', account_code: '3420' }),
      );

      setupMultiTableMock(mockClient, {
        account_mappings: accountMappingsQuery,
      });

      const result = await service.resolveAccountId(
        TEST_IDS.organization,
        'receivable',
        'trade',
      );

      expect(result).toBe('acc-3420');
    });

    it('falls back to global template when org mapping has no account_id', async () => {
      // First call: org mapping returns no account_id
      const orgMappingQuery = createMockQueryBuilder();
      let callCount = 0;

      // account_mappings is called multiple times: org lookup, then global lookup
      const accountMappingsQuery = createMockQueryBuilder();
      accountMappingsQuery.maybeSingle
        .mockResolvedValueOnce(mockQueryResult({ account_id: null, account_code: '3420' })) // org mapping, no account_id
        .mockResolvedValueOnce(mockQueryResult({ account_code: '3420' })); // global template

      const organizationsQuery = createMockQueryBuilder();
      organizationsQuery.single.mockResolvedValue(
        mockQueryResult({ country_code: 'MA', accounting_standard: 'CGNC' }),
      );

      const accountsQuery = createMockQueryBuilder();
      accountsQuery.maybeSingle.mockResolvedValue(
        mockQueryResult({ id: 'acc-3420-resolved' }),
      );

      setupMultiTableMock(mockClient, {
        account_mappings: accountMappingsQuery,
        organizations: organizationsQuery,
        accounts: accountsQuery,
      });

      const result = await service.resolveAccountId(
        TEST_IDS.organization,
        'receivable',
        'trade',
      );

      expect(result).toBe('acc-3420-resolved');
    });

    it('returns null when no mapping exists at all', async () => {
      const accountMappingsQuery = createMockQueryBuilder();
      accountMappingsQuery.maybeSingle
        .mockResolvedValueOnce(mockQueryResult(null)) // no org mapping
        .mockResolvedValueOnce(mockQueryResult(null)); // no global mapping

      const organizationsQuery = createMockQueryBuilder();
      organizationsQuery.single.mockResolvedValue(
        mockQueryResult({ country_code: 'MA', accounting_standard: 'CGNC' }),
      );

      setupMultiTableMock(mockClient, {
        account_mappings: accountMappingsQuery,
        organizations: organizationsQuery,
      });

      const result = await service.resolveAccountId(
        TEST_IDS.organization,
        'nonexistent',
        'type',
      );

      expect(result).toBeNull();
    });

    it('returns null when org has no country_code set', async () => {
      const accountMappingsQuery = createMockQueryBuilder();
      accountMappingsQuery.maybeSingle.mockResolvedValue(mockQueryResult(null));

      const organizationsQuery = createMockQueryBuilder();
      organizationsQuery.single.mockResolvedValue(
        mockQueryResult({ country_code: null, accounting_standard: null }),
      );

      setupMultiTableMock(mockClient, {
        account_mappings: accountMappingsQuery,
        organizations: organizationsQuery,
      });

      const result = await service.resolveAccountId(
        TEST_IDS.organization,
        'receivable',
        'trade',
      );

      expect(result).toBeNull();
    });
  });

  describe('createJournalEntryFromCost', () => {
    it('throws BadRequestException when cost_type mapping is missing', async () => {
      const accountMappingsQuery = createMockQueryBuilder();
      accountMappingsQuery.maybeSingle.mockResolvedValue(mockQueryResult(null));

      const organizationsQuery = createMockQueryBuilder();
      organizationsQuery.single.mockResolvedValue(
        mockQueryResult({ country_code: 'MA', accounting_standard: 'CGNC' }),
      );

      setupMultiTableMock(mockClient, {
        account_mappings: accountMappingsQuery,
        organizations: organizationsQuery,
      });

      await expect(
        service.createJournalEntryFromCost(
          TEST_IDS.organization,
          'cost-1',
          'unknown_type',
          500,
          new Date(),
          'Test cost',
          TEST_IDS.user,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when cash/bank mapping is missing', async () => {
      const accountMappingsQuery = createMockQueryBuilder();
      // First call returns expense account, second returns null for cash
      accountMappingsQuery.maybeSingle
        .mockResolvedValueOnce(mockQueryResult({ account_id: 'acc-expense' }))
        .mockResolvedValueOnce(mockQueryResult(null)); // no cash mapping

      const organizationsQuery = createMockQueryBuilder();
      organizationsQuery.single.mockResolvedValue(
        mockQueryResult({ country_code: 'MA', accounting_standard: 'CGNC' }),
      );

      setupMultiTableMock(mockClient, {
        account_mappings: accountMappingsQuery,
        organizations: organizationsQuery,
      });

      await expect(
        service.createJournalEntryFromCost(
          TEST_IDS.organization,
          'cost-1',
          'labor',
          500,
          new Date(),
          'Test cost',
          TEST_IDS.user,
        ),
      ).rejects.toThrow(/cash account mapping missing/i);
    });
  });

  describe('createJournalEntryFromRevenue', () => {
    it('throws BadRequestException when revenue_type mapping is missing', async () => {
      const accountMappingsQuery = createMockQueryBuilder();
      accountMappingsQuery.maybeSingle.mockResolvedValue(mockQueryResult(null));

      const organizationsQuery = createMockQueryBuilder();
      organizationsQuery.single.mockResolvedValue(
        mockQueryResult({ country_code: 'MA', accounting_standard: 'CGNC' }),
      );

      setupMultiTableMock(mockClient, {
        account_mappings: accountMappingsQuery,
        organizations: organizationsQuery,
      });

      await expect(
        service.createJournalEntryFromRevenue(
          TEST_IDS.organization,
          'rev-1',
          'unknown_type',
          1000,
          new Date(),
          'Test revenue',
          TEST_IDS.user,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
