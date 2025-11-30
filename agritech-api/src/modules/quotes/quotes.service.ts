import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { CreateQuoteDto, UpdateQuoteStatusDto, QuoteFiltersDto } from './dto';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
  ) {}

  /**
   * Get all quotes with optional filters
   */
  async findAll(
    organizationId: string,
    filters?: QuoteFiltersDto
  ): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    let query = supabaseClient
      .from('quotes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('quote_date', { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    if (filters?.customer_name) {
      query = query.ilike('customer_name', `%${filters.customer_name}%`);
    }

    if (filters?.quote_number) {
      query = query.ilike('quote_number', `%${filters.quote_number}%`);
    }

    if (filters?.date_from) {
      query = query.gte('quote_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('quote_date', filters.date_to);
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
      this.logger.error(`Failed to fetch quotes: ${error.message}`);
      throw new BadRequestException(`Failed to fetch quotes: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a single quote by ID with items
   */
  async findOne(id: string, organizationId: string): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    const { data, error } = await supabaseClient
      .from('quotes')
      .select(`
        *,
        items:quote_items(*)
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch quote: ${error.message}`);
      throw new BadRequestException(`Failed to fetch quote: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Quote not found');
    }

    return data;
  }

  /**
   * Create a new quote with items
   */
  async create(
    createQuoteDto: CreateQuoteDto,
    organizationId: string,
    userId: string,
  ): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      // Generate quote number
      const quoteNumber = await this.sequencesService.getNextSequence(
        organizationId,
        'quote' as any,
      );

      // Fetch customer details
      const { data: customer } = await supabaseClient
        .from('customers')
        .select('name, contact_person, email, phone')
        .eq('id', createQuoteDto.customer_id)
        .eq('organization_id', organizationId)
        .single();

      if (!customer) {
        throw new BadRequestException('Customer not found');
      }

      // Extract items from DTO
      const { items, ...quoteData } = createQuoteDto;

      // Calculate totals
      let subtotal = 0;
      let taxTotal = 0;

      const processedItems = items.map((item, index) => {
        const amount = item.quantity * item.unit_price;
        const discountAmount = item.discount_percent ? (amount * item.discount_percent) / 100 : 0;
        const amountAfterDiscount = amount - discountAmount;
        const taxAmount = item.tax_rate ? (amountAfterDiscount * item.tax_rate) / 100 : 0;
        const lineTotal = amountAfterDiscount + taxAmount;

        subtotal += amountAfterDiscount;
        taxTotal += taxAmount;

        return {
          line_number: index + 1,
          item_name: item.item_name,
          description: item.description || null,
          quantity: item.quantity,
          unit_of_measure: item.unit_of_measure || 'unit',
          unit_price: item.unit_price,
          amount,
          discount_percent: item.discount_percent || 0,
          discount_amount: discountAmount,
          tax_id: item.tax_id || null,
          tax_rate: item.tax_rate || 0,
          tax_amount: taxAmount,
          line_total: lineTotal,
          account_id: item.account_id || null,
          item_id: item.item_id || null,
        };
      });

      const grandTotal = subtotal + taxTotal;

      // Create quote
      const { data: quote, error: quoteError } = await supabaseClient
        .from('quotes')
        .insert({
          organization_id: organizationId,
          quote_number: quoteNumber,
          quote_date: quoteData.quote_date,
          valid_until: quoteData.valid_until,
          customer_id: quoteData.customer_id,
          customer_name: customer.name,
          contact_person: customer.contact_person,
          contact_email: customer.email,
          contact_phone: customer.phone,
          subtotal,
          tax_total: taxTotal,
          grand_total: grandTotal,
          currency_code: 'MAD', // Default currency
          exchange_rate: 1.0,
          status: 'draft',
          payment_terms: quoteData.payment_terms,
          delivery_terms: quoteData.delivery_terms,
          terms_and_conditions: quoteData.terms_and_conditions,
          notes: quoteData.notes,
          reference_number: quoteData.reference_number,
          created_by: userId,
        })
        .select()
        .single();

      if (quoteError) {
        throw new BadRequestException(`Failed to create quote: ${quoteError.message}`);
      }

      // Create quote items
      const quoteItems = processedItems.map(item => ({
        ...item,
        quote_id: quote.id,
      }));

      const { error: itemsError } = await supabaseClient
        .from('quote_items')
        .insert(quoteItems);

      if (itemsError) {
        // Rollback: delete the quote
        await supabaseClient.from('quotes').delete().eq('id', quote.id);
        throw new BadRequestException(`Failed to create quote items: ${itemsError.message}`);
      }

      return quote;
    } catch (error) {
      this.logger.error(`Error creating quote: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update quote status
   */
  async updateStatus(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateQuoteStatusDto
  ): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    const updateData: any = {
      status: dto.status,
    };

    if (dto.notes) {
      updateData.notes = dto.notes;
    }

    // Update timestamps based on status
    if (dto.status === 'sent') {
      updateData.sent_at = new Date().toISOString();
      updateData.sent_by = userId;
    } else if (dto.status === 'accepted') {
      updateData.accepted_at = new Date().toISOString();
    } else if (dto.status === 'converted') {
      updateData.converted_at = new Date().toISOString();
      updateData.converted_by = userId;
    }

    const { data, error } = await supabaseClient
      .from('quotes')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update quote status: ${error.message}`);
      throw new BadRequestException(`Failed to update quote status: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a quote (only drafts)
   */
  async delete(id: string, organizationId: string): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    // Check quote status - only drafts can be deleted
    const { data: quote } = await supabaseClient
      .from('quotes')
      .select('status')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (quote?.status !== 'draft') {
      throw new BadRequestException(
        'Only draft quotes can be deleted. Please cancel instead.'
      );
    }

    // Delete quote items first
    await supabaseClient
      .from('quote_items')
      .delete()
      .eq('quote_id', id);

    // Delete quote
    const { error } = await supabaseClient
      .from('quotes')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete quote: ${error.message}`);
      throw new BadRequestException(`Failed to delete quote: ${error.message}`);
    }

    return { message: 'Quote deleted successfully' };
  }
}
