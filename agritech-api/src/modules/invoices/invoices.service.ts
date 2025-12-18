import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { InvoiceFiltersDto, UpdateInvoiceStatusDto, CreateInvoiceDto, UpdateInvoiceDto } from './dto';
import { buildInvoiceLedgerLines } from '../journal-entries/helpers/ledger.helper';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
  ) {}

  /**
   * Get all invoices with optional filters
   */
  async findAll(
    organizationId: string,
    filters?: InvoiceFiltersDto
  ): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    let query = supabaseClient
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .order('invoice_date', { ascending: false });

    // Apply filters
    if (filters?.invoice_type) {
      query = query.eq('invoice_type', filters.invoice_type);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.party_id) {
      query = query.eq('party_id', filters.party_id);
    }

    if (filters?.party_name) {
      query = query.ilike('party_name', `%${filters.party_name}%`);
    }

    if (filters?.invoice_number) {
      query = query.ilike('invoice_number', `%${filters.invoice_number}%`);
    }

    if (filters?.date_from) {
      query = query.gte('invoice_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('invoice_date', filters.date_to);
    }

    // Apply pagination
    if (filters?.page && filters?.limit) {
      const offset = (filters.page - 1) * filters.limit;
      query = query.range(offset, offset + filters.limit - 1);
    } else if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch invoices: ${error.message}`);
      throw new BadRequestException(`Failed to fetch invoices: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a single invoice by ID with items
   */
  async findOne(id: string, organizationId: string): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    const { data, error } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch invoice: ${error.message}`);
      throw new BadRequestException(`Failed to fetch invoice: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Invoice not found');
    }

    return data;
  }

  /**
   * Create a new invoice
   */
  async create(
    dto: CreateInvoiceDto,
    organizationId: string,
    userId: string,
  ): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      // Generate invoice number if not provided
      const invoiceNumber = dto.invoice_number ||
        await this.sequencesService.generateInvoiceNumber(organizationId, dto.invoice_type);

      // Calculate totals from items
      const subtotal = dto.items.reduce((sum, item) => sum + item.amount, 0);
      const taxTotal = dto.items.reduce((sum, item) => sum + item.tax_amount, 0);
      const grandTotal = subtotal + taxTotal;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabaseClient
        .from('invoices')
        .insert({
          organization_id: organizationId,
          invoice_number: invoiceNumber,
          invoice_type: dto.invoice_type,
          party_type: dto.party_type,
          party_id: dto.party_id || null,
          party_name: dto.party_name,
          invoice_date: dto.invoice_date,
          due_date: dto.due_date,
          subtotal: dto.subtotal || subtotal,
          tax_total: dto.tax_total || taxTotal,
          grand_total: dto.grand_total || grandTotal,
          outstanding_amount: dto.outstanding_amount || grandTotal,
          currency_code: dto.currency_code || 'MAD',
          exchange_rate: dto.exchange_rate || 1.0,
          payment_terms: dto.payment_terms || null,
          notes: dto.notes || null,
          sales_order_id: dto.sales_order_id || null,
          purchase_order_id: dto.purchase_order_id || null,
          status: 'draft',
          created_by: userId,
        })
        .select()
        .single();

      if (invoiceError) {
        this.logger.error(`Failed to create invoice: ${invoiceError.message}`);
        throw new BadRequestException(`Failed to create invoice: ${invoiceError.message}`);
      }

      // Create invoice items
      // Note: Only using columns that exist in the current database schema
      const itemsToInsert = dto.items.map((item, index) => ({
        invoice_id: invoice.id,
        line_number: index + 1,
        item_name: item.item_name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        tax_id: item.tax_id || null,
        tax_rate: item.tax_rate || 0,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
      }));

      const { error: itemsError } = await supabaseClient
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        // Rollback: delete the created invoice
        await supabaseClient.from('invoices').delete().eq('id', invoice.id);
        this.logger.error(`Failed to create invoice items: ${itemsError.message}`);
        throw new BadRequestException(`Failed to create invoice items: ${itemsError.message}`);
      }

      // Fetch the complete invoice with items
      return this.findOne(invoice.id, organizationId);
    } catch (error) {
      this.logger.error('Error creating invoice:', error);
      throw error;
    }
  }

  /**
   * Update a draft invoice
   */
  async update(
    id: string,
    organizationId: string,
    dto: UpdateInvoiceDto
  ): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    // Check if invoice exists and is a draft
    const { data: existingInvoice, error: fetchError } = await supabaseClient
      .from('invoices')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !existingInvoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (existingInvoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be edited');
    }

    // Build update data for invoice header
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.party_id !== undefined) updateData.party_id = dto.party_id;
    if (dto.party_name !== undefined) updateData.party_name = dto.party_name;
    if (dto.invoice_date !== undefined) updateData.invoice_date = dto.invoice_date;
    if (dto.due_date !== undefined) updateData.due_date = dto.due_date;
    if (dto.payment_terms !== undefined) updateData.payment_terms = dto.payment_terms;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // If items are provided, recalculate totals
    if (dto.items && dto.items.length > 0) {
      const subtotal = dto.items.reduce((sum, item) => sum + item.amount, 0);
      const taxTotal = dto.items.reduce((sum, item) => sum + item.tax_amount, 0);
      const grandTotal = subtotal + taxTotal;

      updateData.subtotal = subtotal;
      updateData.tax_total = taxTotal;
      updateData.grand_total = grandTotal;
      updateData.outstanding_amount = grandTotal;
    }

    // Update invoice header
    const { error: updateError } = await supabaseClient
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (updateError) {
      this.logger.error(`Failed to update invoice: ${updateError.message}`);
      throw new BadRequestException(`Failed to update invoice: ${updateError.message}`);
    }

    // If items are provided, replace all items
    if (dto.items && dto.items.length > 0) {
      // Delete existing items
      const { error: deleteError } = await supabaseClient
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);

      if (deleteError) {
        this.logger.error(`Failed to delete old invoice items: ${deleteError.message}`);
        throw new BadRequestException(`Failed to update invoice items: ${deleteError.message}`);
      }

      // Insert new items
      // Note: Only using columns that exist in the current database schema
      const itemsToInsert = dto.items.map((item, index) => ({
        invoice_id: id,
        line_number: index + 1,
        item_name: item.item_name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        tax_id: item.tax_id || null,
        tax_rate: item.tax_rate || 0,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
      }));

      const { error: insertError } = await supabaseClient
        .from('invoice_items')
        .insert(itemsToInsert);

      if (insertError) {
        this.logger.error(`Failed to insert invoice items: ${insertError.message}`);
        throw new BadRequestException(`Failed to update invoice items: ${insertError.message}`);
      }
    }

    // Return updated invoice with items
    return this.findOne(id, organizationId);
  }

  /**
   * Update invoice status
   */
  async updateStatus(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateInvoiceStatusDto
  ): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    const updateData: any = {
      status: dto.status,
    };

    if (dto.remarks) {
      updateData.remarks = dto.remarks;
    }

    // Update submitted timestamp if status is submitted
    if (dto.status === 'submitted') {
      updateData.submitted_at = new Date().toISOString();
      updateData.submitted_by = userId;
    }

    const { data, error } = await supabaseClient
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update invoice status: ${error.message}`);
      throw new BadRequestException(`Failed to update invoice status: ${error.message}`);
    }

    return data;
  }

  /**
   * Post invoice (create journal entry)
   * Replaces Supabase Edge Function: post-invoice
   */
  async postInvoice(
    invoiceId: string,
    organizationId: string,
    userId: string,
    postingDate: string,
  ): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    // Fetch invoice with items
    // Note: Only selecting columns that exist in the current database schema
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        items:invoice_items(
          id,
          item_name,
          description,
          amount,
          tax_amount
        )
      `)
      .eq('id', invoiceId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be posted');
    }

    // Get required GL accounts based on invoice type
    const SALES_ACCOUNT_CODES = ['1200', '2150']; // AR, Taxes Payable
    const PURCHASE_ACCOUNT_CODES = ['2110', '1400']; // AP, Prepaid taxes
    const requiredCodes =
      invoice.invoice_type === 'sales' ? SALES_ACCOUNT_CODES : PURCHASE_ACCOUNT_CODES;

    const { data: accountRows, error: accountsError } = await supabaseClient
      .from('accounts')
      .select('id, code')
      .eq('organization_id', organizationId)
      .in('code', requiredCodes);

    if (accountsError) {
      throw new BadRequestException(`Failed to load ledger accounts: ${accountsError.message}`);
    }

    const codeToAccountId = new Map<string, string>(
      (accountRows ?? []).map((row) => [row.code, row.id]),
    );

    // Generate journal entry number
    const entryNumber = await this.generateJournalEntryNumber(supabaseClient, organizationId);

    // Create journal entry header
    const { data: journalEntry, error: journalError } = await supabaseClient
      .from('journal_entries')
      .insert({
        organization_id: organizationId,
        entry_number: entryNumber,
        entry_date: postingDate,
        posting_date: postingDate,
        reference_type: invoice.invoice_type === 'sales' ? 'Sales Invoice' : 'Purchase Invoice',
        reference_number: invoice.invoice_number,
        remarks: `Journal entry for ${invoice.invoice_type} invoice ${invoice.invoice_number}`,
        created_by: userId,
        status: 'draft',
      })
      .select()
      .single();

    if (journalError || !journalEntry) {
      throw new BadRequestException(`Failed to create journal entry: ${journalError?.message}`);
    }

    try {
      // Build journal lines
      // Note: income_account_id, expense_account_id, cost_center_id are optional
      // and may not exist in the current database schema
      const lines = buildInvoiceLedgerLines(
        {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_type: invoice.invoice_type,
          grand_total: Number(invoice.grand_total),
          tax_total: Number(invoice.tax_total ?? 0),
          party_name: invoice.party_name,
          items: (invoice.items || []).map((item: any) => ({
            id: item.id,
            item_name: item.item_name,
            description: item.description,
            amount: Number(item.amount),
            tax_amount: Number(item.tax_amount ?? 0),
            income_account_id: item.income_account_id || null,
            expense_account_id: item.expense_account_id || null,
            cost_center_id: item.cost_center_id || null,
          })),
        },
        journalEntry.id,
        {
          receivableAccountId: codeToAccountId.get('1200') ?? '',
          payableAccountId: codeToAccountId.get('2110') ?? '',
          taxPayableAccountId: codeToAccountId.get('2150'),
          taxReceivableAccountId: codeToAccountId.get('1400'),
        },
      );

      // Calculate totals for double-entry validation
      const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

      // Validate double-entry principle before inserting
      if (Math.abs(totalDebit - totalCredit) >= 0.01) {
        await supabaseClient.from('journal_entries').delete().eq('id', journalEntry.id);
        throw new BadRequestException(
          `Journal entry is not balanced: debits=${totalDebit}, credits=${totalCredit}`,
        );
      }

      // Insert journal items
      const { error: insertLinesError } = await supabaseClient
        .from('journal_items')
        .insert(lines);

      if (insertLinesError) {
        await supabaseClient.from('journal_entries').delete().eq('id', journalEntry.id);
        throw new BadRequestException(`Failed to create journal lines: ${insertLinesError.message}`);
      }

      // Note: The database trigger will automatically update total_debit and total_credit
      // in the journal_entries table and validate the constraint

      const now = new Date().toISOString();

      // Update invoice status
      const { error: invoiceUpdateError } = await supabaseClient
        .from('invoices')
        .update({
          status: 'submitted',
          journal_entry_id: journalEntry.id,
          updated_at: now,
        })
        .eq('id', invoiceId)
        .eq('organization_id', organizationId);

      if (invoiceUpdateError) {
        throw new BadRequestException(`Failed to update invoice status: ${invoiceUpdateError.message}`);
      }

      // Post journal entry
      const { error: postJournalError } = await supabaseClient
        .from('journal_entries')
        .update({
          status: 'posted',
          posted_by: userId,
          posted_at: now,
        })
        .eq('id', journalEntry.id);

      if (postJournalError) {
        throw new BadRequestException(`Failed to post journal entry: ${postJournalError.message}`);
      }

      this.logger.log(`Invoice ${invoice.invoice_number} posted with journal entry ${entryNumber}`);

      return {
        success: true,
        message: 'Invoice posted successfully',
        data: {
          invoice_id: invoiceId,
          journal_entry_id: journalEntry.id,
        },
      };
    } catch (error) {
      // Rollback: delete journal entry if anything fails
      await supabaseClient.from('journal_entries').delete().eq('id', journalEntry.id);
      throw error;
    }
  }

  /**
   * Generate journal entry number
   */
  private async generateJournalEntryNumber(
    supabaseClient: any,
    organizationId: string,
  ): Promise<string> {
    const { data, error} = await supabaseClient
      .rpc('generate_journal_entry_number', { p_organization_id: organizationId });

    if (error) {
      this.logger.error(`Failed to generate journal entry number: ${error.message}`);
      throw new BadRequestException(`Failed to generate journal entry number: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete an invoice (only drafts)
   */
  async delete(id: string, organizationId: string): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    // Check invoice status - only drafts can be deleted
    const { data: invoice } = await supabaseClient
      .from('invoices')
      .select('status')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (invoice?.status !== 'draft') {
      throw new BadRequestException(
        'Only draft invoices can be deleted. Please cancel or void instead.'
      );
    }

    // Delete invoice items first
    await supabaseClient
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id);

    // Delete invoice
    const { error } = await supabaseClient
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete invoice: ${error.message}`);
      throw new BadRequestException(`Failed to delete invoice: ${error.message}`);
    }

    return { message: 'Invoice deleted successfully' };
  }
}
