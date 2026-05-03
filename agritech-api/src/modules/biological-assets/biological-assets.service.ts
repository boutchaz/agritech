import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { sanitizeSearch } from '../../common/utils/sanitize-search';
import { CreateBiologicalAssetDto, BiologicalAssetStatus } from './dto';
import { BiologicalAssetFiltersDto } from './dto/biological-asset-filters.dto';
import { CreateValuationDto } from './dto/create-valuation.dto';
import {
  paginatedResponse,
  SortDirection,
} from '../../common/dto/paginated-query.dto';

@Injectable()
export class BiologicalAssetsService {
  private readonly logger = new Logger(BiologicalAssetsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(organizationId: string, filters: BiologicalAssetFiltersDto = {}) {
    const client = this.databaseService.getAdminClient();
    let query = client
      .from('biological_assets')
      .select('*, farms!biological_assets_farm_id_fkey(name), parcels!biological_assets_parcel_id_fkey(name)', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (filters.asset_type) {
      query = query.eq('asset_type', filters.asset_type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.variety) {
      const sv = sanitizeSearch(filters.variety);
      if (sv) query = query.ilike('variety_info', `%${sv}%`);
    }
    if (filters.rootstock) {
      const sr = sanitizeSearch(filters.rootstock);
      if (sr) query = query.ilike('variety_info', `%${sr}%`);
    }
    if (filters.farm_id) {
      query = query.eq('farm_id', filters.farm_id);
    }
    if (filters.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }
    if (filters.date_from) {
      query = query.gte('acquisition_date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('acquisition_date', filters.date_to);
    }
    if (filters.search) {
      const s = sanitizeSearch(filters.search);
      if (s) query = query.or(`asset_name.ilike.%${s}%,asset_code.ilike.%${s}%,notes.ilike.%${s}%`);
    }

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 12;
    const sortBy = filters.sortBy || 'acquisition_date';
    const sortDir = filters.sortDir === SortDirection.ASC;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order(sortBy, { ascending: sortDir }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(`Failed to fetch biological assets: ${error.message}`);
      throw error;
    }

    // Transform joined relations
    const transformed = (data || []).map((asset: Record<string, unknown>) => ({
      ...asset,
      farm: asset.farms ? { name: (asset.farms as Record<string, unknown>).name } : null,
      parcel: asset.parcels ? { name: (asset.parcels as Record<string, unknown>).name } : null,
      farms: undefined,
      parcels: undefined,
    }));

    return paginatedResponse(transformed, count || 0, page, pageSize);
  }

  async findOne(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('biological_assets')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Biological asset not found');
    }

    return data;
  }

  async create(organizationId: string, userId: string, createDto: CreateBiologicalAssetDto) {
    const client = this.databaseService.getAdminClient();

    // Calculate carrying_amount = initial_cost (at creation)
    const carryingAmount = createDto.initial_cost;

    const { data, error } = await client
      .from('biological_assets')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        status: createDto.status || BiologicalAssetStatus.IMMATURE,
        carrying_amount: carryingAmount,
        ...createDto,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create biological asset: ${error.message}`);
      throw error;
    }

    return data;
  }

  async update(id: string, organizationId: string, userId: string, updateDto: Partial<CreateBiologicalAssetDto>) {
    const client = this.databaseService.getAdminClient();

    await this.findOne(id, organizationId);

    const { data, error } = await client
      .from('biological_assets')
      .update({
        ...updateDto,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update biological asset: ${error.message}`);
      throw error;
    }

    return data;
  }

  async remove(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    await this.findOne(id, organizationId);

    const { error } = await client
      .from('biological_assets')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete biological asset: ${error.message}`);
      throw error;
    }

    return { id };
  }

  async updateStatus(id: string, organizationId: string, userId: string, status: BiologicalAssetStatus) {
    const client = this.databaseService.getAdminClient();

    await this.findOne(id, organizationId);

    const { data, error } = await client
      .from('biological_assets')
      .update({
        status,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update biological asset status: ${error.message}`);
      throw error;
    }

    return data;
  }

  async getStatistics(organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('biological_assets')
      .select('asset_type, status, quantity, initial_cost, carrying_amount, fair_value')
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to fetch biological assets statistics: ${error.message}`);
      throw error;
    }

    const assets = data || [];
    const typeCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    let totalQuantity = 0;
    let totalCarryingAmount = 0;
    let totalFairValue = 0;

    for (const asset of assets) {
      typeCounts[asset.asset_type] = (typeCounts[asset.asset_type] || 0) + 1;
      statusCounts[asset.status] = (statusCounts[asset.status] || 0) + 1;
      totalQuantity += asset.quantity || 0;
      totalCarryingAmount += asset.carrying_amount || asset.initial_cost || 0;
      totalFairValue += asset.fair_value || 0;
    }

    return {
      total: assets.length,
      totalQuantity,
      totalCarryingAmount,
      totalFairValue,
      unrealizedGainLoss: totalFairValue - totalCarryingAmount,
      byType: typeCounts,
      byStatus: statusCounts,
    };
  }

  // ── Valuations ──

  async getValuations(assetId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // Verify asset belongs to org
    await this.findOne(assetId, organizationId);

    const { data, error } = await client
      .from('biological_asset_valuations')
      .select('*')
      .eq('biological_asset_id', assetId)
      .eq('organization_id', organizationId)
      .order('valuation_date', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch valuations: ${error.message}`);
      throw error;
    }

    return { data: data || [] };
  }

  async createValuation(assetId: string, organizationId: string, userId: string, dto: CreateValuationDto) {
    const client = this.databaseService.getAdminClient();

    // Verify asset exists and belongs to org
    await this.findOne(assetId, organizationId);

    const { data, error } = await client
      .from('biological_asset_valuations')
      .insert({
        biological_asset_id: assetId,
        organization_id: organizationId,
        created_by: userId,
        ...dto,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create valuation: ${error.message}`);
      throw error;
    }

    return data;
  }
}
