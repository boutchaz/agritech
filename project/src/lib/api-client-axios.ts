import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken } from '@/stores/authStore';
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
   * Handles multiple formats in order of preference:
   * 1. Custom exception factory format (NEW - most reliable):
   *    { errors: [{ property: "field_name", constraints: {}, messages: [...] }] }
   * 2. Array format: { message: ["field constraint", ...] }
   * 3. Details format: { details: { field: message, ... } }
   *
   * This is a generic solution that works for ALL NestJS modules when using
   * the custom exceptionFactory format. No string matching required.
   */
  private static parseFieldErrors(data: any): FieldError[] {
    const fieldErrors: FieldError[] = [];

    if (!data) return fieldErrors;

    // PRIORITY 1: Custom exception factory format (most reliable)
    // { errors: [{ property: "field_name", constraints: {}, messages: [...] }] }
    if (Array.isArray(data.errors)) {
      data.errors.forEach((errorObj: any) => {
        const field = errorObj.property || errorObj.field;
        if (field) {
          // Use messages array if available, otherwise format from constraints
          const messages = errorObj.messages || (errorObj.constraints ? Object.values(errorObj.constraints) : []);
          const messageList = Array.isArray(messages) ? messages : [messages];

          messageList.forEach((msg: any) => {
            fieldErrors.push({
              field,
              message: typeof msg === 'string' ? msg : String(msg),
            });
          });

          // Handle nested children (for nested objects/arrays)
          if (errorObj.children && Array.isArray(errorObj.children)) {
            errorObj.children.forEach((child: any) => {
              const childField = child.property;
              if (childField) {
                const childMessages = child.messages || (child.constraints ? Object.values(child.constraints) : []);
                const childList = Array.isArray(childMessages) ? childMessages : [childMessages];
                childList.forEach((msg: any) => {
                  fieldErrors.push({
                    field: `${field}.${childField}`,
                    message: typeof msg === 'string' ? msg : String(msg),
                  });
                });
              }
            });
          }
        }
      });

      // Return early if we found the detailed errors format
      if (fieldErrors.length > 0) return fieldErrors;
    }

    // PRIORITY 2: Standard NestJS ValidationPipe array format
    // { message: ["email should not be empty", "first_name must be longer...", ...] }
    if (Array.isArray(data.message)) {
      data.message.forEach((errorMsg: string) => {
        const match = errorMsg.match(/^([a-zA-Z_][a-zA-Z0-9_.]*)\s+(.+)$/);
        if (match) {
          fieldErrors.push({
            field: match[1],
            message: match[2],
          });
        }
      });

      if (fieldErrors.length > 0) return fieldErrors;
    }

    // PRIORITY 3: Custom details format
    // { details: { email: "Email is required", ... } }
    if (data.details && typeof data.details === 'object') {
      Object.entries(data.details).forEach(([field, message]: [string, any]) => {
        const msg = typeof message === 'string' ? message : message?.message || String(message);
        fieldErrors.push({ field, message: msg });
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
      const accessToken = getAccessToken();

      if (!accessToken) {
        throw new Error('No active session');
      }

      config.headers.Authorization = `Bearer ${accessToken}`;

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

