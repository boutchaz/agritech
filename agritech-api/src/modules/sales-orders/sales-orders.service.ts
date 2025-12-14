import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import {
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  SalesOrderFiltersDto,
  UpdateStatusDto,
  ConvertToInvoiceDto,
  SalesOrderStatus,
} from './dto';

@Injectable()
export class SalesOrdersService {
  private readonly logger = new Logger(SalesOrdersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
  ) { }

  /**
   * Create a new sales order with items
   */
  async create(
    createSalesOrderDto: CreateSalesOrderDto,
    organizationId: string,
    userId: string,
  ) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      // Generate order number if not provided
      let orderNumber = createSalesOrderDto.order_number;
      if (!orderNumber) {
        orderNumber = await this.sequencesService.generateSalesOrderNumber(
          organizationId,
        );
      }

      // Extract items from DTO
      const { items, ...orderData } = createSalesOrderDto;

      // Calculate totals
      const { subtotal, taxAmount, totalAmount } = this.calculateTotals(items);

      // Create the sales order
      const { data: salesOrder, error: orderError } = await supabaseClient
        .from('sales_orders')
        .insert({
          ...orderData,
          order_number: orderNumber,
          organization_id: organizationId,
          created_by: userId,
          status: orderData.status || SalesOrderStatus.DRAFT,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          stock_issued: orderData.stock_issued || false,
        })
        .select()
        .single();

      if (orderError) {
        this.logger.error('Error creating sales order:', orderError);
        throw new BadRequestException(`Failed to create sales order: ${orderError.message}`);
      }

      // Create sales order items
      const orderItems = items.map((item, index) => ({
        sales_order_id: salesOrder.id,
        line_number: item.line_number || index + 1,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit_of_measure: item.unit_of_measure || 'unit',
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage || 0,
        tax_rate: item.tax_rate || 0,
        item_id: item.item_id,
        account_id: item.account_id,
        // Calculate line totals
        amount: this.calculateLineAmount(item),
      }));

      const { error: itemsError } = await supabaseClient
        .from('sales_order_items')
        .insert(orderItems);

      if (itemsError) {
        this.logger.error('Error creating sales order items:', itemsError);
        // Rollback: delete the created order
        await supabaseClient.from('sales_orders').delete().eq('id', salesOrder.id);
        throw new BadRequestException(`Failed to create order items: ${itemsError.message}`);
      }

