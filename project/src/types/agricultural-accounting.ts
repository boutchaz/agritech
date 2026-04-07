export type FiscalYearStatus = 'open' | 'closing' | 'closed';
export type FiscalPeriodType = 'monthly' | 'quarterly';
export type CampaignType = 'general' | 'rainfed' | 'irrigated' | 'greenhouse';
export type CampaignStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type CropCycleStatus = 'planned' | 'land_prep' | 'growing' | 'harvesting' | 'completed' | 'cancelled';
export type ValuationMethod = 'cost' | 'fair_value' | 'nrv';
export type BiologicalAssetType = 'bearer_plant' | 'consumable_plant' | 'livestock_bearer' | 'livestock_consumable';
export type BiologicalAssetStatus = 'immature' | 'productive' | 'declining' | 'disposed';
export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'units_of_production';
export type FairValueMethod = 'market_price' | 'dcf' | 'cost_approach';
export type FairValueLevel = 1 | 2 | 3;
export type AllocationSourceType = 'cost' | 'revenue' | 'journal_item';
export type AllocationMethod = 'manual' | 'area' | 'production' | 'time' | 'equal';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface FiscalYear {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  status: FiscalYearStatus;
  is_current: boolean;
  period_type: FiscalPeriodType;
  closed_at?: string | null;
  closed_by?: string | null;
  closing_notes?: string | null;
  created_at: string;
  created_by?: string | null;
  updated_at: string;
}

export interface FiscalPeriod {
  id: string;
  fiscal_year_id: string;
  organization_id: string;
  period_number: number;
  name: string;
  start_date: string;
  end_date: string;
  status: FiscalYearStatus;
  closed_at?: string | null;
  closed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgriculturalCampaign {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  campaign_type: CampaignType;
  status: CampaignStatus;
  is_current: boolean;
  primary_fiscal_year_id?: string | null;
  secondary_fiscal_year_id?: string | null;
  total_area_ha: number;
  total_planned_production: number;
  total_actual_production: number;
  total_costs: number;
  total_revenue: number;
  created_at: string;
  created_by?: string | null;
  updated_at: string;
}

export interface CropCycle {
  id: string;
  organization_id: string;
  farm_id: string;
  parcel_id?: string | null;
  crop_id?: string | null;
  variety_id?: string | null;
  crop_type: string;
  variety_name?: string | null;
  cycle_code: string;
  cycle_name?: string | null;
  campaign_id?: string | null;
  fiscal_year_id?: string | null;
  season?: Season | null;
  land_prep_date?: string | null;
  planting_date?: string | null;
  expected_harvest_start?: string | null;
  expected_harvest_end?: string | null;
  actual_harvest_start?: string | null;
  actual_harvest_end?: string | null;
  cycle_closed_date?: string | null;
  status: CropCycleStatus;
  planted_area_ha?: number | null;
  harvested_area_ha?: number | null;
  expected_yield_per_ha?: number | null;
  expected_total_yield?: number | null;
  actual_yield_per_ha?: number | null;
  actual_total_yield?: number | null;
  yield_unit: string;
  average_quality_grade?: string | null;
  quality_notes?: string | null;
  total_costs: number;
  total_revenue: number;
  net_profit: number;
  cost_per_ha?: number | null;
  cost_per_unit?: number | null;
  revenue_per_ha?: number | null;
  profit_margin?: number | null;
  wip_valuation: number;
  inventory_valuation: number;
  valuation_method: ValuationMethod;
  last_valuation_date?: string | null;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
  updated_at: string;
  updated_by?: string | null;
  
