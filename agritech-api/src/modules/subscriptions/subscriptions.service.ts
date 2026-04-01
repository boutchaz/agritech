import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

import { CheckSubscriptionDto } from './dto/check-subscription.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { CreateTrialSubscriptionDto } from './dto/create-trial-subscription.dto';
import {
  PolarWebhookEventType,
  PolarSubscriptionData,
} from './dto/webhook.dto';
import { CreateQuoteDto } from './dto/quote.dto';
import {
  RenewalNoticeDto,
  TerminateSubscriptionDto,
} from './dto/lifecycle.dto';
import {
  BillingCycle,
  FORMULA_POLICIES,
  SubscriptionFormula,
  SubscriptionLifecycleStatus,
  isFormulaAtLeast,
  mapFormulaToLegacyPlanType,
  mapLegacyPlanTypeToFormula,
  normalizeBillingCycle,
  normalizeFormula,
} from './subscription-domain';
import {
  QuoteBreakdown,
  SubscriptionPricingService,
} from './subscription-pricing.service';

export interface UsageCounts {
  farms_count: number;
  parcels_count: number;
  users_count: number;
  satellite_reports_count: number;
  hectares_count: number;
}

export interface SubscriptionRecord {
  id: string;
  organization_id: string;
  status: string;
  plan_id: string | null;
  plan_type: string | null;
  formula: string | null;
  billing_interval: string | null;
  billing_cycle: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  max_farms: number | null;
  max_parcels: number | null;
  max_users: number | null;
  max_satellite_reports: number | null;
  contracted_hectares: number | null;
  included_users: number | null;
  contract_start_at: string | null;
  contract_end_at: string | null;
  renewal_notice_days: number | null;
  payment_terms_days: number | null;
  next_billing_at: string | null;
  grace_period_ends_at: string | null;
  suspended_at: string | null;
  terminated_at: string | null;
  pending_formula: string | null;
  pending_billing_cycle: string | null;
  pending_pricing_snapshot: Record<string, unknown> | null;
  migration_effective_at: string | null;
  amount_ht: number | null;
  amount_tva: number | null;
  amount_ttc: number | null;
  currency: string | null;
  vat_rate: number | null;
  price_ht_per_ha_year: number | null;
  last_payment_notice_at: string | null;
  overdue_grace_days: number | null;
  suspension_notice_days: number | null;
  export_window_days: number | null;
}

@Injectable()
export class SubscriptionsService {
  private readonly supabaseAdmin: SupabaseClient;
  private readonly logger = new Logger(SubscriptionsService.name);

  /**
   * Access fallback after expiration when no explicit grace_period_ends_at is set.
   */
  private readonly GRACE_PERIOD_DAYS = 3;

