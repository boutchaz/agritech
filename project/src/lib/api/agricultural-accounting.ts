import { apiClient } from '../api-client';
import type { PaginatedQuery, PaginatedResponse } from './types';
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
  CampaignStatus,
  CropCycleStage,
  HarvestEvent,
  HarvestEventStats,
  CreateFiscalYearInput,
  UpdateFiscalYearInput,
  CreateCampaignInput,
  UpdateCampaignInput,
  CreateCropCycleInput,
  UpdateCropCycleInput,
  CreateBiologicalAssetInput,
  CreateBiologicalAssetValuationInput,
  CreateCropCycleAllocationInput,
  CreateCropCycleStageInput,
  UpdateCropCycleStageInput,
  CreateHarvestEventInput,
  UpdateHarvestEventInput,
} from '@/types/agricultural-accounting';

interface PaginatedApiResponse<T> {
  data?: T[];
}

function toQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.append(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

function unwrapListResponse<T>(response: T[] | PaginatedApiResponse<T>): T[] {
  if (Array.isArray(response)) {
    return response;
  }
  return response.data || [];
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes('not found');
}

export const fiscalYearsApi = {
  async getAll(organizationId: string): Promise<FiscalYear[]> {
    // Backend now returns PaginatedResponse<FiscalYear>; older callers expected
    // a raw array. Unwrap both shapes so consumers don't crash with
    // `.filter is not a function`.
    const response = await apiClient.get<FiscalYear[] | PaginatedResponse<FiscalYear>>(
      '/api/v1/fiscal-years?sortBy=start_date&sortDir=desc',
      {},
      organizationId
    );
    if (Array.isArray(response)) return response;
    return response?.data ?? [];
  },

  async getCurrent(organizationId: string): Promise<FiscalYear | null> {
    try {
      return await apiClient.get<FiscalYear>('/api/v1/fiscal-years/active', {}, organizationId);
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  },

  async getForDate(organizationId: string, date: string): Promise<FiscalYear | null> {
    const fiscalYears = await this.getAll(organizationId);
    return (
      fiscalYears.find((fiscalYear) => fiscalYear.start_date <= date && fiscalYear.end_date >= date) ||
      null
    );
  },

  async create(organizationId: string, input: CreateFiscalYearInput): Promise<FiscalYear> {
    return apiClient.post<FiscalYear>('/api/v1/fiscal-years', input, {}, organizationId);
  },

  async update(input: UpdateFiscalYearInput): Promise<FiscalYear> {
    const { id, ...updates } = input;
    return apiClient.patch<FiscalYear>(`/api/v1/fiscal-years/${id}`, updates);
  },

  async close(id: string, closingNotes?: string): Promise<FiscalYear> {
    return apiClient.post<FiscalYear>(`/api/v1/fiscal-years/${id}/close`, { closing_notes: closingNotes });
  },

  async getPeriods(fiscalYearId: string): Promise<FiscalPeriod[]> {
    const query = toQueryString({
      fiscal_year_id: fiscalYearId,
      sortBy: 'period_number',
      sortDir: 'asc',
    });

    const response = await apiClient.get<FiscalPeriod[] | PaginatedApiResponse<FiscalPeriod>>(
      `/api/v1/fiscal-periods${query}`
    );
    return unwrapListResponse(response);
  },
};

export const campaignsApi = {
  async getAll(organizationId: string): Promise<AgriculturalCampaign[]> {
    const response = await apiClient.get<PaginatedApiResponse<AgriculturalCampaign>>(
      '/api/v1/campaigns?sortBy=start_date&sortDir=desc',
      {},
      organizationId
    );
    return response.data || [];
  },

  async getCurrent(organizationId: string): Promise<AgriculturalCampaign | null> {
    const response = await apiClient.get<PaginatedApiResponse<AgriculturalCampaign>>(
      '/api/v1/campaigns?status=active&page=1&pageSize=1&sortBy=start_date&sortDir=desc',
      {},
      organizationId
    );
    return response.data?.[0] || null;
  },

  async getById(id: string): Promise<AgriculturalCampaign> {
    return apiClient.get<AgriculturalCampaign>(`/api/v1/campaigns/${id}`);
  },

  async create(organizationId: string, input: CreateCampaignInput): Promise<AgriculturalCampaign> {
    return apiClient.post<AgriculturalCampaign>('/api/v1/campaigns', input, {}, organizationId);
  },

  async update(input: UpdateCampaignInput): Promise<AgriculturalCampaign> {
    const { id, ...updates } = input;
    return apiClient.patch<AgriculturalCampaign>(`/api/v1/campaigns/${id}`, updates);
  },

  async updateStatus(id: string, status: CampaignStatus): Promise<AgriculturalCampaign> {
    return apiClient.patch<AgriculturalCampaign>(`/api/v1/campaigns/${id}/status`, { status });
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/v1/campaigns/${id}`);
  },

  async getSummary(organizationId: string): Promise<CampaignSummary[]> {
    const response = await apiClient.get<CampaignSummary[] | PaginatedApiResponse<CampaignSummary>>(
      '/api/v1/campaign-summary?sortBy=start_date&sortDir=desc',
      {},
      organizationId
    );
    return unwrapListResponse(response);
  },
};

export const cropCyclesApi = {
  async getPaginated(
    organizationId: string,
    query?: PaginatedQuery & {
      campaign_id?: string;
      fiscal_year_id?: string;
      farm_id?: string;
      parcel_id?: string;
      status?: string;
      crop_type?: string;
      cycle_type?: string;
      season?: string;
    }
  ): Promise<PaginatedResponse<CropCycle>> {
    const queryString = toQueryString({
      ...query,
      sortBy: query?.sortBy || 'created_at',
      sortDir: query?.sortDir || 'desc',
    });

    return apiClient.get<PaginatedResponse<CropCycle>>(
      `/api/v1/crop-cycles${queryString}`,
      {},
      organizationId
    );
  },

  async getAll(
    organizationId: string,
    filters?: {
      campaign_id?: string;
      fiscal_year_id?: string;
      farm_id?: string;
      parcel_id?: string;
      status?: string;
      crop_type?: string;
      cycle_type?: string;
      season?: string;
    }
  ): Promise<CropCycle[]> {
    const query = toQueryString({
      ...filters,
      sortBy: 'created_at',
      sortDir: 'desc',
    });

    const response = await apiClient.get<PaginatedApiResponse<CropCycle>>(
      `/api/v1/crop-cycles${query}`,
      {},
      organizationId
    );
    return response.data || [];
  },

  async getById(id: string): Promise<CropCycle> {
    return apiClient.get<CropCycle>(`/api/v1/crop-cycles/${id}`);
  },

  async getPnL(
    organizationId: string,
    filters?: {
      campaign_id?: string;
      fiscal_year_id?: string;
      farm_id?: string;
    }
  ): Promise<CropCyclePnL[]> {
    const query = toQueryString({
      ...filters,
      sortBy: 'net_profit',
      sortDir: 'desc',
    });

    const response = await apiClient.get<CropCyclePnL[] | PaginatedApiResponse<CropCyclePnL>>(
      `/api/v1/crop-cycles/pnl${query}`,
      {},
      organizationId
    );
    return unwrapListResponse(response);
  },

  async create(organizationId: string, input: CreateCropCycleInput): Promise<CropCycle> {
    return apiClient.post<CropCycle>('/api/v1/crop-cycles', input, {}, organizationId);
  },

  async update(input: UpdateCropCycleInput): Promise<CropCycle> {
    const { id, ...updates } = input;
    return apiClient.patch<CropCycle>(`/api/v1/crop-cycles/${id}`, updates);
  },

  async complete(id: string): Promise<CropCycle> {
    return apiClient.patch<CropCycle>(`/api/v1/crop-cycles/${id}`, {
      status: 'completed',
      cycle_closed_date: new Date().toISOString().split('T')[0],
    });
  },

  async getAllocations(cropCycleId: string): Promise<CropCycleAllocation[]> {
    const response = await apiClient.get<CropCycleAllocation[] | PaginatedApiResponse<CropCycleAllocation>>(
      `/api/v1/crop-cycle-allocations${toQueryString({ crop_cycle_id: cropCycleId })}`
    );
    return unwrapListResponse(response);
  },

  async createAllocation(
    organizationId: string,
    input: CreateCropCycleAllocationInput
  ): Promise<CropCycleAllocation> {
    return apiClient.post<CropCycleAllocation>('/api/v1/crop-cycle-allocations', input, {}, organizationId);
  },

  async deleteAllocation(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/v1/crop-cycle-allocations/${id}`);
  },
};

export const cropCycleStagesApi = {
  async getByCropCycle(cropCycleId: string): Promise<CropCycleStage[]> {
    const response = await apiClient.get<CropCycleStage[]>(`/api/v1/crop-cycle-stages/cycle/${cropCycleId}`);
    return response || [];
  },

  async getById(id: string): Promise<CropCycleStage> {
    return apiClient.get<CropCycleStage>(`/api/v1/crop-cycle-stages/${id}`);
  },

  async create(input: CreateCropCycleStageInput): Promise<CropCycleStage> {
    return apiClient.post<CropCycleStage>('/api/v1/crop-cycle-stages', input);
  },

  async createBulk(stages: CreateCropCycleStageInput[]): Promise<CropCycleStage[]> {
    const created = await Promise.all(stages.map((stage) => this.create(stage)));
    return created;
  },

  async update(input: UpdateCropCycleStageInput): Promise<CropCycleStage> {
    const { id, ...updates } = input;
    return apiClient.patch<CropCycleStage>(`/api/v1/crop-cycle-stages/${id}`, updates);
  },

  async updateStatus(id: string, status: CropCycleStage['status']): Promise<CropCycleStage> {
    const now = new Date().toISOString().split('T')[0];
    const updates: Record<string, string> = { status };

    if (status === 'in_progress') {
      updates.actual_start_date = now;
    } else if (status === 'completed') {
      updates.actual_end_date = now;
    }

    return apiClient.patch<CropCycleStage>(`/api/v1/crop-cycle-stages/${id}`, updates);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/v1/crop-cycle-stages/${id}`);
  },

  async generateFromTemplate(
    cropCycleId: string,
    templateStages: { name: string; order: number; duration_days: number }[],
    plantingDate: string
  ): Promise<CropCycleStage[]> {
    return apiClient.post<CropCycleStage[]>(`/api/v1/crop-cycle-stages/generate/${cropCycleId}`, {
      template_stages: templateStages,
      planting_date: plantingDate,
    });
  },
};

export const harvestEventsApi = {
  async getByCropCycle(cropCycleId: string): Promise<HarvestEvent[]> {
    const response = await apiClient.get<HarvestEvent[]>(`/api/v1/harvest-events/cycle/${cropCycleId}`);
    return response || [];
  },

  async getById(id: string): Promise<HarvestEvent> {
    return apiClient.get<HarvestEvent>(`/api/v1/harvest-events/${id}`);
  },

  async create(input: CreateHarvestEventInput): Promise<HarvestEvent> {
    return apiClient.post<HarvestEvent>('/api/v1/harvest-events', input);
  },

  async update(input: UpdateHarvestEventInput): Promise<HarvestEvent> {
    const { id, ...updates } = input;
    return apiClient.patch<HarvestEvent>(`/api/v1/harvest-events/${id}`, updates);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/v1/harvest-events/${id}`);
  },

  async getStatsByCropCycle(cropCycleId: string): Promise<HarvestEventStats> {
    return apiClient.get<HarvestEventStats>(`/api/v1/harvest-events/cycle/${cropCycleId}/stats`);
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
    const query = toQueryString({
      ...filters,
      sortBy: 'asset_name',
      sortDir: 'asc',
    });

    const response = await apiClient.get<PaginatedApiResponse<BiologicalAsset>>(
      `/api/v1/biological-assets${query}`,
      {},
      organizationId
    );
    return response.data || [];
  },

  async getById(id: string): Promise<BiologicalAsset> {
    return apiClient.get<BiologicalAsset>(`/api/v1/biological-assets/${id}`);
  },

  async create(organizationId: string, input: CreateBiologicalAssetInput): Promise<BiologicalAsset> {
    return apiClient.post<BiologicalAsset>('/api/v1/biological-assets', input, {}, organizationId);
  },

  async update(id: string, updates: Partial<BiologicalAsset>): Promise<BiologicalAsset> {
    return apiClient.patch<BiologicalAsset>(`/api/v1/biological-assets/${id}`, updates);
  },

  async getValuations(biologicalAssetId: string): Promise<BiologicalAssetValuation[]> {
    const response = await apiClient.get<
      BiologicalAssetValuation[] | PaginatedApiResponse<BiologicalAssetValuation>
    >(`/api/v1/biological-assets/${biologicalAssetId}/valuations?sortBy=valuation_date&sortDir=desc`);
    return unwrapListResponse(response);
  },

  async createValuation(
    organizationId: string,
    input: CreateBiologicalAssetValuationInput
  ): Promise<BiologicalAssetValuation> {
    const asset = await this.getById(input.biological_asset_id);
    const previousValue = asset.fair_value || asset.initial_cost;

    const valuation = await apiClient.post<BiologicalAssetValuation>(
      `/api/v1/biological-assets/${input.biological_asset_id}/valuations`,
      {
        ...input,
        previous_fair_value: previousValue,
        fair_value_change: input.current_fair_value - previousValue,
      },
      {},
      organizationId
    );

    await this.update(input.biological_asset_id, {
      fair_value: input.current_fair_value,
      fair_value_date: input.valuation_date,
      fair_value_method: input.valuation_method,
      fair_value_level: input.fair_value_level,
    });

    return valuation;
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
    const response = await apiClient.get<unknown[]>(
      '/api/v1/fiscal-campaign-reconciliation',
      {},
      organizationId
    );
    return response || [];
  },

  async getWIPValuationReport(organizationId: string): Promise<{
    active_cycles: CropCycle[];
    total_wip: number;
    total_inventory: number;
    by_farm: Record<string, { wip: number; inventory: number; cycle_count: number }>;
  }> {
    const activeCycles = await cropCyclesApi.getAll(organizationId, {
      status: 'land_prep',
    });
    const growingCycles = await cropCyclesApi.getAll(organizationId, {
      status: 'growing',
    });
    const harvestingCycles = await cropCyclesApi.getAll(organizationId, {
      status: 'harvesting',
    });

    const active_cycles = [...activeCycles, ...growingCycles, ...harvestingCycles];
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
    const allAssets = await biologicalAssetsApi.getAll(organizationId);
    const assets = allAssets.filter((asset) => asset.status !== 'disposed');

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

    for (const asset of assets) {
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

    return { assets, totals, by_type };
  },
};
