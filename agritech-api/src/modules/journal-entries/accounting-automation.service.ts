import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { CreateJournalEntryDto, JournalEntryType, JournalEntryStatus } from './dto/create-journal-entry.dto';
import { sanitizeSearch } from '../../common/utils/sanitize-search';

@Injectable()
export class AccountingAutomationService {
  private readonly logger = new Logger(AccountingAutomationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
    private readonly fiscalYearsService: FiscalYearsService,
  ) {}

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
    parcelId?: string,
  ): Promise<any> {
    await this.assertPeriodOpen(organizationId, date);
    const supabase = this.databaseService.getAdminClient();

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

    // Resolve fiscal year from date
    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : String(date);
    const fiscalYearId = await this.fiscalYearsService.resolveFiscalYear(organizationId, dateStr);

    // Create journal entry (totals will be calculated by trigger after items are inserted)
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
        total_debit: 0, // Will be updated by trigger
        total_credit: 0, // Will be updated by trigger
        status: JournalEntryStatus.DRAFT, // Start as draft, post after items inserted
        created_by: createdBy,
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
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
        ...(parcelId ? { parcel_id: parcelId } : {}),
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: cashAccountId,
        debit: 0,
        credit: amount,
        description: `Payment for ${costType}`,
        ...(parcelId ? { parcel_id: parcelId } : {}),
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      },
    ];

    // Validate double-entry before inserting
    const totalDebit = items.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = items.reduce((sum, item) => sum + item.credit, 0);

    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      throw new BadRequestException(
        `Cost journal entry is not balanced: debits=${totalDebit}, credits=${totalCredit}`,
      );
    }

    const { error: itemsError } = await supabase
      .from('journal_items')
      .insert(items);

    if (itemsError) {
      this.logger.error(`Failed to create journal items: ${itemsError.message}`);
      // Rollback journal entry
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id)
        .eq('organization_id', organizationId);
      throw new BadRequestException(`Failed to create journal items: ${itemsError.message}`);
    }

    // Post the journal entry and set correct totals (set explicitly — no DB trigger)
    const { error: postError } = await supabase
      .from('journal_entries')
      .update({ status: JournalEntryStatus.POSTED, total_debit: totalDebit, total_credit: totalCredit })
      .eq('id', journalEntry.id);

    if (postError) {
      this.logger.error(`Failed to post journal entry: ${postError.message}`);
      throw new BadRequestException(`Failed to post journal entry: ${postError.message}`);
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
    parcelId?: string,
  ): Promise<any> {
    await this.assertPeriodOpen(organizationId, date);
    const supabase = this.databaseService.getAdminClient();

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

    // Resolve fiscal year from date
    const revDateStr = date instanceof Date ? date.toISOString().split('T')[0] : String(date);
    const revFiscalYearId = await this.fiscalYearsService.resolveFiscalYear(organizationId, revDateStr);

    // Create journal entry (totals will be calculated by trigger after items are inserted)
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
        total_debit: 0, // Will be updated by trigger
        total_credit: 0, // Will be updated by trigger
        status: JournalEntryStatus.DRAFT, // Start as draft, post after items inserted
        created_by: createdBy,
        ...(revFiscalYearId ? { fiscal_year_id: revFiscalYearId } : {}),
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
        ...(parcelId ? { parcel_id: parcelId } : {}),
        ...(revFiscalYearId ? { fiscal_year_id: revFiscalYearId } : {}),
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: revenueAccountId,
        debit: 0,
        credit: amount,
        description: description,
        ...(parcelId ? { parcel_id: parcelId } : {}),
        ...(revFiscalYearId ? { fiscal_year_id: revFiscalYearId } : {}),
      },
    ];

    // Validate double-entry before inserting
    const totalDebit = items.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = items.reduce((sum, item) => sum + item.credit, 0);

    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      throw new BadRequestException(
        `Revenue journal entry is not balanced: debits=${totalDebit}, credits=${totalCredit}`,
      );
    }

    const { error: itemsError } = await supabase
      .from('journal_items')
      .insert(items);

    if (itemsError) {
      this.logger.error(`Failed to create journal items: ${itemsError.message}`);
      // Rollback journal entry
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id)
        .eq('organization_id', organizationId);
      throw new BadRequestException(`Failed to create journal items: ${itemsError.message}`);
    }

    // Post the journal entry and set correct totals (set explicitly — no DB trigger)
    const { error: postError } = await supabase
      .from('journal_entries')
      .update({ status: JournalEntryStatus.POSTED, total_debit: totalDebit, total_credit: totalCredit })
      .eq('id', journalEntry.id);

    if (postError) {
      this.logger.error(`Failed to post journal entry: ${postError.message}`);
      throw new BadRequestException(`Failed to post journal entry: ${postError.message}`);
    }

    this.logger.log(`Journal entry created for revenue ${revenueId}: ${entryNumber}`);
    return journalEntry;
  }

  /**
   * Public method to resolve an account ID by mapping type and key.
   * Looks up org-level mappings first, falls back to global templates.
   * Used by invoices, payments, and other services that need account resolution.
   */
  async resolveAccountId(
    organizationId: string,
    mappingType: string,
    mappingKey: string,
  ): Promise<string | null> {
    const supabase = this.databaseService.getAdminClient();
    return this.getAccountIdByMapping(supabase, organizationId, mappingType, mappingKey);
  }

  /**
   * Delegates to FiscalYearsService. Throws if the fiscal year covering
   * the date is closed. Safe to call from any service that posts to GL.
   */
  async createJournalEntryFromMaintenance(
    organizationId: string,
    maintenanceId: string,
    amount: number,
    date: Date,
    description: string,
    createdBy: string,
    equipmentName: string,
    maintenanceType: string,
    costCenterId?: string,
    farmId?: string,
  ): Promise<any> {
    await this.assertPeriodOpen(organizationId, date);
    const supabase = this.databaseService.getAdminClient();

    const maintenanceTypeToCostType: Record<string, string> = {
      fuel_fill: 'equipment_fuel',
      insurance: 'equipment_insurance',
      registration: 'equipment_registration',
    };
    const costType = maintenanceTypeToCostType[maintenanceType] || 'equipment_maintenance';

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

    if (!expenseAccountId) {
      throw new BadRequestException(
        `Account mapping missing for cost_type: ${costType}. ` +
        `Please configure account mappings before creating maintenance entries.`,
      );
    }

    if (!cashAccountId) {
      throw new BadRequestException(
        `Cash account mapping missing. ` +
        `Please configure cash/bank account mapping before creating maintenance entries.`,
      );
    }

    const entryNumber = await this.generateJournalEntryNumber(supabase, organizationId);

    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : String(date);
    const fiscalYearId = await this.fiscalYearsService.resolveFiscalYear(organizationId, dateStr);

    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        organization_id: organizationId,
        entry_number: entryNumber,
        entry_date: date,
        entry_type: JournalEntryType.EXPENSE,
        description: description || `Maintenance: ${maintenanceType} - ${equipmentName}`,
        reference_id: maintenanceId,
        reference_type: 'equipment_maintenance',
        total_debit: 0,
        total_credit: 0,
        status: JournalEntryStatus.DRAFT,
        created_by: createdBy,
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      })
      .select()
      .single();

    if (entryError) {
      this.logger.error(`Failed to create maintenance journal entry: ${entryError.message}`);
      throw new BadRequestException(`Failed to create journal entry: ${entryError.message}`);
    }

    const commonItemFields = {
      ...(costCenterId ? { cost_center_id: costCenterId } : {}),
      ...(farmId ? { farm_id: farmId } : {}),
      ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
    };

    const items = [
      {
        journal_entry_id: journalEntry.id,
        account_id: expenseAccountId,
        debit: amount,
        credit: 0,
        description: description || `Maintenance: ${maintenanceType} - ${equipmentName}`,
        ...commonItemFields,
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: cashAccountId,
        debit: 0,
        credit: amount,
        description: `Payment for ${maintenanceType} - ${equipmentName}`,
        ...commonItemFields,
      },
    ];

    const totalDebit = items.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = items.reduce((sum, item) => sum + item.credit, 0);

    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      throw new BadRequestException(
        `Maintenance journal entry is not balanced: debits=${totalDebit}, credits=${totalCredit}`,
      );
    }

    const { error: itemsError } = await supabase
      .from('journal_items')
      .insert(items);

    if (itemsError) {
      this.logger.error(`Failed to create maintenance journal items: ${itemsError.message}`);
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id)
        .eq('organization_id', organizationId);
      throw new BadRequestException(`Failed to create journal items: ${itemsError.message}`);
    }

    const { error: postError } = await supabase
      .from('journal_entries')
      .update({ status: JournalEntryStatus.POSTED, total_debit: totalDebit, total_credit: totalCredit })
      .eq('id', journalEntry.id);

    if (postError) {
      this.logger.error(`Failed to post maintenance journal entry: ${postError.message}`);
      throw new BadRequestException(`Failed to post journal entry: ${postError.message}`);
    }

    this.logger.log(`Journal entry created for maintenance ${maintenanceId}: ${entryNumber}`);
    return journalEntry;
  }

  async assertPeriodOpen(organizationId: string, date: Date | string): Promise<void> {
    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : String(date);
    await this.fiscalYearsService.assertPeriodOpen(organizationId, dateStr);
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
    const { data: orgMapping, error: orgError } = await supabase
      .from('account_mappings')
      .select('account_id, account_code')
      .eq('organization_id', organizationId)
      .eq('mapping_type', mappingType)
      .or(`mapping_key.eq.${sanitizeSearch(mappingKey)},source_key.eq.${sanitizeSearch(mappingKey)}`)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError) {
      this.logger.error(`Failed to get org account mapping: ${orgError.message}`);
      return null;
    }

    if (orgMapping?.account_id) {
      return orgMapping.account_id;
    }

    const { data: orgContext, error: orgContextError } = await supabase
      .from('organizations')
      .select('country_code, accounting_standard')
      .eq('id', organizationId)
      .single();

    if (orgContextError || !orgContext?.country_code || !orgContext?.accounting_standard) {
      this.logger.error('Organization country_code or accounting_standard not set');
      return null;
    }

    const { data: globalMapping, error: globalError } = await supabase
      .from('account_mappings')
      .select('account_code')
      .is('organization_id', null)
      .eq('country_code', String(orgContext.country_code).toUpperCase())
      .eq('accounting_standard', String(orgContext.accounting_standard).toUpperCase())
      .eq('mapping_type', mappingType)
      .eq('mapping_key', mappingKey)
      .eq('is_active', true)
      .maybeSingle();

    if (globalError) {
      this.logger.error(`Failed to get global account mapping: ${globalError.message}`);
      return null;
    }

    if (!globalMapping?.account_code) {
      return null;
    }

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('code', globalMapping.account_code)
      .eq('is_active', true)
      .maybeSingle();

    if (accountError) {
      this.logger.error(`Failed to get account by code: ${accountError.message}`);
      return null;
    }

    return account?.id || null;
  }

  /**
   * Generate journal entry number
   * Replaces function: generate_journal_entry_number()
   */
  private async generateJournalEntryNumber(
    _supabase: SupabaseClient,
    organizationId: string,
  ): Promise<string> {
    try {
      return await this.sequencesService.generateJournalEntryNumber(organizationId);
    } catch (error) {
      this.logger.error(`Failed to generate journal entry number: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(`Failed to generate journal entry number`);
    }
  }

  /**
   * Create journal entry from a worker payment record
   * Journal Entry:
   * Dr. Salary/Wages Expense Account    XXX.XX
   *    Cr. Cash / Bank Account                 XXX.XX
   */
  async createJournalEntryFromWorkerPayment(
    organizationId: string,
    paymentId: string,
    amount: number,
    date: Date,
    workerName: string,
    paymentType: string,
    createdBy: string,
    farmId?: string,
  ): Promise<any> {
    await this.assertPeriodOpen(organizationId, date);
    const supabase = this.databaseService.getAdminClient();

    // Get account mappings
    // Try to get salary/wages expense account - use 'labor' or 'salary' as mapping key
    let expenseAccountId = await this.getAccountIdByMapping(
      supabase,
      organizationId,
      'cost_type',
      'labor',
    );

    // Fallback to 'salary' if 'labor' not found
    if (!expenseAccountId) {
      expenseAccountId = await this.getAccountIdByMapping(
        supabase,
        organizationId,
        'cost_type',
        'salary',
      );
    }

    // Fallback to 'wages' if still not found
    if (!expenseAccountId) {
      expenseAccountId = await this.getAccountIdByMapping(
        supabase,
        organizationId,
        'cost_type',
        'wages',
      );
    }

    const cashAccountId = await this.getAccountIdByMapping(
      supabase,
      organizationId,
      'cash',
      'bank',
    );

    // Log warning if mappings are missing but don't fail (allow payment to be created)
    if (!expenseAccountId) {
      this.logger.warn(
        `Account mapping missing for worker payment expense (labor/salary/wages). ` +
        `Payment ${paymentId} created but journal entry not created. ` +
        `Please configure account mappings for labor/salary/wages.`,
      );
      return null;
    }

    if (!cashAccountId) {
      this.logger.warn(
        `Cash account mapping missing. ` +
        `Payment ${paymentId} created but journal entry not created. ` +
        `Please configure cash/bank account mapping.`,
      );
      return null;
    }

    // Generate journal entry number
    const entryNumber = await this.generateJournalEntryNumber(supabase, organizationId);

    // Resolve fiscal year from date
    const wpDateStr = date instanceof Date ? date.toISOString().split('T')[0] : String(date);
    const wpFiscalYearId = await this.fiscalYearsService.resolveFiscalYear(organizationId, wpDateStr);

    // Create journal entry
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        organization_id: organizationId,
        entry_number: entryNumber,
        entry_date: date,
        entry_type: JournalEntryType.EXPENSE,
        description: `Worker payment: ${workerName} - ${paymentType}`,
        reference_id: paymentId,
        reference_type: 'worker_payment',
        total_debit: 0, // Will be updated by trigger
        total_credit: 0, // Will be updated by trigger
        status: JournalEntryStatus.DRAFT, // Start as draft, post after items inserted
        created_by: createdBy,
        ...(wpFiscalYearId ? { fiscal_year_id: wpFiscalYearId } : {}),
      })
      .select()
      .single();

    if (entryError) {
      this.logger.error(`Failed to create journal entry for worker payment: ${entryError.message}`);
      throw new BadRequestException(`Failed to create journal entry: ${entryError.message}`);
    }

    // Create journal items (debit expense, credit cash)
    const items = [
      {
        journal_entry_id: journalEntry.id,
        account_id: expenseAccountId,
        debit: amount,
        credit: 0,
        description: `Salary/Wages payment for ${workerName}`,
        farm_id: farmId || null,
        ...(wpFiscalYearId ? { fiscal_year_id: wpFiscalYearId } : {}),
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: cashAccountId,
        debit: 0,
        credit: amount,
        description: `Payment to ${workerName} - ${paymentType}`,
        farm_id: farmId || null,
        ...(wpFiscalYearId ? { fiscal_year_id: wpFiscalYearId } : {}),
      },
    ];

    // Validate double-entry before inserting
    const totalDebit = items.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = items.reduce((sum, item) => sum + item.credit, 0);

    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      throw new BadRequestException(
        `Worker payment journal entry is not balanced: debits=${totalDebit}, credits=${totalCredit}`,
      );
    }

    const { error: itemsError } = await supabase
      .from('journal_items')
      .insert(items);

    if (itemsError) {
      this.logger.error(`Failed to create journal items for worker payment: ${itemsError.message}`);
      // Rollback journal entry
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id)
        .eq('organization_id', organizationId);
      throw new BadRequestException(`Failed to create journal items: ${itemsError.message}`);
    }

    // Post the journal entry and set correct totals (set explicitly — no DB trigger)
    const { error: postError } = await supabase
      .from('journal_entries')
      .update({ status: JournalEntryStatus.POSTED, total_debit: totalDebit, total_credit: totalCredit })
      .eq('id', journalEntry.id);

    if (postError) {
      this.logger.error(`Failed to post journal entry: ${postError.message}`);
      throw new BadRequestException(`Failed to post journal entry: ${postError.message}`);
    }

    this.logger.log(`Journal entry created for worker payment ${paymentId}: ${entryNumber}`);
    return journalEntry;
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /**
   * Create journal entry from a salary slip (HR module integration).
   * Dr. Salary expense       gross_pay
   *    Cr. Statutory deductions    sum(deductions)  (CNSS, IR, etc.)
   *    Cr. Cash/Bank               net_pay
   * Stores journal_entry_id back on the salary_slip row.
   */
  async createJournalEntryFromSalarySlip(
    organizationId: string,
    slip: {
      id: string;
      farm_id: string | null;
      worker_id: string;
      pay_period_start: string;
      pay_period_end: string;
      gross_pay: number;
      total_deductions: number;
      net_pay: number;
    },
    workerName: string,
    createdBy: string,
  ): Promise<any> {
    const date = new Date(slip.pay_period_end);
    await this.assertPeriodOpen(organizationId, date);
    const supabase = this.databaseService.getAdminClient();

    // Salary expense account: try labor → salary → wages
    let expenseAccountId =
      (await this.getAccountIdByMapping(supabase, organizationId, 'cost_type', 'labor')) ||
      (await this.getAccountIdByMapping(supabase, organizationId, 'cost_type', 'salary')) ||
      (await this.getAccountIdByMapping(supabase, organizationId, 'cost_type', 'wages'));
    const cashAccountId = await this.getAccountIdByMapping(supabase, organizationId, 'cash', 'bank');
    // Statutory deductions liability — try mapping then fall back to expense (single-line).
    const deductionsAccountId =
      (await this.getAccountIdByMapping(supabase, organizationId, 'cost_type', 'statutory_deductions')) ||
      (await this.getAccountIdByMapping(supabase, organizationId, 'cost_type', 'cnss'));

    if (!expenseAccountId || !cashAccountId) {
      this.logger.warn(
        `Skipping JE for salary slip ${slip.id}: missing account mappings (labor/cash).`,
      );
      return null;
    }

    const entryNumber = await this.generateJournalEntryNumber(supabase, organizationId);
    const dateStr = date.toISOString().split('T')[0];
    const fiscalYearId = await this.fiscalYearsService.resolveFiscalYear(organizationId, dateStr);

    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        organization_id: organizationId,
        entry_number: entryNumber,
        entry_date: date,
        entry_type: JournalEntryType.EXPENSE,
        description: `Payroll: ${workerName} (${slip.pay_period_start} → ${slip.pay_period_end})`,
        reference_id: slip.id,
        reference_type: 'salary_slip',
        total_debit: 0,
        total_credit: 0,
        status: JournalEntryStatus.DRAFT,
        created_by: createdBy,
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      })
      .select()
      .single();

    if (entryError) {
      this.logger.error(`Failed to create JE for salary slip ${slip.id}: ${entryError.message}`);
      throw new BadRequestException(`Failed to create journal entry: ${entryError.message}`);
    }

    const items: any[] = [
      {
        journal_entry_id: journalEntry.id,
        account_id: expenseAccountId,
        debit: this.round2(slip.gross_pay),
        credit: 0,
        description: `Gross salary - ${workerName}`,
        farm_id: slip.farm_id,
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      },
    ];

    if (slip.total_deductions > 0 && deductionsAccountId) {
      items.push({
        journal_entry_id: journalEntry.id,
        account_id: deductionsAccountId,
        debit: 0,
        credit: this.round2(slip.total_deductions),
        description: `Statutory deductions - ${workerName}`,
        farm_id: slip.farm_id,
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      });
      items.push({
        journal_entry_id: journalEntry.id,
        account_id: cashAccountId,
        debit: 0,
        credit: this.round2(slip.net_pay),
        description: `Net pay - ${workerName}`,
        farm_id: slip.farm_id,
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      });
    } else {
      // No deductions mapping — credit cash for full gross
      items.push({
        journal_entry_id: journalEntry.id,
        account_id: cashAccountId,
        debit: 0,
        credit: this.round2(slip.gross_pay),
        description: `Salary payment - ${workerName}`,
        farm_id: slip.farm_id,
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      });
    }

    const totalDebit = items.reduce((s, it) => s + it.debit, 0);
    const totalCredit = items.reduce((s, it) => s + it.credit, 0);
    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      throw new BadRequestException(
        `Salary slip JE not balanced: debits=${totalDebit}, credits=${totalCredit}`,
      );
    }

    const { error: itemsError } = await supabase.from('journal_items').insert(items);
    if (itemsError) {
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      throw new BadRequestException(`Failed to insert journal items: ${itemsError.message}`);
    }

    await supabase
      .from('journal_entries')
      .update({ status: JournalEntryStatus.POSTED, total_debit: totalDebit, total_credit: totalCredit })
      .eq('id', journalEntry.id);

    // Back-reference on the slip
    await supabase
      .from('salary_slips')
      .update({ journal_entry_id: journalEntry.id })
      .eq('id', slip.id);

    this.logger.log(`JE created for salary slip ${slip.id}: ${entryNumber}`);
    return journalEntry;
  }

  /**
   * Create journal entry from an approved expense claim.
   * Dr. Expense (cost_type='general' or per-category)   grand_total
   *    Cr. Accounts payable / Bank                         grand_total
   */
  async createJournalEntryFromExpenseClaim(
    organizationId: string,
    claim: {
      id: string;
      farm_id: string | null;
      worker_id: string;
      title: string;
      expense_date: string;
      grand_total: number;
    },
    workerName: string,
    createdBy: string,
  ): Promise<any> {
    const date = new Date(claim.expense_date);
    await this.assertPeriodOpen(organizationId, date);
    const supabase = this.databaseService.getAdminClient();

    // Try 'expense_claim' mapping then fallback to 'general' / labor
    const expenseAccountId =
      (await this.getAccountIdByMapping(supabase, organizationId, 'cost_type', 'expense_claim')) ||
      (await this.getAccountIdByMapping(supabase, organizationId, 'cost_type', 'general')) ||
      (await this.getAccountIdByMapping(supabase, organizationId, 'cost_type', 'labor'));
    // Payable mapping (preferred) or cash
    const payableAccountId =
      (await this.getAccountIdByMapping(supabase, organizationId, 'cost_type', 'accounts_payable')) ||
      (await this.getAccountIdByMapping(supabase, organizationId, 'cash', 'bank'));

    if (!expenseAccountId || !payableAccountId) {
      this.logger.warn(
        `Skipping JE for expense claim ${claim.id}: missing account mappings.`,
      );
      return null;
    }

    const entryNumber = await this.generateJournalEntryNumber(supabase, organizationId);
    const dateStr = date.toISOString().split('T')[0];
    const fiscalYearId = await this.fiscalYearsService.resolveFiscalYear(organizationId, dateStr);

    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        organization_id: organizationId,
        entry_number: entryNumber,
        entry_date: date,
        entry_type: JournalEntryType.EXPENSE,
        description: `Expense claim: ${claim.title} - ${workerName}`,
        reference_id: claim.id,
        reference_type: 'expense_claim',
        total_debit: 0,
        total_credit: 0,
        status: JournalEntryStatus.DRAFT,
        created_by: createdBy,
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      })
      .select()
      .single();

    if (entryError) {
      throw new BadRequestException(`Failed to create JE: ${entryError.message}`);
    }

    const amount = this.round2(claim.grand_total);
    const items = [
      {
        journal_entry_id: journalEntry.id,
        account_id: expenseAccountId,
        debit: amount,
        credit: 0,
        description: claim.title,
        farm_id: claim.farm_id,
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: payableAccountId,
        debit: 0,
        credit: amount,
        description: `Payable to ${workerName}`,
        farm_id: claim.farm_id,
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      },
    ];

    const { error: itemsError } = await supabase.from('journal_items').insert(items);
    if (itemsError) {
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      throw new BadRequestException(`Failed to insert journal items: ${itemsError.message}`);
    }

    await supabase
      .from('journal_entries')
      .update({ status: JournalEntryStatus.POSTED, total_debit: amount, total_credit: amount })
      .eq('id', journalEntry.id);

    // Back-reference on the claim
    await supabase
      .from('expense_claims')
      .update({ journal_entry_id: journalEntry.id })
      .eq('id', claim.id);

    this.logger.log(`JE created for expense claim ${claim.id}: ${entryNumber}`);
    return journalEntry;
  }

  /**
   * Create a reversing journal entry for a previously posted entry.
   * Swaps debit/credit on every line and posts it. Used for invoice voids,
   * harvest edit/delete, and any other case where a posted entry must be undone
   * without mutating the original (preserves audit trail).
   *
   * Throws if the original is not posted, or if a reversal already exists.
   */
  async createReversalEntry(
    organizationId: string,
    originalEntryId: string,
    userId: string,
    reason: string,
    reversalDate?: Date,
  ): Promise<{ reversalEntryId: string; reversalNumber: string }> {
    const supabase = this.databaseService.getAdminClient();

    const { data: original, error: originalError } = await supabase
      .from('journal_entries')
      .select('id, entry_number, status, reference_type, reference_number, reference_id')
      .eq('id', originalEntryId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (originalError || !original) {
      throw new BadRequestException(`Original journal entry not found: ${originalError?.message ?? 'no row'}`);
    }

    if (original.status !== 'posted') {
      throw new BadRequestException(`Only posted journal entries can be reversed (got status: ${original.status})`);
    }

    // Idempotency: refuse to create a second reversal for the same entry
    const { data: existingReversal } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('reference_type', 'Reversal')
      .eq('reference_id', originalEntryId)
      .maybeSingle();

    if (existingReversal) {
      throw new BadRequestException(`Reversal already exists for journal entry ${original.entry_number}`);
    }

    const effectiveDate = (reversalDate ?? new Date()).toISOString().split('T')[0];
    await this.assertPeriodOpen(organizationId, effectiveDate);
    const reversalNumber = await this.generateJournalEntryNumber(supabase, organizationId);
    const now = new Date().toISOString();

    const result = await this.databaseService.executeInPgTransaction(async (pgClient) => {
      // Lock original to prevent concurrent reversal
      const lockRes = await pgClient.query(
        `SELECT status FROM journal_entries WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [originalEntryId, organizationId],
      );
      if (lockRes.rowCount === 0) {
        throw new BadRequestException('Original journal entry not found');
      }
      if (lockRes.rows[0].status !== 'posted') {
        throw new BadRequestException('Original journal entry is no longer posted');
      }

      const jeRes = await pgClient.query(
        `INSERT INTO journal_entries (organization_id, entry_number, entry_date, entry_type, description, reference_type, reference_number, reference_id, remarks, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          organizationId,
          reversalNumber,
          effectiveDate,
          JournalEntryType.ADJUSTMENT,
          `Reversal of ${original.entry_number}: ${reason}`,
          'Reversal',
          original.entry_number,
          originalEntryId,
          reason,
          userId,
          'draft',
        ],
      );
      const reversalId = jeRes.rows[0].id;

      // Copy items with debit/credit swapped
      const copyRes = await pgClient.query(
        `INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit, cost_center_id, farm_id, parcel_id)
         SELECT $1, account_id, COALESCE('Reversal: ' || description, 'Reversal'), credit, debit, cost_center_id, farm_id, parcel_id
         FROM journal_items WHERE journal_entry_id = $2
         RETURNING debit, credit`,
        [reversalId, originalEntryId],
      );

      if (copyRes.rowCount === 0) {
        throw new BadRequestException('Original journal entry has no items to reverse');
      }

      const totalDebit = copyRes.rows.reduce((s: number, r: any) => s + Number(r.debit || 0), 0);
      const totalCredit = copyRes.rows.reduce((s: number, r: any) => s + Number(r.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) >= 0.01) {
        throw new BadRequestException(
          `Reversal entry not balanced: debits=${totalDebit}, credits=${totalCredit}`,
        );
      }

      await pgClient.query(
        `UPDATE journal_entries SET status = 'posted', posted_by = $1, posted_at = $2, total_debit = $3, total_credit = $4 WHERE id = $5`,
        [userId, now, totalDebit, totalCredit, reversalId],
      );

      return { reversalEntryId: reversalId };
    });

    this.logger.log(`Reversal entry ${reversalNumber} created for ${original.entry_number} (reason: ${reason})`);
    return { reversalEntryId: result.reversalEntryId, reversalNumber };
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
