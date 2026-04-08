import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { NotificationsService, OPERATIONAL_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import { CreateProductApplicationDto } from './dto/create-product-application.dto';

@Injectable()
export class ProductApplicationsService {
  private readonly logger = new Logger(ProductApplicationsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly accountingAutomationService: AccountingAutomationService,
  ) {}

  /**
   * Get a warehouse for the organization (first active warehouse)
   */
  private async getOrganizationWarehouse(organizationId: string): Promise<string | null> {
    const pool = this.databaseService.getPgPool();
    const result = await pool.query(
      `SELECT id FROM warehouses
       WHERE organization_id = $1 AND is_active = true
       ORDER BY created_at ASC
       LIMIT 1`,
      [organizationId],
    );

    return result.rows[0]?.id || null;
  }

  /**
   * Get all product applications for an organization
   */
  async listProductApplications(userId: string, organizationId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data, error } = await supabase
        .from('product_applications')
        .select(`
          *,
          items!inner (
            item_name,
            default_unit
          )
        `)
        .eq('organization_id', organizationId)
        .order('application_date', { ascending: false });

      if (error) {
        this.logger.error('Error fetching product applications:', error);
        throw new InternalServerErrorException('Failed to fetch product applications');
      }

      // Transform the response to match the expected DTO structure
      // items (item_name, default_unit) -> inventory (name, unit)
      const transformedApplications = (data || []).map((app: any) => ({
        ...app,
        inventory: {
          name: app.items.item_name,
          unit: app.items.default_unit,
        },
        // Remove the items property as it's transformed to inventory
        items: undefined,
      }));

      return {
        success: true,
        applications: transformedApplications,
        total: transformedApplications.length,
      };
    } catch (error) {
      this.logger.error('Error in listProductApplications:', error);
      throw error;
    }
  }

  /**
   * Create a new product application with stock movement
   * Creates the application record and deducts stock from inventory
   */
  async createProductApplication(
    userId: string,
    organizationId: string,
    createDto: CreateProductApplicationDto,
  ) {
    return this.executeInPgTransaction(async (client) => {
      // 0. Validate account mappings before proceeding
      const expenseAccountId = await this.accountingAutomationService.resolveAccountId(organizationId, 'cost_type', 'materials');
      const cashAccountId = await this.accountingAutomationService.resolveAccountId(organizationId, 'cash', 'bank');
      if (!expenseAccountId || !cashAccountId) {
        throw new BadRequestException(
          'Account mappings not configured for cost_type: materials. Please configure account mappings before creating product applications.',
        );
      }

      // 1. Get warehouse for stock deduction
      const warehouseId = await this.getOrganizationWarehouse(organizationId);
      if (!warehouseId) {
        throw new BadRequestException('No active warehouse found for this organization. Please create a warehouse first.');
      }

      const variantId = createDto.variant_id || null;

      // 2. Validate stock availability
      await this.validateStockAvailabilityPg(
        client,
        organizationId,
        createDto.product_id,
        variantId,
        warehouseId,
        createDto.quantity_used,
      );

      // 3. Get item details for unit (use variant unit if specified)
      let unit: string;
      if (variantId) {
        const variantResult = await client.query(
          `SELECT pv.quantity, wu.code as unit_code, i.default_unit
           FROM product_variants pv
           LEFT JOIN work_units wu ON wu.id = pv.unit_id
           JOIN items i ON i.id = pv.item_id
           WHERE pv.id = $1 AND pv.organization_id = $2`,
          [variantId, organizationId],
        );
        if (variantResult.rows.length === 0) {
          throw new NotFoundException('Product variant not found');
        }
        unit = variantResult.rows[0].unit_code || variantResult.rows[0].default_unit || 'unit';
      } else {
        const itemResult = await client.query(
          `SELECT default_unit FROM items WHERE id = $1 AND organization_id = $2`,
          [createDto.product_id, organizationId],
        );
        if (itemResult.rows.length === 0) {
          throw new NotFoundException('Product not found');
        }
        unit = itemResult.rows[0].default_unit || 'unit';
      }

      // 4. Consume valuation using FIFO to get cost
      const { totalCost, consumedBatches } = await this.consumeValuation(
        client,
        organizationId,
        createDto.product_id,
        variantId,
        warehouseId,
        createDto.quantity_used,
        'FIFO',
      );

      const costPerUnit = totalCost / createDto.quantity_used;

      // 5. Create stock movement (OUT)
      const movementResult = await client.query(
        `INSERT INTO stock_movements (
          organization_id, item_id, warehouse_id, movement_type, movement_date,
          quantity, unit, balance_quantity, cost_per_unit, total_cost,
          reference_type, reference_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          organizationId,
          createDto.product_id,
          warehouseId,
          'OUT',
          createDto.application_date,
          -createDto.quantity_used,
          unit,
          -createDto.quantity_used,
          costPerUnit,
          -totalCost,
          'ProductApplication',
          null, // Will be updated with application_id after insert
          createDto.notes || `Product application for parcel ${createDto.parcel_id || 'N/A'}`,
        ],
      );

      const stockMovement = movementResult.rows[0];

      // 6. Create product application
      const applicationResult = await client.query(
        `INSERT INTO product_applications (
          organization_id, farm_id, parcel_id, product_id, application_date,
          quantity_used, area_treated, cost, currency, notes, task_id, images
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          organizationId,
          createDto.farm_id,
          createDto.parcel_id || null,
          createDto.product_id,
          createDto.application_date,
          createDto.quantity_used,
          createDto.area_treated,
          createDto.cost,
          createDto.currency,
          createDto.notes,
          createDto.task_id || null,
          createDto.images || null,
        ],
      );

      const application = applicationResult.rows[0];

      // 7. Update stock movement with application reference
      await client.query(
        `UPDATE stock_movements
         SET reference_id = $1
         WHERE id = $2`,
        [application.id, stockMovement.id],
      );

      this.logger.log(
        `Product application created: ${createDto.quantity_used} ${unit} of item ${createDto.product_id}, ` +
        `stock deducted: ${totalCost} (${consumedBatches.length} batches consumed)`,
      );

      // 8. Create journal entry for material cost
      if (totalCost > 0) {
        await this.accountingAutomationService.createJournalEntryFromCost(
          organizationId,
          application.id,
          'materials',
          totalCost,
          new Date(createDto.application_date),
          `Product application: ${createDto.product_id}`,
          userId,
          createDto.parcel_id,
        );
      }

      // Notify operational roles about product application
      try {
        await this.notificationsService.createNotificationsForRoles(
          organizationId,
          OPERATIONAL_ROLES,
          userId,
          NotificationType.PRODUCT_APPLICATION_COMPLETED,
          `🧪 Product applied: ${createDto.quantity_used} ${unit}`,
          createDto.notes || undefined,
          { applicationId: application.id, productId: createDto.product_id, parcelId: createDto.parcel_id, quantity: createDto.quantity_used },
        );
      } catch (notifError) {
        this.logger.warn(`Failed to send product application notification: ${notifError}`);
      }

      return {
        success: true,
        application: {
          ...application,
          stock_movement_id: stockMovement.id,
        },
      };
    });
  }

  /**
   * Execute operation in PostgreSQL transaction
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
   * Validate stock availability (PostgreSQL version with locking)
   */
  private async validateStockAvailabilityPg(
    client: PoolClient,
    organizationId: string,
    itemId: string,
    variantId: string | null,
    warehouseId: string,
    requiredQuantity: number,
  ): Promise<void> {
    // Lock the relevant rows to prevent race conditions
    await client.query(
      `SELECT id FROM stock_movements
       WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
       AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))
       FOR UPDATE`,
      [organizationId, itemId, warehouseId, variantId],
    );

    // Calculate the balance (rows are now locked within this transaction)
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
   * Consume stock valuation using FIFO method
   */
  private async consumeValuation(
    client: PoolClient,
    organizationId: string,
    itemId: string,
    variantId: string | null,
    warehouseId: string,
    quantity: number,
    method: string = 'FIFO',
  ): Promise<{ totalCost: number; consumedBatches: Array<{ batchId: string; quantity: number; cost: number }> }> {
    const orderBy = method === 'FIFO' ? 'created_at ASC' : 'created_at DESC';

    // Get first available warehouse if not specified
    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
      const whResult = await client.query(
        `SELECT id FROM warehouses
         WHERE organization_id = $1 AND is_active = true
         ORDER BY created_at ASC
         LIMIT 1`,
        [organizationId],
      );
      targetWarehouseId = whResult.rows[0]?.id;
      if (!targetWarehouseId) {
        throw new BadRequestException('No active warehouse found for this organization');
      }
    }

    // Lock valuation rows ordered by created_at (FIFO) or DESC (LIFO)
    const result = await client.query(
      `SELECT id, remaining_quantity, cost_per_unit
       FROM stock_valuation
       WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
       AND remaining_quantity > 0
       ORDER BY ${orderBy}
       FOR UPDATE`,
      [organizationId, itemId, targetWarehouseId],
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

  /**
   * Get products from items that are available (stock > 0)
   * Uses stock_valuation to get current stock levels
   */
  async getAvailableProducts(userId: string, organizationId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Get all stock_valuation records with remaining_quantity > 0
      const { data: stockData, error: stockError } = await supabase
        .from('stock_valuation')
        .select('item_id, variant_id, remaining_quantity')
        .eq('organization_id', organizationId)
        .gt('remaining_quantity', 0);

      if (stockError) {
        this.logger.error('Error fetching stock data:', stockError);
        throw new InternalServerErrorException('Failed to fetch available products');
      }

      if (!stockData || stockData.length === 0) {
        return { success: true, products: [], total: 0 };
      }

      // Aggregate quantity by item_id
      const stockByItem = new Map<string, number>();
      // Aggregate quantity by variant_id
      const stockByVariant = new Map<string, number>();
      (stockData || []).forEach((stock: any) => {
        const qty = parseFloat(stock.remaining_quantity || 0);
        stockByItem.set(stock.item_id, (stockByItem.get(stock.item_id) || 0) + qty);
        if (stock.variant_id) {
          stockByVariant.set(stock.variant_id, (stockByVariant.get(stock.variant_id) || 0) + qty);
        }
      });

      const itemIds = Array.from(stockByItem.keys());

      // Fetch item details
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id, item_name, default_unit')
        .in('id', itemIds)
        .eq('is_active', true);

      if (itemsError) {
        this.logger.error('Error fetching items:', itemsError);
        throw new InternalServerErrorException('Failed to fetch product details');
      }

      // Fetch active variants for these items that have stock
      const variantIds = Array.from(stockByVariant.keys());
      let variantsByItem = new Map<string, any[]>();

      if (variantIds.length > 0) {
        const { data: variants, error: variantsError } = await supabase
          .from('product_variants')
          .select('id, item_id, variant_name, unit_id, work_units:unit_id(code)')
          .in('id', variantIds)
          .eq('is_active', true);

        if (!variantsError && variants) {
          variants.forEach((v: any) => {
            if (!variantsByItem.has(v.item_id)) variantsByItem.set(v.item_id, []);
            variantsByItem.get(v.item_id)!.push({
              id: v.id,
              name: v.variant_name,
              quantity: stockByVariant.get(v.id) || 0,
              unit: v.work_units?.code || null,
            });
          });
        }
      }

      // Merge stock data with item data and variants
      const products = (items || []).map((item: any) => ({
        id: item.id,
        name: item.item_name,
        quantity: stockByItem.get(item.id) || 0,
        unit: item.default_unit,
        variants: variantsByItem.get(item.id) || [],
      }));

      return { success: true, products, total: products.length };
    } catch (error) {
      this.logger.error('Error in getAvailableProducts:', error);
      throw error;
    }
  }
}
