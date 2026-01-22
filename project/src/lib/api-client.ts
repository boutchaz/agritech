import { authSupabase } from './auth-supabase';
import { useOrganizationStore } from '../stores/organizationStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get the current organization ID from Zustand store
 */
function getCurrentOrganizationId(): string | null {
  try {
    const currentOrganization = useOrganizationStore.getState().currentOrganization;
    return currentOrganization?.id || null;
  } catch (error) {
    console.error('Error reading organization from store:', error);
    return null;
  }
}

/**
 * Get authentication headers with organization ID
 * @param organizationId - Optional organization ID from React context (preferred over localStorage)
 */
export async function getApiHeaders(organizationId?: string | null): Promise<HeadersInit> {
  const { data: { session }, error: sessionError } = await authSupabase.auth.getSession();

  if (sessionError) {
    console.error('[API Client] Error getting session:', sessionError);
    throw new Error(`Session error: ${sessionError.message}`);
  }

  if (!session?.access_token) {
    console.error('[API Client] No active session found');
    throw new Error('No active session');
  }

  const orgId = organizationId || getCurrentOrganizationId();

  console.log('[API Client] Building headers', {
    providedOrgId: organizationId,
    storeOrgId: getCurrentOrganizationId(),
    resolvedOrgId: orgId,
    hasSession: !!session,
    userId: session?.user?.id,
  });

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  };

  if (orgId && orgId !== 'undefined' && typeof orgId === 'string') {
    headers['X-Organization-Id'] = orgId;
    console.log('[API Client] Added X-Organization-Id header:', orgId);
  } else {
    console.warn('[API Client] No valid organization ID to add to headers', { orgId });
  }

  return headers;
}

/**
 * Make an authenticated API request with automatic organization ID header
 * In desktop mode, this will throw an error for API calls that should use local data
 * @param url - Full URL or relative path (if relative, will use API_URL)
 * @param options - Request options
 * @param organizationId - Optional organization ID from React context (preferred over localStorage)
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  organizationId?: string | null
): Promise<T> {
  const headers = await getApiHeaders(organizationId);
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let error;
    try {
      error = await response.json();
    } catch {
      if (response.status === 0 || response.status >= 500) {
        throw new Error('Connection error. The server may be unavailable. Please check your internet connection and try again.');
      } else if (response.status === 401) {
        throw new Error('Authentication failed. Please refresh the page and try again.');
      } else if (response.status === 403) {
        throw new Error('Access denied. You may not have permission to perform this action.');
      } else if (response.status === 404) {
        throw new Error('The requested resource was not found.');
      } else {
        error = {
          message: response.statusText || 'API request failed',
          error: 'Unknown error',
          statusCode: response.status
        };
      }
    }
    
    const errorMessage = error?.message || error?.error || 'API request failed';
    
    if (errorMessage.includes('Connection error') || response.status === 0) {
      throw new Error('Connection error. The server may be unavailable. Please check your internet connection and try again.');
    }
    
    throw new Error(errorMessage);
  }

  const contentLength = response.headers.get('content-length');
  const contentType = response.headers.get('content-type');
  
  if (response.status === 204 || contentLength === '0' || !contentType?.includes('application/json')) {
    return {} as T;
  }

  try {
    const text = await response.text();
    if (!text || text.trim() === '') {
      return {} as T;
    }
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

/**
 * API client class for making authenticated requests
 */
export class ApiClient {
  private baseUrl: string;
  private organizationId?: string | null;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set the organization ID for all requests from this client instance
   * Useful when you have the organization ID from React context
   */
  setOrganizationId(organizationId: string | null | undefined) {
    this.organizationId = organizationId;
  }

  /**
   * Make a GET request
   * @param organizationId - Optional organization ID from React context (overrides instance-level org ID)
   */
  async get<T>(endpoint: string, options: RequestInit = {}, organizationId?: string | null): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const orgId = organizationId !== undefined ? organizationId : this.organizationId;
    return apiRequest<T>(url, {
      ...options,
      method: 'GET',
    }, orgId);
  }

  /**
   * Make a POST request
   * @param organizationId - Optional organization ID from React context (overrides instance-level org ID)
   */
  async post<T>(endpoint: string, data?: unknown, options: RequestInit = {}, organizationId?: string | null): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const orgId = organizationId !== undefined ? organizationId : this.organizationId;
    return apiRequest<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, orgId);
  }

  /**
   * Make a PUT request
   * @param organizationId - Optional organization ID from React context (overrides instance-level org ID)
   */
  async put<T>(endpoint: string, data?: unknown, options: RequestInit = {}, organizationId?: string | null): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const orgId = organizationId !== undefined ? organizationId : this.organizationId;
    return apiRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, orgId);
  }

  /**
   * Make a PATCH request
   * @param organizationId - Optional organization ID from React context (overrides instance-level org ID)
   */
  async patch<T>(endpoint: string, data?: unknown, options: RequestInit = {}, organizationId?: string | null): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const orgId = organizationId !== undefined ? organizationId : this.organizationId;
    return apiRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }, orgId);
  }

  /**
   * Make a DELETE request
   * @param organizationId - Optional organization ID from React context (overrides instance-level org ID)
   */
  async delete<T>(endpoint: string, options: RequestInit = {}, organizationId?: string | null): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const orgId = organizationId !== undefined ? organizationId : this.organizationId;
    return apiRequest<T>(url, {
      ...options,
      method: 'DELETE',
    }, orgId);
  }
}

// Export a default instance
export const apiClient = new ApiClient();

