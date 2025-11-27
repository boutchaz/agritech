import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateItemGroupDto, UpdateItemGroupDto } from './dto/create-item-group.dto';

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  // =====================================================
  // ITEM GROUPS
  // =====================================================

  async findAllItemGroups(organizationId: string, filters?: any): Promise<any> {
    const supabase = this.databaseService.getClient();

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
    const supabase = this.databaseService.getClient();

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
    const supabase = this.databaseService.getClient();

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
    const supabase = this.databaseService.getClient();

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
    const supabase = this.databaseService.getClient();

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
    const supabase = this.databaseService.getClient();

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
    const supabase = this.databaseService.getClient();

    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        item_group:item_groups(*),
        variants:item_variants(*),
        unit_conversions:item_unit_conversions(*),
        supplier_details:item_supplier_details(
          *,
          supplier:suppliers(id, name)
        ),
        customer_details:item_customer_details(
          *,
          customer:customers(id, name)
        ),
        prices:item_prices(*)
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
    const supabase = this.databaseService.getClient();

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

    const { data, error } = await supabase
      .from('items')
      .insert({
        ...dto,
        item_code: itemCode,
        stock_uom: dto.stock_uom || dto.default_unit,
        updated_by: dto.created_by,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create item: ${error.message}`);
      throw new BadRequestException(`Failed to create item: ${error.message}`);
    }

    return data;
  }

  async updateItem(id: string, organizationId: string, userId: string, dto: UpdateItemDto): Promise<any> {
    const supabase = this.databaseService.getClient();

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
    const supabase = this.databaseService.getClient();

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
    const supabase = this.databaseService.getClient();

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
}
