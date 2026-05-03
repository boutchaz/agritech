import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// IMPORTANT — security model
// =============================
// Access + refresh tokens are NEVER persisted to localStorage / sessionStorage.
// Durable auth lives in the backend's httpOnly cookies (`agg_access` /
// `agg_refresh`, set by /auth/login + /auth/refresh-token). The store keeps
// tokens in memory only for the current page lifetime so XSS payloads can't
// scrape them out of storage to replay later or exfiltrate.
//
// On reload the in-memory tokens are gone; the app calls /auth/refresh-token
// (which reads the refresh cookie via `credentials: 'include'`) to repopulate
// the in-memory access token. If that call 401s, the cookie is stale → user
// must re-authenticate.
//
// `user` is persisted (non-sensitive) so the UI can paint a logged-in shell
// while the refresh round-trip is in flight. Backend /auth/me is the source
// of truth — never trust persisted user fields for authorization decisions.

const AUTH_STORAGE_KEY = 'auth-storage';
const AUTH_STORAGE_MODE_KEY = 'auth-storage-mode';

type AuthStorageMode = 'persistent' | 'session';

const getAuthStorageMode = (): AuthStorageMode => {
  if (typeof window === 'undefined') return 'persistent';
  const mode = window.localStorage.getItem(AUTH_STORAGE_MODE_KEY);
  return mode === 'session' ? 'session' : 'persistent';
};

const getAuthStorage = () => {
  if (typeof window === 'undefined') return undefined;
  return getAuthStorageMode() === 'session' ? window.sessionStorage : window.localStorage;
};

const authStorage = {
  getItem: (name: string) => {
    const storage = getAuthStorage();
    const value = storage?.getItem(name) ?? null;
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },
  setItem: (name: string, value: string) => {
    const storage = getAuthStorage();
    // Ensure value is properly stringified
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    storage?.setItem(name, stringValue);
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
    window.sessionStorage.removeItem(name);
  },
};

const setAuthStorageMode = (rememberMe: boolean) => {
  if (typeof window === 'undefined') return;
  const mode: AuthStorageMode = rememberMe ? 'persistent' : 'session';
  window.localStorage.setItem(AUTH_STORAGE_MODE_KEY, mode);
  if (mode === 'persistent') {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
}

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  tokens: AuthTokens | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: AuthUser | null) => void;
  clearAuth: () => void;
  getAccessToken: () => string | null;
  isTokenExpired: () => boolean;
  refreshAccessToken: () => Promise<boolean>;
  setRememberMe: (rememberMe: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

// Mutex for token refresh — prevents concurrent refresh calls
let _refreshPromise: Promise<boolean> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      tokens: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setTokens: (tokens) => {
        // Calculate expiration time when provided
        const expires_at = tokens.expires_in
          ? Date.now() + tokens.expires_in * 1000
          : undefined;
        set({
          tokens: { ...tokens, expires_at },
          isAuthenticated: true,
        });
      },

      setUser: (user) => set({ user }),

      clearAuth: () => set({
        tokens: null,
        user: null,
        isAuthenticated: false,
      }),

      getAccessToken: () => {
        const { tokens } = get();
        if (!tokens) return null;

        // Check if token is expired when we have an expiry
        if (tokens.expires_at && Date.now() >= tokens.expires_at) {
          return null;
        }

        return tokens.access_token;
      },

      isTokenExpired: () => {
        const { tokens } = get();
        if (!tokens?.expires_at) return false;
        return Date.now() >= tokens.expires_at;
      },

      refreshAccessToken: async () => {
        // Deduplicate concurrent refresh calls — return the same promise
        if (_refreshPromise) return _refreshPromise;

        _refreshPromise = (async () => {
          // Refresh always attempts the call: the refresh_token lives in an
          // httpOnly cookie (`agg_refresh`) and is read server-side. The
          // in-memory refresh_token (if any) is sent in the body purely as a
          // legacy fallback for transitional clients.
          const { tokens } = get();
          const API_URL = import.meta.env.VITE_API_URL ?? '';

          try {
            const response = await fetch(`${API_URL}/api/v1/auth/refresh-token`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(
                tokens?.refresh_token ? { refreshToken: tokens.refresh_token } : {},
              ),
            });

            if (!response.ok) {
              // Cookie is gone or revoked — caller will surface session-expired UX.
              return false;
            }

            const data: AuthTokens = await response.json();
            get().setTokens({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              expires_in: data.expires_in,
            });
            return true;
          } catch {
            return false;
          }
        })();

        try {
          return await _refreshPromise;
        } finally {
          _refreshPromise = null;
        }
      },

      setRememberMe: (rememberMe: boolean) => {
        setAuthStorageMode(rememberMe);
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: AUTH_STORAGE_KEY, // localStorage/sessionStorage key
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      storage: authStorage as any,
      // Persist user + isAuthenticated only. Tokens NEVER touch storage —
      // see security model note at top of file. The httpOnly auth cookies
      // hold the durable session; tokens here are an in-memory cache for
      // the lifetime of the page only.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }) as unknown as AuthState,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.tokens = null;
        }
        // Force a storage rewrite so any stale `tokens` blob persisted by a
        // previous build is evicted immediately, not "eventually" on the next
        // state change. We defer to a microtask so the persist middleware has
        // finished installing — calling setState during rehydrate is a no-op.
        queueMicrotask(() => {
          try {
            // Trigger a write through the partialize → only user +
            // isAuthenticated land in storage; stale `tokens` is dropped.
            useAuthStore.setState({ tokens: null });
          } catch {
            // ignore — store may not be ready in edge cases
          }
        });
        state?.setHasHydrated(true);
      },
    }
  )
);

// Helper to get access token outside of React components
export const getAccessToken = () => useAuthStore.getState().getAccessToken();

// Helper to wait for hydration (useful for init functions)
export const waitForHydration = (timeout: number = 2000): Promise<void> => {
  return new Promise((resolve) => {
    if (useAuthStore.getState()._hasHydrated) {
      resolve();
      return;
    }

    let resolved = false;
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state._hasHydrated) {
        resolved = true;
        unsubscribe();
        resolve();
      }
    });

    // Add timeout to prevent hanging forever
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        // Force hydration to true even if persist hasn't finished
        useAuthStore.getState().setHasHydrated(true);
        console.warn('[waitForHydration] Timed out, forcing hydration');
        resolve();
      }
    }, timeout);
  });
};