  constructor(
    private readonly configService: ConfigService,
    private readonly pricingService: SubscriptionPricingService,
  ) {
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

  async getSubscriptionCatalog() {
    const formulas = Object.values(SubscriptionFormula).map((formula) => {
      const policy = FORMULA_POLICIES[formula];
      return {
        formula,
        minHectaresExclusive: policy.minHectaresExclusive,
        maxHectaresInclusive: policy.maxHectaresInclusive,
        includedUsers: policy.includedUsers,
        supportLevel: policy.supportLevel,
        slaAvailable: policy.slaAvailable,
        agromindIaLevel: policy.agromindIaLevel,
        marketplaceMode: policy.marketplaceMode,
      };
    });

    const sampleQuote = this.pricingService.createQuote({
      formula: SubscriptionFormula.STANDARD,
      contractedHectares: 1,
      billingCycle: BillingCycle.MONTHLY,
    });

    return {
      billingCycles: [
        BillingCycle.MONTHLY,
        BillingCycle.SEMIANNUAL,
        BillingCycle.ANNUAL,
      ],
      formulas,
      currency: sampleQuote.currency,
      vatRate: sampleQuote.vatRate,
    };
  }

  async createQuote(dto: CreateQuoteDto): Promise<QuoteBreakdown> {
    this.assertFormulaHectareRange(dto.formula, dto.contractedHectares);
    return this.pricingService.createQuote({
      formula: dto.formula,
      contractedHectares: dto.contractedHectares,
      billingCycle: dto.billingCycle,
      discountPercent: dto.discountPercent,
    });
  }

  async createCheckoutUrl(
    userId: string,
    organizationId: string,
    checkoutDto: CheckoutDto,
  ) {
    await this.ensureOrganizationMembership(userId, organizationId);

    const formulaInput = checkoutDto.formula || checkoutDto.planType;
    const formula = normalizeFormula(formulaInput);

    if (!formula) {
      throw new BadRequestException('Unsupported subscription formula');
    }

    const billingCycle = normalizeBillingCycle(checkoutDto.billingInterval);
    const contractedHectares =
      checkoutDto.contractedHectares ||
      this.getDefaultContractedHectares(formula);
    const resolvedFormula = this.resolveFormulaForHectares(
      formula,
      contractedHectares,
    );

    this.assertFormulaHectareRange(resolvedFormula, contractedHectares);

    const quote = this.pricingService.createQuote({
      formula: resolvedFormula,
      contractedHectares,
      billingCycle,
    });

    const checkoutBaseUrl = this.configService.get<string>('POLAR_CHECKOUT_URL');
    if (!checkoutBaseUrl) {
      throw new BadRequestException('POLAR_CHECKOUT_URL is not configured');
    }

    const productId = this.getCheckoutProductId(resolvedFormula, billingCycle);
    if (!productId) {
      throw new BadRequestException(
        `Polar product ID is not configured for ${resolvedFormula} (${billingCycle})`,
      );
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
    const successUrl = frontendUrl
      ? `${frontendUrl}/checkout-success`
      : undefined;
    const cancelUrl = frontendUrl
      ? `${frontendUrl}/settings/subscription`
      : undefined;

    const checkoutUrl = new URL(checkoutBaseUrl);
    checkoutUrl.searchParams.set('product_id', productId);

    if (successUrl) {
      checkoutUrl.searchParams.set('success_url', successUrl);
    }
    if (cancelUrl) {
      checkoutUrl.searchParams.set('cancel_url', cancelUrl);
    }

    checkoutUrl.searchParams.set('metadata[organization_id]', organizationId);
    checkoutUrl.searchParams.set('metadata[formula]', resolvedFormula);
    checkoutUrl.searchParams.set('metadata[billing_cycle]', billingCycle);
    checkoutUrl.searchParams.set(
      'metadata[contracted_hectares]',
      String(contractedHectares),
    );

    const { data: existingSubscription } = await this.supabaseAdmin
      .from('subscriptions')
      .select('id, current_period_end')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const migrationEffectiveAt = existingSubscription?.current_period_end
      ? existingSubscription.current_period_end
      : new Date().toISOString();

    const pendingPayload = {
      pending_formula: resolvedFormula,
      pending_billing_cycle: billingCycle,
      pending_pricing_snapshot: quote,
      migration_effective_at: migrationEffectiveAt,
      contracted_hectares: contractedHectares,
      included_users: FORMULA_POLICIES[resolvedFormula].includedUsers,
      renewal_notice_days: 60,
      payment_terms_days: 30,
      overdue_grace_days: 30,
      suspension_notice_days: 7,
      export_window_days: 30,
      currency: quote.currency,
      vat_rate: quote.vatRate,
      price_ht_per_ha_year: quote.priceHtPerHaYear,
      amount_ht: quote.cycleAmountHt,
      amount_tva: quote.cycleAmountTva,
      amount_ttc: quote.cycleAmountTtc,
    };

    if (existingSubscription?.id) {
      await this.supabaseAdmin
        .from('subscriptions')
        .update(pendingPayload)
        .eq('id', existingSubscription.id);
    } else {
      const legacyPlan = mapFormulaToLegacyPlanType(resolvedFormula);
      const legacyLimits = this.getLegacyResourceLimits(resolvedFormula);
      await this.supabaseAdmin.from('subscriptions').insert({
        organization_id: organizationId,
        status: SubscriptionLifecycleStatus.PENDING_RENEWAL,
        formula: resolvedFormula,
        plan_type: legacyPlan,
        billing_cycle: billingCycle,
        billing_interval: billingCycle,
        contracted_hectares: contractedHectares,
        included_users: FORMULA_POLICIES[resolvedFormula].includedUsers,
        max_farms: legacyLimits.farms,
        max_parcels: legacyLimits.parcels,
        max_users: legacyLimits.users,
        max_satellite_reports: legacyLimits.satelliteReports,
        contract_start_at: new Date().toISOString(),
        contract_end_at: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        next_billing_at: new Date().toISOString(),
        ...pendingPayload,
      });
    }

    return {
      checkoutUrl: checkoutUrl.toString(),
      formula: resolvedFormula,
      billingCycle,
      quoteSnapshot: quote,
    };
  }

  async createTrialSubscription(
    userId: string,
    dto: CreateTrialSubscriptionDto,
  ) {
    const { organization_id, plan_type } = dto;
    await this.ensureOrganizationMembership(userId, organization_id);

    const parsedFormula = normalizeFormula(plan_type);
    if (!parsedFormula) {
      throw new BadRequestException('Unsupported trial formula');
    }

    const formula = parsedFormula;

    const { data: existingSubscription, error: existingError } =
      await this.supabaseAdmin
        .from('subscriptions')
        .select('id, status, formula')
        .eq('organization_id', organization_id)
        .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      throw new InternalServerErrorException(
        `Failed to check existing subscription: ${existingError.message}`,
      );
    }

    if (
      existingSubscription &&
      [
        SubscriptionLifecycleStatus.ACTIVE,
        SubscriptionLifecycleStatus.TRIALING,
      ].includes(existingSubscription.status as SubscriptionLifecycleStatus)
    ) {
      throw new BadRequestException(
        'Organization already has an active subscription',
      );
    }

    const trialStart = new Date();
    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + 14);

    const contractedHectares = this.getDefaultContractedHectares(formula);
    const billingCycle = BillingCycle.MONTHLY;
    const quote = this.pricingService.createQuote({
      formula,
      contractedHectares,
      billingCycle,
    });

    const legacyPlan = mapFormulaToLegacyPlanType(formula);
    const legacyLimits = this.getLegacyResourceLimits(formula);

    const payload = {
      organization_id,
      plan_id: `${formula}-trial`,
      plan_type: legacyPlan,
      formula,
      status: SubscriptionLifecycleStatus.TRIALING,
      billing_interval: billingCycle,
      billing_cycle: billingCycle,
      current_period_start: trialStart.toISOString(),
      current_period_end: trialEnd.toISOString(),
      cancel_at_period_end: false,
      contracted_hectares: contractedHectares,
      included_users: FORMULA_POLICIES[formula].includedUsers,
      max_farms: legacyLimits.farms,
      max_parcels: legacyLimits.parcels,
      max_users: legacyLimits.users,
      max_satellite_reports: legacyLimits.satelliteReports,
      contract_start_at: trialStart.toISOString(),
      contract_end_at: trialEnd.toISOString(),
      renewal_notice_days: 60,
      payment_terms_days: 30,
      next_billing_at: trialEnd.toISOString(),
      grace_period_ends_at: trialEnd.toISOString(),
      currency: quote.currency,
      vat_rate: quote.vatRate,
      price_ht_per_ha_year: quote.priceHtPerHaYear,
      amount_ht: quote.cycleAmountHt,
      amount_tva: quote.cycleAmountTva,
      amount_ttc: quote.cycleAmountTtc,
    };

    const upsertResult = existingSubscription?.id
      ? await this.supabaseAdmin
          .from('subscriptions')
          .update(payload)
          .eq('id', existingSubscription.id)
          .select()
          .single()
      : await this.supabaseAdmin
          .from('subscriptions')
          .insert(payload)
          .select()
          .single();

    if (upsertResult.error) {
      throw new InternalServerErrorException(
        `Failed to create subscription: ${upsertResult.error.message}`,
      );
    }

    await this.logSubscriptionEvent({
      organizationId: organization_id,
      subscriptionId: upsertResult.data?.id || null,
      eventType: 'trial_started',
      actorType: 'user',
      actorId: userId,
      payload: {
        formula,
        trialStart: trialStart.toISOString(),
        trialEnd: trialEnd.toISOString(),
      },
    });

    return {
      success: true,
      subscription: upsertResult.data,
    };
  }

