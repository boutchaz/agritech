import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      tokens: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setTokens: (tokens) => {
        // Calculate expiration time
        const expires_at = Date.now() + tokens.expires_in * 1000;
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

        // Check if token is expired
        if (tokens.expires_at && Date.now() >= tokens.expires_at) {
          return null;
        }

        return tokens.access_token;
      },

      isTokenExpired: () => {
        const { tokens } = get();
        if (!tokens?.expires_at) return true;
        return Date.now() >= tokens.expires_at;
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      onRehydrateStorage: () => (state) => {
        // IMPORTANT: Check if tokens are expired on hydration
        // This fixes the issue where users get stuck on onboarding with expired tokens
        if (state) {
          const isExpired = state.tokens?.expires_at
            ? Date.now() >= state.tokens.expires_at
            : true;

          if (isExpired && state.isAuthenticated) {
            // Clear expired auth state
            state.tokens = null;
            state.user = null;
            state.isAuthenticated = false;
          }
        }
        // Mark hydration as complete
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
