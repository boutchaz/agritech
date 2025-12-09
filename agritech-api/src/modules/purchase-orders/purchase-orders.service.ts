import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  PurchaseOrderFiltersDto,
  UpdateStatusDto,
  ConvertToBillDto,
  PurchaseOrderStatus,
} from './dto';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
  ) {}

  /**
   * Create a new purchase order with items
   */
  async create(
    createPurchaseOrderDto: CreatePurchaseOrderDto,
    organizationId: string,
    userId: string,
  ) {
    const supabaseClient = this.databaseService.getClient();

    try {
      // Generate order number if not provided
      let orderNumber = createPurchaseOrderDto.order_number;
      if (!orderNumber) {
        orderNumber = await this.sequencesService.generatePurchaseOrderNumber(
          organizationId,
        );
      }

      // Extract items from DTO
      const { items, ...orderData } = createPurchaseOrderDto;

      // Calculate totals
      const { subtotal, taxAmount, totalAmount } = this.calculateTotals(items);

      // Create the purchase order
      const { data: purchaseOrder, error: orderError } = await supabaseClient
        .from('purchase_orders')
        .insert({
          ...orderData,
          order_number: orderNumber,
          organization_id: organizationId,
          created_by: userId,
          status: orderData.status || PurchaseOrderStatus.DRAFT,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          stock_received: orderData.stock_received || false,
        })
        .select()
        .single();

      if (orderError) {
        this.logger.error('Error creating purchase order:', orderError);
        throw new BadRequestException(`Failed to create purchase order: ${orderError.message}`);
      }

      // Create purchase order items
      const orderItems = items.map((item, index) => ({
        purchase_order_id: purchaseOrder.id,
        line_number: item.line_number || index + 1,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit_of_measure: item.unit_of_measure || 'unit',
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
        tax_rate: item.tax_rate || 0,
        item_id: item.item_id,
        account_id: item.account_id,
        // Calculate line totals
        amount: this.calculateLineAmount(item),
      }));

      const { error: itemsError } = await supabaseClient
        .from('purchase_order_items')
        .insert(orderItems);

      if (itemsError) {
        this.logger.error('Error creating purchase order items:', itemsError);
        // Rollback: delete the created order
        await supabaseClient.from('purchase_orders').delete().eq('id', purchaseOrder.id);
        throw new BadRequestException(`Failed to create order items: ${itemsError.message}`);
      }

      // Fetch complete order with items
      return this.findOne(purchaseOrder.id, organizationId);
    } catch (error) {
      this.logger.error('Error in create purchase order:', error);
      throw error;
    }
  }

  /**
   * Find all purchase orders with filters
   */
  async findAll(filters: PurchaseOrderFiltersDto, organizationId: string) {
    const supabaseClient = this.databaseService.getClient();

    try {
      let query = supabaseClient
        .from('purchase_orders')
        .select(
          `
          *,
          purchase_order_items (*)
        `,
        )
        .eq('organization_id', organizationId)
        .order('order_date', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      if (filters.supplier_name) {
        query = query.ilike('supplier_name', `%${filters.supplier_name}%`);
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

      if (filters.stock_received !== undefined) {
        const stockReceived = filters.stock_received === 'true';
        query = query.eq('stock_received', stockReceived);
      }

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        this.logger.error('Error fetching purchase orders:', error);
        throw new BadRequestException(`Failed to fetch purchase orders: ${error.message}`);
      }

      return {
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error in findAll purchase orders:', error);
      throw error;
    }
  }

  /**
   * Find one purchase order by ID
   */
  async findOne(id: string, organizationId: string) {
    const supabaseClient = this.databaseService.getClient();

    try {
      const { data, error } = await supabaseClient
        .from('purchase_orders')
        .select(
          `
          *,
          purchase_order_items (*)
        `,
        )
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) {
        throw new NotFoundException(`Purchase order with ID ${id} not found`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error in findOne purchase order:', error);
      throw error;
    }
  }

  /**
   * Update a purchase order
   */
  async update(
    id: string,
    updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    organizationId: string,
  ) {
    const supabaseClient = this.databaseService.getClient();

    try {
      // Check if order exists
      await this.findOne(id, organizationId);

      const { data, error } = await supabaseClient
        .from('purchase_orders')
        .update({
          ...updatePurchaseOrderDto,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating purchase order:', error);
        throw new BadRequestException(`Failed to update purchase order: ${error.message}`);
      }

      return this.findOne(id, organizationId);
    } catch (error) {
      this.logger.error('Error in update purchase order:', error);
      throw error;
    }
  }

  /**
   * Update purchase order status
   */
  async updateStatus(
    id: string,
    updateStatusDto: UpdateStatusDto,
    organizationId: string,
  ) {
    const supabaseClient = this.databaseService.getClient();

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
      if (updateStatusDto.status === PurchaseOrderStatus.RECEIVED && !order.stock_received) {
        throw new BadRequestException('Cannot mark as received: stock not received yet');
      }

      if (updateStatusDto.notes) {
        updateData.notes = order.notes
          ? `${order.notes}\n\n[${updateStatusDto.status}] ${updateStatusDto.notes}`
          : `[${updateStatusDto.status}] ${updateStatusDto.notes}`;
      }

      const { error } = await supabaseClient
        .from('purchase_orders')
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
   * Delete a purchase order (only if status is draft)
   */
  async remove(id: string, organizationId: string) {
    const supabaseClient = this.databaseService.getClient();

    try {
      const order = await this.findOne(id, organizationId);

      if (order.status !== PurchaseOrderStatus.DRAFT) {
        throw new BadRequestException(
          'Only draft purchase orders can be deleted. Cancel the order instead.',
        );
      }

      const { error } = await supabaseClient
        .from('purchase_orders')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error deleting purchase order:', error);
        throw new BadRequestException(`Failed to delete purchase order: ${error.message}`);
      }

      return { message: 'Purchase order deleted successfully' };
    } catch (error) {
      this.logger.error('Error in remove purchase order:', error);
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
    const discount = item.discount_percent
      ? (baseAmount * item.discount_percent) / 100
      : 0;
    return baseAmount - discount;
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: string, newStatus: PurchaseOrderStatus): void {
    const validTransitions: Record<string, PurchaseOrderStatus[]> = {
      [PurchaseOrderStatus.DRAFT]: [
        PurchaseOrderStatus.SENT,
        PurchaseOrderStatus.CANCELLED,
      ],
      [PurchaseOrderStatus.SENT]: [
        PurchaseOrderStatus.CONFIRMED,
        PurchaseOrderStatus.CANCELLED,
      ],
      [PurchaseOrderStatus.CONFIRMED]: [
        PurchaseOrderStatus.RECEIVING,
        PurchaseOrderStatus.CANCELLED,
      ],
      [PurchaseOrderStatus.RECEIVING]: [
        PurchaseOrderStatus.RECEIVED,
      ],
      [PurchaseOrderStatus.RECEIVED]: [
        PurchaseOrderStatus.COMPLETED,
      ],
      [PurchaseOrderStatus.CANCELLED]: [],
      [PurchaseOrderStatus.COMPLETED]: [],
    };

    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Convert purchase order to bill (purchase invoice)
   */
  async convertToBill(
    purchaseOrderId: string,
    convertDto: { invoice_date?: string; due_date?: string },
    organizationId: string,
    userId: string,
  ) {
    const supabaseClient = this.databaseService.getClient();

    try {
      // Fetch purchase order with items
      const { data: purchaseOrder, error: fetchError } = await supabaseClient
        .from('purchase_orders')
        .select('*, items:purchase_order_items(*)')
        .eq('id', purchaseOrderId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError || !purchaseOrder) {
        throw new NotFoundException('Purchase order not found');
      }

      // Check if order can be billed
      if (purchaseOrder.status === 'cancelled') {
        throw new BadRequestException('Cannot convert cancelled order to bill');
      }

      // Calculate dates
      const invoiceDate = convertDto.invoice_date || new Date().toISOString().split('T')[0];
      const dueDate = convertDto.due_date || this.calculateDueDate(invoiceDate, 30);

      // Calculate remaining unbilled items
      const unbilledItems = purchaseOrder.items.filter(
        (item: any) => item.quantity > (item.billed_quantity || 0)
      );

      if (unbilledItems.length === 0) {
        throw new BadRequestException('All items in this order have already been billed');
      }

      // Prepare bill items with remaining quantities
      const billItems = unbilledItems.map((item: any) => {
        const remainingQty = item.quantity - (item.billed_quantity || 0);
        const amount = remainingQty * item.unit_price;
        const taxAmount = (amount * (item.tax_rate || 0)) / 100;

        return {
          item_name: item.item_name,
          description: item.description || null,
          quantity: remainingQty,
          unit_price: item.unit_price,
          amount: amount,
          tax_id: item.tax_id || null,
          tax_rate: item.tax_rate || 0,
          tax_amount: taxAmount,
          line_total: amount + taxAmount,
          income_account_id: null,
          expense_account_id: item.account_id,
        };
      });

      // Calculate bill totals
      const subtotal = billItems.reduce((sum, item) => sum + item.amount, 0);
      const taxTotal = billItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const grandTotal = subtotal + taxTotal;

      // Generate invoice number
      const invoiceNumber = await this.sequencesService.generateInvoiceNumber(
        organizationId,
        'purchase',
      );

      // Create bill (purchase invoice)
      const { data: bill, error: billError } = await supabaseClient
        .from('invoices')
        .insert({
          organization_id: organizationId,
          invoice_number: invoiceNumber,
          invoice_type: 'purchase',
          party_type: 'Supplier',
          party_id: purchaseOrder.supplier_id,
          party_name: purchaseOrder.supplier_name,
          invoice_date: invoiceDate,
          due_date: dueDate,
          subtotal: subtotal,
          tax_total: taxTotal,
          grand_total: grandTotal,
          outstanding_amount: grandTotal,
          currency_code: purchaseOrder.currency_code || 'MAD',
          exchange_rate: purchaseOrder.exchange_rate || 1.0,
          status: 'draft',
          purchase_order_id: purchaseOrderId,
          created_by: userId,
        })
        .select()
        .single();

      if (billError) {
        throw new BadRequestException(`Failed to create bill: ${billError.message}`);
      }

      // Create bill items
      const itemsToInsert = billItems.map((item) => ({
        invoice_id: bill.id,
        ...item,
      }));

      const { error: itemsError } = await supabaseClient
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        // Rollback: delete the created bill
        await supabaseClient.from('invoices').delete().eq('id', bill.id);
        throw new BadRequestException(`Failed to create bill items: ${itemsError.message}`);
      }

      // Update purchase order billed amounts
      const newBilledAmount = (purchaseOrder.billed_amount || 0) + grandTotal;
      const newStatus =
        newBilledAmount >= purchaseOrder.total_amount ? 'billed' : 'partially_billed';

      await supabaseClient
        .from('purchase_orders')
        .update({
          billed_amount: newBilledAmount,
          outstanding_amount: purchaseOrder.total_amount - newBilledAmount,
          status: newStatus,
        })
        .eq('id', purchaseOrderId);

      // Update order items billed quantities
      for (const item of unbilledItems) {
        await supabaseClient
          .from('purchase_order_items')
          .update({
            billed_quantity: item.quantity, // Mark as fully billed
          })
          .eq('id', item.id);
      }

      return bill;
    } catch (error) {
      this.logger.error('Error converting purchase order to bill:', error);
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
