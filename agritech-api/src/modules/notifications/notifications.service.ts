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

export interface QuoteResponseEmailData {
  buyerName: string;
  buyerEmail: string;
  sellerName: string;
  productTitle: string;
  quotedPrice: number;
  currency: string;
  requestedQuantity?: number;
  unitOfMeasure?: string;
  sellerResponse: string;
  validUntil?: string;
  quoteRequestUrl: string;
}

export interface OrderEmailData {
  orderNumber: string;
  buyerName: string;
  buyerEmail: string;
  sellerName: string;
  totalAmount: number;
  currency: string;
  items: Array<{
    title: string;
    quantity: number;
    unitPrice: number;
    unit?: string;
  }>;
  shippingAddress: string;
  orderUrl: string;
  status?: string;
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
      this.transporter = nodemailer.createTransport({
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

  /**
   * Send quote response notification to buyer
   */
  async sendQuoteResponseNotification(
    buyerEmail: string,
    data: QuoteResponseEmailData,
  ): Promise<boolean> {
    const subject = `Réponse à votre demande de devis - ${data.productTitle}`;

    const html = this.generateQuoteResponseEmail(data);
    const text = this.generateQuoteResponseEmailText(data);

    return this.sendEmail({
      to: buyerEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Generate HTML email template for quote response
   */
  private generateQuoteResponseEmail(data: QuoteResponseEmailData): string {
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
    .price-box {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
      border: 2px solid #10b981;
    }
    .price-box .price {
      font-size: 32px;
      font-weight: 700;
      color: #059669;
      margin: 10px 0;
    }
    .price-box .currency {
      font-size: 20px;
      color: #059669;
    }
    .response-box {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 3px solid #6366f1;
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
    <h1>📋 Devis Reçu</h1>
  </div>

  <div class="content">
    <p>Bonjour ${data.buyerName},</p>

    <p>Vous avez reçu une réponse à votre demande de devis de la part de <strong>${data.sellerName}</strong>.</p>

    <div class="info-row">
      <div class="info-label">Produit:</div>
      <div class="info-value"><strong>${data.productTitle}</strong></div>
    </div>

    ${data.requestedQuantity ? `
    <div class="info-row">
      <div class="info-label">Quantité:</div>
      <div class="info-value">${data.requestedQuantity} ${data.unitOfMeasure || 'unités'}</div>
    </div>
    ` : ''}

    <div class="price-box">
      <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">Prix proposé</div>
      <div class="price">
        ${data.quotedPrice.toLocaleString()} <span class="currency">${data.currency}</span>
      </div>
      ${data.unitOfMeasure ? `<div style="color: #6b7280; font-size: 14px;">par ${data.unitOfMeasure}</div>` : ''}
      ${data.requestedQuantity ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #10b981;">
          <div style="color: #059669; font-weight: 600;">Total estimé</div>
          <div style="font-size: 24px; font-weight: 700; color: #059669; margin-top: 5px;">
            ${(data.quotedPrice * data.requestedQuantity).toLocaleString()} ${data.currency}
          </div>
        </div>
      ` : ''}
    </div>

    ${data.validUntil ? `
    <div class="info-row">
      <div class="info-label">Validité du devis:</div>
      <div class="info-value">Jusqu'au ${new Date(data.validUntil).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    ` : ''}

    <div class="response-box">
      <strong style="color: #4f46e5;">Conditions et informations du vendeur:</strong><br><br>
      ${data.sellerResponse.replace(/\n/g, '<br>')}
    </div>

    <div style="text-align: center;">
      <a href="${data.quoteRequestUrl}" class="button">
        Consulter le devis
      </a>
    </div>

    <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
      Connectez-vous à votre tableau de bord pour consulter tous les détails, accepter ou décliner ce devis.
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
   * Generate plain text version of quote response email
   */
  private generateQuoteResponseEmailText(data: QuoteResponseEmailData): string {
    let text = `Devis Reçu\n\n`;
    text += `Bonjour ${data.buyerName},\n\n`;
    text += `Vous avez reçu une réponse à votre demande de devis de la part de ${data.sellerName}.\n\n`;
    text += `Produit: ${data.productTitle}\n`;

    if (data.requestedQuantity) {
      text += `Quantité: ${data.requestedQuantity} ${data.unitOfMeasure || 'unités'}\n`;
    }

    text += `\nPrix proposé: ${data.quotedPrice.toLocaleString()} ${data.currency}`;
    if (data.unitOfMeasure) {
      text += ` par ${data.unitOfMeasure}`;
    }
    text += `\n`;

    if (data.requestedQuantity) {
      text += `Total estimé: ${(data.quotedPrice * data.requestedQuantity).toLocaleString()} ${data.currency}\n`;
    }

    if (data.validUntil) {
      text += `\nValidité du devis: Jusqu'au ${new Date(data.validUntil).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    }

    text += `\nConditions et informations du vendeur:\n${data.sellerResponse}\n`;
    text += `\nConsulter le devis: ${data.quoteRequestUrl}\n`;
    text += `\nConnectez-vous à votre tableau de bord pour consulter tous les détails, accepter ou décliner ce devis.\n`;
    text += `\n© 2025 AgriTech Marketplace\n`;
    text += `https://marketplace.thebzlab.online\n`;

    return text;
  }

  /**
   * Send order confirmation email to buyer
   */
  async sendOrderConfirmationEmail(data: OrderEmailData): Promise<boolean> {
    const subject = `Commande confirmée #${data.orderNumber} - AgriTech Marketplace`;

    const html = this.generateOrderConfirmationEmail(data);
    const text = this.generateOrderConfirmationEmailText(data);

    return this.sendEmail({
      to: data.buyerEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send new order notification to seller
   */
  async sendNewOrderNotificationToSeller(sellerEmail: string, data: OrderEmailData): Promise<boolean> {
    const subject = `Nouvelle commande #${data.orderNumber} - AgriTech Marketplace`;

    const html = this.generateNewOrderSellerEmail(data);
    const text = this.generateNewOrderSellerEmailText(data);

    return this.sendEmail({
      to: sellerEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send order status update email to buyer
   */
  async sendOrderStatusUpdateEmail(data: OrderEmailData): Promise<boolean> {
    const statusTexts: Record<string, string> = {
      confirmed: 'confirmée',
      shipped: 'expédiée',
      delivered: 'livrée',
      cancelled: 'annulée',
    };

    const statusText = statusTexts[data.status || ''] || data.status;
    const subject = `Commande #${data.orderNumber} ${statusText} - AgriTech Marketplace`;

    const html = this.generateOrderStatusUpdateEmail(data);
    const text = this.generateOrderStatusUpdateEmailText(data);

    return this.sendEmail({
      to: data.buyerEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Generate HTML email template for order confirmation
   */
  private generateOrderConfirmationEmail(data: OrderEmailData): string {
    const itemsHtml = data.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>${item.title}</strong>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${item.quantity} ${item.unit || ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${item.unitPrice.toLocaleString()} ${data.currency}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${(item.quantity * item.unitPrice).toLocaleString()} ${data.currency}
        </td>
      </tr>
    `).join('');

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
    .order-number {
      background: #f0fdf4;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
      border: 2px solid #10b981;
    }
    .order-number strong {
      font-size: 20px;
      color: #059669;
    }
    .info-row {
      margin: 15px 0;
      padding: 10px;
      background: #f9fafb;
      border-left: 3px solid #10b981;
      border-radius: 4px;
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
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .total-row {
      background: #f0fdf4;
      font-weight: 600;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>✅ Commande Confirmée!</h1>
  </div>

  <div class="content">
    <p>Bonjour ${data.buyerName},</p>

    <p>Nous avons bien reçu votre commande. Merci pour votre confiance!</p>

    <div class="order-number">
      <strong>Commande #${data.orderNumber}</strong>
    </div>

    <h3 style="color: #059669; margin-top: 30px;">Détails de la commande</h3>

    <table>
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 10px; text-align: left;">Produit</th>
          <th style="padding: 10px; text-align: center;">Quantité</th>
          <th style="padding: 10px; text-align: right;">Prix unitaire</th>
          <th style="padding: 10px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr class="total-row">
          <td colspan="3" style="padding: 15px; text-align: right;">Total</td>
          <td style="padding: 15px; text-align: right; color: #059669;">
            ${data.totalAmount.toLocaleString()} ${data.currency}
          </td>
        </tr>
      </tbody>
    </table>

    <div class="info-row">
      <strong>Vendeur:</strong> ${data.sellerName}
    </div>

    <div class="info-row">
      <strong>Adresse de livraison:</strong><br>
      ${data.shippingAddress}
    </div>

    <div style="text-align: center;">
      <a href="${data.orderUrl}" class="button">
        Voir ma commande
      </a>
    </div>

    <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
      Vous recevrez un email dès que le vendeur confirmera votre commande.
    </p>
  </div>

  <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
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
   * Generate plain text version of order confirmation email
   */
  private generateOrderConfirmationEmailText(data: OrderEmailData): string {
    let text = `✅ Commande Confirmée!\n\n`;
    text += `Bonjour ${data.buyerName},\n\n`;
    text += `Nous avons bien reçu votre commande. Merci pour votre confiance!\n\n`;
    text += `Commande #${data.orderNumber}\n\n`;
    text += `DÉTAILS DE LA COMMANDE\n`;
    text += `${'='.repeat(50)}\n\n`;

    data.items.forEach(item => {
      text += `${item.title}\n`;
      text += `  Quantité: ${item.quantity} ${item.unit || ''}\n`;
      text += `  Prix unitaire: ${item.unitPrice.toLocaleString()} ${data.currency}\n`;
      text += `  Total: ${(item.quantity * item.unitPrice).toLocaleString()} ${data.currency}\n\n`;
    });

    text += `${'='.repeat(50)}\n`;
    text += `TOTAL: ${data.totalAmount.toLocaleString()} ${data.currency}\n\n`;
    text += `Vendeur: ${data.sellerName}\n`;
    text += `Adresse de livraison: ${data.shippingAddress}\n\n`;
    text += `Voir ma commande: ${data.orderUrl}\n\n`;
    text += `Vous recevrez un email dès que le vendeur confirmera votre commande.\n\n`;
    text += `© 2025 AgriTech Marketplace\n`;
    text += `https://marketplace.thebzlab.online\n`;

    return text;
  }

  /**
   * Generate HTML email for new order notification to seller
   */
  private generateNewOrderSellerEmail(data: OrderEmailData): string {
    const itemsHtml = data.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>${item.title}</strong>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${item.quantity} ${item.unit || ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${(item.quantity * item.unitPrice).toLocaleString()} ${data.currency}
        </td>
      </tr>
    `).join('');

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
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
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
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #6366f1;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .total-row {
      background: #eef2ff;
      font-weight: 600;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔔 Nouvelle Commande!</h1>
  </div>

  <div class="content">
    <p><strong>Vous avez reçu une nouvelle commande #${data.orderNumber}</strong></p>

    <p>Client: <strong>${data.buyerName}</strong></p>

    <h3 style="color: #4f46e5;">Articles commandés</h3>

    <table>
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 10px; text-align: left;">Produit</th>
          <th style="padding: 10px; text-align: center;">Quantité</th>
          <th style="padding: 10px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr class="total-row">
          <td colspan="2" style="padding: 15px; text-align: right;">Total</td>
          <td style="padding: 15px; text-align: right; color: #4f46e5;">
            ${data.totalAmount.toLocaleString()} ${data.currency}
          </td>
        </tr>
      </tbody>
    </table>

    <p><strong>Adresse de livraison:</strong><br>${data.shippingAddress}</p>

    <div style="text-align: center;">
      <a href="${data.orderUrl}" class="button">
        Gérer cette commande
      </a>
    </div>

    <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
      Connectez-vous à votre tableau de bord pour confirmer et traiter cette commande.
    </p>
  </div>

  <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p>© 2025 AgriTech Marketplace</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text for new order notification to seller
   */
  private generateNewOrderSellerEmailText(data: OrderEmailData): string {
    let text = `🔔 Nouvelle Commande!\n\n`;
    text += `Vous avez reçu une nouvelle commande #${data.orderNumber}\n\n`;
    text += `Client: ${data.buyerName}\n\n`;
    text += `ARTICLES COMMANDÉS\n`;
    text += `${'='.repeat(50)}\n\n`;

    data.items.forEach(item => {
      text += `${item.title}\n`;
      text += `  Quantité: ${item.quantity} ${item.unit || ''}\n`;
      text += `  Total: ${(item.quantity * item.unitPrice).toLocaleString()} ${data.currency}\n\n`;
    });

    text += `${'='.repeat(50)}\n`;
    text += `TOTAL: ${data.totalAmount.toLocaleString()} ${data.currency}\n\n`;
    text += `Adresse de livraison: ${data.shippingAddress}\n\n`;
    text += `Gérer cette commande: ${data.orderUrl}\n\n`;
    text += `Connectez-vous à votre tableau de bord pour confirmer et traiter cette commande.\n\n`;
    text += `© 2025 AgriTech Marketplace\n`;

    return text;
  }

  /**
   * Generate HTML for order status update email
   */
  private generateOrderStatusUpdateEmail(data: OrderEmailData): string {
    const statusConfig: Record<string, { color: string; icon: string; message: string }> = {
      confirmed: {
        color: '#10b981',
        icon: '✅',
        message: 'Votre commande a été confirmée par le vendeur et est en cours de préparation.',
      },
      shipped: {
        color: '#3b82f6',
        icon: '📦',
        message: 'Votre commande a été expédiée et est en route vers vous!',
      },
      delivered: {
        color: '#8b5cf6',
        icon: '🎉',
        message: 'Votre commande a été livrée avec succès!',
      },
      cancelled: {
        color: '#ef4444',
        icon: '❌',
        message: 'Votre commande a été annulée.',
      },
    };

    const config = statusConfig[data.status || ''] || {
      color: '#6b7280',
      icon: 'ℹ️',
      message: `Statut de votre commande: ${data.status}`,
    };

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
      background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .content {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-top: none;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .status-message {
      background: ${config.color}22;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
      border: 2px solid ${config.color};
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: ${config.color};
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${config.icon} Mise à jour de commande</h1>
  </div>

  <div class="content">
    <p>Bonjour ${data.buyerName},</p>

    <div class="status-message">
      <h2 style="margin: 0; color: ${config.color};">Commande #${data.orderNumber}</h2>
      <p style="margin: 15px 0 0 0; font-size: 16px;">${config.message}</p>
    </div>

    <div style="text-align: center;">
      <a href="${data.orderUrl}" class="button">
        Voir ma commande
      </a>
    </div>

    ${data.status === 'delivered' ? `
      <p style="margin-top: 30px; padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 3px solid #10b981;">
        <strong>💚 N'oubliez pas de laisser un avis!</strong><br>
        Votre retour nous aide à améliorer nos services et aide d'autres acheteurs.
      </p>
    ` : ''}
  </div>

  <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p>© 2025 AgriTech Marketplace</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text for order status update email
   */
  private generateOrderStatusUpdateEmailText(data: OrderEmailData): string {
    const statusMessages: Record<string, string> = {
      confirmed: 'Votre commande a été confirmée par le vendeur et est en cours de préparation.',
      shipped: 'Votre commande a été expédiée et est en route vers vous!',
      delivered: 'Votre commande a été livrée avec succès!',
      cancelled: 'Votre commande a été annulée.',
    };

    let text = `Mise à jour de commande\n\n`;
    text += `Bonjour ${data.buyerName},\n\n`;
    text += `Commande #${data.orderNumber}\n\n`;
    text += `${statusMessages[data.status || ''] || `Statut: ${data.status}`}\n\n`;
    text += `Voir ma commande: ${data.orderUrl}\n\n`;

    if (data.status === 'delivered') {
      text += `N'oubliez pas de laisser un avis! Votre retour nous aide à améliorer nos services.\n\n`;
    }

    text += `© 2025 AgriTech Marketplace\n`;

    return text;
  }
}
