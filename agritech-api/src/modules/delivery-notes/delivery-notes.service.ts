import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PoolClient } from 'pg';
import {
  paginate,
  PaginatedResponse,
  SortDirection,
} from '../../common/dto/paginated-query.dto';
import { sanitizeSearch } from '../../common/utils/sanitize-search';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { StockEntriesService } from '../stock-entries/stock-entries.service';
import { StockReservationsService } from '../stock-entries/stock-reservations.service';
import {
  StockEntryStatus,
  StockEntryType,
} from '../stock-entries/dto/create-stock-entry.dto';
import {
  CreateDeliveryNoteDto,
  CreateDeliveryNoteItemDto,
  DeliveryNoteFiltersDto,
  DeliveryNoteStatus,
  UpdateDeliveryNoteDto,
} from './dto';

type SalesOrderItemRecord = {
  id: string;
  line_number: number;
  item_id: string;
  item_name: string;
  quantity: number | string;
  delivered_quantity?: number | string | null;
  unit_of_measure?: string | null;
  unit_price?: number | string | null;
};

type SalesOrderRecord = {
  id: string;
  order_number: string;
  status: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_address?: string | null;
  items?: SalesOrderItemRecord[];
};

type PreparedDeliveryNoteItem = {
  organization_id: string;
  sales_order_item_id: string;
  line_number: number;
  item_id: string;
  item_name: string;
  quantity: number;
  batch_number?: string;
  warehouse_id?: string;
  notes?: string;
  unit_of_measure: string;
  unit_price: number;
};

type DeliveryNoteRecord = {
  id: string;
  delivery_note_number: string;
  delivery_date: string;
  sales_order_id: string;
  warehouse_id?: string | null;
  status: DeliveryNoteStatus;
  stock_entry_id?: string | null;
  notes?: string | null;
  items?: Array<{
    id: string;
    sales_order_item_id?: string | null;
    item_id: string;
    item_name?: string | null;
    quantity: number | string;
    batch_number?: string | null;
    warehouse_id?: string | null;
    notes?: string | null;
    sales_order_item?: {
      id: string;
      unit_of_measure?: string | null;
      unit_price?: number | string | null;
    } | null;
  }>;
};

