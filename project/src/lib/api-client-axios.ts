import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from './supabase';
import { useOrganizationStore } from '@/stores/organizationStore';

/**
 * Parsed field error from NestJS validation
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Error pattern mapping for custom error messages that don't include field names
 * Maps regex patterns to field names
 */
interface ErrorPattern {
  pattern: RegExp;
  getField: (match: RegExpMatchArray) => string;
  getMessage: (match: RegExpMatchArray) => string;
}

// Common error patterns that don't start with field names
const ERROR_PATTERNS: ErrorPattern[] = [
  // "Invalid input: expected number, received null" -> Detect numeric fields that received null
  {
    pattern: /^(Invalid input):\s*expected\s+(number|string|boolean|date),\s*received\s+(null|empty|undefined)/i,
    getField: () => {
      // Can't determine field from this pattern alone
      return null;
    },
    getMessage: (match) => `This field requires a valid ${match[2].toLowerCase()}`,
  },
  // "Invalid option: expected one of "x", "y", "z"" -> Detect enum validation errors
  {
    pattern: /^(Invalid option):\s*expected\s+one\s+of\s+(.+)$/i,
    getField: (match) => {
      const optionsStr = match[2];
      // Map common enum values to field names
      if (optionsStr.includes('khammass') || optionsStr.includes('rebaa') || optionsStr.includes('tholth')) {
        return 'metayage_type';
      }
      if (optionsStr.includes('gross_revenue') || optionsStr.includes('net_revenue')) {
        return 'calculation_basis';
      }
      if (optionsStr.includes('monthly') || optionsStr.includes('daily') || optionsStr.includes('per_task') || optionsStr.includes('harvest_share')) {
        return 'payment_frequency';
      }
      if (optionsStr.includes('fixed_salary') || optionsStr.includes('daily_worker') || optionsStr.includes('metayage')) {
        return 'worker_type';
      }
      return null;
    },
    getMessage: (match) => match[0],
  },
];

/**
 * Custom API error that preserves the original response data
 * and parses NestJS validation errors into field-level errors
 */
export class ApiError extends Error {
  public statusCode: number;
  public responseData: any;
  public fieldErrors: FieldError[];

  constructor(message: string, statusCode: number, responseData?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.responseData = responseData;
    this.fieldErrors = ApiError.parseFieldErrors(responseData);
  }

  /**
   * Parse NestJS ValidationPipe errors into field errors
   * Handles multiple formats:
   * 1. Array format: { message: ["field constraint", ...] }
   * 2. Custom details format: { details: { field: message, ... } }
   * 3. Detailed errors format: { errors: [{ field, errors: [...] }] }
   * 4. Field constraints format: { fieldErrors: { field: { constraints: [...] } } }
   *
   * Field name formats supported:
   * - Simple: email, first_name, user_id
   * - Nested: items.0.item_id, address.city
   * - Array notation: items[0].name (converted to items.0.name)
   *
   * For errors without field names (e.g., "Invalid input: expected number"),
   * attempts to map based on error patterns.
   */
  private static parseFieldErrors(data: any): FieldError[] {
    const fieldErrors: FieldError[] = [];

    if (!data) return fieldErrors;

    // Check for fieldErrors object format (most detailed, includes field names)
    // { fieldErrors: { email: { constraints: ["isEmail"] }, ... } }
    if (data.fieldErrors && typeof data.fieldErrors === 'object') {
      Object.entries(data.fieldErrors).forEach(([field, errorData]: [string, any]) => {
        const constraints = errorData?.constraints || errorData?.errors || [];
        if (Array.isArray(constraints)) {
          constraints.forEach((constraint: any) => {
            const msg = typeof constraint === 'string' ? constraint : JSON.stringify(constraint);
            fieldErrors.push({
              field,
              message: this.formatConstraintMessage(field, msg),
            });
          });
        } else {
          fieldErrors.push({
            field,
            message: 'Invalid value',
          });
        }
      });
      // Return early if we found fieldErrors format (most reliable)
      if (fieldErrors.length > 0) return fieldErrors;
    }

    // Handle NestJS ValidationPipe array format (default)
    // { message: ["email should not be empty", "first_name must be longer...", ...] }
    if (Array.isArray(data.message)) {
      data.message.forEach((errorMsg: string) => {
        // Try to match field name at start (letters, numbers, underscores, dots)
        const match = errorMsg.match(/^([a-zA-Z_][a-zA-Z0-9_.]*)\s+(.+)$/);

        if (match) {
          fieldErrors.push({
            field: match[1],
            message: match[2],
          });
        } else {
          // Error message doesn't start with field name
          // Try to match against known patterns
          for (const pattern of ERROR_PATTERNS) {
            const patternMatch = errorMsg.match(pattern.pattern);
            if (patternMatch) {
              const fieldName = pattern.getField(patternMatch);
              if (fieldName) {
                fieldErrors.push({
                  field: fieldName,
                  message: pattern.getMessage(patternMatch),
                });
              }
              break; // Use first matching pattern
            }
          }
        }
      });
    }

    // Handle custom details format
    // { details: { email: "Email is required", first_name: "First name required" } }
    if (data.details && typeof data.details === 'object') {
      Object.entries(data.details).forEach(([field, message]: [string, any]) => {
        const msg = typeof message === 'string' ? message : message?.message || String(message);
        fieldErrors.push({ field, message: msg });
      });
    }

    // Handle NestJS detailed errors format (from custom exception factory)
    // { errors: [{ field: "email", errors: ["Email is required"] }] }
    if (Array.isArray(data.errors)) {
      data.errors.forEach((errorObj: any) => {
        if (errorObj.field && errorObj.errors) {
          const messages = Array.isArray(errorObj.errors) ? errorObj.errors : [errorObj.errors];
          messages.forEach((msg: string) => {
            fieldErrors.push({
              field: errorObj.field,
              message: msg,
            });
          });
        }
      });
    }

    return fieldErrors;
  }

