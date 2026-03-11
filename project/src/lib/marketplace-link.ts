import { apiClient } from './api-client';

const MARKETPLACE_URL = import.meta.env.VITE_MARKETPLACE_URL || 'https://marketplace.thebzlab.online';

export async function getMarketplaceUrl(path: string = '/'): Promise<string> {
  const baseUrl = MARKETPLACE_URL.replace(/\/$/, '');
  const url = new URL(path, baseUrl);

  try {
    const { code } = await apiClient.post<{ code: string }>('/api/v1/auth/exchange-code');
    url.searchParams.set('code', code);
  } catch (error) {
    console.error('Failed to generate exchange code:', error);
  }

  return url.toString();
}

export function getMarketplaceBaseUrl(): string {
  return MARKETPLACE_URL;
}
