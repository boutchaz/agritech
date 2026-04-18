import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { DatabaseService } from '../database/database.service';
import { paginatedResponse, type PaginatedResponse } from '../../common/dto/paginated-query.dto';
import { NotificationsGateway } from './notifications.gateway';
import { EmailService } from '../email/email.service';
import {
  CreateNotificationDto,
  NotificationResponseDto,
  NotificationFiltersDto,
  NotificationType,
} from './dto/notification.dto';
import { marketplaceEmailTemplates } from './templates/marketplace-templates';

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

export interface InvoiceEmailData {
  invoiceNumber: string;
  invoiceType: 'sales' | 'purchase';
  partyName: string;
  partyEmail: string;
  organizationName: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  notes?: string;
  invoiceUrl?: string;
}

// Role targeting constants — used by all modules to declare who should see a notification
export const MANAGEMENT_ROLES = ['organization_admin', 'farm_manager'];
export const OPERATIONAL_ROLES = ['organization_admin', 'farm_manager', 'farm_worker'];
export const ADMIN_ONLY_ROLES = ['organization_admin'];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
    @Optional() @Inject(EmailService) private readonly emailServiceDb?: EmailService,
  ) {
    this.initializeTransporter();
  }

  // ============================================
  // IN-APP NOTIFICATION METHODS
  // ============================================

  /**
   * Create a new notification and emit via WebSocket
   */
  async createNotification(dto: CreateNotificationDto): Promise<NotificationResponseDto> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('notifications')
      .insert({
        user_id: dto.userId,
        organization_id: dto.organizationId,
        type: dto.type,
        title: dto.title,
        message: dto.message || null,
        data: dto.data || {},
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    // Emit notification via WebSocket
    this.gateway.sendToUser(dto.userId, data);
    this.logger.log(`Notification created and sent to user ${dto.userId}: ${dto.title}`);

    return data;
  }

  /**
   * Create notifications for multiple users
   */
  async createNotificationsForUsers(
    userIds: string[],
    organizationId: string,
    type: NotificationType,
    title: string,
    message?: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      organization_id: organizationId,
      type,
      title,
      message: message || null,
      data: data || {},
      is_read: false,
    }));

    const client = this.databaseService.getAdminClient();

    const { data: created, error } = await client
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      this.logger.error(`Failed to create bulk notifications: ${error.message}`);
      throw new Error(`Failed to create bulk notifications: ${error.message}`);
    }

    // Emit to each user
    for (const notification of created) {
      this.gateway.sendToUser(notification.user_id, notification);
    }

    this.logger.log(`Created ${created.length} notifications for ${userIds.length} users`);
  }

  /**
   * Resolve user IDs by role within an organization.
   * Queries organization_users JOIN roles to find users with matching role names.
   */
  private async getUserIdsByRoles(
    organizationId: string,
    roles: string[],
    excludeUserId?: string | null,
  ): Promise<string[]> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('organization_users')
      .select('user_id, roles!inner(name)')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('roles.name', roles);

    if (error) {
      this.logger.error(`Failed to resolve users by roles: ${error.message}`);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    let userIds = data.map((row: any) => row.user_id as string);

    // Exclude the actor (the user who triggered the action)
    if (excludeUserId) {
      userIds = userIds.filter((id) => id !== excludeUserId);
    }

    return userIds;
  }

  /**
   * Create notifications for users matching specific roles in an organization.
   * The actor (excludeUserId) is automatically excluded from recipients.
   *
   * @param organizationId - The organization to target
   * @param roles - Role names to target (e.g. MANAGEMENT_ROLES, OPERATIONAL_ROLES)
   * @param excludeUserId - The user who triggered the action (excluded from notifications), null for system/AI actions
   * @param type - Notification type enum value
   * @param title - Notification title
   * @param message - Optional notification message
   * @param data - Optional additional data payload
   */
  async createNotificationsForRoles(
    organizationId: string,
    roles: string[],
    excludeUserId: string | null,
    type: NotificationType,
    title: string,
    message?: string,
    data?: Record<string, any>,
  ): Promise<void> {
    try {
      const userIds = await this.getUserIdsByRoles(organizationId, roles, excludeUserId);

      if (userIds.length === 0) {
        this.logger.debug(`No users found for roles [${roles.join(', ')}] in org ${organizationId}`);
        return;
      }

      await this.createNotificationsForUsers(userIds, organizationId, type, title, message, data);
    } catch (error) {
      this.logger.warn(`Failed to create role-based notifications: ${error.message || error}`);
      // Never fail the main operation — notifications are best-effort
    }
  }

  /**
   * Emails of active members in an organization whose role name is in `roleNames`.
   */
  async getManagementEmailsForOrganization(
    organizationId: string,
    roleNames: string[] = MANAGEMENT_ROLES,
  ): Promise<string[]> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('organization_users')
      .select(
        'user_id, user_profiles!organization_users_user_profile_fkey(email), roles!inner(name)',
      )
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('roles.name', roleNames);

    if (error) {
      this.logger.warn(
        `getManagementEmailsForOrganization: query failed for org ${organizationId}: ${error.message}`,
      );
      return [];
    }

    const emails = new Set<string>();
    for (const row of data ?? []) {
      const profile = (row as { user_profiles?: { email?: string | null } }).user_profiles;
      const e = profile?.email?.trim().toLowerCase();
      if (e && e.includes('@')) {
        emails.add(e);
      }
    }
    return [...emails];
  }

  /**
   * Send the same operational email to each deduped management email (best-effort, no throw).
   */
  async sendOperationalEmailToManagementRoles(
    organizationId: string,
    payload: Pick<EmailOptions, 'subject' | 'html' | 'text'>,
    roleNames: string[] = MANAGEMENT_ROLES,
  ): Promise<void> {
    const recipients = await this.getManagementEmailsForOrganization(
      organizationId,
      roleNames,
    );
    if (recipients.length === 0) {
      this.logger.debug(
        `No management emails for org ${organizationId}; skipping operational email`,
      );
      return;
    }
    for (const to of recipients) {
      try {
        let ok = false;
        if (this.emailServiceDb) {
          ok = await this.emailServiceDb.sendRaw(to, payload.subject, payload.html, payload.text);
        } else {
          ok = await this.sendEmail({ to, ...payload });
        }
        if (!ok) {
          this.logger.warn(`Operational email not delivered to ${to} (transporter disabled or error)`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Operational email failed for ${to}: ${msg}`);
      }
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    organizationId: string,
    filters: NotificationFiltersDto = {},
  ): Promise<PaginatedResponse<NotificationResponseDto>> {
    const client = this.databaseService.getAdminClient();
    const page = (filters as any).page || 1;
    const pageSize = filters.limit || 50;

    // Count query
    let countQuery = client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('organization_id', organizationId);
    if (filters.isRead !== undefined) countQuery = countQuery.eq('is_read', filters.isRead);
    if (filters.type) countQuery = countQuery.eq('type', filters.type);
    const { count } = await countQuery;

    // Data query
    let query = client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (filters.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch notifications: ${error.message}`);
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return paginatedResponse(data || [], count || 0, page, pageSize);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string, organizationId: string): Promise<number> {
    const client = this.databaseService.getAdminClient();

    const { count, error } = await client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_read', false);

    if (error) {
      this.logger.error(`Failed to get unread count: ${error.message}`);
      return 0;
    }

    return count || 0;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to mark notification as read: ${error.message}`);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }

    // Notify all user's connected clients about the read status
    this.gateway.emitRead(userId, notificationId, new Date().toISOString());
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, organizationId: string): Promise<number> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_read', false)
      .select();

    if (error) {
      this.logger.error(`Failed to mark all notifications as read: ${error.message}`);
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }

    const count = data?.length || 0;

    // Notify all user's connected clients
    this.gateway.emitReadAll(userId, count, new Date().toISOString());

    return count;
  }

  /**
   * Get WebSocket connection status for a user
   */
  getConnectionStatus(userId: string): { isConnected: boolean; connectedUsers: number } {
    return {
      isConnected: this.gateway.isUserConnected(userId),
      connectedUsers: this.gateway.getConnectedUsersCount(),
    };
  }

  // ============================================
  // NOTIFICATION TRIGGER HELPERS
  // ============================================

  /**
   * Notify user of task assignment
   */
  async notifyTaskAssignment(
    assigneeUserId: string,
    organizationId: string,
    taskTitle: string,
    taskId: string,
    assignerName: string,
  ): Promise<void> {
    await this.createNotification({
      userId: assigneeUserId,
      organizationId,
      type: NotificationType.TASK_ASSIGNED,
      title: `New task assigned: ${taskTitle}`,
      message: `${assignerName} assigned you a new task`,
      data: { taskId, assignerName },
    });
  }

  /**
   * Notify user of order status change
   */
  async notifyOrderStatusChange(
    userId: string,
    organizationId: string,
    orderNumber: string,
    orderId: string,
    newStatus: string,
  ): Promise<void> {
    const statusLabels: Record<string, string> = {
      confirmed: 'confirmed',
      shipped: 'shipped',
      delivered: 'delivered',
      cancelled: 'cancelled',
    };

    await this.createNotification({
      userId,
      organizationId,
      type: NotificationType.ORDER_STATUS_CHANGED,
      title: `Order #${orderNumber} ${statusLabels[newStatus] || newStatus}`,
      message: `Your order status has been updated to ${statusLabels[newStatus] || newStatus}`,
      data: { orderId, orderNumber, status: newStatus },
    });
  }

  /**
   * Notify seller of new quote request
   */
  async notifyQuoteReceived(
    sellerUserId: string,
    organizationId: string,
    productTitle: string,
    quoteRequestId: string,
    buyerName: string,
  ): Promise<void> {
    await this.createNotification({
      userId: sellerUserId,
      organizationId,
      type: NotificationType.QUOTE_RECEIVED,
      title: `New quote request: ${productTitle}`,
      message: `${buyerName} requested a quote for ${productTitle}`,
      data: { quoteRequestId, productTitle, buyerName },
    });
  }

  /**
   * Notify buyer of quote response
   */
  async notifyQuoteResponded(
    buyerUserId: string,
    organizationId: string,
    productTitle: string,
    quoteRequestId: string,
    sellerName: string,
    quotedPrice: number,
    currency: string,
  ): Promise<void> {
    await this.createNotification({
      userId: buyerUserId,
      organizationId,
      type: NotificationType.QUOTE_RESPONDED,
      title: `Quote received: ${productTitle}`,
      message: `${sellerName} quoted ${quotedPrice} ${currency} for ${productTitle}`,
      data: { quoteRequestId, productTitle, sellerName, quotedPrice, currency },
    });
  }

  /**
   * Check and create low stock notifications for an organization
   * Implements the notification creation logic in NestJS (not SQL)
   */
  async checkLowStockAndNotify(organizationId: string): Promise<{ created: number }> {
    const client = this.databaseService.getAdminClient();

    // Check if stock alerts are enabled for this organization
    const { data: org } = await client
      .from('organizations')
      .select('show_stock_alerts, last_stock_check_at')
      .eq('id', organizationId)
      .single();

    if (!org || !org.show_stock_alerts) {
      this.logger.debug(`Stock alerts disabled for organization ${organizationId}`);
      return { created: 0 };
    }

    // Rate limiting: only check once per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (org.last_stock_check_at && new Date(org.last_stock_check_at) > oneHourAgo) {
      this.logger.debug(`Stock check skipped for ${organizationId} (checked within last hour)`);
      return { created: 0 };
    }

    // Get admin/manager users to notify
    const { data: orgUsers } = await client
      .from('organization_users')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (!orgUsers || orgUsers.length === 0) {
      this.logger.warn(`No active users found for organization ${organizationId}`);
      return { created: 0 };
    }

    const userIds = orgUsers.map((u: any) => u.user_id);
    let notificationCount = 0;

    // Get low stock inventory items where quantity <= reorder_level
    const { data: rawInventoryItems } = await client
      .from('inventory_items')
      .select('id, name, quantity, reorder_level, unit_of_measure')
      .eq('organization_id', organizationId);

    const inventoryItems = rawInventoryItems
      ?.filter(item => item.quantity <= item.reorder_level)
      .map(item => ({
        item_id: item.id,
        item_name: item.name,
        current_quantity: item.quantity,
        minimum_stock: item.reorder_level,
        unit: item.unit_of_measure,
        shortage_quantity: Math.max(0, item.reorder_level - item.quantity),
      })) || [];

    // Get low stock product variants where stock <= min_stock
    const { data: rawVariants } = await client
      .from('product_variants')
      .select('id, name, product_id, stock, min_stock, unit_of_measure, products(name)')
      .eq('organization_id', organizationId);

    const variants = rawVariants
      ?.filter(variant => variant.stock <= variant.min_stock)
      .map(variant => {
        const productData = Array.isArray(variant.products) ? variant.products[0] : variant.products;
        return {
          variant_id: variant.id,
          variant_name: variant.name,
          item_id: variant.product_id,
          item_name: (productData as unknown as { name: string })?.name || 'Unknown Product',
          current_quantity: variant.stock,
          min_stock_level: variant.min_stock,
          unit: variant.unit_of_measure,
          shortage_quantity: Math.max(0, variant.min_stock - variant.stock),
        };
      }) || [];

    // Create notifications for low stock inventory items
    if (inventoryItems && Array.isArray(inventoryItems)) {
      for (const item of inventoryItems) {
        const message = `Stock faible pour "${item.item_name}": ${item.current_quantity} ${item.unit} restants (minimum: ${item.minimum_stock} ${item.unit}). Manque: ${item.shortage_quantity} ${item.unit}.`;

        await this.createNotificationsForUsers(
          userIds,
          organizationId,
          NotificationType.LOW_INVENTORY,
          `⚠️ Stock faible: ${item.item_name}`,
          message,
          {
            item_id: item.item_id,
            item_name: item.item_name,
            current_quantity: item.current_quantity,
            minimum_stock: item.minimum_stock,
            unit: item.unit,
            shortage_quantity: item.shortage_quantity,
          },
        );
        notificationCount++;
      }
    }

    // Create notifications for low stock variants
    if (variants && Array.isArray(variants)) {
      for (const variant of variants) {
        const message = `Stock faible pour "${variant.item_name} - ${variant.variant_name}": ${variant.current_quantity} ${variant.unit} restants (minimum: ${variant.min_stock_level} ${variant.unit}). Manque: ${variant.shortage_quantity} ${variant.unit}.`;

        await this.createNotificationsForUsers(
          userIds,
          organizationId,
          NotificationType.LOW_INVENTORY,
          `⚠️ Stock faible: ${variant.item_name} (${variant.variant_name})`,
          message,
          {
            variant_id: variant.variant_id,
            item_id: variant.item_id,
            item_name: variant.item_name,
            variant_name: variant.variant_name,
            current_quantity: variant.current_quantity,
            min_stock_level: variant.min_stock_level,
            unit: variant.unit,
            shortage_quantity: variant.shortage_quantity,
          },
        );
        notificationCount++;
      }
    }

    // Update last stock check timestamp
    await client
      .from('organizations')
      .update({ last_stock_check_at: new Date().toISOString() })
      .eq('id', organizationId);

    this.logger.log(`Low stock check completed for organization ${organizationId}. Notifications created: ${notificationCount}`);

    return { created: notificationCount };
  }

  /**
   * Get low stock items for an organization
   * Returns both inventory_items and product_variants that are below minimum stock
   */
   async getLowStockItems(organizationId: string): Promise<{
     inventoryItems: Array<{
       item_id: string;
       item_name: string;
       current_quantity: number;
       minimum_stock: number;
       unit: string;
       shortage_quantity: number;
     }>;
     variants: Array<{
       variant_id: string;
       variant_name: string;
       item_id: string;
       item_name: string;
       current_quantity: number;
       min_stock_level: number;
       unit: string;
       shortage_quantity: number;
     }>;
   }> {
     const client = this.databaseService.getAdminClient();

     // Get low stock inventory items where quantity <= reorder_level
     const { data: rawInventoryItems, error: itemsError } = await client
       .from('inventory_items')
       .select('id, name, quantity, reorder_level, unit_of_measure')
       .eq('organization_id', organizationId);

     if (itemsError) {
       this.logger.error(`Failed to get low stock inventory items: ${itemsError.message}`);
     }

     const inventoryItems = rawInventoryItems
       ?.filter(item => item.quantity <= item.reorder_level)
       .map(item => ({
         item_id: item.id,
         item_name: item.name,
         current_quantity: item.quantity,
         minimum_stock: item.reorder_level,
         unit: item.unit_of_measure,
         shortage_quantity: Math.max(0, item.reorder_level - item.quantity),
       })) || [];

     // Get low stock product variants where stock <= min_stock
     const { data: rawVariants, error: variantsError } = await client
       .from('product_variants')
       .select('id, name, product_id, stock, min_stock, unit_of_measure, products(name)')
       .eq('organization_id', organizationId);

     if (variantsError) {
       this.logger.error(`Failed to get low stock variants: ${variantsError.message}`);
     }

     const variants = rawVariants
       ?.filter(variant => variant.stock <= variant.min_stock)
       .map(variant => {
         const productData = Array.isArray(variant.products) ? variant.products[0] : variant.products;
         return {
           variant_id: variant.id,
           variant_name: variant.name,
           item_id: variant.product_id,
           item_name: (productData as unknown as { name: string })?.name || 'Unknown Product',
           current_quantity: variant.stock,
           min_stock_level: variant.min_stock,
           unit: variant.unit_of_measure,
           shortage_quantity: Math.max(0, variant.min_stock - variant.stock),
         };
       }) || [];

     return {
       inventoryItems,
       variants,
     };
   }

  // ============================================
  // EMAIL NOTIFICATION METHODS (EXISTING)
  // ============================================

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
    if (this.emailServiceDb) {
      return this.emailServiceDb.sendByType('quote_request_received', sellerEmail, data);
    }

    const html = this.generateQuoteRequestEmail(data);
    const text = this.generateQuoteRequestEmailText(data);
    return this.sendEmail({ to: sellerEmail, subject: `Nouvelle demande de devis - ${data.productTitle}`, html, text });
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

    <p>Vous avez reçu une nouvelle demande de devis sur AgroGina Marketplace.</p>

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
      © 2025 AgroGina Marketplace. Tous droits réservés.<br>
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
    text += `Vous avez reçu une nouvelle demande de devis sur AgroGina Marketplace.\n\n`;
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
    text += `\n© 2025 AgroGina Marketplace\n`;
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
    if (this.emailServiceDb) {
      return this.emailServiceDb.sendByType('quote_response_sent', buyerEmail, data as any);
    }

    const html = this.generateQuoteResponseEmail(data);
    const text = this.generateQuoteResponseEmailText(data);
    return this.sendEmail({ to: buyerEmail, subject: `Réponse à votre demande de devis - ${data.productTitle}`, html, text });
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
      © 2025 AgroGina Marketplace. Tous droits réservés.<br>
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
    text += `\n© 2025 AgroGina Marketplace\n`;
    text += `https://marketplace.thebzlab.online\n`;

    return text;
  }

  /**
   * Send order confirmation email to buyer
   */
  async sendOrderConfirmationEmail(data: OrderEmailData): Promise<boolean> {
    if (this.emailServiceDb) {
      return this.emailServiceDb.sendByType('order_confirmed', data.buyerEmail, data as any);
    }

    const html = this.generateOrderConfirmationEmail(data);
    const text = this.generateOrderConfirmationEmailText(data);
    return this.sendEmail({ to: data.buyerEmail, subject: `Commande confirmée #${data.orderNumber} - AgroGina Marketplace`, html, text });
  }

  /**
   * Send new order notification to seller
   */
  async sendNewOrderNotificationToSeller(sellerEmail: string, data: OrderEmailData): Promise<boolean> {
    if (this.emailServiceDb) {
      return this.emailServiceDb.sendByType('new_order_to_seller', sellerEmail, data as any);
    }

    const html = this.generateNewOrderSellerEmail(data);
    const text = this.generateNewOrderSellerEmailText(data);
    return this.sendEmail({ to: sellerEmail, subject: `Nouvelle commande #${data.orderNumber} - AgroGina Marketplace`, html, text });
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

    if (this.emailServiceDb) {
      return this.emailServiceDb.sendByType('order_status_update', data.buyerEmail, {
        ...data,
        statusText,
        statusMessage: `Votre commande a été ${statusText}.`,
      } as any);
    }

    const html = this.generateOrderStatusUpdateEmail(data);
    const text = this.generateOrderStatusUpdateEmailText(data);
    return this.sendEmail({ to: data.buyerEmail, subject: `Commande #${data.orderNumber} ${statusText} - AgroGina Marketplace`, html, text });
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
      © 2025 AgroGina Marketplace. Tous droits réservés.<br>
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
    text += `© 2025 AgroGina Marketplace\n`;
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
    <p>© 2025 AgroGina Marketplace</p>
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
    text += `© 2025 AgroGina Marketplace\n`;

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
    <p>© 2025 AgroGina Marketplace</p>
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

    text += `© 2025 AgroGina Marketplace\n`;

    return text;
  }

  /**
   * Send invoice email to customer/supplier
   */
  async sendInvoiceEmail(data: InvoiceEmailData): Promise<boolean> {
    // Use DB-backed template via EmailService if available
    if (this.emailServiceDb) {
      const isSales = data.invoiceType === 'sales';
      return this.emailServiceDb.sendByType('invoice_email', data.partyEmail, {
        partyName: data.partyName,
        invoiceNumber: data.invoiceNumber,
        invoiceType: data.invoiceType,
        invoiceTypeLabel: isSales ? 'Facture de Vente' : "Facture d'Achat",
        invoiceIntro: isSales
          ? `Veuillez trouver ci-joint votre facture de ${data.organizationName}.`
          : `Voici la facture d'achat de ${data.organizationName}.`,
        organizationName: data.organizationName,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        grandTotal: data.grandTotal,
        currency: data.currency,
        items: data.items,
        notes: data.notes,
      });
    }

    // Fallback to hardcoded HTML
    const isSales = data.invoiceType === 'sales';
    const subject = isSales
      ? `Facture ${data.invoiceNumber} - ${data.organizationName}`
      : `Facture d'achat ${data.invoiceNumber} - ${data.organizationName}`;

    const html = this.generateInvoiceEmail(data);
    const text = this.generateInvoiceEmailText(data);

    return this.sendEmail({
      to: data.partyEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Generate HTML email template for invoice
   */
  private generateInvoiceEmail(data: InvoiceEmailData): string {
    const isSales = data.invoiceType === 'sales';
    const itemsHtml = data.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          ${item.description}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${item.rate.toLocaleString()} ${data.currency}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${item.amount.toLocaleString()} ${data.currency}
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
    .invoice-number {
      background: #f0fdf4;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
      border: 2px solid #10b981;
    }
    .invoice-number strong {
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
    <h1>📄 ${isSales ? 'Facture' : 'Facture d\'achat'}</h1>
  </div>

  <div class="content">
    <p>Bonjour ${data.partyName},</p>

    <p>${isSales 
      ? `Veuillez trouver ci-joint votre facture de ${data.organizationName}.`
      : `Voici le récapitulatif de la facture ${data.invoiceNumber}.`}</p>

    <div class="invoice-number">
      <strong>Facture #${data.invoiceNumber}</strong>
    </div>

    <div class="info-row">
      <strong>Date de facturation:</strong> ${new Date(data.invoiceDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>

    <div class="info-row">
      <strong>Date d'échéance:</strong> ${new Date(data.dueDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>

    <h3 style="color: #059669; margin-top: 30px;">Détails de la facture</h3>

    <table>
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 10px; text-align: left;">Description</th>
          <th style="padding: 10px; text-align: center;">Qté</th>
          <th style="padding: 10px; text-align: right;">Prix unitaire</th>
          <th style="padding: 10px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr>
          <td colspan="3" style="padding: 10px; text-align: right;">Sous-total</td>
          <td style="padding: 10px; text-align: right;">${data.subtotal.toLocaleString()} ${data.currency}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding: 10px; text-align: right;">TVA</td>
          <td style="padding: 10px; text-align: right;">${data.taxAmount.toLocaleString()} ${data.currency}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3" style="padding: 15px; text-align: right;">Total TTC</td>
          <td style="padding: 15px; text-align: right; color: #059669;">
            ${data.grandTotal.toLocaleString()} ${data.currency}
          </td>
        </tr>
      </tbody>
    </table>

    ${data.notes ? `
    <div class="info-row">
      <strong>Notes:</strong><br>
      ${data.notes}
    </div>
    ` : ''}

    ${data.invoiceUrl ? `
    <div style="text-align: center;">
      <a href="${data.invoiceUrl}" class="button">
        Voir la facture
      </a>
    </div>
    ` : ''}

    <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
      ${isSales 
        ? `Merci pour votre confiance. Pour toute question concernant cette facture, n'hésitez pas à nous contacter.`
        : `Cette facture a été envoyée automatiquement depuis AGROGINA.`}
    </p>
  </div>

  <div class="footer">
    <p>
      ${data.organizationName}<br>
      Envoyé via AGROGINA
    </p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text version of invoice email
   */
  private generateInvoiceEmailText(data: InvoiceEmailData): string {
    const isSales = data.invoiceType === 'sales';
    
    let text = `${isSales ? 'Facture' : 'Facture d\'achat'}\n\n`;
    text += `Bonjour ${data.partyName},\n\n`;
    text += `${isSales 
      ? `Veuillez trouver ci-joint votre facture de ${data.organizationName}.`
      : `Voici le récapitulatif de la facture ${data.invoiceNumber}.`}\n\n`;
    text += `Facture #${data.invoiceNumber}\n`;
    text += `Date de facturation: ${new Date(data.invoiceDate).toLocaleDateString('fr-FR')}\n`;
    text += `Date d'échéance: ${new Date(data.dueDate).toLocaleDateString('fr-FR')}\n\n`;
    text += `DÉTAILS DE LA FACTURE\n`;
    text += `${'='.repeat(50)}\n\n`;

    data.items.forEach(item => {
      text += `${item.description}\n`;
      text += `  Quantité: ${item.quantity}\n`;
      text += `  Prix unitaire: ${item.rate.toLocaleString()} ${data.currency}\n`;
      text += `  Total: ${item.amount.toLocaleString()} ${data.currency}\n\n`;
    });

    text += `${'='.repeat(50)}\n`;
    text += `Sous-total: ${data.subtotal.toLocaleString()} ${data.currency}\n`;
    text += `TVA: ${data.taxAmount.toLocaleString()} ${data.currency}\n`;
    text += `TOTAL TTC: ${data.grandTotal.toLocaleString()} ${data.currency}\n\n`;

    if (data.notes) {
      text += `Notes: ${data.notes}\n\n`;
    }

    if (data.invoiceUrl) {
      text += `Voir la facture: ${data.invoiceUrl}\n\n`;
    }

    text += `${data.organizationName}\n`;
    text += `Envoyé via AGROGINA\n`;

    return text;
  }

  async sendMarketplaceEmail(
    type: keyof typeof marketplaceEmailTemplates,
    to: string,
    data: Parameters<(typeof marketplaceEmailTemplates)[typeof type]>[0],
  ): Promise<boolean> {
    // Try DB template first
    if (this.emailServiceDb) {
      return this.emailServiceDb.sendByType(type, to, data as any);
    }

    // Fallback to hardcoded templates
    const templateFn = marketplaceEmailTemplates[type] as (data: any) => {
      subject: string;
      html: string;
      text: string;
    };
    const template = templateFn(data);
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }
}