  /**
   * Format constraint error messages to be more user-friendly
   */
  private static formatConstraintMessage(field: string, constraint: string): string {
    const constraintMappings: Record<string, string> = {
      'isEmail': 'Must be a valid email address',
      'isNumber': 'Must be a number',
      'isString': 'Must be a string',
      'isBoolean': 'Must be true or false',
      'isEnum': 'Invalid option selected',
      'min': 'Value is too small',
      'max': 'Value is too large',
      'minLength': 'Too short',
      'maxLength': 'Too long',
      'isNotEmpty': 'Cannot be empty',
    };

    return constraintMappings[constraint] || constraint;
  }

  /**
   * Check if this error has field-level validation errors
   */
  public hasFieldErrors(): boolean {
    return this.fieldErrors.length > 0;
  }

  /**
   * Get all error messages as a string
   */
  public getErrorMessages(): string {
    if (this.hasFieldErrors()) {
      return this.fieldErrors.map(e => `${e.field}: ${e.message}`).join(', ');
    }
    return this.message;
  }
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Get the current organization ID from Zustand store
 * This matches the approach used in api-client.ts for consistency
 */
function getCurrentOrganizationId(): string | null {
  try {
    const currentOrganization = useOrganizationStore.getState().currentOrganization;
    return currentOrganization?.id || null;
  } catch (error) {
    console.error('[api-client-axios] Error reading organization from store:', error);
    return null;
  }
}

/**
 * Create axios instance with interceptors
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_URL,
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: Add auth token and organization ID
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session');
      }

      // Add authorization header
      config.headers.Authorization = `Bearer ${session.access_token}`;

      // Add organization ID header
      const organizationId = getCurrentOrganizationId();
      if (organizationId) {
        config.headers['X-Organization-Id'] = organizationId;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor: Handle errors globally
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // Handle network errors
      if (!error.response) {
        return Promise.reject(new Error('Network error. Please check your connection.'));
      }

      // Handle HTTP errors
      const status = error.response.status;
      const data = error.response.data as { message?: string; error?: string };

      let message = data?.message || data?.error || error.message;

      // Customize error messages based on status
      switch (status) {
        case 401:
          message = 'Unauthorized. Please sign in again.';
          // Optionally redirect to login
          break;
        case 403:
          message = 'You do not have permission to perform this action.';
          break;
        case 404:
          message = 'Resource not found.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
      }

      // Throw ApiError with original response data preserved
      return Promise.reject(new ApiError(message, status, data));
    }
  );

  return client;
}

// Export singleton instance
export const apiClient = createApiClient();

// Export types for convenience
export type { AxiosError, AxiosResponse } from 'axios';

