import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { CreateQuoteDto, UpdateQuoteDto, UpdateQuoteStatusDto, QuoteFiltersDto } from './dto';

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
      const quoteNumber = await this.sequencesService.generateQuoteNumber(
        organizationId,
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
   * Update quote status with validation for allowed transitions
   *
   * Valid status transitions:
   * - draft -> sent, cancelled
   * - sent -> accepted, rejected, cancelled
   * - accepted -> converted, cancelled
   * - rejected -> (no transitions allowed - terminal state)
   * - converted -> (no transitions allowed - terminal state)
   * - cancelled -> (no transitions allowed - terminal state)
   * - expired -> (no transitions allowed - terminal state)
   */
  async updateStatus(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateQuoteStatusDto
  ): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    // Fetch current quote to validate status transition
    const { data: currentQuote, error: fetchError } = await supabaseClient
      .from('quotes')
      .select('status, quote_number')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !currentQuote) {
      throw new NotFoundException('Quote not found');
    }

    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['sent', 'cancelled'],
      sent: ['accepted', 'rejected', 'cancelled'],
      accepted: ['converted', 'cancelled'],
      rejected: [], // Terminal state
      converted: [], // Terminal state
      cancelled: [], // Terminal state
      expired: [], // Terminal state
    };

    const currentStatus = currentQuote.status;
    const newStatus = dto.status;

    // Check if the transition is valid
    const allowedTransitions = validTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      const terminalStates = ['rejected', 'converted', 'cancelled', 'expired'];
      if (terminalStates.includes(currentStatus)) {
        throw new BadRequestException(
          `Cannot change status of a ${currentStatus} quote. This is a terminal state.`
        );
      }
      throw new BadRequestException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

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
    } else if (dto.status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancelled_by = userId;
    } else if (dto.status === 'rejected') {
      updateData.rejected_at = new Date().toISOString();
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

    this.logger.log(`Quote ${currentQuote.quote_number} status changed from '${currentStatus}' to '${newStatus}'`);

    return data;
  }

  /**
   * Convert a quote to a sales order
   */
  async convertToOrder(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      // Fetch quote with items
      const { data: quote, error: fetchError } = await supabaseClient
        .from('quotes')
        .select(`*, items:quote_items(*)`)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError || !quote) {
        throw new NotFoundException('Quote not found');
      }

      if (quote.status === 'converted') {
        throw new BadRequestException('Quote has already been converted');
      }

      if (quote.status === 'cancelled' || quote.status === 'rejected') {
        throw new BadRequestException('Cannot convert cancelled or rejected quotes');
      }

      // Generate order number
      const orderNumber = await this.sequencesService.generateSalesOrderNumber(
        organizationId,
      );

      // Create sales order
      const { data: order, error: orderError } = await supabaseClient
        .from('sales_orders')
        .insert({
          organization_id: organizationId,
          order_number: orderNumber,
          order_date: new Date().toISOString().split('T')[0],
          customer_id: quote.customer_id,
          customer_name: quote.customer_name,
          subtotal: quote.subtotal,
          tax_amount: quote.tax_total,
          total_amount: quote.grand_total,
          status: 'confirmed',
          notes: `Converted from Quote ${quote.quote_number}. ${quote.notes || ''}`.trim(),
          created_by: userId,
        })
        .select()
        .single();

      if (orderError) {
        throw new BadRequestException(`Failed to create sales order: ${orderError.message}`);
      }

      // Copy quote items to order items
      const orderItems = quote.items.map((item: any) => ({
        sales_order_id: order.id,
        line_number: item.line_number,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit_of_measure: item.unit_of_measure,
        unit_price: item.unit_price,
        amount: item.amount,
        discount_percent: item.discount_percent,
        discount_amount: item.discount_amount,
        tax_id: item.tax_id,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
        account_id: item.account_id,
        quote_item_id: item.id,
      }));

      const { error: itemsError } = await supabaseClient
        .from('sales_order_items')
        .insert(orderItems);

      if (itemsError) {
        // Rollback: delete the order
        await supabaseClient.from('sales_orders').delete().eq('id', order.id);
        throw new BadRequestException(`Failed to create order items: ${itemsError.message}`);
      }

      // Update quote status and link to order
      await supabaseClient
        .from('quotes')
        .update({
          status: 'converted',
          sales_order_id: order.id,
          converted_at: new Date().toISOString(),
          converted_by: userId,
        })
        .eq('id', id);

      this.logger.log(`Quote ${quote.quote_number} converted to order ${orderNumber}`);

      return {
        success: true,
        message: 'Quote converted to sales order successfully',
        data: {
          quote_id: id,
          sales_order_id: order.id,
          order_number: orderNumber,
        },
      };
    } catch (error) {
      this.logger.error(`Error converting quote: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a quote (only drafts can be fully updated)
   */
  async update(
    id: string,
    updateQuoteDto: UpdateQuoteDto,
    organizationId: string,
    userId: string,
  ): Promise<any> {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      // Fetch existing quote
      const { data: existingQuote, error: fetchError } = await supabaseClient
        .from('quotes')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError || !existingQuote) {
        throw new NotFoundException('Quote not found');
      }

      // Only draft quotes can be fully edited
      if (existingQuote.status !== 'draft') {
        throw new BadRequestException('Only draft quotes can be edited');
      }

      const { items, ...quoteData } = updateQuoteDto;

      // If customer changed, fetch new customer details
      let customerData = {};
      if (quoteData.customer_id && quoteData.customer_id !== existingQuote.customer_id) {
        const { data: customer } = await supabaseClient
          .from('customers')
          .select('name, contact_person, email, phone')
          .eq('id', quoteData.customer_id)
          .eq('organization_id', organizationId)
          .single();

        if (!customer) {
          throw new BadRequestException('Customer not found');
        }

        customerData = {
          customer_name: customer.name,
          contact_person: customer.contact_person,
          contact_email: customer.email,
          contact_phone: customer.phone,
        };
      }

      // Process items if provided
      let totalsUpdate = {};
      if (items && items.length > 0) {
        // Delete existing items
        await supabaseClient
          .from('quote_items')
          .delete()
          .eq('quote_id', id);

        // Calculate totals for new items
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
            quote_id: id,
            line_number: item.line_number || index + 1,
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
        totalsUpdate = {
          subtotal,
          tax_total: taxTotal,
          grand_total: grandTotal,
        };

        // Insert new items
        const { error: itemsError } = await supabaseClient
          .from('quote_items')
          .insert(processedItems);

        if (itemsError) {
          throw new BadRequestException(`Failed to update quote items: ${itemsError.message}`);
        }
      }

      // Update quote
      const updateData: any = {
        ...quoteData,
        ...customerData,
        ...totalsUpdate,
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { data: updatedQuote, error: updateError } = await supabaseClient
        .from('quotes')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (updateError) {
        throw new BadRequestException(`Failed to update quote: ${updateError.message}`);
      }

      this.logger.log(`Quote ${id} updated successfully`);

      return updatedQuote;
    } catch (error) {
      this.logger.error(`Error updating quote: ${error.message}`);
      throw error;
    }
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
