import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { DatabaseService } from '../database/database.service';
import { CreateSiamRdvDto } from './dto/create-siam-rdv.dto';

@Injectable()
export class PublicRdvService {
  private readonly logger = new Logger(PublicRdvService.name);
  private readonly supabaseAdmin;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.supabaseAdmin = this.databaseService.getAdminClient();
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
    // Merge cultures into a single array
    const cultures = [...(dto.culture || []), ...(dto.culture_autre ? [dto.culture_autre] : [])];

    // Persist lead first — even if email fails, we keep the data
    const { error: dbError } = await this.supabaseAdmin
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
        source_ip: sourceIp || null,
        email_sent: false,
      });

    if (dbError) {
      this.logger.error(`Failed to persist SIAM RDV lead: ${dbError.message}`);
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
      `Source IP: ${sourceIp || 'unknown'}`,
    ].join('\n');

    const sendResults = await Promise.all(
      recipients.map((to) => this.notificationsService.sendEmail({ to, subject, html, text })),
    );

    const emailSent = sendResults.some(Boolean);

    // Update email_sent status
    if (!dbError) {
      await this.supabaseAdmin
        .from('siam_rdv_leads')
        .update({ email_sent: emailSent })
        .eq('nom', dto.nom)
        .eq('tel', dto.tel)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    if (!emailSent) {
      this.logger.error(`Failed to send SIAM RDV email for ${dto.nom}`);
    }

    this.logger.log(`SIAM RDV submitted by ${dto.nom} for slot ${dto.creneau} (persisted: ${!dbError}, emailed: ${emailSent})`);
    return { success: true };
  }
}
