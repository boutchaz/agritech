import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export enum SequenceType {
  INVOICE = 'invoice',
  QUOTE = 'quote',
  SALES_ORDER = 'sales_order',
  PURCHASE_ORDER = 'purchase_order',
  JOURNAL_ENTRY = 'journal_entry',
  PAYMENT = 'payment',
  STOCK_ENTRY = 'stock_entry',
}

interface SequenceConfig {
  table: string;
  dateColumn: string;
  prefix: string;
}

@Injectable()
export class SequencesService {
  private readonly logger = new Logger(SequencesService.name);

  private readonly sequenceConfigs: Record<SequenceType, SequenceConfig> = {
    [SequenceType.QUOTE]: {
      table: 'quotes',
      dateColumn: 'quote_date',
      prefix: 'QT',
    },
    [SequenceType.INVOICE]: {
      table: 'invoices',
      dateColumn: 'invoice_date',
      prefix: 'INV',
    },
    [SequenceType.SALES_ORDER]: {
      table: 'sales_orders',
      dateColumn: 'order_date',
      prefix: 'SO',
    },
    [SequenceType.PURCHASE_ORDER]: {
      table: 'purchase_orders',
      dateColumn: 'order_date',
      prefix: 'PO',
    },
    [SequenceType.JOURNAL_ENTRY]: {
      table: 'journal_entries',
      dateColumn: 'entry_date',
      prefix: 'JE',
    },
    [SequenceType.PAYMENT]: {
      table: 'accounting_payments',
      dateColumn: 'payment_date',
      prefix: 'PAY',
    },
    [SequenceType.STOCK_ENTRY]: {
      table: 'stock_entries',
      dateColumn: 'entry_date',
      prefix: 'SE',
    },
  };

  constructor(private databaseService: DatabaseService) {}

  /**
   * Generate sequence number for any type
   * Format: PREFIX-YYYY-NNNNN (e.g., QT-2025-00001)
   */
  private async generateSequence(
    organizationId: string,
    type: SequenceType,
    customPrefix?: string,
  ): Promise<string> {
    const client = this.databaseService.getAdminClient();
    const config = this.sequenceConfigs[type];
    const prefix = customPrefix || config.prefix;
    const year = new Date().getFullYear();

    try {
      const { count, error } = await client
        .from(config.table)
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte(config.dateColumn, `${year}-01-01`)
        .lt(config.dateColumn, `${year + 1}-01-01`);

      if (error) {
        this.logger.error(
          `Failed to count ${type} for sequence: ${error.message}`,
        );
        throw new Error(`Failed to generate ${type} number: ${error.message}`);
      }

      const nextNumber = (count || 0) + 1;
      return `${prefix}-${year}-${nextNumber.toString().padStart(5, '0')}`;
    } catch (error) {
      this.logger.error(`${type} number generation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate quote number
   */
  async generateQuoteNumber(organizationId: string): Promise<string> {
    return this.generateSequence(organizationId, SequenceType.QUOTE);
  }

  /**
   * Generate invoice number
   */
  async generateInvoiceNumber(
    organizationId: string,
    invoiceType: 'sales' | 'purchase' = 'sales',
  ): Promise<string> {
    const prefix = invoiceType === 'sales' ? 'INV' : 'PINV';
    return this.generateSequence(organizationId, SequenceType.INVOICE, prefix);
  }

  /**
   * Generate sales order number
   */
  async generateSalesOrderNumber(organizationId: string): Promise<string> {
    return this.generateSequence(organizationId, SequenceType.SALES_ORDER);
  }

  /**
   * Generate purchase order number
   */
  async generatePurchaseOrderNumber(organizationId: string): Promise<string> {
    return this.generateSequence(organizationId, SequenceType.PURCHASE_ORDER);
  }

  /**
   * Generate journal entry number
   */
  async generateJournalEntryNumber(organizationId: string): Promise<string> {
    return this.generateSequence(organizationId, SequenceType.JOURNAL_ENTRY);
  }

  /**
   * Generate payment number
   */
  async generatePaymentNumber(organizationId: string): Promise<string> {
    return this.generateSequence(organizationId, SequenceType.PAYMENT);
  }

  /**
   * Generate stock entry number
   */
  async generateStockEntryNumber(organizationId: string): Promise<string> {
    return this.generateSequence(organizationId, SequenceType.STOCK_ENTRY);
  }

  /**
   * Generate lot number for harvest records.
   * Format: LOT-YYYY-NNNNN or LOT-YYYY-NNNNN-P (partial)
   */
  async generateLotNumber(
    organizationId: string,
    isPartial = false,
  ): Promise<string> {
    const client = this.databaseService.getAdminClient();
    const year = new Date().getFullYear();
    const prefix = `LOT-${year}-`;

    try {
      const { count, error } = await client
        .from('harvest_records')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .like('lot_number', `${prefix}%`);

      if (error) {
        this.logger.error(`Failed to count lots for sequence: ${error.message}`);
        throw new Error(`Failed to generate lot number: ${error.message}`);
      }

      const nextNumber = (count || 0) + 1;
      const suffix = isPartial ? '-P' : '';
      return `${prefix}${nextNumber.toString().padStart(4, '0')}${suffix}`;
    } catch (error) {
      this.logger.error(`Lot number generation error: ${error.message}`);
      throw error;
    }
  }
}
