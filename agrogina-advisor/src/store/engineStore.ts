import { create } from 'zustand';

/* ═══════════════════════════════════════════════════════
   AGROGINA CFO v9 — State Store
   Split pricing: ERP fixed + per-hectare agro/AI
   NO existing hardware — all HW is roadmap unlock
   ═══════════════════════════════════════════════════════ */

// ── R&D Cost Items ──
export type RDCategory = 'dev' | 'server' | 'api' | 'hw_engineer' | 'material' | 'test' | 'certification' | 'pilot' | 'other';

export interface RDCostItem {
  id: string;
  name: string;
  category: RDCategory;
  qty: number;
  timeMonths: number;
  monthlyRate: number;
}

export function computeRDTotal(items: RDCostItem[]): number {
  return items.reduce((s, i) => s + i.qty * i.timeMonths * i.monthlyRate, 0);
}

// ── Degressive Per-Hectare Pricing ──
export interface HaPriceTier {
  maxHa: number | null; // null or Infinity means 'and above'
  label: string;    // display label
  pricePerHa: number; // DH/ha/year (ANNUAL)
  valuePerHa?: number;       // Gain estimé / ha / an
  valuePerEmployee?: number; // Gain estimé / employé / an
}

/** Compute total agro price for a given farm size using degressive tiers (ANNUAL) */
export function computeHaTotalPrice(hectares: number, tiers: HaPriceTier[]): number {
  const sorted = [...tiers].sort((a, b) => (a.maxHa || 999999) - (b.maxHa || 999999));
  let remaining = hectares;
  let total = 0;
  let prevMax = 0;
  for (const tier of sorted) {
    const isLastTier = !tier.maxHa || tier.maxHa >= 999999;
    const currentMax = tier.maxHa || 999999;
    const tierWidth = isLastTier ? remaining : currentMax - prevMax;
    const haInTier = Math.min(remaining, tierWidth);
    if (haInTier <= 0) break;
    total += haInTier * tier.pricePerHa;
    remaining -= haInTier;
    prevMax = isLastTier ? prevMax : currentMax;
  }
  return total;
}

/** Average price per ha for display */
export function computeAvgHaPrice(hectares: number, tiers: HaPriceTier[]): number {
  if (hectares <= 0) return 0;
  return computeHaTotalPrice(hectares, tiers) / hectares;
}

/** Compute in STATIC mode: farm falls into one tier, ALL ha at that tier's price */
export function computeHaTotalPriceStatic(hectares: number, tiers: HaPriceTier[]): number {
  const sorted = [...tiers].sort((a, b) => (a.maxHa || 999999) - (b.maxHa || 999999));
  for (const tier of sorted) {
    const isLastTier = !tier.maxHa || tier.maxHa >= 999999;
    const currentMax = tier.maxHa || 999999;
    if (hectares <= currentMax || isLastTier) {
      return hectares * tier.pricePerHa;
    }
  }
  // Shouldn't reach here, but fallback to last tier
  const last = sorted[sorted.length - 1];
  return hectares * last.pricePerHa;
}

export function computeAvgHaPriceStatic(hectares: number, tiers: HaPriceTier[]): number {
  if (hectares <= 0) return 0;
  return computeHaTotalPriceStatic(hectares, tiers) / hectares;
}

// ── ERP Modular Pricing ──
export interface ErpModule {
  id: string;
  name: string;
  desc: string;
  isBase: boolean;     // base = included by default
  checked: boolean;
  pricePerMonth: number; // DH/month
}

/** Total ERP monthly price = sum of checked modules * size multiplier */
export function computeErpMonthly(modules: ErpModule[], sizeMultiplier: number = 1): number {
  return modules.filter(m => m.checked).reduce((a, m) => a + (m.pricePerMonth * sizeMultiplier), 0);
}

// ── Roadmap Module/Hardware ──
export type RoadmapItemType = 'software' | 'hardware' | 'bundle';

export interface HardwareSensor {
  id: string;
  name: string;
  checked: boolean;
  costPrice: number;
  sellPrice: number;
}

export interface RoadmapItem {
  id: string;
  name: string;
  desc: string;
  type: RoadmapItemType;
  checked: boolean; // included in roadmap
  rdItems: RDCostItem[];

  isParserOnly?: boolean; // if true, no client billing at all

  // Hardware specific (Sensors list)
  sensors?: HardwareSensor[];

  // Flexible Revenue impact when unlocked
  mrrPrice: number;
  mrrBasis: 'per_client' | 'per_ha' | 'per_unit' | 'per_head' | 'per_greenhouse';

  upfrontPrice: number;
  upfrontBasis: 'per_client' | 'per_ha' | 'per_unit' | 'per_head' | 'per_greenhouse';

  cogsPrice: number;
  cogsBasis: 'per_client' | 'per_ha' | 'per_unit' | 'per_head' | 'per_greenhouse';

  avgUnitsPerClient: number; // e.g. 5 sensors/devices/heads per client
  dependsOn: string | null;    // id of another item this depends on

