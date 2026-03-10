export enum SubscriptionFormula {
  STARTER = 'starter',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  SEMIANNUAL = 'semiannual',
  ANNUAL = 'annual',
}

export enum SubscriptionLifecycleStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
  PENDING_RENEWAL = 'pending_renewal',
  CANCELED = 'canceled',
}

export interface FormulaPolicy {
  formula: SubscriptionFormula;
  minHectaresExclusive: number | null;
  maxHectaresInclusive: number | null;
  includedUsers: number | null;
  supportLevel: string;
  slaAvailable: boolean;
  agromindIaLevel: string;
  marketplaceMode: string;
}

export const FORMULA_POLICIES: Record<SubscriptionFormula, FormulaPolicy> = {
  [SubscriptionFormula.STARTER]: {
    formula: SubscriptionFormula.STARTER,
    minHectaresExclusive: null,
    maxHectaresInclusive: 50,
    includedUsers: 3,
    supportLevel: 'email',
    slaAvailable: false,
    agromindIaLevel: 'basic',
    marketplaceMode: 'read_only',
  },
  [SubscriptionFormula.STANDARD]: {
    formula: SubscriptionFormula.STANDARD,
    minHectaresExclusive: 50,
    maxHectaresInclusive: 200,
    includedUsers: 10,
    supportLevel: 'priority_email',
    slaAvailable: false,
    agromindIaLevel: 'advanced',
    marketplaceMode: 'seller_buyer',
  },
  [SubscriptionFormula.PREMIUM]: {
    formula: SubscriptionFormula.PREMIUM,
    minHectaresExclusive: 200,
    maxHectaresInclusive: 500,
    includedUsers: 25,
    supportLevel: 'phone_priority',
    slaAvailable: true,
    agromindIaLevel: 'expert',
    marketplaceMode: 'full',
  },
  [SubscriptionFormula.ENTERPRISE]: {
    formula: SubscriptionFormula.ENTERPRISE,
    minHectaresExclusive: 500,
    maxHectaresInclusive: null,
    includedUsers: null,
    supportLevel: 'dedicated_csm',
    slaAvailable: true,
    agromindIaLevel: 'enterprise',
    marketplaceMode: 'full',
  },
};

export const FORMULA_HIERARCHY: Record<SubscriptionFormula, number> = {
  [SubscriptionFormula.STARTER]: 1,
  [SubscriptionFormula.STANDARD]: 2,
  [SubscriptionFormula.PREMIUM]: 3,
  [SubscriptionFormula.ENTERPRISE]: 4,
};

const FORMULA_ALIASES: Record<string, SubscriptionFormula> = {
  starter: SubscriptionFormula.STARTER,
  standard: SubscriptionFormula.STANDARD,
  premium: SubscriptionFormula.PREMIUM,
  enterprise: SubscriptionFormula.ENTERPRISE,
  core: SubscriptionFormula.STARTER,
  essential: SubscriptionFormula.STARTER,
  professional: SubscriptionFormula.STANDARD,
};

const BILLING_CYCLE_ALIASES: Record<string, BillingCycle> = {
  month: BillingCycle.MONTHLY,
  monthly: BillingCycle.MONTHLY,
  year: BillingCycle.ANNUAL,
  yearly: BillingCycle.ANNUAL,
  annual: BillingCycle.ANNUAL,
  semiannual: BillingCycle.SEMIANNUAL,
  semestrial: BillingCycle.SEMIANNUAL,
};

export function normalizeFormula(value: string | null | undefined): SubscriptionFormula | null {
  if (!value) {
    return null;
  }
  const normalized = FORMULA_ALIASES[value.toLowerCase()];
  return normalized || null;
}

export function normalizeBillingCycle(value: string | null | undefined): BillingCycle {
  if (!value) {
    return BillingCycle.MONTHLY;
  }
  const normalized = BILLING_CYCLE_ALIASES[value.toLowerCase()];
  return normalized || BillingCycle.MONTHLY;
}

export function toPolarInterval(cycle: BillingCycle): 'month' | 'year' {
  if (cycle === BillingCycle.ANNUAL) {
    return 'year';
  }
  return 'month';
}

export function mapFormulaToLegacyPlanType(formula: SubscriptionFormula): 'essential' | 'professional' | 'enterprise' {
  if (formula === SubscriptionFormula.STARTER) {
    return 'essential';
  }
  if (formula === SubscriptionFormula.STANDARD) {
    return 'professional';
  }
  return 'enterprise';
}

export function mapLegacyPlanTypeToFormula(planType: string | null | undefined): SubscriptionFormula {
  return normalizeFormula(planType) || SubscriptionFormula.STANDARD;
}

export function isFormulaAtLeast(currentFormula: SubscriptionFormula, requiredFormula: SubscriptionFormula): boolean {
  return FORMULA_HIERARCHY[currentFormula] >= FORMULA_HIERARCHY[requiredFormula];
}
