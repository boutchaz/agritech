import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { StockEntriesService } from '../stock-entries/stock-entries.service';
import { StockEntryType, StockEntryStatus } from '../stock-entries/dto/create-stock-entry.dto';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  PurchaseOrderFiltersDto,
  UpdateStatusDto,
  ConvertToBillDto,
  PurchaseOrderStatus,
} from './dto';
import { PaginatedResponse, SortDirection } from '../../common/dto/paginated-query.dto';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
    private readonly stockEntriesService: StockEntriesService,
  ) {}

  /**
   * Create a new purchase order with items
   */
  async create(
    createPurchaseOrderDto: CreatePurchaseOrderDto,
    organizationId: string,
    userId: string,
  ) {
    const supabaseClient = this.databaseService.getAdminClient();

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
        variant_id: item.variant_id,
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

  async findAll(filters: PurchaseOrderFiltersDto, organizationId: string): Promise<PaginatedResponse<any>> {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      const {
        page = 1,
        pageSize = 10,
        sortBy = 'order_date',
        sortDir = SortDirection.DESC,
        search,
        dateFrom,
        dateTo,
        status,
        supplier_id,
        stock_received,
      } = filters || {};

      const offset = (page - 1) * pageSize;

      let countQuery = supabaseClient
        .from('purchase_orders')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      let dataQuery = supabaseClient
        .from('purchase_orders')
        .select(`*, purchase_order_items (*)`)
        .eq('organization_id', organizationId);

      if (search) {
        const searchFilter = `order_number.ilike.%${search}%,supplier_name.ilike.%${search}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      if (status) {
        countQuery = countQuery.eq('status', status);
        dataQuery = dataQuery.eq('status', status);
      }

      if (supplier_id) {
        countQuery = countQuery.eq('supplier_id', supplier_id);
        dataQuery = dataQuery.eq('supplier_id', supplier_id);
      }

      if (stock_received !== undefined) {
        const stockReceivedBool = stock_received === 'true';
        countQuery = countQuery.eq('stock_received', stockReceivedBool);
        dataQuery = dataQuery.eq('stock_received', stockReceivedBool);
      }

      if (dateFrom) {
        countQuery = countQuery.gte('order_date', dateFrom);
        dataQuery = dataQuery.gte('order_date', dateFrom);
      }

      if (dateTo) {
        countQuery = countQuery.lte('order_date', dateTo);
        dataQuery = dataQuery.lte('order_date', dateTo);
      }

      const validSortFields = ['order_number', 'order_date', 'supplier_name', 'total_amount', 'status'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'order_date';
      dataQuery = dataQuery.order(sortField, { ascending: sortDir === SortDirection.ASC });

      dataQuery = dataQuery.range(offset, offset + pageSize - 1);

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

      if (countResult.error) {
        this.logger.error('Error counting purchase orders:', countResult.error);
        throw new BadRequestException(`Failed to count purchase orders: ${countResult.error.message}`);
      }

      if (dataResult.error) {
        this.logger.error('Error fetching purchase orders:', dataResult.error);
        throw new BadRequestException(`Failed to fetch purchase orders: ${dataResult.error.message}`);
      }

      const total = countResult.count || 0;

      return {
        data: dataResult.data || [],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
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
    const supabaseClient = this.databaseService.getAdminClient();

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

  async createMaterialReceipt(
    purchaseOrderId: string,
    organizationId: string,
    userId: string,
    input: { warehouse_id: string; receipt_date: string },
  ) {
    const supabaseClient = this.databaseService.getAdminClient();

    const { data: purchaseOrder, error } = await supabaseClient
      .from('purchase_orders')
      .select('id, order_number, status, purchase_order_items (*)')
      .eq('id', purchaseOrderId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !purchaseOrder) {
      throw new NotFoundException(`Purchase order with ID ${purchaseOrderId} not found`);
    }

    const items = (purchaseOrder as any).purchase_order_items || [];
    const stockItems = items
      .filter((item: any) => !!item.item_id)
      .map((item: any) => ({
        item_id: item.item_id,
        variant_id: item.variant_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit_of_measure || 'unit',
        target_warehouse_id: input.warehouse_id,
        cost_per_unit: item.unit_price,
      }));

    if (stockItems.length === 0) {
      throw new BadRequestException('Purchase order has no stockable items');
    }

    const stockEntry = await this.stockEntriesService.createStockEntry({
      organization_id: organizationId,
      entry_type: StockEntryType.MATERIAL_RECEIPT,
      entry_date: new Date(input.receipt_date),
      to_warehouse_id: input.warehouse_id,
      reference_type: 'purchase_order',
      reference_id: purchaseOrderId,
      reference_number: purchaseOrder.order_number,
      status: StockEntryStatus.DRAFT,
      created_by: userId,
      items: stockItems,
    });

    const { error: updateError } = await supabaseClient
      .from('purchase_orders')
      .update({
        stock_entry_id: stockEntry.id,
        stock_received: true,
        stock_received_date: input.receipt_date,
      })
      .eq('id', purchaseOrderId)
      .eq('organization_id', organizationId);

    if (updateError) {
      this.logger.error('Failed to update purchase order stock status', updateError);
      throw new BadRequestException(`Failed to update purchase order: ${updateError.message}`);
    }

    return { stock_entry_id: stockEntry.id };
  }

  /**
   * Update a purchase order
   */
  async update(
    id: string,
    updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    organizationId: string,
  ) {
    const supabaseClient = this.databaseService.getAdminClient();

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
    const supabaseClient = this.databaseService.getAdminClient();

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
    const supabaseClient = this.databaseService.getAdminClient();

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
          item_id: item.item_id || null,
          variant_id: item.variant_id || null,
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
