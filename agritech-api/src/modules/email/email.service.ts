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
