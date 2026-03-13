import { Injectable, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { StockEntryType } from './dto/create-stock-entry.dto';

interface StockEntryItem {
  id: string;
  item_id: string;
  quantity: number;
  cost_per_unit?: number;
}

interface StockEntry {
  id: string;
  organization_id: string;
  entry_type: StockEntryType;
  entry_number: string;
  entry_date: Date;
  items: StockEntryItem[];
}

interface StockAccountMapping {
  id: string;
  entry_type: string;
  debit_account_id: string;
  credit_account_id: string;
  item_category?: string;
}

/**
 * Service for automating stock-related accounting entries
 * Creates journal entries automatically when stock entries are posted
 * based on stock_account_mappings configuration
 */
@Injectable()
export class StockAccountingService {
  private readonly logger = new Logger(StockAccountingService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
  ) {}

  /**
   * Create journal entry for a stock entry
   * Uses stock_account_mappings to determine debit/credit accounts
   */
  async createJournalEntryForStockEntry(
    client: PoolClient,
    stockEntry: StockEntry,
    items: StockEntryItem[],
  ): Promise<{ journal_entry_id: string | null; success: boolean; error?: string }> {
    try {
      // Stock Transfer within the same legal entity has no accounting impact
      // It's just a location change - the asset remains on the books
      if (stockEntry.entry_type === StockEntryType.STOCK_TRANSFER) {
        this.logger.log(
          `Stock Transfer ${stockEntry.entry_number} has no accounting impact - skipping journal entry`,
        );
        return { journal_entry_id: null, success: true };
      }

      // Get account mappings for this entry type
      const mappings = await this.getAccountMappings(
        client,
        stockEntry.organization_id,
        stockEntry.entry_type,
      );

      if (mappings.length === 0) {
        this.logger.warn(
          `No stock account mappings found for organization ${stockEntry.organization_id} ` +
          `and entry type ${stockEntry.entry_type}. Skipping journal entry creation.`,
        );
        return { journal_entry_id: null, success: true };
      }

      // Calculate total value from items
      const totalValue = this.calculateTotalValue(items);

      if (totalValue === 0) {
        this.logger.log(
          `Stock entry ${stockEntry.entry_number} has zero total value. ` +
          `Skipping journal entry creation.`,
        );
        return { journal_entry_id: null, success: true };
      }

      // Get item categories for category-specific mappings
      const itemCategories = await this.getItemCategories(client, items);

      // Find the appropriate mapping (prefer category-specific, fallback to general)
      const mapping = this.findBestMapping(mappings, itemCategories);

      if (!mapping) {
        this.logger.warn(
          `No matching account mapping found for stock entry ${stockEntry.entry_number}. ` +
          `Skipping journal entry creation.`,
        );
        return { journal_entry_id: null, success: true };
      }

      // Generate journal entry number
      const entryNumber = await this.sequencesService.generateJournalEntryNumber(
        stockEntry.organization_id,
      );

      // Create journal entry
      const journalResult = await client.query(
        `INSERT INTO journal_entries (
          organization_id,
          entry_number,
          entry_date,
          remarks,
          reference_type,
          reference_id,
          reference_number,
          total_debit,
          total_credit,
          status,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          stockEntry.organization_id,
          entryNumber,
          stockEntry.entry_date,
          `Stock Entry: ${stockEntry.entry_number}`,
          'Stock Entry',
          stockEntry.id,
          stockEntry.entry_number,
          totalValue,
          totalValue,
          'posted', // Auto-post stock-related journal entries
          null, // System-generated
        ],
      );

      const journalEntryId = journalResult.rows[0]?.id;

      if (!journalEntryId) {
        throw new Error('Failed to create journal entry');
      }

      // Create journal items (debit and credit)
      // For stock entries:
      // - Material Receipt: Debit Inventory Asset, Credit Accounts Payable/Cash
      // - Material Issue: Debit Cost of Goods Sold/WIP, Credit Inventory Asset
      // - Stock Transfer: Usually no accounting impact (just location change)
      // - Stock Reconciliation: Debit/Credit Inventory Asset based on variance

      const debitAccountId = mapping.debit_account_id;
      const creditAccountId = mapping.credit_account_id;

      // Create debit journal item
      await client.query(
        `INSERT INTO journal_items (
          journal_entry_id,
          account_id,
          debit,
          credit,
          description
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          journalEntryId,
          debitAccountId,
          totalValue,
          0,
          `Stock Entry: ${stockEntry.entry_number} - Debit`,
        ],
      );

      // Create credit journal item
      await client.query(
        `INSERT INTO journal_items (
          journal_entry_id,
          account_id,
          debit,
          credit,
          description
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          journalEntryId,
          creditAccountId,
          0,
          totalValue,
          `Stock Entry: ${stockEntry.entry_number} - Credit`,
        ],
      );

      // Update stock entry with journal entry reference
      await client.query(
        `UPDATE stock_entries SET journal_entry_id = $1 WHERE id = $2`,
        [journalEntryId, stockEntry.id],
      );

      this.logger.log(
        `Created journal entry ${entryNumber} for stock entry ${stockEntry.entry_number} ` +
        `with total value ${totalValue}`,
      );

      return { journal_entry_id: journalEntryId, success: true };
    } catch (error) {
      this.logger.error(
        `Failed to create journal entry for stock entry ${stockEntry.entry_number}: ${error.message}`,
        error.stack,
      );
      return {
        journal_entry_id: null,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get account mappings for an organization and entry type
   */
  private async getAccountMappings(
    client: PoolClient,
    organizationId: string,
    entryType: StockEntryType,
  ): Promise<StockAccountMapping[]> {
    const result = await client.query(
      `SELECT id, entry_type, debit_account_id, credit_account_id, item_category
       FROM stock_account_mappings
       WHERE organization_id = $1 AND entry_type = $2
       ORDER BY item_category NULLS LAST`,
      [organizationId, entryType],
    );

    return result.rows;
  }

  /**
   * Calculate total value from stock entry items
   */
  private calculateTotalValue(items: StockEntryItem[]): number {
    return items.reduce((total, item) => {
      const costPerUnit = item.cost_per_unit || 0;
      return total + (item.quantity * costPerUnit);
    }, 0);
  }

  /**
   * Get item categories for a list of items
   */
  private async getItemCategories(
    client: PoolClient,
    items: StockEntryItem[],
  ): Promise<string[]> {
    if (items.length === 0) return [];

    const itemIds = items.map((item) => item.item_id);
    const result = await client.query(
      `SELECT DISTINCT i.item_group_id, ig.name as category_name
       FROM items i
       LEFT JOIN item_groups ig ON i.item_group_id = ig.id
       WHERE i.id = ANY($1)`,
      [itemIds],
    );

    return result.rows.map((row) => row.category_name).filter(Boolean);
  }

  /**
   * Find the best mapping for the given item categories
   * Prefers category-specific mappings over general ones
   */
  private findBestMapping(
    mappings: StockAccountMapping[],
    itemCategories: string[],
  ): StockAccountMapping | null {
    if (mappings.length === 0) return null;

    // First, try to find a category-specific mapping
    for (const category of itemCategories) {
      const categoryMapping = mappings.find(
        (m) => m.item_category?.toLowerCase() === category?.toLowerCase(),
      );
      if (categoryMapping) return categoryMapping;
    }

    // Fallback to general mapping (no item_category specified)
    const generalMapping = mappings.find((m) => !m.item_category);
    if (generalMapping) return generalMapping;

    // If no general mapping, return the first one (shouldn't happen with proper data)
    return mappings[0];
  }

  /**
   * Create journal entry for stock reconciliation variance
   * Handles positive and negative variances differently
   */
  async createJournalEntryForReconciliation(
    client: PoolClient,
    stockEntry: StockEntry,
    varianceType: 'positive' | 'negative',
    varianceValue: number,
  ): Promise<{ journal_entry_id: string | null; success: boolean; error?: string }> {
    try {
      // Get mappings for reconciliation
      const mappings = await this.getAccountMappings(
        client,
        stockEntry.organization_id,
        StockEntryType.STOCK_RECONCILIATION,
      );

      if (mappings.length === 0 || varianceValue === 0) {
        return { journal_entry_id: null, success: true };
      }

      // For reconciliation, we may have specific mappings for positive/negative variance
      // For now, use the general reconciliation mapping
      const mapping = mappings[0];

      const entryNumber = await this.sequencesService.generateJournalEntryNumber(
        stockEntry.organization_id,
      );

      // Determine debit/credit based on variance type
      // Positive variance (found stock): Debit Inventory, Credit Gain
      // Negative variance (missing stock): Debit Loss, Credit Inventory
      let debitAccountId: string;
      let creditAccountId: string;

      if (varianceType === 'positive') {
        debitAccountId = mapping.debit_account_id; // Inventory Asset
        creditAccountId = mapping.credit_account_id; // Inventory Variance Income
      } else {
        debitAccountId = mapping.credit_account_id; // Inventory Variance Expense
        creditAccountId = mapping.debit_account_id; // Inventory Asset
      }

      const absValue = Math.abs(varianceValue);

      // Create journal entry
      const journalResult = await client.query(
        `INSERT INTO journal_entries (
          organization_id,
          entry_number,
          entry_date,
          remarks,
          reference_type,
          reference_id,
          reference_number,
          total_debit,
          total_credit,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          stockEntry.organization_id,
          entryNumber,
          stockEntry.entry_date,
          `Stock Reconciliation: ${stockEntry.entry_number} (${varianceType} variance)`,
          'Stock Entry',
          stockEntry.id,
          stockEntry.entry_number,
          absValue,
          absValue,
          'posted',
        ],
      );

      const journalEntryId = journalResult.rows[0]?.id;

      // Create journal items
      await client.query(
        `INSERT INTO journal_items (journal_entry_id, account_id, debit, credit, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [journalEntryId, debitAccountId, absValue, 0, `Reconciliation ${varianceType} variance - Debit`],
      );

      await client.query(
        `INSERT INTO journal_items (journal_entry_id, account_id, debit, credit, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [journalEntryId, creditAccountId, 0, absValue, `Reconciliation ${varianceType} variance - Credit`],
      );

      this.logger.log(
        `Created journal entry ${entryNumber} for reconciliation ${stockEntry.entry_number} ` +
        `(${varianceType} variance: ${absValue})`,
      );

      return { journal_entry_id: journalEntryId, success: true };
    } catch (error) {
      this.logger.error(
        `Failed to create reconciliation journal entry: ${error.message}`,
        error.stack,
      );
      return { journal_entry_id: null, success: false, error: error.message };
    }
  }
}
