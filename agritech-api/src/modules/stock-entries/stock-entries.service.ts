import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { sanitizeSearch } from '../../common/utils/sanitize-search';
import { paginate, type PaginatedResponse } from '../../common/dto/paginated-query.dto';
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
import { StockReservationsService } from './stock-reservations.service';
import { StockEntryApprovalsService } from './stock-entry-approvals.service';

export interface StockEntryFilters {
  entry_type?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  warehouse_id?: string;
  reference_type?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class StockEntriesService {
  private readonly logger = new Logger(StockEntriesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
    private readonly stockAccountingService: StockAccountingService,
    private readonly notificationsService: NotificationsService,
    private readonly stockReservationsService: StockReservationsService,
    private readonly stockEntryApprovalsService: StockEntryApprovalsService,
  ) {}

  /**
   * Get all stock entries with optional filters
   */
  async findAll(organizationId: string, filters?: StockEntryFilters): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();

    return paginate(client, 'stock_entries', {
      select: `
        *,
        from_warehouse:warehouses!stock_entries_from_warehouse_id_fkey(id, name),
        to_warehouse:warehouses!stock_entries_to_warehouse_id_fkey(id, name)
      `,
      filters: (q) => {
        q = q.eq('organization_id', organizationId);
        if (filters?.entry_type) q = q.eq('entry_type', filters.entry_type);
        if (filters?.status) q = q.eq('status', filters.status);
        if (filters?.from_date) q = q.gte('entry_date', filters.from_date);
        if (filters?.to_date) q = q.lte('entry_date', filters.to_date);
        if (filters?.warehouse_id) q = q.or(`from_warehouse_id.eq.${filters.warehouse_id.replace(/[,.()'"]/g, '')},to_warehouse_id.eq.${filters.warehouse_id.replace(/[,.()'"]/g, '')}`);
        if (filters?.reference_type) q = q.eq('reference_type', filters.reference_type);
        if (filters?.search) { const s = sanitizeSearch(filters.search); if (s) q = q.or(`entry_number.ilike.%${s}%,notes.ilike.%${s}%`); }
        return q;
      },
      page: filters?.page || 1,
      pageSize: filters?.pageSize || 50,
      orderBy: 'entry_date',
      ascending: false,
    });
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
          reference_number, purpose, notes, status, created_by, posted_at,
          parcel_id, crop_cycle_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
          dto.parcel_id || null,
          dto.crop_cycle_id || null,
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
            expiry_date, cost_per_unit, system_quantity, physical_quantity, variant_id, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
            item.variant_id || null,
            item.notes || null,
          ],
        );

        if (itemResult.rows.length > 0) {
          entryItems.push(itemResult.rows[0]);
        }
      }

      if (
        (dto.status ?? StockEntryStatus.DRAFT) === StockEntryStatus.DRAFT &&
        (dto.entry_type === StockEntryType.MATERIAL_ISSUE || dto.entry_type === StockEntryType.STOCK_TRANSFER)
      ) {
        for (const item of dto.items) {
          await this.stockReservationsService.reserveStock(
            {
              organizationId: dto.organization_id,
              itemId: item.item_id,
              variantId: item.variant_id,
              warehouseId: dto.from_warehouse_id!,
              quantity: item.quantity,
              reservedBy: dto.created_by!,
              referenceType: 'stock_entry',
              referenceId: stockEntry.id,
            },
            client,
          );
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
        'parcel_id',
        'crop_cycle_id',
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
      // 1. Lock stock entry row, then fetch with items
      const lockResult = await client.query(
        `SELECT * FROM stock_entries
         WHERE id = $1 AND organization_id = $2
         FOR UPDATE`,
        [stockEntryId, organizationId],
      );

      if (lockResult.rows.length === 0) {
        throw new NotFoundException('Stock entry not found');
      }

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

      const stockEntry = entryResult.rows[0];
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

      if (stockEntry.status === StockEntryStatus.REVERSED) {
        throw new BadRequestException('Cannot post a reversed stock entry');
      }

      if (stockEntry.status === StockEntryStatus.SUBMITTED) {
        await this.stockEntryApprovalsService.assertApprovedForPosting(
          stockEntryId,
          organizationId,
          client,
        );
      }

      // 2. Re-validate before posting (TECHNICAL_DEBT.md Issue #6)
      // Drafts could be hours/days old with stale data
      await this.revalidateBeforePosting(client, stockEntry, entryItems);

      // 3. Update status to Posted
      await client.query(
        `UPDATE stock_entries
         SET status = $1, posted_at = $2
         WHERE id = $3 AND organization_id = $4`,
        [StockEntryStatus.POSTED, new Date(), stockEntryId, organizationId],
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

      await this.stockReservationsService.fulfillReservationsForReference(
        'stock_entry',
        stockEntryId,
        organizationId,
        client,
      );

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
      const checkResult = await client.query(
        `SELECT id, status FROM stock_entries
         WHERE id = $1 AND organization_id = $2
         FOR UPDATE`,
        [id, organizationId],
      );

      if (checkResult.rows.length === 0) {
        throw new NotFoundException('Stock entry not found');
      }

      const entry = checkResult.rows[0];

      if (entry.status === StockEntryStatus.POSTED) {
        throw new BadRequestException(
          'Posted entries cannot be cancelled. Use reversal instead.',
        );
      }

      if (entry.status === StockEntryStatus.CANCELLED) {
        throw new BadRequestException('Stock entry is already cancelled');
      }

      if (entry.status === StockEntryStatus.REVERSED) {
        throw new BadRequestException('Cannot cancel a reversed stock entry');
      }

      await this.stockReservationsService.releaseReservationsForReference(
        'stock_entry',
        id,
        organizationId,
        client,
      );

      const result = await client.query(
        `UPDATE stock_entries
         SET status = $1, updated_at = $2, updated_by = $3
         WHERE id = $4 AND organization_id = $5
         RETURNING *`,
        ['Cancelled', new Date(), userId, id, organizationId],
      );

      return result.rows[0];
    });
  }

  /**
   * Reverse a posted stock entry by creating opposite movements.
   * Material Receipt → creates OUT movements (remove stock)
   * Material Issue → creates IN movements (restore stock)
   * Stock Transfer → reverse transfer (move stock back)
   * Stock Reconciliation → reverse the reconciliation adjustment
   */
  async reverseStockEntry(
    stockEntryId: string,
    organizationId: string,
    userId: string,
    reason: string,
  ): Promise<any> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Reversal reason is required');
    }

    return this.executeInPgTransaction(async (client) => {
      // 1. Fetch the original entry with items (lock the row)
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
         GROUP BY se.id
         FOR UPDATE OF se`,
        [stockEntryId, organizationId],
      );

      if (entryResult.rows.length === 0) {
        throw new NotFoundException('Stock entry not found');
      }

      const originalEntry = entryResult.rows[0];
      let originalItems = originalEntry.stock_entry_items || [];
      if (typeof originalItems === 'string') {
        originalItems = JSON.parse(originalItems);
      }

      // 2. Validate: only Posted entries can be reversed
      if (originalEntry.status !== StockEntryStatus.POSTED) {
        throw new BadRequestException(
          `Only posted entries can be reversed. Current status: ${originalEntry.status}`,
        );
      }

      // 3. Check it hasn't already been reversed
      const reversalCheck = await client.query(
        `SELECT id, entry_number FROM stock_entries
         WHERE reference_type = 'reversal' AND reference_id = $1
         AND organization_id = $2 AND status != 'Cancelled'
         LIMIT 1`,
        [stockEntryId, organizationId],
      );
      if (reversalCheck.rows.length > 0) {
        throw new BadRequestException(
          `Stock entry already reversed by ${reversalCheck.rows[0].entry_number}`,
        );
      }

      // 4. Generate reversal entry number
      const reversalNumber = await this.sequencesService.generateStockEntryNumber(organizationId);

      // 5. Create the reversal stock entry header
      const reversalResult = await client.query(
        `INSERT INTO stock_entries (
          organization_id, entry_type, entry_number, entry_date,
          from_warehouse_id, to_warehouse_id, reference_type, reference_id,
          reference_number, purpose, notes, status, created_by, posted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          organizationId,
          originalEntry.entry_type,
          reversalNumber,
          new Date(),
          originalEntry.from_warehouse_id,
          originalEntry.to_warehouse_id,
          'reversal',
          stockEntryId,
          originalEntry.entry_number,
          `Reversal: ${reason}`,
          `Reversal of ${originalEntry.entry_number}. Reason: ${reason}`,
          StockEntryStatus.POSTED,
          userId,
          new Date(),
        ],
      );

      const reversalEntry = reversalResult.rows[0];

      // 6. Create reversal items and movements for each original item
      for (const item of originalItems) {
        // Create reversal stock entry item
        await client.query(
          `INSERT INTO stock_entry_items (
            stock_entry_id, line_number, item_id, item_name, quantity, unit,
            source_warehouse_id, target_warehouse_id, batch_number, serial_number,
            expiry_date, cost_per_unit, system_quantity, physical_quantity, variant_id, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            reversalEntry.id,
            item.line_number,
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
            item.variant_id || null,
            `Reversal of line ${item.line_number}`,
          ],
        );

        // Process reverse movements based on entry type
        await this.processReversalMovements(
          client,
          originalEntry,
          reversalEntry,
          item,
        );
      }

      // 7. Create reversal journal entry (swap debit/credit)
      const accountingResult = await this.stockAccountingService.createReversalJournalEntry(
        client,
        { ...originalEntry, entry_number: reversalNumber, id: reversalEntry.id },
        originalItems,
      );

      if (!accountingResult.success && accountingResult.error) {
        this.logger.error(`Reversal accounting failed: ${accountingResult.error}`);
        throw new BadRequestException(
          `Failed to create reversal accounting entry: ${accountingResult.error}`,
        );
      }

      // 8. Mark original entry as Reversed
      await client.query(
        `UPDATE stock_entries SET status = $1, updated_at = $2, updated_by = $3
         WHERE id = $4`,
        [StockEntryStatus.REVERSED, new Date(), userId, stockEntryId],
      );

      this.logger.log(
        `Stock entry ${originalEntry.entry_number} reversed by ${reversalNumber}. Reason: ${reason}`,
      );

      return {
        original_entry_id: stockEntryId,
        reversal_entry_id: reversalEntry.id,
        reversal_number: reversalNumber,
        message: `Stock entry ${originalEntry.entry_number} reversed successfully`,
      };
    });
  }

  /**
   * Process reverse stock movements for a reversal entry.
   * Creates opposite movements to undo the original entry's effects.
   */
  private async processReversalMovements(
    client: PoolClient,
    originalEntry: any,
    reversalEntry: any,
    item: any,
  ): Promise<void> {
    const entryType = originalEntry.entry_type as StockEntryType;

    switch (entryType) {
      case StockEntryType.MATERIAL_RECEIPT: {
        // Original: IN to to_warehouse → Reverse: OUT from to_warehouse
        const warehouseId = originalEntry.to_warehouse_id;

        // Restore valuation by consuming in reverse (or restore batches)
        // For reversal: we need to remove the valuation that was added
        const valuationResult = await client.query(
          `SELECT id, remaining_quantity, cost_per_unit
           FROM stock_valuation
           WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
           AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))
           AND stock_entry_id = $5
           AND remaining_quantity > 0
           FOR UPDATE`,
          [originalEntry.organization_id, item.item_id, warehouseId, item.variant_id || null, originalEntry.id],
        );

        let valuationToRemove = item.quantity;
        for (const valBatch of valuationResult.rows) {
          if (valuationToRemove <= 0) break;
          const available = parseFloat(valBatch.remaining_quantity);
          const reduce = Math.min(valuationToRemove, available);
          await client.query(
            `UPDATE stock_valuation SET remaining_quantity = remaining_quantity - $1 WHERE id = $2`,
            [reduce, valBatch.id],
          );
          valuationToRemove -= reduce;
        }

        // Create OUT movement
        const movementQuantity = -item.quantity;
        const balanceQuantity = await this.computeRunningBalance(
          client,
          originalEntry.organization_id,
          item.item_id,
          warehouseId,
          item.variant_id || null,
          movementQuantity,
        );
        await client.query(
          `INSERT INTO stock_movements (
            organization_id, item_id, variant_id, warehouse_id, movement_type, movement_date,
            quantity, unit, balance_quantity, cost_per_unit, total_cost,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            originalEntry.organization_id,
            item.item_id,
            item.variant_id || null,
            warehouseId,
            'OUT',
            reversalEntry.entry_date || new Date(),
            movementQuantity,
            item.unit,
            balanceQuantity,
            item.cost_per_unit || 0,
            -(item.quantity * (item.cost_per_unit || 0)),
            reversalEntry.id,
            item.id,
            item.batch_number || null,
            item.serial_number || null,
          ],
        );
        break;
      }

      case StockEntryType.MATERIAL_ISSUE: {
        // Original: OUT from from_warehouse → Reverse: IN back to from_warehouse
        const warehouseId = originalEntry.from_warehouse_id;

        // Restore valuation (add back the consumed batches at their original cost)
        await client.query(
          `INSERT INTO stock_valuation (
            organization_id, item_id, variant_id, warehouse_id, quantity, cost_per_unit,
            stock_entry_id, batch_number, serial_number, remaining_quantity
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            originalEntry.organization_id,
            item.item_id,
            item.variant_id || null,
            warehouseId,
            item.quantity,
            item.cost_per_unit || 0,
            reversalEntry.id,
            item.batch_number || null,
            item.serial_number || null,
            item.quantity,
          ],
        );

        // Create IN movement
        const balanceQuantity = await this.computeRunningBalance(
          client,
          originalEntry.organization_id,
          item.item_id,
          warehouseId,
          item.variant_id || null,
          item.quantity,
        );
        await client.query(
          `INSERT INTO stock_movements (
            organization_id, item_id, variant_id, warehouse_id, movement_type, movement_date,
            quantity, unit, balance_quantity, cost_per_unit, total_cost,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            originalEntry.organization_id,
            item.item_id,
            item.variant_id || null,
            warehouseId,
            'IN',
            reversalEntry.entry_date || new Date(),
            item.quantity,
            item.unit,
            balanceQuantity,
            item.cost_per_unit || 0,
            item.quantity * (item.cost_per_unit || 0),
            reversalEntry.id,
            item.id,
            item.batch_number || null,
            item.serial_number || null,
          ],
        );
        break;
      }

      case StockEntryType.STOCK_TRANSFER: {
        // Original: OUT from source, IN to target → Reverse: OUT from target, IN back to source
        const sourceWarehouse = originalEntry.from_warehouse_id;
        const targetWarehouse = originalEntry.to_warehouse_id;

        // Remove valuation from target warehouse (that was added by the transfer)
        const targetValResult = await client.query(
          `SELECT id, remaining_quantity, cost_per_unit
           FROM stock_valuation
           WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
           AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))
           AND stock_entry_id = $5 AND remaining_quantity > 0
           FOR UPDATE`,
          [originalEntry.organization_id, item.item_id, targetWarehouse, item.variant_id || null, originalEntry.id],
        );

        let targetValToRemove = item.quantity;
        for (const valBatch of targetValResult.rows) {
          if (targetValToRemove <= 0) break;
          const reduce = Math.min(targetValToRemove, parseFloat(valBatch.remaining_quantity));
          await client.query(
            `UPDATE stock_valuation SET remaining_quantity = remaining_quantity - $1 WHERE id = $2`,
            [reduce, valBatch.id],
          );
          targetValToRemove -= reduce;
        }

        // Restore valuation to source warehouse
        await client.query(
          `INSERT INTO stock_valuation (
            organization_id, item_id, variant_id, warehouse_id, quantity, cost_per_unit,
            stock_entry_id, batch_number, serial_number, remaining_quantity
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            originalEntry.organization_id,
            item.item_id,
            item.variant_id || null,
            sourceWarehouse,
            item.quantity,
            item.cost_per_unit || 0,
            reversalEntry.id,
            item.batch_number || null,
            item.serial_number || null,
            item.quantity,
          ],
        );

        // OUT from target (reverse the IN that happened)
        const targetMovementQuantity = -item.quantity;
        const targetBalanceQuantity = await this.computeRunningBalance(
          client,
          originalEntry.organization_id,
          item.item_id,
          targetWarehouse,
          item.variant_id || null,
          targetMovementQuantity,
        );
        await client.query(
          `INSERT INTO stock_movements (
            organization_id, item_id, variant_id, warehouse_id, movement_type, movement_date,
            quantity, unit, balance_quantity, cost_per_unit, total_cost,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            originalEntry.organization_id, item.item_id, item.variant_id || null,
            targetWarehouse, 'TRANSFER', reversalEntry.entry_date || new Date(),
            targetMovementQuantity, item.unit, targetBalanceQuantity,
            item.cost_per_unit || 0, -(item.quantity * (item.cost_per_unit || 0)),
            reversalEntry.id, item.id, item.batch_number || null, item.serial_number || null,
          ],
        );

        // IN back to source (reverse the OUT that happened)
        const sourceBalanceQuantity = await this.computeRunningBalance(
          client,
          originalEntry.organization_id,
          item.item_id,
          sourceWarehouse,
          item.variant_id || null,
          item.quantity,
        );
        await client.query(
          `INSERT INTO stock_movements (
            organization_id, item_id, variant_id, warehouse_id, movement_type, movement_date,
            quantity, unit, balance_quantity, cost_per_unit, total_cost,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            originalEntry.organization_id, item.item_id, item.variant_id || null,
            sourceWarehouse, 'TRANSFER', reversalEntry.entry_date || new Date(),
            item.quantity, item.unit, sourceBalanceQuantity,
            item.cost_per_unit || 0, item.quantity * (item.cost_per_unit || 0),
            reversalEntry.id, item.id, item.batch_number || null, item.serial_number || null,
          ],
        );
        break;
      }

      case StockEntryType.STOCK_RECONCILIATION: {
        // Reversal of reconciliation is complex — undo the variance adjustment
        const warehouseId = originalEntry.to_warehouse_id || originalEntry.from_warehouse_id;
        const variance = (item.physical_quantity || 0) - (item.system_quantity || 0);

        if (variance > 0) {
          // Original: added stock (positive variance) → Reverse: remove it
          const valResult = await client.query(
            `SELECT id, remaining_quantity FROM stock_valuation
             WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
             AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))
             AND stock_entry_id = $5 AND remaining_quantity > 0
             FOR UPDATE`,
            [originalEntry.organization_id, item.item_id, warehouseId, item.variant_id || null, originalEntry.id],
          );
          let toRemove = Math.abs(variance);
          for (const vb of valResult.rows) {
            if (toRemove <= 0) break;
            const reduce = Math.min(toRemove, parseFloat(vb.remaining_quantity));
            await client.query(`UPDATE stock_valuation SET remaining_quantity = remaining_quantity - $1 WHERE id = $2`, [reduce, vb.id]);
            toRemove -= reduce;
          }

          const movementQuantity = -Math.abs(variance);
          const balanceQuantity = await this.computeRunningBalance(
            client,
            originalEntry.organization_id,
            item.item_id,
            warehouseId,
            item.variant_id || null,
            movementQuantity,
          );

          await client.query(
            `INSERT INTO stock_movements (
              organization_id, item_id, variant_id, warehouse_id, movement_type, movement_date,
              quantity, unit, balance_quantity, cost_per_unit, total_cost,
              stock_entry_id, stock_entry_item_id, batch_number, serial_number
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
              originalEntry.organization_id, item.item_id, item.variant_id || null,
              warehouseId, 'OUT', reversalEntry.entry_date || new Date(),
              movementQuantity, item.unit, balanceQuantity,
              item.cost_per_unit || 0, -(Math.abs(variance) * (item.cost_per_unit || 0)),
              reversalEntry.id, item.id, item.batch_number || null, item.serial_number || null,
            ],
          );
        } else if (variance < 0) {
          // Original: removed stock (negative variance) → Reverse: restore it
          await client.query(
            `INSERT INTO stock_valuation (
              organization_id, item_id, variant_id, warehouse_id, quantity, cost_per_unit,
              stock_entry_id, batch_number, serial_number, remaining_quantity
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              originalEntry.organization_id, item.item_id, item.variant_id || null,
              warehouseId, Math.abs(variance), item.cost_per_unit || 0,
              reversalEntry.id, item.batch_number || null, item.serial_number || null,
              Math.abs(variance),
            ],
          );

          const balanceQuantity = await this.computeRunningBalance(
            client,
            originalEntry.organization_id,
            item.item_id,
            warehouseId,
            item.variant_id || null,
            Math.abs(variance),
          );

          await client.query(
            `INSERT INTO stock_movements (
              organization_id, item_id, variant_id, warehouse_id, movement_type, movement_date,
              quantity, unit, balance_quantity, cost_per_unit, total_cost,
              stock_entry_id, stock_entry_item_id, batch_number, serial_number
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
              originalEntry.organization_id, item.item_id, item.variant_id || null,
              warehouseId, 'IN', reversalEntry.entry_date || new Date(),
              Math.abs(variance), item.unit, balanceQuantity,
              item.cost_per_unit || 0, Math.abs(variance) * (item.cost_per_unit || 0),
              reversalEntry.id, item.id, item.batch_number || null, item.serial_number || null,
            ],
          );
        }
        break;
      }

      default:
        this.logger.warn(`Unknown entry type for reversal: ${entryType}`);
    }
  }
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

       await this.stockReservationsService.releaseReservationsForReference(
        'stock_entry',
        id,
        organizationId,
        client,
      );

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
  async getStockMovements(organizationId: string, filters?: any): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();

    return paginate(client, 'stock_movements', {
      select: `
        *,
        item:items(id, item_code, item_name, default_unit),
        warehouse:warehouses(id, name),
        stock_entry:stock_entries(id, entry_number, entry_type)
      `,
      filters: (q) => {
        q = q.eq('organization_id', organizationId);
        if (filters?.item_id) q = q.eq('item_id', filters.item_id);
        if (filters?.warehouse_id) q = q.eq('warehouse_id', filters.warehouse_id);
        if (filters?.movement_type) q = q.eq('movement_type', filters.movement_type);
        if (filters?.from_date) q = q.gte('movement_date', filters.from_date);
        if (filters?.to_date) q = q.lte('movement_date', filters.to_date);
        if (filters?.stock_entry_id) q = q.eq('stock_entry_id', filters.stock_entry_id);
        return q;
      },
      page: filters?.page || 1,
      pageSize: filters?.pageSize || 50,
      orderBy: 'movement_date',
      ascending: false,
    });
  }

  async getBatches(organizationId: string, filters?: any): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('stock_valuation')
      .select(`
        batch_number,
        item_id,
        warehouse_id,
        variant_id,
        quantity,
        remaining_quantity,
        cost_per_unit,
        total_cost,
        valuation_date,
        item:items(id, item_code, item_name, default_unit),
        warehouse:warehouses(id, name),
        stock_entry:stock_entries(
          id,
          entry_number,
          entry_date,
          items:stock_entry_items(batch_number, expiry_date)
        )
      `)
      .eq('organization_id', organizationId)
      .not('batch_number', 'is', null)
      .gt('remaining_quantity', 0)
      .order('valuation_date', { ascending: true });

    if (filters?.item_id) query = query.eq('item_id', filters.item_id);
    if (filters?.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id);

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch batches: ${error.message}`);
    }

    const groupedBatches = new Map<string, any>();

    for (const row of data || []) {
      const batchKey = `${row.batch_number}::${row.item_id}::${row.warehouse_id}::${row.variant_id || 'null'}`;
      const stockEntry: any = Array.isArray(row.stock_entry) ? row.stock_entry[0] : row.stock_entry;
      const matchingEntryItem = stockEntry?.items?.find?.((entryItem: any) => entryItem.batch_number === row.batch_number)
        || stockEntry?.items?.[0]
        || null;

      const existing = groupedBatches.get(batchKey);
      if (!existing) {
        groupedBatches.set(batchKey, {
          batch_number: row.batch_number,
          item_id: row.item_id,
          warehouse_id: row.warehouse_id,
          variant_id: row.variant_id || null,
          item: row.item,
          warehouse: row.warehouse,
          quantity: Number(row.quantity || 0),
          remaining_quantity: Number(row.remaining_quantity || 0),
          total_cost: Number(row.total_cost || 0),
          cost_per_unit: Number(row.cost_per_unit || 0),
          valuation_date: row.valuation_date,
          expiry_date: matchingEntryItem?.expiry_date || null,
          stock_entries: stockEntry ? [stockEntry] : [],
        });
        continue;
      }

      existing.quantity += Number(row.quantity || 0);
      existing.remaining_quantity += Number(row.remaining_quantity || 0);
      existing.total_cost += Number(row.total_cost || 0);
      existing.valuation_date = existing.valuation_date < row.valuation_date ? existing.valuation_date : row.valuation_date;
      if (!existing.expiry_date || (matchingEntryItem?.expiry_date && matchingEntryItem.expiry_date < existing.expiry_date)) {
        existing.expiry_date = matchingEntryItem?.expiry_date || existing.expiry_date;
      }
      if (stockEntry) {
        existing.stock_entries.push(stockEntry);
      }
    }

    return Array.from(groupedBatches.values()).map((batch) => ({
      id: `${batch.batch_number}-${batch.item_id}-${batch.warehouse_id}`,
      batchNumber: batch.batch_number,
      itemId: batch.item_id,
      warehouseId: batch.warehouse_id,
      itemName: batch.item?.item_name || 'Unknown',
      warehouseName: batch.warehouse?.name || 'Unknown',
      remainingQuantity: batch.remaining_quantity,
      unit: batch.item?.default_unit || 'pcs',
      costPerUnit: batch.remaining_quantity > 0 ? batch.total_cost / batch.remaining_quantity : batch.cost_per_unit,
      totalValue: batch.total_cost,
      expiryDate: batch.expiry_date,
      receivedDate: batch.valuation_date,
      valuationDate: batch.valuation_date,
    }));
  }

  async getExpiryAlerts(organizationId: string, daysThreshold: number = 90): Promise<any> {
    const supabase = this.databaseService.getAdminClient();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const pool = this.databaseService.getPgPool();
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT sei.id, sei.item_id, sei.batch_number, sei.expiry_date,
                sei.quantity AS original_quantity,
                sv.remaining_quantity,
                i.item_name, i.default_unit,
                w.name AS warehouse_name
         FROM stock_entry_items sei
         INNER JOIN stock_entries se ON se.id = sei.stock_entry_id
         INNER JOIN items i ON i.id = sei.item_id
         LEFT JOIN warehouses w ON w.id = se.to_warehouse_id
         LEFT JOIN stock_valuation sv ON sv.batch_number = sei.batch_number
           AND sv.item_id = sei.item_id AND sv.warehouse_id = se.to_warehouse_id
           AND sv.organization_id = se.organization_id
           AND sv.remaining_quantity > 0
         WHERE se.organization_id = $1
           AND sei.expiry_date IS NOT NULL
           AND sei.expiry_date <= $2
           AND sv.id IS NOT NULL
         ORDER BY sei.expiry_date ASC`,
        [organizationId, thresholdDate.toISOString()],
      );

      const now = new Date();
      return result.rows.map((row: any) => {
        const expiryDate = new Date(row.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let urgency: 'expired' | 'critical' | 'warning' | 'attention';
        if (expiryDate <= now) {
          urgency = 'expired';
        } else if (daysUntilExpiry <= 30) {
          urgency = 'critical';
        } else if (daysUntilExpiry <= 60) {
          urgency = 'warning';
        } else {
          urgency = 'attention';
        }

        return {
          id: row.id,
          itemName: row.item_name || 'Unknown',
          batchNumber: row.batch_number || '',
          warehouseName: row.warehouse_name || 'Unknown',
          expiryDate: row.expiry_date,
          daysUntilExpiry,
          quantity: Number(row.remaining_quantity || 0),
          unit: row.default_unit || 'pcs',
          urgency,
        };
      });
    } finally {
      client.release();
    }
  }

  async getFEFOSuggestion(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    variantId?: string,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('stock_valuation')
      .select(`
        id,
        item_id,
        warehouse_id,
        variant_id,
        batch_number,
        remaining_quantity,
        cost_per_unit,
        valuation_date,
        stock_entry:stock_entries(
          id,
          entry_number,
          items:stock_entry_items(batch_number, expiry_date)
        )
      `)
      .eq('organization_id', organizationId)
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId)
      .gt('remaining_quantity', 0);

    if (variantId) query = query.eq('variant_id', variantId);

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch FEFO suggestion: ${error.message}`);
    }

    return (data || [])
      .map((row: any) => {
        const stockEntry: any = Array.isArray(row.stock_entry) ? row.stock_entry[0] : row.stock_entry;
        const matchingEntryItem = stockEntry?.items?.find?.((entryItem: any) => entryItem.batch_number === row.batch_number)
          || stockEntry?.items?.[0]
          || null;
        return {
          ...row,
          expiry_date: matchingEntryItem?.expiry_date || null,
        };
      })
      .sort((a: any, b: any) => {
        const aExpiry = a.expiry_date || '9999-12-31';
        const bExpiry = b.expiry_date || '9999-12-31';
        return new Date(aExpiry).getTime() - new Date(bExpiry).getTime();
      });
  }

  async getStockDashboard(organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data: valuation, error: valuationError } = await supabase
      .from('stock_valuation')
      .select('total_cost')
      .eq('organization_id', organizationId)
      .gt('remaining_quantity', 0);

    if (valuationError) {
      throw new BadRequestException(`Failed to fetch stock dashboard valuation: ${valuationError.message}`);
    }

    const totalStockValue = (valuation || []).reduce(
      (sum, entry) => sum + (parseFloat(String(entry.total_cost)) || 0),
      0,
    );

    const { data: stockLevels, error: stockLevelsError } = await supabase
      .from('warehouse_stock_levels')
      .select('item_id, quantity')
      .eq('organization_id', organizationId);

    const stockMap = new Map<string, number>();
    if (!stockLevelsError && stockLevels) {
      for (const level of stockLevels) {
        const current = stockMap.get(level.item_id) || 0;
        stockMap.set(level.item_id, current + (parseFloat(String(level.quantity)) || 0));
      }
    }

    const { data: allStockItems, error: lowStockError } = await supabase
      .from('items')
      .select('id, item_code, item_name, reorder_point')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .eq('is_stock_item', true)
      .gt('reorder_point', 0);

    if (lowStockError) {
      throw new BadRequestException(`Failed to fetch stock dashboard items: ${lowStockError.message}`);
    }

    const lowStockItems = (allStockItems || []).filter((item) => {
      const currentStock = stockMap.get(item.id) || 0;
      return currentStock < (parseFloat(String(item.reorder_point)) || 0);
    });

    const { count: pendingEntries, error: pendingError } = await supabase
      .from('stock_entries')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['Draft', 'Submitted']);

    if (pendingError) {
      throw new BadRequestException(`Failed to fetch pending stock entries: ${pendingError.message}`);
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentMovements, error: recentError } = await supabase
      .from('stock_movements')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (recentError) {
      throw new BadRequestException(`Failed to fetch recent stock movements: ${recentError.message}`);
    }

    const { count: warehouseCount, error: warehouseError } = await supabase
      .from('warehouses')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (warehouseError) {
      throw new BadRequestException(`Failed to fetch warehouse count: ${warehouseError.message}`);
    }

    return {
      totalStockValue,
      lowStockAlertsCount: lowStockItems.length,
      lowStockItems,
      pendingEntriesCount: pendingEntries || 0,
      recentMovementsCount: recentMovements || 0,
      warehouseCount: warehouseCount || 0,
    };
  }

  async getReorderSuggestions(organizationId: string): Promise<any[]> {
    const supabase = this.databaseService.getAdminClient();

    const { data: items, error } = await supabase
      .from('items')
      .select(`
        id, item_code, item_name, default_unit, reorder_point, reorder_quantity,
        variants:product_variants(id, variant_name, quantity)
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .eq('is_stock_item', true)
      .gt('reorder_point', 0);

    if (error) {
      throw new BadRequestException(`Failed to fetch reorder suggestions: ${error.message}`);
    }

    const { data: stockLevels, error: stockLevelsError } = await supabase
      .from('warehouse_stock_levels')
      .select('item_id, quantity')
      .eq('organization_id', organizationId);

    if (stockLevelsError) {
      throw new BadRequestException(`Failed to fetch current stock levels: ${stockLevelsError.message}`);
    }

    const stockMap = new Map<string, number>();

    for (const level of stockLevels || []) {
      const current = stockMap.get(level.item_id) || 0;
      stockMap.set(level.item_id, current + (parseFloat(String(level.quantity)) || 0));
    }

    return (items || [])
      .map((item) => {
        const currentStock = stockMap.get(item.id) || 0;
        const reorderPoint = parseFloat(String(item.reorder_point || 0)) || 0;
        const reorderQuantity = parseFloat(String(item.reorder_quantity || 0)) || 0;
        const shortfall = Math.max(0, reorderPoint - currentStock);

        return {
          itemId: item.id,
          itemCode: item.item_code,
          itemName: item.item_name,
          currentStock,
          reorderPoint,
          shortfall,
          suggestedOrderQty: shortfall > 0 ? Math.max(shortfall, reorderQuantity || shortfall) : 0,
          unit: item.default_unit || 'pcs',
        };
      })
      .filter((item) => item.currentStock < item.reorderPoint);
  }

  /**
   * Stock aging report: groups remaining stock_valuation lots by age buckets.
   * Useful for identifying slow-moving agri inputs (e.g. expensive pesticides
   * sitting unused) and triggering FIFO discipline.
   */
  async getStockAging(organizationId: string, warehouseId?: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('stock_valuation')
      .select(`
        item_id,
        warehouse_id,
        remaining_quantity,
        cost_per_unit,
        created_at,
        items:items(id, item_name, item_code, default_unit),
        warehouses:warehouses(id, name)
      `)
      .eq('organization_id', organizationId)
      .gt('remaining_quantity', 0);

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId);
    }

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(`Failed to fetch aging report: ${error.message}`);
    }

    const now = Date.now();
    const buckets = {
      '0-30': { qty: 0, value: 0 },
      '31-60': { qty: 0, value: 0 },
      '61-90': { qty: 0, value: 0 },
      '90+': { qty: 0, value: 0 },
    };

    type ItemAgg = {
      itemId: string;
      itemName: string;
      itemCode: string | null;
      warehouseId: string;
      warehouseName: string;
      unit: string;
      totalQty: number;
      totalValue: number;
      buckets: typeof buckets;
      oldestDays: number;
    };
    const byItem = new Map<string, ItemAgg>();

    for (const row of data || []) {
      const remaining = parseFloat(String(row.remaining_quantity || 0)) || 0;
      const costPerUnit = parseFloat(String(row.cost_per_unit || 0)) || 0;
      const value = remaining * costPerUnit;
      const ageDays = Math.floor((now - new Date(row.created_at).getTime()) / 86400000);

      const bucketKey: keyof typeof buckets =
        ageDays <= 30 ? '0-30' : ageDays <= 60 ? '31-60' : ageDays <= 90 ? '61-90' : '90+';

      buckets[bucketKey].qty += remaining;
      buckets[bucketKey].value += value;

      const itemRel: any = row.items;
      const whRel: any = row.warehouses;
      const key = `${row.item_id}::${row.warehouse_id}`;
      const existing = byItem.get(key);
      if (existing) {
        existing.totalQty += remaining;
        existing.totalValue += value;
        existing.buckets[bucketKey].qty += remaining;
        existing.buckets[bucketKey].value += value;
        existing.oldestDays = Math.max(existing.oldestDays, ageDays);
      } else {
        byItem.set(key, {
          itemId: row.item_id,
          itemName: itemRel?.item_name || 'Unknown',
          itemCode: itemRel?.item_code || null,
          warehouseId: row.warehouse_id,
          warehouseName: whRel?.name || 'Unknown',
          unit: itemRel?.default_unit || 'pcs',
          totalQty: remaining,
          totalValue: value,
          buckets: {
            '0-30': { qty: 0, value: 0 },
            '31-60': { qty: 0, value: 0 },
            '61-90': { qty: 0, value: 0 },
            '90+': { qty: 0, value: 0 },
          },
          oldestDays: ageDays,
        });
        const fresh = byItem.get(key)!;
        fresh.buckets[bucketKey].qty = remaining;
        fresh.buckets[bucketKey].value = value;
      }
    }

    return {
      buckets,
      items: Array.from(byItem.values()).sort((a, b) => b.oldestDays - a.oldestDays),
    };
  }

  async getSystemQuantity(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    variantId?: string,
  ): Promise<{ quantity: number; unit: string }> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('warehouse_stock_levels')
      .select('quantity')
      .eq('organization_id', organizationId)
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId);

    if (variantId) {
      query = query.eq('variant_id', variantId);
    } else {
      query = query.is('variant_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to get system quantity: ${error.message}`);
    }

    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('default_unit')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (itemError) {
      throw new BadRequestException(`Failed to get item unit: ${itemError.message}`);
    }

    return {
      quantity: parseFloat(String(data?.quantity || 0)) || 0,
      unit: item?.default_unit || 'pcs',
    };
  }

  private async computeRunningBalance(
    client: PoolClient,
    organizationId: string,
    itemId: string,
    warehouseId: string,
    variantId: string | null,
    movementQuantity: number,
  ): Promise<number> {
    const result = await client.query(
      `SELECT COALESCE(SUM(quantity), 0) AS current_balance
       FROM stock_movements
       WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
       AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))`,
      [organizationId, itemId, warehouseId, variantId],
    );

    const currentBalance = parseFloat(result.rows[0]?.current_balance || '0');
    return currentBalance + movementQuantity;
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
    const balanceQuantity = await this.computeRunningBalance(
      client,
      stockEntry.organization_id,
      item.item_id,
      stockEntry.to_warehouse_id,
      item.variant_id || null,
      item.quantity,
    );

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
        balanceQuantity,
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

    if (item.batch_number) {
      const expiryResult = await client.query(
        `SELECT sei.expiry_date
         FROM stock_entry_items sei
         JOIN stock_entries se ON sei.stock_entry_id = se.id
         WHERE sei.batch_number = $1 AND sei.item_id = $2 AND se.organization_id = $3
         AND sei.expiry_date IS NOT NULL AND sei.expiry_date <= NOW()
         LIMIT 1`,
        [item.batch_number, item.item_id, stockEntry.organization_id],
      );

      if (expiryResult.rows.length > 0) {
        throw new BadRequestException(
          `Cannot issue expired batch ${item.batch_number}. Expiry date: ${expiryResult.rows[0].expiry_date}`,
        );
      }
    }

    // Consume valuation using item's valuation method
    const itemMetaResult = await client.query(
      `SELECT valuation_method FROM items WHERE id = $1`,
      [item.item_id],
    );
    const valuationMethod = itemMetaResult.rows[0]?.valuation_method || ValuationMethod.FIFO;
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
    const movementQuantity = -item.quantity;
    const balanceQuantity = await this.computeRunningBalance(
      client,
      stockEntry.organization_id,
      item.item_id,
      stockEntry.from_warehouse_id,
      item.variant_id || null,
      movementQuantity,
    );

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
        movementQuantity,
        item.unit,
        balanceQuantity,
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

    const itemMetaResult = await client.query(
      `SELECT valuation_method FROM items WHERE id = $1`,
      [item.item_id],
    );
    const valuationMethod = itemMetaResult.rows[0]?.valuation_method || ValuationMethod.FIFO;
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
    const sourceMovementQuantity = -item.quantity;
    const sourceBalanceQuantity = await this.computeRunningBalance(
      client,
      stockEntry.organization_id,
      item.item_id,
      stockEntry.from_warehouse_id,
      item.variant_id || null,
      sourceMovementQuantity,
    );

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
        sourceMovementQuantity,
        item.unit,
        sourceBalanceQuantity,
        costPerUnit,
        -totalCost,
        stockEntry.id,
        item.id,
        item.batch_number || null,
        item.serial_number || null,
      ],
    );

    const targetBalanceQuantity = await this.computeRunningBalance(
      client,
      stockEntry.organization_id,
      item.item_id,
      stockEntry.to_warehouse_id,
      item.variant_id || null,
      item.quantity,
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
        targetBalanceQuantity,
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
           AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))
           AND remaining_quantity > 0`,
          [stockEntry.organization_id, item.item_id, warehouseId, item.variant_id || null],
        );
        costPerUnit = parseFloat(avgResult.rows[0]?.weighted_avg_cost || '0');
      }
      totalCost = costPerUnit * absVariance;
      const balanceQuantity = await this.computeRunningBalance(
        client,
        stockEntry.organization_id,
        item.item_id,
        warehouseId,
        item.variant_id || null,
        absVariance,
      );

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
          balanceQuantity,
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
      const metaResult = await client.query(
        `SELECT valuation_method FROM items WHERE id = $1`,
        [item.item_id],
      );
      const valuationMethod = metaResult.rows[0]?.valuation_method || ValuationMethod.FIFO;

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
        const movementQuantity = -absVariance;
        const balanceQuantity = await this.computeRunningBalance(
          client,
          stockEntry.organization_id,
          item.item_id,
          warehouseId,
          item.variant_id || null,
          movementQuantity,
        );

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
            movementQuantity,
            item.unit,
            balanceQuantity,
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
        const err = error as Error;
        // Critical: valuation out of sync with movements
        // Do NOT allow zero-cost adjustments as they hide the drift
        this.logger.error(
          `Cannot consume valuation for negative variance: ${err.message}. ` +
          `This indicates valuation is already out of sync with movements. ` +
          `Stock reconciliation cannot proceed until valuation data is corrected.`,
        );

        throw new BadRequestException(
          `Cannot process reconciliation: Insufficient valuation to consume ${absVariance} units. ` +
          `This indicates stock valuation is out of sync. ` +
          `Available movements suggest stock exists, but no valuation batches are available to consume. ` +
          `Please contact system administrator to reconcile stock_movements and stock_valuation tables. ` +
          `Original error: ${err.message}`,
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
    excludeReferenceId?: string,
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

    const reservationValues: Array<string | number | null> = [organizationId, itemId, warehouseId, variantId];
    let reservationFilter = '';
    if (excludeReferenceId) {
      reservationFilter = ` AND NOT (reference_type = $5 AND reference_id = $6)`;
      reservationValues.push('stock_entry', excludeReferenceId);
    }

    const reservationResult = await client.query(
      `SELECT COALESCE(SUM(quantity), 0) as reserved
       FROM stock_reservations
       WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
       AND status = 'active' AND expires_at > NOW()
       AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))${reservationFilter}`,
      reservationValues,
    );

    const reservedQuantity = parseFloat(reservationResult.rows[0]?.reserved || '0');
    const availableBalance = currentBalance - reservedQuantity;

    if (availableBalance < requiredQuantity) {
      throw new BadRequestException(
        `Insufficient stock: ${availableBalance} available (${currentBalance} total - ${reservedQuantity} reserved), ${requiredQuantity} required`,
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
          stockEntry.id,
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
  /**
   * Consume stock valuation using the specified method.
   * Dispatches to the appropriate implementation based on valuation method.
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
    switch (method) {
      case ValuationMethod.MOVING_AVERAGE:
        return this.consumeValuationMovingAverage(client, organizationId, itemId, variantId, warehouseId, quantity);
      case ValuationMethod.LIFO:
        return this.consumeValuationBatchOrdered(client, organizationId, itemId, variantId, warehouseId, quantity, 'DESC');
      case ValuationMethod.FIFO:
      default:
        return this.consumeValuationBatchOrdered(client, organizationId, itemId, variantId, warehouseId, quantity, 'ASC');
    }
  }

  /**
   * FIFO/LIFO: Consume valuation by picking batches in creation order (ASC) or reverse (DESC).
   * Each batch is consumed fully before moving to the next.
   */
  private async consumeValuationBatchOrdered(
    client: PoolClient,
    organizationId: string,
    itemId: string,
    variantId: string | null,
    warehouseId: string,
    quantity: number,
    sortOrder: 'ASC' | 'DESC',
  ): Promise<{ totalCost: number; consumedBatches: Array<{ batchId: string; quantity: number; cost: number }> }> {
    const result = await client.query(
      `SELECT id, remaining_quantity, cost_per_unit
       FROM stock_valuation
       WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
       AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))
       AND remaining_quantity > 0
       ORDER BY created_at ${sortOrder}
       FOR UPDATE`,
      [organizationId, itemId, warehouseId, variantId],
    );

    let remainingQty = quantity;
    let totalCost = 0;
    const consumed: Array<{ batchId: string; quantity: number; cost: number }> = [];

    for (const batch of result.rows) {
      if (remainingQty <= 0) break;

      const consumeQty = Math.min(remainingQty, parseFloat(batch.remaining_quantity));
      const cost = parseFloat(batch.cost_per_unit) * consumeQty;

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

  /**
   * Moving Average: Compute weighted average cost across ALL remaining batches,
   * then reduce all batches proportionally. The issue cost is the weighted average,
   * not the cost of any specific batch.
   *
   * Formula: weightedAvgCost = SUM(remaining_qty * cost_per_unit) / SUM(remaining_qty)
   * Issue cost = weightedAvgCost * quantity_issued
   * Each batch reduced proportionally: batch.remaining -= (batch.remaining / totalRemaining) * quantity_issued
   */
  private async consumeValuationMovingAverage(
    client: PoolClient,
    organizationId: string,
    itemId: string,
    variantId: string | null,
    warehouseId: string,
    quantity: number,
  ): Promise<{ totalCost: number; consumedBatches: Array<{ batchId: string; quantity: number; cost: number }> }> {
    // Lock and fetch all remaining valuation batches
    const result = await client.query(
      `SELECT id, remaining_quantity, cost_per_unit
       FROM stock_valuation
       WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
       AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))
       AND remaining_quantity > 0
       ORDER BY created_at ASC
       FOR UPDATE`,
      [organizationId, itemId, warehouseId, variantId],
    );

    if (result.rows.length === 0) {
      throw new BadRequestException(
        `Insufficient valuation for ${quantity} units (no batches available)`,
      );
    }

    // Calculate total remaining and weighted average cost
    let totalRemaining = 0;
    let weightedCostSum = 0;
    for (const batch of result.rows) {
      const remaining = parseFloat(batch.remaining_quantity);
      const costPerUnit = parseFloat(batch.cost_per_unit);
      totalRemaining += remaining;
      weightedCostSum += remaining * costPerUnit;
    }

    if (totalRemaining < quantity) {
      throw new BadRequestException(
        `Insufficient valuation for ${quantity} units (available ${totalRemaining}, short ${quantity - totalRemaining})`,
      );
    }

    const weightedAvgCost = weightedCostSum / totalRemaining;
    const totalCost = weightedAvgCost * quantity;

    // Reduce each batch proportionally to its share of total remaining
    const consumed: Array<{ batchId: string; quantity: number; cost: number }> = [];
    let qtyToDistribute = quantity;

    for (let i = 0; i < result.rows.length; i++) {
      const batch = result.rows[i];
      const batchRemaining = parseFloat(batch.remaining_quantity);

      // For the last batch, consume whatever is left to avoid rounding issues
      const consumeFromBatch = i === result.rows.length - 1
        ? qtyToDistribute
        : (batchRemaining / totalRemaining) * quantity;

      const clampedConsume = Math.min(consumeFromBatch, batchRemaining, qtyToDistribute);

      if (clampedConsume > 0) {
        await client.query(
          `UPDATE stock_valuation
           SET remaining_quantity = remaining_quantity - $1
           WHERE id = $2`,
          [clampedConsume, batch.id],
        );

        consumed.push({
          batchId: batch.id,
          quantity: clampedConsume,
          cost: weightedAvgCost * clampedConsume,
        });

        qtyToDistribute -= clampedConsume;
      }
    }

    this.logger.debug(
      `Moving Average valuation: issued ${quantity} units at weighted avg cost ${weightedAvgCost.toFixed(4)}, ` +
      `total cost ${totalCost.toFixed(2)} (${consumed.length} batches reduced)`,
    );

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
      const err = error as Error;
      await client.query('ROLLBACK');
      this.logger.error(`Transaction failed, rolled back: ${err.message}`, err.stack);
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
      if (error.code === 'PGRST116' || error.message?.toLowerCase().includes('no rows')) {
        throw new NotFoundException('Opening stock balance not found');
      }
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
      const balanceQuantity = await this.computeRunningBalance(
        client,
        organizationId,
        openingStock.item_id,
        openingStock.warehouse_id,
        openingStock.variant_id || null,
        openingStock.quantity,
      );

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
          variant_id,
          warehouse_id,
          quantity,
          unit,
          balance_quantity,
          cost_per_unit,
          total_cost,
          batch_number,
          serial_number,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          organizationId,
          'IN',
          openingStock.opening_date,
          openingStock.item_id,
          openingStock.variant_id || null,
          openingStock.warehouse_id,
          openingStock.quantity,
          unit,
          balanceQuantity,
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

    const { data: existing, error: fetchError } = await supabase
      .from('opening_stock_balances')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException('Opening stock balance not found');
    }

    if (existing.status !== 'Draft') {
      throw new BadRequestException('Only draft opening stock balances can be cancelled');
    }

    const { data, error } = await supabase
      .from('opening_stock_balances')
      .update({ status: 'Cancelled' })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .eq('status', 'Draft')
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
        debit_account:accounts!stock_account_mappings_debit_account_id_fkey(id, code, name),
        credit_account:accounts!stock_account_mappings_credit_account_id_fkey(id, code, name)
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

    // Defensively strip organization_id in case a caller injects it in the
    // body — the header-derived value is the only source of truth.
    const { organization_id: _dtoOrgId, ...safeDto } = dto as CreateStockAccountMappingDto & {
      organization_id?: string;
    };

    const { data, error } = await supabase
      .from('stock_account_mappings')
      .insert({
        organization_id: organizationId,
        ...safeDto,
      })
      .select(`
        *,
        debit_account:accounts!stock_account_mappings_debit_account_id_fkey(id, code, name),
        credit_account:accounts!stock_account_mappings_credit_account_id_fkey(id, code, name)
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
        debit_account:accounts!stock_account_mappings_debit_account_id_fkey(id, code, name),
        credit_account:accounts!stock_account_mappings_credit_account_id_fkey(id, code, name)
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
   * Seed default stock account mappings using the Moroccan CGNC chart of
   * accounts. Idempotent — skips entry types that already have a mapping.
   *
   * Default GL flow for agri inputs:
   *   Material Receipt:       DR 312 (Matières) / CR 441 (Fournisseurs)
   *   Material Issue:         DR 612 (Achats consommés) / CR 312
   *   Stock Reconciliation:   DR 612 / CR 312 (treats loss as consumption)
   *   Opening Stock:          DR 312 / CR 312 (no GL impact, just opens balance)
   *
   * Stock Transfer is intentionally not mapped — same legal entity = no GL.
   */
  async seedDefaultStockAccountMappings(organizationId: string): Promise<{
    created: number;
    skipped: Array<{ entry_type: string; reason: string }>;
  }> {
    const supabase = this.databaseService.getAdminClient();

    const { data: accounts, error: accErr } = await supabase
      .from('accounts')
      .select('id, code, account_type')
      .eq('organization_id', organizationId)
      .in('code', ['312', '441', '612', '611']);

    if (accErr) {
      throw new BadRequestException(`Failed to load chart of accounts: ${accErr.message}`);
    }

    const byCode = new Map<string, string>();
    for (const a of accounts || []) byCode.set(a.code, a.id);

    if (byCode.size === 0) {
      throw new BadRequestException(
        'Chart of accounts not seeded. Run admin seedAccounts (Moroccan CGNC) first.',
      );
    }

    const inv = byCode.get('312');
    const ap = byCode.get('441');
    const cogs = byCode.get('612');

    const desiredMappings: Array<{
      entry_type: string;
      debit_account_id: string | undefined;
      credit_account_id: string | undefined;
    }> = [
      { entry_type: 'Material Receipt', debit_account_id: inv, credit_account_id: ap },
      { entry_type: 'Material Issue', debit_account_id: cogs, credit_account_id: inv },
      { entry_type: 'Stock Reconciliation', debit_account_id: cogs, credit_account_id: inv },
      { entry_type: 'Opening Stock', debit_account_id: inv, credit_account_id: inv },
    ];

    const { data: existing, error: exErr } = await supabase
      .from('stock_account_mappings')
      .select('entry_type')
      .eq('organization_id', organizationId);

    if (exErr) {
      throw new BadRequestException(`Failed to load existing mappings: ${exErr.message}`);
    }

    const existingTypes = new Set((existing || []).map((m) => m.entry_type));
    const skipped: Array<{ entry_type: string; reason: string }> = [];
    let created = 0;

    for (const m of desiredMappings) {
      if (existingTypes.has(m.entry_type)) {
        skipped.push({ entry_type: m.entry_type, reason: 'already exists' });
        continue;
      }
      if (!m.debit_account_id || !m.credit_account_id) {
        skipped.push({ entry_type: m.entry_type, reason: 'required CGNC account missing' });
        continue;
      }
      const { error: insErr } = await supabase
        .from('stock_account_mappings')
        .insert({
          organization_id: organizationId,
          entry_type: m.entry_type,
          debit_account_id: m.debit_account_id,
          credit_account_id: m.credit_account_id,
        });

      if (insErr) {
        skipped.push({ entry_type: m.entry_type, reason: insErr.message });
      } else {
        created++;
      }
    }

    return { created, skipped };
  }

  /**
   * Stock vs GL reconciliation report. Compares physical stock value
   * (sum of stock_valuation.remaining_quantity × cost_per_unit) against the
   * Inventory account's GL balance derived from journal_items posted by
   * stock entries. Surfaces drift caused by missing mappings, manual GL
   * postings, or rounding accumulation.
   */
  async getStockGlReconciliation(organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // 1. Physical stock value from stock_valuation
    const { data: valuationRows, error: vErr } = await supabase
      .from('stock_valuation')
      .select('remaining_quantity, cost_per_unit, warehouse_id')
      .eq('organization_id', organizationId)
      .gt('remaining_quantity', 0);

    if (vErr) {
      throw new BadRequestException(`Failed to load stock_valuation: ${vErr.message}`);
    }

    const physicalValueByWarehouse = new Map<string, number>();
    let physicalTotal = 0;
    for (const row of valuationRows || []) {
      const v = (parseFloat(String(row.remaining_quantity)) || 0)
        * (parseFloat(String(row.cost_per_unit)) || 0);
      physicalTotal += v;
      physicalValueByWarehouse.set(
        row.warehouse_id,
        (physicalValueByWarehouse.get(row.warehouse_id) || 0) + v,
      );
    }

    // 2. Identify the configured inventory accounts
    const { data: mappings } = await supabase
      .from('stock_account_mappings')
      .select('entry_type, debit_account_id, credit_account_id')
      .eq('organization_id', organizationId);

    const inventoryAccountIds = new Set<string>();
    for (const m of mappings || []) {
      // Material Receipt debits inventory; Material Issue credits inventory.
      if (m.entry_type === 'Material Receipt' && m.debit_account_id) {
        inventoryAccountIds.add(m.debit_account_id);
      }
      if (m.entry_type === 'Material Issue' && m.credit_account_id) {
        inventoryAccountIds.add(m.credit_account_id);
      }
    }

    let glBalance = 0;
    let glAccounts: Array<{ id: string; code: string; name: string; debit: number; credit: number; balance: number }> = [];

    if (inventoryAccountIds.size > 0) {
      // 3. Sum journal_items for those accounts (only entries posted from stock)
      const accountIds = Array.from(inventoryAccountIds);
      const { data: jItems, error: jErr } = await supabase
        .from('journal_items')
        .select('account_id, debit, credit, journal_entries!inner(reference_type, organization_id)')
        .in('account_id', accountIds)
        .eq('journal_entries.organization_id', organizationId)
        .eq('journal_entries.reference_type', 'Stock Entry');

      if (jErr) {
        throw new BadRequestException(`Failed to load journal_items: ${jErr.message}`);
      }

      const byAccount = new Map<string, { debit: number; credit: number }>();
      for (const it of jItems || []) {
        const cur = byAccount.get(it.account_id) || { debit: 0, credit: 0 };
        cur.debit += parseFloat(String(it.debit || 0)) || 0;
        cur.credit += parseFloat(String(it.credit || 0)) || 0;
        byAccount.set(it.account_id, cur);
      }

      const { data: accountMeta } = await supabase
        .from('accounts')
        .select('id, code, name')
        .in('id', accountIds);

      const metaById = new Map<string, { code: string; name: string }>();
      for (const a of accountMeta || []) metaById.set(a.id, { code: a.code, name: a.name });

      glAccounts = accountIds.map((id) => {
        const tot = byAccount.get(id) || { debit: 0, credit: 0 };
        const balance = tot.debit - tot.credit;
        glBalance += balance;
        const meta = metaById.get(id);
        return {
          id,
          code: meta?.code || '',
          name: meta?.name || '',
          debit: tot.debit,
          credit: tot.credit,
          balance,
        };
      });
    }

    return {
      physical_value: physicalTotal,
      gl_balance: glBalance,
      drift: physicalTotal - glBalance,
      drift_status:
        Math.abs(physicalTotal - glBalance) < 0.01
          ? 'balanced'
          : inventoryAccountIds.size === 0
            ? 'no_mappings'
            : 'drift_detected',
      inventory_accounts: glAccounts,
      physical_by_warehouse: Array.from(physicalValueByWarehouse.entries()).map(([wh, v]) => ({
        warehouse_id: wh,
        value: v,
      })),
    };
  }
}
