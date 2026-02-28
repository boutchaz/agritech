import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CreateTrialSubscriptionDto,
  PlanType as TrialPlanType,
} from './dto/create-trial-subscription.dto';
import { PlanType as CheckoutPlanType, BillingInterval } from './dto/checkout.dto';
import { CheckSubscriptionDto } from './dto/check-subscription.dto';
import {
  PolarWebhookEventType,
  PolarSubscriptionData,
} from './dto/webhook.dto';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class SubscriptionsService {
  private readonly supabaseAdmin: SupabaseClient;
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async createCheckoutUrl(
    userId: string,
    organizationId: string,
    planType: CheckoutPlanType,
    billingInterval: BillingInterval = BillingInterval.MONTH,
  ): Promise<{ checkoutUrl: string }> {
    // Verify user belongs to the organization
    const { data: orgUser, error: orgUserError } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id, role_id, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (orgUserError || !orgUser) {
      this.logger.error(
        `User ${userId} does not have access to organization ${organizationId}`,
      );
      throw new ForbiddenException('Access denied to organization');
    }

    const checkoutBaseUrl = this.configService.get<string>('POLAR_CHECKOUT_URL');
    if (!checkoutBaseUrl) {
      throw new BadRequestException('POLAR_CHECKOUT_URL is not configured');
    }

    const productId = this.getCheckoutProductId(planType, billingInterval);
    if (!productId) {
      throw new BadRequestException('Polar product ID is not configured');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
    const successUrl = frontendUrl ? `${frontendUrl}/checkout-success` : undefined;
    const cancelUrl = frontendUrl ? `${frontendUrl}/settings/subscription` : undefined;

    const checkoutUrl = new URL(checkoutBaseUrl);
    checkoutUrl.searchParams.set('product_id', productId);

    if (successUrl) {
      checkoutUrl.searchParams.set('success_url', successUrl);
    }
    if (cancelUrl) {
      checkoutUrl.searchParams.set('cancel_url', cancelUrl);
    }

    // Bind organization server-side to prevent tampering
    checkoutUrl.searchParams.set('metadata[organization_id]', organizationId);
    checkoutUrl.searchParams.set('metadata[plan_type]', planType);
    checkoutUrl.searchParams.set('metadata[billing_interval]', billingInterval);
    return { checkoutUrl: checkoutUrl.toString() };
  }

  async createTrialSubscription(
    userId: string,
    dto: CreateTrialSubscriptionDto,
  ) {
    const { organization_id, plan_type } = dto;

    this.logger.log(
      `Creating trial subscription for user ${userId} and organization ${organization_id}`,
    );

    // Debug: Check all organization memberships for this user
    this.logger.debug(`Checking organization memberships for user ${userId}`);
    const { data: allOrgUsers } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id, role_id, is_active')
      .eq('user_id', userId);

    this.logger.debug(
      `User ${userId} belongs to ${allOrgUsers?.length || 0} organizations: ${JSON.stringify(allOrgUsers)}`,
    );

    // Verify user belongs to the organization
    const { data: orgUser, error: orgUserError } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id, role_id, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .single();

    if (orgUserError || !orgUser) {
      this.logger.error(
        `User ${userId} does not belong to organization ${organization_id}. Error: ${JSON.stringify(orgUserError)}`,
      );
      this.logger.error(
        `Query result - orgUser: ${JSON.stringify(orgUser)}, orgUserError: ${JSON.stringify(orgUserError)}`,
      );
      throw new ForbiddenException(
        'User does not belong to this organization',
      );
    }

    // Check if organization already has a subscription
    const { data: existingSubscription, error: existingError } =
      await this.supabaseAdmin
        .from('subscriptions')
        .select('id, status')
        .eq('organization_id', organization_id)
        .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      this.logger.error(
        'Error checking existing subscription',
        existingError,
      );
      throw new InternalServerErrorException(
        'Failed to check existing subscription',
      );
    }

    // If organization has an active paid subscription, reject
    if (existingSubscription && existingSubscription.status === 'active') {
      throw new BadRequestException(
        'Organization already has an active subscription',
      );
    }

    // Calculate trial end date (14 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Map plan_type to plan_id for Polar.sh integration
    const planIdMap = {
      [TrialPlanType.STARTER]: 'starter-trial',
      [TrialPlanType.PROFESSIONAL]: 'professional-trial',
      [TrialPlanType.ENTERPRISE]: 'enterprise-trial',
    };

    const plan_id = planIdMap[plan_type] || planIdMap[TrialPlanType.PROFESSIONAL];

    let subscription: { id: string } | null = null;
    let upsertError: { message?: string } | null = null;

    if (existingSubscription) {
      // Update existing subscription
      this.logger.log(
        `Updating existing subscription: ${existingSubscription.id}`,
      );
      const { data: updatedSub, error: updateError } =
        await this.supabaseAdmin
          .from('subscriptions')
          .update({
            plan_id: plan_id,
            plan_type: this.mapTrialPlanToPlanType(plan_type),
            status: 'trialing',
            current_period_start: new Date().toISOString(),
            current_period_end: trialEndDate.toISOString(),
            cancel_at_period_end: false,
            // Add plan limits
            max_farms: this.getPlanLimits(plan_type).farms,
            max_parcels: this.getPlanLimits(plan_type).parcels,
            max_users: this.getPlanLimits(plan_type).users,
            max_satellite_reports: this.getPlanLimits(plan_type).satelliteReports,
          })
          .eq('id', existingSubscription.id)
          .select()
          .single();

      subscription = updatedSub;
      upsertError = updateError;
    } else {
      // Insert new subscription
      this.logger.log('Creating new subscription');
      const { data: newSub, error: insertError } = await this.supabaseAdmin
        .from('subscriptions')
        .insert({
          organization_id: organization_id,
          plan_id: plan_id,
          plan_type: this.mapTrialPlanToPlanType(plan_type),
          status: 'trialing',
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndDate.toISOString(),
          cancel_at_period_end: false,
          // Add plan limits
          max_farms: this.getPlanLimits(plan_type).farms,
          max_parcels: this.getPlanLimits(plan_type).parcels,
          max_users: this.getPlanLimits(plan_type).users,
          max_satellite_reports: this.getPlanLimits(plan_type).satelliteReports,
        })
        .select()
        .single();

      subscription = newSub;
      upsertError = insertError;
    }

    if (upsertError) {
      this.logger.error(
        'Error creating/updating subscription',
        upsertError,
      );
      throw new InternalServerErrorException(
        `Failed to create subscription: ${upsertError.message}`,
      );
    }

    this.logger.log(`Trial subscription created: ${subscription?.id}`);

    return { success: true, subscription };
  }

  async checkSubscription(userId: string, dto: CheckSubscriptionDto) {
    const { organizationId, feature } = dto;

    this.logger.log(
      `Checking subscription for user ${userId} and organization ${organizationId}`,
    );

    // Verify user belongs to the organization
    const { data: orgUser, error: orgUserError } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id, role_id, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (orgUserError || !orgUser) {
      this.logger.error(
        `User ${userId} does not have access to organization ${organizationId}`,
      );
      throw new ForbiddenException('Access denied to organization');
    }

    // Check subscription validity using service method
    const isValid = await this.hasValidSubscription(organizationId);

    // Get subscription details
    const { data: subscription } = await this.supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const response: any = {
      isValid: isValid === true,
      subscription,
      reason: !isValid
        ? !subscription
          ? 'no_subscription'
          : subscription.status === 'canceled'
            ? 'canceled'
            : subscription.status === 'past_due'
              ? 'past_due'
              : 'expired'
        : undefined,
    };

    // Check specific feature if requested
    if (feature && isValid) {
      response.hasFeature = await this.checkFeatureAccess(
        organizationId,
        feature,
        subscription?.plan_type || null,
      );
    }

     // Get usage stats if valid subscription
     if (isValid && subscription) {
       try {
         // Check if can create more resources
         // can_create_farm: Check if org can create more farms
         let canCreateFarm = true;
         const maxFarms = subscription.max_farms;
         if (maxFarms !== null && maxFarms !== undefined) {
           const { count: farmCount } = await this.supabaseAdmin
             .from('farms')
             .select('*', { count: 'exact', head: true })
             .eq('organization_id', organizationId);
           canCreateFarm = (farmCount || 0) < maxFarms;
         }

         // can_create_parcel: Check if org can create more parcels
         let canCreateParcel = true;
         const maxParcels = subscription.max_parcels;
         if (maxParcels !== null && maxParcels !== undefined) {
           const { count: parcelCount } = await this.supabaseAdmin
             .from('parcels')
             .select('parcels.id, farms!inner(organization_id)', {
               count: 'exact',
               head: true,
             })
             .eq('farms.organization_id', organizationId);
           canCreateParcel = (parcelCount || 0) < maxParcels;
         }

         // can_add_user: Check if org can add more users
         let canAddUser = true;
         const maxUsers = subscription.max_users;
         if (maxUsers !== null && maxUsers !== undefined) {
           const { count: userCount } = await this.supabaseAdmin
             .from('organization_users')
             .select('*', { count: 'exact', head: true })
             .eq('organization_id', organizationId)
             .eq('is_active', true);
           canAddUser = (userCount || 0) < maxUsers;
         }

        // Get current counts
        const { count: farmsCount } = await this.supabaseAdmin
          .from('farms')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        const { count: parcelsCount } = await this.supabaseAdmin
          .from('parcels')
          .select('parcels.id, farms!inner(organization_id)', {
            count: 'exact',
            head: true,
          })
          .eq('farms.organization_id', organizationId);

        const { count: usersCount } = await this.supabaseAdmin
          .from('organization_users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        response.usage = {
          farms: {
            current: farmsCount || 0,
            max: subscription.max_farms || 0,
            canCreate: canCreateFarm === true,
          },
          parcels: {
            current: parcelsCount || 0,
            max: subscription.max_parcels || 0,
            canCreate: canCreateParcel === true,
          },
          users: {
            current: usersCount || 0,
            max: subscription.max_users || 0,
            canAdd: canAddUser === true,
          },
        };
      } catch (error) {
        this.logger.warn('Error getting usage stats', error);
        // Don't fail the request if usage stats can't be retrieved
      }
    }

    this.logger.log(
      `Subscription check complete for organization ${organizationId}: isValid=${isValid}`,
    );

    return response;
  }

  /**
   * Grace period in days — matches frontend SUBSCRIPTION_CONFIG.GRACE_PERIOD_DAYS
   * Allows access for N days after subscription expires to cover weekend payment failures
   */
  private readonly GRACE_PERIOD_DAYS = 3;

  /**
   * Check if organization has a valid subscription
   * Migrated from has_valid_subscription SQL function
   */
  async hasValidSubscription(organizationId: string): Promise<boolean> {
    const { data: subscription, error } = await this.supabaseAdmin
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error checking subscription: ${error.message}`);
      return false;
    }

    if (!subscription) {
      return false;
    }

    const isValidStatus = ['active', 'trialing'].includes(subscription.status);

    // Apply grace period: allow access for GRACE_PERIOD_DAYS after expiration
    let isNotExpired = true;
    if (subscription.current_period_end) {
      const endDate = new Date(subscription.current_period_end);
      const endDateWithGrace = new Date(endDate);
      endDateWithGrace.setDate(endDateWithGrace.getDate() + this.GRACE_PERIOD_DAYS);
      isNotExpired = endDateWithGrace >= new Date();
    }

    return isValidStatus && isNotExpired;
  }

  async getSubscription(userId: string, organizationId: string) {
    this.logger.log(
      `Getting subscription for user ${userId} and organization ${organizationId}`,
    );

    this.logger.debug(`[getSubscription] Checking membership - userId: "${userId}", orgId: "${organizationId}", types: userId=${typeof userId}, orgId=${typeof organizationId}`);

    // First, check if user exists at all
    const { data: allUserOrgs, error: allOrgsError } = await this.supabaseAdmin
      .from('organization_users')
      .select('user_id, organization_id, role_id, is_active')
      .eq('user_id', userId);

    this.logger.debug(`[getSubscription] All user orgs query - count: ${allUserOrgs?.length || 0}, error: ${JSON.stringify(allOrgsError)}`);
    this.logger.debug(`[getSubscription] All user orgs data: ${JSON.stringify(allUserOrgs)}`);

    // Now check specific organization
    const { data: orgUser, error: orgUserError } = await this.supabaseAdmin
      .from('organization_users')
      .select('user_id, organization_id, role_id, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();

    this.logger.debug(`[getSubscription] Specific org check - found: ${!!orgUser}, orgUser: ${JSON.stringify(orgUser)}, error: ${JSON.stringify(orgUserError)}`);

    if (orgUserError || !orgUser) {
      // Return null instead of 403 for users without organization membership
      // This supports the onboarding flow where users may not have organization_users record yet
      this.logger.warn(
        `User ${userId} not found in organization ${organizationId}, returning null subscription`,
      );
      return null;
    }

    // Get subscription details
    const { data: subscription, error: subscriptionError } = await this.supabaseAdmin
      .from('subscriptions')
      .select('id, organization_id, status, plan_id, plan_type, current_period_start, current_period_end, cancel_at_period_end, max_farms, max_parcels, max_users, max_satellite_reports, billing_interval, created_at, updated_at')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      this.logger.error('Error fetching subscription', subscriptionError);
      throw new InternalServerErrorException(
        `Failed to fetch subscription: ${subscriptionError.message}`,
      );
    }

    // Return null if no subscription found (this is expected, not an error)
    return subscription || null;
  }

  /**
   * Get usage counts for an organization
   */
  async getUsageCounts(userId: string, organizationId: string) {
    this.logger.log(
      `Getting usage counts for user ${userId} and organization ${organizationId}`,
    );

    // Verify user belongs to the organization
    const { data: orgUser, error: orgUserError } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id, role_id, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (orgUserError || !orgUser) {
      this.logger.error(
        `User ${userId} does not have access to organization ${organizationId}`,
      );
      throw new ForbiddenException('Access denied to organization');
    }

    // Get farms count
    const { count: farmsCount } = await this.supabaseAdmin
      .from('farms')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Get farm IDs for parcels query
    const { data: farms } = await this.supabaseAdmin
      .from('farms')
      .select('id')
      .eq('organization_id', organizationId);

    const farmIds = farms?.map((f) => f.id) || [];
    let parcelsCount = 0;

    if (farmIds.length > 0) {
      const { count } = await this.supabaseAdmin
        .from('parcels')
        .select('*', { count: 'exact', head: true })
        .in('farm_id', farmIds);
      parcelsCount = count || 0;
    }

    // Get users count
    const { count: usersCount } = await this.supabaseAdmin
      .from('organization_users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    return {
      farms_count: farmsCount || 0,
      parcels_count: parcelsCount,
      users_count: usersCount || 0,
      satellite_reports_count: 0, // TODO: Add if satellite reports table exists
    };
  }

  /**
   * Handle Polar.sh webhook events
   * Updates subscription status based on events from Polar.sh
   */
  async handlePolarWebhook(eventType: string, eventData: any) {
    this.logger.log(`Processing Polar webhook: ${eventType}`);

    const webhookPayload = {
      type: eventType,
      data: eventData,
    };

    // Extract subscription data from webhook payload
    const subscriptionData = this.extractSubscriptionData(webhookPayload);
    if (!subscriptionData) {
      this.logger.warn(
        `Webhook event ${eventType} has no valid subscription data, skipping`,
      );
      return { success: true, processed: false };
    }

    const eventId = [
      eventType,
      subscriptionData.id,
      subscriptionData.updated_at || subscriptionData.current_period_end || subscriptionData.created_at,
    ].join(':');

    // Find organization by Polar subscription metadata or organization_id
    const organizationId = subscriptionData.organization_id;

    if (!organizationId) {
      this.logger.error(
        `Webhook event ${eventType} missing organization_id in metadata`,
      );
      throw new BadRequestException('Missing organization_id in subscription metadata');
    }

    // Check if webhook was already processed (idempotency)
    const existingWebhook = await this.supabaseAdmin
      .from('polar_webhooks')
      .select('id, processed')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingWebhook.data) {
      this.logger.log(`Webhook ${eventId} already processed, skipping`);
      return { success: true, processed: false, duplicate: true };
    }

    // Process the webhook based on event type
    const result = await this.processSubscriptionEvent(
      eventType as PolarWebhookEventType,
      organizationId,
      subscriptionData,
    );

    // Log webhook as processed
    await this.supabaseAdmin.from('polar_webhooks').insert({
      event_id: eventId,
      event_type: eventType,
      payload: webhookPayload,
      processed: true,
      processed_at: new Date().toISOString(),
    });

    this.logger.log(
      `Webhook ${eventId} processed successfully: ${JSON.stringify(result)}`,
    );

    return { success: true, processed: true, result };
  }

  /**
   * Extract subscription data from Polar webhook payload
   */
  private extractSubscriptionData(
    webhookPayload: { type: string; data: any },
  ): PolarSubscriptionData | null {
    try {
      const subscriptionData = webhookPayload.data;

      if (!subscriptionData) {
        this.logger.error('Webhook payload missing data');
        return null;
      }

      const normalizeDate = (value: unknown): string | undefined => {
        if (!value) return undefined;
        if (typeof value === 'string') return value;
        if (typeof value === 'number') {
          const timestamp = value > 1_000_000_000_000 ? value : value * 1000;
          return new Date(timestamp).toISOString();
        }
        return undefined;
      };

      // Extract organization_id from metadata (should be set during checkout creation)
      const organizationId =
        subscriptionData.metadata?.organization_id || subscriptionData.organization_id;

      // Plan type, product id, and billing interval reconciliation
      const metadataPlanType = subscriptionData.metadata?.plan_type as string | undefined;
      const productId = subscriptionData.product?.id || subscriptionData.product_id;
      const priceId = subscriptionData.price_id || subscriptionData.price?.id;
      // Polar sends recurring_interval on subscription objects (month | year)
      const billingInterval =
        subscriptionData.recurring_interval ||
        subscriptionData.metadata?.billing_interval ||
        'month';

      return {
        id: subscriptionData.id,
        organization_id: organizationId,
        status: subscriptionData.status,
        product_id: productId,
        price_id: priceId,
        current_period_start:
          normalizeDate(subscriptionData.current_period_start) ||
          new Date().toISOString(),
        current_period_end:
          normalizeDate(subscriptionData.current_period_end) ||
          new Date().toISOString(),
        cancel_at_period_end: subscriptionData.cancel_at_period_end ?? false,
        created_at: normalizeDate(subscriptionData.created_at) || new Date().toISOString(),
        updated_at: normalizeDate(subscriptionData.updated_at),
        user_id: subscriptionData.user_id,
        customer_id: subscriptionData.customer_id,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency,
        recurring: subscriptionData.recurring,
        trial_end: normalizeDate(subscriptionData.trial_end),
        plan_type: metadataPlanType,
        billing_interval: billingInterval,
        metadata: subscriptionData.metadata,
      };
    } catch (error) {
      this.logger.error('Error extracting subscription data from webhook', error);
      return null;
    }
  }

  /**
   * Process subscription event based on type
   * Updates both polar_subscriptions and subscriptions tables
   */
  private async processSubscriptionEvent(
    eventType: PolarWebhookEventType,
    organizationId: string,
    subscriptionData: PolarSubscriptionData,
  ) {
    // First, update the polar_subscriptions table (Polar-specific data)
    const polarUpdateData: any = {
      organization_id: organizationId,
      polar_subscription_id: subscriptionData.id,
      polar_customer_id: subscriptionData.customer_id,
      polar_product_id: subscriptionData.product_id,
      status: subscriptionData.status,
      current_period_start: subscriptionData.current_period_start,
      current_period_end: subscriptionData.current_period_end,
      cancel_at_period_end: subscriptionData.cancel_at_period_end,
      billing_interval: subscriptionData.billing_interval || 'month',
      metadata: {
        price_id: subscriptionData.price_id,
        user_id: subscriptionData.user_id,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency,
        recurring: subscriptionData.recurring,
        trial_end: subscriptionData.trial_end,
        plan_type: subscriptionData.plan_type,
        billing_interval: subscriptionData.billing_interval,
        raw: subscriptionData.metadata,
      },
    };

    // Handle cancellation timestamp
    if (eventType === PolarWebhookEventType.SUBSCRIPTION_CANCELLED ||
        eventType === PolarWebhookEventType.SUBSCRIPTION_REVOKED) {
      polarUpdateData.canceled_at = new Date().toISOString();
    }

    // Upsert to polar_subscriptions table
    const { data: polarSub, error: polarError } = await this.supabaseAdmin
      .from('polar_subscriptions')
      .upsert(polarUpdateData, {
        onConflict: 'polar_subscription_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (polarError) {
      this.logger.error('Error upserting polar_subscriptions', polarError);
      throw new InternalServerErrorException('Failed to update Polar subscription');
    }

    // Also sync the main subscriptions table for backward compatibility
    // Get current subscription from database
    const { data: existingSubscription } = await this.supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    let subscriptionUpdateData: any = {};
    let shouldInsertSubscription = false;

    switch (eventType) {
      case PolarWebhookEventType.SUBSCRIPTION_CREATED:
      case PolarWebhookEventType.SUBSCRIPTION_ACTIVE:
        // New subscription or subscription activated after payment
        subscriptionUpdateData = {
          status: 'active',
          current_period_start: subscriptionData.current_period_start,
          current_period_end: subscriptionData.current_period_end,
          cancel_at_period_end: subscriptionData.cancel_at_period_end,
          billing_interval: subscriptionData.billing_interval || 'month',
          updated_at: new Date().toISOString(),
        };

        // Map Polar product to plan type, prefer explicit metadata
        const planType = this.mapPolarProductToPlan(
          subscriptionData.product_id,
          subscriptionData.plan_type,
        );
        if (planType) {
          subscriptionUpdateData.plan_type = planType;
          // Add plan limits based on the mapped plan type
          const limits = this.getPlanLimitsForType(planType);
          subscriptionUpdateData.max_farms = limits.farms;
          subscriptionUpdateData.max_parcels = limits.parcels;
          subscriptionUpdateData.max_users = limits.users;
          subscriptionUpdateData.max_satellite_reports = limits.satelliteReports;
        }

        if (!existingSubscription) {
          shouldInsertSubscription = true;
          subscriptionUpdateData.organization_id = organizationId;
          subscriptionUpdateData.plan_id = subscriptionData.product_id;
          subscriptionUpdateData.created_at = subscriptionData.created_at;
        }
        break;

      case PolarWebhookEventType.SUBSCRIPTION_UPDATED:
        // Subscription updated (plan change, renewal, etc.)
        subscriptionUpdateData = {
          status: subscriptionData.status,
          current_period_start: subscriptionData.current_period_start,
          current_period_end: subscriptionData.current_period_end,
          cancel_at_period_end: subscriptionData.cancel_at_period_end,
          billing_interval: subscriptionData.billing_interval || 'month',
          updated_at: new Date().toISOString(),
        };

        // Update plan if changed
        if (subscriptionData.product_id) {
          const mappedPlanType = this.mapPolarProductToPlan(
            subscriptionData.product_id,
            subscriptionData.plan_type,
          );
          if (mappedPlanType) {
            subscriptionUpdateData.plan_type = mappedPlanType;
            subscriptionUpdateData.plan_id = subscriptionData.product_id;
            // Update plan limits when plan changes
            const limits = this.getPlanLimitsForType(mappedPlanType);
            subscriptionUpdateData.max_farms = limits.farms;
            subscriptionUpdateData.max_parcels = limits.parcels;
            subscriptionUpdateData.max_users = limits.users;
            subscriptionUpdateData.max_satellite_reports = limits.satelliteReports;
          }
        }
        break;

      case PolarWebhookEventType.SUBSCRIPTION_CANCELLED:
        // Subscription cancelled (but may still be active until period end)
        subscriptionUpdateData = {
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        };

        // If already past period end, mark as canceled
        if (existingSubscription) {
          const periodEnd = new Date(existingSubscription.current_period_end);
          if (periodEnd < new Date()) {
            subscriptionUpdateData.status = 'canceled';
          }
        }
        break;

      case PolarWebhookEventType.SUBSCRIPTION_REVOKED:
        // Subscription revoked (immediate cancellation)
        subscriptionUpdateData = {
          status: 'canceled',
          updated_at: new Date().toISOString(),
        };
        break;

      case PolarWebhookEventType.SUBSCRIPTION_PAST_DUE:
        subscriptionUpdateData = {
          status: 'past_due',
          updated_at: new Date().toISOString(),
        };
        break;

      case PolarWebhookEventType.SUBSCRIPTION_TRIAL_ENDING:
        // Trial is ending soon, notification only
        this.logger.log(
          `Trial ending for organization ${organizationId} at ${subscriptionData.trial_end}`,
        );
        return {
          event: 'trial_ending',
          organizationId,
          trialEnd: subscriptionData.trial_end,
          polarSubscription: polarSub,
        };

      default:
        this.logger.warn(`Unknown webhook event type: ${eventType}`);
        return { event: 'unknown', eventType };
    }

    // Apply the update or insert to subscriptions table
    let mainSubscriptionResult: unknown;
    if (shouldInsertSubscription) {
      const { data, error } = await this.supabaseAdmin
        .from('subscriptions')
        .insert(subscriptionUpdateData)
        .select()
        .single();

      if (error) {
        this.logger.error('Error inserting subscription from webhook', error);
        // Don't throw - we already logged to polar_subscriptions
        mainSubscriptionResult = { error: error.message };
      } else {
        mainSubscriptionResult = data;
      }
    } else if (existingSubscription) {
      const { data, error } = await this.supabaseAdmin
        .from('subscriptions')
        .update(subscriptionUpdateData)
        .eq('id', existingSubscription.id)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating subscription from webhook', error);
        // Don't throw - we already logged to polar_subscriptions
        mainSubscriptionResult = { error: error.message };
      } else {
        mainSubscriptionResult = data;
      }
    } else {
      this.logger.warn(
        `No existing subscription found for organization ${organizationId}`,
      );
      mainSubscriptionResult = { warning: 'not_found', organizationId };
    }

    return {
      event: eventType,
      organizationId,
      polarSubscription: polarSub,
      mainSubscription: mainSubscriptionResult,
    };
  }

  /**
   * Map Polar product ID to plan type
   * Maps 'starter' to 'essential' to match frontend plan types
   */
  private mapPolarProductToPlan(productId: string, planTypeFromMetadata?: string | null): string | null {
    // Prefer explicit plan type from checkout metadata to avoid guessing by GUID substring
    if (planTypeFromMetadata) {
      const normalized = planTypeFromMetadata.toLowerCase();
      if (normalized === 'starter') return 'essential';
      if (['essential', 'professional', 'enterprise'].includes(normalized)) {
        return normalized;
      }
    }

    // Fallback to configured product IDs from env
    const essentialId = this.configService.get<string>('POLAR_ESSENTIAL_PRODUCT_ID');
    const professionalId = this.configService.get<string>('POLAR_PROFESSIONAL_PRODUCT_ID');
    const enterpriseId = this.configService.get<string>('POLAR_ENTERPRISE_PRODUCT_ID');

    if (productId && essentialId && productId === essentialId) return 'essential';
    if (productId && professionalId && productId === professionalId) return 'professional';
    if (productId && enterpriseId && productId === enterpriseId) return 'enterprise';

    // Last resort: heuristic substring match for legacy data
    const lowerProductId = productId?.toLowerCase() || '';
    if (lowerProductId.includes('starter')) return 'essential';
    if (lowerProductId.includes('professional') || lowerProductId.includes('pro')) return 'professional';
    if (lowerProductId.includes('enterprise')) return 'enterprise';

    // Default to professional if still unknown
    return 'professional';
  }

  /**
   * Map trial plan type to database plan_type
   * Maps PlanType enum values to frontend-compatible plan types
   */
  private mapTrialPlanToPlanType(planType: TrialPlanType): string {
    // Map backend PlanType enum to frontend plan types
    switch (planType) {
      case TrialPlanType.STARTER:
        return 'essential'; // Map starter to essential for frontend compatibility
      case TrialPlanType.PROFESSIONAL:
        return 'professional';
      case TrialPlanType.ENTERPRISE:
        return 'enterprise';
      default:
        return 'professional'; // Default to professional
    }
  }

  private getCheckoutProductId(
    planType: CheckoutPlanType,
    billingInterval: BillingInterval = BillingInterval.MONTH,
  ): string | undefined {
    const isYearly = billingInterval === BillingInterval.YEAR;

    switch (planType) {
      case CheckoutPlanType.ESSENTIAL:
        return this.configService.get<string>(
          isYearly ? 'POLAR_ESSENTIAL_YEARLY_PRODUCT_ID' : 'POLAR_ESSENTIAL_PRODUCT_ID',
        );
      case CheckoutPlanType.PROFESSIONAL:
        return this.configService.get<string>(
          isYearly ? 'POLAR_PROFESSIONAL_YEARLY_PRODUCT_ID' : 'POLAR_PROFESSIONAL_PRODUCT_ID',
        );
      case CheckoutPlanType.ENTERPRISE:
        return this.configService.get<string>(
          isYearly ? 'POLAR_ENTERPRISE_YEARLY_PRODUCT_ID' : 'POLAR_ENTERPRISE_PRODUCT_ID',
        );
      case CheckoutPlanType.CORE:
        return this.configService.get<string>('POLAR_BASE_PRODUCT_ID');
      default:
        return undefined;
    }
  }

  /**
   * Get plan limits based on plan type
   * These limits match the frontend SUBSCRIPTION_PLANS configuration
   */
  private getPlanLimits(planType: TrialPlanType): {
    farms: number;
    parcels: number;
    users: number;
    satelliteReports: number;
  } {
    switch (planType) {
      case TrialPlanType.STARTER:
        return {
          farms: 2,
          parcels: 25,
          users: 5,
          satelliteReports: 0,
        };
      case TrialPlanType.PROFESSIONAL:
        return {
          farms: 10,
          parcels: 200,
          users: 25,
          satelliteReports: 10,
        };
      case TrialPlanType.ENTERPRISE:
        return {
          farms: 999999,
          parcels: 999999,
          users: 999999,
          satelliteReports: 999999,
        };
      default:
        return {
          farms: 2,
          parcels: 25,
          users: 5,
          satelliteReports: 0,
        };
    }
  }

  /**
   * Get plan limits based on plan type string (from webhook or database)
   * Handles both frontend ('essential', 'professional', 'enterprise') and legacy ('starter') types
   */
  private getPlanLimitsForType(planType: string): {
    farms: number;
    parcels: number;
    users: number;
    satelliteReports: number;
  } {
    // Normalize 'starter' to 'essential'
    const normalized = planType === 'starter' ? 'essential' : planType;

    switch (normalized) {
      case 'essential':
        return {
          farms: 2,
          parcels: 25,
          users: 5,
          satelliteReports: 0,
        };
      case 'professional':
        return {
          farms: 10,
          parcels: 200,
          users: 25,
          satelliteReports: 10,
        };
      case 'enterprise':
        return {
          farms: 999999,
          parcels: 999999,
          users: 999999,
          satelliteReports: 999999,
        };
      default:
        // Default to essential limits
        return {
          farms: 2,
          parcels: 25,
          users: 5,
          satelliteReports: 0,
        };
    }
  }

  private async checkFeatureAccess(
    organizationId: string,
    featureName: string,
    planType: string | null,
  ): Promise<boolean> {
    const normalizedFeature = featureName.trim().toLowerCase();

    const { data: module, error: moduleError } = await this.supabaseAdmin
      .from('modules')
      .select('id, required_plan, is_active, is_available, is_required, slug, name')
      .or(`slug.eq.${normalizedFeature},name.eq.${normalizedFeature}`)
      .maybeSingle();

    if (moduleError) {
      this.logger.warn('Error fetching module for feature access', moduleError);
      return false;
    }

    if (!module || module.is_available === false || module.is_active === false) {
      return false;
    }

    if (module.required_plan && !this.isPlanAtLeast(planType, module.required_plan)) {
      return false;
    }

    if (module.is_required) {
      return true;
    }

    const { data: orgModule, error: orgModuleError } = await this.supabaseAdmin
      .from('organization_modules')
      .select('is_active')
      .eq('organization_id', organizationId)
      .eq('module_id', module.id)
      .maybeSingle();

    if (orgModuleError) {
      this.logger.warn('Error fetching organization module status', orgModuleError);
      return false;
    }

    return orgModule?.is_active === true;
  }

  private isPlanAtLeast(planType: string | null, requiredPlan: string): boolean {
    if (!planType) {
      return false;
    }

    const normalizedPlan = planType === 'starter' ? 'essential' : planType;
    const normalizedRequired =
      requiredPlan === 'starter' ? 'essential' : requiredPlan;
    const planOrder = ['essential', 'professional', 'enterprise'];
    const planIndex = planOrder.indexOf(normalizedPlan);
    const requiredIndex = planOrder.indexOf(normalizedRequired);

    if (planIndex === -1 || requiredIndex === -1) {
      return false;
    }

    return planIndex >= requiredIndex;
  }

  /**
   * Verify Polar webhook signature
   * Polar uses HMAC-SHA256 for webhook signature verification
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    try {
      // Polar may send signature as "sha256=<hex_signature>" or raw hex
      const parts = signature.split('=');
      const algorithm = parts.length > 1 ? parts[0] : 'sha256';
      const expectedSignature = parts.length > 1 ? parts[1] : signature;

      if (algorithm !== 'sha256') {
        this.logger.error(`Unsupported signature algorithm: ${algorithm}`);
        return false;
      }

      // Compute HMAC-SHA256 of payload
      const hmac = createHmac('sha256', secret);
      hmac.update(payload);
      const computedSignature = hmac.digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const computedBuffer = Buffer.from(computedSignature, 'utf8');
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

      if (computedBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(computedBuffer, expectedBuffer);
    } catch (error) {
      this.logger.error('Error verifying webhook signature', error);
      return false;
    }
  }
}
