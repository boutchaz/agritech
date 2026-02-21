import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SatelliteIndexFiltersDto, CreateSatelliteIndexDto } from './dto';

@Injectable()
export class SatelliteIndicesService {
  private readonly logger = new Logger(SatelliteIndicesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all satellite indices with optional filters
   */
  async findAll(organizationId: string, filters?: SatelliteIndexFiltersDto): Promise<any> {
    const client = this.databaseService.getAdminClient();

    try {
      let query = client
        .from('satellite_indices_data')
        .select('*')
        .eq('organization_id', organizationId);

      // Apply filters
      if (filters?.parcel_id) {
        query = query.eq('parcel_id', filters.parcel_id);
      }

      if (filters?.farm_id) {
        query = query.eq('farm_id', filters.farm_id);
      }

      if (filters?.index_name) {
        query = query.eq('index_name', filters.index_name);
      }

      if (filters?.date_from) {
        query = query.gte('date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('date', filters.date_to);
      }

      if (filters?.created_at_from) {
        query = query.gte('created_at', filters.created_at_from);
      }

      query = query.not('mean_value', 'is', null);

      // Apply pagination
      if (filters?.page && filters?.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query = query.range(offset, offset + filters.limit - 1);
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Failed to fetch satellite indices: ${error.message}`);
        throw new BadRequestException(`Failed to fetch satellite indices: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error fetching satellite indices:', error);
      throw error;
    }
  }

  /**
   * Get a single satellite index by ID
   */
  async findOne(id: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('satellite_indices_data')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch satellite index: ${error.message}`);
      throw new BadRequestException(`Failed to fetch satellite index: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Satellite index not found');
    }

    return data;
  }

  /**
   * Create a new satellite index entry
   */
  async create(dto: CreateSatelliteIndexDto, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    try {
      const { data, error } = await client
        .from('satellite_indices_data')
        .upsert(
          {
            ...dto,
            organization_id: organizationId,
          },
          { onConflict: 'parcel_id,index_name,date' },
        )
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to upsert satellite index: ${error.message}`);
        throw new BadRequestException(`Failed to upsert satellite index: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error upserting satellite index:', error);
      throw error;
    }
  }

  /**
   * Delete a satellite index entry
   */
  async delete(id: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // Verify exists
    await this.findOne(id, organizationId);

    const { error } = await client
      .from('satellite_indices_data')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete satellite index: ${error.message}`);
      throw new BadRequestException(`Failed to delete satellite index: ${error.message}`);
    }

    return { message: 'Satellite index deleted successfully' };
  }
}
