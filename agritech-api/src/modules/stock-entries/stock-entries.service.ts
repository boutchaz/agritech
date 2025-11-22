import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from '../database/database.service';
import { CreateStockEntryDto, StockEntryType, StockEntryStatus } from './dto/create-stock-entry.dto';

@Injectable()
export class StockEntriesService {
  private readonly logger = new Logger(StockEntriesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create a stock entry with all related movements and valuations
   * This replaces the database trigger: process_stock_entry_posting()
   */
  async createStockEntry(dto: CreateStockEntryDto): Promise<any> {
    const supabase = this.databaseService.getClient();

    // Validation
    this.validateStockEntry(dto);

    // Use a database transaction for atomicity
    return this.executeInTransaction(supabase, async (client) => {
      // 1. Create stock entry
      const { data: stockEntry, error: entryError } = await client
        .from('stock_entries')
        .insert({
          organization_id: dto.organization_id,
          entry_type: dto.entry_type,
          entry_number: dto.entry_number,
          entry_date: dto.entry_date,
          from_warehouse_id: dto.from_warehouse_id,
          to_warehouse_id: dto.to_warehouse_id,
          description: dto.description,
          status: dto.status,
          created_by: dto.created_by,
          posted_at: dto.status === StockEntryStatus.POSTED ? new Date() : null,
        })
        .select()
        .single();

      if (entryError) {
        this.logger.error(`Failed to create stock entry: ${entryError.message}`);
        throw new BadRequestException(`Failed to create stock entry: ${entryError.message}`);
      }

      // 2. Create stock entry items
      const itemsToInsert = dto.items.map(item => ({
        stock_entry_id: stockEntry.id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit: item.unit,
        cost_per_unit: item.cost_per_unit || 0,
        batch_number: item.batch_number,
        serial_number: item.serial_number,
        description: item.description,
      }));

      const { data: entryItems, error: itemsError } = await client
        .from('stock_entry_items')
        .insert(itemsToInsert)
        .select();

      if (itemsError) {
        this.logger.error(`Failed to create stock entry items: ${itemsError.message}`);
        throw new BadRequestException(`Failed to create stock entry items: ${itemsError.message}`);
      }

      // 3. If status is Posted, create stock movements and valuations
      if (dto.status === StockEntryStatus.POSTED) {
        await this.processStockMovements(
          client,
          stockEntry,
          entryItems,
          dto.entry_type,
        );
      }

      return {
        ...stockEntry,
        items: entryItems,
      };
    });
  }

  /**
   * Post a draft stock entry
   * This processes all stock movements and valuations
   */
  async postStockEntry(stockEntryId: string, userId: string): Promise<any> {
    const supabase = this.databaseService.getClient();

    return this.executeInTransaction(supabase, async (client) => {
      // 1. Get stock entry with items
      const { data: stockEntry, error: entryError } = await client
        .from('stock_entries')
        .select('*, stock_entry_items(*)')
        .eq('id', stockEntryId)
        .single();

      if (entryError || !stockEntry) {
        throw new BadRequestException('Stock entry not found');
      }

      if (stockEntry.status === StockEntryStatus.POSTED) {
        throw new BadRequestException('Stock entry is already posted');
      }

      if (stockEntry.status === StockEntryStatus.CANCELLED) {
        throw new BadRequestException('Cannot post a cancelled stock entry');
      }

      // 2. Update status to Posted
      const { error: updateError } = await client
        .from('stock_entries')
        .update({
          status: StockEntryStatus.POSTED,
          posted_at: new Date(),
        })
        .eq('id', stockEntryId);

      if (updateError) {
        throw new BadRequestException(`Failed to update stock entry: ${updateError.message}`);
      }

      // 3. Process stock movements
      await this.processStockMovements(
        client,
        stockEntry,
        stockEntry.stock_entry_items,
        stockEntry.entry_type,
      );

      return { message: 'Stock entry posted successfully' };
    });
  }

  /**
   * Process stock movements based on entry type
   * This is the core business logic previously in the trigger
   */
  private async processStockMovements(
    client: SupabaseClient,
    stockEntry: any,
    items: any[],
    entryType: StockEntryType,
  ): Promise<void> {
    for (const item of items) {
      switch (entryType) {
        case StockEntryType.MATERIAL_RECEIPT:
          await this.processMaterialReceipt(client, stockEntry, item);
          break;

        case StockEntryType.MATERIAL_ISSUE:
          await this.processMaterialIssue(client, stockEntry, item);
          break;

        case StockEntryType.STOCK_TRANSFER:
          await this.processStockTransfer(client, stockEntry, item);
          break;

        case StockEntryType.STOCK_RECONCILIATION:
          await this.processStockReconciliation(client, stockEntry, item);
          break;

        default:
          this.logger.warn(`Unknown entry type: ${entryType}`);
      }
    }
  }

  /**
   * Process Material Receipt: Add stock to warehouse
   */
  private async processMaterialReceipt(
    client: SupabaseClient,
    stockEntry: any,
    item: any,
  ): Promise<void> {
    if (!stockEntry.to_warehouse_id) {
      throw new BadRequestException('Material Receipt requires a target warehouse');
    }

    // Create stock movement (IN)
    const { error: movementError } = await client
      .from('stock_movements')
      .insert({
        organization_id: stockEntry.organization_id,
        item_id: item.item_id,
        warehouse_id: stockEntry.to_warehouse_id,
        movement_type: 'IN',
        movement_date: stockEntry.entry_date,
        quantity: item.quantity,
        unit: item.unit,
        balance_quantity: item.quantity,
        cost_per_unit: item.cost_per_unit || 0,
        total_cost: item.quantity * (item.cost_per_unit || 0),
        stock_entry_id: stockEntry.id,
        stock_entry_item_id: item.id,
        batch_number: item.batch_number,
        serial_number: item.serial_number,
      });

    if (movementError) {
      this.logger.error(`Failed to create stock movement: ${movementError.message}`);
      throw new BadRequestException(`Failed to create stock movement: ${movementError.message}`);
    }

    // Create stock valuation
    const { error: valuationError } = await client
      .from('stock_valuation')
      .insert({
        organization_id: stockEntry.organization_id,
        item_id: item.item_id,
        warehouse_id: stockEntry.to_warehouse_id,
        quantity: item.quantity,
        cost_per_unit: item.cost_per_unit || 0,
        stock_entry_id: stockEntry.id,
        batch_number: item.batch_number,
        serial_number: item.serial_number,
        remaining_quantity: item.quantity,
      });

    if (valuationError) {
      this.logger.error(`Failed to create stock valuation: ${valuationError.message}`);
      throw new BadRequestException(`Failed to create stock valuation: ${valuationError.message}`);
    }

    this.logger.log(`Material receipt processed: ${item.quantity} ${item.unit} of item ${item.item_id}`);
  }

  /**
   * Process Material Issue: Remove stock from warehouse
   */
  private async processMaterialIssue(
    client: SupabaseClient,
    stockEntry: any,
    item: any,
  ): Promise<void> {
    if (!stockEntry.from_warehouse_id) {
      throw new BadRequestException('Material Issue requires a source warehouse');
    }

    // Check available stock
    await this.validateStockAvailability(
      client,
      stockEntry.organization_id,
      item.item_id,
      stockEntry.from_warehouse_id,
      item.quantity,
    );

    // Create stock movement (OUT)
    const { error: movementError } = await client
      .from('stock_movements')
      .insert({
        organization_id: stockEntry.organization_id,
        item_id: item.item_id,
        warehouse_id: stockEntry.from_warehouse_id,
        movement_type: 'OUT',
        movement_date: stockEntry.entry_date,
        quantity: -item.quantity,
        unit: item.unit,
        balance_quantity: -item.quantity,
        cost_per_unit: item.cost_per_unit || 0,
        total_cost: -item.quantity * (item.cost_per_unit || 0),
        stock_entry_id: stockEntry.id,
        stock_entry_item_id: item.id,
        batch_number: item.batch_number,
        serial_number: item.serial_number,
      });

    if (movementError) {
      this.logger.error(`Failed to create stock movement: ${movementError.message}`);
      throw new BadRequestException(`Failed to create stock movement: ${movementError.message}`);
    }

    // TODO: Implement FIFO/LIFO consumption from stock_valuation
    this.logger.warn('Stock valuation consumption (FIFO/LIFO) not yet implemented');

    this.logger.log(`Material issue processed: ${item.quantity} ${item.unit} of item ${item.item_id}`);
  }

  /**
   * Process Stock Transfer: Move stock between warehouses
   */
  private async processStockTransfer(
    client: SupabaseClient,
    stockEntry: any,
    item: any,
  ): Promise<void> {
    if (!stockEntry.from_warehouse_id || !stockEntry.to_warehouse_id) {
      throw new BadRequestException('Stock Transfer requires both source and target warehouses');
    }

    if (stockEntry.from_warehouse_id === stockEntry.to_warehouse_id) {
      throw new BadRequestException('Source and target warehouses must be different');
    }

    // Check available stock
    await this.validateStockAvailability(
      client,
      stockEntry.organization_id,
      item.item_id,
      stockEntry.from_warehouse_id,
      item.quantity,
    );

    // Create OUT movement from source
    const { error: outError } = await client
      .from('stock_movements')
      .insert({
        organization_id: stockEntry.organization_id,
        item_id: item.item_id,
        warehouse_id: stockEntry.from_warehouse_id,
        movement_type: 'TRANSFER',
        movement_date: stockEntry.entry_date,
        quantity: -item.quantity,
        unit: item.unit,
        balance_quantity: -item.quantity,
        cost_per_unit: item.cost_per_unit || 0,
        total_cost: -item.quantity * (item.cost_per_unit || 0),
        stock_entry_id: stockEntry.id,
        stock_entry_item_id: item.id,
        batch_number: item.batch_number,
        serial_number: item.serial_number,
      });

    if (outError) {
      throw new BadRequestException(`Failed to create OUT movement: ${outError.message}`);
    }

    // Create IN movement to target
    const { error: inError } = await client
      .from('stock_movements')
      .insert({
        organization_id: stockEntry.organization_id,
        item_id: item.item_id,
        warehouse_id: stockEntry.to_warehouse_id,
        movement_type: 'TRANSFER',
        movement_date: stockEntry.entry_date,
        quantity: item.quantity,
        unit: item.unit,
        balance_quantity: item.quantity,
        cost_per_unit: item.cost_per_unit || 0,
        total_cost: item.quantity * (item.cost_per_unit || 0),
        stock_entry_id: stockEntry.id,
        stock_entry_item_id: item.id,
        batch_number: item.batch_number,
        serial_number: item.serial_number,
      });

    if (inError) {
      throw new BadRequestException(`Failed to create IN movement: ${inError.message}`);
    }

    this.logger.log(`Stock transfer processed: ${item.quantity} ${item.unit} of item ${item.item_id}`);
  }

  /**
   * Process Stock Reconciliation
   */
  private async processStockReconciliation(
    client: SupabaseClient,
    stockEntry: any,
    item: any,
  ): Promise<void> {
    // Implementation for reconciliation
    this.logger.warn('Stock reconciliation processing not yet implemented');
  }

  /**
   * Validate stock entry data
   */
  private validateStockEntry(dto: CreateStockEntryDto): void {
    // Validate warehouse requirements based on entry type
    switch (dto.entry_type) {
      case StockEntryType.MATERIAL_RECEIPT:
        if (!dto.to_warehouse_id) {
          throw new BadRequestException('Material Receipt requires a target warehouse');
        }
        break;

      case StockEntryType.MATERIAL_ISSUE:
        if (!dto.from_warehouse_id) {
          throw new BadRequestException('Material Issue requires a source warehouse');
        }
        break;

      case StockEntryType.STOCK_TRANSFER:
        if (!dto.from_warehouse_id || !dto.to_warehouse_id) {
          throw new BadRequestException('Stock Transfer requires both source and target warehouses');
        }
        if (dto.from_warehouse_id === dto.to_warehouse_id) {
          throw new BadRequestException('Source and target warehouses must be different');
        }
        break;
    }

    // Validate items
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Stock entry must have at least one item');
    }

    for (const item of dto.items) {
      if (item.quantity <= 0) {
        throw new BadRequestException('Item quantity must be greater than zero');
      }
    }
  }

