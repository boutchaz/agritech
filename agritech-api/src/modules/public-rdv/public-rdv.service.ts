import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { DatabaseService } from '../database/database.service';
import { CreateSiamRdvDto } from './dto/create-siam-rdv.dto';

@Injectable()
export class PublicRdvService {
  private readonly logger = new Logger(PublicRdvService.name);
  private readonly supabaseAdmin: ReturnType<DatabaseService['getAdminClient']> | null;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
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
}
