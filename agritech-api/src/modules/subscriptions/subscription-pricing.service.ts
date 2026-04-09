import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingCycle,
  DEFAULT_DISCOUNT_PERCENT,
  ERP_MODULES,
  FORMULA_POLICIES,
  HA_PRICE_TIERS,
  HaPriceTier,
  SIZE_MULTIPLIER_TIERS,
  SubscriptionFormula,
} from './subscription-domain';

export interface QuoteInput {
  formula: SubscriptionFormula;
  contractedHectares: number;
  billingCycle: BillingCycle;
  discountPercent?: number;
}

export interface QuoteBreakdown {
  formula: SubscriptionFormula;
  contractedHectares: number;
  includedUsers: number | null;
  billingCycle: BillingCycle;
  currency: string;
  vatRate: number;
  priceHtPerHaYear: number;
  annualAmountHt: number;
  cycleAmountHt: number;
  cycleAmountTva: number;
  cycleAmountTtc: number;
  installmentCountPerYear: number;
  discountPercent: number;
}

export interface ModularQuoteInput {
  selectedModules: string[];
  contractedHectares: number;
  billingCycle: BillingCycle;
  discountPercent?: number;
}

export interface ModularHaPriceBreakdownItem {
  tier: string;
  ha: number;
  pricePerHa: number;
  subtotal: number;
}

export interface ModularQuoteBreakdown {
  selectedModules: string[];
  erpMonthly: number;
  sizeMultiplier: number;
  haAnnual: number;
  haPriceBreakdown: ModularHaPriceBreakdownItem[];
  annualSubtotalHt: number;
  discountPercent: number;
  discountAmountHt: number;
  annualAmountHt: number;
  billingCycle: BillingCycle;
  installmentCountPerYear: number;
  cycleAmountHt: number;
  vatRate: number;
  cycleAmountTva: number;
  cycleAmountTtc: number;
  currency: string;
}

@Injectable()
export class SubscriptionPricingService {
  constructor(private readonly configService: ConfigService) {}

  createQuote(input: QuoteInput): QuoteBreakdown {
    const policy = FORMULA_POLICIES[input.formula];
    const priceHtPerHaYear = this.resolveFormulaRate(input.formula);
    const vatRate = this.resolveVatRate();
    const discountPercent = Math.max(0, Math.min(input.discountPercent || 0, 100));

    const annualAmountBeforeDiscount = input.contractedHectares * priceHtPerHaYear;
    const annualAmountHt = this.round2(
      annualAmountBeforeDiscount * (1 - discountPercent / 100),
    );

    const installmentCountPerYear =
      input.billingCycle === BillingCycle.MONTHLY
        ? 12
        : input.billingCycle === BillingCycle.SEMIANNUAL
          ? 2
          : 1;

    const cycleAmountHt = this.round2(annualAmountHt / installmentCountPerYear);
    const cycleAmountTva = this.round2(cycleAmountHt * vatRate);
    const cycleAmountTtc = this.round2(cycleAmountHt + cycleAmountTva);

    return {
      formula: input.formula,
      contractedHectares: input.contractedHectares,
      includedUsers: policy.includedUsers,
      billingCycle: input.billingCycle,
      currency: 'MAD',
      vatRate,
      priceHtPerHaYear,
      annualAmountHt,
      cycleAmountHt,
      cycleAmountTva,
      cycleAmountTtc,
      installmentCountPerYear,
      discountPercent,
    };
  }

  computeErpMonthly(selectedModuleIds: string[]): number {
    const selectedIds = new Set(selectedModuleIds);

    return ERP_MODULES.filter((module) => selectedIds.has(module.id)).reduce(
      (total, module) => total + module.pricePerMonth,
      0,
    );
  }

  resolveSizeMultiplier(hectares: number): number {
    const matchedTier = SIZE_MULTIPLIER_TIERS.find((tier) => {
      const upperBound = tier.maxHa ?? Number.POSITIVE_INFINITY;
      return hectares >= tier.minHa && hectares < upperBound;
    });

    return matchedTier?.multiplier ?? 1;
  }

