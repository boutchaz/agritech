import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MARKETPLACE_URL = import.meta.env.VITE_MARKETPLACE_URL || 'https://marketplace.thebzlab.online';

export async function getMarketplaceUrl(path: string = '/'): Promise<string> {
  const baseUrl = MARKETPLACE_URL.replace(/\/$/, '');
  const url = new URL(path, baseUrl);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const response = await fetch(`${API_URL}/api/v1/auth/exchange-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const { code } = await response.json();
        url.searchParams.set('code', code);
      }
    }
  } catch (error) {
    console.error('Failed to generate exchange code:', error);
  }

  return url.toString();
}

export function getMarketplaceBaseUrl(): string {
  return MARKETPLACE_URL;
}
