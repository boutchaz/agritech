import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as hbs from 'handlebars';
import { promises as fs } from 'fs';
import { join } from 'path';
import { DatabaseService } from '../database/database.service';

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templates: Map<string, hbs.TemplateDelegate> = new Map();

  constructor(
    private configService: ConfigService,
    @Optional() @Inject(DatabaseService) private databaseService?: DatabaseService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST') || 'localhost',
      port: parseInt(this.configService.get('SMTP_PORT') || '1025'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER') || '',
        pass: this.configService.get('SMTP_PASS') || '',
      },
    });
  }

  getRedactedConfig() {
    const host = this.configService.get<string>('SMTP_HOST') || '';
    const port = this.configService.get<string>('SMTP_PORT') || '1025';
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';
    const user = this.configService.get<string>('SMTP_USER') || '';
    const pass = this.configService.get<string>('SMTP_PASS') || '';
    const from = this.configService.get<string>('EMAIL_FROM') || 'noreply@agritech.com';
    const enabled = this.configService.get<string>('EMAIL_ENABLED', 'true') === 'true';

    return {
      host,
      port: parseInt(port),
      secure,
      user: user ? `${user.slice(0, 3)}***${user.includes('@') ? user.slice(user.indexOf('@')) : ''}` : '',
      password_set: !!pass,
      from,
      enabled,
      configured: this.isConfigured(),
    };
  }

  isConfigured(): boolean {
    const enabled = this.configService.get<string>('EMAIL_ENABLED', 'true') === 'true';
    if (!enabled) {
      this.logger.warn('Email sending is disabled via EMAIL_ENABLED flag');
      return false;
    }

    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    const isValid = !!(host && user && pass);
    if (!isValid) {
      this.logger.warn('SMTP configuration incomplete. Set SMTP_HOST, SMTP_USER, and SMTP_PASS');
    }
    return isValid;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const html = await this.renderTemplate(options.template, options.context);
      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM') || 'noreply@agritech.com',
        to: options.to,
        subject: options.subject,
        html,
      });
      this.logger.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return false;
    }
  }

  async sendUserCreatedEmail(
    email: string,
    firstName: string,
    lastName: string,
    tempPassword: string,
    organizationName: string,
  ): Promise<boolean> {
    return this.sendByType('user_created', email, {
      firstName,
      lastName,
      email,
      tempPassword,
      organizationName,
      loginUrl: this.configService.get('FRONTEND_URL') || 'https://agritech-dashboard.thebzlab.online',
    });
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    tempPassword: string,
  ): Promise<boolean> {
    return this.sendByType('password_reset', email, {
      firstName,
      tempPassword,
      loginUrl: this.configService.get('FRONTEND_URL') || 'https://agritech-dashboard.thebzlab.online',
    });
  }

  private async renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<string> {
    let template = this.templates.get(templateName);

    if (!template) {
      const templatePath = join(__dirname, 'templates', `${templateName}.hbs`);
      const source = await fs.readFile(templatePath, 'utf-8');
      template = hbs.compile(source);
      this.templates.set(templateName, template);
    }

    return template(context);
  }

  /**
   * Send an email using a template from the database, falling back to .hbs file.
   * This is the preferred method — all callers should migrate to this.
   */
  async sendByType(
    type: string,
    to: string,
    context: Record<string, any>,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      if (!this.databaseService) {
        this.logger.error(`Cannot send email type "${type}": DatabaseService not available`);
        return false;
      }

      const client = this.databaseService.getAdminClient();
      const { data: template } = await client
        .from('email_templates')
        .select('subject, html_body, text_body')
        .is('organization_id', null)
        .eq('type', type)
        .eq('is_active', true)
        .maybeSingle();

      if (!template) {
        this.logger.error(`No active DB template for type "${type}". Email NOT sent. Add it to email_templates table.`);
        return false;
      }

      const compiledSubject = hbs.compile(template.subject)(context);
      const compiledHtml = hbs.compile(template.html_body)(context);

      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM') || 'noreply@agritech.com',
        to,
        subject: compiledSubject,
        html: compiledHtml,
        text: template.text_body ? hbs.compile(template.text_body)(context) : undefined,
      });

      this.logger.log(`Email sent (type: ${type}) to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email (type: ${type}): ${error.message}`);
      return false;
    }
  }

  async sendTestEmail(to: string): Promise<boolean> {
    return this.sendByType('test_email', to, {
      message: 'This is a test email from the AgriTech platform.',
      date: new Date().toISOString(),
    });
  }

  /**
   * Send a test email for any template type using sample placeholder data.
   * Reads the template's variables from the DB and fills them with realistic sample values.
   */
  async sendTestByType(type: string, to: string): Promise<boolean> {
    if (!this.isConfigured() || !this.databaseService) {
      return false;
    }

    const client = this.databaseService.getAdminClient();
    const { data: template } = await client
      .from('email_templates')
      .select('subject, html_body, text_body, variables')
      .is('organization_id', null)
      .eq('type', type)
      .eq('is_active', true)
      .maybeSingle();

    if (!template) {
      this.logger.error(`No active template for type "${type}"`);
      return false;
    }

    const vars: string[] = Array.isArray(template.variables) ? template.variables : [];
    const context = this.buildSampleContext(vars);

    try {
      const compiledSubject = hbs.compile(template.subject)(context);
      const compiledHtml = hbs.compile(template.html_body)(context);

      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM') || 'noreply@agritech.com',
        to,
        subject: `[TEST] ${compiledSubject}`,
        html: compiledHtml,
        text: template.text_body ? hbs.compile(template.text_body)(context) : undefined,
      });

      this.logger.log(`Test email sent (type: ${type}) to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send test email (type: ${type}): ${error.message}`);
      return false;
    }
  }

  private buildSampleContext(variables: string[]): Record<string, string> {
    const samples: Record<string, string> = {
      firstName: 'Karim',
      lastName: 'El Amrani',
      email: 'karim@example.com',
      tempPassword: 'Tmp@2026!',
      organizationName: 'Domaine Al Baraka',
      loginUrl: this.configService.get('FRONTEND_URL') || 'https://agritech-dashboard.thebzlab.online',
      dashboardUrl: this.configService.get('FRONTEND_URL') || 'https://agritech-dashboard.thebzlab.online',
      taskTitle: 'Taille des oliviers - Parcelle B3',
      taskDescription: 'Taille de formation sur les arbres de 3 ans, rangées 12-18.',
      taskId: '00000000-0000-0000-0000-000000000001',
      taskUrl: `${this.configService.get('FRONTEND_URL') || 'https://agritech-dashboard.thebzlab.online'}/tasks`,
      dueDate: new Date(Date.now() + 86400000).toLocaleDateString('fr-FR'),
      assignerName: 'Hassan Benali',
      priority: 'Haute',
      reminderType: 'task',
      message: 'Ceci est un email de test depuis la plateforme AgroGina.',
      date: new Date().toLocaleDateString('fr-FR'),
      certificationType: 'GlobalG.A.P.',
      certificationNumber: 'CERT-2026-001',
      auditDate: new Date(Date.now() + 7 * 86400000).toLocaleDateString('fr-FR'),
      productTitle: 'Huile d\'olive extra vierge - 5L',
      buyerName: 'Fatima Zahra',
      buyerEmail: 'fatima@cooperative.ma',
      buyerPhone: '+212 6 12 34 56 78',
      sellerName: 'Domaine Al Baraka',
      requestedQuantity: '500',
      unitOfMeasure: 'kg',
      quoteRequestUrl: `${this.configService.get('FRONTEND_URL') || 'https://agritech-dashboard.thebzlab.online'}/marketplace`,
      quotedPrice: '45.00',
      currency: 'MAD',
      sellerResponse: 'Disponible immédiatement. Livraison sous 48h.',
      validUntil: new Date(Date.now() + 14 * 86400000).toLocaleDateString('fr-FR'),
      orderNumber: 'ORD-2026-0042',
      totalAmount: '22,500.00',
      shippingAddress: '123 Route de Meknès, Fès 30000',
      orderUrl: `${this.configService.get('FRONTEND_URL') || 'https://agritech-dashboard.thebzlab.online'}/marketplace/orders`,
      status: 'shipped',
      statusText: 'Expédiée',
      statusMessage: 'Votre commande a été expédiée et est en route.',
      invoiceNumber: 'FAC-2026-0018',
      invoiceType: 'sales',
      invoiceTypeLabel: 'Facture de Vente',
      invoiceIntro: 'Veuillez trouver ci-joint votre facture.',
      invoiceDate: new Date().toLocaleDateString('fr-FR'),
      subtotal: '19,000.00',
      taxAmount: '3,800.00',
      grandTotal: '22,800.00',
      partyName: 'Coopérative Al Amal',
      invoiceUrl: `${this.configService.get('FRONTEND_URL') || 'https://agritech-dashboard.thebzlab.online'}/accounting`,
      itemName: 'Engrais NPK 15-15-15',
      itemId: '00000000-0000-0000-0000-000000000002',
      currentQuantity: '12',
      minimumStock: '50',
      unit: 'kg',
      shortageQuantity: '38',
    };

    const context: Record<string, string> = {};
    for (const v of variables) {
      context[v] = samples[v] ?? `{{${v}}}`;
    }
    return context;
  }

  /**
   * Send a raw email with pre-built HTML (no template lookup).
   * Use sparingly — prefer sendByType for all template-based emails.
   */
  async sendRaw(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM') || 'noreply@agritech.com',
        to,
        subject,
        html,
        text,
      });
      this.logger.log(`Raw email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send raw email: ${error.message}`);
      return false;
    }
  }
}
