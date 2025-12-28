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
  const { data: { session } } = await authSupabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No active session');
  }

  // Use provided organizationId from context, or fall back to Zustand store
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

  // Add organization ID header if available and valid (not "undefined" string)
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
  // If url is already a full URL, use it; otherwise prepend API_URL
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: response.statusText,
      error: 'Unknown error',
      statusCode: response.status
    }));
    throw new Error(error.message || error.error || 'API request failed');
  }

  return response.json();
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