  computeHaTotalPrice(hectares: number): {
    total: number;
    breakdown: ModularHaPriceBreakdownItem[];
  } {
    const normalizedHectares = Math.max(0, hectares);
    const sortedTiers = [...HA_PRICE_TIERS].sort((a, b) => {
      const aMax = a.maxHa ?? Number.POSITIVE_INFINITY;
      const bMax = b.maxHa ?? Number.POSITIVE_INFINITY;
      return aMax - bMax;
    });

    let remaining = normalizedHectares;
    let total = 0;
    let prevMax = 0;
    const breakdown: ModularHaPriceBreakdownItem[] = [];

    for (const tier of sortedTiers) {
      if (remaining <= 0) {
        break;
      }

      const isLastTier = tier.maxHa === null;
      const currentMax = tier.maxHa ?? 999999;
      const tierWidth = isLastTier ? remaining : currentMax - prevMax;
      const haInTier = Math.min(remaining, tierWidth);

      if (haInTier <= 0) {
        prevMax = currentMax;
        continue;
      }

      const subtotal = haInTier * tier.pricePerHaYear;
      breakdown.push({
        tier: tier.label,
        ha: haInTier,
        pricePerHa: tier.pricePerHaYear,
        subtotal: this.round2(subtotal),
      });

      total += subtotal;
      remaining -= haInTier;
      prevMax = currentMax;
    }

    return {
      total: this.round2(total),
      breakdown,
    };
  }

  createModularQuote(input: ModularQuoteInput): ModularQuoteBreakdown {
    const vatRate = this.resolveVatRate();
    const discountPercent = Math.max(
      0,
      Math.min(input.discountPercent ?? DEFAULT_DISCOUNT_PERCENT, 100),
    );
    const sizeMultiplier = this.resolveSizeMultiplier(input.contractedHectares);
    const erpMonthly = this.round2(
      this.computeErpMonthly(input.selectedModules) * sizeMultiplier,
    );
    const haQuote = this.computeHaTotalPrice(input.contractedHectares);
    const annualSubtotalHt = this.round2(erpMonthly * 12 + haQuote.total);
    const discountAmountHt = this.round2(
      annualSubtotalHt * (discountPercent / 100),
    );
    const annualAmountHt = this.round2(annualSubtotalHt - discountAmountHt);
    const installmentCountPerYear = this.resolveInstallmentCount(
      input.billingCycle,
    );
    const cycleAmountHt = this.round2(annualAmountHt / installmentCountPerYear);
    const cycleAmountTva = this.round2(cycleAmountHt * vatRate);
    const cycleAmountTtc = this.round2(cycleAmountHt + cycleAmountTva);

    return {
      selectedModules: input.selectedModules,
      erpMonthly,
      sizeMultiplier,
      haAnnual: haQuote.total,
      haPriceBreakdown: haQuote.breakdown,
      annualSubtotalHt,
      discountPercent,
      discountAmountHt,
      annualAmountHt,
      billingCycle: input.billingCycle,
      installmentCountPerYear,
      cycleAmountHt,
      vatRate,
      cycleAmountTva,
      cycleAmountTtc,
      currency: 'MAD',
    };
  }

  private resolveFormulaRate(formula: SubscriptionFormula): number {
    const envKey = `SUBSCRIPTION_${formula.toUpperCase()}_PRICE_HT_PER_HA_YEAR`;
    const value = this.configService.get<string>(envKey);
    const parsed = value ? Number(value) : NaN;

    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }

    // Sensible defaults in MAD/ha/year until commercial rates are configured.
    const defaults: Record<SubscriptionFormula, number> = {
      [SubscriptionFormula.STARTER]: 110,
      [SubscriptionFormula.STANDARD]: 95,
      [SubscriptionFormula.PREMIUM]: 80,
      [SubscriptionFormula.ENTERPRISE]: 65,
    };

    return defaults[formula];
  }

  private resolveVatRate(): number {
    const vatRate = this.configService.get<string>('SUBSCRIPTION_VAT_RATE');
    const parsed = vatRate ? Number(vatRate) : NaN;

    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      return parsed;
    }

    return 0.2;
  }

  private resolveInstallmentCount(billingCycle: BillingCycle): number {
    return billingCycle === BillingCycle.MONTHLY
      ? 12
      : billingCycle === BillingCycle.SEMIANNUAL
        ? 2
        : 1;
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
