import { useOrganizationStore } from "../stores/organizationStore";
import { useAuthStore } from "../stores/authStore";
import { ErrorHandlers } from "./errors";

// Empty default → relative URLs (use Vite proxy in dev, same-origin in prod).
// Set VITE_API_URL only when API is on a different domain in production.
const API_URL = import.meta.env.VITE_API_URL ?? "";

// Flag to prevent multiple redirects to login
let isRedirectingToLogin = false;

function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError &&
    (err.message.includes("Failed to fetch") ||
      err.message.includes("NetworkError") ||
      err.message.includes("Network request failed") ||
      err.message.includes("Load failed") ||
      err.message.includes("fetch"))
  );
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 1,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (isNetworkError(err) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
      if (isNetworkError(err)) {
        throw new Error(
          "Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.",
        );
      }
      throw err;
    }
  }
  throw new Error(
    "Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.",
  );
}

/**
 * Handle session expiration by clearing auth state and redirecting to login
 */
function handleSessionExpired(): void {
  if (isRedirectingToLogin) {
    return;
  }

  isRedirectingToLogin = true;

  setTimeout(() => {
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      const redirectPath = window.location.pathname + window.location.search;
      window.location.href = `/login?redirect=${encodeURIComponent(redirectPath)}`;
    }
  }, 300);
}

// Device Analytics Headers
interface DeviceInfo {
  deviceType: "web" | "desktop";
  deviceOs: string;
  appVersion: string;
  deviceId: string;
}