  // New Fields: Delivery & Adoption
  adoptionPct: number;         // % of existing clients that adopt this (0-100)
  deliveryMonths: number;      // months of delay after unlock before it generates revenue/clients

  // Acquisition (Dual Population mode for Couveuses/Elevage)
  newClientsPerMonth: number;  // standard "pack complet" organinc users
  newModuleOnlyClientsPerMonth?: number; // users buying specifically JUST the module (no ERP/Agro)

  // M2M specific
  m2mMonthlyPrice?: number; // Price charged to the client for the 4G M2M Sim card (e.g Couveuse standalone)
}

// ── Infrastructure ──
export interface InfraConfig {
  devServerCost: number;     // Dev/production server (always on)
  serverBaseCost: number;    // User-facing server base
  serverStepCost: number;
  serverStepUsers: number;
  agromindApiCostPerUser: number;   // AgromindIA engine cost per user/month
  assistantApiCostPerUser: number;  // Chat assistant API cost per user/month
  geeFixedCost: number;
  geeVariableCostPerHa: number;
  geeThresholdUsers: number;
  weatherApiMonthly: number;     // Weather API service (fixed monthly)
  m2mSimCardMonthly: number;     // M2M SIM per active couveuse module client
}

// ── Sales Rules ──
export interface SalesRules {
  freelanceComY1Pct: number;
  freelanceComY2Pct: number;
  salariedBase: number;
  salariedBonusPerDeal: number;
}

export interface SalesScaling {
  everyNUsers: number;
}

// ── Fixed Costs ──
export interface FixedCosts {
  foundersP1: number; foundersP2: number;
  devP1: number; devP2: number;
  rentP1: number; rentP2: number;
  admP1: number; admP2: number;
  mktBrandP1: number; mktBrandP2: number;
  // Transport (Phase 2 — lié aux commerciaux)
  vehicleMode: 'purchase' | 'loa'; // achat ou LOA
  vehiclePurchasePrice: number;     // prix achat unique
  vehicleLoaMonthly: number;        // coût LOA mensuel
  vehiclesPerCommercial: number;    // 1 véhicule par X commerciaux

  // ── Charges Variables Modules (Auto-déclenchées) ──
  techInstallMonthly: number;       // 5,500 DH/mois
  techInstallTriggerHwModules: number; // dès 1 module HW
  techInstallScalingClients: number; // +1 / 15 clients HW

  savTerrainMonthly: number;        // 4,500 DH/mois
  savTerrainTriggerClients: number; // dès 20 clients HW cumulés
  
  devMaintenanceMonthly: number;    // 9,000 DH/mois
  devMaintenanceTriggerModules: number; // dès 3 modules débloqués + Phase 2
  
  agronomeMonthly: number;          // 7,000 DH/mois
  agronomeTriggerClients: number;   // dès 1er client actif + Phase 2
  
  hwBufferStockPct: number;         // 25% du COGS de la 1ere année de prod
  triggerPhase2MRR: number;
}

// ── Marketing Channel System ──
export interface MarketingChannel {
  id: string;
  name: string;
  emoji: string;
  enabled: boolean;
  budgetMonthly: number;       // DH/month (or annual cost / 12 for salons)
  costPerLead: number;         // DH per lead generated
  leadsPerMonth: number;       // calculated: budgetMonthly / costPerLead (or manual for salons)
  conversionPct: number;       // lead-to-client %  for this channel specifically
  note: string;                // description
  // Salon-specific
  frequency?: 'monthly' | 'yearly';
  eventsPerYear?: number;      // how many salons/year
  costPerEvent?: number;       // cost per salon
  leadsPerEvent?: number;      // leads per salon
  // LinkedIn-specific
  linkedinPremiumCost?: number; // LinkedIn Premium monthly cost (included in budget)
}

export interface MarketingConfig {
  channels: MarketingChannel[];
}

// ── Drone Strategy ──
export type DroneStrategy = 'third_party' | 'proprietary';

// ── Growth Tranches ──
export interface GrowthTranche {
  label: string;       // e.g. 'M1–3'
  fromMonth: number;   // inclusive
  toMonth: number;     // inclusive
  newClientsPerMonth: number;
}

/** Look up how many new clients target for a given month */
export function getNewUsersForMonth(month: number, tranches: GrowthTranche[]): number {
  for (const t of tranches) {
    if (month >= t.fromMonth && month <= t.toMonth) return t.newClientsPerMonth;
  }
  // Fallback to last tranche
  return tranches.length > 0 ? tranches[tranches.length - 1].newClientsPerMonth : 0;
}

// ── Scenarios ──
export interface SavedScenario {
  id: string;
  name: string;
  date: string;
  stateSnapshot: Omit<EngineState, 'savedScenarios' | keyof EngineActions>;
}

// ═══ FULL STATE ═══
export interface EngineState {
  // Pricing (SPLIT)
  erpModules: ErpModule[];      // Modular ERP pricing (base + upsell)
  erpSizeMultiplier: number;    // Multiplier based on organization size (1x, 2.5x, 5x)
  haPriceTiers: HaPriceTier[];  // Degressive per-hectare pricing
  haPricingMode: 'progressive' | 'static';  // progressive = tiered, static = single tier
  discountPct: number;          // bundle discount
  avgHectaresPerClient: number;

