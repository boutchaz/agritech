import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
          const { tokens } = get();
          if (!tokens?.refresh_token) return false;

          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

          try {
            const response = await fetch(`${API_URL}/api/v1/auth/refresh-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken: tokens.refresh_token }),
            });

            if (!response.ok) {
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
      storage: authStorage,
      onRehydrateStorage: () => (state) => {
        if (state) {
          const isExpired = state.tokens?.expires_at
            ? Date.now() >= state.tokens.expires_at
            : false;

          if (isExpired && state.isAuthenticated) {
            if (!state.tokens?.refresh_token) {
              state.tokens = null;
              state.user = null;
              state.isAuthenticated = false;
            }
          }
        }
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
