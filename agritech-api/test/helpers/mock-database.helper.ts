/**
 * Shared mock helpers for Supabase database operations
 * Used across all unit tests for consistent mocking patterns
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a chainable mock query builder that simulates Supabase query patterns
 */
export interface MockQueryBuilder {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  upsert: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gt: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  lte: jest.Mock;
  like: jest.Mock;
  ilike: jest.Mock;
  is: jest.Mock;
  in: jest.Mock;
  contains: jest.Mock;
  containedBy: jest.Mock;
  range: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  filter: jest.Mock;
  or: jest.Mock;
  and: jest.Mock;
  not: jest.Mock;
  match: jest.Mock;
  textSearch: jest.Mock;
  head: jest.Mock;
  then: jest.Mock;
}

export const createMockQueryBuilder = (): MockQueryBuilder => {
  const builder: MockQueryBuilder = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    gt: jest.fn(),
    gte: jest.fn(),
    lt: jest.fn(),
    lte: jest.fn(),
    like: jest.fn(),
    ilike: jest.fn(),
    is: jest.fn(),
    in: jest.fn(),
    contains: jest.fn(),
    containedBy: jest.fn(),
    range: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    filter: jest.fn(),
    or: jest.fn(),
    and: jest.fn(),
    not: jest.fn(),
    match: jest.fn(),
    textSearch: jest.fn(),
    head: jest.fn(),
    then: jest.fn(),
  };

  const chainableMethods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'is',
    'in',
    'contains',
    'containedBy',
    'range',
    'order',
    'limit',
    'filter',
    'or',
    'and',
    'not',
    'match',
    'textSearch',
    'head',
  ];

  chainableMethods.forEach((method) => {
    (builder[method as keyof MockQueryBuilder] as jest.Mock).mockReturnValue(
      builder,
    );
  });

  // Terminal methods that return Promises
  builder.single.mockResolvedValue({ data: null, error: null });
  builder.maybeSingle.mockResolvedValue({ data: null, error: null });

  // Make the builder thenable (can be awaited)
  builder.then.mockImplementation((resolve: (value: { data: any[]; error: any }) => void) => {
    resolve({ data: [], error: null });
    return Promise.resolve({ data: [], error: null });
  });

  return builder;
};

export const createThenableQueryBuilder = <T>(
  data: T,
  error: any = null,
): MockQueryBuilder => {
  const builder = createMockQueryBuilder();

  const thenableResult = {
    ...builder,
    data,
    error,
    then: (resolve: (value: { data: T; error: any }) => void) =>
      resolve({ data, error }),
  };

  builder.order = jest.fn().mockReturnValue(thenableResult);

  return builder;
};

/**
 * Creates a mock Supabase client for testing
 */
export interface MockSupabaseClient {
  from: jest.Mock;
  rpc: jest.Mock;
  auth: {
    getUser: jest.Mock;
    signInWithPassword: jest.Mock;
    setSession: jest.Mock;
    admin: {
      getUserById: jest.Mock;
      createUser: jest.Mock;
      deleteUser: jest.Mock;
    };
  };
  storage: {
    from: jest.Mock;
  };
}

export const createMockSupabaseClient = (): MockSupabaseClient => ({
  from: jest.fn().mockReturnValue(createMockQueryBuilder()) as any,
  rpc: jest.fn(),
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    setSession: jest.fn(),
    admin: {
      getUserById: jest.fn(),
      createUser: jest.fn(),
      deleteUser: jest.fn(),
    },
  },
  storage: {
    from: jest.fn(),
  },
});

/**
 * Mock DatabaseService for dependency injection
 */
export interface MockDatabaseService {
  getClient: jest.Mock;
  getAdminClient: jest.Mock;
  getClientWithAuth: jest.Mock;
  getPgPool: jest.Mock;
  executeRawQuery: jest.Mock;
  executeInPgTransaction: jest.Mock;
}

export const createMockDatabaseService = (
  mockClient?: MockSupabaseClient,
): MockDatabaseService => {
  const client = mockClient || createMockSupabaseClient();
  return {
    getClient: jest.fn(() => client),
    getAdminClient: jest.fn(() => client),
    getClientWithAuth: jest.fn(() => client),
    getPgPool: jest.fn(),
    executeRawQuery: jest.fn(),
    executeInPgTransaction: jest.fn(),
  };
};

/**
 * Helper to create a successful query result
 */
