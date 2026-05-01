import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { CreateSiamRdvDto } from './dto/create-siam-rdv.dto';

@Injectable()
export class PublicRdvService implements OnModuleInit {
  private readonly logger = new Logger(PublicRdvService.name);
  private supabaseAdmin: ReturnType<DatabaseService['getAdminClient']> | null = null;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  onModuleInit() {
    try {
      this.supabaseAdmin = this.databaseService.getAdminClient();
    } catch {
      this.logger.warn('Admin client unavailable — RDV leads will not be persisted to DB (missing SUPABASE_SERVICE_ROLE_KEY)');
      this.supabaseAdmin = null;
    }
  }

  private getRecipients(): string[] {
    const configured = this.configService.get<string>('SIAM_RDV_RECIPIENTS')
      || this.configService.get<string>('CONTACT_EMAIL')
      || 'contact@agrogina.com';

    return configured
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }

  async createSiamRdv(dto: CreateSiamRdvDto, sourceIp?: string): Promise<{ success: boolean }> {
    const cultures = [...(dto.culture || []), ...(dto.culture_autre ? [dto.culture_autre] : [])];

    // Persist lead first — even if email fails, we keep the data
    let insertedId: string | null = null;
    if (this.supabaseAdmin) {
      const { data: inserted, error: dbError } = await this.supabaseAdmin
        .from('siam_rdv_leads')
        .insert({
          nom: dto.nom,
          entreprise: dto.entreprise || null,
          tel: dto.tel,
          email: dto.email || null,
          surface: dto.surface || null,
          region: dto.region || null,
          cultures: cultures.length ? cultures : null,
          creneau: dto.creneau,
          source: dto.source || null,
          source_ip: sourceIp || null,
          email_sent: false,
        })
        .select('id')
        .single();

      if (dbError) {
        this.logger.error(`Failed to persist SIAM RDV lead: ${dbError.message}`);
      } else {
        insertedId = inserted.id;
      }
    }

    // Send notification emails
    const recipients = this.getRecipients();
    const subject = `Nouvelle demande RDV SIAM — ${dto.nom}`;

    const html = `
      <h2>Nouvelle demande de rendez-vous SIAM</h2>
      <p><strong>Nom:</strong> ${dto.nom}</p>
      <p><strong>Entreprise:</strong> ${dto.entreprise || '-'}</p>
      <p><strong>Téléphone:</strong> ${dto.tel}</p>
      <p><strong>Email:</strong> ${dto.email || '-'}</p>
      <p><strong>Surface:</strong> ${dto.surface || '-'}</p>
      <p><strong>Région:</strong> ${dto.region || '-'}</p>
      <p><strong>Cultures:</strong> ${cultures.length ? cultures.join(', ') : '-'}</p>
      <p><strong>Créneau:</strong> ${dto.creneau}</p>
      <p><strong>Source:</strong> ${dto.source || 'direct'}</p>
      <hr />
      <p><small>Source IP: ${sourceIp || 'unknown'}</small></p>
    `;
    const text = [
      'Nouvelle demande de rendez-vous SIAM',
      `Nom: ${dto.nom}`,
      `Entreprise: ${dto.entreprise || '-'}`,
      `Téléphone: ${dto.tel}`,
      `Email: ${dto.email || '-'}`,
      `Surface: ${dto.surface || '-'}`,
      `Région: ${dto.region || '-'}`,
      `Cultures: ${cultures.length ? cultures.join(', ') : '-'}`,
      `Créneau: ${dto.creneau}`,
      `Source: ${dto.source || 'direct'}`,
      `Source IP: ${sourceIp || 'unknown'}`,
    ].join('\n');

    const sendResults = await Promise.all(
      recipients.map((to) => this.notificationsService.sendEmail({ to, subject, html, text })),
    );

    const emailSent = sendResults.some(Boolean);

    // Update email_sent flag using the inserted row ID
    if (insertedId && this.supabaseAdmin) {
      await this.supabaseAdmin
        .from('siam_rdv_leads')
        .update({ email_sent: emailSent })
        .eq('id', insertedId);
    }

    if (!emailSent) {
      this.logger.error(`Failed to send SIAM RDV email for ${dto.nom}`);
    }

    // Fail only if BOTH persistence and email failed — data is truly lost
    const dbPersisted = !!insertedId;
    if (!dbPersisted && !emailSent) {
      this.logger.error(`SIAM RDV completely lost for ${dto.nom} — neither DB nor email succeeded`);
      return { success: false };
    }

    this.logger.log(`SIAM RDV submitted by ${dto.nom} for slot ${dto.creneau} (persisted: ${dbPersisted}, emailed: ${emailSent})`);
    return { success: true };
  }