      // Fetch complete order with items
      return this.findOne(salesOrder.id, organizationId);
    } catch (error) {
      this.logger.error('Error in create sales order:', error);
      throw error;
    }
  }

  /**
   * Find all sales orders with filters
   */
  async findAll(filters: SalesOrderFiltersDto, organizationId: string) {
    // Validate organizationId
    if (!organizationId || organizationId === 'undefined' || organizationId === 'null') {
      throw new BadRequestException('Valid organization ID is required');
    }

    this.logger.debug(`Fetching sales orders for organization: ${organizationId}`);

    const supabaseClient = this.databaseService.getAdminClient();

    try {
      let query = supabaseClient
        .from('sales_orders')
        .select(
          `
          *,
          sales_order_items (*)
        `,
        )
        .eq('organization_id', organizationId)
        .order('order_date', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }

      if (filters.customer_name) {
        query = query.ilike('customer_name', `%${filters.customer_name}%`);
      }

      if (filters.order_number) {
        query = query.ilike('order_number', `%${filters.order_number}%`);
      }

      if (filters.date_from) {
        query = query.gte('order_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('order_date', filters.date_to);
      }

      if (filters.stock_issued !== undefined) {
        const stockIssued = filters.stock_issued === 'true';
        query = query.eq('stock_issued', stockIssued);
      }

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get count separately (Supabase doesn't return count with range queries automatically)
      const countQuery = supabaseClient
        .from('sales_orders')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Apply same filters to count query
      if (filters.status) {
        countQuery.eq('status', filters.status);
      }
      if (filters.customer_id) {
        countQuery.eq('customer_id', filters.customer_id);
      }
      if (filters.customer_name) {
        countQuery.ilike('customer_name', `%${filters.customer_name}%`);
      }
      if (filters.order_number) {
        countQuery.ilike('order_number', `%${filters.order_number}%`);
      }
      if (filters.date_from) {
        countQuery.gte('order_date', filters.date_from);
      }
      if (filters.date_to) {
        countQuery.lte('order_date', filters.date_to);
      }
      if (filters.stock_issued !== undefined) {
        const stockIssued = filters.stock_issued === 'true';
        countQuery.eq('stock_issued', stockIssued);
      }

      query = query.range(from, to);

      // Execute both queries in parallel
      const [dataResult, countResult] = await Promise.all([
        query,
        countQuery,
      ]);

      const { data, error } = dataResult;
      const { count, error: countError } = countResult;

      if (error) {
        this.logger.error('Error fetching sales orders:', error);
        throw new BadRequestException(`Failed to fetch sales orders: ${error.message}`);
      }

      if (countError) {
        this.logger.warn('Error fetching sales orders count:', countError);
      }

      this.logger.debug(`Found ${data?.length || 0} sales orders, total count: ${count || 0}`);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error in findAll sales orders:', error);
      throw error;
    }
  }

  /**
   * Find one sales order by ID
   */
  async findOne(id: string, organizationId: string) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      const { data, error } = await supabaseClient
        .from('sales_orders')
        .select(
          `
          *,
          sales_order_items (*)
        `,
        )
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) {
        throw new NotFoundException(`Sales order with ID ${id} not found`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error in findOne sales order:', error);
      throw error;
    }
  }

  /**
   * Update a sales order
   */
  async update(
    id: string,
    updateSalesOrderDto: UpdateSalesOrderDto,
    organizationId: string,
  ) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      // Check if order exists
      await this.findOne(id, organizationId);

      const { data, error } = await supabaseClient
        .from('sales_orders')
        .update({
          ...updateSalesOrderDto,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating sales order:', error);
        throw new BadRequestException(`Failed to update sales order: ${error.message}`);
      }

      return this.findOne(id, organizationId);
    } catch (error) {
      this.logger.error('Error in update sales order:', error);
      throw error;
    }
  }

  /**
   * Update sales order status
   */
  async updateStatus(
    id: string,
    updateStatusDto: UpdateStatusDto,
    organizationId: string,
  ) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      // Check if order exists
      const order = await this.findOne(id, organizationId);

      // Validate status transition
      this.validateStatusTransition(order.status, updateStatusDto.status);

      const updateData: any = {
        status: updateStatusDto.status,
        updated_at: new Date().toISOString(),
      };

      // Add status-specific updates
      if (updateStatusDto.status === SalesOrderStatus.SHIPPED && !order.stock_issued) {
        throw new BadRequestException('Cannot ship order: stock not issued');
      }

      if (updateStatusDto.notes) {
        updateData.notes = order.notes
          ? `${order.notes}\n\n[${updateStatusDto.status}] ${updateStatusDto.notes}`
          : `[${updateStatusDto.status}] ${updateStatusDto.notes}`;
      }

      const { error } = await supabaseClient
        .from('sales_orders')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error updating order status:', error);
        throw new BadRequestException(`Failed to update status: ${error.message}`);
      }

      return this.findOne(id, organizationId);
    } catch (error) {
      this.logger.error('Error in updateStatus:', error);
      throw error;
    }
  }

  /**
   * Delete a sales order (only if status is draft)
   */
  async remove(id: string, organizationId: string) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      const order = await this.findOne(id, organizationId);

      if (order.status !== SalesOrderStatus.DRAFT) {
        throw new BadRequestException(
          'Only draft sales orders can be deleted. Cancel the order instead.',
        );
      }

      const { error } = await supabaseClient
        .from('sales_orders')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error deleting sales order:', error);
        throw new BadRequestException(`Failed to delete sales order: ${error.message}`);
      }

      return { message: 'Sales order deleted successfully' };
    } catch (error) {
      this.logger.error('Error in remove sales order:', error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Calculate order totals from items
   */
  private calculateTotals(items: any[]): {
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
  } {
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      const lineAmount = this.calculateLineAmount(item);
      subtotal += lineAmount;

      if (item.tax_rate) {
        taxAmount += (lineAmount * item.tax_rate) / 100;
      }
    });

    const totalAmount = subtotal + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  /**
   * Calculate line item amount
   */
  private calculateLineAmount(item: any): number {
    const baseAmount = item.quantity * item.unit_price;
    const discount = item.discount_percentage
      ? (baseAmount * item.discount_percentage) / 100
      : 0;
    return baseAmount - discount;
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: string, newStatus: SalesOrderStatus): void {
    const validTransitions: Record<string, SalesOrderStatus[]> = {
      [SalesOrderStatus.DRAFT]: [
        SalesOrderStatus.CONFIRMED,
        SalesOrderStatus.CANCELLED,
      ],
      [SalesOrderStatus.CONFIRMED]: [
        SalesOrderStatus.PROCESSING,
        SalesOrderStatus.CANCELLED,
      ],
      [SalesOrderStatus.PROCESSING]: [
        SalesOrderStatus.SHIPPED,
        SalesOrderStatus.CANCELLED,
      ],
      [SalesOrderStatus.SHIPPED]: [
        SalesOrderStatus.DELIVERED,
      ],
      [SalesOrderStatus.DELIVERED]: [
        SalesOrderStatus.COMPLETED,
      ],
      [SalesOrderStatus.CANCELLED]: [],
      [SalesOrderStatus.COMPLETED]: [],
    };

    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Convert sales order to invoice
   */
  async convertToInvoice(
    salesOrderId: string,
    convertDto: { invoice_date?: string; due_date?: string },
    organizationId: string,
    userId: string,
  ) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      // Fetch sales order with items
      const { data: salesOrder, error: fetchError } = await supabaseClient
        .from('sales_orders')
        .select('*, items:sales_order_items(*)')
        .eq('id', salesOrderId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError || !salesOrder) {
        throw new NotFoundException('Sales order not found');
      }

      // Check if order can be invoiced
      if (salesOrder.status === 'cancelled') {
        throw new BadRequestException('Cannot convert cancelled order to invoice');
      }

      // Calculate dates
      const invoiceDate = convertDto.invoice_date || new Date().toISOString().split('T')[0];
      const dueDate = convertDto.due_date || this.calculateDueDate(invoiceDate, 30);

      // Calculate remaining uninvoiced items
      const uninvoicedItems = salesOrder.items.filter(
        (item: any) => item.quantity > (item.invoiced_quantity || 0)
      );

      if (uninvoicedItems.length === 0) {
        throw new BadRequestException('All items in this order have already been invoiced');
      }

      // Prepare invoice items with remaining quantities
      const invoiceItems = uninvoicedItems.map((item: any) => {
        const remainingQty = item.quantity - (item.invoiced_quantity || 0);
        const amount = remainingQty * item.unit_price;
        const taxAmount = (amount * (item.tax_rate || 0)) / 100;

        return {
          item_name: item.item_name,
          description: item.description || null,
          quantity: remainingQty,
          unit_of_measure: item.unit_of_measure || 'unit',
          unit_price: item.unit_price,
          amount: amount,
          tax_id: item.tax_id || null,
          tax_rate: item.tax_rate || 0,
          tax_amount: taxAmount,
          line_total: amount + taxAmount,
          income_account_id: item.account_id,
          expense_account_id: null,
        };
      });

      // Calculate invoice totals
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
      const taxTotal = invoiceItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const grandTotal = subtotal + taxTotal;

      // Generate invoice number
      const invoiceNumber = await this.sequencesService.generateInvoiceNumber(
        organizationId,
        'sales',
      );

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabaseClient
        .from('invoices')
        .insert({
          organization_id: organizationId,
          invoice_number: invoiceNumber,
          invoice_type: 'sales',
          party_type: 'Customer',
          party_id: salesOrder.customer_id,
          party_name: salesOrder.customer_name,
          invoice_date: invoiceDate,
          due_date: dueDate,
          subtotal: subtotal,
          tax_total: taxTotal,
          grand_total: grandTotal,
          outstanding_amount: grandTotal,
          currency_code: salesOrder.currency_code || 'MAD',
          exchange_rate: salesOrder.exchange_rate || 1.0,
          status: 'draft',
          sales_order_id: salesOrderId,
          created_by: userId,
        })
        .select()
        .single();

      if (invoiceError) {
        throw new BadRequestException(`Failed to create invoice: ${invoiceError.message}`);
      }

      // Create invoice items
      const itemsToInsert = invoiceItems.map((item, index) => ({
        invoice_id: invoice.id,
        line_number: index + 1,
        ...item,
      }));

      const { error: itemsError } = await supabaseClient
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        // Rollback: delete the created invoice
        await supabaseClient.from('invoices').delete().eq('id', invoice.id);
        throw new BadRequestException(`Failed to create invoice items: ${itemsError.message}`);
      }

      // Update order items invoiced quantities
      for (const item of uninvoicedItems) {
        await supabaseClient
          .from('sales_order_items')
          .update({
            invoiced_quantity: item.quantity, // Mark as fully invoiced
          })
          .eq('id', item.id);
      }

      // Note: Sales order status and amounts are now automatically updated by database triggers
      // The trigger 'update_sales_order_after_invoice' handles:
      // - invoiced_amount calculation
      // - outstanding_amount calculation  
      // - status transition (partially_invoiced / invoiced)

      return invoice;

    } catch (error) {
      this.logger.error('Error converting sales order to invoice:', error);
      throw error;
    }
  }

  /**
   * Calculate due date by adding days to invoice date
   */
  private calculateDueDate(invoiceDate: string, daysToAdd: number): string {
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  }
}
