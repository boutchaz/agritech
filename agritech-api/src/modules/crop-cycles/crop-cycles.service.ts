import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCropCycleDto, CropCycleStatus } from './dto';
import { CropCycleFiltersDto } from './dto/crop-cycle-filters.dto';

@Injectable()
export class CropCyclesService {
  private readonly logger = new Logger(CropCyclesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(organizationId: string, filters: CropCycleFiltersDto = {}) {
    const client = this.databaseService.getClient();
    let query = client
      .from('crop_cycles')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.campaign_id) {
      query = query.eq('campaign_id', filters.campaign_id);
    }
    if (filters.farm_id) {
      query = query.eq('farm_id', filters.farm_id);
    }
    if (filters.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }
    if (filters.variety) {
      query = query.ilike('variety', `%${filters.variety}%`);
    }
    if (filters.crop_type) {
      query = query.ilike('crop_type', `%${filters.crop_type}%`);
    }
    if (filters.planting_date_from) {
      query = query.gte('planting_date', filters.planting_date_from);
    }
    if (filters.planting_date_to) {
      query = query.lte('planting_date', filters.planting_date_to);
    }
    if (filters.expected_harvest_date_from) {
      query = query.gte('expected_harvest_date', filters.expected_harvest_date_from);
    }
    if (filters.expected_harvest_date_to) {
      query = query.lte('expected_harvest_date', filters.expected_harvest_date_to);
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,variety.ilike.%${filters.search}%`);
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
      this.logger.error(`Failed to fetch crop cycles: ${error.message}`);
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
    const client = this.databaseService.getClient();
    const { data, error } = await client
      .from('crop_cycles')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch crop cycle: ${error.message}`);
      throw error;
    }

    return data;
  }

  async create(organizationId: string, userId: string, createDto: CreateCropCycleDto) {
    const client = this.databaseService.getClient();

    const { data, error } = await client
      .from('crop_cycles')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        status: createDto.status || CropCycleStatus.PLANNED,
        ...createDto,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create crop cycle: ${error.message}`);
      throw error;
    }

    return data;
  }

  async update(id: string, organizationId: string, userId: string, updateDto: Partial<CreateCropCycleDto>) {
    const client = this.databaseService.getClient();

    // Check if crop cycle exists
    const { data: existing } = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Crop cycle not found');
    }

    const { data, error } = await client
      .from('crop_cycles')
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
      this.logger.error(`Failed to update crop cycle: ${error.message}`);
      throw error;
    }

    return data;
  }

  async remove(id: string, organizationId: string) {
    const client = this.databaseService.getClient();

    // Check if crop cycle exists
    const { data: existing } = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Crop cycle not found');
    }

    // Prevent deletion of active crop cycles
    if (existing.status === CropCycleStatus.ACTIVE) {
      throw new ConflictException('Cannot delete active crop cycle. Pause or complete it first.');
    }

    const { error } = await client
      .from('crop_cycles')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete crop cycle: ${error.message}`);
      throw error;
    }

    return { id };
  }

  async updateStatus(id: string, organizationId: string, userId: string, status: CropCycleStatus) {
    const client = this.databaseService.getClient();

    // Check if crop cycle exists
    const { data: existing } = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Crop cycle not found');
    }

    const { data, error } = await client
      .from('crop_cycles')
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
      this.logger.error(`Failed to update crop cycle status: ${error.message}`);
      throw error;
    }

    return data;
  }

  async getStatistics(organizationId: string) {
    const client = this.databaseService.getClient();

    // Get total count by status
    const { data: byStatus, error: statusError } = await client
      .from('crop_cycles')
      .select('status')
      .eq('organization_id', organizationId);

    if (statusError) {
      this.logger.error(`Failed to fetch crop cycles by status: ${statusError.message}`);
      throw statusError;
    }

    const statusCounts = byStatus.reduce((acc, cycle) => {
      acc[cycle.status] = (acc[cycle.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get total area
    const { data: areas, error: areaError } = await client
      .from('crop_cycles')
      .select('area_hectares')
      .eq('organization_id', organizationId);

    if (areaError) {
      this.logger.error(`Failed to fetch crop cycle areas: ${areaError.message}`);
      throw areaError;
    }

    const totalArea = areas.reduce((sum, cycle) => sum + (cycle.area_hectares || 0), 0);

    // Get expected vs actual yield
    const { data: yields, error: yieldError } = await client
      .from('crop_cycles')
      .select('expected_yield_kg_per_hectare, actual_yield_kg_per_hectare, area_hectares')
      .eq('organization_id', organizationId);

    if (yieldError) {
      this.logger.error(`Failed to fetch crop cycle yields: ${yieldError.message}`);
      throw yieldError;
    }

    const expectedTotalYield = yields.reduce((sum, cycle) => sum + ((cycle.expected_yield_kg_per_hectare || 0) * (cycle.area_hectares || 0)), 0);
    const actualTotalYield = yields.reduce((sum, cycle) => sum + ((cycle.actual_yield_kg_per_hectare || 0) * (cycle.area_hectares || 0)), 0);

    return {
      total: byStatus.length,
      totalArea,
      totalExpectedYield: expectedTotalYield,
      totalActualYield: actualTotalYield,
      byStatus: statusCounts,
    };
  }
}
