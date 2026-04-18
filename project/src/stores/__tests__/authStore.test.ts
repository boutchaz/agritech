import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageStore: Record<string, string> = {};
const testLocalStorage = {
  getItem: (key: string) => storageStore[key] ?? null,
  setItem: (key: string, value: string) => { storageStore[key] = String(value); },
  removeItem: (key: string) => { delete storageStore[key]; },
  clear: () => { for (const k of Object.keys(storageStore)) delete storageStore[k]; },
  get length() { return Object.keys(storageStore).length; },
  key: (index: number) => Object.keys(storageStore)[index] ?? null,
};
const testSessionStorage = {
  getItem: (key: string) => storageStore[key] ?? null,
  setItem: (key: string, value: string) => { storageStore[key] = String(value); },
  removeItem: (key: string) => { delete storageStore[key]; },
  clear: () => { for (const k of Object.keys(storageStore)) delete storageStore[k]; },
  get length() { return Object.keys(storageStore).length; },
  key: (index: number) => Object.keys(storageStore)[index] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', { value: testLocalStorage, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: testSessionStorage, configurable: true });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: testLocalStorage, configurable: true });
  Object.defineProperty(window, 'sessionStorage', { value: testSessionStorage, configurable: true });
}

const { getAccessToken, useAuthStore, waitForHydration } = await import('../authStore');

describe('authStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.setState({
      tokens: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
    });
  });

  describe('token and user state', () => {
    it('initializes with an unauthenticated state', () => {
      expect(useAuthStore.getState().tokens).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('sets tokens, calculates expires_at, and authenticates the user', () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000);

      useAuthStore.getState().setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 60,
      });

      expect(useAuthStore.getState().tokens).toEqual({
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 60,
        expires_at: 61_000,
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      nowSpy.mockRestore();
    });

    it('sets user data and clears all auth state', () => {
      useAuthStore.getState().setUser({ id: 'user-1', email: 'user@example.com' });
      expect(useAuthStore.getState().user).toEqual({ id: 'user-1', email: 'user@example.com' });

      useAuthStore.getState().setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 60,
      });
      useAuthStore.getState().clearAuth();

      expect(useAuthStore.getState().tokens).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('computed helpers', () => {
    it('returns the access token only when not expired', () => {
      useAuthStore.setState({
        tokens: {
          access_token: 'valid-token',
          refresh_token: 'refresh',
          expires_in: 60,
          expires_at: Date.now() + 5_000,
        },
      });

      expect(useAuthStore.getState().getAccessToken()).toBe('valid-token');
      expect(getAccessToken()).toBe('valid-token');
    });

    it('returns null and marks token expired when expiration has passed', () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(10_000);
      useAuthStore.setState({
        tokens: {
          access_token: 'expired-token',
          refresh_token: 'refresh',
          expires_in: 60,
          expires_at: 9_000,
        },
      });

      expect(useAuthStore.getState().getAccessToken()).toBeNull();
      expect(useAuthStore.getState().isTokenExpired()).toBe(true);

      nowSpy.mockRestore();
    });
  });

  describe('refreshAccessToken', () => {
    it('deduplicates concurrent refresh calls and updates tokens on success', async () => {
      useAuthStore.setState({
        tokens: {
          access_token: 'old-access',
          refresh_token: 'refresh-token',
          expires_in: 60,
          expires_at: Date.now() - 1,
        },
      });

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 120,
        }),
      } as Response);
      vi.stubGlobal('fetch', fetchMock);

      const [first, second] = await Promise.all([
        useAuthStore.getState().refreshAccessToken(),
        useAuthStore.getState().refreshAccessToken(),
      ]);

      expect(first).toBe(true);
      expect(second).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().tokens).toEqual(
        expect.objectContaining({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 120,
        }),
      );
    });

    it('returns false when there is no refresh token or when the response is not ok', async () => {
      expect(await useAuthStore.getState().refreshAccessToken()).toBe(false);

      useAuthStore.setState({
        tokens: {
          access_token: 'old-access',
          refresh_token: 'refresh-token',
          expires_in: 60,
        },
      });

      const fetchMock = vi.fn().mockResolvedValue({ ok: false } as Response);
      vi.stubGlobal('fetch', fetchMock);

      expect(await useAuthStore.getState().refreshAccessToken()).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('storage and hydration helpers', () => {
    it('switches storage mode when rememberMe changes', () => {
      localStorage.setItem('auth-storage', 'persisted-auth');

      useAuthStore.getState().setRememberMe(false);

      expect(localStorage.getItem('auth-storage-mode')).toBe('session');
      expect(localStorage.getItem('auth-storage')).toBeNull();

      sessionStorage.setItem('auth-storage', 'session-auth');
      useAuthStore.getState().setRememberMe(true);

      expect(localStorage.getItem('auth-storage-mode')).toBe('persistent');
      expect(sessionStorage.getItem('auth-storage')).toBeNull();
    });

    it('waits for hydration changes and resolves immediately when already hydrated', async () => {
      const pending = waitForHydration();
      useAuthStore.getState().setHasHydrated(true);
      await expect(pending).resolves.toBeUndefined();

      await expect(waitForHydration()).resolves.toBeUndefined();
    });
  });
});
