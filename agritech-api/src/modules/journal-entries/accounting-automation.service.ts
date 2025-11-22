import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from '../database/database.service';
import { CreateJournalEntryDto, JournalEntryType, JournalEntryStatus } from './dto/create-journal-entry.dto';

@Injectable()
export class AccountingAutomationService {
  private readonly logger = new Logger(AccountingAutomationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create journal entry from a cost record
   * Replaces trigger: create_cost_journal_entry()
   * IMPORTANT: This now throws an exception if account mappings are missing (ACID compliance)
   */
  async createJournalEntryFromCost(
    organizationId: string,
    costId: string,
    costType: string,
    amount: number,
    date: Date,
    description: string,
    createdBy: string,
  ): Promise<any> {
    const supabase = this.databaseService.getClient();

    // Get account mappings
    const expenseAccountId = await this.getAccountIdByMapping(
      supabase,
      organizationId,
      'cost_type',
      costType,
    );

    const cashAccountId = await this.getAccountIdByMapping(
      supabase,
      organizationId,
      'cash',
      'bank',
    );

    // CRITICAL: Fail if mappings are missing (prevents data integrity issues)
    if (!expenseAccountId) {
      throw new BadRequestException(
        `Account mapping missing for cost_type: ${costType}. ` +
        `Please configure account mappings before creating cost entries.`,
      );
    }

    if (!cashAccountId) {
      throw new BadRequestException(
        `Cash account mapping missing. ` +
        `Please configure cash/bank account mapping before creating cost entries.`,
      );
    }

    // Generate journal entry number
    const entryNumber = await this.generateJournalEntryNumber(supabase, organizationId);

    // Create journal entry
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        organization_id: organizationId,
        entry_number: entryNumber,
        entry_date: date,
        entry_type: JournalEntryType.EXPENSE,
        description: description || `Cost entry: ${costType}`,
        reference_id: costId,
        reference_type: 'cost',
        total_debit: amount,
        total_credit: amount,
        status: JournalEntryStatus.POSTED,
        created_by: createdBy,
      })
      .select()
      .single();

    if (entryError) {
      this.logger.error(`Failed to create journal entry: ${entryError.message}`);
      throw new BadRequestException(`Failed to create journal entry: ${entryError.message}`);
    }

    // Create journal items (debit expense, credit cash)
    const items = [
      {
        journal_entry_id: journalEntry.id,
        account_id: expenseAccountId,
        debit: amount,
        credit: 0,
        description: description,
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: cashAccountId,
        debit: 0,
        credit: amount,
        description: `Payment for ${costType}`,
      },
    ];

    const { error: itemsError } = await supabase
      .from('journal_items')
      .insert(items);

    if (itemsError) {
      this.logger.error(`Failed to create journal items: ${itemsError.message}`);
      throw new BadRequestException(`Failed to create journal items: ${itemsError.message}`);
    }

    this.logger.log(`Journal entry created for cost ${costId}: ${entryNumber}`);
    return journalEntry;
  }

  /**
   * Create journal entry from a revenue record
   * Replaces trigger: create_revenue_journal_entry()
   * IMPORTANT: This now throws an exception if account mappings are missing (ACID compliance)
   */
  async createJournalEntryFromRevenue(
    organizationId: string,
    revenueId: string,
    revenueType: string,
    amount: number,
    date: Date,
    description: string,
    createdBy: string,
  ): Promise<any> {
    const supabase = this.databaseService.getClient();

    // Get account mappings
    const revenueAccountId = await this.getAccountIdByMapping(
      supabase,
      organizationId,
      'revenue_type',
      revenueType,
    );

    const cashAccountId = await this.getAccountIdByMapping(
      supabase,
      organizationId,
      'cash',
      'bank',
    );

    // CRITICAL: Fail if mappings are missing (prevents data integrity issues)
    if (!revenueAccountId) {
      throw new BadRequestException(
        `Account mapping missing for revenue_type: ${revenueType}. ` +
        `Please configure account mappings before creating revenue entries.`,
      );
    }

    if (!cashAccountId) {
      throw new BadRequestException(
        `Cash account mapping missing. ` +
        `Please configure cash/bank account mapping before creating revenue entries.`,
      );
    }

    // Generate journal entry number
    const entryNumber = await this.generateJournalEntryNumber(supabase, organizationId);

    // Create journal entry
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        organization_id: organizationId,
        entry_number: entryNumber,
        entry_date: date,
        entry_type: JournalEntryType.REVENUE,
        description: description || `Revenue entry: ${revenueType}`,
        reference_id: revenueId,
        reference_type: 'revenue',
        total_debit: amount,
        total_credit: amount,
        status: JournalEntryStatus.POSTED,
        created_by: createdBy,
      })
      .select()
      .single();

    if (entryError) {
      this.logger.error(`Failed to create journal entry: ${entryError.message}`);
      throw new BadRequestException(`Failed to create journal entry: ${entryError.message}`);
    }

    // Create journal items (debit cash, credit revenue)
    const items = [
      {
        journal_entry_id: journalEntry.id,
        account_id: cashAccountId,
        debit: amount,
        credit: 0,
        description: `Receipt for ${revenueType}`,
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: revenueAccountId,
        debit: 0,
        credit: amount,
        description: description,
      },
    ];

    const { error: itemsError } = await supabase
      .from('journal_items')
      .insert(items);

    if (itemsError) {
      this.logger.error(`Failed to create journal items: ${itemsError.message}`);
      throw new BadRequestException(`Failed to create journal items: ${itemsError.message}`);
    }

    this.logger.log(`Journal entry created for revenue ${revenueId}: ${entryNumber}`);
    return journalEntry;
  }

  /**
   * Get account ID by mapping type and key
   * Replaces function: get_account_id_by_mapping()
   */
  private async getAccountIdByMapping(
    supabase: SupabaseClient,
    organizationId: string,
    mappingType: string,
    mappingKey: string,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('account_mappings')
      .select('account_id')
      .eq('organization_id', organizationId)
      .eq('mapping_type', mappingType)
      .eq('mapping_key', mappingKey)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to get account mapping: ${error.message}`);
      return null;
    }

    return data?.account_id || null;
  }

  /**
   * Generate journal entry number
   * Replaces function: generate_journal_entry_number()
   */
  private async generateJournalEntryNumber(
    supabase: SupabaseClient,
    organizationId: string,
  ): Promise<string> {
    // Call the existing database function
    const { data, error } = await supabase
      .rpc('generate_journal_entry_number', { p_organization_id: organizationId });

    if (error) {
      this.logger.error(`Failed to generate journal entry number: ${error.message}`);
      throw new BadRequestException(`Failed to generate journal entry number: ${error.message}`);
    }

    return data;
  }

  /**
   * Validate journal entry balance (debits must equal credits)
   */
  validateJournalBalance(dto: CreateJournalEntryDto): void {
    const totalDebit = dto.items.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = dto.items.reduce((sum, item) => sum + item.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Journal entry is not balanced: Debits (${totalDebit}) != Credits (${totalCredit})`,
      );
    }

    if (Math.abs(dto.total_debit - totalDebit) > 0.01) {
      throw new BadRequestException(
        `Total debit mismatch: Header (${dto.total_debit}) != Items (${totalDebit})`,
      );
    }

    if (Math.abs(dto.total_credit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Total credit mismatch: Header (${dto.total_credit}) != Items (${totalCredit})`,
      );
    }
  }
}
