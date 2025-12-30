import { supabase } from '../supabase';
import type {
  FiscalYear,
  FiscalPeriod,
  AgriculturalCampaign,
  CropCycle,
  BiologicalAsset,
  BiologicalAssetValuation,
  CropCycleAllocation,
  CropCyclePnL,
  CampaignSummary,
  CreateFiscalYearInput,
  UpdateFiscalYearInput,
  CreateCampaignInput,
  UpdateCampaignInput,
  CreateCropCycleInput,
  UpdateCropCycleInput,
  CreateBiologicalAssetInput,
  CreateBiologicalAssetValuationInput,
  CreateCropCycleAllocationInput,
} from '@/types/agricultural-accounting';

export const fiscalYearsApi = {
  async getAll(organizationId: string): Promise<FiscalYear[]> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('organization_id', organizationId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getCurrent(organizationId: string): Promise<FiscalYear | null> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_current', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getForDate(organizationId: string, date: string): Promise<FiscalYear | null> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('organization_id', organizationId)
      .lte('start_date', date)
      .gte('end_date', date)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async create(organizationId: string, input: CreateFiscalYearInput): Promise<FiscalYear> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .insert({ ...input, organization_id: organizationId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(input: UpdateFiscalYearInput): Promise<FiscalYear> {
    const { id, ...updates } = input;
    const { data, error } = await supabase
      .from('fiscal_years')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async close(id: string, closingNotes?: string): Promise<FiscalYear> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closing_notes: closingNotes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getPeriods(fiscalYearId: string): Promise<FiscalPeriod[]> {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('fiscal_year_id', fiscalYearId)
      .order('period_number');

    if (error) throw error;
    return data || [];
  },
};

export const campaignsApi = {
  async getAll(organizationId: string): Promise<AgriculturalCampaign[]> {
    const { data, error } = await supabase
      .from('agricultural_campaigns')
      .select('*')
      .eq('organization_id', organizationId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getCurrent(organizationId: string): Promise<AgriculturalCampaign | null> {
    const { data, error } = await supabase
      .from('agricultural_campaigns')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_current', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getById(id: string): Promise<AgriculturalCampaign> {
    const { data, error } = await supabase
      .from('agricultural_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(organizationId: string, input: CreateCampaignInput): Promise<AgriculturalCampaign> {
    const { data, error } = await supabase
      .from('agricultural_campaigns')
      .insert({ ...input, organization_id: organizationId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(input: UpdateCampaignInput): Promise<AgriculturalCampaign> {
    const { id, ...updates } = input;
    const { data, error } = await supabase
      .from('agricultural_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSummary(organizationId: string): Promise<CampaignSummary[]> {
    const { data, error } = await supabase
      .from('campaign_summary')
      .select('*')
      .eq('organization_id', organizationId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

export const cropCyclesApi = {
  async getAll(
    organizationId: string,
    filters?: {
      campaign_id?: string;
      fiscal_year_id?: string;
      farm_id?: string;
      parcel_id?: string;
      status?: string;
      crop_type?: string;
    }
  ): Promise<CropCycle[]> {
    let query = supabase
      .from('crop_cycles')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters?.campaign_id) query = query.eq('campaign_id', filters.campaign_id);
    if (filters?.fiscal_year_id) query = query.eq('fiscal_year_id', filters.fiscal_year_id);
    if (filters?.farm_id) query = query.eq('farm_id', filters.farm_id);
    if (filters?.parcel_id) query = query.eq('parcel_id', filters.parcel_id);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.crop_type) query = query.eq('crop_type', filters.crop_type);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<CropCycle> {
    const { data, error } = await supabase
      .from('crop_cycles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getPnL(
    organizationId: string,
    filters?: {
      campaign_id?: string;
      fiscal_year_id?: string;
      farm_id?: string;
    }
  ): Promise<CropCyclePnL[]> {
    let query = supabase
      .from('crop_cycle_pnl')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters?.campaign_id) query = query.eq('campaign_id', filters.campaign_id);
    if (filters?.fiscal_year_id) query = query.eq('fiscal_year_id', filters.fiscal_year_id);
    if (filters?.farm_id) query = query.eq('farm_id', filters.farm_id);

    const { data, error } = await query.order('net_profit', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(organizationId: string, input: CreateCropCycleInput): Promise<CropCycle> {
    const { data, error } = await supabase
      .from('crop_cycles')
      .insert({ ...input, organization_id: organizationId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(input: UpdateCropCycleInput): Promise<CropCycle> {
    const { id, ...updates } = input;
    const { data, error } = await supabase
      .from('crop_cycles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async complete(id: string): Promise<CropCycle> {
    const { data, error } = await supabase
      .from('crop_cycles')
      .update({
        status: 'completed',
        cycle_closed_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAllocations(cropCycleId: string): Promise<CropCycleAllocation[]> {
    const { data, error } = await supabase
      .from('crop_cycle_allocations')
      .select('*')
      .eq('crop_cycle_id', cropCycleId);

    if (error) throw error;
    return data || [];
  },

  async createAllocation(
    organizationId: string,
    input: CreateCropCycleAllocationInput
  ): Promise<CropCycleAllocation> {
    const { data, error } = await supabase
      .from('crop_cycle_allocations')
      .insert({ ...input, organization_id: organizationId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAllocation(id: string): Promise<void> {
    const { error } = await supabase
      .from('crop_cycle_allocations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const biologicalAssetsApi = {
  async getAll(
    organizationId: string,
    filters?: {
      farm_id?: string;
      parcel_id?: string;
      asset_type?: string;
      status?: string;
    }
  ): Promise<BiologicalAsset[]> {
    let query = supabase
      .from('biological_assets')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters?.farm_id) query = query.eq('farm_id', filters.farm_id);
    if (filters?.parcel_id) query = query.eq('parcel_id', filters.parcel_id);
    if (filters?.asset_type) query = query.eq('asset_type', filters.asset_type);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query.order('asset_name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<BiologicalAsset> {
    const { data, error } = await supabase
      .from('biological_assets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(organizationId: string, input: CreateBiologicalAssetInput): Promise<BiologicalAsset> {
    const { data, error } = await supabase
      .from('biological_assets')
      .insert({ ...input, organization_id: organizationId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<BiologicalAsset>): Promise<BiologicalAsset> {
    const { data, error } = await supabase
      .from('biological_assets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getValuations(biologicalAssetId: string): Promise<BiologicalAssetValuation[]> {
    const { data, error } = await supabase
      .from('biological_asset_valuations')
      .select('*')
      .eq('biological_asset_id', biologicalAssetId)
      .order('valuation_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createValuation(
    organizationId: string,
    input: CreateBiologicalAssetValuationInput
  ): Promise<BiologicalAssetValuation> {
    const asset = await this.getById(input.biological_asset_id);
    const previousValue = asset.fair_value || asset.initial_cost;

    const { data, error } = await supabase
      .from('biological_asset_valuations')
      .insert({
        ...input,
        organization_id: organizationId,
        previous_fair_value: previousValue,
        fair_value_change: input.current_fair_value - previousValue,
      })
      .select()
      .single();

    if (error) throw error;

    await this.update(input.biological_asset_id, {
      fair_value: input.current_fair_value,
      fair_value_date: input.valuation_date,
      fair_value_method: input.valuation_method,
      fair_value_level: input.fair_value_level,
    });

    return data;
  },
};

export const reportingApi = {
  async getCropCyclePnLReport(
    organizationId: string,
    campaignId?: string,
    fiscalYearId?: string
  ): Promise<{
    cycles: CropCyclePnL[];
    totals: {
      total_costs: number;
      total_revenue: number;
      net_profit: number;
      total_area: number;
      average_margin: number;
    };
    by_crop_type: Record<string, {
      total_costs: number;
      total_revenue: number;
      net_profit: number;
      total_area: number;
      cycle_count: number;
    }>;
  }> {
    const cycles = await cropCyclesApi.getPnL(organizationId, {
      campaign_id: campaignId,
      fiscal_year_id: fiscalYearId,
    });

    const totals = cycles.reduce(
      (acc, c) => ({
        total_costs: acc.total_costs + c.total_costs,
        total_revenue: acc.total_revenue + c.total_revenue,
        net_profit: acc.net_profit + c.net_profit,
        total_area: acc.total_area + (c.planted_area_ha || 0),
        average_margin: 0,
      }),
      { total_costs: 0, total_revenue: 0, net_profit: 0, total_area: 0, average_margin: 0 }
    );

    totals.average_margin = totals.total_revenue > 0
      ? (totals.net_profit / totals.total_revenue) * 100
      : 0;

    const by_crop_type: Record<string, {
      total_costs: number;
      total_revenue: number;
      net_profit: number;
      total_area: number;
      cycle_count: number;
    }> = {};

    for (const cycle of cycles) {
      if (!by_crop_type[cycle.crop_type]) {
        by_crop_type[cycle.crop_type] = {
          total_costs: 0,
          total_revenue: 0,
          net_profit: 0,
          total_area: 0,
          cycle_count: 0,
        };
      }
      by_crop_type[cycle.crop_type].total_costs += cycle.total_costs;
      by_crop_type[cycle.crop_type].total_revenue += cycle.total_revenue;
      by_crop_type[cycle.crop_type].net_profit += cycle.net_profit;
      by_crop_type[cycle.crop_type].total_area += cycle.planted_area_ha || 0;
      by_crop_type[cycle.crop_type].cycle_count += 1;
    }

    return { cycles, totals, by_crop_type };
  },

  async getFiscalCampaignReconciliation(organizationId: string) {
    const { data, error } = await supabase
      .from('fiscal_campaign_reconciliation')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) throw error;
    return data || [];
  },

  async getWIPValuationReport(organizationId: string): Promise<{
    active_cycles: CropCycle[];
    total_wip: number;
    total_inventory: number;
    by_farm: Record<string, { wip: number; inventory: number; cycle_count: number }>;
  }> {
    const { data: cycles, error } = await supabase
      .from('crop_cycles')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['land_prep', 'growing', 'harvesting']);

    if (error) throw error;

    const active_cycles = cycles || [];
    let total_wip = 0;
    let total_inventory = 0;
    const by_farm: Record<string, { wip: number; inventory: number; cycle_count: number }> = {};

    for (const cycle of active_cycles) {
      total_wip += cycle.wip_valuation || 0;
      total_inventory += cycle.inventory_valuation || 0;

      if (!by_farm[cycle.farm_id]) {
        by_farm[cycle.farm_id] = { wip: 0, inventory: 0, cycle_count: 0 };
      }
      by_farm[cycle.farm_id].wip += cycle.wip_valuation || 0;
      by_farm[cycle.farm_id].inventory += cycle.inventory_valuation || 0;
      by_farm[cycle.farm_id].cycle_count += 1;
    }

    return { active_cycles, total_wip, total_inventory, by_farm };
  },

  async getBiologicalAssetsSummary(organizationId: string): Promise<{
    assets: BiologicalAsset[];
    totals: {
      total_initial_cost: number;
      total_carrying_amount: number;
      total_fair_value: number;
      total_depreciation: number;
      unrealized_gain_loss: number;
    };
    by_type: Record<string, {
      count: number;
      total_area: number;
      total_quantity: number;
      carrying_amount: number;
      fair_value: number;
    }>;
  }> {
    const { data: assets, error } = await supabase
      .from('biological_assets')
      .select('*')
      .eq('organization_id', organizationId)
      .neq('status', 'disposed');

    if (error) throw error;

    const allAssets = assets || [];
    const totals = {
      total_initial_cost: 0,
      total_carrying_amount: 0,
      total_fair_value: 0,
      total_depreciation: 0,
      unrealized_gain_loss: 0,
    };

    const by_type: Record<string, {
      count: number;
      total_area: number;
      total_quantity: number;
      carrying_amount: number;
      fair_value: number;
    }> = {};

    for (const asset of allAssets) {
      totals.total_initial_cost += asset.initial_cost || 0;
      totals.total_carrying_amount += asset.carrying_amount || asset.initial_cost || 0;
      totals.total_fair_value += asset.fair_value || 0;
      totals.total_depreciation += asset.accumulated_depreciation || 0;

      if (!by_type[asset.asset_type]) {
        by_type[asset.asset_type] = {
          count: 0,
          total_area: 0,
          total_quantity: 0,
          carrying_amount: 0,
          fair_value: 0,
        };
      }
      by_type[asset.asset_type].count += 1;
      by_type[asset.asset_type].total_area += asset.area_ha || 0;
      by_type[asset.asset_type].total_quantity += asset.quantity || 0;
      by_type[asset.asset_type].carrying_amount += asset.carrying_amount || asset.initial_cost || 0;
      by_type[asset.asset_type].fair_value += asset.fair_value || 0;
    }

    totals.unrealized_gain_loss = totals.total_fair_value - totals.total_carrying_amount;

    return { assets: allAssets, totals, by_type };
  },
};