  async getSubscription(userId: string, organizationId: string) {
    const hasMembership = await this.hasOrganizationMembership(userId, organizationId);
    if (!hasMembership) {
      return null;
    }

    const { data: subscription, error } = await this.supabaseAdmin
      .from('subscriptions')
      .select(
        'id, organization_id, status, plan_id, plan_type, formula, billing_interval, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, max_farms, max_parcels, max_users, max_satellite_reports, contracted_hectares, included_users, contract_start_at, contract_end_at, renewal_notice_days, payment_terms_days, next_billing_at, grace_period_ends_at, suspended_at, terminated_at, pending_formula, pending_billing_cycle, pending_pricing_snapshot, migration_effective_at, amount_ht, amount_tva, amount_ttc, currency, vat_rate, price_ht_per_ha_year, last_payment_notice_at, overdue_grace_days, suspension_notice_days, export_window_days, created_at, updated_at',
      )
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new InternalServerErrorException(
        `Failed to fetch subscription: ${error.message}`,
      );
    }

    if (!subscription) {
      return null;
    }

    if (!subscription.formula && subscription.plan_type) {
      subscription.formula = mapLegacyPlanTypeToFormula(
        subscription.plan_type,
      );
    }

    if (!subscription.billing_cycle && subscription.billing_interval) {
      subscription.billing_cycle = normalizeBillingCycle(
        subscription.billing_interval,
      );
    }

