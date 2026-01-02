/**
 * Common test utilities and setup functions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../src/modules/database/database.service';
import {
  createMockDatabaseService,
  createMockSupabaseClient,
  MockDatabaseService,
  MockSupabaseClient,
} from './mock-database.helper';

/**
 * Standard test organization ID for consistent testing
 */
export const TEST_ORG_ID = 'test-org-123';

/**
 * Standard test user ID for consistent testing
 */
export const TEST_USER_ID = 'test-user-456';

/**
 * Standard test IDs for various entities
 */
export const TEST_IDS = {
  organization: TEST_ORG_ID,
  user: TEST_USER_ID,
  invoice: 'test-invoice-789',
  payment: 'test-payment-012',
  journalEntry: 'test-je-345',
  account: 'test-account-678',
  farm: 'test-farm-901',
  parcel: 'test-parcel-234',
  worker: 'test-worker-567',
  task: 'test-task-890',
};

/**
 * Mock ConfigService for testing
 */
export const createMockConfigService = (): Partial<ConfigService> => ({
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      JWT_SECRET: 'test-jwt-secret',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    };
    return config[key];
  }),
});

/**
 * Creates a standard testing module with mocked dependencies
 */
export interface TestModuleConfig {
  providers: any[];
  mockClient?: MockSupabaseClient;
  mockDatabaseService?: MockDatabaseService;
}

export const createTestingModule = async (
  config: TestModuleConfig,
): Promise<{
  module: TestingModule;
  mockClient: MockSupabaseClient;
  mockDatabaseService: MockDatabaseService;
}> => {
  const mockClient = config.mockClient || createMockSupabaseClient();
  const mockDatabaseService =
    config.mockDatabaseService || createMockDatabaseService(mockClient);

  const module = await Test.createTestingModule({
    providers: [
      ...config.providers,
      { provide: DatabaseService, useValue: mockDatabaseService },
      { provide: ConfigService, useValue: createMockConfigService() },
    ],
  }).compile();

  return { module, mockClient, mockDatabaseService };
};

/**
 * Standard date strings for testing
 */
export const TEST_DATES = {
  today: new Date().toISOString().split('T')[0],
  yesterday: new Date(Date.now() - 86400000).toISOString().split('T')[0],
  tomorrow: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  lastWeek: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
  nextWeek: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
};

/**
 * Helper to wait for async operations
 */
export const waitFor = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper to expect a promise to reject with a specific error type
 */
export const expectToRejectWith = async <T extends Error>(
  promise: Promise<any>,
  errorType: new (...args: any[]) => T,
  messageContains?: string,
): Promise<void> => {
  await expect(promise).rejects.toThrow(errorType);
  if (messageContains) {
    await expect(promise).rejects.toThrow(messageContains);
  }
};

/**
 * Helper to create a mock NestJS Logger
 */
export const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
});

/**
 * Helper to verify that a function was called with organization context
 */
export const verifyOrganizationContext = (
  mockFn: jest.Mock,
  organizationId: string,
): void => {
  const calls = mockFn.mock.calls;
  const hasOrgContext = calls.some((call) =>
    call.some(
      (arg: any) =>
        arg === organizationId ||
        (typeof arg === 'object' && arg?.organization_id === organizationId),
    ),
  );
  expect(hasOrgContext).toBe(true);
};

/**
 * Helper to create a sequence of mock responses for consecutive calls
 */
export const createMockSequence = <T>(responses: T[]): jest.Mock => {
  const mock = jest.fn();
  responses.forEach((response, index) => {
    mock.mockResolvedValueOnce(response);
  });
  return mock;
};

/**
 * Helper to verify double-entry accounting balance
 */
export const verifyDoubleEntryBalance = (
  items: { debit: number; credit: number }[],
): boolean => {
  const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
  const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
  return Math.abs(totalDebit - totalCredit) < 0.01;
};

/**
 * Helper to create mock authentication token
 */
export const createMockToken = (userId: string = TEST_USER_ID): string => {
  return `mock-token-${userId}-${Date.now()}`;
};

/**
 * Helper to create a mock user object
 */
export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: TEST_USER_ID,
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    first_name: 'Test',
    last_name: 'User',
  },
  ...overrides,
});
