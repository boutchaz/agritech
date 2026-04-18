import { Test, TestingModule } from '@nestjs/testing';
import { SequencesService } from './sequences.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  setupTableMock,
  MockDatabaseService,
  MockQueryBuilder,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('SequencesService', () => {
  let service: SequencesService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const organizationId = TEST_IDS.organization;

  const setupCountResult = (
    builder: MockQueryBuilder,
    count: number | null,
    error: { message: string } | null = null,
  ) => {
    builder.then.mockImplementation(
      (
        resolve: (value: {
          data: null;
          error: { message: string } | null;
          count: number | null;
        }) => void,
      ) => {
        const result = { data: null, error, count };
        resolve(result);
        return Promise.resolve(result);
      },
    );
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-01T08:00:00.000Z'));

    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SequencesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<SequencesService>(SequencesService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('document sequence generation', () => {
    const cases = [
      {
        name: 'quote',
        table: 'quotes',
        dateColumn: 'quote_date',
        prefix: 'QT',
        invoke: () => service.generateQuoteNumber(organizationId),
      },
      {
        name: 'invoice',
        table: 'invoices',
        dateColumn: 'invoice_date',
        prefix: 'INV',
        invoke: () => service.generateInvoiceNumber(organizationId),
      },
      {
        name: 'sales order',
        table: 'sales_orders',
        dateColumn: 'order_date',
        prefix: 'SO',
        invoke: () => service.generateSalesOrderNumber(organizationId),
      },
      {
        name: 'purchase order',
        table: 'purchase_orders',
        dateColumn: 'order_date',
        prefix: 'PO',
        invoke: () => service.generatePurchaseOrderNumber(organizationId),
      },
      {
        name: 'journal entry',
        table: 'journal_entries',
        dateColumn: 'entry_date',
        prefix: 'JE',
        invoke: () => service.generateJournalEntryNumber(organizationId),
      },
      {
        name: 'payment',
        table: 'accounting_payments',
        dateColumn: 'payment_date',
        prefix: 'PAY',
        invoke: () => service.generatePaymentNumber(organizationId),
      },
      {
        name: 'stock entry',
        table: 'stock_entries',
        dateColumn: 'entry_date',
        prefix: 'SE',
        invoke: () => service.generateStockEntryNumber(organizationId),
      },
    ];

    it.each(cases)(
      'generates correct PREFIX-YYYY-NNNNN format for $name',
      async ({ table, dateColumn, prefix, invoke }) => {
        const builder = setupTableMock(mockClient, table);
        setupCountResult(builder, 9);

        const result = await invoke();

        expect(result).toBe(`${prefix}-2026-00010`);
        expect(builder.eq).toHaveBeenCalledWith('organization_id', organizationId);
        expect(builder.gte).toHaveBeenCalledWith(dateColumn, '2026-01-01');
        expect(builder.lt).toHaveBeenCalledWith(dateColumn, '2027-01-01');
      },
    );

    it('starts at 00001 when there are no existing records', async () => {
      const builder = setupTableMock(mockClient, 'quotes');
      setupCountResult(builder, 0);

      await expect(service.generateQuoteNumber(organizationId)).resolves.toBe(
        'QT-2026-00001',
      );
    });

    it('supports a custom invoice prefix for purchase invoices', async () => {
      const builder = setupTableMock(mockClient, 'invoices');
      setupCountResult(builder, 4);

      await expect(
        service.generateInvoiceNumber(organizationId, 'purchase'),
      ).resolves.toBe('PINV-2026-00005');
    });

    it('uses the current year from the system clock', async () => {
      jest.setSystemTime(new Date('2030-01-14T10:00:00.000Z'));

      const builder = setupTableMock(mockClient, 'journal_entries');
      setupCountResult(builder, 1);

      await expect(
        service.generateJournalEntryNumber(organizationId),
      ).resolves.toBe('JE-2030-00002');
      expect(builder.gte).toHaveBeenCalledWith('entry_date', '2030-01-01');
      expect(builder.lt).toHaveBeenCalledWith('entry_date', '2031-01-01');
    });

    it('allows direct custom prefix generation through the shared sequence method', async () => {
      const builder = setupTableMock(mockClient, 'accounting_payments');
      setupCountResult(builder, 2);

      const generateSequence = Reflect.get(
        service,
        'generateSequence',
      ) as (
        organizationId: string,
        type: string,
        customPrefix?: string,
      ) => Promise<string>;

      await expect(
        generateSequence.call(service, organizationId, 'payment', 'CUS'),
      ).resolves.toBe('CUS-2026-00003');
    });

    it('rethrows database errors with the sequence context', async () => {
      const builder = setupTableMock(mockClient, 'stock_entries');
      setupCountResult(builder, null, { message: 'count failed' });

      await expect(
        service.generateStockEntryNumber(organizationId),
      ).rejects.toThrow('Failed to generate stock_entry number: count failed');
    });
  });

  describe('generateLotNumber', () => {
    it('generates the next lot number in the expected format', async () => {
      const builder = setupTableMock(mockClient, 'harvest_records');
      setupCountResult(builder, 9);

      await expect(service.generateLotNumber(organizationId)).resolves.toBe('LOT-2026-0010');
      expect(builder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(builder.like).toHaveBeenCalledWith('lot_number', 'LOT-2026-%');
    });

    it('appends the partial suffix when requested', async () => {
      const builder = setupTableMock(mockClient, 'harvest_records');
      setupCountResult(builder, 4);

      await expect(service.generateLotNumber(organizationId, true)).resolves.toBe('LOT-2026-0005-P');
    });

    it('starts at 0001 when no lot records exist', async () => {
      const builder = setupTableMock(mockClient, 'harvest_records');
      setupCountResult(builder, 0);

      await expect(service.generateLotNumber(organizationId)).resolves.toBe('LOT-2026-0001');
    });

    it('rethrows database errors with the lot sequence context', async () => {
      const builder = setupTableMock(mockClient, 'harvest_records');
      setupCountResult(builder, null, { message: 'count failed' });

      await expect(service.generateLotNumber(organizationId)).rejects.toThrow(
        'Failed to generate lot number: count failed',
      );
    });
  });
});
