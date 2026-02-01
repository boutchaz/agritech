import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { StockEntriesService } from '../stock-entries/stock-entries.service';
import {
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  SalesOrderFiltersDto,
  UpdateStatusDto,
  ConvertToInvoiceDto,
  SalesOrderStatus,
} from './dto';
import {
  StockEntryType,
  StockEntryStatus,
} from '../stock-entries/dto/create-stock-entry.dto';
import { PaginatedResponse, SortDirection } from '../../common/dto/paginated-query.dto';

@Injectable()
export class SalesOrdersService {
  private readonly logger = new Logger(SalesOrdersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
    private readonly stockEntriesService: StockEntriesService,
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
        variant_id: item.variant_id,
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

  async findAll(filters: SalesOrderFiltersDto, organizationId: string): Promise<PaginatedResponse<any>> {
    if (!organizationId || organizationId === 'undefined' || organizationId === 'null') {
      throw new BadRequestException('Valid organization ID is required');
    }

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
        customer_id,
        stock_issued,
      } = filters || {};

      const offset = (page - 1) * pageSize;

      let countQuery = supabaseClient
        .from('sales_orders')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      let dataQuery = supabaseClient
        .from('sales_orders')
        .select(`*, sales_order_items (*)`)
        .eq('organization_id', organizationId);

      if (search) {
        const searchFilter = `order_number.ilike.%${search}%,customer_name.ilike.%${search}%`;
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

      if (stock_issued !== undefined) {
        const stockIssuedBool = stock_issued === 'true';
        countQuery = countQuery.eq('stock_issued', stockIssuedBool);
        dataQuery = dataQuery.eq('stock_issued', stockIssuedBool);
      }

      if (dateFrom) {
        countQuery = countQuery.gte('order_date', dateFrom);
        dataQuery = dataQuery.gte('order_date', dateFrom);
      }

      if (dateTo) {
        countQuery = countQuery.lte('order_date', dateTo);
        dataQuery = dataQuery.lte('order_date', dateTo);
      }

      const validSortFields = ['order_number', 'order_date', 'customer_name', 'total_amount', 'status'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'order_date';
      dataQuery = dataQuery.order(sortField, { ascending: sortDir === SortDirection.ASC });

      dataQuery = dataQuery.range(offset, offset + pageSize - 1);

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

      if (countResult.error) {
        this.logger.error('Error counting sales orders:', countResult.error);
        throw new BadRequestException(`Failed to count sales orders: ${countResult.error.message}`);
      }

      if (dataResult.error) {
        this.logger.error('Error fetching sales orders:', dataResult.error);
        throw new BadRequestException(`Failed to fetch sales orders: ${dataResult.error.message}`);
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
      // Note: Using column names that match the database schema
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
          item_id: item.item_id || null,
          variant_id: item.variant_id || null,
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

  /**
   * Issue stock for a sales order
   * Creates a Material Issue stock entry to deduct inventory for the order items
   * Also creates COGS journal entry (Dr. COGS, Cr. Inventory)
   */
  async issueStock(
    salesOrderId: string,
    organizationId: string,
    userId: string,
    warehouseId: string,
  ): Promise<any> {
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

      // Validate order status
      if (salesOrder.status === SalesOrderStatus.CANCELLED) {
        throw new BadRequestException('Cannot issue stock for a cancelled order');
      }

      if (salesOrder.status === SalesOrderStatus.DRAFT) {
        throw new BadRequestException('Cannot issue stock for a draft order. Please confirm the order first.');
      }

      if (salesOrder.stock_issued) {
        throw new BadRequestException('Stock has already been issued for this order');
      }

      // Validate warehouse exists
      const { data: warehouse, error: warehouseError } = await supabaseClient
        .from('warehouses')
        .select('id, name, is_active')
        .eq('id', warehouseId)
        .eq('organization_id', organizationId)
        .single();

      if (warehouseError || !warehouse) {
        throw new BadRequestException('Warehouse not found');
      }

      if (!warehouse.is_active) {
        throw new BadRequestException('Cannot issue stock from an inactive warehouse');
      }

      // Filter items that have item_id (only track stock for inventory items)
      const stockableItems = salesOrder.items.filter((item: any) => item.item_id);

      if (stockableItems.length === 0) {
        // No stockable items, just mark as issued
        await supabaseClient
          .from('sales_orders')
          .update({
            stock_issued: true,
            stock_issued_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', salesOrderId);

        this.logger.log(`No stockable items in order ${salesOrder.order_number}, marked as issued`);

        return {
          success: true,
          message: 'No stockable items in order, marked as stock issued',
          stock_entry_id: null,
        };
      }

      // Prepare stock entry items
      const stockEntryItems = stockableItems.map((item: any) => ({
        item_id: item.item_id,
        variant_id: item.variant_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit_of_measure || 'unit',
        source_warehouse_id: warehouseId,
      }));

      // Create Material Issue stock entry
      const stockEntry = await this.stockEntriesService.createStockEntry({
        organization_id: organizationId,
        entry_type: StockEntryType.MATERIAL_ISSUE,
        entry_date: new Date(),
        from_warehouse_id: warehouseId,
        reference_type: 'Sales Order',
        reference_id: salesOrderId,
        reference_number: salesOrder.order_number,
        purpose: `Stock issue for Sales Order ${salesOrder.order_number}`,
        notes: `Customer: ${salesOrder.customer_name}`,
        status: StockEntryStatus.POSTED, // Post immediately
        items: stockEntryItems,
        created_by: userId,
      });

      // Update sales order to mark stock as issued
      const { error: updateError } = await supabaseClient
        .from('sales_orders')
        .update({
          stock_issued: true,
          stock_issued_date: new Date().toISOString().split('T')[0],
          stock_entry_id: stockEntry.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', salesOrderId);

      if (updateError) {
        this.logger.error('Error updating sales order after stock issue:', updateError);
        throw new BadRequestException(`Failed to update sales order: ${updateError.message}`);
      }

      // Create COGS journal entry
      await this.createCOGSJournalEntry(
        salesOrder,
        stockEntry,
        organizationId,
        userId,
      );

      this.logger.log(
        `Stock issued for order ${salesOrder.order_number}: ` +
        `${stockableItems.length} items from warehouse ${warehouse.name}`
      );

      return {
        success: true,
        message: 'Stock issued successfully',
        stock_entry_id: stockEntry.id,
        stock_entry_number: stockEntry.entry_number,
      };

    } catch (error) {
      this.logger.error('Error issuing stock for sales order:', error);
      throw error;
    }
  }

  /**
   * Create COGS (Cost of Goods Sold) journal entry when stock is issued
   * Dr. Cost of Goods Sold (6xxx - expense account)
   * Cr. Inventory (3xxx - asset account)
   */
  private async createCOGSJournalEntry(
    salesOrder: any,
    stockEntry: any,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      // Get the total cost from stock movements created by the stock entry
      const { data: movements, error: movementsError } = await supabaseClient
        .from('stock_movements')
        .select('total_cost, item_id')
        .eq('stock_entry_id', stockEntry.id)
        .eq('movement_type', 'OUT');

      if (movementsError) {
        this.logger.error('Error fetching stock movements for COGS:', movementsError);
        return; // Don't fail the whole operation
      }

      // Calculate total COGS
      const totalCOGS = movements?.reduce(
        (sum: number, m: any) => sum + Math.abs(Number(m.total_cost) || 0),
        0
      ) || 0;

      if (totalCOGS <= 0) {
        this.logger.warn('No COGS to record (zero cost movements)');
        return;
      }

      // Get default accounts for COGS and Inventory
      // COGS: 6115 (Achats d'emballages) or create a specific one
      // For agricultural business, we use variation des stocks
      const { data: cogsAccount } = await supabaseClient
        .from('accounts')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('code', '6115') // Default: Achats d'emballages - adjust based on business
        .single();

      const { data: inventoryAccount } = await supabaseClient
        .from('accounts')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('code', '3500') // Produits finis
        .single();

      if (!cogsAccount || !inventoryAccount) {
        this.logger.warn('COGS or Inventory account not found, skipping journal entry');
        return;
      }

      // Generate journal entry number
      const { data: entryNumber } = await supabaseClient
        .rpc('generate_journal_entry_number', { p_organization_id: organizationId });

      // Create journal entry
      const { data: journalEntry, error: journalError } = await supabaseClient
        .from('journal_entries')
        .insert({
          organization_id: organizationId,
          entry_number: entryNumber,
          entry_date: new Date().toISOString().split('T')[0],
          posting_date: new Date().toISOString().split('T')[0],
          reference_type: 'Sales Order',
          reference_number: salesOrder.order_number,
          remarks: `Cost of Goods Sold for ${salesOrder.order_number} - ${salesOrder.customer_name}`,
          created_by: userId,
          status: 'posted',
          posted_by: userId,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (journalError) {
        this.logger.error('Error creating COGS journal entry:', journalError);
        return;
      }

      // Create journal items (Debit COGS, Credit Inventory)
      const journalItems = [
        {
          journal_entry_id: journalEntry.id,
          line_number: 1,
          account_id: cogsAccount.id,
          description: `COGS - ${salesOrder.order_number}`,
          debit: totalCOGS,
          credit: 0,
        },
        {
          journal_entry_id: journalEntry.id,
          line_number: 2,
          account_id: inventoryAccount.id,
          description: `Inventory reduction - ${salesOrder.order_number}`,
          debit: 0,
          credit: totalCOGS,
        },
      ];

      const { error: itemsError } = await supabaseClient
        .from('journal_items')
        .insert(journalItems);

      if (itemsError) {
        this.logger.error('Error creating COGS journal items:', itemsError);
        // Rollback journal entry
        await supabaseClient.from('journal_entries').delete().eq('id', journalEntry.id);
        return;
      }

      // Link stock entry to journal entry
      await supabaseClient
        .from('stock_entries')
        .update({ journal_entry_id: journalEntry.id })
        .eq('id', stockEntry.id);

      this.logger.log(
        `COGS journal entry ${entryNumber} created for ${salesOrder.order_number}: ${totalCOGS} MAD`
      );

    } catch (error) {
      this.logger.error('Error creating COGS journal entry:', error);
      // Don't throw - COGS journal is secondary to stock issuance
    }
  }
}
