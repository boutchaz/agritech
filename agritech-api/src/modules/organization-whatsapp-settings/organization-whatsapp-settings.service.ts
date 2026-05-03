import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EncryptionService } from '../../common/services/encryption.service';
import {
  UpsertWhatsAppSettingsDto,
  WhatsAppSettingsResponseDto,
} from './dto';

export interface DecryptedWhatsAppSettings {
  phone_number_id: string;
  access_token: string;
  business_account_id?: string | null;
  display_phone_number?: string | null;
  enabled: boolean;
}

const META_GRAPH_VERSION = 'v21.0';

@Injectable()
export class OrganizationWhatsAppSettingsService {
  private readonly logger = new Logger(OrganizationWhatsAppSettingsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async getSettings(
    organizationId: string,
  ): Promise<WhatsAppSettingsResponseDto> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('organization_whatsapp_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch WhatsApp settings: ${error.message}`);
      throw new BadRequestException('Failed to fetch WhatsApp settings');
    }

    if (!data) {
      return { configured: false, enabled: false };
    }

    let maskedToken: string | undefined;
    if (data.encrypted_access_token) {
      try {
        const decrypted = this.encryptionService.decrypt(
          data.encrypted_access_token,
        );
        maskedToken = this.encryptionService.maskApiKey(decrypted);
      } catch {
        maskedToken = '****';
      }
    }

    return {
      configured: true,
      enabled: data.enabled ?? true,
      phone_number_id: data.phone_number_id,
      masked_access_token: maskedToken,
      business_account_id: data.business_account_id ?? undefined,
      display_phone_number: data.display_phone_number ?? undefined,
      last_tested_at: data.last_tested_at ?? undefined,
      last_test_status: data.last_test_status ?? undefined,
      last_test_error: data.last_test_error ?? undefined,
      updated_at: data.updated_at,
    };
  }

  async upsertSettings(
    organizationId: string,
    dto: UpsertWhatsAppSettingsDto,
  ): Promise<WhatsAppSettingsResponseDto> {
    const supabase = this.databaseService.getAdminClient();
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('organization_whatsapp_settings')
      .select('id, encrypted_access_token')
      .eq('organization_id', organizationId)
      .maybeSingle();

    let encryptedToken: string | undefined;
    if (dto.access_token && dto.access_token.length > 0) {
      encryptedToken = this.encryptionService.encrypt(dto.access_token);
    } else if (existing?.encrypted_access_token) {
      encryptedToken = existing.encrypted_access_token;
    } else {
      throw new BadRequestException(
        'Access token is required for the initial configuration',
      );
    }

    const payload = {
      organization_id: organizationId,
      phone_number_id: dto.phone_number_id,
      encrypted_access_token: encryptedToken,
      business_account_id: dto.business_account_id ?? null,
      display_phone_number: dto.display_phone_number ?? null,
      enabled: dto.enabled ?? true,
      updated_at: now,
    };

    if (existing) {
      const { error } = await supabase
        .from('organization_whatsapp_settings')
        .update(payload)
        .eq('id', existing.id);

      if (error) {
        this.logger.error(
          `Failed to update WhatsApp settings: ${error.message}`,
        );
        throw new BadRequestException('Failed to update WhatsApp settings');
      }
    } else {
      const { error } = await supabase
        .from('organization_whatsapp_settings')
        .insert({ ...payload, created_at: now });

      if (error) {
        this.logger.error(
          `Failed to create WhatsApp settings: ${error.message}`,
        );
        throw new BadRequestException('Failed to create WhatsApp settings');
      }
    }

    this.logger.log(
      `WhatsApp settings upserted for organization ${organizationId}`,
    );
    return this.getSettings(organizationId);
  }

  async deleteSettings(organizationId: string): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    const { error } = await supabase
      .from('organization_whatsapp_settings')
      .delete()
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete WhatsApp settings: ${error.message}`);
      throw new BadRequestException('Failed to delete WhatsApp settings');
    }
  }

  async getDecryptedSettings(
    organizationId: string,
  ): Promise<DecryptedWhatsAppSettings | null> {
    const supabase = this.databaseService.getAdminClient();

    const { data } = await supabase
      .from('organization_whatsapp_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!data || !data.enabled || !data.encrypted_access_token) {
      return null;
    }

    try {
      const access_token = this.encryptionService.decrypt(
        data.encrypted_access_token,
      );
      return {
        phone_number_id: data.phone_number_id,
        access_token,
        business_account_id: data.business_account_id,
        display_phone_number: data.display_phone_number,
        enabled: data.enabled,
      };
    } catch {
      this.logger.error(
        `Failed to decrypt WhatsApp token for org ${organizationId}`,
      );
      return null;
    }
  }

  /**
   * Send a Meta Cloud API template message. Used by the test endpoint and by
   * the share-via-WhatsApp flow on invoices/quotes.
   */
  async sendTemplate(
    settings: DecryptedWhatsAppSettings,
    to: string,
    template: string,
    language: string,
  ): Promise<{ ok: true; message_id?: string } | { ok: false; error: string }> {
    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(
      settings.phone_number_id,
    )}/messages`;

    const body = {
      messaging_product: 'whatsapp',
      to: to.replace(/^\+/, ''),
      type: 'template',
      template: { name: template, language: { code: language } },
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const json: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        const error =
          json?.error?.message ??
          `Meta API ${res.status} ${res.statusText}`;
        return { ok: false, error };
      }

      return { ok: true, message_id: json?.messages?.[0]?.id };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Network error' };
    }
  }

  async sendTestMessage(
    organizationId: string,
    to: string,
    template = 'hello_world',
    language = 'en_US',
  ): Promise<{ success: boolean; error?: string }> {
    const settings = await this.getDecryptedSettings(organizationId);
    if (!settings) {
      throw new NotFoundException(
        'No WhatsApp settings configured (or settings disabled)',
      );
    }

    const now = new Date().toISOString();
    const supabase = this.databaseService.getAdminClient();
    const result = await this.sendTemplate(settings, to, template, language);

    if (result.ok) {
      await supabase
        .from('organization_whatsapp_settings')
        .update({
          last_tested_at: now,
          last_test_status: 'success',
          last_test_error: null,
        })
        .eq('organization_id', organizationId);
      return { success: true };
    }

    const errorMessage = (result as { ok: false; error: string }).error;
    await supabase
      .from('organization_whatsapp_settings')
      .update({
        last_tested_at: now,
        last_test_status: 'failed',
        last_test_error: errorMessage,
      })
      .eq('organization_id', organizationId);

    return { success: false, error: errorMessage };
  }
}
