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

@Injectable()
export class SequencesService {
  private readonly logger = new Logger(SequencesService.name);

  constructor(private databaseService: DatabaseService) {}

  /**
   * Generate next sequence number for a given type and organization
   * Migrated from Supabase Edge Functions (generate_invoice_number, etc.)
   */
  async getNextSequence(
    organizationId: string,
    sequenceType: SequenceType,
    prefix?: string,
  ): Promise<string> {
    const client = this.databaseService.getAdminClient();

    try {
      // Call the existing Supabase RPC function
      const { data, error } = await client.rpc('get_next_sequence', {
        p_organization_id: organizationId,
        p_sequence_type: sequenceType,
        p_prefix: prefix || this.getDefaultPrefix(sequenceType),
      });

      if (error) {
        this.logger.error(`Failed to generate sequence: ${error.message}`);
        throw new Error(`Failed to generate sequence: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error(`Sequence generation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate invoice number
   */
  async generateInvoiceNumber(organizationId: string): Promise<string> {
    return this.getNextSequence(organizationId, SequenceType.INVOICE, 'INV');
  }

  /**
   * Generate quote number
   */
  async generateQuoteNumber(organizationId: string): Promise<string> {
    return this.getNextSequence(organizationId, SequenceType.QUOTE, 'QUO');
  }

  /**
   * Generate sales order number
   */
  async generateSalesOrderNumber(organizationId: string): Promise<string> {
    return this.getNextSequence(organizationId, SequenceType.SALES_ORDER, 'SO');
  }

  /**
   * Generate purchase order number
   */
  async generatePurchaseOrderNumber(organizationId: string): Promise<string> {
    return this.getNextSequence(
      organizationId,
      SequenceType.PURCHASE_ORDER,
      'PO',
    );
  }

  /**
   * Generate journal entry number
   */
  async generateJournalEntryNumber(organizationId: string): Promise<string> {
    return this.getNextSequence(
      organizationId,
      SequenceType.JOURNAL_ENTRY,
      'JE',
    );
  }

  /**
   * Generate payment number
   */
  async generatePaymentNumber(organizationId: string): Promise<string> {
    return this.getNextSequence(organizationId, SequenceType.PAYMENT, 'PAY');
  }

  /**
   * Generate stock entry number
   */
  async generateStockEntryNumber(organizationId: string): Promise<string> {
    return this.getNextSequence(
      organizationId,
      SequenceType.STOCK_ENTRY,
      'SE',
    );
  }

  /**
   * Get default prefix for sequence type
   */
  private getDefaultPrefix(sequenceType: SequenceType): string {
    const prefixes: Record<SequenceType, string> = {
      [SequenceType.INVOICE]: 'INV',
      [SequenceType.QUOTE]: 'QUO',
      [SequenceType.SALES_ORDER]: 'SO',
      [SequenceType.PURCHASE_ORDER]: 'PO',
      [SequenceType.JOURNAL_ENTRY]: 'JE',
      [SequenceType.PAYMENT]: 'PAY',
      [SequenceType.STOCK_ENTRY]: 'SE',
    };

    return prefixes[sequenceType] || 'SEQ';
  }
}
