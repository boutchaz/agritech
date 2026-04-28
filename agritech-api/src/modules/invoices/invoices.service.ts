import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { sanitizeSearch } from '../../common/utils/sanitize-search';
import { NotificationsService, InvoiceEmailData, MANAGEMENT_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { StockEntriesService } from '../stock-entries/stock-entries.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import { StockEntryType, StockEntryStatus } from '../stock-entries/dto/create-stock-entry.dto';
import { InvoiceFiltersDto, UpdateInvoiceStatusDto, CreateInvoiceDto, UpdateInvoiceDto, CreateCreditNoteDto } from './dto';
import { buildInvoiceLedgerLines } from '../journal-entries/helpers/ledger.helper';

const roundCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;
import { PaginatedResponse, SortDirection } from '../../common/dto/paginated-query.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
    private readonly notificationsService: NotificationsService,
    private readonly stockEntriesService: StockEntriesService,
    private readonly accountingAutomationService: AccountingAutomationService,
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
      const safeSearch = sanitizeSearch(search);
      if (safeSearch) {
        const searchFilter = `invoice_number.ilike.%${safeSearch}%,party_name.ilike.%${safeSearch}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }
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

      // Notify management about new invoice
      try {
        const typeLabel = dto.invoice_type === 'sales' ? 'Sales' : 'Purchase';
        await this.notificationsService.createNotificationsForRoles(
          organizationId,
          MANAGEMENT_ROLES,
          userId,
          NotificationType.INVOICE_CREATED,
          `🧾 ${typeLabel} Invoice ${invoiceNumber} created`,
          `${dto.party_name} — ${grandTotal} ${dto.currency_code || 'MAD'}`,
          { invoiceId: invoice.id, invoiceNumber, invoiceType: dto.invoice_type, amount: grandTotal, currency: dto.currency_code || 'MAD' },
        );
      } catch (notifError) {
        this.logger.warn(`Failed to send invoice  otification: ${notifError}`);
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
      .select('status, journal_entry_id, grand_total, outstanding_amount, party_id, party_name, party_type, currency_code, invoice_type, invoice_number')
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

    // Cannot manually set to 'submitted' - must use postInvoice endpoint
    if (dto.status === 'submitted' && currentInvoice.status === 'draft') {
      throw new BadRequestException(
        'Cannot manually set invoice to submitted. Please use the post invoice endpoint to submit and create journal entry.'
      );
    }

    // Cancel on a posted invoice: block if payments allocated, else reverse the GL entry
    let reversalEntryId: string | null = null;
    if (dto.status === 'cancelled' && currentInvoice.journal_entry_id) {
      const { count: allocationCount, error: allocError } = await supabaseClient
        .from('payment_allocations')
        .select('id', { count: 'exact', head: true })
        .eq('invoice_id', id);

      if (allocError) {
        throw new BadRequestException(`Failed to check payment allocations: ${allocError.message}`);
      }

      if ((allocationCount ?? 0) > 0) {
        throw new BadRequestException(
          'Cannot cancel invoice with payment allocations. Un-allocate or refund payments first.',
        );
      }

      const reversal = await this.accountingAutomationService.createReversalEntry(
        organizationId,
        currentInvoice.journal_entry_id,
        userId,
        `Cancellation of invoice ${currentInvoice.invoice_number}`,
      );
      reversalEntryId = reversal.reversalEntryId;
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

    // When marking as paid, also set paid_amount and outstanding_amount
    if (dto.status === 'paid') {
      const total = Number(currentInvoice.grand_total) || 0;
      updateData.paid_amount = total;
      updateData.outstanding_amount = 0;
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

    // When marking as paid, create an accounting_payments record + allocation
    if (dto.status === 'paid') {
      try {
        const paymentNumber = await this.sequencesService.generatePaymentNumber(organizationId);
        const paymentType = currentInvoice.invoice_type === 'sales' ? 'receive' : 'pay';

        const { data: payment, error: payError } = await supabaseClient
          .from('accounting_payments')
          .insert({
            organization_id: organizationId,
            payment_number: paymentNumber,
            payment_date: new Date().toISOString().split('T')[0],
            payment_type: paymentType,
            payment_method: 'cash',
            party_id: currentInvoice.party_id || null,
            party_name: currentInvoice.party_name || 'Unknown',
            party_type: currentInvoice.party_type || (currentInvoice.invoice_type === 'sales' ? 'customer' : 'supplier'),
            amount: Number(currentInvoice.grand_total) || 0,
            currency_code: currentInvoice.currency_code || 'MAD',
            reference_number: currentInvoice.invoice_number,
            remarks: `Payment for invoice ${currentInvoice.invoice_number}`,
            status: 'submitted',
            created_by: userId,
          })
          .select()
          .single();

        if (!payError && payment) {
          await supabaseClient
            .from('payment_allocations')
            .insert({
              payment_id: payment.id,
              invoice_id: id,
              allocated_amount: Number(currentInvoice.grand_total) || 0,
            });
        } else {
          this.logger.warn(`Failed to create payment record for invoice ${id}: ${payError?.message}`);
        }
      } catch (paymentErr) {
        // Don't fail the status update if payment record creation fails
        this.logger.error(`Error creating payment record for invoice ${id}: ${paymentErr instanceof Error ? paymentErr.message : String(paymentErr)}`);
      }
    }

    return reversalEntryId ? { ...data, reversal_entry_id: reversalEntryId } : data;
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

    // Fetch invoice with items (read only — status re-checked under pg row lock inside tx)
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
          unit_of_measure,
          amount,
          tax_amount,
          account_id
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

    // Block posting to closed fiscal periods
    await this.accountingAutomationService.assertPeriodOpen(organizationId, postingDate);

    // Resolve GL accounts via account_mappings (country-generic)
    const isSales = invoice.invoice_type === 'sales';

    const [receivableAccountId, payableAccountId, taxCollectedAccountId, taxDeductibleAccountId, defaultRevenueAccountId, defaultExpenseAccountId] = await Promise.all([
      isSales ? this.accountingAutomationService.resolveAccountId(organizationId, 'receivable', 'trade') : Promise.resolve(null),
      !isSales ? this.accountingAutomationService.resolveAccountId(organizationId, 'payable', 'trade') : Promise.resolve(null),
      isSales ? this.accountingAutomationService.resolveAccountId(organizationId, 'tax', 'collected') : Promise.resolve(null),
      !isSales ? this.accountingAutomationService.resolveAccountId(organizationId, 'tax', 'deductible') : Promise.resolve(null),
      isSales ? this.accountingAutomationService.resolveAccountId(organizationId, 'revenue', 'default') : Promise.resolve(null),
      !isSales ? this.accountingAutomationService.resolveAccountId(organizationId, 'expense', 'default') : Promise.resolve(null),
    ]);

    // Hard-fail if the required AR/AP mapping is missing — do not silently post without GL
    if (isSales && !receivableAccountId) {
      throw new BadRequestException(
        'Account mapping missing for receivable/trade. Configure account mappings before posting sales invoices.',
      );
    }
    if (!isSales && !payableAccountId) {
      throw new BadRequestException(
        'Account mapping missing for payable/trade. Configure account mappings before posting purchase invoices.',
      );
    }

    // Generate entry number outside tx (uses its own tx internally)
    const entryNumber = await this.generateJournalEntryNumber(supabaseClient, organizationId);
    const now = new Date().toISOString();

    // ACID posting: lock invoice row, create journal entry + items, update invoice — all-or-nothing
    const { journalEntryId } = await this.databaseService.executeInPgTransaction(async (pgClient) => {
      // Lock invoice row and re-check status under lock to prevent double-post races
      const lockResult = await pgClient.query(
        `SELECT status FROM invoices WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [invoiceId, organizationId],
      );
      if (lockResult.rowCount === 0) {
        throw new NotFoundException('Invoice not found');
      }
      if (lockResult.rows[0].status !== 'draft') {
        throw new BadRequestException('Invoice is no longer in draft state (concurrent post?)');
      }

      // Create journal entry header (draft; totals set when posting)
      const jeResult = await pgClient.query(
        `INSERT INTO journal_entries (organization_id, entry_number, entry_date, reference_type, reference_number, reference_id, remarks, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          organizationId,
          entryNumber,
          postingDate,
          isSales ? 'Sales Invoice' : 'Purchase Invoice',
          invoice.invoice_number,
          invoice.id,
          `Journal entry for ${invoice.invoice_type} invoice ${invoice.invoice_number}`,
          userId,
          'draft',
        ],
      );
      const jeId = jeResult.rows[0].id;

      // Build ledger lines via pure helper (throws on missing per-item accounts).
      // GL is posted in base currency — multiply foreign-currency amounts by the invoice's exchange_rate.
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
            account_id: item.account_id || null,
            cost_center_id: item.cost_center_id || null,
          })),
        },
        jeId,
        {
          receivableAccountId: receivableAccountId ?? '',
          payableAccountId: payableAccountId ?? '',
          taxPayableAccountId: taxCollectedAccountId ?? undefined,
          taxReceivableAccountId: taxDeductibleAccountId ?? undefined,
          defaultRevenueAccountId: defaultRevenueAccountId ?? undefined,
          defaultExpenseAccountId: defaultExpenseAccountId ?? undefined,
        },
        Number(invoice.exchange_rate ?? 1),
      );

      const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
      if (Math.abs(totalDebit - totalCredit) >= 0.01) {
        throw new BadRequestException(
          `Journal entry is not balanced: debits=${totalDebit}, credits=${totalCredit}`,
        );
      }

      for (const line of lines) {
        await pgClient.query(
          `INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit, cost_center_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [line.journal_entry_id, line.account_id, line.description || null, line.debit, line.credit, line.cost_center_id || null],
        );
      }

      // Post journal entry with correct totals
      await pgClient.query(
        `UPDATE journal_entries SET status = 'posted', posted_by = $1, posted_at = $2, total_debit = $3, total_credit = $4 WHERE id = $5`,
        [userId, now, totalDebit, totalCredit, jeId],
      );

      // Mark invoice submitted and link to journal entry
      await pgClient.query(
        `UPDATE invoices SET status = 'submitted', journal_entry_id = $1, submitted_at = $2, submitted_by = $3, updated_at = $2 WHERE id = $4`,
        [jeId, now, userId, invoiceId],
      );

      return { journalEntryId: jeId };
    });

    this.logger.log(`Invoice ${invoice.invoice_number} posted with journal entry ${entryNumber}`);

    // Update stock if invoice items have item_id (shared by both paths)
    const stockableItems = (invoice.items || []).filter((item: any) => item.item_id);

    if (stockableItems.length > 0) {
      try {
        const entryType = invoice.invoice_type === 'sales'
          ? StockEntryType.MATERIAL_ISSUE
          : StockEntryType.MATERIAL_RECEIPT;

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
            status: StockEntryStatus.POSTED,
            items: stockEntryItems,
            created_by: userId,
          });

          this.logger.log(`Stock entry ${stockEntry.id} created for invoice ${invoice.invoice_number}`);
        }
      } catch (stockError) {
        const err = stockError as Error;
        this.logger.error(`Failed to create stock entry for invoice ${invoice.invoice_number}: ${err.message}`, err.stack);
      }
    }

    return {
      success: true,
      message: 'Invoice posted successfully',
      data: { invoice_id: invoiceId, journal_entry_id: journalEntryId },
    };
  }

  /**
   * Generate journal entry number
   */
  private async generateJournalEntryNumber(
    _supabaseClient: any,
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

  /**
   * Create a credit note (avoir) against a posted invoice.
   *
   * Posts an inverse journal entry (debits and credits swapped relative to the
   * original invoice's GL pattern). Optionally restores stock for inventory
   * items by creating a Material Receipt (sales credit) or Material Issue
   * (purchase credit) — opposite of what postInvoice did.
   *
   * Idempotency: blocks credit notes that would push the cumulative credit
   * past the original grand_total. The DB trigger keeps invoices.credited_amount
   * in sync.
   */
  async createCreditNote(
    originalInvoiceId: string,
    dto: CreateCreditNoteDto,
    organizationId: string,
    userId: string,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // 1. Load original invoice + items
    const { data: original, error: originalErr } = await supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('id', originalInvoiceId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (originalErr || !original) {
      throw new NotFoundException('Original invoice not found');
    }

    if (original.document_type === 'credit_note') {
      throw new BadRequestException('Cannot credit a credit note. Issue a new invoice instead.');
    }

    if (!['submitted', 'partially_paid', 'paid', 'overdue'].includes(original.status)) {
      throw new BadRequestException(
        `Only posted invoices can be credited (current status: ${original.status})`,
      );
    }

    // 2. Resolve which lines to credit
    const originalItems: any[] = original.items || [];
    if (originalItems.length === 0) {
      throw new BadRequestException('Original invoice has no line items');
    }

    type CreditLine = {
      original_item: any;
      quantity: number;
      unit_price: number;
      amount: number;
      tax_rate: number;
      tax_amount: number;
      line_total: number;
    };

    const creditLines: CreditLine[] = (dto.lines && dto.lines.length > 0
      ? dto.lines.map((line) => {
          const orig = originalItems.find((it) => it.id === line.original_item_id);
          if (!orig) {
            throw new BadRequestException(
              `Line ${line.original_item_id} not found on original invoice ${original.invoice_number}`,
            );
          }
          if (line.quantity > Number(orig.quantity)) {
            throw new BadRequestException(
              `Cannot credit ${line.quantity} of "${orig.item_name}" — original line quantity is ${orig.quantity}`,
            );
          }
          const unit_price = line.unit_price ?? Number(orig.unit_price);
          const amount = roundCurrency(line.quantity * unit_price);
          const tax_rate = Number(orig.tax_rate) || 0;
          const tax_amount = roundCurrency(amount * (tax_rate / 100));
          return {
            original_item: orig,
            quantity: line.quantity,
            unit_price,
            amount,
            tax_rate,
            tax_amount,
            line_total: roundCurrency(amount + tax_amount),
          };
        })
      : originalItems.map((orig) => ({
          original_item: orig,
          quantity: Number(orig.quantity),
          unit_price: Number(orig.unit_price),
          amount: Number(orig.amount),
          tax_rate: Number(orig.tax_rate) || 0,
          tax_amount: Number(orig.tax_amount) || 0,
          line_total: Number(orig.line_total),
        })));

    const subtotal = roundCurrency(creditLines.reduce((s, l) => s + l.amount, 0));
    const taxTotal = roundCurrency(creditLines.reduce((s, l) => s + l.tax_amount, 0));
    const grandTotal = roundCurrency(subtotal + taxTotal);

    if (grandTotal <= 0) {
      throw new BadRequestException('Credit note total must be positive');
    }

    // Cumulative credit cap — including this new credit
    const alreadyCredited = Number(original.credited_amount) || 0;
    if (roundCurrency(alreadyCredited + grandTotal) > Number(original.grand_total) + 0.01) {
      throw new BadRequestException(
        `Credit ${grandTotal} would exceed the uncredited balance ${roundCurrency(Number(original.grand_total) - alreadyCredited)} of invoice ${original.invoice_number}`,
      );
    }

    // 3. Period gating + account resolution
    const postingDate = dto.invoice_date || new Date().toISOString().split('T')[0];
    await this.accountingAutomationService.assertPeriodOpen(organizationId, postingDate);

    const isSales = original.invoice_type === 'sales';
    const [
      receivableAccountId,
      payableAccountId,
      taxCollectedAccountId,
      taxDeductibleAccountId,
      defaultRevenueAccountId,
      defaultExpenseAccountId,
    ] = await Promise.all([
      isSales ? this.accountingAutomationService.resolveAccountId(organizationId, 'receivable', 'trade') : Promise.resolve(null),
      !isSales ? this.accountingAutomationService.resolveAccountId(organizationId, 'payable', 'trade') : Promise.resolve(null),
      isSales ? this.accountingAutomationService.resolveAccountId(organizationId, 'tax', 'collected') : Promise.resolve(null),
      !isSales ? this.accountingAutomationService.resolveAccountId(organizationId, 'tax', 'deductible') : Promise.resolve(null),
      isSales ? this.accountingAutomationService.resolveAccountId(organizationId, 'revenue', 'default') : Promise.resolve(null),
      !isSales ? this.accountingAutomationService.resolveAccountId(organizationId, 'expense', 'default') : Promise.resolve(null),
    ]);

    if (isSales && !receivableAccountId) {
      throw new BadRequestException('Account mapping missing for receivable/trade. Configure account mappings before creating credit notes.');
    }
    if (!isSales && !payableAccountId) {
      throw new BadRequestException('Account mapping missing for payable/trade. Configure account mappings before creating credit notes.');
    }

    // 4. Generate numbers
    const creditNoteNumber = await this.sequencesService.generateCreditNoteNumber(
      organizationId,
      original.invoice_type,
    );
    const journalEntryNumber = await this.generateJournalEntryNumber(supabase, organizationId);

    // 5. Atomic posting: insert credit note invoice + items + reversal JE in one tx
    const { creditNoteId, journalEntryId } = await this.databaseService.executeInPgTransaction(async (pgClient) => {
      // Lock original to keep credited_amount cap consistent
      const lockRes = await pgClient.query(
        `SELECT credited_amount, grand_total FROM invoices WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [originalInvoiceId, organizationId],
      );
      if (lockRes.rowCount === 0) {
        throw new NotFoundException('Original invoice not found');
      }
      const lockedCredited = Number(lockRes.rows[0].credited_amount) || 0;
      if (roundCurrency(lockedCredited + grandTotal) > Number(lockRes.rows[0].grand_total) + 0.01) {
        throw new BadRequestException('Concurrent credit detected — invoice has already been fully credited');
      }

      // 5a. Insert credit note invoice (status = submitted directly; credit notes don't have draft phase here)
      const cnRes = await pgClient.query(
        `INSERT INTO invoices (
          organization_id, invoice_number, invoice_date, invoice_type, document_type,
          original_invoice_id, credit_reason,
          party_id, party_name, party_type,
          subtotal, tax_total, grand_total, outstanding_amount, paid_amount,
          currency_code, exchange_rate,
          status, notes,
          farm_id, parcel_id,
          created_by, submitted_at, submitted_by
        ) VALUES (
          $1, $2, $3, $4, 'credit_note',
          $5, $6,
          $7, $8, $9,
          $10, $11, $12, 0, $12,
          $13, $14,
          'paid', $15,
          $16, $17,
          $18, NOW(), $18
        ) RETURNING id`,
        [
          organizationId,
          creditNoteNumber,
          postingDate,
          original.invoice_type,
          originalInvoiceId,
          dto.credit_reason,
          original.party_id || null,
          original.party_name,
          original.party_type || null,
          subtotal,
          taxTotal,
          grandTotal,
          original.currency_code || 'MAD',
          original.exchange_rate || 1.0,
          dto.notes || null,
          original.farm_id || null,
          original.parcel_id || null,
          userId,
        ],
      );
      const cnId = cnRes.rows[0].id;

      // 5b. Insert credit note items
      let lineNumber = 1;
      for (const line of creditLines) {
        await pgClient.query(
          `INSERT INTO invoice_items (
            invoice_id, line_number, item_name, description, quantity, unit_of_measure,
            unit_price, amount, tax_id, tax_rate, tax_amount, line_total,
            account_id, item_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            cnId,
            lineNumber++,
            line.original_item.item_name,
            line.original_item.description || null,
            line.quantity,
            line.original_item.unit_of_measure || 'unit',
            line.unit_price,
            line.amount,
            line.original_item.tax_id || null,
            line.tax_rate,
            line.tax_amount,
            line.line_total,
            line.original_item.account_id || null,
            line.original_item.item_id || null,
          ],
        );
      }

      // 5c. Create reversal journal entry header
      const jeRes = await pgClient.query(
        `INSERT INTO journal_entries (organization_id, entry_number, entry_date, reference_type, reference_number, reference_id, remarks, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          organizationId,
          journalEntryNumber,
          postingDate,
          'Credit Note',
          creditNoteNumber,
          cnId,
          `Credit note ${creditNoteNumber} for invoice ${original.invoice_number}: ${dto.credit_reason}`,
          userId,
          'draft',
        ],
      );
      const jeId = jeRes.rows[0].id;

      // 5d. Build standard invoice ledger lines, then SWAP debit↔credit to reverse
      const standardLines = buildInvoiceLedgerLines(
        {
          id: cnId,
          invoice_number: creditNoteNumber,
          invoice_type: original.invoice_type,
          grand_total: grandTotal,
          tax_total: taxTotal,
          party_name: original.party_name,
          items: creditLines.map((l) => ({
            id: l.original_item.id,
            item_name: l.original_item.item_name,
            description: l.original_item.description,
            amount: l.amount,
            tax_amount: l.tax_amount,
            account_id: l.original_item.account_id || null,
            cost_center_id: l.original_item.cost_center_id || null,
          })),
        },
        jeId,
        {
          receivableAccountId: receivableAccountId ?? '',
          payableAccountId: payableAccountId ?? '',
          taxPayableAccountId: taxCollectedAccountId ?? undefined,
          taxReceivableAccountId: taxDeductibleAccountId ?? undefined,
          defaultRevenueAccountId: defaultRevenueAccountId ?? undefined,
          defaultExpenseAccountId: defaultExpenseAccountId ?? undefined,
        },
        Number(original.exchange_rate ?? 1),
      );

      const reversedLines = standardLines.map((l) => ({
        ...l,
        debit: l.credit,
        credit: l.debit,
        description: l.description ? `Credit: ${l.description}` : 'Credit',
      }));

      const totalDebit = reversedLines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = reversedLines.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(totalDebit - totalCredit) >= 0.01) {
        throw new BadRequestException(`Credit note JE not balanced: ${totalDebit} vs ${totalCredit}`);
      }

      for (const line of reversedLines) {
        await pgClient.query(
          `INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit, cost_center_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [jeId, line.account_id, line.description, line.debit, line.credit, line.cost_center_id || null],
        );
      }

      const now = new Date().toISOString();
      await pgClient.query(
        `UPDATE journal_entries SET status = 'posted', posted_by = $1, posted_at = $2, total_debit = $3, total_credit = $4 WHERE id = $5`,
        [userId, now, totalDebit, totalCredit, jeId],
      );

      // 5e. Link JE to credit note
      await pgClient.query(
        `UPDATE invoices SET journal_entry_id = $1 WHERE id = $2`,
        [jeId, cnId],
      );

      return { creditNoteId: cnId, journalEntryId: jeId };
    });

    this.logger.log(
      `Credit note ${creditNoteNumber} created for invoice ${original.invoice_number} with JE ${journalEntryNumber}`,
    );

    // 6. Stock restoration (after tx — uses StockEntriesService which has its own tx)
    const restoreStock = dto.restore_stock !== false;
    const stockableLines = creditLines.filter((l) => l.original_item.item_id);

    if (restoreStock && stockableLines.length > 0) {
      try {
        // Sales credit note → return goods to warehouse (Material Receipt)
        // Purchase credit note → ship goods back to supplier (Material Issue)
        const entryType = isSales ? StockEntryType.MATERIAL_RECEIPT : StockEntryType.MATERIAL_ISSUE;

        // Resolve warehouse — use the same warehouse the original posting picked
        const { data: warehouses } = await supabase
          .from('warehouses')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .limit(1);
        const warehouseId = warehouses?.[0]?.id || null;

        if (!warehouseId) {
          this.logger.warn(`No active warehouse for org ${organizationId} — skipping stock restoration`);
        } else {
          const stockItems = stockableLines.map((l) => ({
            item_id: l.original_item.item_id as string,
            item_name: l.original_item.item_name,
            quantity: l.quantity,
            unit: l.original_item.unit_of_measure || 'unit',
            ...(entryType === StockEntryType.MATERIAL_ISSUE
              ? { source_warehouse_id: warehouseId }
              : { target_warehouse_id: warehouseId }),
          }));

          await this.stockEntriesService.createStockEntry({
            organization_id: organizationId,
            entry_type: entryType,
            entry_date: new Date(postingDate),
            ...(entryType === StockEntryType.MATERIAL_ISSUE
              ? { from_warehouse_id: warehouseId }
              : { to_warehouse_id: warehouseId }),
            reference_type: 'Credit Note',
            reference_id: creditNoteId,
            reference_number: creditNoteNumber,
            purpose: `Stock ${entryType === StockEntryType.MATERIAL_ISSUE ? 'return to supplier' : 'return to warehouse'} for credit note ${creditNoteNumber}`,
            notes: `Auto-generated from credit note ${creditNoteNumber} (original: ${original.invoice_number})`,
            status: StockEntryStatus.POSTED,
            items: stockItems,
            created_by: userId,
          });

          this.logger.log(`Stock restoration entry created for credit note ${creditNoteNumber}`);
        }
      } catch (stockErr) {
        const err = stockErr as Error;
        this.logger.error(
          `Stock restoration failed for credit note ${creditNoteNumber}: ${err.message}`,
          err.stack,
        );
        // Non-fatal — GL has been posted; admin can fix stock manually if needed
      }
    }

    return this.findOne(creditNoteId, organizationId);
  }
}
