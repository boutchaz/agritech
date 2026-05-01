import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stockEntriesApi } from '../stock-entries';

const mockGet = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
  ApiClient: vi.fn(),
}));

describe('stockEntriesApi.getMovementsByItem', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('unwraps paginated response shape to array', async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ id: 'm1', quantity: 5 }],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });

    const result = await stockEntriesApi.getMovementsByItem('item-1');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('m1');
  });

  it('passes through flat array response', async () => {
    mockGet.mockResolvedValueOnce([{ id: 'm2' }]);
    const result = await stockEntriesApi.getMovementsByItem('item-1');
    expect(result).toEqual([{ id: 'm2' }]);
  });

  it('returns empty array when response lacks data', async () => {
    mockGet.mockResolvedValueOnce({ total: 0 });
    const result = await stockEntriesApi.getMovementsByItem('item-1');
    expect(result).toEqual([]);
  });
});
