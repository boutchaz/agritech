import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { DatabaseService } from '../database/database.service';
import { OrganizationEmailSettingsService } from '../organization-email-settings/organization-email-settings.service';
import { OrganizationWhatsAppSettingsService } from '../organization-whatsapp-settings/organization-whatsapp-settings.service';
import { ShareResourceDto } from './dto';
import {
  SHAREABLE_RESOLVERS,
  ShareableResolver,
  ShareableResource,
  ShareableResourceType,
} from './types';

@Injectable()
export class ShareService {
  private readonly logger = new Logger(ShareService.name);
  private readonly resolverByType: Map<ShareableResourceType, ShareableResolver>;

  constructor(
    @Inject(SHAREABLE_RESOLVERS)
    resolvers: ShareableResolver[],
    private readonly databaseService: DatabaseService,
    private readonly emailSettings: OrganizationEmailSettingsService,
    private readonly whatsappSettings: OrganizationWhatsAppSettingsService,
    private readonly config: ConfigService,
  ) {
    this.resolverByType = new Map(resolvers.map((r) => [r.type, r]));
  }

  listResolvers(): ShareableResourceType[] {
    return Array.from(this.resolverByType.keys());
  }

  async share(
    organizationId: string,
    userId: string | null,
    dto: ShareResourceDto,
  ): Promise<{ success: boolean; recipient: string; error?: string }> {
    const resolver = this.resolverByType.get(dto.resource_type);
    if (!resolver) {
      throw new BadRequestException(
        `Unsupported resource type: ${dto.resource_type}`,
      );
    }

    const resource = await resolver.resolve(dto.resource_id, organizationId);
    if (!resource) {
      throw new NotFoundException(
        `${dto.resource_type} ${dto.resource_id} not found`,
      );
    }

    const recipient =
      dto.recipient ??
      (dto.channel === 'email' ? resource.partyEmail : resource.partyPhone);
    if (!recipient) {
      throw new BadRequestException(
        `No ${dto.channel === 'email' ? 'email address' : 'phone number'} on the resource. Provide one explicitly.`,
      );
    }

    const subject = dto.subject ?? resolver.buildSubject(resource);
    const body = dto.message ?? resolver.buildBody(resource);

    const wantPdf = dto.attach_pdf ?? true;
    let pdf: { buffer: Buffer; filename: string } | null = null;
    if (wantPdf && resolver.getPdf) {
      try {
        pdf = await resolver.getPdf(resource);
      } catch (e: any) {
        this.logger.warn(
          `PDF generation failed for ${dto.resource_type} ${dto.resource_id}: ${e?.message}`,
        );
      }
    }

    let result: { success: boolean; error?: string };
    if (dto.channel === 'email') {
      result = await this.sendEmail(organizationId, recipient, subject, body, pdf);
    } else {
      result = await this.sendWhatsApp(organizationId, recipient, body, dto, pdf);
    }

    await this.logShare(
      organizationId,
      userId,
      resource,
      dto,
      recipient,
      subject,
      result,
    );

    return { recipient, ...result };
  }

