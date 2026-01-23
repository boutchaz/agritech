import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as hbs from 'handlebars';
import { promises as fs } from 'fs';
import { join } from 'path';

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

  constructor(private configService: ConfigService) {
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
    return this.sendEmail({
      to: email,
      subject: 'Welcome to AgriTech - Your Account Details',
      template: 'user-created',
      context: {
        firstName,
        lastName,
        email,
        tempPassword,
        organizationName,
        loginUrl: this.configService.get('FRONTEND_URL') || 'https://agritech-dashboard.thebzlab.online',
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    tempPassword: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'Your Password Has Been Reset',
      template: 'password-reset',
      context: {
        firstName,
        tempPassword,
        loginUrl: this.configService.get('FRONTEND_URL') || 'https://agritech-dashboard.thebzlab.online',
      },
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

  async sendTestEmail(to: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Test Email from AgriTech',
      template: 'test',
      context: {
        message: 'This is a test email from the AgriTech platform.',
        date: new Date().toISOString(),
      },
    });
  }
}
