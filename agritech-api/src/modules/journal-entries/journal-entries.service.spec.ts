import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JournalEntriesService } from './journal-entries.service';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  createThenableQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS, TEST_DATES } from '../../../test/helpers/test-utils';
import {
  mockJournalEntries,
  mockJournalItems,
  mockAccounts,
  createJournalEntryDto,
  createUnbalancedJournalEntryDto,
} from '../../../test/fixtures/accounting.fixture';

describe('JournalEntriesService', () => {
  let service: JournalEntriesService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };
  let mockSequencesService: { generateJournalEntryNumber: jest.Mock };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };
    mockSequencesService = {
      generateJournalEntryNumber: jest.fn().mockResolvedValue('JE-2024-00001'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalEntriesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: SequencesService, useValue: mockSequencesService },
      ],
    }).compile();

    service = module.get<JournalEntriesService>(JournalEntriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a balanced journal entry', async () => {
      const dto = createJournalEntryDto();
      const expectedEntry = {
        id: 'new-je-id',
        entry_number: 'JE-2024-00001',
        entry_date: dto.entry_date,
        total_debit: 1000,
        total_credit: 1000,
        status: 'draft',
        organization_id: TEST_IDS.organization,
        journal_items: dto.items.map((item, idx) => ({
          id: `ji-${idx}`,
          ...item,
          accounts: mockAccounts.cash,
        })),
      };

      mockClient.rpc.mockResolvedValue(mockQueryResult('JE-2024-00001'));

      let insertCalled = false;
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'journal_entries') {
          if (!insertCalled) {
            qb.single.mockResolvedValue(
              mockQueryResult({ id: 'new-je-id', ...expectedEntry }),
            );
            insertCalled = true;
          } else {
            qb.single.mockResolvedValue(mockQueryResult(expectedEntry));
          }
        } else if (table === 'journal_items') {
          qb.insert.mockReturnValue({ error: null });
        }
        return qb;
      });

      const result = await service.create(dto, TEST_IDS.organization, TEST_IDS.user);

      expect(result.entry_number).toBe('JE-2024-00001');
      expect(mockClient.rpc).toHaveBeenCalledWith('generate_journal_entry_number', {
        p_organization_id: TEST_IDS.organization,
      });
    });

    it('should reject unbalanced journal entry', async () => {
      const dto = createUnbalancedJournalEntryDto();

      await expect(
        service.create(dto, TEST_IDS.organization, TEST_IDS.user),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when debits do not equal credits', async () => {
      const dto = {
        entry_date: TEST_DATES.today,
        items: [
          { account_id: 'acc-1', debit: 1000, credit: 0 },
          { account_id: 'acc-2', debit: 0, credit: 800 },
        ],
      };

      await expect(
        service.create(dto, TEST_IDS.organization, TEST_IDS.user),
      ).rejects.toThrow('debits (1000) must equal credits (800)');
    });

    it('should rollback entry if items creation fails', async () => {
      const dto = createJournalEntryDto();
      const createdEntry = { id: 'new-je-id', entry_number: 'JE-2024-00001' };

      mockClient.rpc.mockResolvedValue(mockQueryResult('JE-2024-00001'));

      const deleteQueryBuilder = createMockQueryBuilder();
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'journal_entries') {
          qb.single.mockResolvedValue(mockQueryResult(createdEntry));
          qb.delete.mockReturnValue(deleteQueryBuilder);
        } else if (table === 'journal_items') {
          qb.insert.mockReturnValue({ error: { message: 'Insert failed' } });
        }
        return qb;
      });

      await expect(
        service.create(dto, TEST_IDS.organization, TEST_IDS.user),
      ).rejects.toThrow(BadRequestException);

      expect(deleteQueryBuilder.eq).toHaveBeenCalledWith('id', 'new-je-id');
    });
  });

  describe('findAll', () => {
    it('should return all journal entries for organization', async () => {
      const entries = [mockJournalEntries.draft, mockJournalEntries.posted];
      const queryBuilder = createThenableQueryBuilder(entries);
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(TEST_IDS.organization);

      expect(result).toEqual(entries);
      expect(queryBuilder.eq).toHaveBeenCalledWith(
        'organization_id',
        TEST_IDS.organization,
      );
    });

    it('should apply status filter', async () => {
      const queryBuilder = createThenableQueryBuilder([]);
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, { status: 'posted' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'posted');
    });

    it('should apply date range filters', async () => {
      const queryBuilder = createThenableQueryBuilder([]);
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, {
        date_from: TEST_DATES.lastWeek,
        date_to: TEST_DATES.today,
      });

      expect(queryBuilder.gte).toHaveBeenCalledWith('entry_date', TEST_DATES.lastWeek);
      expect(queryBuilder.lte).toHaveBeenCalledWith('entry_date', TEST_DATES.today);
    });

    it('should filter by account_id', async () => {
      const queryBuilder = createThenableQueryBuilder([]);
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, {
        account_id: mockAccounts.cash.id,
      });

      expect(queryBuilder.filter).toHaveBeenCalledWith(
        'journal_items.account_id',
        'eq',
        mockAccounts.cash.id,
      );
    });
  });

  describe('findOne', () => {
    it('should return journal entry by ID with items', async () => {
      const entry = {
        ...mockJournalEntries.draft,
        journal_items: mockJournalItems.draftItems,
      };
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(entry));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findOne(
        mockJournalEntries.draft.id,
        TEST_IDS.organization,
      );

      expect(result).toEqual(entry);
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', mockJournalEntries.draft.id);
    });

    it('should throw NotFoundException when entry not found', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'Not found' }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.findOne('non-existent-id', TEST_IDS.organization),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update draft entry', async () => {
      const entry = {
        ...mockJournalEntries.draft,
        journal_items: mockJournalItems.draftItems,
      };
      const updateDto = {
        remarks: 'Updated remarks',
      };

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        const qb = createMockQueryBuilder();
        qb.single.mockResolvedValue(
          mockQueryResult(callCount === 0 ? entry : { ...entry, ...updateDto }),
        );
        callCount++;
        return qb;
      });

      const result = await service.update(
        entry.id,
        updateDto,
        TEST_IDS.organization,
        TEST_IDS.user,
      );

      expect(result.remarks).toBe('Updated remarks');
    });

    it('should reject update of non-draft entry', async () => {
      const entry = {
        ...mockJournalEntries.posted,
        journal_items: mockJournalItems.postedItems,
      };
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(entry));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.update(
          entry.id,
          { remarks: 'Updated' },
          TEST_IDS.organization,
          TEST_IDS.user,
        ),
      ).rejects.toThrow('Only draft journal entries can be updated');
    });

    it('should validate balance when items are updated', async () => {
      const entry = {
        ...mockJournalEntries.draft,
        journal_items: mockJournalItems.draftItems,
      };
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(entry));
      mockClient.from.mockReturnValue(queryBuilder);

      const unbalancedUpdate = {
        items: [
          { account_id: 'acc-1', debit: 1000, credit: 0 },
          { account_id: 'acc-2', debit: 0, credit: 500 },
        ],
      };

      await expect(
        service.update(
          entry.id,
          unbalancedUpdate,
          TEST_IDS.organization,
          TEST_IDS.user,
        ),
      ).rejects.toThrow('debits (1000) must equal credits (500)');
    });
  });

  describe('post', () => {
    it('should post draft entry', async () => {
      const entry = {
        ...mockJournalEntries.draft,
        journal_items: mockJournalItems.draftItems,
      };
      const postedEntry = { ...entry, status: 'posted' };

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        const qb = createMockQueryBuilder();
        qb.single.mockResolvedValue(
          mockQueryResult(callCount === 0 ? entry : postedEntry),
        );
        callCount++;
        return qb;
      });

      const result = await service.post(
        entry.id,
        TEST_IDS.organization,
        TEST_IDS.user,
      );

      expect(result.status).toBe('posted');
    });

    it('should reject posting of non-draft entry', async () => {
      const entry = {
        ...mockJournalEntries.posted,
        journal_items: mockJournalItems.postedItems,
      };
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(entry));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.post(entry.id, TEST_IDS.organization, TEST_IDS.user),
      ).rejects.toThrow('Only draft journal entries can be posted');
    });
  });

  describe('cancel', () => {
    it('should cancel entry', async () => {
      const entry = {
        ...mockJournalEntries.draft,
        journal_items: mockJournalItems.draftItems,
      };
      const cancelledEntry = { ...entry, status: 'cancelled' };

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        const qb = createMockQueryBuilder();
        qb.single.mockResolvedValue(
          mockQueryResult(callCount === 0 ? entry : cancelledEntry),
        );
        callCount++;
        return qb;
      });

      const result = await service.cancel(entry.id, TEST_IDS.organization);

      expect(result.status).toBe('cancelled');
    });

    it('should reject cancelling already cancelled entry', async () => {
      const entry = {
        ...mockJournalEntries.cancelled,
        journal_items: [],
      };
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(entry));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.cancel(entry.id, TEST_IDS.organization),
      ).rejects.toThrow('Journal entry is already cancelled');
    });
  });

  describe('delete', () => {
    it('should delete draft entry', async () => {
      const entry = {
        ...mockJournalEntries.draft,
        journal_items: mockJournalItems.draftItems,
      };

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'journal_entries') {
          qb.single.mockResolvedValue(mockQueryResult(entry));
        } else if (table === 'journal_items') {
          qb.delete.mockReturnThis();
        }
        return qb;
      });

      const result = await service.delete(entry.id, TEST_IDS.organization);

      expect(result).toEqual({ message: 'Journal entry deleted successfully' });
    });

    it('should reject deletion of non-draft entry', async () => {
      const entry = {
        ...mockJournalEntries.posted,
        journal_items: mockJournalItems.postedItems,
      };
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(entry));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.delete(entry.id, TEST_IDS.organization),
      ).rejects.toThrow('Only draft journal entries can be deleted');
    });
  });

  describe('double-entry validation', () => {
    it('should accept entry with multiple balanced lines', async () => {
      const dto = {
        entry_date: TEST_DATES.today,
        items: [
          { account_id: 'acc-1', debit: 500, credit: 0 },
          { account_id: 'acc-2', debit: 500, credit: 0 },
          { account_id: 'acc-3', debit: 0, credit: 700 },
          { account_id: 'acc-4', debit: 0, credit: 300 },
        ],
      };

      mockClient.rpc.mockResolvedValue(mockQueryResult('JE-2024-00002'));

      const expectedEntry = { id: 'new-je', entry_number: 'JE-2024-00002' };
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'journal_entries') {
          qb.single.mockResolvedValue(mockQueryResult(expectedEntry));
        } else if (table === 'journal_items') {
          qb.insert.mockReturnValue({ error: null });
        }
        return qb;
      });

      const result = await service.create(dto, TEST_IDS.organization, TEST_IDS.user);
      expect(result).toBeDefined();
    });

    it('should handle floating point precision in balance check', async () => {
      const dto = {
        entry_date: TEST_DATES.today,
        items: [
          { account_id: 'acc-1', debit: 33.33, credit: 0 },
          { account_id: 'acc-2', debit: 33.33, credit: 0 },
          { account_id: 'acc-3', debit: 33.34, credit: 0 },
          { account_id: 'acc-4', debit: 0, credit: 100 },
        ],
      };

      mockClient.rpc.mockResolvedValue(mockQueryResult('JE-2024-00003'));

      const expectedEntry = { id: 'new-je', entry_number: 'JE-2024-00003' };
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'journal_entries') {
          qb.single.mockResolvedValue(mockQueryResult(expectedEntry));
        } else if (table === 'journal_items') {
          qb.insert.mockReturnValue({ error: null });
        }
        return qb;
      });

      const result = await service.create(dto, TEST_IDS.organization, TEST_IDS.user);
      expect(result).toBeDefined();
    });
  });
});
