import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCreateInvoice,
  useDeleteInvoice,
  useInvoices,
  useInvoicesByStatus,
  useInvoicesByType,
  usePostInvoice,
  useUpdateInvoiceStatus,
} from '../useInvoices';
import { createInvoiceFromItems, fetchPartyName } from '../../lib/invoice-service';
import { invoicesApi } from '../../lib/api/invoices';
import { extractApiResponse } from '../../lib/api/types';
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

vi.mock('../../lib/invoice-service', () => ({
  createInvoiceFromItems: vi.fn(),
  fetchPartyName: vi.fn(),
}));

vi.mock('../../lib/api/types', () => ({
  extractApiResponse: vi.fn(),
}));

vi.mock('../../lib/api/invoices', () => ({
  invoicesApi: {
    getAll: vi.fn(),
    postInvoice: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useInvoices hooks', () => {
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
    mockUseAuth.mockReturnValue({
      currentOrganization: { id: 'org-123', currency: 'EUR' },
      user: { id: 'user-1' },
    } as ReturnType<typeof useAuth>);
  });

  describe('query hooks', () => {
    it('uses organization id for the base invoices query', () => {
      useInvoices();

      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: ['invoices', 'org-123'],
        queryFn: expect.any(Function),
        enabled: true,
      });
    });

    it('disables invoice list query when no organization exists', () => {
      mockUseAuth.mockReturnValue({ currentOrganization: null, user: { id: 'user-1' } } as ReturnType<typeof useAuth>);

      useInvoices();

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        }),
      );
    });

    it('calls invoicesApi.getAll and extracts API response', async () => {
      vi.mocked(invoicesApi.getAll).mockResolvedValue([]);
      vi.mocked(extractApiResponse).mockReturnValue([{ id: 'inv-1' }] as never);

      useInvoices();

      const result = await getLatestQueryOptions().queryFn({} as never);

      expect(invoicesApi.getAll).toHaveBeenCalledWith({}, 'org-123');
      expect(extractApiResponse).toHaveBeenCalledWith([]);
      expect(result).toEqual([{ id: 'inv-1' }]);
    });

    it('passes invoice type filters to the API', async () => {
      vi.mocked(invoicesApi.getAll).mockResolvedValue([]);
      vi.mocked(extractApiResponse).mockReturnValue([] as never);

      useInvoicesByType('sales');

      await getLatestQueryOptions().queryFn({} as never);

      expect(invoicesApi.getAll).toHaveBeenCalledWith({ invoice_type: 'sales' }, 'org-123');
    });

    it('passes status filters to the API', async () => {
      vi.mocked(invoicesApi.getAll).mockResolvedValue([]);
      vi.mocked(extractApiResponse).mockReturnValue([] as never);

      useInvoicesByStatus('paid');

      await getLatestQueryOptions().queryFn({} as never);

      expect(invoicesApi.getAll).toHaveBeenCalledWith({ status: 'paid' }, 'org-123');
    });
  });

  describe('useCreateInvoice', () => {
    it('fetches party name, creates invoice, and invalidates invoices', async () => {
      vi.mocked(fetchPartyName).mockResolvedValue('Client SARL');
      vi.mocked(createInvoiceFromItems).mockResolvedValue({ id: 'inv-1', invoice_number: 'INV-001', grand_total: 100 });

      useCreateInvoice();

      const mutation = getLatestMutationOptions();
      await mutation.mutationFn({
        invoice_type: 'sales',
        party_id: 'party-1',
        invoice_date: '2026-02-01',
        due_date: '2026-02-15',
        remarks: 'Draft invoice',
        items: [
          {
            item_name: 'Service',
            quantity: 1,
            rate: 100,
            account_id: 'acc-1',
          },
        ],
      }, {} as never);
      await mutation.onSuccess?.(undefined, undefined, {} as never, {} as never);

      expect(fetchPartyName).toHaveBeenCalledWith('party-1', 'sales');
      expect(createInvoiceFromItems).toHaveBeenCalledWith({
        organization_id: 'org-123',
        user_id: 'user-1',
        invoice_type: 'sales',
        party_id: 'party-1',
        party_name: 'Client SARL',
        invoice_date: '2026-02-01',
        due_date: '2026-02-15',
        items: [
          {
            item_name: 'Service',
            quantity: 1,
            rate: 100,
            account_id: 'acc-1',
          },
        ],
        currency_code: 'EUR',
        exchange_rate: 1,
        status: 'draft',
        remarks: 'Draft invoice',
        farm_id: null,
        parcel_id: null,
        sales_order_id: null,
        purchase_order_id: null,
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['invoices', 'org-123'] });
    });

    it('throws when the authenticated user is missing', async () => {
      mockUseAuth.mockReturnValue({
        currentOrganization: { id: 'org-123', currency: 'EUR' },
        user: null,
      } as ReturnType<typeof useAuth>);

      useCreateInvoice();

      const mutation = getLatestMutationOptions();
      await expect(
        mutation.mutationFn({
          invoice_type: 'sales',
          party_id: 'party-1',
          invoice_date: '2026-02-01',
          due_date: '2026-02-15',
          items: [],
        }, {} as never),
      ).rejects.toThrow('User not authenticated');
    });
  });

  describe('mutation hooks', () => {
    it('posts invoices and invalidates invoice, list, and journal queries', async () => {
      vi.mocked(invoicesApi.postInvoice).mockResolvedValue({ success: true, message: 'ok', data: { invoice_id: 'inv-1', journal_entry_id: 'je-1' } });

      usePostInvoice();

      const mutation = getLatestMutationOptions();
      const variables = { invoice_id: 'inv-1', posting_date: '2026-03-01' };
      await mutation.mutationFn(variables, {} as never);
      await mutation.onSuccess?.({}, variables, {} as never, {} as never);

      expect(invoicesApi.postInvoice).toHaveBeenCalledWith('inv-1', '2026-03-01', 'org-123');
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['invoices', 'org-123'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['invoice', 'inv-1'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['journal_entries'] });
    });

    it('updates status and invalidates both invoice list and detail queries', async () => {
      vi.mocked(invoicesApi.updateStatus).mockResolvedValue({ id: 'inv-1' });

      useUpdateInvoiceStatus();

      const mutation = getLatestMutationOptions();
      const variables = { invoice_id: 'inv-1', status: 'paid', remarks: 'Settled' };
      await mutation.mutationFn(variables, {} as never);
      await mutation.onSuccess?.({}, variables, {} as never, {} as never);

      expect(invoicesApi.updateStatus).toHaveBeenCalledWith(
        'inv-1',
        { status: 'paid', remarks: 'Settled' },
        'org-123',
      );
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['invoices', 'org-123'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['invoice', 'inv-1'] });
    });

    it('deletes an invoice and invalidates the invoice list', async () => {
      vi.mocked(invoicesApi.delete).mockResolvedValue(undefined);

      useDeleteInvoice();

      const mutation = getLatestMutationOptions();
      await mutation.mutationFn('inv-1', {} as never);
      await mutation.onSuccess?.(undefined, 'inv-1', {} as never, {} as never);

      expect(invoicesApi.delete).toHaveBeenCalledWith('inv-1', 'org-123');
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['invoices', 'org-123'] });
    });
  });
});