@Injectable()
export class DeliveryNotesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
    @Inject(forwardRef(() => StockEntriesService))
    private readonly stockEntriesService: StockEntriesService,
    @Inject(forwardRef(() => StockReservationsService))
    private readonly stockReservationsService: StockReservationsService,
  ) {}

  async create(
    dto: CreateDeliveryNoteDto,
    organizationId: string,
    userId: string,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();
    const salesOrder = await this.getSalesOrder(dto.sales_order_id, organizationId);
    const items = this.prepareDeliveryNoteItems(dto.items, salesOrder.items || [], organizationId, dto.warehouse_id);
    const totals = this.calculateTotals(items);
    const deliveryNoteNumber = dto.delivery_note_number
      || await this.sequencesService.generateDeliveryNoteNumber(organizationId);
    const deliveryDate = dto.delivery_date || new Date().toISOString().split('T')[0];

    const { data: deliveryNote, error: deliveryNoteError } = await supabase
      .from('delivery_notes')
      .insert({
        organization_id: organizationId,
        delivery_note_number: deliveryNoteNumber,
        delivery_date: deliveryDate,
        sales_order_id: salesOrder.id,
        customer_id: dto.customer_id || salesOrder.customer_id || null,
        customer_name: dto.customer_name || salesOrder.customer_name || null,
        customer_address: dto.customer_address || salesOrder.customer_address || null,
        warehouse_id: dto.warehouse_id || null,
        status: DeliveryNoteStatus.DRAFT,
        subtotal: totals.subtotal,
        total_qty: totals.totalQty,
        notes: dto.notes || null,
        created_by: userId,
        updated_by: userId,
      })
      .select('id')
      .single();

    if (deliveryNoteError || !deliveryNote) {
      throw new BadRequestException(
        `Failed to create delivery note: ${deliveryNoteError?.message || 'unknown error'}`,
      );
    }

    const { error: itemsError } = await supabase.from('delivery_note_items').insert(
      items.map((item) => ({
        organization_id: item.organization_id,
        delivery_note_id: deliveryNote.id,
        sales_order_item_id: item.sales_order_item_id,
        line_number: item.line_number,
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        batch_number: item.batch_number || null,
        warehouse_id: item.warehouse_id || null,
        notes: item.notes || null,
      })),
    );

    if (itemsError) {
      await supabase.from('delivery_notes').delete().eq('id', deliveryNote.id).eq('organization_id', organizationId);
      throw new BadRequestException(`Failed to create delivery note items: ${itemsError.message}`);
    }

    return this.findOne(deliveryNote.id, organizationId);
  }

  async findAll(
    organizationId: string,
    filters: DeliveryNoteFiltersDto,
  ): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();
    const {
      page = 1,
      pageSize = 10,
      search,
      status,
      sortBy = 'delivery_date',
      sortDir = SortDirection.DESC,
      dateFrom,
      dateTo,
    } = filters || {};

    return paginate(client, 'delivery_notes', {
      select: '*, sales_order:sales_orders(id, order_number)',
      filters: (query) => {
        let next = query.eq('organization_id', organizationId);
        if (status) next = next.eq('status', status);
        if (dateFrom) next = next.gte('delivery_date', dateFrom);
        if (dateTo) next = next.lte('delivery_date', dateTo);
        if (search) {
          const safeSearch = sanitizeSearch(search);
          if (safeSearch) {
            next = next.or(
              `delivery_note_number.ilike.%${safeSearch}%,customer_name.ilike.%${safeSearch}%`,
            );
          }
        }
        return next;
      },
      page,
      pageSize,
      orderBy: ['delivery_note_number', 'customer_name', 'status'].includes(sortBy)
        ? sortBy
        : 'delivery_date',
      ascending: sortDir === SortDirection.ASC,
    });
  }

  async findOne(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('delivery_notes')
      .select(`
        *,
        sales_order:sales_orders(id, order_number, status),
        items:delivery_note_items(
          *,
          sales_order_item:sales_order_items(id, unit_of_measure, unit_price)
        )
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch delivery note: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Delivery note not found');
    }

    return data;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateDeliveryNoteDto,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();
    const existing = await this.findOne(id, organizationId) as DeliveryNoteRecord;

    if (existing.status !== DeliveryNoteStatus.DRAFT) {
      throw new BadRequestException('Only draft delivery notes can be updated');
    }

    if (dto.sales_order_id && dto.sales_order_id !== existing.sales_order_id && !dto.items?.length) {
      throw new BadRequestException('Items are required when changing the sales order');
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    let salesOrder: SalesOrderRecord | null = null;
    if (dto.sales_order_id) {
      salesOrder = await this.getSalesOrder(dto.sales_order_id, organizationId);
      updateData.sales_order_id = salesOrder.id;
      updateData.customer_id = dto.customer_id || salesOrder.customer_id || null;
      updateData.customer_name = dto.customer_name || salesOrder.customer_name || null;
      updateData.customer_address = dto.customer_address || salesOrder.customer_address || null;
    }

    if (dto.delivery_note_number !== undefined) updateData.delivery_note_number = dto.delivery_note_number;
    if (dto.delivery_date !== undefined) updateData.delivery_date = dto.delivery_date;
    if (dto.customer_id !== undefined) updateData.customer_id = dto.customer_id;
    if (dto.customer_name !== undefined) updateData.customer_name = dto.customer_name;
    if (dto.customer_address !== undefined) updateData.customer_address = dto.customer_address;
    if (dto.warehouse_id !== undefined) updateData.warehouse_id = dto.warehouse_id;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.items?.length) {
      const orderForItems = salesOrder || await this.getSalesOrder(existing.sales_order_id, organizationId);
      const items = this.prepareDeliveryNoteItems(
        dto.items.map((item) => ({
          sales_order_item_id: item.sales_order_item_id,
          item_id: item.item_id!,
          quantity: item.quantity!,
          batch_number: item.batch_number,
          warehouse_id: item.warehouse_id,
          notes: item.notes,
        })),
        orderForItems.items || [],
        organizationId,
        dto.warehouse_id ?? existing.warehouse_id ?? undefined,
      );
      const totals = this.calculateTotals(items);

      updateData.subtotal = totals.subtotal;
      updateData.total_qty = totals.totalQty;

      const { error: deleteItemsError } = await supabase
        .from('delivery_note_items')
        .delete()
        .eq('delivery_note_id', id);

      if (deleteItemsError) {
        throw new BadRequestException(`Failed to replace delivery note items: ${deleteItemsError.message}`);
      }

      const { error: insertItemsError } = await supabase.from('delivery_note_items').insert(
        items.map((item) => ({
          organization_id: item.organization_id,
          delivery_note_id: id,
          sales_order_item_id: item.sales_order_item_id,
          line_number: item.line_number,
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          batch_number: item.batch_number || null,
          warehouse_id: item.warehouse_id || null,
          notes: item.notes || null,
        })),
      );

      if (insertItemsError) {
        throw new BadRequestException(`Failed to insert delivery note items: ${insertItemsError.message}`);
      }
    }

    const { error } = await supabase
      .from('delivery_notes')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(`Failed to update delivery note: ${error.message}`);
    }

    return this.findOne(id, organizationId);
  }

  async submit(id: string, organizationId: string, userId: string): Promise<any> {
    const deliveryNote = await this.findOne(id, organizationId) as DeliveryNoteRecord;

    if (deliveryNote.status !== DeliveryNoteStatus.DRAFT) {
      throw new BadRequestException('Only draft delivery notes can be submitted');
    }

    const items = (deliveryNote.items || []).map((item) => ({
      ...item,
      quantityNumber: this.toNumber(item.quantity),
      warehouseId: item.warehouse_id || deliveryNote.warehouse_id || undefined,
      unit: item.sales_order_item?.unit_of_measure || 'unit',
      costPerUnit: this.toNumber(item.sales_order_item?.unit_price),
    }));

    if (items.length === 0) {
      throw new BadRequestException('Delivery note must contain at least one item to submit');
    }

    const missingWarehouse = items.find((item) => !item.warehouseId);
    if (missingWarehouse) {
      throw new BadRequestException('Warehouse is required for all delivery note items');
    }

    await this.databaseService.executeInPgTransaction(async (client) => {
      for (const item of items) {
        const availableQuantity = await this.stockReservationsService.getAvailableQuantity(
          organizationId,
          item.item_id,
          item.warehouseId as string,
          undefined,
          client,
        );

        if (availableQuantity < item.quantityNumber) {
          throw new BadRequestException(
            `Insufficient available stock for item ${item.item_id}: ${availableQuantity} available, ${item.quantityNumber} requested`,
          );
        }
      }
    });

    const distinctWarehouses = Array.from(new Set(items.map((item) => item.warehouseId as string)));
    const stockEntry = await this.stockEntriesService.createStockEntry({
      organization_id: organizationId,
      entry_type: StockEntryType.MATERIAL_ISSUE,
      entry_date: new Date(deliveryNote.delivery_date),
      from_warehouse_id: distinctWarehouses.length === 1 ? distinctWarehouses[0] : undefined,
      reference_type: 'delivery_note',
      reference_id: deliveryNote.id,
      reference_number: deliveryNote.delivery_note_number,
      purpose: `Delivery note ${deliveryNote.delivery_note_number}`,
      notes: deliveryNote.notes || `Auto-generated from delivery note ${deliveryNote.delivery_note_number}`,
      status: StockEntryStatus.POSTED,
      created_by: userId,
      items: items.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name || undefined,
        quantity: item.quantityNumber,
        unit: item.unit,
        source_warehouse_id: item.warehouseId as string,
        batch_number: item.batch_number || undefined,
        cost_per_unit: item.costPerUnit,
      })),
    });

    await this.databaseService.executeInPgTransaction(async (client) => {
      await this.applyDeliveryToSalesOrder(client, deliveryNote.sales_order_id, items, organizationId);
      await this.stockReservationsService.fulfillReservationsForReference(
        'sales_order',
        deliveryNote.sales_order_id,
        organizationId,
        client,
      );

      await client.query(
        `UPDATE delivery_notes
         SET status = $1,
             stock_entry_id = $2,
             submitted_at = $3,
             submitted_by = $4,
             updated_at = $3,
             updated_by = $4
         WHERE id = $5 AND organization_id = $6`,
        [
          DeliveryNoteStatus.SUBMITTED,
          stockEntry.id,
          new Date(),
          userId,
          id,
          organizationId,
        ],
      );
    });

    return this.findOne(id, organizationId);
  }

  async cancel(id: string, organizationId: string, userId: string): Promise<any> {
    const deliveryNote = await this.findOne(id, organizationId) as DeliveryNoteRecord;

    if (![DeliveryNoteStatus.DRAFT, DeliveryNoteStatus.SUBMITTED].includes(deliveryNote.status)) {
      throw new BadRequestException('Only draft or submitted delivery notes can be cancelled');
    }

    if (deliveryNote.status === DeliveryNoteStatus.SUBMITTED && deliveryNote.stock_entry_id) {
      await this.stockEntriesService.reverseStockEntry(
        deliveryNote.stock_entry_id,
        organizationId,
        userId,
        `Cancellation of delivery note ${deliveryNote.delivery_note_number}`,
      );

      const items = (deliveryNote.items || []).map((item) => ({
        sales_order_item_id: item.sales_order_item_id || '',
        quantityNumber: this.toNumber(item.quantity),
      }));

      await this.databaseService.executeInPgTransaction(async (client) => {
        await this.revertDeliveryFromSalesOrder(client, deliveryNote.sales_order_id, items, organizationId);
        await client.query(
          `UPDATE delivery_notes
           SET status = $1,
               cancelled_at = $2,
               cancelled_by = $3,
               updated_at = $2,
               updated_by = $3
           WHERE id = $4 AND organization_id = $5`,
          [DeliveryNoteStatus.CANCELLED, new Date(), userId, id, organizationId],
        );
      });
    } else {
      const supabase = this.databaseService.getAdminClient();
      const cancelledAt = new Date().toISOString();
      const { error } = await supabase
        .from('delivery_notes')
        .update({
          status: DeliveryNoteStatus.CANCELLED,
          cancelled_at: cancelledAt,
          cancelled_by: userId,
          updated_at: cancelledAt,
          updated_by: userId,
        })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        throw new BadRequestException(`Failed to cancel delivery note: ${error.message}`);
      }
    }

    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string): Promise<{ message: string }> {
    const supabase = this.databaseService.getAdminClient();
    const deliveryNote = await this.findOne(id, organizationId) as DeliveryNoteRecord;

    if (deliveryNote.status !== DeliveryNoteStatus.DRAFT) {
      throw new BadRequestException('Only draft delivery notes can be deleted');
    }

    const { error } = await supabase
      .from('delivery_notes')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(`Failed to delete delivery note: ${error.message}`);
    }

    return { message: 'Delivery note deleted successfully' };
  }

  private async getSalesOrder(id: string, organizationId: string): Promise<SalesOrderRecord> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('sales_orders')
      .select('id, order_number, status, customer_id, customer_name, customer_address, items:sales_order_items(*)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch sales order: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Sales order not found');
    }

    const salesOrder = data as SalesOrderRecord;
    const hasRemaining = (salesOrder.items || []).some((item) => this.getRemainingQuantity(item) > 0);
    if (!hasRemaining) {
      throw new BadRequestException('Sales order has no remaining quantity to deliver');
    }

    return salesOrder;
  }

  private prepareDeliveryNoteItems(
    items: CreateDeliveryNoteItemDto[],
    salesOrderItems: SalesOrderItemRecord[],
    organizationId: string,
    defaultWarehouseId?: string,
  ): PreparedDeliveryNoteItem[] {
    if (!items.length) {
      throw new BadRequestException('At least one delivery note item is required');
    }

    const allocations = new Map<string, number>();

    return items.map((item, index) => {
      const matchingItem = this.matchSalesOrderItem(item, salesOrderItems, allocations);
      const quantity = this.toNumber(item.quantity);

      allocations.set(
        matchingItem.id,
        (allocations.get(matchingItem.id) || 0) + quantity,
      );

      return {
        organization_id: organizationId,
        sales_order_item_id: matchingItem.id,
        line_number: index + 1,
        item_id: item.item_id,
        item_name: matchingItem.item_name,
        quantity,
        batch_number: item.batch_number,
        warehouse_id: item.warehouse_id || defaultWarehouseId,
        notes: item.notes,
        unit_of_measure: matchingItem.unit_of_measure || 'unit',
        unit_price: this.toNumber(matchingItem.unit_price),
      };
    });
  }

  private matchSalesOrderItem(
    item: CreateDeliveryNoteItemDto,
    salesOrderItems: SalesOrderItemRecord[],
    allocations: Map<string, number>,
  ): SalesOrderItemRecord {
    const requestedQuantity = this.toNumber(item.quantity);
    const matchingItem = salesOrderItems.find((salesOrderItem) => {
      if (item.sales_order_item_id && salesOrderItem.id !== item.sales_order_item_id) {
        return false;
      }
      if (salesOrderItem.item_id !== item.item_id) {
        return false;
      }
      const alreadyAllocated = allocations.get(salesOrderItem.id) || 0;
      return this.getRemainingQuantity(salesOrderItem) - alreadyAllocated >= requestedQuantity;
    });

    if (!matchingItem) {
      throw new BadRequestException(`No remaining sales order quantity found for item ${item.item_id}`);
    }

    return matchingItem;
  }

  private calculateTotals(items: PreparedDeliveryNoteItem[]): { subtotal: number; totalQty: number } {
    return {
      subtotal: this.round(items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)),
      totalQty: this.roundQuantity(items.reduce((sum, item) => sum + item.quantity, 0)),
    };
  }

  private async applyDeliveryToSalesOrder(
    client: PoolClient,
    salesOrderId: string,
    items: Array<{ sales_order_item_id?: string | null; quantityNumber: number }>,
    organizationId: string,
  ): Promise<void> {
    for (const item of items) {
      if (!item.sales_order_item_id) {
        throw new BadRequestException('Delivery note item is missing a sales order item link');
      }

      await client.query(
        `UPDATE sales_order_items
         SET delivered_quantity = COALESCE(delivered_quantity, 0) + $1
         WHERE id = $2`,
        [item.quantityNumber, item.sales_order_item_id],
      );
    }

    await this.refreshSalesOrderDeliveryStatus(client, salesOrderId, organizationId);
  }

  private async revertDeliveryFromSalesOrder(
    client: PoolClient,
    salesOrderId: string,
    items: Array<{ sales_order_item_id: string; quantityNumber: number }>,
    organizationId: string,
  ): Promise<void> {
    for (const item of items) {
      if (!item.sales_order_item_id || item.quantityNumber <= 0) {
        continue;
      }

      await client.query(
        `UPDATE sales_order_items
         SET delivered_quantity = GREATEST(COALESCE(delivered_quantity, 0) - $1, 0)
         WHERE id = $2`,
        [item.quantityNumber, item.sales_order_item_id],
      );
    }

    await this.refreshSalesOrderDeliveryStatus(client, salesOrderId, organizationId);
  }

  private async refreshSalesOrderDeliveryStatus(
    client: PoolClient,
    salesOrderId: string,
    organizationId: string,
  ): Promise<void> {
    const itemsResult = await client.query(
      `SELECT quantity, delivered_quantity
       FROM sales_order_items
       WHERE sales_order_id = $1`,
      [salesOrderId],
    );

    if (itemsResult.rows.length === 0) {
      throw new BadRequestException('Sales order has no items');
    }

    const totalQuantity = itemsResult.rows.reduce(
      (sum, item) => sum + this.toNumber(item.quantity),
      0,
    );
    const deliveredQuantity = itemsResult.rows.reduce(
      (sum, item) => sum + this.toNumber(item.delivered_quantity),
      0,
    );

    const nextStatus = deliveredQuantity >= totalQuantity
      ? 'delivered'
      : deliveredQuantity > 0
        ? 'partially_delivered'
        : 'confirmed';

    await client.query(
      `UPDATE sales_orders
       SET status = $1,
           updated_at = $2
       WHERE id = $3 AND organization_id = $4`,
      [nextStatus, new Date(), salesOrderId, organizationId],
    );
  }

  private getRemainingQuantity(item: SalesOrderItemRecord): number {
    return this.toNumber(item.quantity) - this.toNumber(item.delivered_quantity);
  }

  private toNumber(value: number | string | null | undefined): number {
    return Number(value || 0);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private roundQuantity(value: number): number {
    return Math.round(value * 1000) / 1000;
  }
}
