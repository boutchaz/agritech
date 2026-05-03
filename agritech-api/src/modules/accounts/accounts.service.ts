import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { paginatedResponse, type PaginatedResponse } from '../../common/dto/paginated-query.dto';
import { AlertService } from '../health/alert.service';
import { AccountMappingsService } from '../account-mappings/account-mappings.service';
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

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly alertService: AlertService,
    private readonly accountMappingsService: AccountMappingsService,
  ) {}

  /**
   * Get all accounts for an organization
   */
  async findAll(
    organizationId: string,
    isActive?: boolean,
    pagination: { page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<any>> {
    const supabase = this.databaseService.getAdminClient();
    const page = Math.max(1, Number(pagination.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(pagination.pageSize) || 100));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const apply = (q: any) => {
      q = q.eq('organization_id', organizationId);
      if (isActive !== undefined) q = q.eq('is_active', isActive);
      return q;
    };

    const { count } = await apply(
      supabase.from('accounts').select('id', { count: 'exact', head: true }),
    );
    const { data, error } = await apply(supabase.from('accounts').select('*'))
      .order('code', { ascending: true })
      .range(from, to);

    if (error) {
      this.logger.error(`Failed to fetch accounts: ${error.message}`, error);
      throw error;
    }

    return paginatedResponse(data ?? [], count ?? 0, page, pageSize);
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
      throw new NotFoundException('Account not found');
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

    const referencingTables = [
      { table: 'journal_items', column: 'account_id', label: 'journal entries' },
      { table: 'account_mappings', column: 'account_id', label: 'account mappings' },
      { table: 'bank_accounts', column: 'gl_account_id', label: 'bank accounts' },
      { table: 'stock_account_mappings', column: 'debit_account_id', label: 'stock account mappings' },
    ];

    for (const ref of referencingTables) {
      const { count, error } = await supabase
        .from(ref.table)
        .select('id', { count: 'exact', head: true })
        .eq(ref.column, accountId);
      if (error) {
        this.logger.error(`Failed to check ${ref.table}: ${error.message}`);
        throw new BadRequestException(`Failed to verify account references: ${error.message}`);
      }
      if (count && count > 0) {
        throw new BadRequestException(
          `Cannot delete account: it is referenced by ${count} ${ref.label}. Deactivate it instead.`,
        );
      }
    }

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

      // Set service_role context so Supabase Realtime / RLS triggers don't reject the connection
      await client.query(`SELECT set_config('request.jwt.claims', '{"role":"service_role"}', TRUE)`);
      await client.query(`SELECT set_config('request.jwt.role', 'service_role', TRUE)`);

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

      // Update parent_id references for accounts that have parent_code.
      // Guard with EXISTS so a missing parent doesn't NULL out parent_id on
      // re-runs (which would orphan an existing hierarchy).
      for (const { code, parent_code } of accountsWithParent) {
        await client.query(
          `UPDATE accounts
           SET parent_id = parent.id
           FROM accounts parent
           WHERE accounts.organization_id = $1
             AND accounts.code = $3
             AND parent.organization_id = $1
             AND parent.code = $2`,
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
      this.alertService.notify({
        service: 'cms',
        status: 'down',
        severity: 'warning',
        error: error.message,
        url: cmsUrl,
        message: `CMS (Strapi) is unreachable: ${error.message}`,
      }).catch(() => undefined);
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
      this.logger.warn(`CMS unavailable, using fallback template for ${upperCountryCode}: ${error.message}`);
      this.alertService.notify({
        service: 'cms',
        status: 'down',
        severity: 'warning',
        error: error.message,
        url: `${cmsUrl}/api/chart-of-account-templates/country/${upperCountryCode}`,
        message: `CMS (Strapi) is unreachable: ${error.message}`,
      }).catch(() => undefined);
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

    // Use Supabase admin client (service role) to bypass RLS and avoid JWT/tenant errors
    // that occur when using the raw PG pool without an authenticated session context.
    const supabase = this.databaseService.getAdminClient();

    try {
      // Verify organization exists
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', organizationId)
        .single();

      if (orgError || !org) {
        throw new BadRequestException('Organization not found');
      }

      // Set country_code and accounting_standard on the organization
      const { error: orgUpdateError } = await supabase
        .from('organizations')
        .update({
          country_code: template.country_code,
          accounting_standard: template.accounting_standard,
        })
        .eq('id', organizationId);

      if (orgUpdateError) {
        this.logger.warn(`Failed to update org accounting context: ${orgUpdateError.message}`);
      }

      if (options.overwrite) {
        await supabase.from('accounts').delete().eq('organization_id', organizationId);
        this.logger.log(`Deleted existing accounts for organization ${organizationId}`);
      }

      let accountsCreated = 0;
      const accountsWithParent: Array<{ code: string; parent_code: string }> = [];

      // Insert accounts in batches of 50 to avoid payload size limits
      const BATCH_SIZE = 50;
      const rows = template.accounts.map((account) => ({
        organization_id: organizationId,
        code: account.code,
        name: account.name,
        account_type: account.account_type,
        account_subtype: account.account_subtype,
        is_group: account.is_group,
        is_active: account.is_active,
        currency_code: account.currency_code,
        description: account.description_fr || (account as any).description || null,
      }));

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { data: inserted, error: insertError } = await supabase
          .from('accounts')
          .upsert(batch, { onConflict: 'organization_id,code', ignoreDuplicates: true })
          .select('id');

        if (insertError) {
          this.logger.error(`Batch insert error: ${insertError.message}`);
          throw new Error(insertError.message);
        }
        accountsCreated += inserted?.length ?? 0;
      }

      // Track which accounts need parent_id resolution
      template.accounts.forEach((account) => {
        if (account.parent_code) {
          accountsWithParent.push({ code: account.code, parent_code: account.parent_code });
        }
      });

      // Resolve parent_id relationships
      if (accountsWithParent.length > 0) {
        // Fetch all accounts for this org to build a code→id map
        const { data: allAccounts } = await supabase
          .from('accounts')
          .select('id, code')
          .eq('organization_id', organizationId);

        const codeToId = new Map<string, string>();
        (allAccounts || []).forEach((a) => codeToId.set(a.code, a.id));

        for (const { code, parent_code } of accountsWithParent) {
          const parentId = codeToId.get(parent_code);
          if (!parentId) continue;
          await supabase
            .from('accounts')
            .update({ parent_id: parentId })
            .eq('organization_id', organizationId)
            .eq('code', code);
        }
      }

      this.logger.log(`Applied template ${countryCode} to organization ${organizationId}: ${accountsCreated} accounts created`);

      // Initialize account mappings from global templates
      let accountMappingsCreated = 0;
      try {
        const mappingResult = await this.accountMappingsService.initializeDefaultMappings(
          organizationId,
          countryCode,
        );
        accountMappingsCreated = mappingResult.count;
        this.logger.log(`Initialized ${accountMappingsCreated} account mappings for org ${organizationId}`);
      } catch (error) {
        this.logger.warn(`Failed to initialize account mappings: ${error.message}. Accounts were created successfully.`);
      }

      const costCentersCreated = 0;

      return {
        success: true,
        accounts_created: accountsCreated,
        account_mappings_created: accountMappingsCreated,
        cost_centers_created: costCentersCreated,
        message: `Successfully applied ${template.country_name} template with ${accountsCreated} accounts and ${accountMappingsCreated} account mappings`,
      };
    } catch (error) {
      this.logger.error(`Failed to apply template: ${error.message}`, error.stack);
      throw error;
    }
  }
}
