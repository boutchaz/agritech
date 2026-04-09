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

export interface ErpModule {
  id: string;
  name: string;
  desc: string;
  isBase: boolean;
  pricePerMonth: number;
}

export interface HaPriceTier {
  maxHa: number | null;
  label: string;
  pricePerHaYear: number;
}

export interface SizeMultiplierTier {
  minHa: number;
  maxHa: number | null;
  multiplier: number;
}

export const ERP_MODULES: ErpModule[] = [
  {
    id: 'erp-multiferme',
    name: 'Multi-Fermes & Parcellaire',
    desc: 'Gestion multi-fermes, parcelles, rôles, historique',
    isBase: true,
    pricePerMonth: 100,
  },
  {
    id: 'erp-dashboard',
    name: 'Dashboard & Live Map',
    desc: 'Dashboard normal et live avec carte des tâches en cours',
    isBase: true,
    pricePerMonth: 50,
  },
  {
    id: 'erp-taches',
    name: 'Tâches Agronomiques',
    desc: 'Planification, démarrer/pause, lié au personnel et stocks',
    isBase: true,
    pricePerMonth: 80,
  },
  {
    id: 'erp-recolte',
    name: 'Récolte & Traçabilité',
    desc: 'Gestion récolte, destination, traçabilité complète',
    isBase: true,
    pricePerMonth: 50,
  },
  {
    id: 'erp-rh',
    name: 'RH & Paie Agronomique',
    desc: 'Personnel fixe/jour/tâche, paie auto, partage production',
    isBase: false,
    pricePerMonth: 80,
  },
  {
    id: 'erp-stocks',
    name: 'Stocks & Entrepôts',
    desc: 'Alertes, fournisseurs, clients, infrastructures',
    isBase: false,
    pricePerMonth: 60,
  },
  {
    id: 'erp-compta',
    name: 'Compta & Facturation',
    desc: 'Devis, factures, relances auto',
    isBase: false,
    pricePerMonth: 250,
  },
  {
    id: 'erp-qualite',
    name: 'Contrôle Qualité',
    desc: 'Tests, certificats',
    isBase: false,
    pricePerMonth: 40,
  },
  {
    id: 'erp-conformite',
    name: 'Conformité & Normes',
    desc: 'Global GAP, BIO, traçabilité réglementaire',
    isBase: false,
    pricePerMonth: 60,
  },
  {
    id: 'erp-marketplace',
    name: 'Marketplace',
    desc: 'Plateforme de vente intégrée',
    isBase: false,
    pricePerMonth: 50,
  },
  {
    id: 'erp-assistant',
    name: 'Assistant IA',
    desc: 'Chat IA avec accès aux données fermes et tâches',
    isBase: false,
    pricePerMonth: 60,
  },
];

export const HA_PRICE_TIERS: HaPriceTier[] = [
  { maxHa: 5, label: '< 5 ha', pricePerHaYear: 500 },
  { maxHa: 20, label: '5–20 ha', pricePerHaYear: 400 },
  { maxHa: 100, label: '20–100 ha', pricePerHaYear: 300 },
  { maxHa: 200, label: '100–200 ha', pricePerHaYear: 250 },
  { maxHa: 400, label: '200–400 ha', pricePerHaYear: 200 },
  { maxHa: 500, label: '400–500 ha', pricePerHaYear: 180 },
  { maxHa: null, label: '500+ ha', pricePerHaYear: 150 },
];

export const SIZE_MULTIPLIER_TIERS: SizeMultiplierTier[] = [
  { minHa: 0, maxHa: 100, multiplier: 1 },
  { minHa: 100, maxHa: 500, multiplier: 2.5 },
  { minHa: 500, maxHa: null, multiplier: 5 },
];

export const DEFAULT_DISCOUNT_PERCENT = 10;

export const FORMULA_MODULE_MAPPING: Record<SubscriptionFormula, string[]> = {
  [SubscriptionFormula.STARTER]: [
    'erp-multiferme',
    'erp-dashboard',
    'erp-taches',
    'erp-recolte',
    'erp-rh',
  ],
  [SubscriptionFormula.STANDARD]: [
    'erp-multiferme',
    'erp-dashboard',
    'erp-taches',
    'erp-recolte',
    'erp-rh',
    'erp-stocks',
    'erp-marketplace',
  ],
  [SubscriptionFormula.PREMIUM]: [
    'erp-multiferme',
    'erp-dashboard',
    'erp-taches',
    'erp-recolte',
    'erp-rh',
    'erp-stocks',
    'erp-compta',
    'erp-qualite',
    'erp-conformite',
  ],
  [SubscriptionFormula.ENTERPRISE]: ERP_MODULES.map((module) => module.id),
};
