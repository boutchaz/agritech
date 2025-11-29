import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { HarvestFiltersDto } from './dto/harvest-filters.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class HarvestsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private async verifyOrganizationAccess(userId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();
    const { data: orgUser } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }
  }

  async findAll(userId: string, organizationId: string, filters?: HarvestFiltersDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    let query = client
      .from('harvest_records')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters?.status) {
      const statuses = filters.status.split(',');
      query = query.in('status', statuses);
    }

    if (filters?.farm_id) query = query.eq('farm_id', filters.farm_id);
    if (filters?.parcel_id) query = query.eq('parcel_id', filters.parcel_id);
    if (filters?.crop_id) query = query.eq('crop_id', filters.crop_id);
    if (filters?.date_from) query = query.gte('harvest_date', filters.date_from);
    if (filters?.date_to) query = query.lte('harvest_date', filters.date_to);
    if (filters?.intended_for) query = query.eq('intended_for', filters.intended_for);

    if (filters?.quality_grade) {
      const grades = filters.quality_grade.split(',');
      query = query.in('quality_grade', grades);
    }

    query = query.order('harvest_date', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch harvests: ${error.message}`);

    return data || [];
  }

  async findOne(userId: string, organizationId: string, harvestId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('harvest_records')
      .select('*')
      .eq('id', harvestId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch harvest: ${error.message}`);
    if (!data) throw new NotFoundException('Harvest not found');

    return data;
  }

  async create(userId: string, organizationId: string, createHarvestDto: CreateHarvestDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('harvest_records')
      .insert({
        ...createHarvestDto,
        organization_id: organizationId,
        created_by: userId,
        status: 'stored',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create harvest: ${error.message}`);
    return data;
  }

  async update(userId: string, organizationId: string, harvestId: string, updateHarvestDto: UpdateHarvestDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data: existing } = await client
      .from('harvest_records')
      .select('id')
      .eq('id', harvestId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Harvest not found');

    const { data, error } = await client
      .from('harvest_records')
      .update(updateHarvestDto)
      .eq('id', harvestId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update harvest: ${error.message}`);
    return data;
  }

  async remove(userId: string, organizationId: string, harvestId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data: existing } = await client
      .from('harvest_records')
      .select('id')
      .eq('id', harvestId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Harvest not found');

    const { error } = await client
      .from('harvest_records')
      .delete()
      .eq('id', harvestId);

    if (error) throw new Error(`Failed to delete harvest: ${error.message}`);
    return { message: 'Harvest deleted successfully' };
  }
}
