import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useConvertPOToBill,
  useCreatePurchaseOrder,
  usePurchaseOrders,
  useUpdatePurchaseOrder,
  useUpdatePurchaseOrderStatus,
} from '../usePurchaseOrders';
import { purchaseOrdersApi } from '../../lib/api/purchase-orders';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

vi.mock('../../lib/api/purchase-orders', () => ({
  purchaseOrdersApi: {
    getPurchaseOrders: vi.fn(),
    createPurchaseOrder: vi.fn(),
    convertToBill: vi.fn(),
    updatePurchaseOrder: vi.fn(),
    updatePurchaseOrderStatus: vi.fn(),
  },
}));

describe('usePurchaseOrders', () => {
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

  describe('list query', () => {
    it('uses org id and status in the query key', () => {
      usePurchaseOrders('confirmed');

      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: ['purchase_orders', 'org-123', 'confirmed'],
        queryFn: expect.any(Function),
        enabled: true,
      });
    });

    it('disables the query without an organization', () => {
      mockUseAuth.mockReturnValue({ currentOrganization: null } as ReturnType<typeof useAuth>);

      usePurchaseOrders('draft');

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
          queryKey: ['purchase_orders', undefined, 'draft'],
        }),
      );
    });

    it('calls the purchase order API and normalizes aliased amounts', async () => {
      vi.mocked(purchaseOrdersApi.getPurchaseOrders).mockResolvedValue([
        {
          id: 'po-1',
          organization_id: 'org-123',
          order_number: 'PO-001',
          order_date: '2026-01-10',
          supplier_name: 'Supplier',
          subtotal: '100',
          tax_amount: '20',
          total_amount: '120',
          billed_amount: '30',
          stock_received: 0,
          created_at: '2026-01-10',
          updated_at: '2026-01-10',
        },
      ]);

      usePurchaseOrders('confirmed');

      const result = await getLatestQueryOptions().queryFn({} as never);

      expect(purchaseOrdersApi.getPurchaseOrders).toHaveBeenCalledWith(
        { status: 'confirmed', page: 1, pageSize: 100 },
        'org-123',
      );
      expect(result).toEqual([
        expect.objectContaining({
          total_amount: 120,
          grand_total: 120,
          billed_amount: 30,
          currency_code: 'MAD',
          status: 'draft',
          stock_received: false,
        }),
      ]);
    });
  });

  describe('useCreatePurchaseOrder', () => {
    it('maps invoice items into API payload and invalidates purchase orders', async () => {
      vi.mocked(purchaseOrdersApi.createPurchaseOrder).mockResolvedValue({ id: 'po-1' });

      useCreatePurchaseOrder();

      const mutation = getLatestMutationOptions();
      await mutation.mutationFn({
        supplier_id: 'supplier-1',
        order_date: '2026-02-01',
        expected_delivery_date: '2026-02-10',
        payment_terms: '30 days',
        delivery_terms: 'Warehouse A',
        supplier_quote_ref: 'Q-1',
        notes: 'Urgent',
        items: [
          {
            item_name: 'Fertilizer',
            description: 'NPK',
            quantity: 2,
            rate: 50,
            account_id: 'acc-1',
            tax_rate: 20,
            inventory_item_id: 'item-1',
          },
        ],
      }, {} as never);
      await mutation.onSuccess?.(undefined, undefined, {} as never, {} as never);

      expect(purchaseOrdersApi.createPurchaseOrder).toHaveBeenCalledWith(
        {
          order_date: '2026-02-01',
          expected_delivery_date: '2026-02-10',
          supplier_id: 'supplier-1',
          notes: 'Urgent',
          terms_and_conditions: 'Payment Terms: 30 days\nDelivery Terms: Warehouse A\nSupplier Quote Ref: Q-1',
          items: [
            {
              line_number: 1,
              item_name: 'Fertilizer',
              description: 'NPK',
              quantity: 2,
              unit_price: 50,
              tax_rate: 20,
              account_id: 'acc-1',
              item_id: 'item-1',
            },
          ],
        },
        'org-123',
      );
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['purchase_orders', 'org-123'] });
    });
  });

  describe('useConvertPOToBill', () => {
    it('calls convertToBill and invalidates purchase orders and invoices', async () => {
      vi.mocked(purchaseOrdersApi.convertToBill).mockResolvedValue({ id: 'inv-1' });

      useConvertPOToBill();

      const mutation = getLatestMutationOptions();
      await mutation.mutationFn({ poId: 'po-1', invoiceDate: '2026-03-01', dueDate: '2026-03-15' }, {} as never);
      await mutation.onSuccess?.(undefined, undefined, {} as never, {} as never);

      expect(purchaseOrdersApi.convertToBill).toHaveBeenCalledWith('po-1', {
        invoice_date: '2026-03-01',
        due_date: '2026-03-15',
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['purchase_orders', 'org-123'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['invoices', 'org-123'] });
    });
  });

  describe('useUpdatePurchaseOrder', () => {
    it('appends payment and delivery info into notes before updating', async () => {
      vi.mocked(purchaseOrdersApi.updatePurchaseOrder).mockResolvedValue({ id: 'po-1' });

      useUpdatePurchaseOrder();

      const mutation = getLatestMutationOptions();
      await mutation.mutationFn({
        poId: 'po-1',
        order_date: '2026-04-01',
        notes: 'Existing note',
        payment_terms: 'Cash',
        delivery_address: 'Farm depot',
        items: [
          {
            item_name: 'Ignored line',
            quantity: 1,
            rate: 10,
            account_id: 'acc-1',
          },
        ],
      }, {} as never);
      await mutation.onSuccess?.(undefined, undefined, {} as never, {} as never);

      expect(purchaseOrdersApi.updatePurchaseOrder).toHaveBeenCalledWith('po-1', {
        order_date: '2026-04-01',
        notes: 'Existing note\n\nPayment Terms: Cash\nDelivery Address: Farm depot',
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['purchase_orders', 'org-123'] });
    });
  });

  describe('useUpdatePurchaseOrderStatus', () => {
    it('updates status and invalidates the purchase order list', async () => {
      vi.mocked(purchaseOrdersApi.updatePurchaseOrderStatus).mockResolvedValue({ id: 'po-1' });

      useUpdatePurchaseOrderStatus();

      const mutation = getLatestMutationOptions();
      await mutation.mutationFn({ poId: 'po-1', status: 'received', notes: 'Delivered' }, {} as never);
      await mutation.onSuccess?.(undefined, undefined, {} as never, {} as never);

      expect(purchaseOrdersApi.updatePurchaseOrderStatus).toHaveBeenCalledWith('po-1', {
        status: 'received',
        notes: 'Delivered',
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['purchase_orders', 'org-123'] });
    });
  });
});
