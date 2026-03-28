import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { CreateQuoteDto, UpdateQuoteDto, UpdateQuoteStatusDto, QuoteFiltersDto } from './dto';
import { PaginatedResponse, SortDirection } from '../../common/dto/paginated-query.dto';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
  ) {}

  async findAll(
    organizationId: string,
    filters?: QuoteFiltersDto
  ): Promise<PaginatedResponse<any>> {
    const supabaseClient = this.databaseService.getAdminClient();

    const {
      page = 1,
      pageSize = 10,
      sortBy = 'quote_date',
      sortDir = SortDirection.DESC,
      search,
      dateFrom,
      dateTo,
      status,
      customer_id,
    } = filters || {};

    const offset = (page - 1) * pageSize;

    let countQuery = supabaseClient
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    let dataQuery = supabaseClient
      .from('quotes')
      .select('*')
      .eq('organization_id', organizationId);

    if (search) {
      const searchFilter = `quote_number.ilike.%${search}%,customer_name.ilike.%${search}%`;
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }

    if (status) {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    if (customer_id) {
      countQuery = countQuery.eq('customer_id', customer_id);
      dataQuery = dataQuery.eq('customer_id', customer_id);
    }

    if (dateFrom) {
      countQuery = countQuery.gte('quote_date', dateFrom);
      dataQuery = dataQuery.gte('quote_date', dateFrom);
    }

    if (dateTo) {
      countQuery = countQuery.lte('quote_date', dateTo);
      dataQuery = dataQuery.lte('quote_date', dateTo);
    }

    const validSortFields = ['quote_number', 'quote_date', 'customer_name', 'grand_total', 'status', 'valid_until'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'quote_date';
    dataQuery = dataQuery.order(sortField, { ascending: sortDir === SortDirection.ASC });

    dataQuery = dataQuery.range(offset, offset + pageSize - 1);

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error) {
      this.logger.error(`Failed to count quotes: ${countResult.error.message}`);
      throw new BadRequestException(`Failed to count quotes: ${countResult.error.message}`);
    }

    if (dataResult.error) {
      this.logger.error(`Failed to fetch quotes: ${dataResult.error.message}`);
      throw new BadRequestException(`Failed to fetch quotes: ${dataResult.error.message}`);
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

      // Fetch tax rates for items that have tax_id but no tax_rate
      const taxIds = items
        .filter(item => item.tax_id && !item.tax_rate)
        .map(item => item.tax_id);

      const taxRates: Record<string, number> = {};
      if (taxIds.length > 0) {
        const { data: taxes } = await supabaseClient
          .from('taxes')
          .select('id, rate')
          .in('id', taxIds);

        if (taxes) {
          taxes.forEach(tax => {
            taxRates[tax.id] = tax.rate;
          });
        }
      }

      // Calculate totals
      let subtotal = 0;
      let taxTotal = 0;

      const processedItems = items.map((item, index) => {
        const amount = item.quantity * item.unit_price;
        const discountAmount = item.discount_percent ? (amount * item.discount_percent) / 100 : 0;
        const amountAfterDiscount = amount - discountAmount;

        // Use provided tax_rate, or look up from tax_id
        const effectiveTaxRate = item.tax_rate || (item.tax_id ? taxRates[item.tax_id] : 0) || 0;
        const taxAmount = effectiveTaxRate ? (amountAfterDiscount * effectiveTaxRate) / 100 : 0;
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
          tax_rate: effectiveTaxRate,
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
        item_id: item.item_id,
        variant_id: item.variant_id,
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

        // Fetch tax rates for items that have tax_id but no tax_rate
        const taxIds = items
          .filter(item => item.tax_id && !item.tax_rate)
          .map(item => item.tax_id);

        const taxRates: Record<string, number> = {};
        if (taxIds.length > 0) {
          const { data: taxes } = await supabaseClient
            .from('taxes')
            .select('id, rate')
            .in('id', taxIds);

          if (taxes) {
            taxes.forEach(tax => {
              taxRates[tax.id] = tax.rate;
            });
          }
        }

        // Calculate totals for new items
        let subtotal = 0;
        let taxTotal = 0;

        const processedItems = items.map((item, index) => {
          const amount = item.quantity * item.unit_price;
          const discountAmount = item.discount_percent ? (amount * item.discount_percent) / 100 : 0;
          const amountAfterDiscount = amount - discountAmount;

          // Use provided tax_rate, or look up from tax_id
          const effectiveTaxRate = item.tax_rate || (item.tax_id ? taxRates[item.tax_id] : 0) || 0;
          const taxAmount = effectiveTaxRate ? (amountAfterDiscount * effectiveTaxRate) / 100 : 0;
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
            tax_rate: effectiveTaxRate,
            tax_amount: taxAmount,
            line_total: lineTotal,
            account_id: item.account_id || null,
            item_id: item.item_id || null,
            variant_id: item.variant_id || null,
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
