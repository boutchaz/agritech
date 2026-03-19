import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { CreateStockEntryDto, StockEntryType, StockEntryStatus, ValuationMethod } from './dto/create-stock-entry.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';
import { OpeningStockFiltersDto } from './dto/opening-stock-filters.dto';
import { CreateOpeningStockDto } from './dto/create-opening-stock.dto';
import { UpdateOpeningStockDto } from './dto/update-opening-stock.dto';
import { CreateStockAccountMappingDto, UpdateStockAccountMappingDto } from './dto/stock-account-mapping.dto';
import { StockAccountingService } from './stock-accounting.service';

@Injectable()
export class StockEntriesService {
  private readonly logger = new Logger(StockEntriesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
    private readonly stockAccountingService: StockAccountingService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
          item:items(id, item_code, item_name, default_unit),
          variant:product_variants(id, variant_name, unit)
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

    // Generate entry number if not provided
    let entryNumber = dto.entry_number;
    if (!entryNumber) {
      entryNumber = await this.sequencesService.generateStockEntryNumber(dto.organization_id);
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

        // 4. Create journal entry for accounting integration
        const accountingResult = await this.stockAccountingService.createJournalEntryForStockEntry(
          client,
          stockEntry,
          entryItems,
        );

        // If accounting failed and it's not a stock transfer (which has no accounting impact),
        // throw an error to rollback the transaction
        if (!accountingResult.success && accountingResult.error) {
          this.logger.error(`Accounting integration failed: ${accountingResult.error}`);
          throw new BadRequestException(
            `Failed to create accounting entry: ${accountingResult.error}`,
          );
        }
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
    return this.executeInPgTransaction(async (client) => {
      // Check if entry exists and is in Draft status
      const entryResult = await client.query(
        `SELECT id, status, organization_id
         FROM stock_entries
         WHERE id = $1 AND organization_id = $2`,
        [id, organizationId],
      );

      if (entryResult.rows.length === 0) {
        throw new NotFoundException('Stock entry not found or access denied');
      }

      const entry = entryResult.rows[0];

      if (entry.status !== 'Draft') {
        throw new BadRequestException('Only draft entries can be updated');
      }

      // Build dynamic update query based on provided fields
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Add each field from dto if provided
      const allowedFields = [
        'entry_type',
        'entry_date',
        'from_warehouse_id',
        'to_warehouse_id',
        'reference_type',
        'reference_id',
        'reference_number',
        'purpose',
        'notes',
      ];

      for (const field of allowedFields) {
        if (dto[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex++}`);
          values.push(dto[field]);
        }
      }

      // Always update updated_by and updated_at
      updateFields.push(`updated_by = $${paramIndex++}`);
      values.push(userId);
      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      // Add WHERE clause parameters
      values.push(id);
      values.push(organizationId);

      if (updateFields.length === 0) {
        return entry; // Nothing to update
      }

      const updateResult = await client.query(
        `UPDATE stock_entries
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex++} AND organization_id = $${paramIndex++}
         RETURNING *`,
        values,
      );

      if (updateResult.rows.length === 0) {
        throw new BadRequestException('Failed to update stock entry');
      }

      return updateResult.rows[0];
    });
  }

  /**
   * Post a draft stock entry
   * This processes all stock movements and valuations
   */
  async postStockEntry(stockEntryId: string, organizationId: string, userId: string): Promise<any> {
    const result = await this.executeInPgTransaction(async (client) => {
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
              'variant_id', sei.variant_id,
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

      // 2. Re-validate before posting (TECHNICAL_DEBT.md Issue #6)
      // Drafts could be hours/days old with stale data
      await this.revalidateBeforePosting(client, stockEntry, entryItems);

      // 3. Update status to Posted
      await client.query(
        `UPDATE stock_entries
         SET status = $1, posted_at = $2
         WHERE id = $3`,
        [StockEntryStatus.POSTED, new Date(), stockEntryId],
      );

      // 4. Process stock movements
      await this.processStockMovementsPg(
        client,
        stockEntry,
        entryItems,
        stockEntry.entry_type,
      );

      // 5. Create journal entry for accounting integration
      const accountingResult = await this.stockAccountingService.createJournalEntryForStockEntry(
        client,
        stockEntry,
        entryItems,
      );

      // If accounting failed and it's not a stock transfer (which has no accounting impact),
      // throw an error to rollback the transaction
      if (!accountingResult.success && accountingResult.error) {
        this.logger.error(`Accounting integration failed: ${accountingResult.error}`);
        throw new BadRequestException(
          `Failed to create accounting entry: ${accountingResult.error}`,
        );
      }

      return { message: 'Stock entry posted successfully', stockEntry };
    });

    try {
      const client = this.databaseService.getAdminClient();
      const { data: orgUsers } = await client
        .from('organization_users')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      const userIds = (orgUsers || [])
        .map((u: { user_id: string }) => u.user_id)
        .filter((id: string) => id !== userId);

      if (userIds.length > 0) {
        const entryTypeLabels: Record<string, string> = {
          material_receipt: 'Material Receipt',
          material_issue: 'Material Issue',
          stock_transfer: 'Stock Transfer',
          stock_reconciliation: 'Stock Reconciliation',
        };
        const label = entryTypeLabels[result.stockEntry?.entry_type] || 'Stock Entry';

        await this.notificationsService.createNotificationsForUsers(
          userIds,
          organizationId,
          NotificationType.STOCK_ENTRY_CREATED,
          `${label} #${result.stockEntry?.entry_number} posted`,
          `${label} has been posted and stock levels updated`,
          { stockEntryId, entryType: result.stockEntry?.entry_type, entryNumber: result.stockEntry?.entry_number },
        );
      }
    } catch (notifError) {
      this.logger.warn(`Failed to send stock entry notification: ${notifError}`);
    }

    return result;
  }

  /**
   * Cancel a stock entry
   */
  async cancelStockEntry(id: string, organizationId: string, userId: string): Promise<any> {
    return this.executeInPgTransaction(async (client) => {
      // Update status to Cancelled
      const result = await client.query(
        `UPDATE stock_entries
         SET status = $1, updated_at = $2, updated_by = $3
         WHERE id = $4 AND organization_id = $5
         RETURNING *`,
        ['Cancelled', new Date(), userId, id, organizationId],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('Stock entry not found or cannot be cancelled');
      }

      return result.rows[0];
    });
  }

  /**
   * Delete a draft stock entry
   */
  async deleteStockEntry(id: string, organizationId: string): Promise<any> {
    return this.executeInPgTransaction(async (client) => {
      // Verify entry exists and is in Draft status before deleting
      const checkResult = await client.query(
        `SELECT id, status FROM stock_entries
         WHERE id = $1 AND organization_id = $2`,
        [id, organizationId],
      );

      if (checkResult.rows.length === 0) {
        throw new NotFoundException('Stock entry not found');
      }

      const entry = checkResult.rows[0];
      if (entry.status !== 'Draft') {
        throw new BadRequestException('Only draft entries can be deleted');
      }

      // Delete associated items first (foreign key constraint)
      await client.query(
        `DELETE FROM stock_entry_items WHERE stock_entry_id = $1`,
        [id],
      );

      // Delete the entry
      await client.query(
        `DELETE FROM stock_entries
         WHERE id = $1 AND organization_id = $2`,
        [id, organizationId],
      );

      return { message: 'Stock entry deleted successfully' };
    });
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
        organization_id, item_id, variant_id, warehouse_id, movement_type, movement_date,
        quantity, unit, balance_quantity, cost_per_unit, total_cost,
        stock_entry_id, stock_entry_item_id, batch_number, serial_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        stockEntry.organization_id,
        item.item_id,
        item.variant_id || null,
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
        organization_id, item_id, variant_id, warehouse_id, quantity, cost_per_unit,
        stock_entry_id, batch_number, serial_number, remaining_quantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        stockEntry.organization_id,
        item.item_id,
        item.variant_id || null,
        stockEntry.to_warehouse_id,
        item.quantity,
        costPerUnit,
        stockEntry.id,
        item.batch_number || null,
        item.serial_number || null,
        item.quantity,
      ],
    );

