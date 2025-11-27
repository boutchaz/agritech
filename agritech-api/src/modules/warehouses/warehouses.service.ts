import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class WarehousesService {
  private readonly logger = new Logger(WarehousesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(organizationId: string): Promise<any> {
    const supabase = this.databaseService.getClient();

    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch warehouses: ${error.message}`);
      throw new BadRequestException(`Failed to fetch warehouses: ${error.message}`);
    }

    return data;
  }

  async getInventory(organizationId: string, filters?: any): Promise<any> {
    const supabase = this.databaseService.getClient();

    let query = supabase
      .from('inventory_items')
      .select(`
        *,
        item:items(id, item_code, item_name, default_unit),
        warehouse:warehouses(id, name)
      `)
      .eq('organization_id', organizationId)
      .order('item_name', { ascending: true });

    if (filters?.warehouse_id) {
      query = query.eq('warehouse_id', filters.warehouse_id);
    }

    if (filters?.item_id) {
      query = query.eq('item_id', filters.item_id);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch inventory: ${error.message}`);
      throw new BadRequestException(`Failed to fetch inventory: ${error.message}`);
    }

    return data;
  }
}