export const mockQueryResult = <T>(data: T, error: any = null) => ({
  data,
  error,
});

/**
 * Helper to create an error query result
 */
export const mockQueryError = (message: string, code?: string) => ({
  data: null,
  error: { message, code },
});

/**
 * Setup mock for a specific table query with chainable methods
 * Returns the query builder for further customization
 */
export const setupTableMock = (
  mockClient: MockSupabaseClient,
  tableName: string,
  queryBuilder?: MockQueryBuilder,
): MockQueryBuilder => {
  const builder = queryBuilder || createMockQueryBuilder();
  mockClient.from.mockImplementation((table: string) => {
    if (table === tableName) {
      return builder;
    }
    return createMockQueryBuilder();
  });
  return builder;
};

/**
 * Setup mock for multiple tables
 */
export const setupMultiTableMock = (
  mockClient: MockSupabaseClient,
  tableConfigs: Record<string, MockQueryBuilder>,
): void => {
  mockClient.from.mockImplementation((table: string) => {
    return tableConfigs[table] || createMockQueryBuilder();
  });
};

/**
 * Setup mock for RPC calls
 */
export const setupRpcMock = (
  mockClient: MockSupabaseClient,
  rpcName: string,
  result: any,
  error: any = null,
): void => {
  mockClient.rpc.mockImplementation((name: string, params?: any) => {
    if (name === rpcName) {
      return Promise.resolve({ data: result, error });
    }
    return Promise.resolve({ data: null, error: { message: 'Unknown RPC' } });
  });
};

/**
 * Setup mock for multiple RPC calls
 */
export const setupMultiRpcMock = (
  mockClient: MockSupabaseClient,
  rpcConfigs: Record<string, { data: any; error?: any }>,
): void => {
  mockClient.rpc.mockImplementation((name: string) => {
    const config = rpcConfigs[name];
    if (config) {
      return Promise.resolve({ data: config.data, error: config.error || null });
    }
    return Promise.resolve({ data: null, error: { message: 'Unknown RPC' } });
  });
};

/**
 * Helper to verify organization context is properly enforced
 */
export const expectOrganizationFilter = (
  mockQueryBuilder: MockQueryBuilder,
  organizationId: string,
): void => {
  expect(mockQueryBuilder.eq).toHaveBeenCalledWith(
    'organization_id',
    organizationId,
  );
};

/**
 * Setup thenable mock for query builder - handles promise resolution
 * This helper makes the query builder thenable (can be awaited)
 */
export const setupThenableMock = (
  queryBuilder: MockQueryBuilder,
  data: any,
  error: any = null,
): void => {
  queryBuilder.then.mockImplementation((resolve: (value: { data: any; error: any }) => void) => {
    const result = { data, error };
    resolve(result);
    return Promise.resolve(result);
  });
};

/**
 * Reset all mocks in a mock client
 */
export const resetMockClient = (mockClient: MockSupabaseClient): void => {
  mockClient.from.mockReset();
  mockClient.rpc.mockReset();
  mockClient.auth.getUser.mockReset();
  mockClient.auth.signInWithPassword.mockReset();
  mockClient.auth.setSession.mockReset();
  mockClient.auth.admin.getUserById.mockReset();
  mockClient.auth.admin.createUser.mockReset();
  mockClient.auth.admin.deleteUser.mockReset();
};

/**
 * Creates a chainable mock query builder that properly handles async resolution
 * This is needed for queries that don't end with .single() like findAll
 */
export const createChainableQueryBuilder = <T>(
  data: T,
  error: any = null,
): MockQueryBuilder => {
  const builder = createMockQueryBuilder();

  // Create a thenable result that can be awaited
  const makeThenable = (resultData: T, resultError: any = null) => ({
    ...builder,
    then: (resolve: (value: { data: T; error: any }) => void) => {
      const result = { data: resultData, error: resultError };
      resolve(result);
      return Promise.resolve(result);
    },
    catch: (reject: (reason: any) => void) => Promise.resolve({ data: resultData, error: resultError }),
  });

  // Override chainable methods to return thenable at the end
  const chainableMethods = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy', 'range', 'order', 'limit', 'filter', 'or', 'and', 'not', 'match', 'textSearch', 'head'];

  chainableMethods.forEach((method) => {
    (builder[method as keyof MockQueryBuilder] as jest.Mock).mockReturnValue(makeThenable(data, error));
  });

  return builder;
};
