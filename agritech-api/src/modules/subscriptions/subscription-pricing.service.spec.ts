import { ConfigService } from '@nestjs/config';
import {
  BillingCycle,
  DEFAULT_DISCOUNT_PERCENT,
  ERP_MODULES,
  HA_PRICE_TIERS,
  SIZE_MULTIPLIER_TIERS,
} from './subscription-domain';
import { SubscriptionPricingService } from './subscription-pricing.service';

describe('SubscriptionPricingService modular pricing', () => {
  let service: SubscriptionPricingService;

  beforeEach(() => {
    service = new SubscriptionPricingService(
      new ConfigService({
        SUBSCRIPTION_VAT_RATE: '0.2',
      }),
    );
  });

  it('exposes advisor pricing constants', () => {
    expect(ERP_MODULES).toHaveLength(11);
    expect(ERP_MODULES.filter((module) => module.isBase)).toHaveLength(4);
    expect(ERP_MODULES.filter((module) => !module.isBase)).toHaveLength(7);
    expect(HA_PRICE_TIERS).toHaveLength(7);
    expect(SIZE_MULTIPLIER_TIERS).toHaveLength(3);
    expect(DEFAULT_DISCOUNT_PERCENT).toBe(10);
  });

  it('computes ERP monthly total from selected modules', () => {
    expect(
      service.computeErpMonthly([
        'erp-multiferme',
        'erp-dashboard',
        'erp-taches',
        'erp-recolte',
        'erp-rh',
        'erp-stocks',
      ]),
    ).toBe(420);
  });

  it('resolves size multiplier tiers', () => {
    expect(service.resolveSizeMultiplier(50)).toBe(1);
    expect(service.resolveSizeMultiplier(300)).toBe(2.5);
    expect(service.resolveSizeMultiplier(600)).toBe(5);
  });

  it('computes progressive hectare totals', () => {
    expect(service.computeHaTotalPrice(5).total).toBe(2500);
    expect(service.computeHaTotalPrice(20).total).toBe(8500);
    expect(service.computeHaTotalPrice(50).total).toBe(17500);
    expect(service.computeHaTotalPrice(100).total).toBe(32500);
  });

  it('creates a modular monthly quote with bundle discount', () => {
    const quote = service.createModularQuote({
      selectedModules: [
        'erp-multiferme',
        'erp-dashboard',
        'erp-taches',
        'erp-recolte',
        'erp-rh',
        'erp-stocks',
      ],
      contractedHectares: 50,
      billingCycle: BillingCycle.MONTHLY,
      discountPercent: DEFAULT_DISCOUNT_PERCENT,
    });

    expect(quote.erpMonthly).toBe(420);
    expect(quote.haAnnual).toBe(17500);
    expect(quote.annualAmountHt).toBe(20286);
    expect(quote.cycleAmountHt).toBe(1690.5);
  });

  it('applies size multiplier for larger farms', () => {
    const quote = service.createModularQuote({
      selectedModules: [
        'erp-multiferme',
        'erp-dashboard',
        'erp-taches',
        'erp-recolte',
        'erp-rh',
        'erp-stocks',
      ],
      contractedHectares: 300,
      billingCycle: BillingCycle.MONTHLY,
      discountPercent: DEFAULT_DISCOUNT_PERCENT,
    });

    expect(quote.sizeMultiplier).toBe(2.5);
  });
});
