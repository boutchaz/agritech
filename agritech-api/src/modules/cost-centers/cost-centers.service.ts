import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCostCenterDto, UpdateCostCenterDto } from './dto';

@Injectable()
export class CostCentersService {
  private readonly logger = new Logger(CostCentersService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all cost centers for an organization
   */
  async findAll(organizationId: string, filters?: { is_active?: boolean; search?: string }) {
    const supabaseClient = this.databaseService.getClient();

    try {
      let query = supabaseClient
        .from('cost_centers')
        .select('*')
        .eq('organization_id', organizationId)
        .order('code');

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Error fetching cost centers:', error);
        throw new BadRequestException(`Failed to fetch cost centers: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      this.logger.error('Error in findAll cost centers:', error);
      throw error;
    }
  }

  /**
   * Get a single cost center by ID
   */
  async findOne(id: string, organizationId: string) {
    const supabaseClient = this.databaseService.getClient();

    try {
      const { data, error } = await supabaseClient
        .from('cost_centers')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) {
        throw new NotFoundException(`Cost center with ID ${id} not found`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error in findOne cost center:', error);
      throw error;
    }
  }

  /**
   * Create a new cost center
   */
  async create(dto: CreateCostCenterDto) {
    const supabaseClient = this.databaseService.getClient();

    try {
      // Check for duplicate code
      const { data: existing } = await supabaseClient
        .from('cost_centers')
        .select('id')
        .eq('organization_id', dto.organization_id)
        .eq('code', dto.code)
        .single();

      if (existing) {
        throw new BadRequestException(`Cost center with code ${dto.code} already exists`);
      }

      const { data, error } = await supabaseClient
        .from('cost_centers')
        .insert({
          code: dto.code,
          name: dto.name,
          description: dto.description,
          parent_id: dto.parent_id,
          farm_id: dto.farm_id,
          parcel_id: dto.parcel_id,
          is_active: dto.is_active ?? true,
          organization_id: dto.organization_id,
          created_by: dto.created_by,
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating cost center:', error);
        throw new BadRequestException(`Failed to create cost center: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error in create cost center:', error);
      throw error;
    }
  }

  /**
   * Update a cost center
   */
  async update(id: string, organizationId: string, userId: string, dto: UpdateCostCenterDto) {
    const supabaseClient = this.databaseService.getClient();

    try {
      // Check if cost center exists
      await this.findOne(id, organizationId);

      // Check for duplicate code if updating code
      if (dto.code) {
        const { data: existing } = await supabaseClient
          .from('cost_centers')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('code', dto.code)
          .neq('id', id)
          .single();

        if (existing) {
          throw new BadRequestException(`Cost center with code ${dto.code} already exists`);
        }
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (dto.code) updateData.code = dto.code;
      if (dto.name) updateData.name = dto.name;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.parent_id !== undefined) updateData.parent_id = dto.parent_id;
      if (dto.farm_id !== undefined) updateData.farm_id = dto.farm_id;
      if (dto.parcel_id !== undefined) updateData.parcel_id = dto.parcel_id;
      if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

      const { data, error } = await supabaseClient
        .from('cost_centers')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating cost center:', error);
        throw new BadRequestException(`Failed to update cost center: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error in update cost center:', error);
      throw error;
    }
  }

  /**
   * Delete a cost center
   */
  async delete(id: string, organizationId: string) {
    const supabaseClient = this.databaseService.getClient();

    try {
      // Check if cost center exists
      await this.findOne(id, organizationId);

      // Check if cost center is used in journal items
      const { data: journalItems } = await supabaseClient
        .from('journal_items')
        .select('id')
        .eq('cost_center_id', id)
        .limit(1);

      if (journalItems && journalItems.length > 0) {
        throw new BadRequestException('Cannot delete cost center used in journal entries');
      }

      const { error } = await supabaseClient
        .from('cost_centers')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error deleting cost center:', error);
        throw new BadRequestException(`Failed to delete cost center: ${error.message}`);
      }

      return { message: 'Cost center deleted successfully' };
    } catch (error) {
      this.logger.error('Error in delete cost center:', error);
      throw error;
    }
  }
}
