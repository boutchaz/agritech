import { authSupabase } from './auth-supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

export async function loginViaApi(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Invalid email or password');
  }

  const data: LoginResponse = await response.json();

  await authSupabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });

  return data;
}

export async function signupViaApi(signupData: SignupData): Promise<SignupResponse> {
  const response = await fetch(`${API_URL}/api/v1/auth/signup`, {
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
