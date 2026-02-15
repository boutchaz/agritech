import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateBiologicalAssetDto, BiologicalAssetStatus } from './dto';
import { BiologicalAssetFiltersDto } from './dto/biological-asset-filters.dto';

@Injectable()
export class BiologicalAssetsService {
  private readonly logger = new Logger(BiologicalAssetsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(organizationId: string, filters: BiologicalAssetFiltersDto = {}) {
    const client = this.databaseService.getAdminClient();
    let query = client
      .from('biological_assets')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    // Apply filters
    if (filters.asset_type) {
      query = query.eq('asset_type', filters.asset_type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.variety) {
      query = query.ilike('variety', `%${filters.variety}%`);
    }
    if (filters.rootstock) {
      query = query.ilike('rootstock', `%${filters.rootstock}%`);
    }
    if (filters.farm_id) {
      query = query.eq('farm_id', filters.farm_id);
    }
    if (filters.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }
    if (filters.min_age_years) {
      query = query.gte('age_years', filters.min_age_years);
    }
    if (filters.max_age_years) {
      query = query.lte('age_years', filters.max_age_years);
    }
    if (filters.planting_date_from) {
      query = query.gte('planting_date', filters.planting_date_from);
    }
    if (filters.planting_date_to) {
      query = query.lte('planting_date', filters.planting_date_to);
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }

    // Apply pagination and sorting
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 12;
    const sortBy = filters.sortBy || 'planting_date';
    const sortDir = filters.sortDir === 'asc' ? true : false;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order(sortBy, { ascending: sortDir }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(`Failed to fetch biological assets: ${error.message}`);
      throw error;
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  async findOne(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('biological_assets')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch biological asset: ${error.message}`);
      throw error;
    }

    return data;
  }

  async create(organizationId: string, userId: string, createDto: CreateBiologicalAssetDto) {
    const client = this.databaseService.getAdminClient();

    // Calculate age if not provided
    if (!createDto.age_years && createDto.planting_date) {
      const plantingDate = new Date(createDto.planting_date);
      const now = new Date();
      const ageInYears = Math.floor((now.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
      createDto.age_years = ageInYears;
    }

    const { data, error } = await client
      .from('biological_assets')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        status: createDto.status || BiologicalAssetStatus.ACTIVE,
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

    // Check if biological asset exists
    const { data: existing } = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Biological asset not found');
    }

    // Recalculate age if planting_date changed
    if (updateDto.planting_date) {
      const plantingDate = new Date(updateDto.planting_date);
      const now = new Date();
      const ageInYears = Math.floor((now.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
      updateDto.age_years = ageInYears;
    }

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

    // Check if biological asset exists
    const { data: existing } = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Biological asset not found');
    }

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

    // Check if biological asset exists
    const { data: existing } = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Biological asset not found');
    }

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

    // Get total count by type
    const { data: byType, error: typeError } = await client
      .from('biological_assets')
      .select('asset_type')
      .eq('organization_id', organizationId);

    if (typeError) {
      this.logger.error(`Failed to fetch biological assets by type: ${typeError.message}`);
      throw typeError;
    }

    const typeCounts = byType.reduce((acc, asset) => {
      acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get total count by status
    const { data: byStatus, error: statusError } = await client
      .from('biological_assets')
      .select('status')
      .eq('organization_id', organizationId);

    if (statusError) {
      this.logger.error(`Failed to fetch biological assets by status: ${statusError.message}`);
      throw statusError;
    }

    const statusCounts = byStatus.reduce((acc, asset) => {
      acc[asset.status] = (acc[asset.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get total quantity
    const { data: quantities, error: quantityError } = await client
      .from('biological_assets')
      .select('quantity')
      .eq('organization_id', organizationId);

    if (quantityError) {
      this.logger.error(`Failed to fetch biological asset quantities: ${quantityError.message}`);
      throw quantityError;
    }

    const totalQuantity = quantities.reduce((sum, asset) => sum + (asset.quantity || 0), 0);

    return {
      total: byType.length,
      totalQuantity,
      byType: typeCounts,
      byStatus: statusCounts,
    };
  }
}
