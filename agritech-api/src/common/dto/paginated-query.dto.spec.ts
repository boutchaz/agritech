import {
  paginatedResponse,
  emptyPaginatedResponse,
  extractPagination,
} from './paginated-query.dto';

describe('paginatedResponse', () => {
  it('wraps data array with correct metadata', () => {
    const result = paginatedResponse(['a', 'b', 'c'], 10, 1, 5);

    expect(result).toEqual({
      data: ['a', 'b', 'c'],
      total: 10,
      page: 1,
      pageSize: 5,
      totalPages: 2,
    });
  });

  it('calculates totalPages correctly', () => {
    expect(paginatedResponse([], 0, 1, 10).totalPages).toBe(0);
    expect(paginatedResponse([], 1, 1, 10).totalPages).toBe(1);
    expect(paginatedResponse([], 10, 1, 10).totalPages).toBe(1);
    expect(paginatedResponse([], 11, 1, 10).totalPages).toBe(2);
    expect(paginatedResponse([], 100, 1, 10).totalPages).toBe(10);
    expect(paginatedResponse([], 101, 1, 10).totalPages).toBe(11);
  });

  it('preserves original data reference', () => {
    const data = [{ id: '1' }];
    const result = paginatedResponse(data, 1, 1, 10);
    expect(result.data).toBe(data);
  });

  it('handles empty data', () => {
    const result = paginatedResponse([], 0, 1, 50);

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});

describe('emptyPaginatedResponse', () => {
  it('returns empty response with defaults', () => {
    const result = emptyPaginatedResponse();

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    });
  });

  it('accepts custom page and pageSize', () => {
    const result = emptyPaginatedResponse(3, 25);

    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(25);
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe('extractPagination', () => {
  it('returns defaults when no filters provided', () => {
    const result = extractPagination();

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.from).toBe(0);
    expect(result.to).toBe(49);
  });

  it('parses page and pageSize from numbers', () => {
    const result = extractPagination({ page: 3, pageSize: 20 });

    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(20);
    expect(result.from).toBe(40);
    expect(result.to).toBe(59);
  });

  it('parses page and pageSize from strings', () => {
    const result = extractPagination({ page: '2', pageSize: '25' });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(25);
    expect(result.from).toBe(25);
    expect(result.to).toBe(49);
  });

  it('uses limit as fallback for pageSize', () => {
    const result = extractPagination({ limit: 30 });

    expect(result.pageSize).toBe(30);
  });

  it('clamps pageSize to max 100', () => {
    const result = extractPagination({ pageSize: 500 });

    expect(result.pageSize).toBe(100);
  });

  it('falls back to default 50 when pageSize is 0 (falsy)', () => {
    const result = extractPagination({ pageSize: 0 });

    // Number(0) || 50 = 50 (0 is falsy)
    expect(result.pageSize).toBe(50);
  });

  it('clamps page to min 1', () => {
    const result = extractPagination({ page: 0 });

    expect(result.page).toBe(1);
    expect(result.from).toBe(0);
  });

  it('handles negative values', () => {
    const result = extractPagination({ page: -5, pageSize: -10 });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
  });

  it('calculates correct from/to for page 1', () => {
    const result = extractPagination({ page: 1, pageSize: 10 });

    expect(result.from).toBe(0);
    expect(result.to).toBe(9);
  });

  it('calculates correct from/to for page 5', () => {
    const result = extractPagination({ page: 5, pageSize: 10 });

    expect(result.from).toBe(40);
    expect(result.to).toBe(49);
  });
});
