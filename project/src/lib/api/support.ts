const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const PUBLIC_URL = '/api/v1/support';

export interface SupportInfo {
  email: string;
  phone: string;
  whatsapp: string | null;
  address: string | null;
  hours: string | null;
  contact_email: string;
  updated_at: string;
}

export const SUPPORT_FALLBACK: SupportInfo = {
  email: 'support@agrogina.com',
  phone: '+212 600 000 000',
  whatsapp: null,
  address: null,
  hours: null,
  contact_email: 'contact@agrogina.com',
  updated_at: new Date(0).toISOString(),
};

export const supportApi = {
  async get(): Promise<SupportInfo> {
    const res = await fetch(`${API_URL}${PUBLIC_URL}`);
    if (!res.ok) throw new Error('Failed to fetch support info');
    return res.json();
  },
};
