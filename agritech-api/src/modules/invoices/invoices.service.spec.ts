import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StockEntriesService } from '../stock-entries/stock-entries.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import { PaymentsService } from '../payments/payments.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  setupMultiTableMock,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };
  let mockSequencesService: { generateInvoiceNumber: jest.Mock; generateJournalEntryNumber: jest.Mock };
  let mockNotificationsService: { sendInvoiceEmail: jest.Mock };
  let mockStockEntriesService: {};
  let mockAccountingAutomationService: { resolveAccountId: jest.Mock; assertPeriodOpen: jest.Mock };
  let mockPaymentsService: { create: jest.Mock; allocatePayment: jest.Mock };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    // Stub pg-transaction helper. Hand the callback a minimal pgClient that
    // resolves any query() with empty rows so postInvoice's lock + insert
    // queries don't throw. Tests assert resolveAccountId was called; they
    // don't introspect the JE rows that get inserted.
    const stubPgClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: 'je-stub', status: 'draft' }] }),
    };
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
      executeInPgTransaction: jest.fn(async (fn: any) => {
        const result = await fn(stubPgClient);
        return { ...result, journalEntryId: result?.journalEntryId || 'je-stub' };
      }),
    } as any;
    mockSequencesService = {
      generateInvoiceNumber: jest.fn().mockResolvedValue('INV-2026-00001'),
      generateJournalEntryNumber: jest.fn().mockResolvedValue('JE-2026-00001'),
    };
    mockNotificationsService = {
      sendInvoiceEmail: jest.fn().mockResolvedValue(undefined),
    };
    mockStockEntriesService = {};
    mockAccountingAutomationService = {
      resolveAccountId: jest.fn(),
      assertPeriodOpen: jest.fn().mockResolvedValue(undefined),
      applyCashSettlementDate: jest.fn().mockResolvedValue(undefined),
      createReversalEntry: jest.fn().mockResolvedValue({ reversalEntryId: 'rev-stub' }),
    } as any;
    mockPaymentsService = {
      create: jest.fn().mockResolvedValue({ id: 'payment-001' }),
      allocatePayment: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: SequencesService, useValue: mockSequencesService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: StockEntriesService, useValue: mockStockEntriesService },
        { provide: AccountingAutomationService, useValue: mockAccountingAutomationService },
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('postInvoice — account mapping resolution', () => {
    const orgId = TEST_IDS.organization;
    const userId = TEST_IDS.user;
    const invoiceId = 'invoice-001';

    const mockDraftSalesInvoice = {
      id: invoiceId,
      organization_id: orgId,
      invoice_number: 'INV-2026-00001',
      invoice_type: 'sales',
      status: 'draft',
      grand_total: 18000,
      tax_total: 3000,
      party_name: 'Supermarché Atlas',
      items: [
        {
          id: 'item-001',
          item_id: null,
          item_name: 'Clémentines',
          description: 'Catégorie I',
          quantity: 1000,
          unit_of_measure: 'kg',
          amount: 15000,
          tax_amount: 3000,
          account_id: null,
        },
      ],
    };

    function setupMappingResolution(mappings: Record<string, string | null>) {
      mockAccountingAutomationService.resolveAccountId.mockImplementation(
        (_orgId: string, mappingType: string, mappingKey: string) => {
          const key = `${mappingType}/${mappingKey}`;
          return Promise.resolve(mappings[key] ?? null);
        },
      );
    }

    function setupInvoiceQuery(invoice: any) {
      const invoicesQuery = createMockQueryBuilder();
      invoicesQuery.maybeSingle.mockResolvedValue(mockQueryResult(invoice));

      const journalEntriesQuery = createMockQueryBuilder();
      journalEntriesQuery.single.mockResolvedValue(
        mockQueryResult({ id: 'je-001' }),
      );

      const journalItemsQuery = createMockQueryBuilder();

      setupMultiTableMock(mockClient, {
        invoices: invoicesQuery,
        journal_entries: journalEntriesQuery,
        journal_items: journalItemsQuery,
      });

      return { invoicesQuery, journalEntriesQuery, journalItemsQuery };
    }

    it('resolves accounts via account_mappings for sales invoice', async () => {
      setupMappingResolution({
        'receivable/trade': 'acc-3420',
        'tax/collected': 'acc-4457',
        'revenue/default': 'acc-7111',
      });
      setupInvoiceQuery(mockDraftSalesInvoice);

      await service.postInvoice(invoiceId, orgId, userId, '2026-03-26');

      // Verify resolveAccountId was called with the right mapping types
      expect(mockAccountingAutomationService.resolveAccountId).toHaveBeenCalledWith(
        orgId, 'receivable', 'trade',
      );
      expect(mockAccountingAutomationService.resolveAccountId).toHaveBeenCalledWith(
        orgId, 'tax', 'collected',
      );
      expect(mockAccountingAutomationService.resolveAccountId).toHaveBeenCalledWith(
        orgId, 'revenue', 'default',
      );
    });

    it('resolves accounts via account_mappings for purchase invoice', async () => {
      const purchaseInvoice = {
        ...mockDraftSalesInvoice,
        invoice_type: 'purchase',
      };

      setupMappingResolution({
        'payable/trade': 'acc-4410',
        'tax/deductible': 'acc-4456',
        'expense/default': 'acc-6111',
      });
      setupInvoiceQuery(purchaseInvoice);

      await service.postInvoice(invoiceId, orgId, userId, '2026-03-26');

      expect(mockAccountingAutomationService.resolveAccountId).toHaveBeenCalledWith(
        orgId, 'payable', 'trade',
      );
      expect(mockAccountingAutomationService.resolveAccountId).toHaveBeenCalledWith(
        orgId, 'tax', 'deductible',
      );
      expect(mockAccountingAutomationService.resolveAccountId).toHaveBeenCalledWith(
        orgId, 'expense', 'default',
      );
    });

    it('throws when receivable/trade mapping is missing for sales invoice', async () => {
      setupMappingResolution({
        'receivable/trade': null, // missing!
        'tax/collected': 'acc-4457',
        'revenue/default': 'acc-7111',
      });
      setupInvoiceQuery(mockDraftSalesInvoice);

      await expect(
        service.postInvoice(invoiceId, orgId, userId, '2026-03-26'),
      ).rejects.toThrow(/account mapping missing.*receivable/i);
    });

    it('throws when payable/trade mapping is missing for purchase invoice', async () => {
      const purchaseInvoice = {
        ...mockDraftSalesInvoice,
        invoice_type: 'purchase',
      };

      setupMappingResolution({
        'payable/trade': null, // missing!
        'tax/deductible': 'acc-4456',
        'expense/default': 'acc-6111',
      });
      setupInvoiceQuery(purchaseInvoice);

      await expect(
        service.postInvoice(invoiceId, orgId, userId, '2026-03-26'),
      ).rejects.toThrow(/account mapping missing.*payable/i);
    });

    it('throws when invoice is not found', async () => {
      const invoicesQuery = createMockQueryBuilder();
      invoicesQuery.maybeSingle.mockResolvedValue(mockQueryResult(null));

      setupMultiTableMock(mockClient, {
        invoices: invoicesQuery,
      });

      await expect(
        service.postInvoice('nonexistent', orgId, userId, '2026-03-26'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when invoice is not in draft status', async () => {
      const postedInvoice = { ...mockDraftSalesInvoice, status: 'submitted' };
      const invoicesQuery = createMockQueryBuilder();
      invoicesQuery.maybeSingle.mockResolvedValue(mockQueryResult(postedInvoice));

      setupMultiTableMock(mockClient, {
        invoices: invoicesQuery,
      });

      await expect(
        service.postInvoice(invoiceId, orgId, userId, '2026-03-26'),
      ).rejects.toThrow(/only draft invoices/i);
    });

    it('does not call resolveAccountId with hardcoded account codes', async () => {
      setupMappingResolution({
        'receivable/trade': 'acc-3420',
        'tax/collected': 'acc-4457',
        'revenue/default': 'acc-7111',
      });
      setupInvoiceQuery(mockDraftSalesInvoice);

      await service.postInvoice(invoiceId, orgId, userId, '2026-03-26');

      // Ensure no hardcoded US GAAP codes are used anywhere
      const calls = mockAccountingAutomationService.resolveAccountId.mock.calls;
      const allArgs = calls.map(c => c.join(',')).join(' ');
      expect(allArgs).not.toContain('1200');
      expect(allArgs).not.toContain('2110');
      expect(allArgs).not.toContain('2150');
      expect(allArgs).not.toContain('1400');
    });
  });
});
