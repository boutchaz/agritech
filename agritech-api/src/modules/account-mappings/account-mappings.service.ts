import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { sanitizeSearch } from '../../common/utils/sanitize-search';
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

  /**
   * Default accounting standard per country (must match global account_mappings seed templates).
   */
  private defaultAccountingStandardForCountry(countryCode: string): string {
    const cc = countryCode.toUpperCase();
    const map: Record<string, string> = {
      MA: 'CGNC',
      FR: 'PCG',
      TN: 'PCN',
      US: 'GAAP',
      GB: 'FRS102',
      DE: 'HGB',
    };
    return map[cc] || 'CGNC';
  }

  /**
   * Resolves country + accounting standard for the org.
   * When either is missing, fills from preferredCountryCode (e.g. query param on initialize) or MA,
   * derives the standard from country, and persists to organizations so accounting features work end-to-end.
   */
  private async getOrganizationAccountingContext(organizationId: string, preferredCountryCode?: string) {
    const supabaseClient = this.databaseService.getAdminClient();
    const { data, error } = await supabaseClient
      .from('organizations')
      .select('country_code, accounting_standard')
      .eq('id', organizationId)
      .single();

    if (error || !data) {
      throw new BadRequestException('Organization accounting context not found');
    }

    const preferred = preferredCountryCode?.trim()?.toUpperCase();
    const existingCountry = data.country_code?.trim();
    const existingStandard = data.accounting_standard?.trim();

    let country = existingCountry || preferred || 'MA';
    let standard = existingStandard || this.defaultAccountingStandardForCountry(country);

    const needsPersist = !existingCountry || !existingStandard;
    if (needsPersist) {
      const { error: updateError } = await supabaseClient
        .from('organizations')
        .update({
          country_code: country,
          accounting_standard: standard,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (updateError) {
        this.logger.error(`Failed to persist organization accounting defaults: ${updateError.message}`);
        throw new BadRequestException(
          `Could not save organization country and accounting standard: ${updateError.message}`,
        );
      }
    }

    return {
      countryCode: country.toUpperCase(),
      accountingStandard: standard.toUpperCase(),
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
        const s = sanitizeSearch(filters.search);
        if (s) query = query.or(`mapping_key.ilike.%${s}%,source_key.ilike.%${s}%,description.ilike.%${s}%`);
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
        .or(`mapping_key.eq.${key.replace(/[,.()'"]/g, '')},source_key.eq.${key.replace(/[,.()'"]/g, '')}`)
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
          .or(`mapping_key.eq.${key.replace(/[,.()'"]/g, '')},source_key.eq.${key.replace(/[,.()'"]/g, '')}`)
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
   * Hardcoded default mapping definitions per country/standard.
   * These replace the global-template approach that required pre-seeded rows.
   */
  private getDefaultMappingDefinitions(countryCode: string, accountingStandard: string) {
    const key = `${countryCode}_${accountingStandard}`;

    const definitions: Record<string, Array<{
      mapping_type: string;
      mapping_key: string;
      account_code: string;
      description: string;
    }>> = {
      MA_CGNC: [
        // Cost types — mapped to CGNC expense accounts
        { mapping_type: 'cost_type', mapping_key: 'planting', account_code: '6110', description: 'Achats de semences et plants' },
        { mapping_type: 'cost_type', mapping_key: 'fertilization', account_code: '6111', description: 'Achats d\'engrais' },
        { mapping_type: 'cost_type', mapping_key: 'pesticide', account_code: '6112', description: 'Achats de produits phytosanitaires' },
        { mapping_type: 'cost_type', mapping_key: 'irrigation', account_code: '6121', description: 'Eau d\'irrigation' },
        { mapping_type: 'cost_type', mapping_key: 'maintenance', account_code: '6125', description: 'Entretien et réparations' },
        { mapping_type: 'cost_type', mapping_key: 'harvesting', account_code: '6141', description: 'Services agricoles externes' },
        { mapping_type: 'cost_type', mapping_key: 'pruning', account_code: '6141', description: 'Services agricoles externes' },
        { mapping_type: 'cost_type', mapping_key: 'transport', account_code: '6144', description: 'Transport sur achats' },
        { mapping_type: 'cost_type', mapping_key: 'labor', account_code: '6171', description: 'Salaires permanents' },
        { mapping_type: 'cost_type', mapping_key: 'salary', account_code: '6171', description: 'Salaires permanents' },
        { mapping_type: 'cost_type', mapping_key: 'wages', account_code: '6172', description: 'Salaires journaliers' },
        { mapping_type: 'cost_type', mapping_key: 'materials', account_code: '6126', description: 'Pièces de rechange' },
        { mapping_type: 'cost_type', mapping_key: 'utilities', account_code: '6167', description: 'Électricité' },
        { mapping_type: 'cost_type', mapping_key: 'other', account_code: '6131', description: 'Locations machines agricoles' },

        // Revenue types
        { mapping_type: 'revenue_type', mapping_key: 'product_sales', account_code: '7111', description: 'Ventes fruits et légumes' },
        { mapping_type: 'revenue_type', mapping_key: 'service_income', account_code: '7121', description: 'Prestations de services agricoles' },
        { mapping_type: 'revenue_type', mapping_key: 'other_income', account_code: '7180', description: 'Autres produits d\'exploitation' },

        // Harvest sale channels
        { mapping_type: 'harvest_sale', mapping_key: 'market', account_code: '7111', description: 'Ventes fruits et légumes - marché' },
        { mapping_type: 'harvest_sale', mapping_key: 'export', account_code: '7119', description: 'Ventes exportations' },
        { mapping_type: 'harvest_sale', mapping_key: 'wholesale', account_code: '7111', description: 'Ventes fruits et légumes - gros' },
        { mapping_type: 'harvest_sale', mapping_key: 'direct', account_code: '7111', description: 'Ventes fruits et légumes - direct' },
        { mapping_type: 'harvest_sale', mapping_key: 'processing', account_code: '7118', description: 'Ventes produits transformés' },

        // Cash accounts
        { mapping_type: 'cash', mapping_key: 'bank', account_code: '5141', description: 'Banque - Compte courant' },
        { mapping_type: 'cash', mapping_key: 'cash', account_code: '5161', description: 'Caisse principale' },
        { mapping_type: 'cash', mapping_key: 'petty_cash', account_code: '5162', description: 'Caisse ferme' },

        // Receivable/Payable (used by invoices and payments)
        { mapping_type: 'receivable', mapping_key: 'trade', account_code: '3420', description: 'Clients' },
        { mapping_type: 'payable', mapping_key: 'trade', account_code: '4410', description: 'Fournisseurs' },
        { mapping_type: 'tax', mapping_key: 'collected', account_code: '4457', description: 'TVA collectée' },
        { mapping_type: 'tax', mapping_key: 'deductible', account_code: '4456', description: 'TVA déductible' },
      ],
    };

    return definitions[key] || [];
  }

  /**
   * Initialize default mappings for an organization based on country code.
   * Uses hardcoded defaults instead of global templates.
   */
  async initializeDefaultMappings(organizationId: string, countryCode: string) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      const { countryCode: effectiveCountry, accountingStandard } = await this.getOrganizationAccountingContext(
        organizationId,
        countryCode,
      );

      // Load org accounts to resolve codes → IDs
      const { data: orgAccounts, error: accountsError } = await supabaseClient
        .from('accounts')
        .select('id, code')
        .eq('organization_id', organizationId);

      if (accountsError) {
        throw new BadRequestException(`Failed to load accounts: ${accountsError.message}`);
      }

      if (!orgAccounts || orgAccounts.length === 0) {
        throw new BadRequestException(
          'No accounts found for this organization. Please set up your chart of accounts first (Accounting → Accounts), then initialize mappings.',
        );
      }

      const accountCodeToId = new Map<string, string>();
      for (const account of orgAccounts) {
        accountCodeToId.set(account.code, account.id);
      }

      // Get hardcoded defaults for this country/standard
      const defaults = this.getDefaultMappingDefinitions(
        effectiveCountry.toUpperCase(),
        accountingStandard.toUpperCase(),
      );

      if (defaults.length === 0) {
        throw new BadRequestException(
          `No default mapping definitions available for ${effectiveCountry}/${accountingStandard}. Please add mappings manually.`,
        );
      }

      // Load existing (mapping_type, mapping_key) tuples so we can top up only the missing ones.
      // Previously the function bailed at the first existing mapping, leaving partial setups stuck.
      const { data: existingMappings, error: existingError } = await supabaseClient
        .from('account_mappings')
        .select('mapping_type, mapping_key')
        .eq('organization_id', organizationId);

      if (existingError) {
        throw new BadRequestException(`Failed to load existing mappings: ${existingError.message}`);
      }

      const existingKeys = new Set(
        (existingMappings ?? []).map((m) => `${m.mapping_type}::${m.mapping_key}`),
      );

      // Skip definitions whose account_code is missing from the chart, OR that already exist.
      const candidates = defaults.filter((def) => accountCodeToId.has(def.account_code));
      const missingAccountCount = defaults.length - candidates.length;
      const rows = candidates
        .filter((def) => !existingKeys.has(`${def.mapping_type}::${def.mapping_key}`))
        .map((def) => ({
          organization_id: organizationId,
          country_code: effectiveCountry,
          accounting_standard: accountingStandard,
          mapping_type: def.mapping_type,
          mapping_key: def.mapping_key,
          source_key: def.mapping_key,
          account_id: accountCodeToId.get(def.account_code)!,
          account_code: def.account_code,
          description: def.description,
          is_active: true,
          metadata: {},
        }));

      if (rows.length === 0) {
        // Nothing to add — distinguish "already fully set up" from "nothing matches your chart"
        if (existingKeys.size > 0) {
          return {
            message: `All ${defaults.length - missingAccountCount} applicable default mappings already exist. Nothing to add.`,
            count: 0,
          };
        }
        throw new BadRequestException(
          'None of the default account codes were found in your chart of accounts. Please set up your chart of accounts first (Accounting → Accounts).',
        );
      }

      const { error: insertError } = await supabaseClient
        .from('account_mappings')
        .insert(rows);

      if (insertError) {
        throw new BadRequestException(`Failed to initialize mappings: ${insertError.message}`);
      }

      const messageParts = [`Added ${rows.length} default mapping${rows.length === 1 ? '' : 's'}`];
      if (existingKeys.size > 0) {
        messageParts.push(`${existingKeys.size} already existed`);
      }
      if (missingAccountCount > 0) {
        messageParts.push(`${missingAccountCount} skipped (account code not in your chart)`);
      }

      return { message: messageParts.join('; '), count: rows.length };
    } catch (error) {
      this.logger.error('Error in initializeDefaultMappings:', error);
      throw error;
    }
  }
}