  /**
   * Check if sufficient stock is available for issue/transfer
   */
  private async validateStockAvailability(
    client: SupabaseClient,
    organizationId: string,
    itemId: string,
    warehouseId: string,
    requiredQuantity: number,
  ): Promise<void> {
    // Get current stock balance
    const { data: movements, error } = await client
      .from('stock_movements')
      .select('quantity')
      .eq('organization_id', organizationId)
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId);

    if (error) {
      throw new BadRequestException(`Failed to check stock availability: ${error.message}`);
    }

    const currentBalance = movements?.reduce((sum, m) => sum + (m.quantity || 0), 0) || 0;

    if (currentBalance < requiredQuantity) {
      throw new BadRequestException(
        `Insufficient stock: available ${currentBalance}, required ${requiredQuantity}`,
      );
    }
  }

  /**
   * Execute operations in a database transaction
   * Supabase doesn't have built-in transaction support, so we use RPC
   */
  private async executeInTransaction<T>(
    supabase: SupabaseClient,
    operation: (client: SupabaseClient) => Promise<T>,
  ): Promise<T> {
    // For now, execute directly. In production, you might want to:
    // 1. Use Supabase Edge Functions with transactions
    // 2. Use a PostgreSQL client directly (pg library) for true transactions
    // 3. Implement compensation/rollback logic

    try {
      return await operation(supabase);
    } catch (error) {
      this.logger.error(`Transaction failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
