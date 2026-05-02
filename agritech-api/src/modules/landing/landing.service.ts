import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateLandingSettingsDto } from './dto/update-landing-settings.dto';

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

const FALLBACK: LandingSettings = {
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

@Injectable()
export class LandingService implements OnModuleInit {
  private readonly logger = new Logger(LandingService.name);
  private supabaseAdmin;

  constructor(private databaseService: DatabaseService) {}

  onModuleInit() {
    this.supabaseAdmin = this.databaseService.getAdminClient();
  }

  async get(): Promise<LandingSettings> {
    const { data, error } = await this.supabaseAdmin
      .from('landing_settings')
      .select('hero_stats, partners, testimonials, updated_at')
      .eq('id', true)
      .maybeSingle();
    if (error) {
      this.logger.error(`Failed to fetch landing settings: ${error.message}`);
      throw error;
    }
    return (data as LandingSettings) ?? FALLBACK;
  }

  async update(userId: string, dto: UpdateLandingSettingsDto): Promise<LandingSettings> {
    const payload: Record<string, unknown> = { updated_by: userId };
    if (dto.hero_stats !== undefined) payload.hero_stats = dto.hero_stats;
    if (dto.testimonials !== undefined) payload.testimonials = dto.testimonials;
    if (dto.partners !== undefined) payload.partners = dto.partners;

    const { data, error } = await this.supabaseAdmin
      .from('landing_settings')
      .update(payload)
      .eq('id', true)
      .select('hero_stats, partners, testimonials, updated_at')
      .single();
    if (error) {
      this.logger.error(`Failed to update landing settings: ${error.message}`);
      throw error;
    }
    return data as LandingSettings;
  }
}