    // Update variant quantity if variant_id is present
    if (item.variant_id) {
      await client.query(
        `UPDATE product_variants
         SET quantity = (
           SELECT COALESCE(SUM(quantity), 0)
           FROM stock_movements
           WHERE stock_movements.variant_id = $1
             AND stock_movements.item_id = $2
         ),
         updated_at = NOW()
         WHERE id = $1 AND item_id = $2`,
        [item.variant_id, item.item_id],
      );
    }

    this.logger.log(`Material receipt processed: ${item.quantity} ${item.unit} of item ${item.item_id}`);
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
      item.variant_id || null,
      stockEntry.from_warehouse_id,
      item.quantity,
    );

    // Consume valuation using specified method (default FIFO)
    const valuationMethod = (item as any).valuation_method || ValuationMethod.FIFO;
    const { totalCost, consumedBatches } = await this.consumeValuation(
      client,
      stockEntry.organization_id,
      item.item_id,
      item.variant_id || null,
      stockEntry.from_warehouse_id,
      item.quantity,
      valuationMethod,
    );

    const costPerUnit = totalCost / item.quantity;

    // Create stock movement (OUT)
    await client.query(
      `INSERT INTO stock_movements (
        organization_id, item_id, variant_id, warehouse_id, movement_type, movement_date,
        quantity, unit, balance_quantity, cost_per_unit, total_cost,
        stock_entry_id, stock_entry_item_id, batch_number, serial_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        stockEntry.organization_id,
        item.item_id,
        item.variant_id || null,
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

    // Update variant quantity if variant_id is present
    if (item.variant_id) {
      await client.query(
        `UPDATE product_variants
         SET quantity = (
           SELECT COALESCE(SUM(quantity), 0)
           FROM stock_movements
           WHERE stock_movements.variant_id = $1
             AND stock_movements.item_id = $2
         ),
         updated_at = NOW()
         WHERE id = $1 AND item_id = $2`,
        [item.variant_id, item.item_id],
      );
    }

    this.logger.log(
      `Material issue processed: ${item.quantity} ${item.unit} of item ${item.item_id}, ` +
      `cost: ${totalCost} (${consumedBatches.length} batches consumed)`,
    );
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
      item.variant_id || null,
      stockEntry.from_warehouse_id,
      item.quantity,
    );

    // Consume valuation from source warehouse
    const valuationMethod = (item as any).valuation_method || ValuationMethod.FIFO;
    const { totalCost, consumedBatches } = await this.consumeValuation(
      client,
      stockEntry.organization_id,
      item.item_id,
      item.variant_id || null,
      stockEntry.from_warehouse_id,
      item.quantity,
      valuationMethod,
    );

    const costPerUnit = totalCost / item.quantity;

    // Create OUT movement from source
    await client.query(
      `INSERT INTO stock_movements (
        organization_id, item_id, variant_id, warehouse_id, movement_type, movement_date,
        quantity, unit, balance_quantity, cost_per_unit, total_cost,
        stock_entry_id, stock_entry_item_id, batch_number, serial_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        stockEntry.organization_id,
        item.item_id,
        item.variant_id || null,
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
        organization_id, item_id, variant_id, warehouse_id, movement_type, movement_date,
        quantity, unit, balance_quantity, cost_per_unit, total_cost,
        stock_entry_id, stock_entry_item_id, batch_number, serial_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        stockEntry.organization_id,
        item.item_id,
        item.variant_id || null,
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
        organization_id, item_id, variant_id, warehouse_id, quantity, cost_per_unit,
        stock_entry_id, batch_number, serial_number, remaining_quantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        stockEntry.organization_id,
        item.item_id,
        item.variant_id || null,
        stockEntry.to_warehouse_id,
        item.quantity,
        costPerUnit,
        stockEntry.id,
        item.batch_number || null,
        item.serial_number || null,
        item.quantity,
      ],
    );

    // Update variant quantity if variant_id is present
    if (item.variant_id) {
      await client.query(
        `UPDATE product_variants
         SET quantity = (
           SELECT COALESCE(SUM(quantity), 0)
           FROM stock_movements
           WHERE stock_movements.variant_id = $1
             AND stock_movements.item_id = $2
         ),
         updated_at = NOW()
         WHERE id = $1 AND item_id = $2`,
        [item.variant_id, item.item_id],
      );
    }

    this.logger.log(
      `Stock transfer processed: ${item.quantity} ${item.unit} of item ${item.item_id}, ` +
      `cost: ${totalCost} (${consumedBatches.length} batches consumed from source)`,
    );
  }

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
          organization_id, item_id, variant_id, warehouse_id, movement_type, movement_date,
          quantity, unit, balance_quantity, cost_per_unit, total_cost,
          stock_entry_id, stock_entry_item_id, batch_number, serial_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          stockEntry.organization_id,
          item.item_id,
          item.variant_id || null,
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
          organization_id, item_id, variant_id, warehouse_id, quantity, cost_per_unit,
          stock_entry_id, batch_number, serial_number, remaining_quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          stockEntry.organization_id,
          item.item_id,
          item.variant_id || null,
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
          item.variant_id || null,
          warehouseId,
          absVariance,
          valuationMethod,
        );

        totalCost = consumedCost;
        costPerUnit = totalCost / absVariance;

        // Create OUT movement for negative variance
        await client.query(
          `INSERT INTO stock_movements (
            organization_id, item_id, variant_id, warehouse_id, movement_type, movement_date,
            quantity, unit, balance_quantity, cost_per_unit, total_cost,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            stockEntry.organization_id,
            item.item_id,
            item.variant_id || null,
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
        // Critical: valuation out of sync with movements
        // Do NOT allow zero-cost adjustments as they hide the drift
        this.logger.error(
          `Cannot consume valuation for negative variance: ${error.message}. ` +
          `This indicates valuation is already out of sync with movements. ` +
          `Stock reconciliation cannot proceed until valuation data is corrected.`,
        );

        throw new BadRequestException(
          `Cannot process reconciliation: Insufficient valuation to consume ${absVariance} units. ` +
          `This indicates stock valuation is out of sync. ` +
          `Available movements suggest stock exists, but no valuation batches are available to consume. ` +
          `Please contact system administrator to reconcile stock_movements and stock_valuation tables. ` +
          `Original error: ${error.message}`,
        );
      }
    }

    // Log the variance reason if provided in notes
    if (item.notes) {
      this.logger.log(`Variance reason: ${item.notes}`);
    }

    // Update variant quantity if variant_id is present
    if (item.variant_id) {
      await client.query(
        `UPDATE product_variants
         SET quantity = (
           SELECT COALESCE(SUM(quantity), 0)
           FROM stock_movements
           WHERE stock_movements.variant_id = $1
             AND stock_movements.item_id = $2
         ),
         updated_at = NOW()
         WHERE id = $1 AND item_id = $2`,
        [item.variant_id, item.item_id],
      );
    }
  }

  /**
   * Validate stock entry data
   * Implements validation from TECHNICAL_DEBT.md Issue #5
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

      case StockEntryType.STOCK_RECONCILIATION:
        if (!dto.to_warehouse_id && !dto.from_warehouse_id) {
          throw new BadRequestException('Stock Reconciliation requires a warehouse');
        }
        break;
    }

    // Validate items
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Stock entry must have at least one item');
    }

    // Validate each item
    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];
      const itemNumber = i + 1;

      // Basic quantity validation
      if (item.quantity <= 0) {
        throw new BadRequestException(`Item #${itemNumber}: Quantity must be greater than zero`);
      }

      // Issue #5: Validate item-level warehouses match entry-level warehouses
      switch (dto.entry_type) {
        case StockEntryType.MATERIAL_RECEIPT:
          if (item.target_warehouse_id && item.target_warehouse_id !== dto.to_warehouse_id) {
            throw new BadRequestException(
              `Item #${itemNumber}: target_warehouse_id (${item.target_warehouse_id}) ` +
              `must match entry to_warehouse_id (${dto.to_warehouse_id})`
            );
          }
          break;

        case StockEntryType.MATERIAL_ISSUE:
          if (item.source_warehouse_id && item.source_warehouse_id !== dto.from_warehouse_id) {
            throw new BadRequestException(
              `Item #${itemNumber}: source_warehouse_id (${item.source_warehouse_id}) ` +
              `must match entry from_warehouse_id (${dto.from_warehouse_id})`
            );
          }
          break;

        case StockEntryType.STOCK_TRANSFER:
          if (item.source_warehouse_id && item.source_warehouse_id !== dto.from_warehouse_id) {
            throw new BadRequestException(
              `Item #${itemNumber}: source_warehouse_id (${item.source_warehouse_id}) ` +
              `must match entry from_warehouse_id (${dto.from_warehouse_id})`
            );
          }
          if (item.target_warehouse_id && item.target_warehouse_id !== dto.to_warehouse_id) {
            throw new BadRequestException(
              `Item #${itemNumber}: target_warehouse_id (${item.target_warehouse_id}) ` +
              `must match entry to_warehouse_id (${dto.to_warehouse_id})`
            );
          }
          break;

        case StockEntryType.STOCK_RECONCILIATION:
          // For reconciliation, system_quantity and physical_quantity are required
          if (item.system_quantity === null || item.system_quantity === undefined) {
            throw new BadRequestException(`Item #${itemNumber}: system_quantity is required for reconciliation`);
          }
          if (item.physical_quantity === null || item.physical_quantity === undefined) {
            throw new BadRequestException(`Item #${itemNumber}: physical_quantity is required for reconciliation`);
          }
          break;
      }
    }
  }


  /**
   * Check if sufficient stock is available for issue/transfer (PostgreSQL version with locking)
   */
  private async validateStockAvailabilityPg(
    client: PoolClient,
    organizationId: string,
    itemId: string,
    variantId: string | null,
    warehouseId: string,
    requiredQuantity: number,
  ): Promise<void> {
    // First, lock the relevant rows to prevent race conditions
    // We lock the stock_movements rows for this item/warehouse combination
    await client.query(
      `SELECT id FROM stock_movements
       WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
       AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))
       FOR UPDATE`,
      [organizationId, itemId, warehouseId, variantId],
    );

    // Then calculate the balance (rows are now locked within this transaction)
    const result = await client.query(
      `SELECT COALESCE(SUM(quantity), 0) as balance
       FROM stock_movements
       WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
       AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))`,
      [organizationId, itemId, warehouseId, variantId],
    );

    const currentBalance = parseFloat(result.rows[0]?.balance || '0');

    if (currentBalance < requiredQuantity) {
      throw new BadRequestException(
        `Insufficient stock: available ${currentBalance}, required ${requiredQuantity}`,
      );
    }
  }

  /**
   * Re-validate stock entry before posting
   * Implements TECHNICAL_DEBT.md Issue #6
   * Prevents posting drafts with stale data (items/warehouses deleted, insufficient stock, etc.)
   */
  private async revalidateBeforePosting(
    client: PoolClient,
    stockEntry: any,
    items: any[],
  ): Promise<void> {
    const entryType = stockEntry.entry_type as StockEntryType;

    // 1. Validate items still exist and are active
    for (const item of items) {
      const itemResult = await client.query(
        `SELECT id, item_name, is_active FROM items
         WHERE id = $1 AND organization_id = $2`,
        [item.item_id, stockEntry.organization_id],
      );

      if (itemResult.rows.length === 0) {
        throw new BadRequestException(
          `Item ${item.item_id} no longer exists. Please remove it from the draft.`,
        );
      }

      const dbItem = itemResult.rows[0];
      if (!dbItem.is_active) {
        this.logger.warn(
          `Posting draft with inactive item ${item.item_id} (${dbItem.item_name})`,
        );
        // Don't block, just warn - organization may want to process existing drafts
      }
    }

    // 2. Validate warehouses still exist and are active
    const warehouseIds = [stockEntry.from_warehouse_id, stockEntry.to_warehouse_id].filter(Boolean);
    for (const warehouseId of warehouseIds) {
      const whResult = await client.query(
        `SELECT id, name, is_active FROM warehouses
         WHERE id = $1 AND organization_id = $2`,
        [warehouseId, stockEntry.organization_id],
      );

      if (whResult.rows.length === 0) {
        throw new BadRequestException(
          `Warehouse ${warehouseId} no longer exists. Cannot post this entry.`,
        );
      }

      const warehouse = whResult.rows[0];
      if (!warehouse.is_active) {
        throw new BadRequestException(
          `Warehouse "${warehouse.name}" is inactive. Cannot post to inactive warehouse.`,
        );
      }
    }

    // 3. Re-validate stock availability for issues and transfers
    if (
      entryType === StockEntryType.MATERIAL_ISSUE ||
      entryType === StockEntryType.STOCK_TRANSFER
    ) {
      const sourceWarehouse = stockEntry.from_warehouse_id;
      if (!sourceWarehouse) {
        throw new BadRequestException('Source warehouse is required for this entry type');
      }

      for (const item of items) {
        await this.validateStockAvailabilityPg(
          client,
          stockEntry.organization_id,
          item.item_id,
          item.variant_id || null,
          sourceWarehouse,
          item.quantity,
        );
      }

      this.logger.log(
        `Re-validated stock availability for ${items.length} items in draft ${stockEntry.entry_number}`,
      );
    }

    // 4. Check for significant cost changes (warn only, don't block)
    if (entryType === StockEntryType.MATERIAL_RECEIPT && items.some((i) => i.cost_per_unit)) {
      for (const item of items) {
        if (!item.cost_per_unit) continue;

        // Get recent average cost
        const avgResult = await client.query(
          `SELECT AVG(cost_per_unit) as avg_cost
           FROM stock_valuation
           WHERE organization_id = $1 AND item_id = $2
           AND created_at >= NOW() - INTERVAL '30 days'
           AND cost_per_unit > 0`,
          [stockEntry.organization_id, item.item_id],
        );

        const avgCost = parseFloat(avgResult.rows[0]?.avg_cost || '0');
        if (avgCost > 0) {
          const variance = Math.abs((item.cost_per_unit - avgCost) / avgCost);
          if (variance > 0.5) {
            // More than 50% variance
            this.logger.warn(
              `Large cost variance for item ${item.item_id}: ` +
                `draft cost ${item.cost_per_unit}, recent avg ${avgCost.toFixed(2)} (${(variance * 100).toFixed(1)}% diff)`,
            );
          }
        }
      }
    }

    this.logger.log(`Draft entry ${stockEntry.entry_number} re-validated successfully before posting`);
  }

  /**
   * Consume stock valuation using FIFO/LIFO method
   * Returns total cost and consumed batches
   */
  private async consumeValuation(
    client: PoolClient,
    organizationId: string,
    itemId: string,
    variantId: string | null,
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
         SET remaining_quantity = remaining_quantity - $1
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

  async getOpeningStockBalances(organizationId: string, filters?: OpeningStockFiltersDto): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('opening_stock_balances')
      .select(`
        *,
        item:items(id, item_code, item_name, default_unit, item_group:item_groups(name)),
        warehouse:warehouses(id, name),
        journal_entry:journal_entries(id, entry_number)
      `)
      .eq('organization_id', organizationId)
      .order('opening_date', { ascending: false });

    if (filters?.item_id) query = query.eq('item_id', filters.item_id);
    if (filters?.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.from_date) query = query.gte('opening_date', filters.from_date);
    if (filters?.to_date) query = query.lte('opening_date', filters.to_date);

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch opening stock balances: ${error.message}`);
    }

    return data || [];
  }

  async getOpeningStockBalance(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('opening_stock_balances')
      .select(`
        *,
        item:items(id, item_code, item_name, default_unit, item_group:item_groups(name)),
        warehouse:warehouses(id, name),
        journal_entry:journal_entries(id, entry_number)
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      throw new NotFoundException('Opening stock balance not found');
    }

    return data;
  }

  async createOpeningStockBalance(
    organizationId: string,
    userId: string,
    dto: CreateOpeningStockDto,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('opening_stock_balances')
      .insert({
        organization_id: organizationId,
        ...dto,
        status: 'Draft',
        created_by: userId,
      })
      .select(`
        *,
        item:items(id, item_code, item_name, default_unit, item_group:item_groups(name)),
        warehouse:warehouses(id, name)
      `)
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create opening stock balance: ${error.message}`);
    }

    return data;
  }

  async updateOpeningStockBalance(
    id: string,
    organizationId: string,
    dto: UpdateOpeningStockDto,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('opening_stock_balances')
      .update(dto)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .eq('status', 'Draft')
      .select(`
        *,
        item:items(id, item_code, item_name, default_unit, item_group:item_groups(name)),
        warehouse:warehouses(id, name)
      `)
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update opening stock balance: ${error.message}`);
    }

    return data;
  }

  async postOpeningStockBalance(id: string, organizationId: string): Promise<any> {
    return this.executeInPgTransaction(async (client) => {
      const openingStockResult = await client.query(
        `SELECT *
         FROM opening_stock_balances
         WHERE id = $1 AND organization_id = $2
         FOR UPDATE`,
        [id, organizationId],
      );

      if (openingStockResult.rows.length === 0) {
        throw new BadRequestException('Opening stock balance not found');
      }

      const openingStock = openingStockResult.rows[0];

      if (openingStock.status !== 'Draft') {
        throw new BadRequestException('Only draft opening stock balances can be posted');
      }

      const itemResult = await client.query(
        `SELECT default_unit
         FROM items
         WHERE id = $1`,
        [openingStock.item_id],
      );

      const unit = itemResult.rows[0]?.default_unit || 'unit';
      const postedAt = new Date();
      const postedBy = openingStock.posted_by || openingStock.created_by;
      const serialNumber = Array.isArray(openingStock.serial_numbers)
        ? openingStock.serial_numbers[0]
        : null;

      await client.query(
        `UPDATE opening_stock_balances
         SET status = $1,
             posted_at = $2,
             posted_by = $3
         WHERE id = $4`,
        ['Posted', postedAt, postedBy, id],
      );

      await client.query(
        `INSERT INTO stock_movements (
          organization_id,
          movement_type,
          movement_date,
          item_id,
          warehouse_id,
          quantity,
          unit,
          balance_quantity,
          cost_per_unit,
          total_cost,
          batch_number,
          serial_number,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          organizationId,
          'IN',
          openingStock.opening_date,
          openingStock.item_id,
          openingStock.warehouse_id,
          openingStock.quantity,
          unit,
          openingStock.quantity,
          openingStock.valuation_rate,
          openingStock.quantity * openingStock.valuation_rate,
          openingStock.batch_number,
          serialNumber,
          postedBy,
        ],
      );

      await client.query(
        `INSERT INTO stock_valuation (
          organization_id,
          item_id,
          warehouse_id,
          quantity,
          cost_per_unit,
          valuation_date,
          batch_number,
          serial_number,
          remaining_quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          organizationId,
          openingStock.item_id,
          openingStock.warehouse_id,
          openingStock.quantity,
          openingStock.valuation_rate,
          openingStock.opening_date,
          openingStock.batch_number,
          serialNumber,
          openingStock.quantity,
        ],
      );

      const journalResult = await client.query(
        `SELECT journal_entry_id FROM opening_stock_balances WHERE id = $1`,
        [id],
      );

      return { journal_entry_id: journalResult.rows[0]?.journal_entry_id ?? null };
    });
  }

  async cancelOpeningStockBalance(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('opening_stock_balances')
      .update({ status: 'Cancelled' })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to cancel opening stock balance: ${error.message}`);
    }

    return data;
  }

  async deleteOpeningStockBalance(id: string, organizationId: string): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    const { error } = await supabase
      .from('opening_stock_balances')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
      .eq('status', 'Draft');

    if (error) {
      throw new BadRequestException(`Failed to delete opening stock balance: ${error.message}`);
    }
  }

  async getStockAccountMappings(organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('stock_account_mappings')
      .select(`
        *,
        debit_account:accounts!stock_account_mappings_debit_account_id_fkey(id, account_number, account_name),
        credit_account:accounts!stock_account_mappings_credit_account_id_fkey(id, account_number, account_name)
      `)
      .eq('organization_id', organizationId)
      .order('entry_type');

    if (error) {
      throw new BadRequestException(`Failed to fetch stock account mappings: ${error.message}`);
    }

    return data || [];
  }

  async createStockAccountMapping(
    organizationId: string,
    dto: CreateStockAccountMappingDto,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('stock_account_mappings')
      .insert({
        organization_id: organizationId,
        ...dto,
      })
      .select(`
        *,
        debit_account:accounts!stock_account_mappings_debit_account_id_fkey(id, account_number, account_name),
        credit_account:accounts!stock_account_mappings_credit_account_id_fkey(id, account_number, account_name)
      `)
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create stock account mapping: ${error.message}`);
    }

    return data;
  }

  async updateStockAccountMapping(
    id: string,
    organizationId: string,
    dto: UpdateStockAccountMappingDto,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('stock_account_mappings')
      .update(dto)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select(`
        *,
        debit_account:accounts!stock_account_mappings_debit_account_id_fkey(id, account_number, account_name),
        credit_account:accounts!stock_account_mappings_credit_account_id_fkey(id, account_number, account_name)
      `)
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update stock account mapping: ${error.message}`);
    }

    return data;
  }

  async deleteStockAccountMapping(id: string, organizationId: string): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    const { error } = await supabase
      .from('stock_account_mappings')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(`Failed to delete stock account mapping: ${error.message}`);
    }
  }

  /**
   * Update variant quantity based on stock movements
   * This is called after stock movements are created/updated to keep variant quantities in sync
   */
  async updateVariantQuantity(
    organizationId: string,
    itemId: string,
    variantId: string,
  ): Promise<void> {
    if (!variantId) return;

    await this.executeInPgTransaction(async (client) => {
      await client.query(
        `UPDATE product_variants
         SET quantity = (
           SELECT COALESCE(SUM(quantity), 0)
           FROM stock_movements
           WHERE stock_movements.variant_id = $1
             AND stock_movements.item_id = $2
         ),
         updated_at = NOW()
         WHERE id = $1 AND item_id = $2`,
        [variantId, itemId],
      );
    });

    this.logger.debug(`Updated variant quantity: variant=${variantId}, item=${itemId}`);
  }
}
