import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { DatabaseService } from '../database/database.service';
import { EncryptionService } from '../../common/services/encryption.service';
import {
  EmailSettingsResponseDto,
  UpsertEmailSettingsDto,
} from './dto';

export interface DecryptedEmailSettings {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_email: string;
  from_name?: string | null;
  reply_to?: string | null;
  enabled: boolean;
}

@Injectable()
export class OrganizationEmailSettingsService {
  private readonly logger = new Logger(OrganizationEmailSettingsService.name);
  private readonly transporterCache = new Map<string, nodemailer.Transporter>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async getSettings(organizationId: string): Promise<EmailSettingsResponseDto> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('organization_email_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch email settings: ${error.message}`);
      throw new BadRequestException('Failed to fetch email settings');
    }

    if (!data) {
      return { configured: false, enabled: false };
    }

    let maskedPassword: string | undefined;
    if (data.encrypted_password) {
      try {
        const decrypted = this.encryptionService.decrypt(data.encrypted_password);
        maskedPassword = this.encryptionService.maskApiKey(decrypted);
      } catch {
        maskedPassword = '****';
      }
    }

    return {
      configured: true,
      enabled: data.enabled ?? true,
      host: data.host,
      port: data.port,
      secure: data.secure,
      username: data.username,
      masked_password: maskedPassword,
      from_email: data.from_email,
      from_name: data.from_name ?? undefined,
      reply_to: data.reply_to ?? undefined,
      last_tested_at: data.last_tested_at ?? undefined,
      last_test_status: data.last_test_status ?? undefined,
      last_test_error: data.last_test_error ?? undefined,
      updated_at: data.updated_at,
    };
  }

  async upsertSettings(
    organizationId: string,
    dto: UpsertEmailSettingsDto,
  ): Promise<EmailSettingsResponseDto> {
    const supabase = this.databaseService.getAdminClient();
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('organization_email_settings')
      .select('id, encrypted_password')
      .eq('organization_id', organizationId)
      .maybeSingle();

    let encryptedPassword: string | undefined;
    if (dto.password && dto.password.length > 0) {
      encryptedPassword = this.encryptionService.encrypt(dto.password);
    } else if (existing?.encrypted_password) {
      encryptedPassword = existing.encrypted_password;
    } else {
      throw new BadRequestException(
        'Password is required for the initial configuration',
      );
    }

    const payload = {
      organization_id: organizationId,
      host: dto.host,
      port: dto.port,
      secure: dto.secure,
      username: dto.username,
      encrypted_password: encryptedPassword,
      from_email: dto.from_email,
      from_name: dto.from_name ?? null,
      reply_to: dto.reply_to ?? null,
      enabled: dto.enabled ?? true,
      updated_at: now,
    };

    if (existing) {
      const { error } = await supabase
        .from('organization_email_settings')
        .update(payload)
        .eq('id', existing.id);

      if (error) {
        this.logger.error(`Failed to update email settings: ${error.message}`);
        throw new BadRequestException('Failed to update email settings');
      }
    } else {
      const { error } = await supabase
        .from('organization_email_settings')
        .insert({ ...payload, created_at: now });

      if (error) {
        this.logger.error(`Failed to create email settings: ${error.message}`);
        throw new BadRequestException('Failed to create email settings');
      }
    }

    this.transporterCache.delete(organizationId);
    this.logger.log(`Email settings upserted for organization ${organizationId}`);
    return this.getSettings(organizationId);
  }

  async deleteSettings(organizationId: string): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    const { error } = await supabase
      .from('organization_email_settings')
      .delete()
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete email settings: ${error.message}`);
      throw new BadRequestException('Failed to delete email settings');
    }

    this.transporterCache.delete(organizationId);
  }

  /**
   * Returns decrypted SMTP settings for the org if configured AND enabled, else null.
   */
  async getDecryptedSettings(
    organizationId: string,
  ): Promise<DecryptedEmailSettings | null> {
    const supabase = this.databaseService.getAdminClient();

    const { data } = await supabase
      .from('organization_email_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!data || !data.enabled || !data.encrypted_password) {
      return null;
    }

    try {
      const password = this.encryptionService.decrypt(data.encrypted_password);
      return {
        host: data.host,
        port: data.port,
        secure: data.secure,
        username: data.username,
        password,
        from_email: data.from_email,
        from_name: data.from_name,
        reply_to: data.reply_to,
        enabled: data.enabled,
      };
    } catch (e) {
      this.logger.error(
        `Failed to decrypt SMTP password for org ${organizationId}`,
      );
      return null;
    }
  }

  /**
   * Build a nodemailer transporter for the given org. Returns null when no
   * per-org SMTP is configured/enabled — caller should fall back to global SMTP.
   * Transporters are cached per org and invalidated on update/delete.
   */
  async getTransporter(
    organizationId: string,
  ): Promise<{ transporter: nodemailer.Transporter; settings: DecryptedEmailSettings } | null> {
    const settings = await this.getDecryptedSettings(organizationId);
    if (!settings) return null;

    const cached = this.transporterCache.get(organizationId);
    if (cached) {
      return { transporter: cached, settings };
    }

    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: { user: settings.username, pass: settings.password },
    });

    this.transporterCache.set(organizationId, transporter);
    return { transporter, settings };
  }

  /**
   * Verify the saved SMTP credentials and send a test email. Records the result
   * on the row (last_tested_at, last_test_status, last_test_error).
   */
  async sendTestEmail(
    organizationId: string,
    to: string,
  ): Promise<{ success: boolean; error?: string }> {
    const settings = await this.getDecryptedSettings(organizationId);
    if (!settings) {
      throw new NotFoundException(
        'No SMTP settings configured (or settings disabled)',
      );
    }

    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: { user: settings.username, pass: settings.password },
    });

    const now = new Date().toISOString();
    const supabase = this.databaseService.getAdminClient();

    try {
      await transporter.verify();
      await transporter.sendMail({
        from: settings.from_name
          ? `"${settings.from_name}" <${settings.from_email}>`
          : settings.from_email,
        to,
        subject: 'AgroGina — SMTP test',
        text: 'This is a test email from your AgroGina SMTP configuration.',
        html:
          '<p>This is a test email from your <strong>AgroGina</strong> SMTP configuration.</p>',
        replyTo: settings.reply_to ?? undefined,
      });

      await supabase
        .from('organization_email_settings')
        .update({
          last_tested_at: now,
          last_test_status: 'success',
          last_test_error: null,
        })
        .eq('organization_id', organizationId);

      this.transporterCache.delete(organizationId);
      return { success: true };
    } catch (e: any) {
      const message = e?.message ?? 'Unknown SMTP error';
      await supabase
        .from('organization_email_settings')
        .update({
          last_tested_at: now,
          last_test_status: 'failed',
          last_test_error: message,
        })
        .eq('organization_id', organizationId);

      return { success: false, error: message };
    }
  }
}
