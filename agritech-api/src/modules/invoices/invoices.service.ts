import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { InvoiceFiltersDto, UpdateInvoiceStatusDto, CreateInvoiceDto } from './dto';

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
        await this.sequencesService.getNextSequence(organizationId, 'invoice' as any);

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
          quote_id: dto.quote_id || null,
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
      const itemsToInsert = dto.items.map((item) => ({
        invoice_id: invoice.id,
        item_name: item.item_name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        tax_id: item.tax_id || null,
        tax_rate: item.tax_rate || 0,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
        income_account_id: item.income_account_id || null,
        expense_account_id: item.expense_account_id || null,
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

      // Fetch the complete invoice with items
      return this.findOne(invoice.id, organizationId);
    } catch (error) {
      this.logger.error('Error creating invoice:', error);
      throw error;
    }
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
