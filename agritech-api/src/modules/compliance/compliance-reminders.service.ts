import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class ComplianceRemindersService {
  private readonly logger = new Logger(ComplianceRemindersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  @Cron('0 9 * * *', { name: 'check-audit-reminders', timeZone: 'UTC' })
  async checkAuditReminders() {
    this.logger.log('Running daily audit reminder check...');

    const client = this.databaseService.getAdminClient();
    const now = new Date();

    const { data: dueReminders, error } = await client
      .from('audit_reminders')
      .select(`
        id,
        certification_id,
        organization_id,
        reminder_type,
        scheduled_for,
        certification:certifications(
          id,
          certification_type,
          certification_number,
          audit_schedule
        )
      `)
      .lte('scheduled_for', now.toISOString())
      .is('sent_at', null);

    if (error) {
      this.logger.error(`Failed to fetch due audit reminders: ${error.message}`);
      return;
    }

    for (const reminder of dueReminders || []) {
      await this.processAuditReminder(reminder);
    }

    this.logger.log(`Processed ${dueReminders?.length || 0} audit reminders`);
  }

  @Cron('0 10 * * *', { name: 'check-certification-expiry', timeZone: 'UTC' })
  async checkCertificationExpiry() {
    this.logger.log('Running daily certification expiry check...');

    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data: expiringCerts, error } = await client
      .from('certifications')
      .select('*')
      .eq('status', 'active')
      .lte('expiry_date', thirtyDaysFromNow.toISOString())
      .gt('expiry_date', now.toISOString());

    if (error) {
      this.logger.error(`Failed to fetch expiring certifications: ${error.message}`);
      return;
    }

    for (const cert of expiringCerts || []) {
      const daysUntilExpiry = Math.ceil(
        (new Date(cert.expiry_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      if ([30, 14, 7, 1].includes(daysUntilExpiry)) {
        await this.sendExpiryNotification(cert, daysUntilExpiry);
      }
    }

    this.logger.log(`Checked ${expiringCerts?.length || 0} expiring certifications`);
  }

  private async processAuditReminder(reminder: any) {
    const client = this.databaseService.getAdminClient();
    const certification = reminder.certification;

    if (!certification) {
      this.logger.warn(`Certification not found for reminder ${reminder.id}`);
      return;
    }

    const { data: orgAdmins, error: adminError } = await client
      .from('organization_users')
      .select(`
        user_id,
        user:user_profiles(id, email, first_name)
      `)
      .eq('organization_id', reminder.organization_id)
      .in('role_id', (await this.getAdminRoleIds(client)));

    if (adminError || !orgAdmins?.length) {
      this.logger.warn(`No admins found for org ${reminder.organization_id}`);
      return;
    }

    const auditDate = certification.audit_schedule?.next_audit_date;
    const formattedDate = auditDate 
      ? new Date(auditDate).toLocaleDateString('fr-FR')
      : 'Date non définie';

    const title = this.getAuditReminderTitle(reminder.reminder_type, certification);
    const message = this.getAuditReminderMessage(reminder.reminder_type, certification, formattedDate);

    for (const admin of orgAdmins) {
      const userArray = admin.user as unknown as Array<{ id: string; email: string; first_name: string }>;
      const userData = userArray?.[0] ?? null;
      
      const prefs = await this.getUserAuditPreferences(admin.user_id, reminder.organization_id);
      
      if (!this.shouldSendReminder(prefs, reminder.reminder_type)) {
        continue;
      }

      const notification = await this.notificationsService.createNotification({
        userId: admin.user_id,
        organizationId: reminder.organization_id,
        type: NotificationType.AUDIT_REMINDER,
        title,
        message,
        data: {
          certificationId: certification.id,
          certificationType: certification.certification_type,
          reminderType: reminder.reminder_type,
          auditDate,
        },
      });

      let emailSent = false;
      if (prefs?.email_notifications !== false && userData?.email) {
        emailSent = await this.sendAuditReminderEmail(
          userData.email,
          userData.first_name,
          certification,
          reminder.reminder_type,
          formattedDate
        );
      }

      await client
        .from('audit_reminders')
        .update({
          sent_at: new Date().toISOString(),
          notification_id: notification.id,
          email_sent: emailSent,
        })
        .eq('id', reminder.id);
    }

    this.logger.log(
      `Sent ${reminder.reminder_type} audit reminder for ${certification.certification_type}`
    );
  }

  private async sendExpiryNotification(certification: any, daysUntilExpiry: number) {
    const client = this.databaseService.getAdminClient();

    const { data: orgAdmins } = await client
      .from('organization_users')
      .select(`
        user_id,
        user:user_profiles(id, email, first_name)
      `)
      .eq('organization_id', certification.organization_id)
      .in('role_id', (await this.getAdminRoleIds(client)));

    const title = `Certification ${certification.certification_type} expire dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}`;
    const message = `Votre certification ${certification.certification_type} (${certification.certification_number}) expire le ${new Date(certification.expiry_date).toLocaleDateString('fr-FR')}. Pensez à planifier son renouvellement.`;

    for (const admin of orgAdmins || []) {
      const userArray = admin.user as unknown as Array<{ id: string; email: string; first_name: string }>;
      const userData = userArray?.[0] ?? null;
      
      const prefs = await this.getUserAuditPreferences(admin.user_id, certification.organization_id);
      
      if (prefs?.certification_expiry_reminders === false) {
        continue;
      }

      await this.notificationsService.createNotification({
        userId: admin.user_id,
        organizationId: certification.organization_id,
        type: NotificationType.CERTIFICATION_EXPIRY,
        title,
        message,
        data: {
          certificationId: certification.id,
          certificationType: certification.certification_type,
          expiryDate: certification.expiry_date,
          daysUntilExpiry,
        },
      });
    }
  }

  private async getAdminRoleIds(client: any): Promise<string[]> {
    const { data: roles } = await client
      .from('roles')
      .select('id')
      .in('name', ['organization_admin', 'farm_manager', 'system_admin']);
    
    return roles?.map((r: any) => r.id) || [];
  }

  private async getUserAuditPreferences(userId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();
    
    const { data } = await client
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    return data;
  }

  private shouldSendReminder(prefs: any, reminderType: string): boolean {
    if (!prefs) return true;
    if (!prefs.audit_reminders_enabled) return false;

    switch (reminderType) {
      case '30_days':
        return prefs.audit_reminder_30d_before !== false;
      case '14_days':
        return prefs.audit_reminder_14d_before !== false;
      case '7_days':
        return prefs.audit_reminder_7d_before !== false;
      case '1_day':
        return prefs.audit_reminder_1d_before !== false;
      default:
        return true;
    }
  }

  private getAuditReminderTitle(type: string, certification: any): string {
    const certType = certification.certification_type;
    
    switch (type) {
      case '30_days':
        return `Audit ${certType} dans 30 jours`;
      case '14_days':
        return `Audit ${certType} dans 2 semaines`;
      case '7_days':
        return `Audit ${certType} dans 1 semaine`;
      case '1_day':
        return `Audit ${certType} demain`;
      case 'overdue':
        return `Audit ${certType} en retard`;
      default:
        return `Rappel audit ${certType}`;
    }
  }

  private getAuditReminderMessage(type: string, certification: any, formattedDate: string): string {
    const certType = certification.certification_type;
    const certNumber = certification.certification_number;

    switch (type) {
      case '30_days':
        return `Votre audit ${certType} (${certNumber}) est prévu pour le ${formattedDate}. Commencez à préparer vos documents.`;
      case '14_days':
        return `L'audit ${certType} (${certNumber}) approche : ${formattedDate}. Vérifiez que tous les documents sont à jour.`;
      case '7_days':
        return `L'audit ${certType} (${certNumber}) est dans une semaine (${formattedDate}). Finalisez votre préparation.`;
      case '1_day':
        return `L'audit ${certType} (${certNumber}) est demain (${formattedDate}). Dernières vérifications !`;
      case 'overdue':
        return `L'audit ${certType} (${certNumber}) était prévu pour le ${formattedDate}. Veuillez mettre à jour la date.`;
      default:
        return `Rappel pour l'audit ${certType} (${certNumber}) prévu le ${formattedDate}.`;
    }
  }

  private async sendAuditReminderEmail(
    email: string,
    firstName: string,
    certification: any,
    reminderType: string,
    formattedDate: string
  ): Promise<boolean> {
    return this.emailService.sendByType('audit_reminder', email, {
      firstName: firstName || 'Utilisateur',
      certificationType: certification.certification_type,
      certificationNumber: certification.certification_number,
      auditDate: formattedDate,
      reminderType,
      dashboardUrl: `${process.env.FRONTEND_URL}/compliance/certifications/${certification.id}`,
    });
  }
}