  cycle_type?: CycleType | null;
  cycle_category?: CycleCategory | null;
  is_perennial?: boolean | null;
  template_id?: string | null;
  biological_asset_id?: string | null;
}

export interface BiologicalAsset {
  id: string;
  organization_id: string;
  farm_id: string;
  parcel_id?: string | null;
  asset_type: BiologicalAssetType;
  asset_category: string;
  asset_name: string;
  asset_code: string;
  quantity?: number | null;
  area_ha?: number | null;
  acquisition_date: string;
  maturity_date?: string | null;
  expected_useful_life_years?: number | null;
  current_age_years?: number | null;
  status: BiologicalAssetStatus;
  is_productive: boolean;
  initial_cost: number;
  accumulated_depreciation: number;
  carrying_amount?: number | null;
  fair_value?: number | null;
  fair_value_date?: string | null;
  fair_value_method?: FairValueMethod | null;
  fair_value_level?: FairValueLevel | null;
  expected_annual_yield?: number | null;
  expected_yield_unit: string;
  actual_ytd_yield: number;
  depreciation_method: DepreciationMethod;
  annual_depreciation?: number | null;
  residual_value: number;
  variety_info?: string | null;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
  updated_at: string;
}

export interface BiologicalAssetValuation {
  id: string;
  biological_asset_id: string;
  organization_id: string;
  valuation_date: string;
  fiscal_year_id?: string | null;
  fiscal_period_id?: string | null;
  previous_fair_value?: number | null;
  current_fair_value: number;
  fair_value_change?: number | null;
  valuation_method: FairValueMethod;
  fair_value_level: FairValueLevel;
  market_price_reference?: number | null;
  discount_rate?: number | null;
  quantity_change: number;
  natural_increase: number;
  harvest_quantity: number;
  harvest_value: number;
  journal_entry_id?: string | null;
  valuation_report_url?: string | null;
  appraiser_name?: string | null;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface CropCycleAllocation {
  id: string;
  organization_id: string;
  source_type: AllocationSourceType;
  source_id: string;
  crop_cycle_id: string;
  allocation_percentage: number;
  allocated_amount: number;
  allocation_method: AllocationMethod;
  allocation_notes?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface CropCyclePnL {
  id: string;
  organization_id: string;
  cycle_code: string;
  cycle_name?: string | null;
  crop_type: string;
  variety_name?: string | null;
  status: CropCycleStatus;
  campaign_id?: string | null;
  campaign_name?: string | null;
  fiscal_year_id?: string | null;
  fiscal_year_name?: string | null;
  farm_id: string;
  farm_name?: string | null;
  parcel_id?: string | null;
  parcel_name?: string | null;
  planted_area_ha?: number | null;
  harvested_area_ha?: number | null;
  actual_total_yield?: number | null;
  yield_unit: string;
  total_costs: number;
  total_revenue: number;
  net_profit: number;
  cost_per_ha?: number | null;
  revenue_per_ha?: number | null;
  profit_margin?: number | null;
  planting_date?: string | null;
  actual_harvest_end?: string | null;
  wip_valuation: number;
  inventory_valuation: number;
}

export interface CampaignSummary {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  status: CampaignStatus;
  start_date: string;
  end_date: string;
  total_cycles: number;
  total_planted_area?: number | null;
  total_costs?: number | null;
  total_revenue?: number | null;
  net_profit?: number | null;
  profit_margin?: number | null;
}

export interface FiscalCampaignReconciliation {
  fiscal_year_id: string;
  fiscal_year_name: string;
  organization_id: string;
  campaign_id: string;
  campaign_name: string;
  costs_in_fiscal_year: number;
  revenue_in_fiscal_year: number;
  costs_in_campaign: number;
  revenue_in_campaign: number;
}

export interface CreateFiscalYearInput {
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  period_type?: FiscalPeriodType;
  is_current?: boolean;
}

export interface UpdateFiscalYearInput {
  id: string;
  name?: string;
  status?: FiscalYearStatus;
  is_current?: boolean;
  closing_notes?: string;
}

export interface CreateCampaignInput {
  name: string;
  code: string;
  description?: string;
  start_date: string;
  end_date: string;
  campaign_type?: CampaignType;
  is_current?: boolean;
  primary_fiscal_year_id?: string;
  secondary_fiscal_year_id?: string;
}

export interface UpdateCampaignInput {
  id: string;
  name?: string;
  description?: string;
  status?: CampaignStatus;
  is_current?: boolean;
}

export interface CreateCropCycleInput {
  farm_id: string;
  parcel_id?: string;
  crop_id?: string;
  variety_id?: string;
  crop_type: string;
  variety_name?: string;
  cycle_code: string;
  cycle_name?: string;
  campaign_id?: string;
  fiscal_year_id?: string;
  season?: Season;
  land_prep_date?: string;
  planting_date?: string;
  expected_harvest_start?: string;
  expected_harvest_end?: string;
  planted_area_ha?: number;
  expected_yield_per_ha?: number;
  expected_total_yield?: number;
  yield_unit?: string;
  notes?: string;
  cycle_type?: CycleType;
  cycle_category?: CycleCategory;
  is_perennial?: boolean;
  template_id?: string;
}

export interface UpdateCropCycleInput {
  id: string;
  status?: CropCycleStatus;
  actual_harvest_start?: string;
  actual_harvest_end?: string;
  cycle_closed_date?: string;
  harvested_area_ha?: number;
  actual_yield_per_ha?: number;
  actual_total_yield?: number;
  average_quality_grade?: string;
  quality_notes?: string;
  wip_valuation?: number;
  inventory_valuation?: number;
  valuation_method?: ValuationMethod;
  notes?: string;
  cycle_type?: CycleType;
  cycle_category?: CycleCategory;
  is_perennial?: boolean;
}

export interface CreateBiologicalAssetInput {
  farm_id: string;
  parcel_id?: string;
  asset_type: BiologicalAssetType;
  asset_category: string;
  asset_name: string;
  asset_code: string;
  quantity?: number;
  area_ha?: number;
  acquisition_date: string;
  maturity_date?: string;
  expected_useful_life_years?: number;
  initial_cost: number;
  expected_annual_yield?: number;
  expected_yield_unit?: string;
  depreciation_method?: DepreciationMethod;
  residual_value?: number;
  variety_info?: string;
  notes?: string;
}

export interface CreateBiologicalAssetValuationInput {
  biological_asset_id: string;
  valuation_date: string;
  fiscal_year_id?: string;
  fiscal_period_id?: string;
  current_fair_value: number;
  valuation_method: FairValueMethod;
  fair_value_level: FairValueLevel;
  market_price_reference?: number;
  discount_rate?: number;
  quantity_change?: number;
  natural_increase?: number;
  harvest_quantity?: number;
  harvest_value?: number;
  valuation_report_url?: string;
  appraiser_name?: string;
  notes?: string;
}

export interface CreateCropCycleAllocationInput {
  source_type: AllocationSourceType;
  source_id: string;
  crop_cycle_id: string;
  allocation_percentage: number;
  allocated_amount: number;
  allocation_method?: AllocationMethod;
  allocation_notes?: string;
}

export interface MoroccoCropTemplate {
  name: string;
  code_prefix: string;
  typical_planting_month: number;
  typical_harvest_month: number;
  cycle_duration_months: number;
  yield_unit: string;
  average_yield_per_ha: number;
  is_perennial: boolean;
}

export const MOROCCO_CROP_TEMPLATES: Record<string, MoroccoCropTemplate> = {
  wheat: {
    name: 'Blé tendre',
    code_prefix: 'BLE',
    typical_planting_month: 11,
    typical_harvest_month: 6,
    cycle_duration_months: 7,
    yield_unit: 'quintaux',
    average_yield_per_ha: 20,
    is_perennial: false,
  },
  barley: {
    name: 'Orge',
    code_prefix: 'ORG',
    typical_planting_month: 11,
    typical_harvest_month: 5,
    cycle_duration_months: 6,
    yield_unit: 'quintaux',
    average_yield_per_ha: 18,
    is_perennial: false,
  },
  olive: {
    name: 'Olivier',
    code_prefix: 'OLV',
    typical_planting_month: 0,
    typical_harvest_month: 12,
    cycle_duration_months: 12,
    yield_unit: 'kg',
    average_yield_per_ha: 2500,
    is_perennial: true,
  },
  citrus: {
    name: 'Agrumes',
    code_prefix: 'AGR',
    typical_planting_month: 0,
    typical_harvest_month: 1,
    cycle_duration_months: 12,
    yield_unit: 'tonnes',
    average_yield_per_ha: 25,
    is_perennial: true,
  },
  tomato: {
    name: 'Tomate',
    code_prefix: 'TOM',
    typical_planting_month: 3,
    typical_harvest_month: 7,
    cycle_duration_months: 4,
    yield_unit: 'tonnes',
    average_yield_per_ha: 80,
    is_perennial: false,
  },
  potato: {
    name: 'Pomme de terre',
    code_prefix: 'PDT',
    typical_planting_month: 2,
    typical_harvest_month: 6,
    cycle_duration_months: 4,
    yield_unit: 'tonnes',
    average_yield_per_ha: 30,
    is_perennial: false,
  },
  sugar_beet: {
    name: 'Betterave sucrière',
    code_prefix: 'BET',
    typical_planting_month: 9,
    typical_harvest_month: 6,
    cycle_duration_months: 9,
    yield_unit: 'tonnes',
    average_yield_per_ha: 60,
    is_perennial: false,
  },
  date_palm: {
    name: 'Palmier dattier',
    code_prefix: 'DAT',
    typical_planting_month: 0,
    typical_harvest_month: 10,
    cycle_duration_months: 12,
    yield_unit: 'kg',
    average_yield_per_ha: 6000,
    is_perennial: true,
  },
};

export type CycleType = 'annual' | 'perennial' | 'multi_harvest' | 'continuous';
export type CycleCategory = 'short' | 'medium' | 'long' | 'perennial';

export interface CropTemplate {
  id: string;
  organization_id?: string;
  crop_type: string;
  crop_name: string;
  cycle_type: CycleType;
  cycle_category?: CycleCategory;
  is_perennial: boolean;
  typical_duration_days?: number;
  typical_duration_months?: number;
  typical_planting_months: number[];
  typical_harvest_months: number[];
  yield_unit: string;
  average_yield_per_ha?: number;
  code_prefix: string;
  stages?: { name: string; order: number; duration_days: number }[];
  is_global: boolean;
}

export interface CropCycleStage {
  id: string;
  crop_cycle_id: string;
  stage_name: string;
  stage_order: number;
  expected_start_date?: string;
  actual_start_date?: string;
  expected_end_date?: string;
  actual_end_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  notes?: string;
}

export interface HarvestEvent {
  id: string;
  crop_cycle_id: string;
  harvest_date: string;
  harvest_number: number;
  quantity?: number;
  quantity_unit: string;
  quality_grade?: string;
  quality_notes?: string;
}

export interface CreateCropCycleStageInput {
  crop_cycle_id: string;
  stage_name: string;
  stage_order: number;
  expected_start_date?: string;
  expected_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  notes?: string;
}

export interface UpdateCropCycleStageInput {
  id: string;
  stage_name?: string;
  expected_start_date?: string;
  expected_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  notes?: string;
}

export interface CreateHarvestEventInput {
  crop_cycle_id: string;
  harvest_date: string;
  harvest_number?: number;
  quantity?: number;
  quantity_unit?: string;
  quality_grade?: string;
  quality_notes?: string;
}

export interface UpdateHarvestEventInput {
  id: string;
  harvest_date?: string;
  quantity?: number;
  quantity_unit?: string;
  quality_grade?: string;
  quality_notes?: string;
}

export interface HarvestEventStats {
  total_harvests: number;
  total_quantity: number;
  average_quantity: number;
  last_harvest_date: string | null;
}

export function generateCycleCode(
  cropPrefix: string,
  year: number,
  parcelCode: string,
  sequenceNumber?: number
): string {
  const seq = sequenceNumber ? `-${String(sequenceNumber).padStart(2, '0')}` : '';
  return `${cropPrefix}-${year}-${parcelCode}${seq}`;
}

export function calculateCampaignYear(date: Date, campaignStartMonth = 9): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  if (month >= campaignStartMonth) {
    return `${year}/${year + 1}`;
  }
  return `${year - 1}/${year}`;
}

export function isCropCycleActive(cycle: CropCycle): boolean {
  return ['land_prep', 'growing', 'harvesting'].includes(cycle.status);
}

export function calculateWIPValuation(
  accumulatedCosts: number,
  percentComplete: number,
  valuationMethod: ValuationMethod = 'cost'
): number {
  if (valuationMethod === 'cost') {
    return accumulatedCosts;
  }
  return accumulatedCosts * (percentComplete / 100);
}
