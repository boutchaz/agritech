const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const PUBLIC_URL = '/api/v1/landing';

export interface LandingHeroStat {
  value: string;
  label: string;
}
export interface LandingPartner {
  name: string;
}
export interface LandingSettings {
  hero_stats: LandingHeroStat[];
  partners: LandingPartner[];
  updated_at: string;
}

export const LANDING_FALLBACK: LandingSettings = {
  hero_stats: [
    { value: '12.4k', label: 'Exploitations actives' },
    { value: '847k ha', label: 'Surface monitorée' },
    { value: '14', label: 'Pays · MENA + EU' },
    { value: '99.94%', label: 'Disponibilité réseau' },
  ],
  partners: [
    { name: 'Coopérative Atlas' },
    { name: 'OCP Agri' },
    { name: 'GlobalGAP' },
    { name: 'BIO Maroc' },
    { name: 'AgriBank' },
    { name: 'Crédit Agricole' },
    { name: 'INRA' },
    { name: 'Domaine Royal' },
  ],
  updated_at: new Date(0).toISOString(),
};

export const landingApi = {
  async get(): Promise<LandingSettings> {
    const res = await fetch(`${API_URL}${PUBLIC_URL}`);
    if (!res.ok) throw new Error('Failed to fetch landing settings');
    return res.json();
  },
};
