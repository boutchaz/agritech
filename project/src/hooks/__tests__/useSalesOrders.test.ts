import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useConvertOrderToInvoice,
  useIssueStock,
  useSalesOrders,
  useUpdateSalesOrderStatus,
} from '../useSalesOrders';
import { salesOrdersApi } from '../../lib/api/sales-orders';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '../useAuth';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  keepPreviousData: 'keepPreviousData',
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/api/sales-orders', () => ({
  salesOrdersApi: {
    getSalesOrders: vi.fn(),
    convertToInvoice: vi.fn(),
    updateSalesOrderStatus: vi.fn(),
    issueStock: vi.fn(),
  },
}));

describe('useSalesOrders', () => {
  const mockUseQuery = vi.mocked(useQuery);
  const mockUseMutation = vi.mocked(useMutation);
  const mockUseQueryClient = vi.mocked(useQueryClient);
  const mockUseAuth = vi.mocked(useAuth);
  const mockInvalidateQueries = vi.fn();

  const getLatestQueryOptions = () => {
    const options = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1]?.[0];
    if (!options || Array.isArray(options) || typeof options.queryFn !== 'function') {
      throw new Error('Expected query options with queryFn');
    }
    return options as { queryFn: (context: never) => Promise<unknown> };
  };

  const getLatestMutationOptions = () => {
    const options = mockUseMutation.mock.calls[mockUseMutation.mock.calls.length - 1]?.[0];
    if (!options) {
      throw new Error('Expected mutation options');
    }
    return options as unknown as {
      mutationFn: (variables: unknown, context?: never) => Promise<unknown>;
      onSuccess?: (data: unknown, variables: unknown, context: never, mutationContext: never) => unknown;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: [] } as ReturnType<typeof useQuery>);
    mockUseMutation.mockReturnValue({} as ReturnType<typeof useMutation>);
    mockUseQueryClient.mockReturnValue(({ invalidateQueries: mockInvalidateQueries } as unknown) as ReturnType<typeof useQueryClient>);
    mockUseAuth.mockReturnValue({ currentOrganization: { id: 'org-123' } } as ReturnType<typeof useAuth>);
  });

  describe('useSalesOrders', () => {
    it('uses org id and status in query key', () => {
      useSalesOrders('confirmed');

      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: ['sales_orders', 'org-123', 'confirmed'],
        queryFn: expect.any(Function),
        enabled: true,
      });
    });

    it('disables the query when there is no selected organization', () => {
      mockUseAuth.mockReturnValue({ currentOrganization: null } as ReturnType<typeof useAuth>);

      useSalesOrders('draft');

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
          queryKey: ['sales_orders', undefined, 'draft'],
        }),
      );
    });

    it('calls the sales orders API with filters and normalizes totals', async () => {
      vi.mocked(salesOrdersApi.getSalesOrders).mockResolvedValue({
        data: [
          {
            id: 'so-1',
            organization_id: 'org-123',
            order_number: 'SO-001',
            order_date: '2026-01-01',
            expected_delivery_date: null,
            customer_id: null,
            customer_name: 'Customer',
            customer_contact: null,
            customer_address: null,
            shipping_address: null,
            tracking_number: null,
            subtotal: '100',
            tax_amount: '20',
            total_amount: '120',
            currency_code: null,
            status: null,
            notes: null,
            terms_and_conditions: null,
            stock_entry_id: null,
            stock_issued: false,
            stock_issued_date: null,
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
            created_by: null,
            sales_order_items: [
              {
                id: 'item-1',
                sales_order_id: 'so-1',
                line_number: 1,
                item_name: 'Olives',
                description: null,
                quantity: 2,
                unit_of_measure: 'kg',
                unit_price: 30,
                amount: 60,
                discount_percent: 0,
                discount_amount: 0,
                tax_id: null,
                tax_rate: 0,
                tax_amount: 0,
                line_total: 60,
                delivered_quantity: 0,
                invoiced_quantity: 2,
                account_id: null,
                quote_item_id: null,
              },
            ],
          },
        ],
        pagination: {},
      });

      useSalesOrders('confirmed');

      const result = await getLatestQueryOptions().queryFn({} as never);

      expect(salesOrdersApi.getSalesOrders).toHaveBeenCalledWith(
        { status: 'confirmed', page: 1, pageSize: 100 },
        'org-123',
      );
      expect(result).toEqual([
        expect.objectContaining({
          subtotal: 100,
          tax_amount: 20,
          total_amount: 120,
          tax_total: 20,
          grand_total: 120,
          invoiced_amount: 60,
          currency_code: 'MAD',
          status: 'draft',
        }),
      ]);
    });
  });

  describe('useConvertOrderToInvoice', () => {
    it('converts the order and invalidates sales orders and invoices', async () => {
      vi.mocked(salesOrdersApi.convertToInvoice).mockResolvedValue({ id: 'inv-1' });

      useConvertOrderToInvoice();

      const mutation = getLatestMutationOptions();
      const variables = {
        orderId: 'so-1',
        invoiceDate: '2026-02-01',
        dueDate: '2026-02-10',
      };

      await mutation.mutationFn(variables, {} as never);
      await mutation.onSuccess?.(undefined, variables, {} as never, {} as never);

      expect(salesOrdersApi.convertToInvoice).toHaveBeenCalledWith('so-1', {
        invoice_date: '2026-02-01',
        due_date: '2026-02-10',
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['sales_orders', 'org-123'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['invoices', 'org-123'] });
    });
  });

  describe('useUpdateSalesOrderStatus', () => {
    it('updates status and invalidates the sales orders list', async () => {
      vi.mocked(salesOrdersApi.updateSalesOrderStatus).mockResolvedValue({ id: 'so-1' });

      useUpdateSalesOrderStatus();

      const mutation = getLatestMutationOptions();
      await mutation.mutationFn({ orderId: 'so-1', status: 'shipped', notes: 'Ready' }, {} as never);
      await mutation.onSuccess?.(undefined, { orderId: 'so-1', status: 'shipped', notes: 'Ready' }, {} as never, {} as never);

      expect(salesOrdersApi.updateSalesOrderStatus).toHaveBeenCalledWith('so-1', {
        status: 'shipped',
        notes: 'Ready',
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['sales_orders', 'org-123'] });
    });
  });

  describe('useIssueStock', () => {
    it('issues stock with org id and invalidates dependent queries', async () => {
      vi.mocked(salesOrdersApi.issueStock).mockResolvedValue({ id: 'stock-1' });

      useIssueStock();

      const mutation = getLatestMutationOptions();
      const variables = { orderId: 'so-1', warehouseId: 'wh-1' };

      await mutation.mutationFn(variables, {} as never);
      await mutation.onSuccess?.({}, variables, {} as never, {} as never);

      expect(salesOrdersApi.issueStock).toHaveBeenCalledWith('so-1', 'wh-1', 'org-123');
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['sales_orders', 'org-123'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['sales_order', 'so-1'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['stock_entries'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['journal_entries'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['inventory'] });
    });
  });

  describe('paginated constant compatibility', () => {
    it('exposes react-query keepPreviousData constant for paginated hooks', () => {
      expect(keepPreviousData).toBe('keepPreviousData');
    });
  });
});
