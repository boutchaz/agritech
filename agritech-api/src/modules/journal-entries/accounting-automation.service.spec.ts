import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountingAutomationService } from './accounting-automation.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  mockQueryResult,
  setupMultiTableMock,
  setupRpcMock,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('AccountingAutomationService', () => {
  let service: AccountingAutomationService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingAutomationService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AccountingAutomationService>(AccountingAutomationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('scopes rollback deletes to the organization', async () => {
    setupRpcMock(mockClient, 'generate_journal_entry_number', 'JE-2026-00001');

    const accountMappingsQuery = createMockQueryBuilder();
    accountMappingsQuery.maybeSingle.mockResolvedValue(
      mockQueryResult({ account_id: 'acc-1' }),
    );

    const journalEntriesQuery = createMockQueryBuilder();
    journalEntriesQuery.single.mockResolvedValue(
      mockQueryResult({ id: 'journal-entry-1' }),
    );

    const journalItemsQuery = createMockQueryBuilder();
    journalItemsQuery.insert.mockReturnValue({
      error: { message: 'Insert failed' },
    });

    setupMultiTableMock(mockClient, {
      account_mappings: accountMappingsQuery,
      journal_entries: journalEntriesQuery,
      journal_items: journalItemsQuery,
    });

    await expect(
      service.createJournalEntryFromCost(
        TEST_IDS.organization,
        'cost-1',
        'fuel',
        120,
        new Date(),
        'Fuel cost',
        TEST_IDS.user,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(journalEntriesQuery.eq).toHaveBeenCalledWith(
      'organization_id',
      TEST_IDS.organization,
    );
  });
});
