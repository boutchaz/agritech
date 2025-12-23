import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface QuoteRequestEmailData {
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  productTitle: string;
  requestedQuantity?: number;
  unitOfMeasure?: string;
  message?: string;
  quoteRequestUrl: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check if email configuration is available
    const emailEnabled = process.env.EMAIL_ENABLED === 'true';

    if (!emailEnabled) {
      this.logger.warn('Email notifications are disabled. Set EMAIL_ENABLED=true to enable.');
      return;
    }

    const host = process.env.EMAIL_HOST;
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!host || !user || !pass) {
      this.logger.warn('Email configuration incomplete. Emails will not be sent.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not initialized. Email not sent.');
      return false;
    }

    try {
      const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Send quote request notification to seller
   */
  async sendQuoteRequestNotification(
    sellerEmail: string,
    data: QuoteRequestEmailData,
  ): Promise<boolean> {
    const subject = `Nouvelle demande de devis - ${data.productTitle}`;

    const html = this.generateQuoteRequestEmail(data);
    const text = this.generateQuoteRequestEmailText(data);

    return this.sendEmail({
      to: sellerEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Generate HTML email template for quote request
   */
  private generateQuoteRequestEmail(data: QuoteRequestEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-top: none;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .info-row {
      margin: 15px 0;
      padding: 10px;
      background: #f9fafb;
      border-left: 3px solid #10b981;
      border-radius: 4px;
    }
    .info-label {
      font-weight: 600;
      color: #059669;
      margin-bottom: 5px;
    }
    .info-value {
      color: #374151;
    }
    .message-box {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      font-style: italic;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #10b981;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background: #059669;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🌾 Nouvelle Demande de Devis</h1>
  </div>

  <div class="content">
    <p>Bonjour,</p>

    <p>Vous avez reçu une nouvelle demande de devis sur AgriTech Marketplace.</p>

    <div class="info-row">
      <div class="info-label">Produit:</div>
      <div class="info-value"><strong>${data.productTitle}</strong></div>
    </div>

    ${data.requestedQuantity ? `
    <div class="info-row">
      <div class="info-label">Quantité demandée:</div>
      <div class="info-value">${data.requestedQuantity} ${data.unitOfMeasure || 'unités'}</div>
    </div>
    ` : ''}

    <div class="info-row">
      <div class="info-label">Client:</div>
      <div class="info-value">${data.buyerName}</div>
    </div>

    <div class="info-row">
      <div class="info-label">Email:</div>
      <div class="info-value"><a href="mailto:${data.buyerEmail}">${data.buyerEmail}</a></div>
    </div>

    ${data.buyerPhone ? `
    <div class="info-row">
      <div class="info-label">Téléphone:</div>
      <div class="info-value"><a href="tel:${data.buyerPhone}">${data.buyerPhone}</a></div>
    </div>
    ` : ''}

    ${data.message ? `
    <div class="message-box">
      <strong>Message du client:</strong><br>
      ${data.message}
    </div>
    ` : ''}

    <div style="text-align: center;">
      <a href="${data.quoteRequestUrl}" class="button">
        Répondre à la demande
      </a>
    </div>

    <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
      Connectez-vous à votre tableau de bord pour consulter tous les détails et envoyer votre devis.
    </p>
  </div>

  <div class="footer">
    <p>
      © 2025 AgriTech Marketplace. Tous droits réservés.<br>
      <a href="https://marketplace.thebzlab.online" style="color: #10b981; text-decoration: none;">marketplace.thebzlab.online</a>
    </p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text version of quote request email
   */
  private generateQuoteRequestEmailText(data: QuoteRequestEmailData): string {
    let text = `Nouvelle Demande de Devis\n\n`;
    text += `Vous avez reçu une nouvelle demande de devis sur AgriTech Marketplace.\n\n`;
    text += `Produit: ${data.productTitle}\n`;

    if (data.requestedQuantity) {
      text += `Quantité demandée: ${data.requestedQuantity} ${data.unitOfMeasure || 'unités'}\n`;
    }

    text += `\nClient: ${data.buyerName}\n`;
    text += `Email: ${data.buyerEmail}\n`;

    if (data.buyerPhone) {
      text += `Téléphone: ${data.buyerPhone}\n`;
    }

    if (data.message) {
      text += `\nMessage du client:\n${data.message}\n`;
    }

    text += `\nRépondre à la demande: ${data.quoteRequestUrl}\n`;
    text += `\nConnectez-vous à votre tableau de bord pour consulter tous les détails et envoyer votre devis.\n`;
    text += `\n© 2025 AgriTech Marketplace\n`;
    text += `https://marketplace.thebzlab.online\n`;

    return text;
  }
}
