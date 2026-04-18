import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto';
import { sanitizeSearch } from '../../common/utils/sanitize-search';

@Injectable()
export class BankAccountsService {
  private readonly logger = new Logger(BankAccountsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all bank accounts for an organization
   */
  async findAll(organizationId: string, filters?: { is_active?: boolean; search?: string }) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      let query = supabaseClient
        .from('bank_accounts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('account_name');

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        const s = sanitizeSearch(filters.search);
        if (s) query = query.or(`account_name.ilike.%${s}%,bank_name.ilike.%${s}%`);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Error fetching bank accounts:', error);
        throw new BadRequestException(`Failed to fetch bank accounts: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      this.logger.error('Error in findAll bank accounts:', error);
      throw error;
    }
  }

  /**
   * Get a single bank account by ID
   */
  async findOne(id: string, organizationId: string) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      const { data, error } = await supabaseClient
        .from('bank_accounts')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) {
        throw new NotFoundException(`Bank account with ID ${id} not found`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error in findOne bank account:', error);
      throw error;
    }
  }

  /**
   * Create a new bank account
   */
  async create(dto: CreateBankAccountDto) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      const { data, error } = await supabaseClient
        .from('bank_accounts')
        .insert({
          account_name: dto.account_name,
          account_number: dto.account_number,
          bank_name: dto.bank_name,
          branch_name: dto.branch_name,
          swift_code: dto.swift_code,
          iban: dto.iban,
          currency_code: dto.currency_code || 'MAD',
          opening_balance: dto.opening_balance || 0,
          current_balance: dto.current_balance || dto.opening_balance || 0,
          gl_account_id: dto.gl_account_id,
          is_active: dto.is_active ?? true,
          organization_id: dto.organization_id,
          created_by: dto.created_by,
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating bank account:', error);
        throw new BadRequestException(`Failed to create bank account: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error in create bank account:', error);
      throw error;
    }
  }

  /**
   * Update a bank account
   */
  async update(id: string, organizationId: string, userId: string, dto: UpdateBankAccountDto) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      // Check if bank account exists
      await this.findOne(id, organizationId);

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (dto.account_name) updateData.account_name = dto.account_name;
      if (dto.account_number !== undefined) updateData.account_number = dto.account_number;
      if (dto.bank_name !== undefined) updateData.bank_name = dto.bank_name;
      if (dto.branch_name !== undefined) updateData.branch_name = dto.branch_name;
      if (dto.swift_code !== undefined) updateData.swift_code = dto.swift_code;
      if (dto.iban !== undefined) updateData.iban = dto.iban;
      if (dto.currency_code !== undefined) updateData.currency_code = dto.currency_code;
      if (dto.opening_balance !== undefined) updateData.opening_balance = dto.opening_balance;
      if (dto.current_balance !== undefined) updateData.current_balance = dto.current_balance;
      if (dto.gl_account_id !== undefined) updateData.gl_account_id = dto.gl_account_id;
      if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

      const { data, error } = await supabaseClient
        .from('bank_accounts')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating bank account:', error);
        throw new BadRequestException(`Failed to update bank account: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error in update bank account:', error);
      throw error;
    }
  }

  /**
   * Delete a bank account
   */
  async delete(id: string, organizationId: string) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      // Check if bank account exists
      await this.findOne(id, organizationId);

      // Check if bank account is used in payments
      const { data: payments } = await supabaseClient
        .from('accounting_payments')
        .select('id')
        .eq('bank_account_id', id)
        .limit(1);

      if (payments && payments.length > 0) {
        throw new BadRequestException('Cannot delete bank account used in payments');
      }

      const { error } = await supabaseClient
        .from('bank_accounts')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error deleting bank account:', error);
        throw new BadRequestException(`Failed to delete bank account: ${error.message}`);
      }

      return { message: 'Bank account deleted successfully' };
    } catch (error) {
      this.logger.error('Error in delete bank account:', error);
      throw error;
    }
  }
}
