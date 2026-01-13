import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { moroccanChartOfAccounts } from './data/moroccan-chart-of-accounts';
import { frenchChartOfAccounts } from './data/french-chart-of-accounts';
import { usaChartOfAccounts } from './data/usa-chart-of-accounts';
import { ukChartOfAccounts } from './data/uk-chart-of-accounts';
import { germanChartOfAccounts } from './data/german-chart-of-accounts';
import { tunisianChartOfAccounts } from './data/tunisian-chart-of-accounts';
import {
  ChartOfAccountsTemplate,
  TemplateCountry,
  TemplateAccount,
  ApplyTemplateResult,
} from './dto/apply-template.dto';
import { AccountingStandard, getSupportedCountries } from './data/types';

interface AccountData {
  code: string;
  name: string;
  account_type: string;
  account_subtype: string;
  is_group: boolean;
  is_active: boolean;
  parent_code?: string;
  currency_code: string;
  description_fr?: string;
  description_ar?: string;
}

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all accounts for an organization
   */
  async findAll(organizationId: string, isActive?: boolean): Promise<any[]> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('accounts')
      .select('*')
      .eq('organization_id', organizationId);

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    query = query.order('code', { ascending: true });

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch accounts: ${error.message}`, error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get a single account by ID
   */
  async findOne(accountId: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch account: ${error.message}`, error);
      throw new BadRequestException(`Failed to fetch account: ${error.message}`);
    }

    if (!data) {
      throw new BadRequestException('Account not found');
    }

    return data;
  }

  /**
   * Create a new account
   */
  async create(accountData: any, organizationId: string, userId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ...accountData,
        organization_id: organizationId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create account: ${error.message}`, error);
      throw new BadRequestException(`Failed to create account: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing account
   */
  async update(accountId: string, updates: any, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update account: ${error.message}`, error);
      throw new BadRequestException(`Failed to update account: ${error.message}`);
    }

    if (!data) {
      throw new BadRequestException('Account not found');
    }

    return data;
  }

  /**
   * Delete an account
   */
  async delete(accountId: string, organizationId: string): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete account: ${error.message}`, error);
      throw new BadRequestException(`Failed to delete account: ${error.message}`);
    }
  }

  /**
   * Seed Moroccan Chart of Accounts for an organization
   */
  async seedMoroccanChartOfAccounts(organizationId: string): Promise<{
    accounts_created: number;
    success: boolean;
    message: string;
  }> {
    const pool = this.databaseService.getPgPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify organization exists
      const orgResult = await client.query(
        'SELECT id FROM organizations WHERE id = $1',
        [organizationId]
      );

      if (orgResult.rows.length === 0) {
        throw new BadRequestException('Organization not found');
      }

      // Insert all accounts (without parent_id first)
      let accountsCreated = 0;
      const accountsWithParent: Array<{ code: string; parent_code: string }> = [];

      for (const account of moroccanChartOfAccounts) {
        // Use description_fr as the description field (schema only has 'description')
        const description = account.description_fr || null;

        const result = await client.query(
          `INSERT INTO accounts (
            organization_id, code, name, account_type, account_subtype,
            is_group, is_active, currency_code, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (organization_id, code) DO NOTHING
          RETURNING id`,
          [
            organizationId,
            account.code,
            account.name,
            account.account_type,
            account.account_subtype,
            account.is_group,
            account.is_active,
            account.currency_code,
            description,
          ]
        );

        if (result.rows.length > 0) {
          accountsCreated++;
        }

        // Track accounts with parent references to update later
        if (account.parent_code) {
          accountsWithParent.push({
            code: account.code,
            parent_code: account.parent_code,
          });
        }
      }

      // Update parent_id references for accounts that have parent_code
      for (const { code, parent_code } of accountsWithParent) {
        await client.query(
          `UPDATE accounts
           SET parent_id = (
             SELECT id FROM accounts
             WHERE organization_id = $1 AND code = $2
           )
           WHERE organization_id = $1 AND code = $3`,
          [organizationId, parent_code, code]
        );
      }

      await client.query('COMMIT');

      this.logger.log(
        `Seeded ${accountsCreated} accounts for organization ${organizationId}`
      );

      return {
        accounts_created: accountsCreated,
        success: true,
        message: `Successfully created ${accountsCreated} accounts`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Failed to seed accounts: ${error.message}`, error.stack);
      throw error;
    } finally {
      client.release();
    }
  }

  private getCmsUrl(): string {
    return process.env.CMS_URL || 'http://localhost:1337';
  }

  async getAvailableTemplates(): Promise<TemplateCountry[]> {
    const cmsUrl = this.getCmsUrl();

    try {
      const response = await fetch(`${cmsUrl}/api/chart-of-account-templates/countries`);

      if (!response.ok) {
        this.logger.error(`Failed to fetch templates from CMS: ${response.statusText}`);
        return this.getFallbackTemplates();
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      this.logger.warn(`CMS unavailable, using fallback templates: ${error.message}`);
      return this.getFallbackTemplates();
    }
  }

  private getFallbackTemplates(): TemplateCountry[] {
    // Use the centralized countries list from types
    const countries = getSupportedCountries();

    return countries.map((country) => ({
      country_code: country.code,
      country_name: country.name,
      country_name_native: this.getNativeCountryName(country.code),
      accounting_standard: country.standard,
      default_currency: country.currency,
      version: '1.0.0',
    }));
  }

  /**
   * Get native country name for supported countries
   */
  private getNativeCountryName(countryCode: string): string {
    const nativeNames: Record<string, string> = {
      MA: 'المغرب',
      FR: 'France',
      TN: 'تونس',
      US: 'United States',
      GB: 'United Kingdom',
      DE: 'Deutschland',
    };
    return nativeNames[countryCode] || '';
  }

  async getTemplateByCountry(countryCode: string): Promise<ChartOfAccountsTemplate> {
    // Validate input - only reject null/undefined/non-string types
    if (countryCode === null || countryCode === undefined) {
      throw new NotFoundException('Invalid country code provided');
    }
    if (typeof countryCode !== 'string') {
      throw new NotFoundException('Invalid country code provided');
    }

    const cmsUrl = this.getCmsUrl();
    const upperCountryCode = countryCode.trim().toUpperCase();

    try {
      const response = await fetch(`${cmsUrl}/api/chart-of-account-templates/country/${upperCountryCode}`);

      if (!response.ok) {
        // For 404 and other HTTP errors, fall back to local templates
        this.logger.warn(`CMS returned ${response.status}: ${response.statusText}, using fallback template for ${upperCountryCode}`);
        return this.getFallbackTemplate(upperCountryCode);
      }

      const result = await response.json();
      return result.data?.attributes || result.data;
    } catch (error) {
      // Use fallback templates for network errors and other exceptions
      this.logger.warn(`CMS unavailable, using fallback template for ${upperCountryCode}: ${error.message}`);
      return this.getFallbackTemplate(upperCountryCode);
    }
  }

  /**
   * Get fallback template for a specific country
   */
  private getFallbackTemplate(countryCode: string): ChartOfAccountsTemplate {
    const chartMap: Record<string, any> = {
      MA: moroccanChartOfAccounts,
      FR: frenchChartOfAccounts,
      TN: tunisianChartOfAccounts,
      US: usaChartOfAccounts,
      GB: ukChartOfAccounts,
      DE: germanChartOfAccounts,
    };

    const chart = chartMap[countryCode];
    if (!chart) {
      throw new NotFoundException(`Template not found for country: ${countryCode}`);
    }

    // For new country charts using CountryChartOfAccounts format
    if (chart.metadata && chart.accounts) {
      return {
        id: 0,
        country_code: chart.metadata.country_code,
        country_name: chart.metadata.country_name,
        country_name_native: chart.metadata.country_name_native,
        accounting_standard: chart.metadata.accounting_standard,
        default_currency: chart.metadata.default_currency,
        version: chart.metadata.version,
        description: chart.metadata.description,
        accounts: chart.accounts as any,
        is_default: true,
        supported_industries: chart.metadata.supported_industries,
        fiscal_year_start_month: chart.metadata.fiscal_year_start_month,
      };
    }

    // For legacy Moroccan chart format
    return {
      id: 0,
      country_code: 'MA',
      country_name: 'Morocco',
      country_name_native: 'المغرب',
      accounting_standard: 'CGNC',
      default_currency: 'MAD',
      version: '1.0.0',
      description: 'Moroccan Chart of Accounts based on CGNC',
      accounts: chart as any,
      is_default: true,
      supported_industries: ['agriculture'],
      fiscal_year_start_month: 1,
    };
  }

  async applyTemplate(
    countryCode: string,
    organizationId: string,
    options: { overwrite?: boolean; includeAccountMappings?: boolean; includeCostCenters?: boolean } = {},
  ): Promise<ApplyTemplateResult> {
    const template = await this.getTemplateByCountry(countryCode);

    if (!template || !template.accounts || template.accounts.length === 0) {
      throw new BadRequestException('Template has no accounts to apply');
    }

    const pool = this.databaseService.getPgPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const orgResult = await client.query('SELECT id FROM organizations WHERE id = $1', [organizationId]);
      if (orgResult.rows.length === 0) {
        throw new BadRequestException('Organization not found');
      }

      if (options.overwrite) {
        await client.query('DELETE FROM accounts WHERE organization_id = $1', [organizationId]);
        this.logger.log(`Deleted existing accounts for organization ${organizationId}`);
      }

      let accountsCreated = 0;
      const accountsWithParent: Array<{ code: string; parent_code: string }> = [];

      for (const account of template.accounts) {
        // Handle both legacy Moroccan format (description_fr) and new format (description)
        const description = account.description_fr || (account as any).description || null;

        const result = await client.query(
          `INSERT INTO accounts (
            organization_id, code, name, account_type, account_subtype,
            is_group, is_active, currency_code, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (organization_id, code) DO NOTHING
          RETURNING id`,
          [
            organizationId,
            account.code,
            account.name,
            account.account_type,
            account.account_subtype,
            account.is_group,
            account.is_active,
            account.currency_code,
            description,
          ],
        );

        if (result.rows.length > 0) {
          accountsCreated++;
        }

        if (account.parent_code) {
          accountsWithParent.push({
            code: account.code,
            parent_code: account.parent_code,
          });
        }
      }

      for (const { code, parent_code } of accountsWithParent) {
        await client.query(
          `UPDATE accounts
           SET parent_id = (
             SELECT id FROM accounts
             WHERE organization_id = $1 AND code = $2
           )
           WHERE organization_id = $1 AND code = $3`,
          [organizationId, parent_code, code],
        );
      }

      await client.query('COMMIT');

      this.logger.log(`Applied template ${countryCode} to organization ${organizationId}: ${accountsCreated} accounts created`);

      let accountMappingsCreated = 0;
      let costCentersCreated = 0;

      if (options.includeAccountMappings !== false) {
        try {
          const taskMappingsResult = await client.query(
            'SELECT create_task_cost_mappings($1, $2) as count',
            [organizationId, countryCode.toUpperCase().substring(0, 2)]
          );
          const harvestMappingsResult = await client.query(
            'SELECT create_harvest_sales_mappings($1, $2) as count',
            [organizationId, countryCode.toUpperCase().substring(0, 2)]
          );
          accountMappingsCreated = 
            (taskMappingsResult.rows[0]?.count || 0) + 
            (harvestMappingsResult.rows[0]?.count || 0);
          this.logger.log(`Created ${accountMappingsCreated} account mappings for organization ${organizationId}`);
        } catch (mappingError) {
          this.logger.warn(`Could not create account mappings: ${mappingError.message}`);
        }
      }

      return {
        success: true,
        accounts_created: accountsCreated,
        account_mappings_created: accountMappingsCreated,
        cost_centers_created: costCentersCreated,
        message: `Successfully applied ${template.country_name} template with ${accountsCreated} accounts${accountMappingsCreated > 0 ? ` and ${accountMappingsCreated} account mappings` : ''}`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Failed to apply template: ${error.message}`, error.stack);
      throw error;
    } finally {
      client.release();
    }
  }
}
