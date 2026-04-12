import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Polar } from '@polar-sh/sdk';
import { BillingCycle, SubscriptionFormula } from './subscription-domain';

interface CachedProduct {
  id: string;
  name: string;
  metadata: Record<string, any>;
  recurringInterval: string | null;
  isArchived: boolean;
}

interface ProductCache {
  products: CachedProduct[];
  fetchedAt: number;
}

@Injectable()
export class PolarCheckoutService {
  private readonly logger = new Logger(PolarCheckoutService.name);
  private readonly polar: Polar | null = null;
  private productCache: ProductCache | null = null;

  /** Cache TTL: 5 minutes */
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(private readonly configService: ConfigService) {
    const accessToken = this.configService.get<string>('POLAR_ACCESS_TOKEN');
    const orgId = this.configService.get<string>('POLAR_ORGANIZATION_ID');

    if (accessToken && orgId) {
      const serverEnv =
        this.configService.get<string>('POLAR_SERVER') || 'sandbox';
      this.polar = new Polar({
        accessToken,
        server: serverEnv as 'sandbox' | 'production',
      });
      this.logger.log(`Polar checkout service initialized (${serverEnv})`);
    } else {
      this.logger.warn(
        'Polar credentials not set — checkout will fall back to env var product IDs',
      );
    }
  }

  /**
   * Find a Polar product ID by formula + billing cycle.
   * Checks Polar API (cached) first, then falls back to env vars.
   */
  async resolveProductId(
    formula: SubscriptionFormula,
    billingCycle: BillingCycle,
  ): Promise<string | undefined> {
    // Try Polar API lookup first
    const fromApi = await this.findProductFromApi(formula, billingCycle);
    if (fromApi) return fromApi;

    // Fall back to env vars
    return this.resolveProductIdFromEnv(formula, billingCycle);
  }

  /**
   * Find a modular checkout product ID by billing cycle.
   * Products with metadata.type === 'custom_simulation' or metadata.formula exist.
   * Falls back to standard formula product, then env vars.
   */
  async resolveModularProductId(
    billingCycle: BillingCycle,
  ): Promise<string | undefined> {
    // Try finding a modular product from API
    const polarInterval = billingCycle === BillingCycle.ANNUAL ? 'year' : 'month';
    const products = await this.getCachedProducts();

    if (products.length > 0) {
      // Prefer a product explicitly tagged as modular
      const modular = products.find(
        (p) =>
          !p.isArchived &&
          p.metadata?.type === 'modular' &&
          p.recurringInterval === polarInterval,
      );
      if (modular) return modular.id;

      // Fall back to standard formula product
      const standard = products.find(
        (p) =>
          !p.isArchived &&
          p.metadata?.formula === SubscriptionFormula.STANDARD &&
          p.metadata?.billing_cycle === billingCycle,
      );
      if (standard) return standard.id;

      // Any active product with matching interval
      const anyMatch = products.find(
        (p) =>
          !p.isArchived &&
          p.metadata?.source === 'admin-subscription-model' &&
          p.recurringInterval === polarInterval,
      );
      if (anyMatch) return anyMatch.id;
    }

    // Env var fallback
    const cycleKey = billingCycle.toUpperCase();
    return (
      this.configService.get<string>(`POLAR_MODULAR_${cycleKey}_PRODUCT_ID`) ||
      this.configService.get<string>(
        `POLAR_STANDARD_${cycleKey}_PRODUCT_ID`,
      ) ||
      this.resolveProductIdFromEnv(SubscriptionFormula.STANDARD, billingCycle)
    );
  }

  /**
   * Create a Polar checkout session via SDK.
   * Returns checkout URL or null if SDK not available.
   */
  async createCheckoutSession(params: {
    productId: string;
    successUrl?: string;
    metadata?: Record<string, string>;
    customerEmail?: string;
  }): Promise<{ checkoutUrl: string; checkoutId: string } | null> {
    if (!this.polar) return null;

    try {
      const checkout = await this.polar.checkouts.create({
        products: [params.productId],
        successUrl: params.successUrl || undefined,
        metadata: params.metadata,
        customerEmail: params.customerEmail || undefined,
      });

      return {
        checkoutUrl: checkout.url,
        checkoutId: checkout.id,
      };
    } catch (err) {
      this.logger.error(
        `Failed to create Polar checkout session: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  /**
   * Build a manual checkout URL (legacy approach, used as fallback).
   */
  buildManualCheckoutUrl(params: {
    productId: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
  }): string | null {
    const checkoutBaseUrl = this.configService.get<string>('POLAR_CHECKOUT_URL');
    if (!checkoutBaseUrl) return null;

    const url = new URL(checkoutBaseUrl);
    url.searchParams.set('product_id', params.productId);

    if (params.successUrl) {
      url.searchParams.set('success_url', params.successUrl);
    }
    if (params.cancelUrl) {
      url.searchParams.set('cancel_url', params.cancelUrl);
    }
    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        url.searchParams.set(`metadata[${key}]`, value);
      }
    }

    return url.toString();
  }

  // ─── Private ──────────────────────────────────────────────

  private async findProductFromApi(
    formula: SubscriptionFormula,
    billingCycle: BillingCycle,
  ): Promise<string | undefined> {
    const products = await this.getCachedProducts();
    if (products.length === 0) return undefined;

    const match = products.find(
      (p) =>
        !p.isArchived &&
        p.metadata?.formula === formula &&
        p.metadata?.billing_cycle === billingCycle,
    );

    return match?.id;
  }

  private async getCachedProducts(): Promise<CachedProduct[]> {
    if (!this.polar) return [];

    const now = Date.now();
    if (
      this.productCache &&
      now - this.productCache.fetchedAt < this.CACHE_TTL_MS
    ) {
      return this.productCache.products;
    }

    try {
      const response = await this.polar.products.list({});
      const items = response.result?.items || [];

      const products: CachedProduct[] = items.map((p: any) => ({
        id: p.id,
        name: p.name,
        metadata: p.metadata || {},
        recurringInterval: p.recurringInterval || null,
        isArchived: p.isArchived || false,
      }));

      this.productCache = { products, fetchedAt: now };
      this.logger.debug(`Cached ${products.length} Polar products`);

      return products;
    } catch (err) {
      this.logger.error(
        `Failed to fetch Polar products: ${err instanceof Error ? err.message : err}`,
      );
      return this.productCache?.products || [];
    }
  }

  private resolveProductIdFromEnv(
    formula: SubscriptionFormula,
    billingCycle: BillingCycle,
  ): string | undefined {
    const formulaKey = formula.toUpperCase();
    const cycleKey = billingCycle.toUpperCase();

    const direct = this.configService.get<string>(
      `POLAR_${formulaKey}_${cycleKey}_PRODUCT_ID`,
    );
    if (direct) return direct;

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
}
