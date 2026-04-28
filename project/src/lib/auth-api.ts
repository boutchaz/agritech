import { useAuthStore } from '../stores/authStore';

// Empty default → relative URLs (Vite proxy in dev, same-origin in prod).
const API_URL = import.meta.env.VITE_API_URL ?? '';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

interface SignupResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  requiresLogin: boolean;
}

interface SignupData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  organizationName?: string;
  phone?: string;
  includeDemoData?: boolean;
  sellerType?: 'individual' | 'cooperative' | 'company';
  invitedToOrganization?: string;
  invitedWithRole?: string;
}

const isNetworkError = (err: unknown): boolean =>
  err instanceof TypeError &&
  (err.message.includes('Failed to fetch') ||
    err.message.includes('NetworkError') ||
    err.message.includes('Network request failed') ||
    err.message.includes('Load failed'));

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  // Send/receive httpOnly auth cookies (cookie-based auth)
  const optsWithCreds: RequestInit = { credentials: 'include', ...options };
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, optsWithCreds);
    } catch (err) {
      if (isNetworkError(err) && attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      if (isNetworkError(err)) {
        throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion et réessayez.');
      }
      throw err;
    }
  }
  throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion et réessayez.');
}

export async function loginViaApi(
  email: string,
  password: string,
  rememberMe: boolean = true
): Promise<LoginResponse> {
  const response = await fetchWithRetry(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email.toLowerCase(), password, rememberMe }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Invalid email or password');
  }

  const data: LoginResponse = await response.json();

  useAuthStore.getState().setRememberMe(rememberMe);

  useAuthStore.getState().setTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  });

  useAuthStore.getState().setUser({
    id: data.user.id,
    email: data.user.email,
  });

  return data;
}

export async function signupViaApi(signupData: SignupData): Promise<SignupResponse> {
  const response = await fetchWithRetry(`${API_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(signupData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Signup failed' }));
    throw new Error(error.message || 'Failed to create account');
  }

  return response.json();
}

export async function loginAfterSignup(email: string, password: string): Promise<void> {
  await loginViaApi(email, password);
}

export async function signInWithGoogle(): Promise<void> {
  const response = await fetchWithRetry(`${API_URL}/api/v1/auth/oauth/url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: 'google',
      redirectTo: `${window.location.origin}/auth/callback`,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Google sign-in failed' }));
    throw new Error(error.message || 'Google sign-in failed');
  }

  const data = (await response.json()) as { url?: string };

  if (!data.url) {
    throw new Error('Google sign-in URL is missing');
  }

  window.location.href = data.url;
}
