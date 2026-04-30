import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { paginate, PaginatedResponse, SortDirection } from '../../common/dto/paginated-query.dto';
import { sanitizeSearch } from '../../common/utils/sanitize-search';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { StockEntriesService } from '../stock-entries/stock-entries.service';
import {
  StockEntryStatus,
  StockEntryType,
} from '../stock-entries/dto/create-stock-entry.dto';
import {
  CreatePurchaseReceiptDto,
  CreatePurchaseReceiptItemDto,
  PurchaseReceiptFiltersDto,
  PurchaseReceiptStatus,
  UpdatePurchaseReceiptDto,
} from './dto';
import { PoolClient } from 'pg';
import { PurchaseOrderStatus } from '../purchase-orders/dto';

type PurchaseOrderItemRecord = {
  id: string;
  line_number: number;
  item_name: string;
  quantity: number | string;
  received_quantity?: number | string | null;
  unit_of_measure?: string | null;
  unit_price?: number | string | null;
  tax_amount?: number | string | null;
  inventory_item_id?: string | null;
};

type PurchaseOrderRecord = {
  id: string;
  order_number: string;
  status: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  items?: PurchaseOrderItemRecord[];
};

type PreparedReceiptItem = {
  organization_id: string;
  purchase_order_item_id: string;
  line_number: number;
  item_id: string;
  item_name: string;
  quantity: number;
  rejected_quantity: number;
  unit_of_measure: string;
  unit_price: number;
  batch_number?: string;
  warehouse_id: string;
  notes?: string;
  tax_amount: number;
};

type PurchaseReceiptRecord = {
  id: string;
  receipt_number: string;
  receipt_date: string;
  purchase_order_id: string;
  status: PurchaseReceiptStatus;
  stock_entry_id?: string | null;
  notes?: string | null;
  items?: Array<{
    id: string;
    purchase_order_item_id?: string | null;
    item_id: string;
    item_name?: string | null;
    quantity: number | string;
    rejected_quantity?: number | string | null;
    accepted_quantity?: number | string | null;
    unit_of_measure?: string | null;
    unit_price?: number | string | null;
    batch_number?: string | null;
    warehouse_id?: string | null;
    notes?: string | null;
  }>;
};

