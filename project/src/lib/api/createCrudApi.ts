import { apiClient } from '../api-client';

/**
 * Utility to build URL query string from filters object
 */
export function buildQueryUrl(baseUrl: string, filters?: Record<string, unknown>): string {
  if (!filters || Object.keys(filters).length === 0) {
    return baseUrl;
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Generic CRUD API factory
 * Creates standardized API methods for a resource
 *
 * @example
 * ```typescript
 * // Create API for customers
 * export const customersApi = createCrudApi<Customer, CreateCustomerInput, CustomerFilters>(
 *   '/api/v1/customers'
 * );
 *
 * // Usage
 * const customers = await customersApi.getAll({ is_active: true }, orgId);
 * const customer = await customersApi.getOne('123', orgId);
 * const newCustomer = await customersApi.create({ name: 'Test' }, orgId);
 * ```
 */
export function createCrudApi<
  TEntity,
  TCreateInput = Partial<TEntity>,
  TFilters = Record<string, unknown>,
  TUpdateInput = Partial<TCreateInput>
>(baseUrl: string) {
  return {
    /**
     * Get all entities with optional filters
     */
    async getAll(filters?: TFilters, organizationId?: string): Promise<TEntity[]> {
      const url = buildQueryUrl(baseUrl, filters as Record<string, unknown>);
      return apiClient.get<TEntity[]>(url, {}, organizationId);
    },

    /**
     * Get a single entity by ID
     */
    async getOne(id: string, organizationId?: string): Promise<TEntity> {
      return apiClient.get<TEntity>(`${baseUrl}/${id}`, {}, organizationId);
    },

    /**
     * Create a new entity
     */
    async create(data: TCreateInput, organizationId?: string): Promise<TEntity> {
      return apiClient.post<TEntity>(baseUrl, data, {}, organizationId);
    },

    /**
     * Update an entity
     */
    async update(id: string, data: TUpdateInput, organizationId?: string): Promise<TEntity> {
      return apiClient.patch<TEntity>(`${baseUrl}/${id}`, data, {}, organizationId);
    },

    /**
     * Delete an entity (soft delete)
     */
    async delete(id: string, organizationId?: string): Promise<void> {
      return apiClient.delete<void>(`${baseUrl}/${id}`, {}, organizationId);
    },
  };
}

/**
 * Type for the API created by createCrudApi
 */
export type CrudApi<
  TEntity,
  TCreateInput = Partial<TEntity>,
  TFilters = Record<string, unknown>,
  TUpdateInput = Partial<TCreateInput>
> = ReturnType<typeof createCrudApi<TEntity, TCreateInput, TFilters, TUpdateInput>>;