function getDeviceInfo(): DeviceInfo {
  // Check if running in Tauri desktop app
  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

  const deviceType = isTauri ? "desktop" : "web";

  // Get or generate device ID
  let deviceId = localStorage.getItem("agritech_device_id");
  if (!deviceId) {
    deviceId = `${deviceType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem("agritech_device_id", deviceId);
  }

  // Detect OS
  let deviceOs = "unknown";
  if (typeof navigator !== "undefined") {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Windows")) deviceOs = "windows";
    else if (userAgent.includes("Mac")) deviceOs = "macos";
    else if (userAgent.includes("Linux")) deviceOs = "linux";
    else if (userAgent.includes("Android")) deviceOs = "android";
    else if (
      userAgent.includes("iOS") ||
      userAgent.includes("iPhone") ||
      userAgent.includes("iPad")
    )
      deviceOs = "ios";
    else deviceOs = "web";
  }

  // Get app version from package.json or build info
  const appVersion = import.meta.env.VITE_APP_VERSION || "1.0.0";

  return {
    deviceType,
    deviceOs: isTauri ? `tauri-${deviceOs}` : deviceOs,
    appVersion,
    deviceId,
  };
}

function getAnalyticsHeaders(): Record<string, string> {
  const deviceInfo = getDeviceInfo();
  return {
    "X-Device-Type": deviceInfo.deviceType,
    "X-Device-OS": deviceInfo.deviceOs,
    "X-App-Version": deviceInfo.appVersion,
    "X-Device-Id": deviceInfo.deviceId,
  };
}

/**
 * Get the current organization ID from Zustand store
 */
function getCurrentOrganizationId(): string | null {
  try {
    const currentOrganization =
      useOrganizationStore.getState().currentOrganization;
    return currentOrganization?.id || null;
  } catch (error) {
    ErrorHandlers.log(error, "Error reading organization from store");
    return null;
  }
}

/**
 * Get authentication headers with organization ID
 * @param organizationId - Optional organization ID from React context (preferred over localStorage)
 */
export async function getApiHeaders(
  organizationId?: string | null,
): Promise<HeadersInit> {
  // Tokens live in memory only — see authStore.ts security note. On reload
  // the in-memory token is null but the httpOnly refresh cookie still exists,
  // so refresh-then-fetch repopulates the token. We attempt refresh when the
  // token is missing OR expired; failure means the cookie is gone too and
  // the user must log in again.
  const needsRefresh =
    useAuthStore.getState().isTokenExpired() ||
    !useAuthStore.getState().getAccessToken();

  if (needsRefresh) {
    const refreshed = await useAuthStore.getState().refreshAccessToken();
    if (!refreshed) {
      // Note: a 401 here is not always fatal — for some endpoints the cookie
      // alone is enough. But if refresh failed, the cookie itself is invalid,
      // so surfacing session-expired is the right move.
      ErrorHandlers.log(null, "[API Client] Token refresh failed; cookie stale");
      handleSessionExpired();
      throw new Error("Session expired. Please log in again.");
    }
  }

  const accessToken = useAuthStore.getState().getAccessToken();
  const orgId = organizationId || getCurrentOrganizationId();
  const analyticsHeaders = getAnalyticsHeaders();

  const headers: HeadersInit = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    ...analyticsHeaders,
  };

  // Send the Bearer header when we have an in-memory token. The backend also
  // accepts the `agg_access` httpOnly cookie (see jwt.strategy.ts), so the
  // header is belt-and-braces — calls succeed via cookie even if absent.
  if (accessToken) {
    (headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
  }

  if (orgId && orgId !== "undefined" && typeof orgId === "string") {
    (headers as Record<string, string>)["X-Organization-Id"] = orgId;
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
  organizationId?: string | null,
  retryOnUnauthorized: boolean = true,
): Promise<T> {
  const headers = await getApiHeaders(organizationId);
  const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;

  const response = await fetchWithRetry(fullUrl, {
    ...options,
    // Send httpOnly auth cookies on every request (cookie-based auth)
    credentials: 'include',
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Try to parse JSON error body (may fail for non-JSON responses)
    let error: Record<string, unknown> | undefined;
    try {
      error = await response.json();
    } catch {
      // Not a JSON response — use status text
      error = {
        message: response.statusText || "API request failed",
        statusCode: response.status,
      };
    }

    // Handle 401 — attempt token refresh before giving up
    if (response.status === 401) {
      if (retryOnUnauthorized) {
        const refreshed = await useAuthStore.getState().refreshAccessToken();
        if (refreshed) {
          return apiRequest<T>(url, options, organizationId, false);
        }
      }
      handleSessionExpired();
      throw new Error("Session expired. Please log in again.");
    }

    if (response.status === 0 || response.status >= 500) {
      throw new Error(
        "Connection error. The server may be unavailable. Please check your internet connection and try again.",
      );
    }

    if (response.status === 403) {
      throw new Error(
        "Access denied. You may not have permission to perform this action.",
      );
    }

    if (response.status === 404) {
      // FastAPI returns { detail: string } for plain HTTPException, or
      // { detail: { code, message, ... } } when the handler raises a structured payload.
      const detail = error?.detail as
        | string
        | { code?: string; message?: string; [k: string]: unknown }
        | undefined;
      const detailObj =
        detail && typeof detail === "object" ? detail : undefined;
      const detailMsg =
        typeof detail === "string"
          ? detail
          : (detailObj?.message as string | undefined);
      const msg =
        detailMsg ||
        (error?.message as string) ||
        (error?.error as string);
      const err404 = new Error(msg || "The requested resource was not found.");
      // Attach structured detail so callers can branch on `err.detail.code`
      if (detailObj) {
        (err404 as Error & { detail?: typeof detailObj }).detail = detailObj;
      }
      throw err404;
    }

    const errorMessage =
      (error?.message as string) || (error?.error as string) || "API request failed";

    if (errorMessage.includes("Connection error") || response.status === 0) {
      throw new Error(
        "Connection error. The server may be unavailable. Please check your internet connection and try again.",
      );
    }

    const lowerErrorMessage = errorMessage.toLowerCase();
    const shouldAddOrganizationHint =
      response.status === 404 &&
      lowerErrorMessage.includes("not found") &&
      (lowerErrorMessage.includes("organization") ||
        lowerErrorMessage.includes("in this organization"));

    if (shouldAddOrganizationHint) {
      const orgId = organizationId || getCurrentOrganizationId();
      const orgName = useOrganizationStore.getState().currentOrganization?.name;
      ErrorHandlers.log(
        { url: fullUrl, status: 404, orgId, orgName, error },
        `[API 404] ${errorMessage} - Check if resource belongs to current organization`,
      );
      throw new Error(
        `${errorMessage}. Make sure you have the correct organization selected (current: ${orgName || "none"}).`,
      );
    }

    throw new Error(errorMessage);
  }

  const contentLength = response.headers.get("content-length");
  const contentType = response.headers.get("content-type");

  if (
    response.status === 204 ||
    contentLength === "0" ||
    !contentType?.includes("application/json")
  ) {
    return {} as T;
  }

  try {
    const text = await response.text();
    if (!text || text.trim() === "") {
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
  async get<T>(
    endpoint: string,
    options: RequestInit = {},
    organizationId?: string | null,
  ): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;
    const orgId =
      organizationId !== undefined ? organizationId : this.organizationId;
    return apiRequest<T>(
      url,
      {
        ...options,
        method: "GET",
      },
      orgId,
    );
  }

  /**
   * Make a POST request
   * @param organizationId - Optional organization ID from React context (overrides instance-level org ID)
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    options: RequestInit = {},
    organizationId?: string | null,
  ): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;
    const orgId =
      organizationId !== undefined ? organizationId : this.organizationId;
    return apiRequest<T>(
      url,
      {
        ...options,
        method: "POST",
        headers: { "Content-Type": "application/json", ...options.headers },
        body: data ? JSON.stringify(data) : undefined,
      },
      orgId,
    );
  }

  /**
   * Make a PUT request
   * @param organizationId - Optional organization ID from React context (overrides instance-level org ID)
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    options: RequestInit = {},
    organizationId?: string | null,
  ): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;
    const orgId =
      organizationId !== undefined ? organizationId : this.organizationId;
    return apiRequest<T>(
      url,
      {
        ...options,
        method: "PUT",
        headers: { "Content-Type": "application/json", ...options.headers },
        body: data ? JSON.stringify(data) : undefined,
      },
      orgId,
    );
  }

  /**
   * Make a PATCH request
   * @param organizationId - Optional organization ID from React context (overrides instance-level org ID)
   */
  async patch<T>(
    endpoint: string,
    data?: unknown,
    options: RequestInit = {},
    organizationId?: string | null,
  ): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;
    const orgId =
      organizationId !== undefined ? organizationId : this.organizationId;
    return apiRequest<T>(
      url,
      {
        ...options,
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...options.headers },
        body: data ? JSON.stringify(data) : undefined,
      },
      orgId,
    );
  }

  /**
   * Make a DELETE request
   * @param organizationId - Optional organization ID from React context (overrides instance-level org ID)
   */
  async delete<T>(
    endpoint: string,
    options: RequestInit = {},
    organizationId?: string | null,
  ): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;
    const orgId =
      organizationId !== undefined ? organizationId : this.organizationId;
    return apiRequest<T>(
      url,
      {
        ...options,
        method: "DELETE",
      },
      orgId,
    );
  }
}

// Export a default instance
export const apiClient = new ApiClient();