    return subscription;
  }

  async getCurrentSubscription(userId: string, organizationId: string) {
    return this.getSubscription(userId, organizationId);
  }

  async getUsageCounts(userId: string, organizationId: string): Promise<UsageCounts> {
    await this.ensureOrganizationMembership(userId, organizationId);
    return this.getUsageCountsInternal(organizationId);
  }

  async checkSubscription(userId: string, dto: CheckSubscriptionDto) {
    const { organizationId, feature } = dto;
    await this.ensureOrganizationMembership(userId, organizationId);

    const isValid = await this.hasValidSubscription(organizationId);
    const subscription = await this.getSubscription(userId, organizationId);

    const response: {
      isValid: boolean;
      subscription: SubscriptionRecord | null;
      reason?: string;
      hasFeature?: boolean;
      usage?: {
        hectares: { current: number; max: number | null; allowed: boolean };
        users: { current: number; max: number | null; allowed: boolean };
        farms: { current: number; max: number | null; allowed: boolean };
        parcels: { current: number; max: number | null; allowed: boolean };
      };
    } = {
      isValid,
      subscription,
      reason: !isValid
        ? !subscription
          ? 'no_subscription'
          : subscription.status === SubscriptionLifecycleStatus.PAST_DUE
            ? 'past_due'
            : subscription.status === SubscriptionLifecycleStatus.SUSPENDED
              ? 'suspended'
              : subscription.status === SubscriptionLifecycleStatus.TERMINATED
                ? 'terminated'
                : subscription.status === SubscriptionLifecycleStatus.CANCELED
                  ? 'canceled'
                  : 'expired'
        : undefined,
    };

    if (feature && isValid && subscription) {
      response.hasFeature = await this.checkFeatureAccess(
        organizationId,
        feature,
        subscription.formula,
      );
    }

    if (subscription) {
      const usageCounts = await this.getUsageCountsInternal(organizationId);
      const includedUsers = subscription.included_users;
      const maxHectares = subscription.contracted_hectares;

      response.usage = {
        hectares: {
          current: usageCounts.hectares_count,
          max: maxHectares,
          allowed:
            maxHectares === null || usageCounts.hectares_count <= maxHectares,
        },
        users: {
          current: usageCounts.users_count,
          max: includedUsers,
          allowed:
            includedUsers === null || usageCounts.users_count <= includedUsers,
        },
        farms: {
          current: usageCounts.farms_count,
          max: subscription.max_farms,
          allowed:
            subscription.max_farms === null ||
            usageCounts.farms_count < subscription.max_farms,
        },
        parcels: {
          current: usageCounts.parcels_count,
          max: subscription.max_parcels,
          allowed:
            subscription.max_parcels === null ||
            usageCounts.parcels_count < subscription.max_parcels,
        },
      };
    }

    return response;
  }

  async hasValidSubscription(organizationId: string): Promise<boolean> {
    const { data: subscription, error } = await this.supabaseAdmin
      .from('subscriptions')
      .select('status, current_period_end, grace_period_ends_at')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error || !subscription) {
      return false;
    }

    const validStatuses = [
      SubscriptionLifecycleStatus.ACTIVE,
      SubscriptionLifecycleStatus.TRIALING,
      SubscriptionLifecycleStatus.PENDING_RENEWAL,
    ];

    if (!validStatuses.includes(subscription.status as SubscriptionLifecycleStatus)) {
      return false;
    }

    if (subscription.grace_period_ends_at) {
      return new Date(subscription.grace_period_ends_at) >= new Date();
    }

    if (subscription.current_period_end) {
      const endDateWithGrace = new Date(subscription.current_period_end);
      endDateWithGrace.setDate(
        endDateWithGrace.getDate() + this.GRACE_PERIOD_DAYS,
      );
      return endDateWithGrace >= new Date();
    }

    return true;
  }

  async registerRenewalNotice(userId: string, dto: RenewalNoticeDto) {
    await this.ensureOrganizationMembership(userId, dto.organizationId);

    const { data: subscription, error } = await this.supabaseAdmin
      .from('subscriptions')
      .select('id, status')
      .eq('organization_id', dto.organizationId)
      .maybeSingle();

    if (error || !subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.supabaseAdmin
      .from('subscriptions')
      .update({
        status: SubscriptionLifecycleStatus.PENDING_RENEWAL,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    await this.logSubscriptionEvent({
      organizationId: dto.organizationId,
      subscriptionId: subscription.id,
      eventType: 'renewal_notice_registered',
      actorType: 'user',
      actorId: userId,
      payload: { note: dto.note || null },
    });

    return { success: true };
  }

  async terminateSubscription(userId: string, dto: TerminateSubscriptionDto) {
    await this.ensureOrganizationMembership(userId, dto.organizationId);

    const { data: subscription, error } = await this.supabaseAdmin
      .from('subscriptions')
      .select('id, export_window_days')
      .eq('organization_id', dto.organizationId)
      .maybeSingle();

    if (error || !subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const terminatedAt = new Date();
    const exportWindowDays = subscription.export_window_days || 30;
    const exportDeadline = new Date(terminatedAt);
    exportDeadline.setDate(exportDeadline.getDate() + exportWindowDays);

    await this.supabaseAdmin
      .from('subscriptions')
      .update({
        status: SubscriptionLifecycleStatus.TERMINATED,
        terminated_at: terminatedAt.toISOString(),
        current_period_end: terminatedAt.toISOString(),
        grace_period_ends_at: exportDeadline.toISOString(),
        updated_at: terminatedAt.toISOString(),
      })
      .eq('id', subscription.id);

    await this.logSubscriptionEvent({
      organizationId: dto.organizationId,
      subscriptionId: subscription.id,
      eventType: 'subscription_terminated',
      actorType: 'user',
      actorId: userId,
      payload: {
        reason: dto.reason || null,
        exportDeadline: exportDeadline.toISOString(),
      },
    });

    return {
      success: true,
      terminatedAt: terminatedAt.toISOString(),
      exportDeadline: exportDeadline.toISOString(),
    };
  }

  /**
   * Daily lifecycle automation: renewal notices, overdue transitions, suspension, and export window checks.
   */
  @Cron('0 2 * * *', { name: 'subscription-lifecycle', timeZone: 'UTC' })
  async processLifecycleAutomation() {
    await this.processPendingMigrations();
    await this.processRenewalNotices();
    await this.processOverdueSubscriptions();
    await this.processSuspensions();
    await this.processTerminationWindows();
  }

  async handlePolarWebhook(eventType: string, eventData: Record<string, unknown>) {
    const webhookPayload = {
      type: eventType,
      data: eventData,
    };

    const subscriptionData = this.extractSubscriptionData(webhookPayload);
    if (!subscriptionData) {
      return { success: true, processed: false };
    }

    const eventId = [
      eventType,
      subscriptionData.id,
      subscriptionData.updated_at ||
        subscriptionData.current_period_end ||
        subscriptionData.created_at,
    ].join(':');

    if (!subscriptionData.organization_id) {
      throw new BadRequestException(
        'Missing organization_id in subscription metadata',
      );
    }

    const existingWebhook = await this.supabaseAdmin
      .from('polar_webhooks')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingWebhook.data) {
      return { success: true, processed: false, duplicate: true };
    }

    const result = await this.processSubscriptionEvent(
      eventType as PolarWebhookEventType,
      subscriptionData.organization_id,
      subscriptionData,
    );

    await this.supabaseAdmin.from('polar_webhooks').insert({
      event_id: eventId,
      event_type: eventType,
      payload: webhookPayload,
      processed: true,
      processed_at: new Date().toISOString(),
    });

    return { success: true, processed: true, result };
  }

  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const parts = signature.split('=');
      const algorithm = parts.length > 1 ? parts[0] : 'sha256';
      const expectedSignature = parts.length > 1 ? parts[1] : signature;

      if (algorithm !== 'sha256') {
        return false;
      }

      const hmac = createHmac('sha256', secret);
      hmac.update(payload);
      const computedSignature = hmac.digest('hex');

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

  private async ensureOrganizationMembership(userId: string, organizationId: string) {
    const { data: orgUser, error } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !orgUser) {
      throw new ForbiddenException('Access denied to organization');
    }
  }

  private async hasOrganizationMembership(userId: string, organizationId: string) {
    const { data: orgUser } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();

    return !!orgUser;
  }

  private assertFormulaHectareRange(
    formula: SubscriptionFormula,
    hectares: number,
  ) {
    const policy = FORMULA_POLICIES[formula];

    if (
      policy.minHectaresExclusive !== null &&
      hectares <= policy.minHectaresExclusive
    ) {
      throw new BadRequestException(
        `${formula} formula requires more than ${policy.minHectaresExclusive} hectares`,
      );
    }

    if (
      policy.maxHectaresInclusive !== null &&
      hectares > policy.maxHectaresInclusive
    ) {
      throw new BadRequestException(
        `${formula} formula supports up to ${policy.maxHectaresInclusive} hectares`,
      );
    }
  }

  private resolveFormulaForHectares(
    preferredFormula: SubscriptionFormula,
    hectares: number,
  ): SubscriptionFormula {
    const ordered = [
      SubscriptionFormula.STARTER,
      SubscriptionFormula.STANDARD,
      SubscriptionFormula.PREMIUM,
      SubscriptionFormula.ENTERPRISE,
    ];

    let requiredFormula = SubscriptionFormula.ENTERPRISE;

    for (const formula of ordered) {
      const policy = FORMULA_POLICIES[formula];
      const minOk =
        policy.minHectaresExclusive === null ||
        hectares > policy.minHectaresExclusive;
      const maxOk =
        policy.maxHectaresInclusive === null ||
        hectares <= policy.maxHectaresInclusive;

      if (minOk && maxOk) {
        requiredFormula = formula;
        break;
      }
    }

    return isFormulaAtLeast(preferredFormula, requiredFormula)
      ? preferredFormula
      : requiredFormula;
  }

  private getDefaultContractedHectares(formula: SubscriptionFormula): number {
    if (formula === SubscriptionFormula.STARTER) return 50;
    if (formula === SubscriptionFormula.STANDARD) return 200;
    if (formula === SubscriptionFormula.PREMIUM) return 500;
    return 501;
  }

  private getLegacyResourceLimits(formula: SubscriptionFormula) {
    switch (formula) {
      case SubscriptionFormula.STARTER:
        return { farms: 2, parcels: 25, users: 3, satelliteReports: 0 };
      case SubscriptionFormula.STANDARD:
        return { farms: 10, parcels: 200, users: 10, satelliteReports: 10 };
      case SubscriptionFormula.PREMIUM:
        return { farms: 20, parcels: 500, users: 25, satelliteReports: 50 };
      case SubscriptionFormula.ENTERPRISE:
        return {
          farms: 999999,
          parcels: 999999,
          users: 999999,
          satelliteReports: 999999,
        };
      default:
        return { farms: 2, parcels: 25, users: 3, satelliteReports: 0 };
    }
  }

  private getCheckoutProductId(
    formula: SubscriptionFormula,
    billingCycle: BillingCycle,
  ): string | undefined {
    const formulaKey = formula.toUpperCase();
    const cycleKey = billingCycle.toUpperCase();

    const directEnvKey = `POLAR_${formulaKey}_${cycleKey}_PRODUCT_ID`;
    const directValue = this.configService.get<string>(directEnvKey);
    if (directValue) {
      return directValue;
    }

    // Backward compatibility with legacy product environment variables.
    const legacyMap: Record<SubscriptionFormula, string> = {
      [SubscriptionFormula.STARTER]: 'ESSENTIAL',
      [SubscriptionFormula.STANDARD]: 'PROFESSIONAL',
      [SubscriptionFormula.PREMIUM]: 'ENTERPRISE',
      [SubscriptionFormula.ENTERPRISE]: 'ENTERPRISE',
    };

    const legacyPrefix = legacyMap[formula];
    if (billingCycle === BillingCycle.MONTHLY) {
      return (
        this.configService.get<string>(`POLAR_${legacyPrefix}_PRODUCT_ID`) ||
        (formula === SubscriptionFormula.STARTER
          ? this.configService.get<string>('POLAR_BASE_PRODUCT_ID')
          : undefined)
      );
    }

    if (billingCycle === BillingCycle.ANNUAL) {
      return this.configService.get<string>(
        `POLAR_${legacyPrefix}_YEARLY_PRODUCT_ID`,
      );
    }

    return this.configService.get<string>(
      `POLAR_${legacyPrefix}_SEMIANNUAL_PRODUCT_ID`,
    );
  }

  private extractSubscriptionData(webhookPayload: {
    type: string;
    data: Record<string, unknown>;
  }): PolarSubscriptionData | null {
    const subscriptionData = webhookPayload.data as Record<string, unknown>;

    if (!subscriptionData) {
      return null;
    }

    const metadata =
      (subscriptionData.metadata as Record<string, unknown>) || {};

    const normalizeDate = (value: unknown): string | undefined => {
      if (!value) return undefined;
      if (typeof value === 'string') return value;
      if (typeof value === 'number') {
        const timestamp = value > 1_000_000_000_000 ? value : value * 1000;
        return new Date(timestamp).toISOString();
      }
      return undefined;
    };

    const metadataBillingCycle =
      typeof metadata.billing_cycle === 'string'
        ? metadata.billing_cycle
        : typeof metadata.billing_interval === 'string'
          ? metadata.billing_interval
          : undefined;

    const recurringInterval =
      typeof subscriptionData.recurring_interval === 'string'
        ? subscriptionData.recurring_interval
        : undefined;

    const billing_cycle = normalizeBillingCycle(
      metadataBillingCycle || recurringInterval,
    );

    const organizationId =
      (typeof metadata.organization_id === 'string' &&
        metadata.organization_id) ||
      (typeof subscriptionData.organization_id === 'string'
        ? subscriptionData.organization_id
        : undefined);

    const metadataFormula =
      typeof metadata.formula === 'string'
        ? metadata.formula
        : typeof metadata.plan_type === 'string'
          ? metadata.plan_type
          : undefined;

    const product = subscriptionData.product as Record<string, unknown> | undefined;
    const price = subscriptionData.price as Record<string, unknown> | undefined;

    return {
      id: String(subscriptionData.id || ''),
      organization_id: organizationId || '',
      status: String(subscriptionData.status || ''),
      product_id: String(subscriptionData.product_id || product?.id || ''),
      price_id: String(subscriptionData.price_id || price?.id || ''),
      current_period_start:
        normalizeDate(subscriptionData.current_period_start) ||
        new Date().toISOString(),
      current_period_end:
        normalizeDate(subscriptionData.current_period_end) ||
        new Date().toISOString(),
      cancel_at_period_end: Boolean(subscriptionData.cancel_at_period_end),
      created_at:
        normalizeDate(subscriptionData.created_at) || new Date().toISOString(),
      updated_at: normalizeDate(subscriptionData.updated_at),
      user_id:
        typeof subscriptionData.user_id === 'string'
          ? subscriptionData.user_id
          : undefined,
      customer_id:
        typeof subscriptionData.customer_id === 'string'
          ? subscriptionData.customer_id
          : undefined,
      amount:
        typeof subscriptionData.amount === 'number'
          ? subscriptionData.amount
          : undefined,
      currency:
        typeof subscriptionData.currency === 'string'
          ? subscriptionData.currency
          : undefined,
      recurring:
        typeof subscriptionData.recurring === 'boolean'
          ? subscriptionData.recurring
          : undefined,
      trial_end: normalizeDate(subscriptionData.trial_end),
      plan_type: metadataFormula,
      billing_interval: billing_cycle,
      metadata,
    };
  }

  private mapPolarProductToFormula(
    productId: string,
    formulaFromMetadata?: string | null,
  ): SubscriptionFormula | null {
    const fromMetadata = normalizeFormula(formulaFromMetadata);
    if (fromMetadata) {
      return fromMetadata;
    }

    const formulas = Object.values(SubscriptionFormula);
    const cycles = Object.values(BillingCycle);

    for (const formula of formulas) {
      for (const cycle of cycles) {
        const configuredProduct = this.getCheckoutProductId(formula, cycle);
        if (configuredProduct && configuredProduct === productId) {
          return formula;
        }
      }
    }

    return null;
  }

  private mapPolarStatusToSubscriptionStatus(status: string): string {
    const normalized = status.toLowerCase();

    if (normalized === 'active') return SubscriptionLifecycleStatus.ACTIVE;
    if (normalized === 'trialing') return SubscriptionLifecycleStatus.TRIALING;
    if (normalized === 'past_due') return SubscriptionLifecycleStatus.PAST_DUE;
    if (normalized === 'cancelled') return SubscriptionLifecycleStatus.CANCELED;
    if (normalized === 'canceled') return SubscriptionLifecycleStatus.CANCELED;
    if (normalized === 'revoked') return SubscriptionLifecycleStatus.TERMINATED;

    return normalized;
  }

  private async processSubscriptionEvent(
    eventType: PolarWebhookEventType,
    organizationId: string,
    subscriptionData: PolarSubscriptionData,
  ) {
    const billingCycle = normalizeBillingCycle(subscriptionData.billing_interval);

    const polarUpdateData = {
      organization_id: organizationId,
      polar_subscription_id: subscriptionData.id,
      polar_customer_id: subscriptionData.customer_id,
      polar_product_id: subscriptionData.product_id,
      status: subscriptionData.status,
      current_period_start: subscriptionData.current_period_start,
      current_period_end: subscriptionData.current_period_end,
      cancel_at_period_end: subscriptionData.cancel_at_period_end,
      billing_interval: billingCycle,
      metadata: {
        price_id: subscriptionData.price_id,
        user_id: subscriptionData.user_id,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency,
        recurring: subscriptionData.recurring,
        trial_end: subscriptionData.trial_end,
        formula: subscriptionData.plan_type,
        billing_cycle: billingCycle,
        raw: subscriptionData.metadata,
      },
      canceled_at:
        eventType === PolarWebhookEventType.SUBSCRIPTION_CANCELLED ||
        eventType === PolarWebhookEventType.SUBSCRIPTION_REVOKED
          ? new Date().toISOString()
          : null,
    };

    const { data: polarSub, error: polarError } = await this.supabaseAdmin
      .from('polar_subscriptions')
      .upsert(polarUpdateData, {
        onConflict: 'polar_subscription_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (polarError) {
      throw new InternalServerErrorException(
        `Failed to update Polar subscription: ${polarError.message}`,
      );
    }

    const { data: existingSubscription } = await this.supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const formula = this.mapPolarProductToFormula(
      subscriptionData.product_id,
      subscriptionData.plan_type,
    );

    if (
      [
        PolarWebhookEventType.SUBSCRIPTION_ACTIVE,
        PolarWebhookEventType.SUBSCRIPTION_CREATED,
        PolarWebhookEventType.SUBSCRIPTION_UPDATED,
      ].includes(eventType) &&
      !formula
    ) {
      throw new BadRequestException(
        `Unknown Polar product mapping for product_id=${subscriptionData.product_id}`,
      );
    }

    const status = this.mapPolarStatusToSubscriptionStatus(subscriptionData.status);
    const resolvedFormula =
      formula || mapLegacyPlanTypeToFormula(existingSubscription?.plan_type);
    const legacyPlan = mapFormulaToLegacyPlanType(resolvedFormula);
    const legacyLimits = this.getLegacyResourceLimits(resolvedFormula);
    const contractedHectares =
      Number(subscriptionData.metadata?.contracted_hectares) ||
      existingSubscription?.contracted_hectares ||
      this.getDefaultContractedHectares(resolvedFormula);

    const quote = this.pricingService.createQuote({
      formula: resolvedFormula,
      contractedHectares,
      billingCycle,
    });

    const updatePayload = {
      organization_id: organizationId,
      status,
      plan_id: subscriptionData.product_id,
      plan_type: legacyPlan,
      formula: resolvedFormula,
      billing_interval: billingCycle,
      billing_cycle: billingCycle,
      current_period_start: subscriptionData.current_period_start,
      current_period_end: subscriptionData.current_period_end,
      cancel_at_period_end: subscriptionData.cancel_at_period_end,
      contracted_hectares: contractedHectares,
      included_users: FORMULA_POLICIES[resolvedFormula].includedUsers,
      max_farms: legacyLimits.farms,
      max_parcels: legacyLimits.parcels,
      max_users: legacyLimits.users,
      max_satellite_reports: legacyLimits.satelliteReports,
      amount_ht: quote.cycleAmountHt,
      amount_tva: quote.cycleAmountTva,
      amount_ttc: quote.cycleAmountTtc,
      currency: quote.currency,
      vat_rate: quote.vatRate,
      price_ht_per_ha_year: quote.priceHtPerHaYear,
      contract_start_at:
        existingSubscription?.contract_start_at ||
        subscriptionData.current_period_start,
      contract_end_at: subscriptionData.current_period_end,
      next_billing_at: subscriptionData.current_period_end,
      pending_formula: null,
      pending_billing_cycle: null,
      pending_pricing_snapshot: null,
      migration_effective_at: null,
      updated_at: new Date().toISOString(),
    };

    let mainSubscriptionResult: Record<string, unknown>;
    if (existingSubscription?.id) {
      const { data, error } = await this.supabaseAdmin
        .from('subscriptions')
        .update(updatePayload)
        .eq('id', existingSubscription.id)
        .select()
        .single();

      if (error) {
        mainSubscriptionResult = { error: error.message };
      } else {
        mainSubscriptionResult = data as Record<string, unknown>;
      }
    } else {
      const { data, error } = await this.supabaseAdmin
        .from('subscriptions')
        .insert({
          ...updatePayload,
          created_at: subscriptionData.created_at,
        })
        .select()
        .single();

      if (error) {
        mainSubscriptionResult = { error: error.message };
      } else {
        mainSubscriptionResult = data as Record<string, unknown>;
      }
    }

    await this.logSubscriptionEvent({
      organizationId,
      subscriptionId: existingSubscription?.id || null,
      eventType: `polar_${eventType.replace('.', '_')}`,
      actorType: 'system',
      actorId: 'polar_webhook',
      payload: {
        polarSubscriptionId: subscriptionData.id,
        formula: resolvedFormula,
        billingCycle,
      },
    });

    return {
      event: eventType,
      organizationId,
      polarSubscription: polarSub,
      mainSubscription: mainSubscriptionResult,
    };
  }

  private async getUsageCountsInternal(organizationId: string): Promise<UsageCounts> {
    const { count: farmsCount } = await this.supabaseAdmin
      .from('farms')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const { data: parcels, count: parcelsCount } = await this.supabaseAdmin
      .from('parcels')
      .select('area', { count: 'exact' })
      .eq('organization_id', organizationId);

    const hectaresCount = (parcels || []).reduce((sum, parcel) => {
      const area = Number(parcel.area || 0);
      return sum + (Number.isFinite(area) ? area : 0);
    }, 0);

    const { count: usersCount } = await this.supabaseAdmin
      .from('organization_users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    return {
      farms_count: farmsCount || 0,
      parcels_count: parcelsCount || 0,
      users_count: usersCount || 0,
      satellite_reports_count: 0,
      hectares_count: Math.round(hectaresCount * 100) / 100,
    };
  }

  private async checkFeatureAccess(
    organizationId: string,
    featureName: string,
    formulaValue: string | null,
  ) {
    const normalizedFeature = featureName.trim().toLowerCase();

    const { data: module, error: moduleError } = await this.supabaseAdmin
      .from('modules')
      .select('id, required_plan, is_active, is_available, is_required, slug, name')
      .or(`slug.eq.${normalizedFeature.replace(/[,.()'"]/g, '')},name.eq.${normalizedFeature.replace(/[,.()'"]/g, '')}`)
      .maybeSingle();

    if (moduleError || !module || !module.is_active || !module.is_available) {
      return false;
    }

    const currentFormula = normalizeFormula(formulaValue || undefined);
    const requiredFormula = normalizeFormula(
      module.required_plan as string | undefined,
    );

    if (requiredFormula && (!currentFormula || !isFormulaAtLeast(currentFormula, requiredFormula))) {
      return false;
    }

    if (module.is_required) {
      return true;
    }

    const { data: orgModule } = await this.supabaseAdmin
      .from('organization_modules')
      .select('is_active')
      .eq('organization_id', organizationId)
      .eq('module_id', module.id)
      .maybeSingle();

    return orgModule?.is_active === true;
  }

  private async logSubscriptionEvent(params: {
    organizationId: string;
    subscriptionId: string | null;
    eventType: string;
    actorType: string;
    actorId: string;
    payload: Record<string, unknown>;
  }) {
    await this.supabaseAdmin.from('subscription_events').insert({
      organization_id: params.organizationId,
      subscription_id: params.subscriptionId,
      event_type: params.eventType,
      actor_type: params.actorType,
      actor_id: params.actorId,
      payload: params.payload,
    });
  }

  private async processRenewalNotices() {
    const { data: subscriptions } = await this.supabaseAdmin
      .from('subscriptions')
      .select('id, organization_id, status, contract_end_at, renewal_notice_days')
      .in('status', [
        SubscriptionLifecycleStatus.ACTIVE,
        SubscriptionLifecycleStatus.TRIALING,
      ])
      .not('contract_end_at', 'is', null);

    for (const subscription of subscriptions || []) {
      const contractEnd = new Date(subscription.contract_end_at);
      const noticeDays = subscription.renewal_notice_days || 60;
      const noticeDate = new Date(contractEnd);
      noticeDate.setDate(noticeDate.getDate() - noticeDays);

      if (noticeDate > new Date()) {
        continue;
      }

      await this.supabaseAdmin
        .from('subscriptions')
        .update({
          status: SubscriptionLifecycleStatus.PENDING_RENEWAL,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      await this.logSubscriptionEvent({
        organizationId: subscription.organization_id,
        subscriptionId: subscription.id,
        eventType: 'renewal_notice_due',
        actorType: 'system',
        actorId: 'scheduler',
        payload: {
          contractEndAt: subscription.contract_end_at,
          noticeDays,
        },
      });
    }
  }

  private async processPendingMigrations() {
    const nowIso = new Date().toISOString();

    const { data: subscriptions } = await this.supabaseAdmin
      .from('subscriptions')
      .select(
        'id, organization_id, pending_formula, pending_billing_cycle, migration_effective_at, pending_pricing_snapshot',
      )
      .not('pending_formula', 'is', null)
      .not('migration_effective_at', 'is', null)
      .lte('migration_effective_at', nowIso);

    for (const subscription of subscriptions || []) {
      const targetFormula = normalizeFormula(subscription.pending_formula);
      const targetCycle = normalizeBillingCycle(subscription.pending_billing_cycle);

      if (!targetFormula) {
        continue;
      }

      const legacyPlan = mapFormulaToLegacyPlanType(targetFormula);
      const legacyLimits = this.getLegacyResourceLimits(targetFormula);

      await this.supabaseAdmin
        .from('subscriptions')
        .update({
          formula: targetFormula,
          plan_type: legacyPlan,
          billing_cycle: targetCycle,
          billing_interval: targetCycle,
          included_users: FORMULA_POLICIES[targetFormula].includedUsers,
          max_farms: legacyLimits.farms,
          max_parcels: legacyLimits.parcels,
          max_users: legacyLimits.users,
          max_satellite_reports: legacyLimits.satelliteReports,
          pending_formula: null,
          pending_billing_cycle: null,
          pending_pricing_snapshot: null,
          migration_effective_at: null,
          updated_at: nowIso,
        })
        .eq('id', subscription.id);

      await this.logSubscriptionEvent({
        organizationId: subscription.organization_id,
        subscriptionId: subscription.id,
        eventType: 'pending_plan_migration_applied',
        actorType: 'system',
        actorId: 'scheduler',
        payload: {
          formula: targetFormula,
          billingCycle: targetCycle,
          appliedAt: nowIso,
        },
      });
    }
  }

  private async processOverdueSubscriptions() {
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 30);

    const { data: documents } = await this.supabaseAdmin
      .from('billing_documents')
      .select('id, organization_id, subscription_id, due_at, status')
      .in('status', ['issued', 'overdue'])
      .not('due_at', 'is', null)
      .lte('due_at', overdueThreshold.toISOString());

    for (const doc of documents || []) {
      if (doc.status !== 'overdue') {
        await this.supabaseAdmin
          .from('billing_documents')
          .update({ status: 'overdue', updated_at: new Date().toISOString() })
          .eq('id', doc.id);
      }

      if (!doc.subscription_id) {
        continue;
      }

      await this.supabaseAdmin
        .from('subscriptions')
        .update({
          status: SubscriptionLifecycleStatus.PAST_DUE,
          last_payment_notice_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.subscription_id);

      await this.logSubscriptionEvent({
        organizationId: doc.organization_id,
        subscriptionId: doc.subscription_id,
        eventType: 'payment_overdue',
        actorType: 'system',
        actorId: 'scheduler',
        payload: {
          dueAt: doc.due_at,
          billingDocumentId: doc.id,
        },
      });
    }
  }

  private async processSuspensions() {
    const { data: subscriptions } = await this.supabaseAdmin
      .from('subscriptions')
      .select('id, organization_id, last_payment_notice_at, suspension_notice_days')
      .eq('status', SubscriptionLifecycleStatus.PAST_DUE)
      .not('last_payment_notice_at', 'is', null);

    for (const subscription of subscriptions || []) {
      const lastNotice = new Date(subscription.last_payment_notice_at);
      const suspensionNoticeDays = subscription.suspension_notice_days || 7;
      const suspensionDate = new Date(lastNotice);
      suspensionDate.setDate(suspensionDate.getDate() + suspensionNoticeDays);

      if (suspensionDate > new Date()) {
        continue;
      }

      await this.supabaseAdmin
        .from('subscriptions')
        .update({
          status: SubscriptionLifecycleStatus.SUSPENDED,
          suspended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      await this.logSubscriptionEvent({
        organizationId: subscription.organization_id,
        subscriptionId: subscription.id,
        eventType: 'subscription_suspended',
        actorType: 'system',
        actorId: 'scheduler',
        payload: {
          suspensionNoticeDays,
        },
      });
    }
  }

  private async processTerminationWindows() {
    const { data: subscriptions } = await this.supabaseAdmin
      .from('subscriptions')
      .select('id, organization_id, terminated_at, export_window_days')
      .eq('status', SubscriptionLifecycleStatus.TERMINATED)
      .not('terminated_at', 'is', null);

    for (const subscription of subscriptions || []) {
      const terminatedAt = new Date(subscription.terminated_at);
      const exportWindowDays = subscription.export_window_days || 30;
      const exportDeadline = new Date(terminatedAt);
      exportDeadline.setDate(exportDeadline.getDate() + exportWindowDays);

      if (exportDeadline > new Date()) {
        continue;
      }

      await this.logSubscriptionEvent({
        organizationId: subscription.organization_id,
        subscriptionId: subscription.id,
        eventType: 'termination_export_window_elapsed',
        actorType: 'system',
        actorId: 'scheduler',
        payload: {
          terminatedAt: subscription.terminated_at,
          exportDeadline: exportDeadline.toISOString(),
          action: 'data_purge_due',
        },
      });
    }
  }
}
