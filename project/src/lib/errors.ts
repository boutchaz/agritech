/**
 * Centralized error constants and utilities
 * Single source of truth for common error messages and validation patterns
 */

/**
 * Common error messages
 */
export const ErrorMessages = {
  ORGANIZATION_ID_REQUIRED: 'Organization ID is required. Please select an organization first.',
  NO_ORGANIZATION: 'No organization',
  AUTH_REQUIRED: 'Authentication required. Please sign in to use this feature.',
  NO_ACTIVE_SESSION: 'No active session. Please log in again.',
  SESSION_EXPIRED: 'Session expired. Please log in again.',
  ACCESS_DENIED: 'Access denied. You may not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  CONNECTION_ERROR: 'Connection error. The server may be unavailable. Please check your internet connection and try again.',
  NETWORK_ERROR: 'Network request failed',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
} as const;

/**
 * Custom error classes
 */
export class OrganizationRequiredError extends Error {
  constructor(message: string = ErrorMessages.ORGANIZATION_ID_REQUIRED) {
    super(message);
    this.name = 'OrganizationRequiredError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = ErrorMessages.AUTH_REQUIRED) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class SessionExpiredError extends Error {
  constructor(message: string = ErrorMessages.SESSION_EXPIRED) {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export class AccessDeniedError extends Error {
  constructor(message: string = ErrorMessages.ACCESS_DENIED) {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = ErrorMessages.NOT_FOUND) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Validation utilities
 */
export const Validators = {
  /**
   * Check if organization ID is present and valid
   * @throws {OrganizationRequiredError} if organizationId is missing
   */
  requireOrganizationId(organizationId: string | null | undefined, context = ''): string {
    if (!organizationId) {
      throw new OrganizationRequiredError(context ? `${context}: ${ErrorMessages.NO_ORGANIZATION}` : undefined);
    }
    return organizationId;
  },

  /**
   * Check if user is authenticated
   * @throws {AuthenticationError} if user is not authenticated
   */
  requireAuthenticated(user: unknown): asserts user is { id: string } {
    if (!user || typeof (user as any).id !== 'string') {
      throw new AuthenticationError();
    }
  },

  /**
   * Validate UUID format
   */
  isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },
};

/**
 * Error handler utilities
 */
export const ErrorHandlers = {
  /**
   * Log error with context
   */
  log(error: unknown, context: string): void {
    if (error instanceof Error) {
      console.error(`[${context}] ${error.name}: ${error.message}`);
    } else {
      console.error(`[${context}] Unknown error:`, error);
    }
  },

  /**
   * Get user-friendly error message
   */
  getMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unknown error occurred';
  },

  /**
   * Check if error is a network/connection error
   */
  isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('Network request failed') ||
        error.message.includes('Connection error')
      );
    }
    return false;
  },

  /**
   * Check if error is an auth error
   */
  isAuthError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('401') ||
        error.message.includes('403') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('Forbidden') ||
        error.message.includes('Session expired')
      );
    }
    return false;
  },
};

/**
 * Error response types for API calls
 */
export type AsyncResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Utility to wrap async operations in try-catch
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  context = 'operation'
): Promise<AsyncResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    ErrorHandlers.log(error, context);
    return { success: false, error: error as Error };
  }
}