  async confirmLead(
    leadId: string,
    overrideSlot?: string,
  ): Promise<{ success: boolean; emailSent: boolean }> {
    if (!this.supabaseAdmin) {
      throw new Error('Database not available');
    }

    const { data: lead, error: fetchError } = await this.supabaseAdmin
      .from('siam_rdv_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError || !lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    if (lead.status === 'confirmed') {
      return { success: true, emailSent: lead.email_sent };
    }

    const confirmedSlot = overrideSlot || lead.creneau;

    const { error: updateError } = await this.supabaseAdmin
      .from('siam_rdv_leads')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_slot: confirmedSlot,
      })
      .eq('id', leadId);

    if (updateError) {
      this.logger.error(`Failed to confirm lead ${leadId}: ${updateError.message}`);
      return { success: false, emailSent: false };
    }

    let emailSent = false;
    if (lead.email) {
      const contactPhone = this.configService.get<string>('CONTACT_PHONE') || '+212 5XX XXX XXX';
      emailSent = await this.emailService.sendByType('siam_rdv_confirmation', lead.email, {
        nom: lead.nom,
        confirmed_slot: confirmedSlot,
        contact_phone: contactPhone,
      });

      if (emailSent) {
        await this.supabaseAdmin
          .from('siam_rdv_leads')
          .update({ email_sent: true })
          .eq('id', leadId);
      } else {
        this.logger.error(`Failed to send confirmation email to ${lead.email}`);
      }
    } else {
      this.logger.warn(`Lead ${leadId} has no email — skipping confirmation email`);
    }

    this.logger.log(`Lead ${leadId} confirmed for slot ${confirmedSlot} (email: ${emailSent})`);
    return { success: true, emailSent };
  }

  async rejectLead(
    leadId: string,
    reason: string,
  ): Promise<{ success: boolean; emailSent: boolean }> {
    if (!this.supabaseAdmin) {
      throw new Error('Database not available');
    }

    const { data: lead, error: fetchError } = await this.supabaseAdmin
      .from('siam_rdv_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError || !lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    if (lead.status === 'rejected') {
      return { success: true, emailSent: false };
    }

    const { error: updateError } = await this.supabaseAdmin
      .from('siam_rdv_leads')
      .update({
        status: 'rejected',
        rejection_reason: reason,
      })
      .eq('id', leadId);

    if (updateError) {
      this.logger.error(`Failed to reject lead ${leadId}: ${updateError.message}`);
      return { success: false, emailSent: false };
    }

    let emailSent = false;
    if (lead.email) {
      const contactPhone = this.configService.get<string>('CONTACT_PHONE') || '+212 5XX XXX XXX';
      emailSent = await this.emailService.sendByType('siam_rdv_rejection', lead.email, {
        nom: lead.nom,
        rejection_reason: reason,
        contact_phone: contactPhone,
      });

      if (!emailSent) {
        this.logger.error(`Failed to send rejection email to ${lead.email}`);
      }
    }

    this.logger.log(`Lead ${leadId} rejected (email: ${emailSent})`);
    return { success: true, emailSent };
  }
}
