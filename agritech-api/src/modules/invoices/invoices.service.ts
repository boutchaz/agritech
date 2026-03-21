import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { NotificationsService, InvoiceEmailData } from '../notifications/notifications.service';
import { StockEntriesService } from '../stock-entries/stock-entries.service';
import { StockEntryType, StockEntryStatus } from '../stock-entries/dto/create-stock-entry.dto';
import { InvoiceFiltersDto, UpdateInvoiceStatusDto, CreateInvoiceDto, UpdateInvoiceDto } from './dto';
import { buildInvoiceLedgerLines } from '../journal-entries/helpers/ledger.helper';
import { PaginatedResponse, SortDirection } from '../../common/dto/paginated-query.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
    private readonly notificationsService: NotificationsService,
    private readonly stockEntriesService: StockEntriesService,
  ) {}

  async findAll(
    organizationId: string,
    filters?: InvoiceFiltersDto
  ): Promise<PaginatedResponse<any>> {
    const supabaseClient = this.databaseService.getAdminClient();

    const {
      page = 1,
      pageSize = 10,
      sortBy = 'invoice_date',
      sortDir = SortDirection.DESC,
      search,
      dateFrom,
      dateTo,
      invoice_type,
      status,
      party_id,
    } = filters || {};

    const offset = (page - 1) * pageSize;

    let countQuery = supabaseClient
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    let dataQuery = supabaseClient
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId);

    if (search) {
      const searchFilter = `invoice_number.ilike.%${search}%,party_name.ilike.%${search}%`;
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }

    if (invoice_type) {
      countQuery = countQuery.eq('invoice_type', invoice_type);
      dataQuery = dataQuery.eq('invoice_type', invoice_type);
    }

    if (status) {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    if (party_id) {
      countQuery = countQuery.eq('party_id', party_id);
      dataQuery = dataQuery.eq('party_id', party_id);
    }

    if (dateFrom) {
      countQuery = countQuery.gte('invoice_date', dateFrom);
      dataQuery = dataQuery.gte('invoice_date', dateFrom);
    }

    if (dateTo) {
      countQuery = countQuery.lte('invoice_date', dateTo);
      dataQuery = dataQuery.lte('invoice_date', dateTo);
    }

    const validSortFields = ['invoice_number', 'invoice_date', 'party_name', 'grand_total', 'status', 'invoice_type', 'due_date'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'invoice_date';
    dataQuery = dataQuery.order(sortField, { ascending: sortDir === SortDirection.ASC });

    dataQuery = dataQuery.range(offset, offset + pageSize - 1);

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error) {
      this.logger.error(`Failed to count invoices: ${countResult.error.message}`);
      throw new BadRequestException(`Failed to count invoices: ${countResult.error.message}`);
    }

    if (dataResult.error) {
      this.logger.error(`Failed to fetch invoices: ${dataResult.error.message}`);
      throw new BadRequestException(`Failed to fetch invoices: ${dataResult.error.message}`);
    }

    const total = countResult.count || 0;

    return {
      data: dataResult.data || [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
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
        item_id: item.item_id || null,
        variant_id: item.variant_id || null,
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
        item_id: item.item_id || null,
        variant_id: item.variant_id || null,
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
   * Validate invoice status transition
   */
  private validateInvoiceStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      draft: ['submitted', 'cancelled'],
      submitted: ['paid', 'partially_paid', 'overdue', 'cancelled'],
      partially_paid: ['paid', 'overdue', 'cancelled'],
      overdue: ['paid', 'partially_paid', 'cancelled'],
      paid: [], // Terminal state - cannot transition from paid
      cancelled: [], // Terminal state - cannot transition from cancelled
    };

    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowed.join(', ') || 'none'}`
      );
    }
  }

  /**
   * Update invoice status with validation
   */
  async updateStatus(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateInvoiceStatusDto
  ): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    // Fetch current invoice to validate transition
    const { data: currentInvoice, error: fetchError } = await supabaseClient
      .from('invoices')
      .select('status, journal_entry_id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !currentInvoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Validate status transition
    if (currentInvoice.status !== dto.status) {
      this.validateInvoiceStatusTransition(currentInvoice.status, dto.status);
    }

    // Additional business rules
    // Cannot cancel invoice that has been posted to journal
    if (dto.status === 'cancelled' && currentInvoice.journal_entry_id) {
      throw new BadRequestException(
        'Cannot cancel invoice that has been posted to journal. Please create a reversing entry instead.'
      );
    }

    // Cannot manually set to 'submitted' - must use postInvoice endpoint
    if (dto.status === 'submitted' && currentInvoice.status === 'draft') {
      throw new BadRequestException(
        'Cannot manually set invoice to submitted. Please use the post invoice endpoint to submit and create journal entry.'
      );
    }

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
          item_id,
          item_name,
          description,
          quantity,
          unit,
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

      // Update stock if invoice items have item_id
      // Only process stockable items (items with item_id)
      const stockableItems = (invoice.items || []).filter((item: any) => item.item_id);
      
      if (stockableItems.length > 0) {
        try {
          // For sales invoices: Material Issue (OUT) - deduct stock
          // For purchase invoices: Material Receipt (IN) - add stock
          const entryType = invoice.invoice_type === 'sales' 
            ? StockEntryType.MATERIAL_ISSUE 
            : StockEntryType.MATERIAL_RECEIPT;

          // Get default warehouse for the organization
          // Note: In a real scenario, you might want to get warehouse from invoice or organization settings
          const { data: warehouses } = await supabaseClient
            .from('warehouses')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .limit(1);

          const warehouseId = warehouses && warehouses.length > 0 ? warehouses[0].id : null;

          if (!warehouseId) {
            this.logger.warn(`No active warehouse found for organization ${organizationId}. Skipping stock update.`);
          } else {
            // Prepare stock entry items
            const stockEntryItems = stockableItems.map((item: any) => ({
              item_id: item.item_id,
              variant_id: item.variant_id,
              item_name: item.item_name,
              quantity: Number(item.quantity) || 0,
              unit: item.unit || 'unit',
              ...(entryType === StockEntryType.MATERIAL_ISSUE
                ? { source_warehouse_id: warehouseId }
                : { target_warehouse_id: warehouseId }),
            }));

            // Create stock entry
            const stockEntry = await this.stockEntriesService.createStockEntry({
              organization_id: organizationId,
              entry_type: entryType,
              entry_date: new Date(postingDate),
              ...(entryType === StockEntryType.MATERIAL_ISSUE 
                ? { from_warehouse_id: warehouseId }
                : { to_warehouse_id: warehouseId }),
              reference_type: invoice.invoice_type === 'sales' ? 'Sales Invoice' : 'Purchase Invoice',
              reference_id: invoiceId,
              reference_number: invoice.invoice_number,
              purpose: `Stock ${entryType === StockEntryType.MATERIAL_ISSUE ? 'issue' : 'receipt'} for ${invoice.invoice_type} invoice ${invoice.invoice_number}`,
              notes: `Auto-generated from invoice ${invoice.invoice_number}`,
              status: StockEntryStatus.POSTED, // Post immediately
              items: stockEntryItems,
              created_by: userId,
            });

            this.logger.log(`Stock entry ${stockEntry.id} created for invoice ${invoice.invoice_number}`);
          }
        } catch (stockError) {
          // Log error but don't fail the invoice posting
          this.logger.error(`Failed to create stock entry for invoice ${invoice.invoice_number}: ${stockError.message}`, stockError.stack);
        }
      }

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
    return await this.sequencesService.generateJournalEntryNumber(organizationId);
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

  async sendInvoiceEmail(
    invoiceId: string,
    organizationId: string,
    recipientEmail?: string,
  ): Promise<{ success: boolean; message: string }> {
    const supabaseClient = this.databaseService.getAdminClient();

    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('id', invoiceId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const { data: organization, error: orgError } = await supabaseClient
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      throw new BadRequestException('Organization not found');
    }

    let partyEmail = recipientEmail;
    
    if (!partyEmail && invoice.party_id) {
      if (invoice.party_type === 'customer') {
        const { data: customer } = await supabaseClient
          .from('customers')
          .select('email')
          .eq('id', invoice.party_id)
          .single();
        partyEmail = customer?.email;
      } else if (invoice.party_type === 'supplier') {
        const { data: supplier } = await supabaseClient
          .from('suppliers')
          .select('email')
          .eq('id', invoice.party_id)
          .single();
        partyEmail = supplier?.email;
      }
    }

    if (!partyEmail) {
      throw new BadRequestException('No email address provided or found for the party');
    }

    const emailData: InvoiceEmailData = {
      invoiceNumber: invoice.invoice_number,
      invoiceType: invoice.invoice_type,
      partyName: invoice.party_name,
      partyEmail: partyEmail,
      organizationName: organization.name,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.tax_total || 0),
      grandTotal: Number(invoice.grand_total),
      currency: invoice.currency_code || 'MAD',
      items: (invoice.items || []).map((item: any) => ({
        description: item.item_name || item.description,
        quantity: Number(item.quantity),
        rate: Number(item.unit_price),
        amount: Number(item.amount),
      })),
      notes: invoice.notes,
    };

    const sent = await this.notificationsService.sendInvoiceEmail(emailData);

    if (!sent) {
      this.logger.warn(`Failed to send invoice email for ${invoice.invoice_number}`);
      return {
        success: false,
        message: 'Email could not be sent. Please check email configuration.',
      };
    }

    this.logger.log(`Invoice email sent successfully for ${invoice.invoice_number} to ${partyEmail}`);
    
    return {
      success: true,
      message: `Invoice email sent successfully to ${partyEmail}`,
    };
  }

  /**
   * Recalculate outstanding_amount and paid_amount from payment_allocations.
   * Use this to fix drift between stored amounts and actual allocations.
   */
  async recalculateOutstanding(
    invoiceId: string,
    organizationId: string,
  ): Promise<{ paid_amount: number; outstanding_amount: number; status: string }> {
    const supabaseClient = this.databaseService.getAdminClient();

    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('id, grand_total, status')
      .eq('id', invoiceId)
      .eq('organization_id', organizationId)
      .single();

    if (invoiceError || !invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const { data: allocations, error: allocError } = await supabaseClient
      .from('payment_allocations')
      .select('allocated_amount')
      .eq('invoice_id', invoiceId);

    if (allocError) {
      throw new BadRequestException(`Failed to fetch allocations: ${allocError.message}`);
    }

    const paidAmount = (allocations ?? []).reduce(
      (sum, a) => sum + Number(a.allocated_amount || 0),
      0,
    );
    const grandTotal = Number(invoice.grand_total) || 0;
    const outstandingAmount = Math.max(0, grandTotal - paidAmount);

    // Determine correct status based on amounts
    let status = invoice.status;
    if (paidAmount >= grandTotal && grandTotal > 0) {
      status = 'paid';
    } else if (paidAmount > 0 && paidAmount < grandTotal) {
      status = 'partially_paid';
    }

    const { error: updateError } = await supabaseClient
      .from('invoices')
      .update({
        paid_amount: Math.round(paidAmount * 100) / 100,
        outstanding_amount: Math.round(outstandingAmount * 100) / 100,
        status,
      })
      .eq('id', invoiceId);

    if (updateError) {
      throw new BadRequestException(`Failed to update invoice: ${updateError.message}`);
    }

    return {
      paid_amount: Math.round(paidAmount * 100) / 100,
      outstanding_amount: Math.round(outstandingAmount * 100) / 100,
      status,
    };
  }
}
