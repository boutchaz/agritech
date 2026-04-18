import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction', enum: SortDirection, default: SortDirection.DESC })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDir?: SortDirection = SortDirection.DESC;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ description: 'Filter from date (inclusive)', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date (inclusive)', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
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
 * Build a PaginatedResponse from a count and data array.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 0,
  };
}

/**
 * Return an empty PaginatedResponse (e.g. when access is denied or no org).
 */
export function emptyPaginatedResponse<T>(page = 1, pageSize = 50): PaginatedResponse<T> {
  return { data: [], total: 0, page, pageSize, totalPages: 0 };
}

/**
 * Extract pagination params from a DTO/filters object, applying defaults.
 */
export function extractPagination(filters?: { page?: number | string; pageSize?: number | string; limit?: number | string }): {
  page: number;
  pageSize: number;
  from: number;
  to: number;
} {
  const page = Math.max(1, Number(filters?.page) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(filters?.pageSize || filters?.limit) || 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

/**
 * Generic paginated query for Supabase.
 *
 * Usage:
 * ```ts
 * return paginate<Worker>(client, 'workers', {
 *   filters: (q) => q.eq('organization_id', orgId).eq('is_active', true),
 *   select: '*, farms(name)',
 *   page, pageSize,
 *   orderBy: 'last_name',
 *   ascending: true,
 *   map: (row) => ({ ...row, farm_name: row.farms?.name }),
 * });
 * ```
 */
export async function paginate<T>(
  client: any,
  table: string,
  options: {
    select?: string;
    filters?: (query: any) => any;
    page?: number;
    pageSize?: number;
    orderBy?: string;
    ascending?: boolean;
    map?: (row: any) => T;
  },
): Promise<PaginatedResponse<T>> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Count query
  let countQuery = client.from(table).select('id', { count: 'exact', head: true });
  if (options.filters) countQuery = options.filters(countQuery);
  const { count } = await countQuery;

  // Data query
  let dataQuery = client.from(table).select(options.select || '*');
  if (options.filters) dataQuery = options.filters(dataQuery);
  if (options.orderBy) {
    dataQuery = dataQuery.order(options.orderBy, { ascending: options.ascending ?? false });
  }
  dataQuery = dataQuery.range(from, to);

  const { data, error } = await dataQuery;

  if (error) {
    throw new Error(`Failed to fetch ${table}: ${error.message}`);
  }

  const rows = options.map ? (data || []).map(options.map) : (data || []);

  return paginatedResponse<T>(rows, count || 0, page, pageSize);
}
