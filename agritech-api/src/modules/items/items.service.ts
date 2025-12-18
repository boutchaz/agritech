import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateItemGroupDto, UpdateItemGroupDto } from './dto/create-item-group.dto';

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  constructor(private readonly databaseService: DatabaseService) { }

  // =====================================================
  // ITEM GROUPS
  // =====================================================

  async findAllItemGroups(organizationId: string, filters?: any): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('item_groups')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (filters?.parent_group_id !== undefined) {
      if (filters.parent_group_id === null) {
        query = query.is('parent_group_id', null);
      } else {
        query = query.eq('parent_group_id', filters.parent_group_id);
      }
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch item groups: ${error.message}`);
      throw new BadRequestException(`Failed to fetch item groups: ${error.message}`);
    }

    return data;
  }

  async findOneItemGroup(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('item_groups')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch item group: ${error.message}`);
      throw new BadRequestException(`Failed to fetch item group: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Item group not found');
    }

    return data;
  }

  async createItemGroup(dto: CreateItemGroupDto): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('item_groups')
      .insert({
        ...dto,
        updated_by: dto.created_by,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create item group: ${error.message}`);
      throw new BadRequestException(`Failed to create item group: ${error.message}`);
    }

    return data;
  }

  async updateItemGroup(id: string, organizationId: string, userId: string, dto: UpdateItemGroupDto): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('item_groups')
      .update({
        ...dto,
        updated_by: userId,
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update item group: ${error.message}`);
      throw new BadRequestException(`Failed to update item group: ${error.message}`);
    }

    return data;
  }

  async deleteItemGroup(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // Check if group has items
    const { data: items } = await supabase
      .from('items')
      .select('id')
      .eq('item_group_id', id)
      .limit(1);

    if (items && items.length > 0) {
      throw new BadRequestException('Cannot delete item group with items. Please move or delete items first.');
    }

    // Check if group has children
    const { data: children } = await supabase
      .from('item_groups')
      .select('id')
      .eq('parent_group_id', id)
      .limit(1);

    if (children && children.length > 0) {
      throw new BadRequestException('Cannot delete item group with child groups. Please move or delete child groups first.');
    }

    const { error } = await supabase
      .from('item_groups')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete item group: ${error.message}`);
      throw new BadRequestException(`Failed to delete item group: ${error.message}`);
    }

    return { message: 'Item group deleted successfully' };
  }

  // =====================================================
  // ITEMS
  // =====================================================

  async findAllItems(organizationId: string, filters?: any): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('items')
      .select(`
        *,
        item_group:item_groups(id, name, code, path)
      `)
      .eq('organization_id', organizationId)
      .order('item_code', { ascending: true });

    if (filters?.item_group_id) {
      query = query.eq('item_group_id', filters.item_group_id);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.is_sales_item !== undefined) {
      query = query.eq('is_sales_item', filters.is_sales_item);
    }

    if (filters?.is_purchase_item !== undefined) {
      query = query.eq('is_purchase_item', filters.is_purchase_item);
    }

    if (filters?.is_stock_item !== undefined) {
      query = query.eq('is_stock_item', filters.is_stock_item);
    }

    if (filters?.crop_type) {
      query = query.eq('crop_type', filters.crop_type);
    }

    if (filters?.variety) {
      query = query.eq('variety', filters.variety);
    }

    if (filters?.search) {
      query = query.or(`item_code.ilike.%${filters.search}%,item_name.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch items: ${error.message}`);
      throw new BadRequestException(`Failed to fetch items: ${error.message}`);
    }

    return data;
  }

  async findOneItem(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        item_group:item_groups(*)
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch item: ${error.message}`);
      throw new BadRequestException(`Failed to fetch item: ${error.message}`);
    }

    return data;
  }

  async createItem(dto: CreateItemDto): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // Generate item code if not provided
    let itemCode = dto.item_code;
    if (!itemCode) {
      const { data: generatedCode, error: codeError } = await supabase.rpc(
        'generate_item_code',
        {
          p_organization_id: dto.organization_id,
          p_item_group_id: dto.item_group_id,
          p_prefix: null,
        }
      );

      if (codeError) {
        this.logger.error(`Failed to generate item code: ${codeError.message}`);
        throw new BadRequestException(`Failed to generate item code: ${codeError.message}`);
      }
      itemCode = generatedCode as string;
    }

    // Prepare item data with explicit defaults for boolean fields
    const itemData = {
      ...dto,
      item_code: itemCode,
      stock_uom: dto.stock_uom || dto.default_unit,
      updated_by: dto.created_by,
      // Ensure boolean fields have proper defaults
      is_active: dto.is_active ?? true,
      is_sales_item: dto.is_sales_item ?? false,
      is_purchase_item: dto.is_purchase_item ?? false,
      is_stock_item: dto.is_stock_item ?? true,
    };

    this.logger.debug(`Creating item with data: ${JSON.stringify(itemData)}`);

    const { data, error } = await supabase
      .from('items')
      .insert(itemData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create item: ${error.message}`);
      throw new BadRequestException(`Failed to create item: ${error.message}`);
    }

    this.logger.debug(`Created item: ${JSON.stringify(data)}`);

    return data;
  }

  async updateItem(id: string, organizationId: string, userId: string, dto: UpdateItemDto): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('items')
      .update({
        ...dto,
        updated_by: userId,
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update item: ${error.message}`);
      throw new BadRequestException(`Failed to update item: ${error.message}`);
    }

    return data;
  }

  async deleteItem(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // Check if item is used in stock entries
    const { data: stockEntries } = await supabase
      .from('stock_entry_items')
      .select('id')
      .eq('item_id', id)
      .limit(1);

    if (stockEntries && stockEntries.length > 0) {
      throw new BadRequestException('Cannot delete item used in stock transactions. Please deactivate it instead.');
    }

    // Check if item is used in invoices
    const { data: invoices } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('item_id', id)
      .limit(1);

    if (invoices && invoices.length > 0) {
      throw new BadRequestException('Cannot delete item used in invoices. Please deactivate it instead.');
    }

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete item: ${error.message}`);
      throw new BadRequestException(`Failed to delete item: ${error.message}`);
    }

    return { message: 'Item deleted successfully' };
  }

  // =====================================================
  // ITEM SELECTION (Lightweight for dropdowns)
  // =====================================================

  async getItemsForSelection(organizationId: string, filters?: any): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('items')
      .select(`
        id,
        item_code,
        item_name,
        default_unit,
        standard_rate,
        item_group:item_groups(id, name)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('item_name', { ascending: true });

    if (filters?.is_sales_item) {
      query = query.eq('is_sales_item', true);
    }

    if (filters?.is_purchase_item) {
      query = query.eq('is_purchase_item', true);
    }

    if (filters?.is_stock_item) {
      query = query.eq('is_stock_item', true);
    }

    if (filters?.search) {
      query = query.or(`item_code.ilike.%${filters.search}%,item_name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch items for selection: ${error.message}`);
      throw new BadRequestException(`Failed to fetch items for selection: ${error.message}`);
    }

    return data;
  }

  // =====================================================
  // STOCK LEVELS & FARM INTEGRATION
  // =====================================================

  /**
   * Get stock levels grouped by farm with warehouse relationships
   */
  async getFarmStockLevels(
    organizationId: string,
    filters?: {
      farm_id?: string;
      item_id?: string;
      low_stock_only?: boolean;
    },
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // First, get warehouse IDs for the farm if filtering by farm
    let warehouseIds: string[] | null = null;
    if (filters?.farm_id) {
      const { data: warehouses, error: whError } = await supabase
        .from('warehouses')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('farm_id', filters.farm_id)
        .eq('is_active', true);

      if (whError) {
        this.logger.error(`Failed to fetch warehouses: ${whError.message}`);
        throw new BadRequestException(`Failed to fetch warehouses: ${whError.message}`);
      }

      warehouseIds = warehouses?.map((w) => w.id) || [];
      if (warehouseIds.length === 0) {
        return []; // No warehouses for this farm
      }
    }

    let query = supabase
      .from('stock_valuation')
      .select(`
        item_id,
        warehouse_id,
        remaining_quantity,
        total_cost,
        warehouse:warehouses!inner(
          id,
          name,
          farm_id,
          farm:farms(id, name)
        ),
        item:items!inner(
          id,
          item_code,
          item_name,
          default_unit,
          minimum_stock_level
        )
      `)
      .eq('organization_id', organizationId)
      .gt('remaining_quantity', 0);

    if (warehouseIds) {
      query = query.in('warehouse_id', warehouseIds);
    }

    if (filters?.item_id) {
      query = query.eq('item_id', filters.item_id);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch farm stock levels: ${error.message}`);
      throw new BadRequestException(`Failed to fetch farm stock levels: ${error.message}`);
    }

    // Group by item_id and aggregate
    const itemMap = new Map<string, any>();

    (data || []).forEach((row: any) => {
      const item = row.item;
      const warehouse = row.warehouse;
      const farm = warehouse?.farm;

      if (!item || !warehouse) return;

      const itemId = item.id;
      const quantity = parseFloat(row.remaining_quantity || 0);
      const value = parseFloat(row.total_cost || 0);
      const minStock = item.minimum_stock_level
        ? parseFloat(item.minimum_stock_level)
        : undefined;

      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, {
          item_id: itemId,
          item_code: item.item_code,
          item_name: item.item_name,
          default_unit: item.default_unit,
          minimum_stock_level: minStock,
          total_quantity: 0,
          total_value: 0,
          is_low_stock: false,
          by_farm: [],
        });
      }

      const itemData = itemMap.get(itemId);
      itemData.total_quantity += quantity;
      itemData.total_value += value;

      // Add farm-level stock
      const farmStock = {
        farm_id: farm?.id || null,
        farm_name: farm?.name || null,
        warehouse_id: warehouse.id,
        warehouse_name: warehouse.name,
        item_id: itemId,
        total_quantity: quantity,
        total_value: value,
        is_low_stock: minStock !== undefined && quantity < minStock,
        minimum_stock_level: minStock,
      };

      itemData.by_farm.push(farmStock);

      // Check if overall stock is low
      if (minStock !== undefined && itemData.total_quantity < minStock) {
        itemData.is_low_stock = true;
      }
    });

    let result = Array.from(itemMap.values());

    // Filter low stock only if requested
    if (filters?.low_stock_only) {
      result = result.filter((item) => item.is_low_stock);
    }

    return result;
  }

  /**
   * Get item usage by farm/parcel
   */
  async getItemFarmUsage(organizationId: string, itemId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // Query stock movements (OUT movements indicate usage)
    const { data: movements, error: movementsError } = await supabase
      .from('stock_movements')
      .select(`
        id,
        movement_date,
        quantity,
        warehouse_id,
        warehouse:warehouses!inner(
          id,
          farm_id,
          farm:farms(id, name)
        )
      `)
      .eq('organization_id', organizationId)
      .eq('item_id', itemId)
      .eq('movement_type', 'OUT')
      .order('movement_date', { ascending: false });

    if (movementsError) {
      this.logger.warn(`Could not fetch stock movements: ${movementsError.message}`);
    }

    // Query tasks that might reference this item
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        created_at,
        parcel_id,
        parcel:parcels(
          id,
          name,
          farm_id,
          farm:farms(id, name)
        )
      `)
      .eq('organization_id', organizationId)
      .not('parcel_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (tasksError) {
      this.logger.warn(`Could not fetch tasks: ${tasksError.message}`);
    }

    // Aggregate usage by farm
    const farmMap = new Map<string, any>();
    const parcelMap = new Map<string, any>();

    // Process stock movements
    (movements || []).forEach((movement: any) => {
      const warehouse = movement.warehouse;
      const farm = warehouse?.farm;

      if (!farm) return;

      const farmId = farm.id;
      const quantity = parseFloat(movement.quantity || 0);
      const movementDate = movement.movement_date;

      if (!farmMap.has(farmId)) {
        farmMap.set(farmId, {
          farm_id: farmId,
          farm_name: farm.name,
          usage_count: 0,
          total_quantity_used: 0,
          task_ids: [],
        });
      }

      const farmUsage = farmMap.get(farmId);
      farmUsage.usage_count += 1;
      farmUsage.total_quantity_used += quantity;

      if (!farmUsage.last_used_date || movementDate > farmUsage.last_used_date) {
        farmUsage.last_used_date = movementDate;
      }
    });

    // Process tasks
    (tasks || []).forEach((task: any) => {
      const parcel = task.parcel;
      if (!parcel || !parcel.farm) return;

      const farmId = parcel.farm.id;
      const parcelId = parcel.id;

      const parcelKey = `${farmId}_${parcelId}`;
      if (!parcelMap.has(parcelKey)) {
        parcelMap.set(parcelKey, {
          farm_id: farmId,
          farm_name: parcel.farm.name,
          parcel_id: parcelId,
          parcel_name: parcel.name,
          usage_count: 0,
          total_quantity_used: 0,
          task_ids: [],
        });
      }

      const parcelUsage = parcelMap.get(parcelKey);
      parcelUsage.usage_count += 1;
      parcelUsage.task_ids.push(task.id);

      if (!farmMap.has(farmId)) {
        farmMap.set(farmId, {
          farm_id: farmId,
          farm_name: parcel.farm.name,
          usage_count: 0,
          total_quantity_used: 0,
          task_ids: [],
        });
      }

      const farmUsage = farmMap.get(farmId);
      farmUsage.usage_count += 1;
      if (!farmUsage.task_ids.includes(task.id)) {
        farmUsage.task_ids.push(task.id);
      }
    });

    // Combine farm and parcel usage
    const byFarm = Array.from(farmMap.values()).map((farmUsage) => {
      const parcelUsages = Array.from(parcelMap.values()).filter(
        (p) => p.farm_id === farmUsage.farm_id,
      );

      return {
        ...farmUsage,
        parcels: parcelUsages.length > 0 ? parcelUsages : undefined,
      };
    });

    // Calculate totals
    const totalUsageCount = byFarm.reduce((sum, f) => sum + f.usage_count, 0);
    const totalQuantityUsed = byFarm.reduce((sum, f) => sum + f.total_quantity_used, 0);
    const lastUsedDate = byFarm
      .map((f) => f.last_used_date)
      .filter(Boolean)
      .sort()
      .reverse()[0];

    return {
      item_id: itemId,
      total_usage_count: totalUsageCount,
      last_used_date: lastUsedDate,
      total_quantity_used: totalQuantityUsed,
      by_farm: byFarm,
    };
  }

  /**
   * Get stock levels for items with farm context
   */
  async getStockLevels(
    organizationId: string,
    filters?: {
      farm_id?: string;
      item_id?: string;
    },
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    try {
      // First, get warehouse IDs for the farm if filtering by farm
      let warehouseIds: string[] | null = null;
      if (filters?.farm_id) {
        const { data: warehouses, error: whError } = await supabase
          .from('warehouses')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('farm_id', filters.farm_id)
          .eq('is_active', true);

        if (whError) {
          this.logger.error(`Failed to fetch warehouses: ${whError.message}`);
          throw new BadRequestException(`Failed to fetch warehouses: ${whError.message}`);
        }

        warehouseIds = warehouses?.map((w) => w.id) || [];
        if (warehouseIds.length === 0) {
          return {}; // No warehouses for this farm
        }
      }

      // Query stock valuation with explicit column selection to avoid schema cache issues
      let query = supabase
        .from('stock_valuation')
        .select(`
          item_id,
          remaining_quantity,
          total_cost,
          warehouse_id
        `)
        .eq('organization_id', organizationId)
        .gt('remaining_quantity', 0);

      if (warehouseIds) {
        query = query.in('warehouse_id', warehouseIds);
      }

      if (filters?.item_id) {
        query = query.eq('item_id', filters.item_id);
      }

      const { data: stockData, error: stockError } = await query;

      if (stockError) {
        this.logger.error(`Failed to fetch stock levels: ${stockError.message}`);
        throw new BadRequestException(`Failed to fetch stock levels: ${stockError.message}`);
      }

      if (!stockData || stockData.length === 0) {
        return {};
      }

      // Get unique warehouse and item IDs
      const uniqueWarehouseIds = [...new Set(stockData.map(s => s.warehouse_id))];
      const uniqueItemIds = [...new Set(stockData.map(s => s.item_id))];

      // Fetch warehouse details separately
      const { data: warehouses } = await supabase
        .from('warehouses')
        .select('id, name, farm_id, farm:farms(id, name)')
        .in('id', uniqueWarehouseIds);

      // Fetch item details separately
      const { data: items } = await supabase
        .from('items')
        .select('id, item_code, item_name, default_unit')
        .in('id', uniqueItemIds);

      // Create lookup maps
      const warehouseMap = new Map(warehouses?.map(w => [w.id, w]) || []);
      const itemMap = new Map(items?.map(i => [i.id, i]) || []);

      // Aggregate by item_id with farm context
      const aggregated = stockData.reduce((acc: any, val: any) => {
        const itemId = val.item_id;
        if (!acc[itemId]) {
          const item = itemMap.get(itemId);
          acc[itemId] = {
            item_id: itemId,
            item_code: item?.item_code || null,
            item_name: item?.item_name || 'Unknown Item',
            default_unit: item?.default_unit || null,
            total_quantity: 0,
            total_value: 0,
            warehouses: [], // Will be aggregated below
            _warehouseMap: new Map(), // Temporary map for warehouse aggregation
          };
        }

        const quantity = parseFloat(val.remaining_quantity || 0);
        const value = parseFloat(val.total_cost || 0);
        acc[itemId].total_quantity += quantity;
        acc[itemId].total_value += value;

        // Aggregate warehouse info (multiple FIFO batches per warehouse should be combined)
        const warehouse = warehouseMap.get(val.warehouse_id);
        if (warehouse) {
          const existingWh = acc[itemId]._warehouseMap.get(warehouse.id);
          if (existingWh) {
            // Add to existing warehouse totals
            existingWh.quantity += quantity;
            existingWh.value += value;
          } else {
            // New warehouse entry
            acc[itemId]._warehouseMap.set(warehouse.id, {
              warehouse_id: warehouse.id,
              warehouse_name: warehouse.name,
              farm_id: warehouse.farm_id,
              farm_name: (warehouse as any).farm?.name || null,
              quantity,
              value,
            });
          }
        }

        return acc;
      }, {});

      // Convert warehouse maps to arrays and remove temporary _warehouseMap
      Object.keys(aggregated).forEach((itemId) => {
        aggregated[itemId].warehouses = Array.from(aggregated[itemId]._warehouseMap.values());
        delete aggregated[itemId]._warehouseMap;
      });

      return aggregated;
    } catch (error) {
      this.logger.error('Error in getStockLevels:', error);
      throw error;
    }
  }

  // =====================================================
  // ITEM PRICES
  // =====================================================

  /**
   * Get all prices for a specific item
   */
  async getItemPrices(itemId: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('item_prices')
      .select(`
        *,
        customer:customers(id, name),
        supplier:suppliers(id, name)
      `)
      .eq('item_id', itemId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('price_list_name', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch item prices: ${error.message}`);
      throw new BadRequestException(`Failed to fetch item prices: ${error.message}`);
    }

    return data;
  }

}
