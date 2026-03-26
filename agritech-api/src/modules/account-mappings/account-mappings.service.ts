import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateAccountMappingDto, UpdateAccountMappingDto } from './dto';

export interface AccountMappingFilters {
  mapping_type?: string;
  is_active?: boolean;
  search?: string;
}

export interface AccountMappingOptions {
  types: string[];
  keys_by_type: Record<string, string[]>;
}

@Injectable()
export class AccountMappingsService {
  private readonly logger = new Logger(AccountMappingsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  private async getOrganizationAccountingContext(organizationId: string) {
    const supabaseClient = this.databaseService.getAdminClient();
    const { data, error } = await supabaseClient
      .from('organizations')
      .select('country_code, accounting_standard')
      .eq('id', organizationId)
      .single();

    if (error || !data) {
      throw new BadRequestException('Organization accounting context not found');
    }

    if (!data.country_code || !data.accounting_standard) {
      throw new BadRequestException('Organization country_code or accounting_standard not set');
    }

    return {
      countryCode: String(data.country_code).toUpperCase(),
      accountingStandard: String(data.accounting_standard).toUpperCase(),
    };
  }

  /**
   * Get all account mappings for an organization
   */
  async findAll(organizationId: string, filters?: AccountMappingFilters) {
    const supabaseClient = this.databaseService.getAdminClient();

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
    const supabaseClient = this.databaseService.getAdminClient();

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
   * Get mapping types and keys for an organization (org + global templates)
   */
  async getMappingOptions(organizationId: string): Promise<AccountMappingOptions> {
    const supabaseClient = this.databaseService.getAdminClient();
    const { countryCode, accountingStandard } = await this.getOrganizationAccountingContext(organizationId);

    try {
      const [{ data: orgMappings, error: orgError }, { data: globalMappings, error: globalError }] = await Promise.all([
        supabaseClient
          .from('account_mappings')
          .select('mapping_type, mapping_key, source_key')
          .eq('organization_id', organizationId),
        supabaseClient
          .from('account_mappings')
          .select('mapping_type, mapping_key')
          .is('organization_id', null)
          .eq('country_code', countryCode)
          .eq('accounting_standard', accountingStandard),
      ]);

      if (orgError) {
        throw new BadRequestException(`Failed to fetch org mappings: ${orgError.message}`);
      }
      if (globalError) {
        throw new BadRequestException(`Failed to fetch global mappings: ${globalError.message}`);
      }

      const keysByType: Record<string, Set<string>> = {};

      for (const row of orgMappings || []) {
        const type = row.mapping_type;
        if (!keysByType[type]) keysByType[type] = new Set();
        if (row.mapping_key) keysByType[type].add(row.mapping_key);
        if (row.source_key) keysByType[type].add(row.source_key);
      }

      for (const row of globalMappings || []) {
        const type = row.mapping_type;
        if (!keysByType[type]) keysByType[type] = new Set();
        if (row.mapping_key) keysByType[type].add(row.mapping_key);
      }

      const types = Object.keys(keysByType).sort();
      const keys_by_type: Record<string, string[]> = {};
      for (const type of types) {
        keys_by_type[type] = Array.from(keysByType[type]).sort();
      }

      return { types, keys_by_type };
    } catch (error) {
      this.logger.error('Error in getMappingOptions:', error);
      throw error;
    }
  }

  /**
   * Get mapping types summary (for dropdown)
   */
  async getMappingTypes(organizationId: string) {
    const supabaseClient = this.databaseService.getAdminClient();

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
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      if (!dto.organization_id) {
        throw new BadRequestException('Organization ID is required');
      }
      const { countryCode, accountingStandard } = await this.getOrganizationAccountingContext(dto.organization_id);

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
        .select('id, code')
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
          country_code: countryCode,
          accounting_standard: accountingStandard,
          mapping_type: dto.mapping_type,
          mapping_key: dto.mapping_key || dto.source_key,
          source_key: dto.source_key || dto.mapping_key,
          account_id: dto.account_id,
          account_code: account.code,
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
    const supabaseClient = this.databaseService.getAdminClient();

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

      const updateData: any = {};

      // Verify account exists if updating account_id
      if (dto.account_id) {
        const { data: account, error: accountError } = await supabaseClient
          .from('accounts')
          .select('id, code')
          .eq('id', dto.account_id)
          .eq('organization_id', organizationId)
          .single();

        if (accountError || !account) {
          throw new BadRequestException(`Account with ID ${dto.account_id} not found`);
        }
        updateData.account_code = account.code;
      }

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
    const supabaseClient = this.databaseService.getAdminClient();

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
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      const { countryCode: orgCountry, accountingStandard } = await this.getOrganizationAccountingContext(organizationId);
      const effectiveCountry = (countryCode || orgCountry).toUpperCase();

      // Check if mappings already exist
      const { data: existingMappings } = await supabaseClient
        .from('account_mappings')
        .select('id')
        .eq('organization_id', organizationId)
        .limit(1);

      if (existingMappings && existingMappings.length > 0) {
        return { message: 'Mappings already initialized', count: 0 };
      }

      const { data: templates, error: templateError } = await supabaseClient
        .from('account_mappings')
        .select('mapping_type, mapping_key, source_key, account_code, description, metadata')
        .is('organization_id', null)
        .eq('country_code', effectiveCountry)
        .eq('accounting_standard', accountingStandard);

      if (templateError) {
        throw new BadRequestException(`Failed to load mapping templates: ${templateError.message}`);
      }

      const accountCodeToId = new Map<string, string>();
      const { data: orgAccounts, error: accountsError } = await supabaseClient
        .from('accounts')
        .select('id, code')
        .eq('organization_id', organizationId);

      if (accountsError) {
        throw new BadRequestException(`Failed to load accounts: ${accountsError.message}`);
      }

      for (const account of orgAccounts || []) {
        accountCodeToId.set(account.code, account.id);
      }

      const rows = (templates || []).map((template) => {
        const accountCode = template.account_code;
        const accountId = accountCode ? accountCodeToId.get(accountCode) || null : null;
        return {
          organization_id: organizationId,
          country_code: effectiveCountry,
          accounting_standard: accountingStandard,
          mapping_type: template.mapping_type,
          mapping_key: template.mapping_key,
          source_key: template.source_key || template.mapping_key,
          account_id: accountId,
          account_code: accountCode,
          description: template.description,
          is_active: true,
          metadata: template.metadata || {},
        };
      });

      if (rows.length > 0) {
        // Use plain insert — we already checked that no org mappings exist above
        const { error: insertError } = await supabaseClient
          .from('account_mappings')
          .insert(rows);

        if (insertError) {
          throw new BadRequestException(`Failed to initialize mappings: ${insertError.message}`);
        }
      }

      return {
        message: 'Default mappings initialized successfully',
        count: rows.length,
      };
    } catch (error) {
      this.logger.error('Error in initializeDefaultMappings:', error);
      throw error;
    }
  }
}
