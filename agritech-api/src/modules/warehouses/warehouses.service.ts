import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto';
import { paginatedResponse, type PaginatedResponse } from '../../common/dto/paginated-query.dto';

@Injectable()
export class WarehousesService {
  private readonly logger = new Logger(WarehousesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(organizationId: string, page = 1, pageSize = 100): Promise<PaginatedResponse<any>> {
    const supabase = this.databaseService.getAdminClient();

    const { count } = await supabase
      .from('warehouses')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    const from = (page - 1) * pageSize;
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      this.logger.error(`Failed to fetch warehouses: ${error.message}`);
      throw new BadRequestException(`Failed to fetch warehouses: ${error.message}`);
    }

    return paginatedResponse(data || [], count || 0, page, pageSize);
  }

  async findOne(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    return data;
  }

  async create(dto: CreateWarehouseDto, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('warehouses')
      .insert({
        organization_id: organizationId,
        name: dto.name,
        description: dto.description || null,
        location: dto.location || null,
        address: dto.address || null,
        city: dto.city || null,
        postal_code: dto.postal_code || null,
        capacity: dto.capacity || null,
        capacity_unit: dto.capacity_unit || null,
        temperature_controlled: dto.temperature_controlled ?? false,
        humidity_controlled: dto.humidity_controlled ?? false,
        security_level: dto.security_level || 'standard',
        manager_name: dto.manager_name || null,
        manager_phone: dto.manager_phone || null,
        farm_id: dto.farm_id || null,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create warehouse: ${error.message}`);
      throw new BadRequestException(`Failed to create warehouse: ${error.message}`);
    }

    return data;
  }

  async update(id: string, dto: UpdateWarehouseDto, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // First verify the warehouse exists and belongs to the organization
    await this.findOne(id, organizationId);

    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.postal_code !== undefined) updateData.postal_code = dto.postal_code;
    if (dto.capacity !== undefined) updateData.capacity = dto.capacity;
    if (dto.capacity_unit !== undefined) updateData.capacity_unit = dto.capacity_unit;
    if (dto.temperature_controlled !== undefined) updateData.temperature_controlled = dto.temperature_controlled;
    if (dto.humidity_controlled !== undefined) updateData.humidity_controlled = dto.humidity_controlled;
    if (dto.security_level !== undefined) updateData.security_level = dto.security_level;
    if (dto.manager_name !== undefined) updateData.manager_name = dto.manager_name;
    if (dto.manager_phone !== undefined) updateData.manager_phone = dto.manager_phone;
    if (dto.farm_id !== undefined) updateData.farm_id = dto.farm_id;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

    const { data, error } = await supabase
      .from('warehouses')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update warehouse: ${error.message}`);
      throw new BadRequestException(`Failed to update warehouse: ${error.message}`);
    }

    return data;
  }

  async delete(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // First verify the warehouse exists and belongs to the organization
    await this.findOne(id, organizationId);

    const { error } = await supabase
      .from('warehouses')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete warehouse: ${error.message}`);
      throw new BadRequestException(`Failed to delete warehouse: ${error.message}`);
    }

    return { message: 'Warehouse deleted successfully' };
  }

  async getInventory(organizationId: string, filters?: any): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

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
