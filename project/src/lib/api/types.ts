export interface PaginatedQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * API response that may be a direct array or wrapped in { data: T }.
 * Many NestJS endpoints return inconsistent shapes.
 */
export type ApiResponse<T> = T | { data: T };

/**
 * Extract data from an API response that may be an array or { data: array }.
 */
export function extractApiResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  const wrapped = response as Record<string, unknown>;
  if (wrapped && typeof wrapped === 'object' && Array.isArray(wrapped.data)) {
    return wrapped.data as T[];
  }
  return [];
}

export function buildPaginatedQueryString(query: PaginatedQuery & Record<string, unknown>): string {
  const params = new URLSearchParams();
  
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  
  return params.toString();
}