@Injectable()
export class PurchaseReceiptsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
    @Inject(forwardRef(() => StockEntriesService))
    private readonly stockEntriesService: StockEntriesService,
  ) {}

  async create(
    dto: CreatePurchaseReceiptDto,
    organizationId: string,
    userId: string,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();
    const purchaseOrder = await this.getPurchaseOrder(dto.purchase_order_id, organizationId);
    const items = this.prepareReceiptItems(dto.items, purchaseOrder.items || [], organizationId);
    const totals = this.calculateTotals(items);
    const receiptNumber = dto.receipt_number || await this.sequencesService.generatePurchaseReceiptNumber(organizationId);
    const receiptDate = dto.receipt_date || new Date().toISOString().split('T')[0];

    const { data: receipt, error: receiptError } = await supabase
      .from('purchase_receipts')
      .insert({
        organization_id: organizationId,
        receipt_number: receiptNumber,
        receipt_date: receiptDate,
        purchase_order_id: purchaseOrder.id,
        supplier_id: purchaseOrder.supplier_id || null,
        supplier_name: purchaseOrder.supplier_name || null,
        status: PurchaseReceiptStatus.DRAFT,
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        total_amount: totals.totalAmount,
        notes: dto.notes || null,
        created_by: userId,
        updated_by: userId,
      })
      .select('id')
      .single();

    if (receiptError || !receipt) {
      throw new BadRequestException(`Failed to create purchase receipt: ${receiptError?.message || 'unknown error'}`);
    }

    const { error: itemsError } = await supabase.from('purchase_receipt_items').insert(
      items.map((item) => ({
        organization_id: item.organization_id,
        purchase_receipt_id: receipt.id,
        purchase_order_item_id: item.purchase_order_item_id,
        line_number: item.line_number,
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        rejected_quantity: item.rejected_quantity,
        unit_of_measure: item.unit_of_measure,
        unit_price: item.unit_price,
        batch_number: item.batch_number || null,
        warehouse_id: item.warehouse_id,
        notes: item.notes || null,
      })),
    );

    if (itemsError) {
      await supabase.from('purchase_receipts').delete().eq('id', receipt.id).eq('organization_id', organizationId);
      throw new BadRequestException(`Failed to create purchase receipt items: ${itemsError.message}`);
    }

    return this.findOne(receipt.id, organizationId);
  }

  async findAll(
    organizationId: string,
    filters: PurchaseReceiptFiltersDto,
  ): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();
    const {
      page = 1,
      pageSize = 10,
      search,
      status,
      sortBy = 'receipt_date',
      sortDir = SortDirection.DESC,
      dateFrom,
      dateTo,
    } = filters || {};

    return paginate(client, 'purchase_receipts', {
      select: '*, purchase_order:purchase_orders(id, order_number)',
      filters: (query) => {
        let next = query.eq('organization_id', organizationId);
        if (status) next = next.eq('status', status);
        if (dateFrom) next = next.gte('receipt_date', dateFrom);
        if (dateTo) next = next.lte('receipt_date', dateTo);
        if (search) {
          const safeSearch = sanitizeSearch(search);
          if (safeSearch) {
            next = next.or(`receipt_number.ilike.%${safeSearch}%,supplier_name.ilike.%${safeSearch}%`);
          }
        }
        return next;
      },
      page,
      pageSize,
      orderBy: ['receipt_number', 'supplier_name', 'status'].includes(sortBy) ? sortBy : 'receipt_date',
      ascending: sortDir === SortDirection.ASC,
    });
  }

  async findOne(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('purchase_receipts')
      .select(`
        *,
        purchase_order:purchase_orders(id, order_number, status),
        items:purchase_receipt_items(*)
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch purchase receipt: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Purchase receipt not found');
    }

    return data;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdatePurchaseReceiptDto,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();
    const existing = await this.findOne(id, organizationId) as PurchaseReceiptRecord;

    if (existing.status !== PurchaseReceiptStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase receipts can be updated');
    }

    if (dto.purchase_order_id && dto.purchase_order_id !== existing.purchase_order_id && !dto.items?.length) {
      throw new BadRequestException('Items are required when changing the purchase order');
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    let purchaseOrder: PurchaseOrderRecord | null = null;
    if (dto.purchase_order_id) {
      purchaseOrder = await this.getPurchaseOrder(dto.purchase_order_id, organizationId);
      updateData.purchase_order_id = purchaseOrder.id;
      updateData.supplier_id = purchaseOrder.supplier_id || null;
      updateData.supplier_name = purchaseOrder.supplier_name || null;
    }

    if (dto.receipt_number !== undefined) updateData.receipt_number = dto.receipt_number;
    if (dto.receipt_date !== undefined) updateData.receipt_date = dto.receipt_date;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.items?.length) {
      const orderForItems = purchaseOrder || await this.getPurchaseOrder(existing.purchase_order_id, organizationId);
      const items = this.prepareReceiptItems(
        dto.items.map((item) => ({
          purchase_order_item_id: item.purchase_order_item_id,
          item_id: item.item_id!,
          quantity: item.quantity!,
          rejected_quantity: item.rejected_quantity,
          warehouse_id: item.warehouse_id!,
          batch_number: item.batch_number,
          notes: item.notes,
        })),
        orderForItems.items || [],
        organizationId,
      );
      const totals = this.calculateTotals(items);

      updateData.subtotal = totals.subtotal;
      updateData.tax_total = totals.taxTotal;
      updateData.total_amount = totals.totalAmount;

      const { error: deleteItemsError } = await supabase
        .from('purchase_receipt_items')
        .delete()
        .eq('purchase_receipt_id', id);

      if (deleteItemsError) {
        throw new BadRequestException(`Failed to replace purchase receipt items: ${deleteItemsError.message}`);
      }

      const { error: insertItemsError } = await supabase.from('purchase_receipt_items').insert(
        items.map((item) => ({
          organization_id: item.organization_id,
          purchase_receipt_id: id,
          purchase_order_item_id: item.purchase_order_item_id,
          line_number: item.line_number,
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          rejected_quantity: item.rejected_quantity,
          unit_of_measure: item.unit_of_measure,
          unit_price: item.unit_price,
          batch_number: item.batch_number || null,
          warehouse_id: item.warehouse_id,
          notes: item.notes || null,
        })),
      );

      if (insertItemsError) {
        throw new BadRequestException(`Failed to insert purchase receipt items: ${insertItemsError.message}`);
      }
    }

    const { error } = await supabase
      .from('purchase_receipts')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(`Failed to update purchase receipt: ${error.message}`);
    }

    return this.findOne(id, organizationId);
  }

  async submit(id: string, organizationId: string, userId: string): Promise<any> {
    const receipt = await this.findOne(id, organizationId) as PurchaseReceiptRecord;

    if (receipt.status !== PurchaseReceiptStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase receipts can be submitted');
    }

    const acceptedItems = (receipt.items || [])
      .map((item) => ({
        ...item,
        acceptedQuantity: this.toNumber(item.accepted_quantity ?? this.toNumber(item.quantity) - this.toNumber(item.rejected_quantity)),
      }))
      .filter((item) => item.acceptedQuantity > 0);

    if (acceptedItems.length === 0) {
      throw new BadRequestException('Purchase receipt must contain at least one accepted item to submit');
    }

    const missingWarehouse = acceptedItems.find((item) => !item.warehouse_id);
    if (missingWarehouse) {
      throw new BadRequestException('Warehouse is required for all accepted receipt items');
    }

    const distinctWarehouses = Array.from(new Set(acceptedItems.map((item) => item.warehouse_id as string)));
    const stockEntry = await this.stockEntriesService.createStockEntry({
      organization_id: organizationId,
      entry_type: StockEntryType.MATERIAL_RECEIPT,
      entry_date: new Date(receipt.receipt_date),
      to_warehouse_id: distinctWarehouses.length === 1 ? distinctWarehouses[0] : undefined,
      reference_type: 'purchase_receipt',
      reference_id: receipt.id,
      reference_number: receipt.receipt_number,
      purpose: `Purchase receipt ${receipt.receipt_number}`,
      notes: receipt.notes || `Auto-generated from purchase receipt ${receipt.receipt_number}`,
      status: StockEntryStatus.POSTED,
      created_by: userId,
      items: acceptedItems.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name || undefined,
        quantity: item.acceptedQuantity,
        unit: item.unit_of_measure || 'unit',
        target_warehouse_id: item.warehouse_id as string,
        batch_number: item.batch_number || undefined,
        cost_per_unit: this.toNumber(item.unit_price),
      })),
    });

    await this.databaseService.executeInPgTransaction(async (client) => {
      await this.applyReceiptToPurchaseOrder(client, receipt.purchase_order_id, acceptedItems, organizationId);

      await client.query(
        `UPDATE purchase_receipts
         SET status = $1,
             stock_entry_id = $2,
             submitted_at = $3,
             submitted_by = $4,
             updated_at = $3,
             updated_by = $4
         WHERE id = $5 AND organization_id = $6`,
        [
          PurchaseReceiptStatus.SUBMITTED,
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
    const receipt = await this.findOne(id, organizationId) as PurchaseReceiptRecord;

    if (![PurchaseReceiptStatus.DRAFT, PurchaseReceiptStatus.SUBMITTED].includes(receipt.status)) {
      throw new BadRequestException('Only draft or submitted purchase receipts can be cancelled');
    }

    if (receipt.status === PurchaseReceiptStatus.SUBMITTED && receipt.stock_entry_id) {
      await this.stockEntriesService.reverseStockEntry(
        receipt.stock_entry_id,
        organizationId,
        userId,
        `Cancellation of purchase receipt ${receipt.receipt_number}`,
      );

      const acceptedItems = (receipt.items || []).map((item) => ({
        purchase_order_item_id: item.purchase_order_item_id || '',
        acceptedQuantity: this.toNumber(item.accepted_quantity ?? this.toNumber(item.quantity) - this.toNumber(item.rejected_quantity)),
      }));

      await this.databaseService.executeInPgTransaction(async (client) => {
        await this.revertReceiptFromPurchaseOrder(client, receipt.purchase_order_id, acceptedItems, organizationId);
        await client.query(
          `UPDATE purchase_receipts
           SET status = $1,
               cancelled_at = $2,
               cancelled_by = $3,
               updated_at = $2,
               updated_by = $3
           WHERE id = $4 AND organization_id = $5`,
          [PurchaseReceiptStatus.CANCELLED, new Date(), userId, id, organizationId],
        );
      });
    } else {
      const supabase = this.databaseService.getAdminClient();
      const cancelledAt = new Date().toISOString();
      const { error } = await supabase
        .from('purchase_receipts')
        .update({
          status: PurchaseReceiptStatus.CANCELLED,
          cancelled_at: cancelledAt,
          cancelled_by: userId,
          updated_at: cancelledAt,
          updated_by: userId,
        })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        throw new BadRequestException(`Failed to cancel purchase receipt: ${error.message}`);
      }
    }

    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string): Promise<{ message: string }> {
    const supabase = this.databaseService.getAdminClient();
    const receipt = await this.findOne(id, organizationId) as PurchaseReceiptRecord;

    if (receipt.status !== PurchaseReceiptStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase receipts can be deleted');
    }

    const { error } = await supabase
      .from('purchase_receipts')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(`Failed to delete purchase receipt: ${error.message}`);
    }

    return { message: 'Purchase receipt deleted successfully' };
  }

  private async getPurchaseOrder(id: string, organizationId: string): Promise<PurchaseOrderRecord> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, order_number, status, supplier_id, supplier_name, items:purchase_order_items(*)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch purchase order: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Purchase order not found');
    }

    const po = data as PurchaseOrderRecord;
    const hasRemaining = (po.items || []).some((item) => this.getRemainingQuantity(item) > 0);
    if (!hasRemaining) {
      throw new BadRequestException('Purchase order has no remaining quantity to receive');
    }

    return po;
  }

  private prepareReceiptItems(
    items: CreatePurchaseReceiptItemDto[],
    purchaseOrderItems: PurchaseOrderItemRecord[],
    organizationId: string,
  ): PreparedReceiptItem[] {
    if (!items.length) {
      throw new BadRequestException('At least one purchase receipt item is required');
    }

    const allocations = new Map<string, number>();

    return items.map((item, index) => {
      const matchingItem = this.matchPurchaseOrderItem(item, purchaseOrderItems, allocations);
      const quantity = this.toNumber(item.quantity);
      const rejectedQuantity = this.toNumber(item.rejected_quantity);

      if (rejectedQuantity > quantity) {
        throw new BadRequestException('Rejected quantity cannot exceed received quantity');
      }

      allocations.set(
        matchingItem.id,
        (allocations.get(matchingItem.id) || 0) + quantity,
      );

      const taxPerUnit = this.toNumber(matchingItem.tax_amount) / this.toNumber(matchingItem.quantity);

      return {
        organization_id: organizationId,
        purchase_order_item_id: matchingItem.id,
        line_number: index + 1,
        item_id: item.item_id,
        item_name: matchingItem.item_name,
        quantity,
        rejected_quantity: rejectedQuantity,
        unit_of_measure: matchingItem.unit_of_measure || 'unit',
        unit_price: this.toNumber(matchingItem.unit_price),
        batch_number: item.batch_number,
        warehouse_id: item.warehouse_id,
        notes: item.notes,
        tax_amount: this.round(taxPerUnit * quantity),
      };
    });
  }

  private matchPurchaseOrderItem(
    item: CreatePurchaseReceiptItemDto,
    purchaseOrderItems: PurchaseOrderItemRecord[],
    allocations: Map<string, number>,
  ): PurchaseOrderItemRecord {
    const requestedQuantity = this.toNumber(item.quantity);
    const matchingItem = purchaseOrderItems.find((purchaseOrderItem) => {
      if (item.purchase_order_item_id && purchaseOrderItem.id !== item.purchase_order_item_id) {
        return false;
      }
      if (purchaseOrderItem.inventory_item_id !== item.item_id) {
        return false;
      }
      const alreadyAllocated = allocations.get(purchaseOrderItem.id) || 0;
      return this.getRemainingQuantity(purchaseOrderItem) - alreadyAllocated >= requestedQuantity;
    });

    if (!matchingItem) {
      throw new BadRequestException(`No remaining purchase order quantity found for item ${item.item_id}`);
    }

    return matchingItem;
  }

  private calculateTotals(items: PreparedReceiptItem[]): {
    subtotal: number;
    taxTotal: number;
    totalAmount: number;
  } {
    const subtotal = this.round(
      items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    );
    const taxTotal = this.round(items.reduce((sum, item) => sum + item.tax_amount, 0));
    return {
      subtotal,
      taxTotal,
      totalAmount: this.round(subtotal + taxTotal),
    };
  }

  private async applyReceiptToPurchaseOrder(
    client: PoolClient,
    purchaseOrderId: string,
    items: Array<{ purchase_order_item_id?: string | null; acceptedQuantity: number }>,
    organizationId: string,
  ): Promise<void> {
    for (const item of items) {
      if (!item.purchase_order_item_id) {
        throw new BadRequestException('Purchase receipt item is missing a purchase order item link');
      }

      await client.query(
        `UPDATE purchase_order_items
         SET received_quantity = COALESCE(received_quantity, 0) + $1
         WHERE id = $2`,
        [item.acceptedQuantity, item.purchase_order_item_id],
      );
    }

    await this.refreshPurchaseOrderReceiptStatus(client, purchaseOrderId, organizationId);
  }

  private async revertReceiptFromPurchaseOrder(
    client: PoolClient,
    purchaseOrderId: string,
    items: Array<{ purchase_order_item_id: string; acceptedQuantity: number }>,
    organizationId: string,
  ): Promise<void> {
    for (const item of items) {
      if (!item.purchase_order_item_id || item.acceptedQuantity <= 0) {
        continue;
      }

      await client.query(
        `UPDATE purchase_order_items
         SET received_quantity = GREATEST(COALESCE(received_quantity, 0) - $1, 0)
         WHERE id = $2`,
        [item.acceptedQuantity, item.purchase_order_item_id],
      );
    }

    await this.refreshPurchaseOrderReceiptStatus(client, purchaseOrderId, organizationId);
  }

  private async refreshPurchaseOrderReceiptStatus(
    client: PoolClient,
    purchaseOrderId: string,
    organizationId: string,
  ): Promise<void> {
    const itemsResult = await client.query(
      `SELECT quantity, received_quantity
       FROM purchase_order_items
       WHERE purchase_order_id = $1`,
      [purchaseOrderId],
    );

    if (itemsResult.rows.length === 0) {
      throw new BadRequestException('Purchase order has no items');
    }

    const totalQuantity = itemsResult.rows.reduce(
      (sum, item) => sum + this.toNumber(item.quantity),
      0,
    );
    const receivedQuantity = itemsResult.rows.reduce(
      (sum, item) => sum + this.toNumber(item.received_quantity),
      0,
    );

    const hasAnyReceived = receivedQuantity > 0;
    const nextStatus = receivedQuantity >= totalQuantity
      ? PurchaseOrderStatus.RECEIVED
      : hasAnyReceived
        ? PurchaseOrderStatus.PARTIALLY_RECEIVED
        : PurchaseOrderStatus.CONFIRMED;

    await client.query(
      `UPDATE purchase_orders
       SET status = $1,
           stock_received = $2,
           stock_received_date = $3,
           stock_entry_id = CASE WHEN $2 THEN stock_entry_id ELSE NULL END,
           updated_at = $4
       WHERE id = $5 AND organization_id = $6`,
      [
        nextStatus,
        hasAnyReceived,
        hasAnyReceived ? new Date() : null,
        new Date(),
        purchaseOrderId,
        organizationId,
      ],
    );
  }

  private getRemainingQuantity(item: PurchaseOrderItemRecord): number {
    return this.toNumber(item.quantity) - this.toNumber(item.received_quantity);
  }

  private toNumber(value: number | string | null | undefined): number {
    return Number(value || 0);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
