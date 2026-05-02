import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateSupportSettingsDto } from './dto/update-support-settings.dto';

export interface SupportSettings {
  email: string;
  phone: string;
  whatsapp: string | null;
  address: string | null;
  hours: string | null;
  contact_email: string;
  updated_at: string;
}

@Injectable()
export class SupportService implements OnModuleInit {
  private readonly logger = new Logger(SupportService.name);
  private supabaseAdmin;

  constructor(private databaseService: DatabaseService) {}

  onModuleInit() {
    this.supabaseAdmin = this.databaseService.getAdminClient();
  }

  async get(): Promise<SupportSettings> {
    const { data, error } = await this.supabaseAdmin
      .from('support_settings')
      .select('email, phone, whatsapp, address, hours, contact_email, updated_at')
      .eq('id', true)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch support settings: ${error.message}`);
      throw error;
    }

    if (!data) {
      // Should not happen — seeded by migration. Return defaults defensively.
      return {
        email: 'support@agrogina.com',
        phone: '+212 600 000 000',
        whatsapp: null,
        address: null,
        hours: null,
        contact_email: 'contact@agrogina.com',
        updated_at: new Date().toISOString(),
      };
    }
    return data as SupportSettings;
  }

  async update(userId: string, dto: UpdateSupportSettingsDto): Promise<SupportSettings> {
    const { data, error } = await this.supabaseAdmin
      .from('support_settings')
      .update({ ...dto, updated_by: userId })
      .eq('id', true)
      .select('email, phone, whatsapp, address, hours, contact_email, updated_at')
      .single();

    if (error) {
      this.logger.error(`Failed to update support settings: ${error.message}`);
      throw error;
    }
    return data as SupportSettings;
  }
}
