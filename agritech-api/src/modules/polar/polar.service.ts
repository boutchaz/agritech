import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface SubscriptionPricing {
  config_key: string;
  value: number;
}

export interface ModuleSubscriptionPriceResult {
  base_price: number;
  modules_price: number;
  total_price: number;
}

export interface CreateOrUpdatePolarSubscriptionDto {
  organizationId: string;
  polarSubscriptionId: string;
  polarCustomerId: string;
  polarProductId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  metadata?: Record<string, any>;
}

export interface LogPolarWebhookDto {
  eventId: string;
  eventType: string;
  payload: Record<string, any>;
}

@Injectable()
export class PolarService {
  private readonly logger = new Logger(PolarService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get subscription pricing configuration
   * Moved from SQL: get_subscription_pricing()
   */
  async getSubscriptionPricing(): Promise<SubscriptionPricing[]> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('subscription_pricing')
      .select('config_key, value')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch subscription pricing: ${error.message}`);
    }

    return (data || []) as SubscriptionPricing[];
  }

  /**
   * Calculate subscription price for selected modules
   * Moved from SQL: calculate_module_subscription_price()
   */
  async calculateModuleSubscriptionPrice(moduleSlugs: string[]): Promise<ModuleSubscriptionPriceResult> {
    const client = this.databaseService.getAdminClient();

    // Get base price from subscription_pricing
    const { data: pricingData } = await client
      .from('subscription_pricing')
      .select('value')
      .eq('config_key', 'base_price_monthly')
      .eq('is_active', true)
      .single();

    const basePrice = pricingData?.value ? Number(pricingData.value) : 15;

    // Calculate modules price
    let modulesPrice = 0;

    if (moduleSlugs && moduleSlugs.length > 0) {
      // Get all requested modules
      const { data: modules } = await client
        .from('modules')
        .select('id, price_monthly')
        .in('slug', moduleSlugs)
        .eq('is_available', true);

      if (modules && modules.length > 0) {
        for (const module of modules) {
          // Check for plan-specific pricing
          const { data: modulePrice } = await client
            .from('module_prices')
            .select('price_monthly')
            .eq('module_id', module.id)
            .eq('is_active', true)
            .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`)
            .order('plan_type', { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle();

          const price = modulePrice?.price_monthly
            ? Number(modulePrice.price_monthly)
            : module.price_monthly
            ? Number(module.price_monthly)
            : 0;

          modulesPrice += price;
        }
      }
    }

    const totalPrice = basePrice + modulesPrice;

    return {
      base_price: basePrice,
      modules_price: modulesPrice,
      total_price: totalPrice,
    };
  }

  /**
   * Create or update Polar subscription
   * Moved from SQL: create_or_update_polar_subscription()
   */
  async createOrUpdateSubscription(dto: CreateOrUpdatePolarSubscriptionDto): Promise<{ subscriptionId: string }> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('polar_subscriptions')
      .upsert(
        {
          organization_id: dto.organizationId,
          polar_subscription_id: dto.polarSubscriptionId,
          polar_customer_id: dto.polarCustomerId,
          polar_product_id: dto.polarProductId,
          status: dto.status,
          current_period_start: dto.currentPeriodStart.toISOString(),
          current_period_end: dto.currentPeriodEnd.toISOString(),
          metadata: dto.metadata || {},
        },
        {
          onConflict: 'polar_subscription_id',
          ignoreDuplicates: false,
        },
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create/update Polar subscription: ${error.message}`);
    }

    this.logger.log(`Polar subscription ${dto.polarSubscriptionId} synced for organization ${dto.organizationId}`);

    return { subscriptionId: data.id };
  }

  /**
   * Log Polar webhook event
   * Moved from SQL: log_polar_webhook()
   */
  async logWebhook(dto: LogPolarWebhookDto): Promise<{ webhookId: string }> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('polar_webhooks')
      .insert({
        event_id: dto.eventId,
        event_type: dto.eventType,
        payload: dto.payload,
      })
      .select('id')
      .single();

    if (error && error.code !== '23505') { // 23505 is unique violation
      this.logger.error(`Failed to log Polar webhook: ${error.message}`);
      throw new Error(`Failed to log webhook: ${error.message}`);
    }

    this.logger.log(`Polar webhook ${dto.eventId} (${dto.eventType}) logged`);

    return { webhookId: data?.id || '' };
  }

  /**
   * Get Polar subscription for an organization
   */
  async getSubscription(organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('polar_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch Polar subscription: ${error.message}`);
    }

    return data;
  }

  /**
   * Process Polar webhook (entry point for Polar webhooks)
   * Handles subscription.created, subscription.updated, etc.
   */
  async processWebhook(eventType: string, payload: any): Promise<void> {
    this.logger.log(`Processing Polar webhook: ${eventType}`);

    // Log the webhook first
    await this.logWebhook({
      eventId: payload.id || `${eventType}_${Date.now()}`,
      eventType,
      payload,
    });

    // Handle different event types
    switch (eventType) {
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.cancelled':
        await this.handleSubscriptionEvent(payload, eventType);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(payload);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(payload);
        break;

      default:
        this.logger.warn(`Unhandled Polar webhook event: ${eventType}`);
    }
  }

  /**
   * Handle subscription events
   */
  private async handleSubscriptionEvent(payload: any, eventType: string): Promise<void> {
    const subscriptionData = payload.data;

    if (!subscriptionData) {
      this.logger.warn(`No subscription data in ${eventType} payload`);
      return;
    }

    // Find organization by Polar customer ID
    const client = this.databaseService.getAdminClient();
    const { data: org } = await client
      .from('organizations')
      .select('id')
      .eq('polar_customer_id', subscriptionData.customer)
      .maybeSingle();

    if (!org) {
      this.logger.warn(`No organization found for Polar customer: ${subscriptionData.customer}`);
      return;
    }

    // Create or update subscription
    await this.createOrUpdateSubscription({
      organizationId: org.id,
      polarSubscriptionId: subscriptionData.id,
      polarCustomerId: subscriptionData.customer,
      polarProductId: subscriptionData.items?.[0]?.price?.id || '',
      status: subscriptionData.status,
      currentPeriodStart: new Date(subscriptionData.current_period_start * 1000),
      currentPeriodEnd: new Date(subscriptionData.current_period_end * 1000),
      metadata: { original_payload: subscriptionData },
    });

    this.logger.log(`Processed ${eventType} for organization ${org.id}`);
  }

  /**
   * Handle payment succeeded event
   */
  private async handlePaymentSucceeded(payload: any): Promise<void> {
    const invoiceData = payload.data;

    this.logger.log(`Payment succeeded for invoice: ${invoiceData.id}`);

    // Could extend to update payment records, send notifications, etc.
  }

  /**
   * Handle payment failed event
   */
  private async handlePaymentFailed(payload: any): Promise<void> {
    const invoiceData = payload.data;

    this.logger.warn(`Payment failed for invoice: ${invoiceData.id}`);

    // Could extend to send notifications, flag account, etc.
  }
}
