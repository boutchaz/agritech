import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateAccountMappingDto, UpdateAccountMappingDto } from './dto';

export interface AccountMappingFilters {
  mapping_type?: string;
  is_active?: boolean;
  search?: string;
}

@Injectable()
export class AccountMappingsService {
  private readonly logger = new Logger(AccountMappingsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all account mappings for an organization
   */
  async findAll(organizationId: string, filters?: AccountMappingFilters) {
    const supabaseClient = this.databaseService.getClient();

    try {
      let query = supabaseClient
        .from('account_mappings')
        .select(`
          *,
          account:accounts!account_mappings_account_id_fkey(
            id,
            code,
            name,
            account_type
          )
        `)
        .eq('organization_id', organizationId)
        .order('mapping_type')
        .order('mapping_key');

      if (filters?.mapping_type) {
        query = query.eq('mapping_type', filters.mapping_type);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(`mapping_key.ilike.%${filters.search}%,source_key.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Error fetching account mappings:', error);
        throw new BadRequestException(`Failed to fetch account mappings: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      this.logger.error('Error in findAll account mappings:', error);
      throw error;
    }
  }

  /**
   * Get a single account mapping by ID
   */
  async findOne(id: string, organizationId: string) {
    const supabaseClient = this.databaseService.getClient();

    try {
      const { data, error } = await supabaseClient
        .from('account_mappings')
        .select(`
          *,
          account:accounts!account_mappings_account_id_fkey(
            id,
            code,
            name,
            account_type
          )
        `)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) {
        throw new NotFoundException(`Account mapping with ID ${id} not found`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error in findOne account mapping:', error);
      throw error;
    }
  }

  /**
   * Get mapping types summary (for dropdown)
   */
  async getMappingTypes(organizationId: string) {
    const supabaseClient = this.databaseService.getClient();

    try {
      const { data, error } = await supabaseClient
        .from('account_mappings')
        .select('mapping_type')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) {
        this.logger.error('Error fetching mapping types:', error);
        throw new BadRequestException(`Failed to fetch mapping types: ${error.message}`);
      }

      // Get unique mapping types
      const types = [...new Set((data || []).map(d => d.mapping_type))];
      return types;
    } catch (error) {
      this.logger.error('Error in getMappingTypes:', error);
      throw error;
    }
  }

  /**
   * Create a new account mapping
   */
  async create(dto: CreateAccountMappingDto) {
    const supabaseClient = this.databaseService.getClient();

    try {
      // Check for duplicate mapping
      const key = dto.source_key || dto.mapping_key;
      if (!key) {
        throw new BadRequestException('Either source_key or mapping_key is required');
      }

      const { data: existing } = await supabaseClient
        .from('account_mappings')
        .select('id')
        .eq('organization_id', dto.organization_id)
        .eq('mapping_type', dto.mapping_type)
        .or(`mapping_key.eq.${key},source_key.eq.${key}`)
        .single();

      if (existing) {
        throw new BadRequestException(
          `Account mapping for ${dto.mapping_type}/${key} already exists`
        );
      }

      // Verify account exists
      const { data: account, error: accountError } = await supabaseClient
        .from('accounts')
        .select('id')
        .eq('id', dto.account_id)
        .eq('organization_id', dto.organization_id)
        .single();

      if (accountError || !account) {
        throw new BadRequestException(`Account with ID ${dto.account_id} not found`);
      }

      const { data, error } = await supabaseClient
        .from('account_mappings')
        .insert({
          organization_id: dto.organization_id,
          mapping_type: dto.mapping_type,
          mapping_key: dto.mapping_key || dto.source_key,
          source_key: dto.source_key || dto.mapping_key,
          account_id: dto.account_id,
          is_active: dto.is_active ?? true,
          description: dto.description,
          metadata: dto.metadata || {},
        })
        .select(`
          *,
          account:accounts!account_mappings_account_id_fkey(
            id,
            code,
            name,
            account_type
          )
        `)
        .single();

      if (error) {
        this.logger.error('Error creating account mapping:', error);
        throw new BadRequestException(`Failed to create account mapping: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error in create account mapping:', error);
      throw error;
    }
  }

  /**
   * Update an account mapping
   */
  async update(id: string, organizationId: string, dto: UpdateAccountMappingDto) {
    const supabaseClient = this.databaseService.getClient();

    try {
      // Check if mapping exists
      await this.findOne(id, organizationId);

      // Check for duplicate if updating keys
      const key = dto.source_key || dto.mapping_key;
      if (key && dto.mapping_type) {
        const { data: existing } = await supabaseClient
          .from('account_mappings')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('mapping_type', dto.mapping_type)
          .or(`mapping_key.eq.${key},source_key.eq.${key}`)
          .neq('id', id)
          .single();

        if (existing) {
          throw new BadRequestException(
            `Account mapping for ${dto.mapping_type}/${key} already exists`
          );
        }
      }

      // Verify account exists if updating account_id
      if (dto.account_id) {
        const { data: account, error: accountError } = await supabaseClient
          .from('accounts')
          .select('id')
          .eq('id', dto.account_id)
          .eq('organization_id', organizationId)
          .single();

        if (accountError || !account) {
          throw new BadRequestException(`Account with ID ${dto.account_id} not found`);
        }
      }

      const updateData: any = {};

      if (dto.mapping_type) updateData.mapping_type = dto.mapping_type;
      if (dto.mapping_key) updateData.mapping_key = dto.mapping_key;
      if (dto.source_key) updateData.source_key = dto.source_key;
      if (dto.account_id) updateData.account_id = dto.account_id;
      if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.metadata !== undefined) updateData.metadata = dto.metadata;

      const { data, error } = await supabaseClient
        .from('account_mappings')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select(`
          *,
          account:accounts!account_mappings_account_id_fkey(
            id,
            code,
            name,
            account_type
          )
        `)
        .single();

      if (error) {
        this.logger.error('Error updating account mapping:', error);
        throw new BadRequestException(`Failed to update account mapping: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error in update account mapping:', error);
      throw error;
    }
  }

  /**
   * Delete an account mapping
   */
  async delete(id: string, organizationId: string) {
    const supabaseClient = this.databaseService.getClient();

    try {
      // Check if mapping exists
      await this.findOne(id, organizationId);

      const { error } = await supabaseClient
        .from('account_mappings')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error deleting account mapping:', error);
        throw new BadRequestException(`Failed to delete account mapping: ${error.message}`);
      }

      return { message: 'Account mapping deleted successfully' };
    } catch (error) {
      this.logger.error('Error in delete account mapping:', error);
      throw error;
    }
  }

  /**
   * Initialize default mappings for an organization based on country code
   */
  async initializeDefaultMappings(organizationId: string, countryCode: string) {
    const supabaseClient = this.databaseService.getClient();

    try {
      // Check if mappings already exist
      const { data: existingMappings } = await supabaseClient
        .from('account_mappings')
        .select('id')
        .eq('organization_id', organizationId)
        .limit(1);

      if (existingMappings && existingMappings.length > 0) {
        return { message: 'Mappings already initialized', count: 0 };
      }

      // Call the database functions to create mappings
      // These functions were created in the migrations
      const { error: taskError } = await supabaseClient.rpc('create_task_cost_mappings', {
        p_organization_id: organizationId,
        p_country_code: countryCode,
      });

      if (taskError) {
        this.logger.warn(`Could not create task cost mappings: ${taskError.message}`);
      }

      const { error: harvestError } = await supabaseClient.rpc('create_harvest_sales_mappings', {
        p_organization_id: organizationId,
        p_country_code: countryCode,
      });

      if (harvestError) {
        this.logger.warn(`Could not create harvest sales mappings: ${harvestError.message}`);
      }

      // Count created mappings
      const { data: newMappings, error: countError } = await supabaseClient
        .from('account_mappings')
        .select('id')
        .eq('organization_id', organizationId);

      if (countError) {
        throw new BadRequestException(`Error counting new mappings: ${countError.message}`);
      }

      return {
        message: 'Default mappings initialized successfully',
        count: newMappings?.length || 0,
      };
    } catch (error) {
      this.logger.error('Error in initializeDefaultMappings:', error);
      throw error;
    }
  }
}
