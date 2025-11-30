import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { moroccanChartOfAccounts } from './data/moroccan-chart-of-accounts';

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
      throw error;
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

      // Insert all accounts
      let accountsCreated = 0;

      for (const account of moroccanChartOfAccounts) {
        const result = await client.query(
          `INSERT INTO accounts (
            organization_id, code, name, account_type, account_subtype,
            is_group, is_active, parent_code, currency_code,
            description_fr, description_ar
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
            account.parent_code || null,
            account.currency_code,
            account.description_fr || null,
            account.description_ar || null,
          ]
        );

        if (result.rows.length > 0) {
          accountsCreated++;
        }
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
}
