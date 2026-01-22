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
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: AuthUser | null) => void;
  clearAuth: () => void;
  getAccessToken: () => string | null;
  isTokenExpired: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      tokens: null,
      user: null,
      isAuthenticated: false,

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
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
);
