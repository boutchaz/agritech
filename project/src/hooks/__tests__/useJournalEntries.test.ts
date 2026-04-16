import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useJournalEntries,
  useJournalEntry,
  useJournalEntriesByStatus,
  useCreateJournalEntry,
  useUpdateJournalEntry,
  useDeleteJournalEntry,
  usePostJournalEntry,
  useCancelJournalEntry,
} from '../useJournalEntries';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

vi.mock('../../lib/api/journal-entries', () => ({
  journalEntriesApi: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    getPaginated: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
    cancel: vi.fn(),
  },
}));

const mockUseQuery = vi.mocked(useQuery);
const mockUseMutation = vi.mocked(useMutation);
const mockUseQueryClient = vi.mocked(useQueryClient);
const mockUseAuth = vi.mocked(useAuth);
const mockInvalidateQueries = vi.fn();

const getLatestMutationOptions = () => {
  const options = mockUseMutation.mock.calls[mockUseMutation.mock.calls.length - 1]?.[0];
  if (!options) throw new Error('Expected mutation options');
  return options as unknown as {
    mutationFn: (variables: unknown) => Promise<unknown>;
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

describe('useJournalEntries', () => {
  it('uses correct queryKey with filters', () => {
    useJournalEntries({ status: 'draft' });
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['journal_entries', 'org-123', { status: 'draft' }],
      enabled: true,
    }));
  });

  it('disables query when no organization', () => {
    mockUseAuth.mockReturnValue({ currentOrganization: null } as ReturnType<typeof useAuth>);
    useJournalEntries();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});

describe('useJournalEntry', () => {
  it('uses correct queryKey with entryId', () => {
    useJournalEntry('entry-1');
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['journal_entry', 'org-123', 'entry-1'],
      enabled: true,
    }));
  });

  it('disables when no entryId', () => {
    useJournalEntry(null);
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});

describe('useJournalEntriesByStatus', () => {
  it('uses correct queryKey with status', () => {
    useJournalEntriesByStatus('posted');
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['journal_entries', 'org-123', 'posted'],
    }));
  });
});

describe('useCreateJournalEntry', () => {
  it('calls create and invalidates queries', async () => {
    const { journalEntriesApi } = await import('../../lib/api/journal-entries');
    vi.mocked(journalEntriesApi.create).mockResolvedValue({ id: 'je-1' } as never);

    useCreateJournalEntry();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ entry_date: '2024-01-01', items: [] } as never);
    expect(journalEntriesApi.create).toHaveBeenCalled();

    await opts.onSuccess?.({ id: 'je-1' }, {} as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });
});

describe('useUpdateJournalEntry', () => {
  it('calls update and invalidates', async () => {
    const { journalEntriesApi } = await import('../../lib/api/journal-entries');
    vi.mocked(journalEntriesApi.update).mockResolvedValue({ id: 'je-1' } as never);

    useUpdateJournalEntry();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ id: 'je-1', data: { remarks: 'Updated' } } as never);
    expect(journalEntriesApi.update).toHaveBeenCalledWith('je-1', { remarks: 'Updated' }, 'org-123');

    await opts.onSuccess?.({ id: 'je-1' }, { id: 'je-1', data: {} } as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
  });
});

describe('useDeleteJournalEntry', () => {
  it('calls delete and invalidates', async () => {
    const { journalEntriesApi } = await import('../../lib/api/journal-entries');
    vi.mocked(journalEntriesApi.delete).mockResolvedValue(undefined as never);

    useDeleteJournalEntry();
    const opts = getLatestMutationOptions();

    await opts.mutationFn('je-1');
    expect(journalEntriesApi.delete).toHaveBeenCalledWith('je-1', 'org-123');

    await opts.onSuccess?.(undefined, 'je-1' as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });
});

describe('usePostJournalEntry', () => {
  it('calls post and invalidates', async () => {
    const { journalEntriesApi } = await import('../../lib/api/journal-entries');
    vi.mocked(journalEntriesApi.post).mockResolvedValue({ id: 'je-1' } as never);

    usePostJournalEntry();
    const opts = getLatestMutationOptions();

    await opts.mutationFn('je-1');
    expect(journalEntriesApi.post).toHaveBeenCalledWith('je-1', 'org-123');

    await opts.onSuccess?.({ id: 'je-1' }, 'je-1' as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
  });
});

describe('useCancelJournalEntry', () => {
  it('calls cancel and invalidates', async () => {
    const { journalEntriesApi } = await import('../../lib/api/journal-entries');
    vi.mocked(journalEntriesApi.cancel).mockResolvedValue({ id: 'je-1' } as never);

    useCancelJournalEntry();
    const opts = getLatestMutationOptions();

    await opts.mutationFn('je-1');
    expect(journalEntriesApi.cancel).toHaveBeenCalledWith('je-1', 'org-123');
  });
});
