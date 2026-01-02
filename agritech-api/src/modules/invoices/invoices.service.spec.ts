import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
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
  mockInvoices,
  mockInvoiceItems,
  mockAccounts,
  createInvoiceDto,
} from '../../../test/fixtures/accounting.fixture';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };
  let mockSequencesService: { generateInvoiceNumber: jest.Mock };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };
    mockSequencesService = {
      generateInvoiceNumber: jest.fn().mockResolvedValue('INV-2024-00001'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: SequencesService, useValue: mockSequencesService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a sales invoice with items', async () => {
      const dto = createInvoiceDto();
      const expectedInvoice = {
        id: 'new-inv-id',
        invoice_number: 'INV-2024-00001',
        invoice_type: 'sales',
        status: 'draft',
        organization_id: TEST_IDS.organization,
        items: dto.items,
      };

      let insertCalled = false;
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'invoices') {
          if (!insertCalled) {
            qb.single.mockResolvedValue(mockQueryResult({ id: 'new-inv-id' }));
            insertCalled = true;
          } else {
            qb.maybeSingle.mockResolvedValue(mockQueryResult(expectedInvoice));
          }
        } else if (table === 'invoice_items') {
          qb.insert.mockReturnValue({ error: null });
        }
        return qb;
      });

      const result = await service.create(
        dto as any,
        TEST_IDS.organization,
        TEST_IDS.user,
      );

      expect(result).toBeDefined();
      expect(mockSequencesService.generateInvoiceNumber).toHaveBeenCalledWith(
        TEST_IDS.organization,
        'sales',
      );
    });

    it('should create a purchase invoice', async () => {
      const dto = createInvoiceDto({ invoice_type: 'purchase' });
      mockSequencesService.generateInvoiceNumber.mockResolvedValue('PINV-2024-00001');

      const expectedInvoice = {
        id: 'new-inv-id',
        invoice_number: 'PINV-2024-00001',
        invoice_type: 'purchase',
        status: 'draft',
      };

      let insertCalled = false;
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'invoices') {
          if (!insertCalled) {
            qb.single.mockResolvedValue(mockQueryResult({ id: 'new-inv-id' }));
            insertCalled = true;
          } else {
            qb.maybeSingle.mockResolvedValue(mockQueryResult(expectedInvoice));
          }
        } else if (table === 'invoice_items') {
          qb.insert.mockReturnValue({ error: null });
        }
        return qb;
      });

      const result = await service.create(
        dto as any,
        TEST_IDS.organization,
        TEST_IDS.user,
      );

      expect(mockSequencesService.generateInvoiceNumber).toHaveBeenCalledWith(
        TEST_IDS.organization,
        'purchase',
      );
    });

    it('should rollback invoice if items creation fails', async () => {
      const dto = createInvoiceDto();
      const createdInvoice = { id: 'new-inv-id' };

      const deleteQueryBuilder = createMockQueryBuilder();
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'invoices') {
          qb.single.mockResolvedValue(mockQueryResult(createdInvoice));
          qb.delete.mockReturnValue(deleteQueryBuilder);
        } else if (table === 'invoice_items') {
          qb.insert.mockReturnValue({ error: { message: 'Insert failed' } });
        }
        return qb;
      });

      await expect(
        service.create(dto as any, TEST_IDS.organization, TEST_IDS.user),
      ).rejects.toThrow(BadRequestException);

      expect(deleteQueryBuilder.eq).toHaveBeenCalledWith('id', 'new-inv-id');
    });

    it('should calculate totals from items', async () => {
      const dto = createInvoiceDto({
        items: [
          {
            item_name: 'Item 1',
            quantity: 10,
            unit_price: 100,
            amount: 1000,
            tax_rate: 20,
            tax_amount: 200,
            line_total: 1200,
          },
          {
            item_name: 'Item 2',
            quantity: 5,
            unit_price: 50,
            amount: 250,
            tax_rate: 20,
            tax_amount: 50,
            line_total: 300,
          },
        ],
      });

      let insertCalled = false;
      let insertedData: any;
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'invoices') {
          qb.insert.mockImplementation((data) => {
            insertedData = data;
            return qb;
          });
          if (!insertCalled) {
            qb.single.mockResolvedValue(mockQueryResult({ id: 'new-inv-id' }));
            insertCalled = true;
          } else {
            qb.maybeSingle.mockResolvedValue(mockQueryResult({ id: 'new-inv-id' }));
          }
        } else if (table === 'invoice_items') {
          qb.insert.mockReturnValue({ error: null });
        }
        return qb;
      });

      await service.create(dto as any, TEST_IDS.organization, TEST_IDS.user);

      expect(insertedData.subtotal).toBe(1250);
      expect(insertedData.tax_total).toBe(250);
      expect(insertedData.grand_total).toBe(1500);
    });
  });

  describe('findAll', () => {
    it('should return all invoices for organization', async () => {
      const invoices = [mockInvoices.salesDraft, mockInvoices.salesSubmitted];
      const queryBuilder = createThenableQueryBuilder(invoices);
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(TEST_IDS.organization);

      expect(result).toEqual(invoices);
      expect(queryBuilder.eq).toHaveBeenCalledWith(
        'organization_id',
        TEST_IDS.organization,
      );
    });

    it('should apply invoice_type filter', async () => {
      const queryBuilder = createThenableQueryBuilder([]);
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, { invoice_type: 'sales' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('invoice_type', 'sales');
    });

    it('should apply status filter', async () => {
      const queryBuilder = createThenableQueryBuilder([]);
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, { status: 'paid' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'paid');
    });

    it('should apply party_name ilike filter', async () => {
      const queryBuilder = createThenableQueryBuilder([]);
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, { party_name: 'Test' });

      expect(queryBuilder.ilike).toHaveBeenCalledWith('party_name', '%Test%');
    });

    it('should apply pagination', async () => {
      const queryBuilder = createThenableQueryBuilder([]);
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, { page: 2, limit: 10 });

      expect(queryBuilder.range).toHaveBeenCalledWith(10, 19);
    });
  });

  describe('findOne', () => {
    it('should return invoice with items', async () => {
      const invoice = { ...mockInvoices.salesDraft, items: mockInvoiceItems };
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(invoice));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findOne(
        mockInvoices.salesDraft.id,
        TEST_IDS.organization,
      );

      expect(result).toEqual(invoice);
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', mockInvoices.salesDraft.id);
    });

    it('should throw NotFoundException when invoice not found', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.findOne('non-existent-id', TEST_IDS.organization),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update draft invoice', async () => {
      const invoice = mockInvoices.salesDraft;
      const updateDto = { party_name: 'Updated Customer' };

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'invoices') {
          if (callCount === 0) {
            qb.single.mockResolvedValue(mockQueryResult(invoice));
          } else {
            qb.maybeSingle.mockResolvedValue(
              mockQueryResult({ ...invoice, ...updateDto }),
            );
          }
          callCount++;
        }
        return qb;
      });

      const result = await service.update(
        invoice.id,
        TEST_IDS.organization,
        updateDto as any,
      );

      expect(result.party_name).toBe('Updated Customer');
    });

    it('should reject update of non-draft invoice', async () => {
      const invoice = mockInvoices.salesSubmitted;
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(invoice));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.update(invoice.id, TEST_IDS.organization, { party_name: 'Test' } as any),
      ).rejects.toThrow('Only draft invoices can be edited');
    });

    it('should recalculate totals when items are updated', async () => {
      const invoice = mockInvoices.salesDraft;
      const updateDto = {
        items: [
          {
            item_name: 'New Item',
            quantity: 5,
            unit_price: 200,
            amount: 1000,
            tax_rate: 20,
            tax_amount: 200,
            line_total: 1200,
          },
        ],
      };

      let updateData: any;
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'invoices') {
          qb.single.mockResolvedValue(mockQueryResult(invoice));
          qb.update.mockImplementation((data) => {
            updateData = data;
            return qb;
          });
          qb.maybeSingle.mockResolvedValue(mockQueryResult({ ...invoice }));
        } else if (table === 'invoice_items') {
          qb.delete.mockReturnThis();
          qb.insert.mockReturnValue({ error: null });
        }
        return qb;
      });

      await service.update(invoice.id, TEST_IDS.organization, updateDto as any);

      expect(updateData.subtotal).toBe(1000);
      expect(updateData.tax_total).toBe(200);
      expect(updateData.grand_total).toBe(1200);
    });
  });

  describe('updateStatus', () => {
    it('should update invoice status', async () => {
      const invoice = mockInvoices.salesDraft;
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({ ...invoice, status: 'submitted' }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.updateStatus(
        invoice.id,
        TEST_IDS.organization,
        TEST_IDS.user,
        { status: 'submitted' } as any,
      );

      expect(result.status).toBe('submitted');
    });
  });

  describe('postInvoice', () => {
    it('should post draft invoice and create journal entry', async () => {
      const invoice = {
        ...mockInvoices.salesDraft,
        items: mockInvoiceItems.slice(0, 1),
      };
      const accounts = [mockAccounts.accountsReceivable, mockAccounts.taxPayable];

      mockClient.rpc.mockResolvedValue(mockQueryResult('JE-2024-00001'));

      let tableCalls: string[] = [];
      mockClient.from.mockImplementation((table: string) => {
        tableCalls.push(table);
        const qb = createMockQueryBuilder();
        qb.in = jest.fn().mockReturnThis();

        if (table === 'invoices') {
          if (tableCalls.filter((t) => t === 'invoices').length === 1) {
            qb.maybeSingle.mockResolvedValue(mockQueryResult(invoice));
          }
        } else if (table === 'accounts') {
          qb.select.mockReturnThis();
          qb.eq.mockReturnThis();
          qb.in.mockResolvedValue(mockQueryResult(accounts));
        } else if (table === 'journal_entries') {
          qb.single.mockResolvedValue(
            mockQueryResult({ id: 'je-new', entry_number: 'JE-2024-00001' }),
          );
        } else if (table === 'journal_items') {
          qb.insert.mockReturnValue({ error: null });
        }
        return qb;
      });

      const result = await service.postInvoice(
        invoice.id,
        TEST_IDS.organization,
        TEST_IDS.user,
        TEST_DATES.today,
      );

      expect(result.success).toBe(true);
      expect(result.data.journal_entry_id).toBe('je-new');
    });

    it('should reject posting of non-draft invoice', async () => {
      const invoice = mockInvoices.salesSubmitted;
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(invoice));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.postInvoice(
          invoice.id,
          TEST_IDS.organization,
          TEST_IDS.user,
          TEST_DATES.today,
        ),
      ).rejects.toThrow('Only draft invoices can be posted');
    });
  });

  describe('delete', () => {
    it('should delete draft invoice with items', async () => {
      const invoice = mockInvoices.salesDraft;

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'invoices') {
          qb.single.mockResolvedValue(mockQueryResult(invoice));
        } else if (table === 'invoice_items') {
          qb.delete.mockReturnThis();
        }
        return qb;
      });

      const result = await service.delete(invoice.id, TEST_IDS.organization);

      expect(result).toEqual({ message: 'Invoice deleted successfully' });
    });

    it('should reject deletion of non-draft invoice', async () => {
      const invoice = mockInvoices.salesSubmitted;
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(invoice));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.delete(invoice.id, TEST_IDS.organization),
      ).rejects.toThrow('Only draft invoices can be deleted');
    });
  });
});
