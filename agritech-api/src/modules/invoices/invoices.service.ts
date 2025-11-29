import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { InvoiceFiltersDto, UpdateInvoiceStatusDto } from './dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all invoices with optional filters
   */
  async findAll(
    organizationId: string,
    filters?: InvoiceFiltersDto
  ): Promise<any> {
    const supabaseClient = this.databaseService.getClient();

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
    const supabaseClient = this.databaseService.getClient();

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
   * Update invoice status
   */
  async updateStatus(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateInvoiceStatusDto
  ): Promise<any> {
    const supabaseClient = this.databaseService.getClient();

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
    const supabaseClient = this.databaseService.getClient();

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
