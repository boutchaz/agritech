import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Get the current organization ID from localStorage
 */
function getCurrentOrganizationId(): string | null {
  try {
    const orgStr = localStorage.getItem('currentOrganization');
    if (orgStr) {
      const org = JSON.parse(orgStr);
      return org.id || null;
    }
    return null;
  } catch (error) {
    console.error('Error reading organization from localStorage:', error);
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

      return Promise.reject(new Error(message));
    }
  );

  return client;
}

// Export singleton instance
export const apiClient = createApiClient();

// Export types for convenience
export type { AxiosError, AxiosResponse } from 'axios';

