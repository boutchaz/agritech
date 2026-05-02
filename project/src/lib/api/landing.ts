const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const PUBLIC_URL = '/api/v1/landing';

export interface LandingHeroStat {
  value: string;
  label: string;
}
export interface LandingPartner {
  name: string;
}
export interface LandingTestimonial {
  quote: string;
  author: string;
  role: string;
  badge?: string;
}
export interface LandingTestimonials {
  featured: LandingTestimonial;
  compact: LandingTestimonial[];
}
export interface LandingSettings {
  hero_stats: LandingHeroStat[];
  partners: LandingPartner[];
  testimonials: LandingTestimonials;
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
  testimonials: {
    featured: {
      quote:
        "Avant Agrogina, je remplissais des cahiers le soir. Aujourd'hui, j'ai une vision complète de mes 240 hectares depuis mon téléphone — et mes équipes savent exactement quoi faire le matin.",
      author: 'Zakaria Boutchamir',
      role: 'Ferme Mabella · 240 ha · Marrakech-Safi',
      badge: '★★★★★ · Étude de cas',
    },
    compact: [
      {
        quote: 'Le module RH a remplacé Excel et trois cahiers. Le contrôleur de la CNSS adore.',
        author: 'Saida El Khouri',
        role: 'Coopérative Atlas · 12 fermes',
      },
      {
        quote:
          "Les alertes capteurs ont sauvé une parcelle d'agrumes du gel l'an dernier. Rentabilisé en une saison.",
        author: 'Karim Benjelloun',
        role: 'Domaine Agdal · 85 ha',
      },
    ],
  },
  updated_at: new Date(0).toISOString(),
};

export const landingApi = {
  async get(): Promise<LandingSettings> {
    const res = await fetch(`${API_URL}${PUBLIC_URL}`);
    if (!res.ok) throw new Error('Failed to fetch landing settings');
    return res.json();
  },
};
