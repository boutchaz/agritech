import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WorkUnitFiltersDto, CreateWorkUnitDto, UpdateWorkUnitDto } from './dto';

@Injectable()
export class WorkUnitsService {
  private readonly logger = new Logger(WorkUnitsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all work units with optional filters
   */
  async findAll(organizationId: string, filters?: WorkUnitFiltersDto): Promise<any> {
    const client = this.databaseService.getAdminClient();

    try {
      let query = client
        .from('work_units')
        .select('*')
        .eq('organization_id', organizationId);

      // Apply filters
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.unit_category) {
        query = query.eq('unit_category', filters.unit_category);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      // Apply pagination
      if (filters?.page && filters?.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query = query.range(offset, offset + filters.limit - 1);
      }

      // Default ordering: by unit_category.asc, name.asc
      query = query.order('unit_category', { ascending: true }).order('name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Failed to fetch work units: ${error.message}`);
        throw new BadRequestException(`Failed to fetch work units: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error fetching work units:', error);
      throw error;
    }
  }

  /**
   * Get a single work unit by ID
   */
  async findOne(id: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('work_units')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch work unit: ${error.message}`);
      throw new BadRequestException(`Failed to fetch work unit: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Work unit not found');
    }

    return data;
  }

  /**
   * Create a new work unit
   */
  async create(dto: CreateWorkUnitDto, organizationId: string, createdBy: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    try {
      // Check for duplicate code in organization
      const { data: existing } = await client
        .from('work_units')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('code', dto.code.toUpperCase())
        .maybeSingle();

      if (existing) {
        throw new BadRequestException(`Work unit with code '${dto.code}' already exists`);
      }

      const { data, error } = await client
        .from('work_units')
        .insert({
          organization_id: organizationId,
          code: dto.code.toUpperCase(),
          name: dto.name,
          name_ar: dto.name_ar,
          name_fr: dto.name_fr,
          unit_category: dto.unit_category,
          base_unit: dto.base_unit,
          conversion_factor: dto.conversion_factor,
          is_active: dto.is_active !== undefined ? dto.is_active : true,
          allow_decimal: dto.allow_decimal !== undefined ? dto.allow_decimal : false,
          usage_count: 0,
          created_by: createdBy,
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to create work unit: ${error.message}`);
        throw new BadRequestException(`Failed to create work unit: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error creating work unit:', error);
      throw error;
    }
  }

  /**
   * Update a work unit
   */
  async update(id: string, organizationId: string, dto: UpdateWorkUnitDto): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // Verify unit exists
    await this.findOne(id, organizationId);

    const { data, error } = await client
      .from('work_units')
      .update(dto)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update work unit: ${error.message}`);
      throw new BadRequestException(`Failed to update work unit: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a work unit
   */
  async delete(id: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // Verify unit exists
    const unit = await this.findOne(id, organizationId);

    // Check if unit is being used
    if (unit.usage_count > 0) {
      throw new BadRequestException(
        'Cannot delete work unit that is being used. Set is_active to false instead.'
      );
    }

    const { error } = await client
      .from('work_units')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete work unit: ${error.message}`);
      throw new BadRequestException(`Failed to delete work unit: ${error.message}`);
    }

    return { message: 'Work unit deleted successfully' };
  }
}
