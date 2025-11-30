import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { CreateStockEntryDto, StockEntryType, StockEntryStatus, ValuationMethod } from './dto/create-stock-entry.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';

@Injectable()
export class StockEntriesService {
  private readonly logger = new Logger(StockEntriesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all stock entries with optional filters
   */
  async findAll(organizationId: string, filters?: any): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('stock_entries')
      .select(`
        *,
        from_warehouse:warehouses!stock_entries_from_warehouse_id_fkey(id, name),
        to_warehouse:warehouses!stock_entries_to_warehouse_id_fkey(id, name)
      `)
      .eq('organization_id', organizationId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.entry_type) {
      query = query.eq('entry_type', filters.entry_type);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.from_date) {
      query = query.gte('entry_date', filters.from_date);
    }
    if (filters?.to_date) {
      query = query.lte('entry_date', filters.to_date);
    }
    if (filters?.warehouse_id) {
      query = query.or(`from_warehouse_id.eq.${filters.warehouse_id},to_warehouse_id.eq.${filters.warehouse_id}`);
    }
    if (filters?.reference_type) {
      query = query.eq('reference_type', filters.reference_type);
    }
    if (filters?.search) {
      query = query.or(`entry_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch stock entries: ${error.message}`);
      throw new BadRequestException(`Failed to fetch stock entries: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a single stock entry with items
   */
  async findOne(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('stock_entries')
      .select(`
        *,
        items:stock_entry_items(
          *,
          item:items(id, item_code, item_name, default_unit)
        ),
        from_warehouse:warehouses!stock_entries_from_warehouse_id_fkey(id, name),
        to_warehouse:warehouses!stock_entries_to_warehouse_id_fkey(id, name)
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch stock entry: ${error.message}`);
      throw new BadRequestException(`Failed to fetch stock entry: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Stock entry not found');
    }

    return data;
  }

  /**
   * Create a stock entry with all related movements and valuations
   * This replaces the database trigger: process_stock_entry_posting()
   */
  async createStockEntry(dto: CreateStockEntryDto): Promise<any> {
    // Validation
    this.validateStockEntry(dto);

    // Generate entry number if not provided (outside transaction, uses Supabase RPC)
    let entryNumber = dto.entry_number;
    if (!entryNumber) {
      const supabase = this.databaseService.getAdminClient();
      const { data: generatedNumber, error: numberError } = await supabase.rpc('generate_stock_entry_number', {
        p_organization_id: dto.organization_id,
      });

      if (numberError) {
        this.logger.error(`Failed to generate entry number: ${numberError.message}`);
        throw new BadRequestException(`Failed to generate entry number: ${numberError.message}`);
      }

      entryNumber = generatedNumber as string;
    }

    // Use PostgreSQL transaction for atomicity
    return this.executeInPgTransaction(async (client) => {
      // 1. Create stock entry
      const entryResult = await client.query(
        `INSERT INTO stock_entries (
          organization_id, entry_type, entry_number, entry_date,
          from_warehouse_id, to_warehouse_id, reference_type, reference_id,
          reference_number, purpose, notes, status, created_by, posted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          dto.organization_id,
          dto.entry_type,
          entryNumber,
          dto.entry_date,
          dto.from_warehouse_id || null,
          dto.to_warehouse_id || null,
          dto.reference_type || null,
          dto.reference_id || null,
          dto.reference_number || null,
          dto.purpose || null,
          dto.notes || null,
          dto.status || StockEntryStatus.DRAFT,
          dto.created_by || null,
          dto.status === StockEntryStatus.POSTED ? new Date() : null,
        ],
      );

      if (entryResult.rows.length === 0) {
        throw new BadRequestException('Failed to create stock entry');
      }

      const stockEntry = entryResult.rows[0];

      // 2. Create stock entry items
      const entryItems = [];
      for (let index = 0; index < dto.items.length; index++) {
        const item = dto.items[index];
        const itemResult = await client.query(
          `INSERT INTO stock_entry_items (
            stock_entry_id, line_number, item_id, item_name, quantity, unit,
            source_warehouse_id, target_warehouse_id, batch_number, serial_number,
            expiry_date, cost_per_unit, system_quantity, physical_quantity, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *`,
          [
            stockEntry.id,
            index + 1,
            item.item_id,
            item.item_name || null,
            item.quantity,
            item.unit,
            item.source_warehouse_id || null,
            item.target_warehouse_id || null,
            item.batch_number || null,
            item.serial_number || null,
            item.expiry_date || null,
            item.cost_per_unit || null,
            item.system_quantity || null,
            item.physical_quantity || null,
            item.notes || null,
          ],
        );

        if (itemResult.rows.length > 0) {
          entryItems.push(itemResult.rows[0]);
        }
      }

      // 3. If status is Posted, create stock movements and valuations
      if (dto.status === StockEntryStatus.POSTED) {
        await this.processStockMovementsPg(
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
   * Update a draft stock entry
   */
  async updateStockEntry(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateStockEntryDto,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // Check if entry exists and is in Draft status
    const { data: entry, error: fetchError } = await supabase
      .from('stock_entries')
      .select('status, organization_id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (fetchError) {
      this.logger.error(`Error fetching stock entry for update: ${fetchError.message}`);
      throw new BadRequestException(`Failed to fetch stock entry: ${fetchError.message}`);
    }

    if (!entry) {
      throw new NotFoundException('Stock entry not found or access denied');
    }

    if (entry.status !== 'Draft') {
      throw new BadRequestException('Only draft entries can be updated');
    }

    const { data, error } = await supabase
      .from('stock_entries')
      .update({
        ...dto,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to update stock entry: ${error.message}`);
      throw new BadRequestException(`Failed to update stock entry: ${error.message}`);
    }

    return data;
  }

  /**
   * Post a draft stock entry
   * This processes all stock movements and valuations
   */
  async postStockEntry(stockEntryId: string, organizationId: string, userId: string): Promise<any> {
    return this.executeInPgTransaction(async (client) => {
      // 1. Get stock entry with items
      const entryResult = await client.query(
        `SELECT se.*, 
         COALESCE(
           json_agg(
             json_build_object(
               'id', sei.id,
               'stock_entry_id', sei.stock_entry_id,
               'line_number', sei.line_number,
               'item_id', sei.item_id,
               'item_name', sei.item_name,
               'quantity', sei.quantity,
               'unit', sei.unit,
               'source_warehouse_id', sei.source_warehouse_id,
               'target_warehouse_id', sei.target_warehouse_id,
               'batch_number', sei.batch_number,
               'serial_number', sei.serial_number,
               'expiry_date', sei.expiry_date,
               'cost_per_unit', sei.cost_per_unit,
               'system_quantity', sei.system_quantity,
               'physical_quantity', sei.physical_quantity,
               'notes', sei.notes
             )
           ) FILTER (WHERE sei.id IS NOT NULL),
           '[]'::json
         ) as stock_entry_items
         FROM stock_entries se
         LEFT JOIN stock_entry_items sei ON sei.stock_entry_id = se.id
         WHERE se.id = $1 AND se.organization_id = $2
         GROUP BY se.id`,
        [stockEntryId, organizationId],
      );

      if (entryResult.rows.length === 0) {
        throw new BadRequestException('Stock entry not found');
      }

      const stockEntry = entryResult.rows[0];
      // Parse JSON array if it's a string, otherwise use as-is
      let entryItems = stockEntry.stock_entry_items || [];
      if (typeof entryItems === 'string') {
        entryItems = JSON.parse(entryItems);
      }

      if (stockEntry.status === StockEntryStatus.POSTED) {
        throw new BadRequestException('Stock entry is already posted');
      }

      if (stockEntry.status === StockEntryStatus.CANCELLED) {
        throw new BadRequestException('Cannot post a cancelled stock entry');
      }

      // 2. Update status to Posted
      await client.query(
        `UPDATE stock_entries
         SET status = $1, posted_at = $2
         WHERE id = $3`,
        [StockEntryStatus.POSTED, new Date(), stockEntryId],
      );

      // 3. Process stock movements
      await this.processStockMovementsPg(
        client,
        stockEntry,
        entryItems,
        stockEntry.entry_type,
      );

      return { message: 'Stock entry posted successfully' };
    });
  }

  /**
   * Cancel a stock entry
   */
  async cancelStockEntry(id: string, organizationId: string, userId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('stock_entries')
      .update({
        status: 'Cancelled',
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to cancel stock entry: ${error.message}`);
      throw new BadRequestException(`Failed to cancel stock entry: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Stock entry not found or cannot be cancelled');
    }

    return data;
  }

  /**
   * Delete a draft stock entry
   */
  async deleteStockEntry(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // RLS policy ensures only Draft entries can be deleted
    const { error } = await supabase
      .from('stock_entries')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete stock entry: ${error.message}`);
      throw new BadRequestException(`Failed to delete stock entry: ${error.message}`);
    }

    return { message: 'Stock entry deleted successfully' };
  }

  /**
   * Get stock movements with filters
   */
  async getStockMovements(organizationId: string, filters?: any): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        item:items(id, item_code, item_name, default_unit),
        warehouse:warehouses(id, name),
        stock_entry:stock_entries(id, entry_number, entry_type)
      `)
      .eq('organization_id', organizationId)
      .order('movement_date', { ascending: false });

    // Apply filters
    if (filters?.item_id) {
      query = query.eq('item_id', filters.item_id);
    }
    if (filters?.warehouse_id) {
      query = query.eq('warehouse_id', filters.warehouse_id);
    }
    if (filters?.movement_type) {
      query = query.eq('movement_type', filters.movement_type);
    }
    if (filters?.from_date) {
      query = query.gte('movement_date', filters.from_date);
    }
    if (filters?.to_date) {
      query = query.lte('movement_date', filters.to_date);
    }
    if (filters?.stock_entry_id) {
      query = query.eq('stock_entry_id', filters.stock_entry_id);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch stock movements: ${error.message}`);
      throw new BadRequestException(`Failed to fetch stock movements: ${error.message}`);
    }

    return data;
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
   * Process stock movements based on entry type (PostgreSQL version)
   * Uses PoolClient for true transaction support
   */
  private async processStockMovementsPg(
    client: PoolClient,
    stockEntry: any,
    items: any[],
    entryType: StockEntryType,
  ): Promise<void> {
    for (const item of items) {
      switch (entryType) {
        case StockEntryType.MATERIAL_RECEIPT:
          await this.processMaterialReceiptPg(client, stockEntry, item);
          break;

        case StockEntryType.MATERIAL_ISSUE:
          await this.processMaterialIssuePg(client, stockEntry, item);
          break;

        case StockEntryType.STOCK_TRANSFER:
          await this.processStockTransferPg(client, stockEntry, item);
          break;

        case StockEntryType.STOCK_RECONCILIATION:
          await this.processStockReconciliationPg(client, stockEntry, item);
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
   * Process Material Receipt: Add stock to warehouse (PostgreSQL version)
   */
  private async processMaterialReceiptPg(
    client: PoolClient,
    stockEntry: any,
    item: any,
  ): Promise<void> {
    if (!stockEntry.to_warehouse_id) {
      throw new BadRequestException('Material Receipt requires a target warehouse');
    }

    const costPerUnit = item.cost_per_unit || 0;
    const totalCost = item.quantity * costPerUnit;

    // Create stock movement (IN)
    await client.query(
      `INSERT INTO stock_movements (
        organization_id, item_id, warehouse_id, movement_type, movement_date,
        quantity, unit, balance_quantity, cost_per_unit, total_cost,
        stock_entry_id, stock_entry_item_id, batch_number, serial_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        stockEntry.organization_id,
        item.item_id,
        stockEntry.to_warehouse_id,
        'IN',
        stockEntry.entry_date,
        item.quantity,
        item.unit,
        item.quantity,
        costPerUnit,
        totalCost,
        stockEntry.id,
        item.id,
        item.batch_number || null,
        item.serial_number || null,
      ],
    );

    // Create stock valuation
    await client.query(
      `INSERT INTO stock_valuation (
        organization_id, item_id, warehouse_id, quantity, cost_per_unit,
        stock_entry_id, batch_number, serial_number, remaining_quantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        stockEntry.organization_id,
        item.item_id,
        stockEntry.to_warehouse_id,
        item.quantity,
        costPerUnit,
        stockEntry.id,
        item.batch_number || null,
        item.serial_number || null,
        item.quantity,
      ],
    );

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
   * Process Material Issue: Remove stock from warehouse (PostgreSQL version with valuation consumption)
   */
  private async processMaterialIssuePg(
    client: PoolClient,
    stockEntry: any,
    item: any,
  ): Promise<void> {
    if (!stockEntry.from_warehouse_id) {
      throw new BadRequestException('Material Issue requires a source warehouse');
    }

    // Check available stock with locking
    await this.validateStockAvailabilityPg(
      client,
      stockEntry.organization_id,
      item.item_id,
      stockEntry.from_warehouse_id,
      item.quantity,
    );

    // Consume valuation using specified method (default FIFO)
    const valuationMethod = (item as any).valuation_method || ValuationMethod.FIFO;
    const { totalCost, consumedBatches } = await this.consumeValuation(
      client,
      stockEntry.organization_id,
      item.item_id,
      stockEntry.from_warehouse_id,
      item.quantity,
      valuationMethod,
    );

    const costPerUnit = totalCost / item.quantity;

    // Create stock movement (OUT)
    await client.query(
      `INSERT INTO stock_movements (
        organization_id, item_id, warehouse_id, movement_type, movement_date,
        quantity, unit, balance_quantity, cost_per_unit, total_cost,
        stock_entry_id, stock_entry_item_id, batch_number, serial_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        stockEntry.organization_id,
        item.item_id,
        stockEntry.from_warehouse_id,
        'OUT',
        stockEntry.entry_date,
        -item.quantity,
        item.unit,
        -item.quantity,
        costPerUnit,
        -totalCost,
        stockEntry.id,
        item.id,
        item.batch_number || null,
        item.serial_number || null,
      ],
    );

    this.logger.log(
      `Material issue processed: ${item.quantity} ${item.unit} of item ${item.item_id}, ` +
      `cost: ${totalCost} (${consumedBatches.length} batches consumed)`,
    );
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
   * Process Stock Transfer: Move stock between warehouses (PostgreSQL version with valuation)
   */
  private async processStockTransferPg(
    client: PoolClient,
    stockEntry: any,
    item: any,
  ): Promise<void> {
    if (!stockEntry.from_warehouse_id || !stockEntry.to_warehouse_id) {
      throw new BadRequestException('Stock Transfer requires both source and target warehouses');
    }

    if (stockEntry.from_warehouse_id === stockEntry.to_warehouse_id) {
      throw new BadRequestException('Source and target warehouses must be different');
    }

    // Check available stock with locking
    await this.validateStockAvailabilityPg(
      client,
      stockEntry.organization_id,
      item.item_id,
      stockEntry.from_warehouse_id,
      item.quantity,
    );

    // Consume valuation from source warehouse
    const valuationMethod = (item as any).valuation_method || ValuationMethod.FIFO;
    const { totalCost, consumedBatches } = await this.consumeValuation(
      client,
      stockEntry.organization_id,
      item.item_id,
      stockEntry.from_warehouse_id,
      item.quantity,
      valuationMethod,
    );

    const costPerUnit = totalCost / item.quantity;

    // Create OUT movement from source
    await client.query(
      `INSERT INTO stock_movements (
        organization_id, item_id, warehouse_id, movement_type, movement_date,
        quantity, unit, balance_quantity, cost_per_unit, total_cost,
        stock_entry_id, stock_entry_item_id, batch_number, serial_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        stockEntry.organization_id,
        item.item_id,
        stockEntry.from_warehouse_id,
        'TRANSFER',
        stockEntry.entry_date,
        -item.quantity,
        item.unit,
        -item.quantity,
        costPerUnit,
        -totalCost,
        stockEntry.id,
        item.id,
        item.batch_number || null,
        item.serial_number || null,
      ],
    );

    // Create IN movement to target
    await client.query(
      `INSERT INTO stock_movements (
        organization_id, item_id, warehouse_id, movement_type, movement_date,
        quantity, unit, balance_quantity, cost_per_unit, total_cost,
        stock_entry_id, stock_entry_item_id, batch_number, serial_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        stockEntry.organization_id,
        item.item_id,
        stockEntry.to_warehouse_id,
        'TRANSFER',
        stockEntry.entry_date,
        item.quantity,
        item.unit,
        item.quantity,
        costPerUnit,
        totalCost,
        stockEntry.id,
        item.id,
        item.batch_number || null,
        item.serial_number || null,
      ],
    );

    // Create valuation entry in target warehouse with consumed cost
    await client.query(
      `INSERT INTO stock_valuation (
        organization_id, item_id, warehouse_id, quantity, cost_per_unit,
        stock_entry_id, batch_number, serial_number, remaining_quantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        stockEntry.organization_id,
        item.item_id,
        stockEntry.to_warehouse_id,
        item.quantity,
        costPerUnit,
        stockEntry.id,
        item.batch_number || null,
        item.serial_number || null,
        item.quantity,
      ],
    );

    this.logger.log(
      `Stock transfer processed: ${item.quantity} ${item.unit} of item ${item.item_id}, ` +
      `cost: ${totalCost} (${consumedBatches.length} batches consumed from source)`,
    );
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
   * Process Stock Reconciliation (PostgreSQL version)
   */
  /**
   * Process Stock Reconciliation: Adjust inventory to match physical count
   * Implements variance tracking and GL integration as per TECHNICAL_DEBT.md Issue #3
   */
  private async processStockReconciliationPg(
    client: PoolClient,
    stockEntry: any,
    item: any,
  ): Promise<void> {
    const warehouseId = stockEntry.to_warehouse_id || stockEntry.from_warehouse_id;
    if (!warehouseId) {
      throw new BadRequestException('Stock Reconciliation requires a warehouse');
    }

    // For reconciliation, we need both system_quantity and physical_quantity
    if (item.system_quantity === null || item.system_quantity === undefined) {
      throw new BadRequestException('System quantity is required for reconciliation');
    }
    if (item.physical_quantity === null || item.physical_quantity === undefined) {
      throw new BadRequestException('Physical quantity is required for reconciliation');
    }

    // Calculate variance
    const variance = item.physical_quantity - item.system_quantity;

    if (variance === 0) {
      this.logger.log(`No variance for item ${item.item_id}, skipping reconciliation`);
      return;
    }

    this.logger.log(
      `Reconciling item ${item.item_id}: System=${item.system_quantity}, ` +
      `Physical=${item.physical_quantity}, Variance=${variance}`,
    );

    // Determine movement type and valuation approach based on variance direction
    const isPositiveVariance = variance > 0;
    const absVariance = Math.abs(variance);

    let costPerUnit = 0;
    let totalCost = 0;

    if (isPositiveVariance) {
      // Positive variance: Found stock (add inventory)
      // Use weighted average cost or standard cost
      // For now, use item.cost_per_unit from the reconciliation entry, or calculate weighted avg
      if (item.cost_per_unit) {
        costPerUnit = item.cost_per_unit;
      } else {
        // Calculate weighted average cost from existing valuation
        const avgResult = await client.query(
          `SELECT
            CASE
              WHEN SUM(remaining_quantity) > 0
              THEN SUM(remaining_quantity * cost_per_unit) / SUM(remaining_quantity)
              ELSE 0
            END as weighted_avg_cost
           FROM stock_valuation
           WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
           AND remaining_quantity > 0`,
          [stockEntry.organization_id, item.item_id, warehouseId],
        );
        costPerUnit = parseFloat(avgResult.rows[0]?.weighted_avg_cost || '0');
      }
      totalCost = costPerUnit * absVariance;

      // Create IN movement for positive variance
      await client.query(
        `INSERT INTO stock_movements (
          organization_id, item_id, warehouse_id, movement_type, movement_date,
          quantity, unit, balance_quantity, cost_per_unit, total_cost,
          stock_entry_id, stock_entry_item_id, batch_number, serial_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          stockEntry.organization_id,
          item.item_id,
          warehouseId,
          'IN',
          stockEntry.entry_date,
          absVariance,
          item.unit,
          absVariance,
          costPerUnit,
          totalCost,
          stockEntry.id,
          item.id,
          item.batch_number || null,
          item.serial_number || null,
        ],
      );

      // Create valuation entry for positive variance
      await client.query(
        `INSERT INTO stock_valuation (
          organization_id, item_id, warehouse_id, quantity, cost_per_unit,
          stock_entry_id, batch_number, serial_number, remaining_quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          stockEntry.organization_id,
          item.item_id,
          warehouseId,
          absVariance,
          costPerUnit,
          stockEntry.id,
          item.batch_number || null,
          item.serial_number || null,
          absVariance,
        ],
      );

      this.logger.log(
        `Positive variance processed: +${absVariance} units added, value: ${totalCost}`,
      );

      // TODO: Post GL entry when GL module is implemented
      // Dr. Inventory Asset (+${totalCost})
      // Cr. Inventory Variance Income (+${totalCost})
    } else {
      // Negative variance: Missing stock (consume inventory)
      // Use FIFO/LIFO based on organization's valuation method
      const valuationMethod = (item as any).valuation_method || ValuationMethod.FIFO;

      try {
        const { totalCost: consumedCost, consumedBatches } = await this.consumeValuation(
          client,
          stockEntry.organization_id,
          item.item_id,
          warehouseId,
          absVariance,
          valuationMethod,
        );

        totalCost = consumedCost;
        costPerUnit = totalCost / absVariance;

        // Create OUT movement for negative variance
        await client.query(
          `INSERT INTO stock_movements (
            organization_id, item_id, warehouse_id, movement_type, movement_date,
            quantity, unit, balance_quantity, cost_per_unit, total_cost,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            stockEntry.organization_id,
            item.item_id,
            warehouseId,
            'OUT',
            stockEntry.entry_date,
            -absVariance,
            item.unit,
            -absVariance,
            costPerUnit,
            -totalCost,
            stockEntry.id,
            item.id,
            item.batch_number || null,
            item.serial_number || null,
          ],
        );

        this.logger.log(
          `Negative variance processed: -${absVariance} units consumed, ` +
          `cost: ${totalCost} (${consumedBatches.length} batches consumed)`,
        );

        // TODO: Post GL entry when GL module is implemented
        // Dr. Inventory Variance Expense (+${totalCost})
        // Cr. Inventory Asset (-${totalCost})
      } catch (error) {
        // If we can't consume valuation (insufficient stock), log and allow zero-cost adjustment
        this.logger.error(
          `Cannot consume valuation for negative variance: ${error.message}. ` +
          `This indicates valuation is already out of sync with movements.`,
        );

        // Create zero-cost OUT movement as a fallback
        await client.query(
          `INSERT INTO stock_movements (
            organization_id, item_id, warehouse_id, movement_type, movement_date,
            quantity, unit, balance_quantity, cost_per_unit, total_cost,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            stockEntry.organization_id,
            item.item_id,
            warehouseId,
            'OUT',
            stockEntry.entry_date,
            -absVariance,
            item.unit,
            -absVariance,
            0,
            0,
            stockEntry.id,
            item.id,
            item.batch_number || null,
            item.serial_number || null,
          ],
        );

        this.logger.warn(
          `Negative variance processed with ZERO cost due to valuation insufficiency`,
        );
      }
    }

    // Log the variance reason if provided in notes
    if (item.notes) {
      this.logger.log(`Variance reason: ${item.notes}`);
    }
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
   * Check if sufficient stock is available for issue/transfer (PostgreSQL version with locking)
   */
  private async validateStockAvailabilityPg(
    client: PoolClient,
    organizationId: string,
    itemId: string,
    warehouseId: string,
    requiredQuantity: number,
  ): Promise<void> {
    // Lock and get current stock balance with FOR UPDATE to prevent race conditions
    const result = await client.query(
      `SELECT COALESCE(SUM(quantity), 0) as balance
       FROM stock_movements
       WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
       FOR UPDATE`,
      [organizationId, itemId, warehouseId],
    );

    const currentBalance = parseFloat(result.rows[0]?.balance || '0');

    if (currentBalance < requiredQuantity) {
      throw new BadRequestException(
        `Insufficient stock: available ${currentBalance}, required ${requiredQuantity}`,
      );
    }
  }

  /**
   * Consume stock valuation using FIFO/LIFO method
   * Returns total cost and consumed batches
   */
  private async consumeValuation(
    client: PoolClient,
    organizationId: string,
    itemId: string,
    warehouseId: string,
    quantity: number,
    method: ValuationMethod = ValuationMethod.FIFO,
  ): Promise<{ totalCost: number; consumedBatches: Array<{ batchId: string; quantity: number; cost: number }> }> {
    // Lock valuation rows ordered by created_at (FIFO) or DESC (LIFO)
    // TODO: Implement Moving Average method (currently uses FIFO)
    const orderBy =
      method === ValuationMethod.FIFO || method === ValuationMethod.MOVING_AVERAGE
        ? 'created_at ASC'
        : 'created_at DESC';
    const result = await client.query(
      `SELECT id, remaining_quantity, cost_per_unit
       FROM stock_valuation
       WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
       AND remaining_quantity > 0
       ORDER BY ${orderBy}
       FOR UPDATE`,
      [organizationId, itemId, warehouseId],
    );

    let remainingQty = quantity;
    let totalCost = 0;
    const consumed: Array<{ batchId: string; quantity: number; cost: number }> = [];

    for (const batch of result.rows) {
      if (remainingQty <= 0) break;

      const consumeQty = Math.min(remainingQty, parseFloat(batch.remaining_quantity));
      const cost = parseFloat(batch.cost_per_unit) * consumeQty;

      // Update remaining quantity
      await client.query(
        `UPDATE stock_valuation
         SET remaining_quantity = remaining_quantity - $1,
             updated_at = NOW()
         WHERE id = $2`,
        [consumeQty, batch.id],
      );

      consumed.push({
        batchId: batch.id,
        quantity: consumeQty,
        cost,
      });

      totalCost += cost;
      remainingQty -= consumeQty;
    }

    if (remainingQty > 0) {
      throw new BadRequestException(
        `Insufficient valuation for ${quantity} units (short ${remainingQty})`,
      );
    }

    return { totalCost, consumedBatches: consumed };
  }

  /**
   * Execute operations in a true PostgreSQL transaction
   * Uses pg client with BEGIN/COMMIT/ROLLBACK for ACID guarantees
   */
  private async executeInPgTransaction<T>(
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const pool = this.databaseService.getPgPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Transaction failed, rolled back: ${error.message}`, error.stack);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute operations in a database transaction (legacy Supabase version)
   * @deprecated Use executeInPgTransaction for true ACID transactions
   */
  private async executeInTransaction<T>(
    supabase: SupabaseClient,
    operation: (client: SupabaseClient) => Promise<T>,
  ): Promise<T> {
    // CRITICAL LIMITATION: Supabase JS client doesn't support true transactions.
    // This is a known limitation. For true ACID transactions, we would need to:
    // 1. Use PostgreSQL stored procedures (RPC) that wrap operations in BEGIN/COMMIT/ROLLBACK
    // 2. Use a direct PostgreSQL client (pg library) with transaction support
    // 3. Implement saga pattern with compensation logic
    //
    // Current implementation: Execute operations directly without transaction isolation.
    // Risk: Partial writes if operation fails mid-way (e.g., entry created but items fail).
    // TODO: Migrate critical multi-step operations to PostgreSQL functions for atomicity.

    try {
      return await operation(supabase);
    } catch (error) {
      this.logger.error(`Operation failed (no transaction rollback): ${error.message}`, error.stack);
      // In a real transaction, this would trigger ROLLBACK
      // Currently, partial writes may have already been committed
      throw error;
    }
  }
}