  // Roadmap (ALL future modules + hardware)
  roadmapItems: RoadmapItem[];

  // Drone strategy
  droneStrategy: DroneStrategy;
  droneCapExCost: number;
  droneThirdPartyMode: 'per_ha' | 'per_day';
  droneThirdPartyPrice: number; // e.g. 150/ha or 10000/day
  dronePassagesPerMonth: number; // times flown per month during campaign
  droneCampaignMonths: number;   // active months per year
  droneChargeMode: 'per_ha' | 'flat';
  droneChargePrice: number; // what we charge the client (DH/ha or DH/month flat)

  // Infrastructure
  infra: InfraConfig;

  // Sales
  salesFreelanceCount: number;
  salesSalariedCount: number;
  salesCapacityPerRep: number;
  salesRules: SalesRules;
  salesScaling: SalesScaling;
  churnRate: number;

  // Fixed Costs
  fixedCosts: FixedCosts;

  // Marketing
  marketing: MarketingConfig;

  // Dashboard inputs
  growthTranches: GrowthTranche[];
  newUsersPerMonth: number;    // fallback / display
  startCash: number;
  fundAmount: number;
  fundMonth: number;
  unlockRiskBufferPct: number; // e.g. 40 = need 140% of R&D cost in cash

  // ── Scenarios ──
  savedScenarios: SavedScenario[];
  isBuildingScenario: boolean;
  scenarioBuildName: string;
  mainStateBackup: string | null;

  // ── Actions ──
  setErpSizeMultiplier: (v: number) => void;
  setErpModuleBase: (id: string, isBase: boolean) => void;
  toggleErpModule: (id: string) => void;
  updateErpModulePrice: (id: string, price: number) => void;
  updateHaTier: (index: number, pricePerHa: number) => void;
  updateHaTierValue: (index: number, field: 'valuePerHa' | 'valuePerEmployee', value: number) => void;
  setDiscount: (v: number) => void;
  setAvgHectares: (v: number) => void;
  setHaPricingMode: (v: 'progressive' | 'static') => void;

  toggleRoadmapItem: (id: string) => void;
  updateRoadmapItemField: <K extends keyof RoadmapItem>(id: string, field: K, value: RoadmapItem[K]) => void;
  addRDItem: (parentId: string, defaults: Omit<RDCostItem, 'id'>) => void;
  updateRDItem: (parentId: string, itemId: string, field: string, value: string | number) => void;
  removeRDItem: (parentId: string, itemId: string) => void;
  addRoadmapItem: (item: RoadmapItem) => void;
  removeRoadmapItem: (id: string) => void;

  setDroneStrategy: (s: DroneStrategy) => void;
  setDroneCapEx: (v: number) => void;
  setDroneThirdPartyMode: (mode: 'per_ha' | 'per_day') => void;
  setDroneThirdPartyPrice: (v: number) => void;
  setDronePassagesPerMonth: (v: number) => void;
  setDroneCampaignMonths: (v: number) => void;
  setDroneChargeMode: (mode: 'per_ha' | 'flat') => void;
  setDroneChargePrice: (v: number) => void;

  updateInfra: (k: keyof InfraConfig, v: number) => void;

  setSalesFreelance: (v: number) => void;
  setSalesSalaried: (v: number) => void;
  setSalesCapacity: (v: number) => void;
  updateSalesRules: (k: keyof SalesRules, v: number) => void;
  updateSalesScaling: (k: keyof SalesScaling, v: number) => void;
  setChurn: (v: number) => void;

  updateFixedCosts: (k: keyof FixedCosts, v: number | string) => void;
  updateMarketing: (channelId: string, field: string, value: number | boolean) => void;
  toggleMarketingChannel: (channelId: string) => void;

  setNewUsersPerMonth: (v: number) => void;
  updateGrowthTranche: (index: number, field: keyof GrowthTranche, value: number) => void;
  setStartCash: (v: number) => void;
  setFunding: (amount: number, month: number) => void;
  setUnlockRiskBuffer: (v: number) => void;

  // Scenario actions
  saveCurrentScenario: (name: string) => void;
  loadScenario: (id: string) => void;
  removeScenario: (id: string) => void;
  startScenarioBuilder: (name: string) => void;
  cancelScenarioBuilder: () => void;
  finishScenarioBuilder: () => void;
}

// Helper typing to separate state from actions
type EngineActions = {
  [K in keyof EngineState]: EngineState[K] extends Function ? K : never;
}[keyof EngineState];

let _rdId = 0;
const rdId = () => `rd-${++_rdId}`;

let _rmId = 100;
const rmId = () => `rm-${++_rmId}`;

