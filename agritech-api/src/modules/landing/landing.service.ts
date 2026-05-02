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
export interface LandingSettings {
  hero_stats: LandingHeroStat[];
  partners: LandingPartner[];
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
      .select('hero_stats, partners, updated_at')
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
    if (dto.partners !== undefined) payload.partners = dto.partners;

    const { data, error } = await this.supabaseAdmin
      .from('landing_settings')
      .update(payload)
      .eq('id', true)
      .select('hero_stats, partners, updated_at')
      .single();
    if (error) {
      this.logger.error(`Failed to update landing settings: ${error.message}`);
      throw error;
    }
    return data as LandingSettings;
  }
}
