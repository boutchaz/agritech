import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingCycle,
  FORMULA_POLICIES,
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

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