  private async sendEmail(
    organizationId: string,
    to: string,
    subject: string,
    body: string,
    pdf: { buffer: Buffer; filename: string } | null,
  ): Promise<{ success: boolean; error?: string }> {
    const attachments = pdf
      ? [
          {
            filename: pdf.filename,
            content: pdf.buffer,
            contentType: 'application/pdf',
          },
        ]
      : undefined;

    try {
      const orgSmtp = await this.emailSettings.getTransporter(organizationId);
      if (orgSmtp) {
        const { transporter, settings } = orgSmtp;
        await transporter.sendMail({
          from: settings.from_name
            ? `"${settings.from_name}" <${settings.from_email}>`
            : settings.from_email,
          to,
          subject,
          text: body,
          html: this.bodyToHtml(body),
          replyTo: settings.reply_to ?? undefined,
          attachments,
        });
        return { success: true };
      }

      // Fallback to global SMTP env
      const host = this.config.get<string>('SMTP_HOST');
      const user = this.config.get<string>('SMTP_USER');
      const pass = this.config.get<string>('SMTP_PASS');
      if (!host || !user || !pass) {
        return {
          success: false,
          error:
            'No org SMTP configured and global SMTP env is missing. Configure email under Settings → Integrations.',
        };
      }
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.config.get<string>('SMTP_PORT') || '587', 10),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: { user, pass },
      });
      await transporter.sendMail({
        from:
          this.config.get<string>('EMAIL_FROM') || 'noreply@agritech.com',
        to,
        subject,
        text: body,
        html: this.bodyToHtml(body),
        attachments,
      });
      return { success: true };
    } catch (e: any) {
      const error = e?.message ?? 'Email send failed';
      this.logger.warn(`Email share failed to ${to}: ${error}`);
      return { success: false, error };
    }
  }

  private async sendWhatsApp(
    organizationId: string,
    to: string,
    body: string,
    dto: ShareResourceDto,
    pdf: { buffer: Buffer; filename: string } | null,
  ): Promise<{ success: boolean; error?: string }> {
    const settings = await this.whatsappSettings.getDecryptedSettings(
      organizationId,
    );
    if (!settings) {
      return {
        success: false,
        error:
          'WhatsApp is not configured. Configure it under Settings → Integrations.',
      };
    }

    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(settings.phone_number_id)}/messages`;
    const cleanTo = to.replace(/^\+/, '').replace(/\s+/g, '');

    let payload: Record<string, any>;
    if (dto.whatsapp_template) {
      const params = (dto.whatsapp_template_params ?? []).map((text) => ({
        type: 'text',
        text,
      }));
      payload = {
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'template',
        template: {
          name: dto.whatsapp_template,
          language: { code: dto.whatsapp_language ?? 'en_US' },
          ...(params.length
            ? { components: [{ type: 'body', parameters: params }] }
            : {}),
        },
      };
    } else if (pdf) {
      const upload = await this.uploadWhatsAppMedia(settings, pdf);
      if (upload.ok !== true) {
        return { success: false, error: upload.error };
      }
      payload = {
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'document',
        document: {
          id: upload.media_id,
          filename: pdf.filename,
          caption: body,
        },
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'text',
        text: { body },
      };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error =
          json?.error?.message ?? `Meta API ${res.status} ${res.statusText}`;
        this.logger.warn(`WhatsApp share failed to ${to}: ${error}`);
        return { success: false, error };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'Network error' };
    }
  }

  private async uploadWhatsAppMedia(
    settings: { phone_number_id: string; access_token: string },
    pdf: { buffer: Buffer; filename: string },
  ): Promise<
    { ok: true; media_id: string } | { ok: false; error: string }
  > {
    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(settings.phone_number_id)}/media`;

    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'application/pdf');
    form.append(
      'file',
      new Blob([new Uint8Array(pdf.buffer)], { type: 'application/pdf' }),
      pdf.filename,
    );

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.access_token}` },
        body: form,
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok || !json?.id) {
        return {
          ok: false,
          error:
            json?.error?.message ??
            `Meta media upload ${res.status} ${res.statusText}`,
        };
      }
      return { ok: true, media_id: json.id };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Network error' };
    }
  }

  private bodyToHtml(body: string): string {
    const escaped = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<div style="font-family:system-ui,Arial,sans-serif;line-height:1.5">${escaped.replace(/\n/g, '<br>')}</div>`;
  }

  private async logShare(
    organizationId: string,
    userId: string | null,
    resource: ShareableResource,
    dto: ShareResourceDto,
    recipient: string,
    subject: string,
    result: { success: boolean; error?: string },
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const { error } = await supabase.from('share_log').insert({
      organization_id: organizationId,
      resource_type: dto.resource_type,
      resource_id: resource.id,
      channel: dto.channel,
      recipient,
      subject,
      success: result.success,
      error_message: result.error ?? null,
      sent_by: userId,
      metadata: {
        document_number: resource.documentNumber,
        ...(dto.metadata ?? {}),
        ...(dto.whatsapp_template
          ? { whatsapp_template: dto.whatsapp_template }
          : {}),
      },
    });
    if (error) {
      this.logger.warn(`Failed to write share_log row: ${error.message}`);
    }
  }
}