// ── Default Roadmap Items ──
const defaultRoadmap: RoadmapItem[] = [
  {
    id: 'rm-drone', name: 'Imagerie par Drone', desc: 'Acquisition/traitement images IR/Multispectral',
    type: 'software', checked: true, dependsOn: null,
    mrrPrice: 10, mrrBasis: 'per_ha', upfrontPrice: 0, upfrontBasis: 'per_client', cogsPrice: 0, cogsBasis: 'per_client', avgUnitsPerClient: 1,
    adoptionPct: 30, deliveryMonths: 3, newClientsPerMonth: 0,
    rdItems: [
      { id: rdId(), name: 'Dev pipeline images', category: 'dev', qty: 1, timeMonths: 4, monthlyRate: 15000 },
      { id: rdId(), name: 'Ingénieur Agrosciences', category: 'other', qty: 1, timeMonths: 3, monthlyRate: 12000 }
    ],
  },
  {
    id: 'rm-maraich', name: 'Module Maraîchage', desc: 'Algorithmes dédiés, pas de hardware, abonnement par Ha.',
    type: 'software', checked: true, dependsOn: 'rm-drone',
    mrrPrice: 150, mrrBasis: 'per_ha', // Changed from per_client to per_ha exactly as requested
    upfrontPrice: 0, upfrontBasis: 'per_client', cogsPrice: 0, cogsBasis: 'per_client', avgUnitsPerClient: 1,
    adoptionPct: 15, deliveryMonths: 2, newClientsPerMonth: 2,
    rdItems: [
      { id: rdId(), name: 'Dev backend maraîchage', category: 'dev', qty: 1, timeMonths: 2, monthlyRate: 12000 },
      { id: rdId(), name: 'Test QA champs', category: 'test', qty: 1, timeMonths: 1, monthlyRate: 8000 }
    ],
  },
  {
    id: 'rm-iot-sensors', name: 'Hardware Capteurs', desc: 'Capteurs IoT bruts (Gateway, Météo, NPK). Pas d\'abonnement récurrent.',
    type: 'hardware', checked: true, dependsOn: null,
    mrrPrice: 0, mrrBasis: 'per_client', upfrontPrice: 0, upfrontBasis: 'per_unit', cogsPrice: 0, cogsBasis: 'per_unit', avgUnitsPerClient: 1,
    adoptionPct: 20, deliveryMonths: 4, newClientsPerMonth: 1,
    sensors: [
      { id: 's-meteo', name: 'Station Météo', checked: true, costPrice: 3000, sellPrice: 5000 },
      { id: 's-hum', name: 'Capteur Humidité Sol', checked: true, costPrice: 500, sellPrice: 1200 },
      { id: 's-npk', name: 'Capteur NPK', checked: true, costPrice: 1200, sellPrice: 2500 },
      { id: 's-water', name: 'Niveau d\'eau', checked: false, costPrice: 600, sellPrice: 1500 },
      { id: 's-gw', name: 'Gateway LoRaWAN', checked: true, costPrice: 2000, sellPrice: 4000 },
      { id: 's-temp', name: 'Capteur Température', checked: false, costPrice: 300, sellPrice: 800 },
      { id: 's-irrig', name: 'Vanne Irrigation Contrôlée', checked: false, costPrice: 1500, sellPrice: 3500 },
    ],
    rdItems: [
      { id: rdId(), name: 'Ingénieur Hardware', category: 'hw_engineer', qty: 1, timeMonths: 6, monthlyRate: 18000 },
      { id: rdId(), name: 'Prototypage / Matériel', category: 'material', qty: 1, timeMonths: 1, monthlyRate: 40000 },
      { id: rdId(), name: 'Certification FCC/CE', category: 'certification', qty: 1, timeMonths: 1, monthlyRate: 20000 },
    ],
  },
  {
    id: 'rm-iot-parser', name: 'Data Parser IoT', desc: 'Logiciel interne de traitement des trames LoRaWAN/NB-IoT. 0 Facturation.',
    type: 'software', checked: true, dependsOn: 'rm-iot-sensors',
    isParserOnly: true, // Prevents any billing logic for this item
    mrrPrice: 0, mrrBasis: 'per_client', upfrontPrice: 0, upfrontBasis: 'per_client', cogsPrice: 0, cogsBasis: 'per_client', avgUnitsPerClient: 1,
    adoptionPct: 100, deliveryMonths: 1, newClientsPerMonth: 0,
    rdItems: [
      { id: rdId(), name: 'Dev Parser AWS/TCP', category: 'server', qty: 1, timeMonths: 2, monthlyRate: 14000 },
    ],
  },
  {
    id: 'rm-couveuse', name: 'Couveuses Connectées', desc: 'Hardware aviculture : suivi T°/HR, alertes, vision IA. 2 modes possibles.',
    type: 'bundle', checked: true, dependsOn: 'rm-iot-parser',
    mrrPrice: 100, mrrBasis: 'per_unit', upfrontPrice: 8000, upfrontBasis: 'per_unit', cogsPrice: 3500, cogsBasis: 'per_unit', avgUnitsPerClient: 2,
    adoptionPct: 5, deliveryMonths: 6,
    newClientsPerMonth: 2, // "Pack Complet" clients
    newModuleOnlyClientsPerMonth: 3, // "Module Seul + M2M" clients
    m2mMonthlyPrice: 50, // Re-billed 4G SIM Card
    rdItems: [
      { id: rdId(), name: 'Ingénieur Robotique/IA', category: 'dev', qty: 1, timeMonths: 5, monthlyRate: 20000 },
      { id: rdId(), name: 'Prototypage Hardware Couveuse', category: 'material', qty: 1, timeMonths: 1, monthlyRate: 60000 },
    ],
  },
  {
    id: 'rm-elevage', name: 'Module Élevage', desc: 'Gestion cheptel, suivi laitier, puces RFID facturées à la tête.',
    type: 'bundle', checked: true, dependsOn: null,
    mrrPrice: 5, mrrBasis: 'per_head', // Recurring software subscription per head
    upfrontPrice: 15, upfrontBasis: 'per_head', // Price of the RFID/Tag per head
    cogsPrice: 5, cogsBasis: 'per_head', // COGS of the tag
    avgUnitsPerClient: 100, // Number of heads per client
    adoptionPct: 10, deliveryMonths: 3,
    newClientsPerMonth: 1, // Full pack
    newModuleOnlyClientsPerMonth: 2, // Module only
    rdItems: [
      { id: rdId(), name: 'Fullstack Dev Elevage', category: 'dev', qty: 2, timeMonths: 4, monthlyRate: 14000 },
      { id: rdId(), name: 'API puces RFID', category: 'api', qty: 1, timeMonths: 1, monthlyRate: 15000 },
    ],
  },
  {
    id: 'rm-myci-serre', name: 'Mycoculture & Serres', desc: 'Gestion champignons + serres connectées. Facturé à la serre.',
    type: 'bundle', checked: true, dependsOn: 'rm-iot-sensors',
    mrrPrice: 100, mrrBasis: 'per_greenhouse', // Recurring price per greenhouse
    upfrontPrice: 0, upfrontBasis: 'per_unit', cogsPrice: 0, cogsBasis: 'per_unit', avgUnitsPerClient: 5, // 5 greenhouses per client
    adoptionPct: 15, deliveryMonths: 3, newClientsPerMonth: 1, newModuleOnlyClientsPerMonth: 2,
    sensors: [
      { id: 'sm-temp', name: 'Sonde de Température Air/Sol', checked: true, costPrice: 150, sellPrice: 400 },
      { id: 'sm-hum', name: 'Hygrométrie de précision', checked: true, costPrice: 200, sellPrice: 500 },
      { id: 'sm-co2', name: 'Capteur CO2', checked: true, costPrice: 800, sellPrice: 1800 },
      { id: 'sm-air', name: 'Qualité d\'air globale', checked: false, costPrice: 600, sellPrice: 1500 },
      { id: 'sm-nh3', name: 'Capteur Ammoniac (NH3)', checked: false, costPrice: 1200, sellPrice: 3000 },
      { id: 'sm-soil', name: 'Tensiomètre Humidité Sol', checked: false, costPrice: 1000, sellPrice: 2400 },
    ],
    rdItems: [
      { id: rdId(), name: 'Dev module serre/myci', category: 'dev', qty: 1, timeMonths: 3, monthlyRate: 12000 },
    ],
  },
];

