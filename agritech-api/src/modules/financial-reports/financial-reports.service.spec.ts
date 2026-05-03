import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { AgedReportsService } from './financial-reports.service';
import {
  createMockSupabaseClient,
  createMockDatabaseService,
  setupTableMock,
  setupThenableMock,
  MockSupabaseClient,
  MockDatabaseService,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('AgedReportsService', () => {
  let service: AgedReportsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgedReportsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AgedReportsService>(AgedReportsService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('getAgedReceivables', () => {
    it('builds an aged receivables report with organization/date filters and bucket aggregation', async () => {
      const invoicesBuilder = setupTableMock(mockClient, 'invoices');
      setupThenableMock(invoicesBuilder, [
        {
          id: 'inv-current',
          invoice_number: 'INV-001',
          invoice_date: '2026-04-10',
          due_date: '2026-04-30',
          party_id: 'party-b',
          party_name: 'Buyer B',
          grand_total: '1000',
          outstanding_amount: '100',
        },
        {
          id: 'inv-1-30',
          invoice_number: 'INV-002',
          invoice_date: '2026-03-10',
          due_date: '2026-04-14',
          party_id: 'party-a',
          party_name: 'Buyer A',
          grand_total: '2000',
          outstanding_amount: '200',
        },
        {
          id: 'inv-31-60',
          invoice_number: 'INV-003',
          invoice_date: '2026-02-15',
          due_date: '2026-03-10',
          party_id: 'party-a',
          party_name: 'Buyer A',
          grand_total: '3000',
          outstanding_amount: '300',
        },
        {
          id: 'inv-61-90',
          invoice_number: 'INV-004',
          invoice_date: '2026-01-10',
          due_date: '2026-02-01',
          party_id: 'party-c',
          party_name: 'Buyer C',
          grand_total: '4000',
          outstanding_amount: '400',
        },
        {
          id: 'inv-over-90',
          invoice_number: 'INV-005',
          invoice_date: '2025-12-10',
          due_date: '2026-01-01',
          party_id: 'party-a',
          party_name: 'Buyer A',
          grand_total: '5000',
          outstanding_amount: '500',
        },
      ]);

      const result = await service.getAgedReceivables(
        TEST_IDS.organization,
        '2026-04-15',
      );

      expect(invoicesBuilder.eq).toHaveBeenCalledWith(
        'organization_id',
        TEST_IDS.organization,
      );
      expect(invoicesBuilder.eq).toHaveBeenCalledWith('invoice_type', 'sales');
      expect(invoicesBuilder.in).toHaveBeenCalledWith('status', [
        'submitted',
        'partially_paid',
        'overdue',
      ]);
      expect(invoicesBuilder.gt).toHaveBeenCalledWith('outstanding_amount', 0);
      expect(invoicesBuilder.lte).toHaveBeenCalledWith('invoice_date', '2026-04-15');
      expect(invoicesBuilder.order).toHaveBeenCalledWith('due_date', {
        ascending: true,
      });
      expect(result).toEqual({
        as_of_date: '2026-04-15',
        invoices: [
          {
            invoice_id: 'inv-current',
            invoice_number: 'INV-001',
            invoice_date: '2026-04-10',
            due_date: '2026-04-30',
            party_id: 'party-b',
            party_name: 'Buyer B',
            grand_total: 1000,
            outstanding_amount: 100,
            days_overdue: 0,
            age_bucket: 'current',
          },
          {
            invoice_id: 'inv-1-30',
            invoice_number: 'INV-002',
            invoice_date: '2026-03-10',
            due_date: '2026-04-14',
            party_id: 'party-a',
            party_name: 'Buyer A',
            grand_total: 2000,
            outstanding_amount: 200,
            days_overdue: 1,
            age_bucket: '1-30',
          },
          {
            invoice_id: 'inv-31-60',
            invoice_number: 'INV-003',
            invoice_date: '2026-02-15',
            due_date: '2026-03-10',
            party_id: 'party-a',
            party_name: 'Buyer A',
            grand_total: 3000,
            outstanding_amount: 300,
            days_overdue: 36,
            age_bucket: '31-60',
          },
          {
            invoice_id: 'inv-61-90',
            invoice_number: 'INV-004',
            invoice_date: '2026-01-10',
            due_date: '2026-02-01',
            party_id: 'party-c',
            party_name: 'Buyer C',
            grand_total: 4000,
            outstanding_amount: 400,
            days_overdue: 73,
            age_bucket: '61-90',
          },
          {
            invoice_id: 'inv-over-90',
            invoice_number: 'INV-005',
            invoice_date: '2025-12-10',
            due_date: '2026-01-01',
            party_id: 'party-a',
            party_name: 'Buyer A',
            grand_total: 5000,
            outstanding_amount: 500,
            days_overdue: 104,
            age_bucket: 'over-90',
          },
        ],
        summary: {
          current: 100,
          days_1_30: 200,
          days_31_60: 300,
          days_61_90: 400,
          over_90: 500,
          total: 1500,
        },
        by_party: [
          {
            party_id: 'party-a',
            party_name: 'Buyer A',
            current: 0,
            days_1_30: 200,
            days_31_60: 300,
            days_61_90: 0,
            over_90: 500,
            total: 1000,
          },
          {
            party_id: 'party-c',
            party_name: 'Buyer C',
            current: 0,
            days_1_30: 0,
            days_31_60: 0,
            days_61_90: 400,
            over_90: 0,
            total: 400,
          },
          {
            party_id: 'party-b',
            party_name: 'Buyer B',
            current: 100,
            days_1_30: 0,
            days_31_60: 0,
            days_61_90: 0,
            over_90: 0,
            total: 100,
          },
        ],
      });
    });

    it('uses the current date when no as-of date is provided', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-04-16T08:00:00.000Z'));

      const invoicesBuilder = setupTableMock(mockClient, 'invoices');
      setupThenableMock(invoicesBuilder, []);

      const result = await service.getAgedReceivables(TEST_IDS.organization);

      expect(invoicesBuilder.lte).toHaveBeenCalledWith('invoice_date', '2026-04-16');
      expect(result).toEqual({
        as_of_date: '2026-04-16',
        invoices: [],
        summary: {
          current: 0,
          days_1_30: 0,
          days_31_60: 0,
          days_61_90: 0,
          over_90: 0,
          total: 0,
        },
        by_party: [],
      });
    });

    it('throws the underlying database error when query execution fails', async () => {
      const invoicesBuilder = setupTableMock(mockClient, 'invoices');
      const queryError = { message: 'receivables failed' };

      setupThenableMock(invoicesBuilder, null, queryError);

      await expect(
        service.getAgedReceivables(TEST_IDS.organization, '2026-04-15'),
      ).rejects.toEqual(queryError);
    });
  });

  describe('getAgedPayables', () => {
    it('builds an aged payables report using purchase invoices', async () => {
      const invoicesBuilder = setupTableMock(mockClient, 'invoices');
      setupThenableMock(invoicesBuilder, [
        {
          id: 'bill-1',
          invoice_number: 'BILL-001',
          invoice_date: '2026-03-01',
          due_date: '2026-03-20',
          party_id: 'supplier-1',
          party_name: 'Supplier One',
          grand_total: '650.50',
          outstanding_amount: '650.50',
        },
        {
          id: 'bill-2',
          invoice_number: 'BILL-002',
          invoice_date: '2026-04-01',
          due_date: '2026-04-18',
          party_id: 'supplier-2',
          party_name: 'Supplier Two',
          grand_total: '125',
          outstanding_amount: '125',
        },
      ]);

      const result = await service.getAgedPayables(
        TEST_IDS.organization,
        '2026-04-15',
      );

      expect(invoicesBuilder.eq).toHaveBeenCalledWith(
        'organization_id',
        TEST_IDS.organization,
      );
      expect(invoicesBuilder.eq).toHaveBeenCalledWith('invoice_type', 'purchase');
      expect(result.summary).toEqual({
        current: 125,
        days_1_30: 650.5,
        days_31_60: 0,
        days_61_90: 0,
        over_90: 0,
        total: 775.5,
      });
      expect(result.by_party).toEqual([
        {
          party_id: 'supplier-1',
          party_name: 'Supplier One',
          current: 0,
          days_1_30: 650.5,
          days_31_60: 0,
          days_61_90: 0,
          over_90: 0,
          total: 650.5,
        },
        {
          party_id: 'supplier-2',
          party_name: 'Supplier Two',
          current: 125,
          days_1_30: 0,
          days_31_60: 0,
          days_61_90: 0,
          over_90: 0,
          total: 125,
        },
      ]);
    });

    it('returns an empty payable report when no invoices match', async () => {
      const invoicesBuilder = setupTableMock(mockClient, 'invoices');
      setupThenableMock(invoicesBuilder, []);

      const result = await service.getAgedPayables(
        TEST_IDS.organization,
        '2026-04-15',
      );

      expect(result).toEqual({
        as_of_date: '2026-04-15',
        invoices: [],
        summary: {
          current: 0,
          days_1_30: 0,
          days_31_60: 0,
          days_61_90: 0,
          over_90: 0,
          total: 0,
        },
        by_party: [],
      });
    });

    it('throws the underlying database error when payables query fails', async () => {
      const invoicesBuilder = setupTableMock(mockClient, 'invoices');
      const queryError = { message: 'payables failed' };

      setupThenableMock(invoicesBuilder, null, queryError);

      await expect(
        service.getAgedPayables(TEST_IDS.organization, '2026-04-15'),
      ).rejects.toEqual(queryError);
    });
  });
});
