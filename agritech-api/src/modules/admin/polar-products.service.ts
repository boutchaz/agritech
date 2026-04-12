import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Polar } from '@polar-sh/sdk';
import {
  CreatePolarProductDto,
  PolarBillingInterval,
} from './dto/create-polar-product.dto';
import {
  BillingCycle,
  ERP_MODULES,
  FORMULA_MODULE_MAPPING,
  FORMULA_POLICIES,
  SubscriptionFormula,
} from '../subscriptions/subscription-domain';
import { SubscriptionPricingService } from '../subscriptions/subscription-pricing.service';

export interface PolarProductSummary {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  recurringInterval: string | null;
  metadata: Record<string, any>;
  prices: Array<{
    id: string;
    amount: number | null;
    currency: string;
    recurringInterval: string | null;
    amountType: string;
  }>;
  createdAt: string;
}

@Injectable()
export class PolarProductsService {
  private readonly logger = new Logger(PolarProductsService.name);
  private readonly polar: Polar | null = null;
  private readonly organizationId: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly pricingService: SubscriptionPricingService,
  ) {
    const accessToken = this.configService.get<string>('POLAR_ACCESS_TOKEN');
    const orgId = this.configService.get<string>('POLAR_ORGANIZATION_ID');

    if (!accessToken || !orgId) {
      this.logger.warn('POLAR_ACCESS_TOKEN or POLAR_ORGANIZATION_ID not set — Polar product management disabled');
      return;
    }

    this.organizationId = orgId;

    const serverEnv = this.configService.get<string>('POLAR_SERVER') || 'sandbox';
    this.polar = new Polar({
      accessToken,
      server: serverEnv as 'sandbox' | 'production',
    });
  }

  private ensureConfigured(): { polar: Polar; organizationId: string } {
    if (!this.polar || !this.organizationId) {
      throw new Error('Polar is not configured. Set POLAR_ACCESS_TOKEN and POLAR_ORGANIZATION_ID.');
    }
    return { polar: this.polar, organizationId: this.organizationId };
  }

  async listProducts(): Promise<PolarProductSummary[]> {
    const { polar, organizationId } = this.ensureConfigured();
    const response = await polar.products.list({
      organizationId,
    });

    const items = response.result?.items || [];

    return items.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || null,
      isArchived: p.isArchived || false,
      recurringInterval: p.recurringInterval || null,
      metadata: p.metadata || {},
      prices: (p.prices || []).map((pr: any) => ({
        id: pr.id,
        amount: pr.priceAmount ?? null,
        currency: pr.priceCurrency || 'usd',
        recurringInterval: pr.recurringInterval || null,
        amountType: pr.amountType || 'fixed',
      })),
      createdAt: p.createdAt
        ? new Date(p.createdAt).toISOString()
        : new Date().toISOString(),
    }));
  }

  async createProduct(dto: CreatePolarProductDto): Promise<PolarProductSummary> {
    const metadata: Record<string, string> = {
      ...(dto.metadata || {}),
      source: 'admin-subscription-model',
    };

    if (dto.selectedModules?.length) {
      metadata.selected_modules = JSON.stringify(dto.selectedModules);
    }
    if (dto.contractedHectares !== undefined) {
      metadata.contracted_hectares = String(dto.contractedHectares);
    }
    if (dto.discountPercent !== undefined) {
      metadata.discount_percent = String(dto.discountPercent);
    }

    const prices: any[] = [];
    if (dto.priceAmount > 0) {
      prices.push({
        amountType: 'fixed' as const,
        priceAmount: dto.priceAmount,
        priceCurrency: dto.currency || 'usd',
      });
    }

    const { polar, organizationId } = this.ensureConfigured();
    const product = await polar.products.create({
      organizationId,
      name: dto.name,
      description: dto.description || null,
      metadata,
      recurringInterval: dto.recurringInterval,
      prices,
    });

    this.logger.log(`Created Polar product: ${product.name} (${product.id})`);

    return this.mapProductToSummary(product);
  }

  async syncFormulaProducts(): Promise<{
    created: PolarProductSummary[];
    skipped: string[];
  }> {
    const existing = await this.listProducts();
    const created: PolarProductSummary[] = [];
    const skipped: string[] = [];

    const formulas = [
      SubscriptionFormula.STARTER,
      SubscriptionFormula.STANDARD,
      SubscriptionFormula.PREMIUM,
      SubscriptionFormula.ENTERPRISE,
    ];

    const cycles: Array<{ cycle: BillingCycle; polar: PolarBillingInterval; label: string }> = [
      { cycle: BillingCycle.MONTHLY, polar: PolarBillingInterval.MONTH, label: 'Monthly' },
      { cycle: BillingCycle.ANNUAL, polar: PolarBillingInterval.YEAR, label: 'Annual' },
    ];

    for (const formula of formulas) {
      const policy = FORMULA_POLICIES[formula];
      const modules = FORMULA_MODULE_MAPPING[formula];
      const representativeHa = policy.maxHectaresInclusive || 600;

      for (const { cycle, polar: polarInterval, label } of cycles) {
        const productName = `AgroGina ${formula.charAt(0).toUpperCase() + formula.slice(1)} - ${label}`;

        const existingProduct = existing.find(
          (p) =>
            !p.isArchived &&
            p.metadata?.formula === formula &&
            p.metadata?.billing_cycle === cycle,
        );

        if (existingProduct) {
          skipped.push(`${productName} (exists: ${existingProduct.id})`);
          continue;
        }

        const quote = this.pricingService.createModularQuote({
          selectedModules: modules,
          contractedHectares: representativeHa,
          billingCycle: cycle,
          discountPercent: 10,
        });

        const priceInCents = Math.round(quote.cycleAmountTtc * 100);
        const description = this.buildFormulaDescription(formula, policy, modules);

        const product = await this.createProduct({
          name: productName,
          description,
          priceAmount: priceInCents,
          currency: 'usd',
          recurringInterval: polarInterval,
          metadata: {
            formula,
            billing_cycle: cycle,
            representative_hectares: String(representativeHa),
            included_users: String(policy.includedUsers || 'unlimited'),
            support_level: policy.supportLevel,
            sla_available: String(policy.slaAvailable),
            agromind_ia_level: policy.agromindIaLevel,
            marketplace_mode: policy.marketplaceMode,
            included_modules: modules.join(','),
          },
          selectedModules: modules,
          contractedHectares: representativeHa,
          discountPercent: 10,
        });

        created.push(product);
        this.logger.log(`Synced: ${productName}`);
      }
    }

    return { created, skipped };
  }

  async archiveProduct(productId: string): Promise<{ archived: boolean }> {
    const { polar } = this.ensureConfigured();
    await polar.products.update({
      id: productId,
      productUpdate: {
        isArchived: true,
      },
    });

    this.logger.log(`Archived Polar product: ${productId}`);
    return { archived: true };
  }

  private mapProductToSummary(p: any): PolarProductSummary {
    return {
      id: p.id,
      name: p.name,
      description: p.description || null,
      isArchived: p.isArchived || false,
      recurringInterval: p.recurringInterval || null,
      metadata: p.metadata || {},
      prices: (p.prices || []).map((pr: any) => ({
        id: pr.id,
        amount: pr.priceAmount ?? null,
        currency: pr.priceCurrency || 'usd',
        recurringInterval: pr.recurringInterval || null,
        amountType: pr.amountType || 'fixed',
      })),
      createdAt: p.createdAt
        ? new Date(p.createdAt).toISOString()
        : new Date().toISOString(),
    };
  }

  private buildFormulaDescription(
    formula: SubscriptionFormula,
    policy: (typeof FORMULA_POLICIES)[SubscriptionFormula],
    modules: string[],
  ): string {
    const moduleNames = modules
      .map((id) => ERP_MODULES.find((m) => m.id === id)?.name || id)
      .join(', ');

    const hectareRange = policy.maxHectaresInclusive
      ? `Up to ${policy.maxHectaresInclusive} ha`
      : `${policy.minHectaresExclusive}+ ha`;

    const users = policy.includedUsers
      ? `${policy.includedUsers} users`
      : 'Unlimited users';

    return `AgroGina ${formula} plan. ${hectareRange}, ${users}. Modules: ${moduleNames}. Support: ${policy.supportLevel}. AgromindIA: ${policy.agromindIaLevel}.`;
  }
}