export const useEngineStore = create<EngineState>((set) => ({
  // ── Pricing (Split) ──
  erpModules: [
    // BASE modules (included by default)
    { id: 'erp-multiferme', name: 'Multi-Fermes & Parcellaire', desc: 'Gestion multi-fermes, parcelles, rôles, historique', isBase: true, checked: true, pricePerMonth: 100 },
    { id: 'erp-dashboard', name: 'Dashboard & Live Map', desc: 'Dashboard normal et live avec carte des tâches en cours', isBase: true, checked: true, pricePerMonth: 50 },
    { id: 'erp-taches', name: 'Tâches Agronomiques', desc: 'Planification, démarrer/pause, lié au personnel et stocks', isBase: true, checked: true, pricePerMonth: 80 },
    { id: 'erp-recolte', name: 'Récolte & Traçabilité', desc: 'Gestion récolte, destination, traçabilité complète', isBase: true, checked: true, pricePerMonth: 50 },
    // UPSELL modules (optional)
    { id: 'erp-rh', name: 'RH & Paie Agronomique', desc: 'Personnel fixe/jour/tâche, paie auto, partage production', isBase: false, checked: true, pricePerMonth: 80 },
    { id: 'erp-stocks', name: 'Stocks & Entrepôts', desc: 'Alertes, fournisseurs, clients, infrastructures', isBase: false, checked: true, pricePerMonth: 60 },
    { id: 'erp-compta', name: 'Compta & Facturation', desc: 'Devis, factures, relances auto', isBase: false, checked: false, pricePerMonth: 250 },
    { id: 'erp-qualite', name: 'Contrôle Qualité', desc: 'Tests, certificats', isBase: false, checked: false, pricePerMonth: 40 },
    { id: 'erp-conformite', name: 'Conformité & Normes', desc: 'Global GAP, BIO, traçabilité réglementaire', isBase: false, checked: false, pricePerMonth: 60 },
    { id: 'erp-marketplace', name: 'Marketplace', desc: 'Plateforme de vente intégrée', isBase: false, checked: false, pricePerMonth: 50 },
    { id: 'erp-assistant', name: 'Assistant IA', desc: 'Chat IA avec accès aux données fermes et tâches', isBase: false, checked: false, pricePerMonth: 60 },
  ],
  erpSizeMultiplier: 1,
  haPriceTiers: [
    { maxHa: 5, label: '< 5 ha', pricePerHa: 500 },
    { maxHa: 20, label: '5–20 ha', pricePerHa: 400 },
    { maxHa: 100, label: '20–100 ha', pricePerHa: 300 },
    { maxHa: 200, label: '100–200 ha', pricePerHa: 250 },
    { maxHa: 400, label: '200–400 ha', pricePerHa: 200 },
    { maxHa: 500, label: '400–500 ha', pricePerHa: 180 },
    { maxHa: 999999, label: '500+ ha', pricePerHa: 150 },
  ],
  haPricingMode: 'progressive' as const,
  discountPct: 10,
  avgHectaresPerClient: 50,

  // ── Roadmap ──
  roadmapItems: defaultRoadmap,
  droneStrategy: 'third_party' as DroneStrategy,
  droneCapExCost: 150000,
  droneThirdPartyMode: 'per_day',
  droneThirdPartyPrice: 10000,
  dronePassagesPerMonth: 3,
  droneCampaignMonths: 3,
  droneChargeMode: 'per_ha',
  droneChargePrice: 150,

  // ── Infrastructure ──
  infra: {
    devServerCost: 500,
    serverBaseCost: 1000,
    serverStepCost: 2000,
    serverStepUsers: 500,
    agromindApiCostPerUser: 100,
    assistantApiCostPerUser: 50,
    geeFixedCost: 500,
    geeVariableCostPerHa: 2,
    geeThresholdUsers: 100,
    weatherApiMonthly: 300,
    m2mSimCardMonthly: 40,
  },

  // ── Sales ──
  salesFreelanceCount: 1,
  salesSalariedCount: 0,     // No salaried at start
  salesCapacityPerRep: 6,
  salesRules: {
    freelanceComY1Pct: 15,
    freelanceComY2Pct: 5,
    salariedBase: 6000,
    salariedBonusPerDeal: 300,
  },
  salesScaling: { everyNUsers: 50 },
  churnRate: 2,

  // ── Fixed Costs ──
  fixedCosts: {
    foundersP1: 0, foundersP2: 60000,
    devP1: 0, devP2: 15000,
    rentP1: 0, rentP2: 8000,
    admP1: 0, admP2: 5000,
    mktBrandP1: 0, mktBrandP2: 20000,
    vehicleMode: 'loa' as const,
    vehiclePurchasePrice: 150000,
    vehicleLoaMonthly: 3000,
    vehiclesPerCommercial: 2,
    techInstallMonthly: 5500,
    techInstallTriggerHwModules: 1,
    techInstallScalingClients: 15,
    
    savTerrainMonthly: 4500,
    savTerrainTriggerClients: 20,
    
    devMaintenanceMonthly: 9000,
    devMaintenanceTriggerModules: 3,
    
    agronomeMonthly: 7000,
    agronomeTriggerClients: 1,
    
    hwBufferStockPct: 25,
    triggerPhase2MRR: 50000,
  },

  marketing: {
    channels: [
      { id: 'ads', name: 'Publicité Digitale', emoji: '🎯', enabled: true, budgetMonthly: 3000, costPerLead: 150, leadsPerMonth: 20, conversionPct: 5, note: 'Google Ads, Facebook/Instagram Ads, display' },
      { id: 'mailing', name: 'Campagne Emailing', emoji: '📧', enabled: true, budgetMonthly: 500, costPerLead: 50, leadsPerMonth: 10, conversionPct: 3, note: 'Mailchimp/Brevo, newsletters, nurturing sequences' },
      { id: 'salons', name: 'Salons & Événements', emoji: '🏢', enabled: false, budgetMonthly: 0, costPerLead: 250, leadsPerMonth: 0, conversionPct: 15, note: 'Salons agricoles B2B, SIAM, Halieutis', frequency: 'yearly', eventsPerYear: 4, costPerEvent: 5000, leadsPerEvent: 20 },
      { id: 'door2door', name: 'Porte à Porte', emoji: '🚶', enabled: false, budgetMonthly: 2000, costPerLead: 100, leadsPerMonth: 20, conversionPct: 20, note: 'Démarchage terrain, visites fermes, démos sur place' },
      { id: 'sms', name: 'SMS Campaign', emoji: '📱', enabled: false, budgetMonthly: 1000, costPerLead: 30, leadsPerMonth: 33, conversionPct: 2, note: 'Campagnes SMS massives, relances, promotions' },
      { id: 'linkedin', name: 'LinkedIn Campaign', emoji: '💼', enabled: false, budgetMonthly: 2000, costPerLead: 200, leadsPerMonth: 10, conversionPct: 8, note: 'LinkedIn Ads + outreach. Inclut coût Premium.', linkedinPremiumCost: 400 },
      { id: 'content', name: 'Content Marketing', emoji: '✍️', enabled: false, budgetMonthly: 1500, costPerLead: 80, leadsPerMonth: 19, conversionPct: 7, note: 'Blog, SEO, vidéos YouTube, webinaires' },
      { id: 'partners', name: 'Partenariats', emoji: '🤝', enabled: false, budgetMonthly: 0, costPerLead: 0, leadsPerMonth: 5, conversionPct: 25, note: 'Partenariats distributeurs, coopératives, ONG agricoles' },
    ],
  },

  // ── Dashboard ──
  growthTranches: [
    { label: 'M1–3', fromMonth: 1, toMonth: 3, newClientsPerMonth: 1 },
    { label: 'M4–6', fromMonth: 4, toMonth: 6, newClientsPerMonth: 2 },
    { label: 'M7–12', fromMonth: 7, toMonth: 12, newClientsPerMonth: 3 },
    { label: 'M13–24', fromMonth: 13, toMonth: 24, newClientsPerMonth: 5 },
    { label: 'M25–60', fromMonth: 25, toMonth: 60, newClientsPerMonth: 8 },
  ],
  newUsersPerMonth: 3,
  startCash: 0,
  fundAmount: 2000000,
  fundMonth: 12,
  unlockRiskBufferPct: 40,

  savedScenarios: [],
  isBuildingScenario: false,
  scenarioBuildName: '',
  mainStateBackup: null,

  // ══════════ ACTIONS ══════════

  setErpSizeMultiplier: (v) => set({ erpSizeMultiplier: v }),
  setErpModuleBase: (id, isBase) => set(s => ({
    erpModules: s.erpModules.map(m => m.id === id ? { ...m, isBase } : m),
  })),
  toggleErpModule: (id) => set(s => ({
    erpModules: s.erpModules.map(m => m.id === id ? { ...m, checked: !m.checked } : m),
  })),
  updateErpModulePrice: (id, price) => set(s => ({
    erpModules: s.erpModules.map(m => m.id === id ? { ...m, pricePerMonth: price } : m),
  })),
  updateHaTier: (index, pricePerHa) => set(s => ({
    haPriceTiers: s.haPriceTiers.map((t, i) => i === index ? { ...t, pricePerHa } : t),
  })),
  updateHaTierValue: (index, field, value) => set(s => ({
    haPriceTiers: s.haPriceTiers.map((t, i) => i === index ? { ...t, [field]: value } : t),
  })),
  setDiscount: (v) => set({ discountPct: v }),
  setAvgHectares: (v) => set({ avgHectaresPerClient: v }),
  setHaPricingMode: (v) => set({ haPricingMode: v }),

  toggleRoadmapItem: (id) => set(s => ({
    roadmapItems: s.roadmapItems.map(i => i.id === id ? { ...i, checked: !i.checked } : i),
  })),

  updateRoadmapItemField: (id, field, value) => set(s => ({
    roadmapItems: s.roadmapItems.map(i => i.id === id ? { ...i, [field]: value } : i),
  })),

  addRDItem: (parentId, defaults) => set(s => ({
    roadmapItems: s.roadmapItems.map(i => i.id === parentId
      ? { ...i, rdItems: [...i.rdItems, { ...defaults, id: rdId() }] }
      : i),
  })),

  updateRDItem: (parentId, itemId, field, value) => set(s => ({
    roadmapItems: s.roadmapItems.map(i => i.id === parentId
      ? { ...i, rdItems: i.rdItems.map(r => r.id === itemId ? { ...r, [field]: value } : r) }
      : i),
  })),

  removeRDItem: (parentId, itemId) => set(s => ({
    roadmapItems: s.roadmapItems.map(i => i.id === parentId
      ? { ...i, rdItems: i.rdItems.filter(r => r.id !== itemId) }
      : i),
  })),

  addRoadmapItem: (item) => set(s => ({
    roadmapItems: [...s.roadmapItems, { ...item, id: `rm-${rmId()}` }],
  })),

  removeRoadmapItem: (id) => set(s => ({
    roadmapItems: s.roadmapItems.filter(i => i.id !== id),
  })),

  setDroneStrategy: (st) => set({ droneStrategy: st }),
  setDroneCapEx: (v) => set({ droneCapExCost: v }),
  setDroneThirdPartyMode: (mode) => set({ droneThirdPartyMode: mode }),
  setDroneThirdPartyPrice: (v) => set({ droneThirdPartyPrice: v }),
  setDronePassagesPerMonth: (v) => set({ dronePassagesPerMonth: v }),
  setDroneCampaignMonths: (v) => set({ droneCampaignMonths: v }),
  setDroneChargeMode: (mode) => set({ droneChargeMode: mode }),
  setDroneChargePrice: (v) => set({ droneChargePrice: v }),

  updateInfra: (k, v) => set(s => ({ infra: { ...s.infra, [k]: v } })),

  setSalesFreelance: (v) => set({ salesFreelanceCount: v }),
  setSalesSalaried: (v) => set({ salesSalariedCount: v }),
  setSalesCapacity: (v) => set({ salesCapacityPerRep: v }),
  updateSalesRules: (k, v) => set(s => ({ salesRules: { ...s.salesRules, [k]: v } })),
  updateSalesScaling: (k, v) => set(s => ({ salesScaling: { ...s.salesScaling, [k]: v } })),
  setChurn: (v) => set({ churnRate: v }),

  updateFixedCosts: (k, v) => set(s => ({ fixedCosts: { ...s.fixedCosts, [k]: v } })),
  updateMarketing: (channelId, field, value) => set(s => ({
    marketing: {
      channels: s.marketing.channels.map(ch =>
        ch.id === channelId ? { ...ch, [field]: value } : ch
      ),
    },
  })),
  toggleMarketingChannel: (channelId) => set(s => ({
    marketing: {
      channels: s.marketing.channels.map(ch =>
        ch.id === channelId ? { ...ch, enabled: !ch.enabled } : ch
      ),
    },
  })),

  setNewUsersPerMonth: (v) => set({ newUsersPerMonth: v }),
  updateGrowthTranche: (index, field, value) => set(s => ({
    growthTranches: s.growthTranches.map((t, i) => i === index ? { ...t, [field]: value } : t),
  })),
  setStartCash: (v) => set({ startCash: v }),
  setFunding: (amount, month) => set({ fundAmount: amount, fundMonth: month }),
  setUnlockRiskBuffer: (v) => set({ unlockRiskBufferPct: v }),

  saveCurrentScenario: (name) => set(s => {
    // Extract only data fields, ignoring functions and savedScenarios itself
    const snapshot: any = {};
    for (const [key, value] of Object.entries(s)) {
      if (typeof value !== 'function' && key !== 'savedScenarios') {
        // Deep copy to prevent reference mutation
        snapshot[key] = JSON.parse(JSON.stringify(value));
      }
    }

    const newScenario: SavedScenario = {
      id: `scen-${Date.now()}`,
      name,
      date: new Date().toISOString(),
      stateSnapshot: snapshot
    };

    return { savedScenarios: [...s.savedScenarios, newScenario] };
  }),

  loadScenario: (id) => set(s => {
    const scen = s.savedScenarios.find(x => x.id === id);
    if (!scen) return s;
    // Overwrite current state with snapshot, keeping existing functions and savedScenarios array
    return { ...scen.stateSnapshot, savedScenarios: s.savedScenarios };
  }),

  removeScenario: (id) => set(s => ({
    savedScenarios: s.savedScenarios.filter(x => x.id !== id)
  })),

  startScenarioBuilder: (name) => set(s => {
    // Snapshot current state
    const snapshot: any = {};
    for (const [key, value] of Object.entries(s)) {
      if (typeof value !== 'function' && key !== 'savedScenarios' && key !== 'mainStateBackup' && key !== 'isBuildingScenario' && key !== 'scenarioBuildName') {
        snapshot[key] = JSON.parse(JSON.stringify(value));
      }
    }
    return {
      isBuildingScenario: true,
      scenarioBuildName: name,
      mainStateBackup: JSON.stringify(snapshot)
    };
  }),

  cancelScenarioBuilder: () => set(s => {
    if (!s.mainStateBackup) return { isBuildingScenario: false, scenarioBuildName: '', mainStateBackup: null };
    const restored = JSON.parse(s.mainStateBackup);
    return {
      ...restored,
      isBuildingScenario: false,
      scenarioBuildName: '',
      mainStateBackup: null,
      savedScenarios: s.savedScenarios // keep saved scenarios intact
    };
  }),

  finishScenarioBuilder: () => set(s => {
    if (!s.mainStateBackup) return { isBuildingScenario: false, scenarioBuildName: '', mainStateBackup: null };

    // 1. Save the CURRENT (modified) state into a new scenario
    const snapshot: any = {};
    for (const [key, value] of Object.entries(s)) {
      if (typeof value !== 'function' && key !== 'savedScenarios' && key !== 'mainStateBackup' && key !== 'isBuildingScenario' && key !== 'scenarioBuildName') {
        snapshot[key] = JSON.parse(JSON.stringify(value));
      }
    }
    const newScenario: SavedScenario = {
      id: `scen-${Date.now()}`,
      name: s.scenarioBuildName || `Scénario ${s.savedScenarios.length + 1}`,
      date: new Date().toISOString(),
      stateSnapshot: snapshot
    };

    // 2. Restore the original state from backup
    const restored = JSON.parse(s.mainStateBackup);

    return {
      ...restored,
      savedScenarios: [...s.savedScenarios, newScenario], // Add the new scenario
      isBuildingScenario: false,
      scenarioBuildName: '',
      mainStateBackup: null
    };
  }),
}));
