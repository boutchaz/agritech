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
   *
   * Field name formats supported:
   * - Simple: email, first_name, user_id
   * - Nested: items.0.item_id, address.city
   * - Array notation: items[0].name (converted to items.0.name)
   */
  private static parseFieldErrors(data: any): FieldError[] {
    const fieldErrors: FieldError[] = [];

    if (!data) return fieldErrors;

    // Handle NestJS ValidationPipe array format (default)
    // { message: ["email should not be empty", "first_name must be longer...", ...] }
    if (Array.isArray(data.message)) {
      data.message.forEach((errorMsg: string) => {
        // Match: "field_name error message here"
        // Supports:
        // - Simple: "email should not be empty"
        // - Underscore: "first_name must be longer"
        // - Nested: "items.0.item_id should not be empty" (if API returns full path)
        // Match field name at start (letters, numbers, underscores, dots)
        const match = errorMsg.match(/^([a-zA-Z_][a-zA-Z0-9_.]*)\s+(.+)$/);
        if (match) {
          fieldErrors.push({
            field: match[1],
            message: match[2],
          });
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

