import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService, MANAGEMENT_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { paginatedResponse, type PaginatedResponse } from '../../common/dto/paginated-query.dto';
import { SoilAnalysisFiltersDto, CreateSoilAnalysisDto, UpdateSoilAnalysisDto } from './dto';

@Injectable()
export class SoilAnalysesService {
  private readonly logger = new Logger(SoilAnalysesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get all soil analyses with optional filters
   * Note: soil_analyses table doesn't have organization_id, so we validate via parcel ownership
   */
  async findAll(organizationId: string, filters?: SoilAnalysisFiltersDto): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();

    try {
      let query = client
        .from('soil_analyses')
        .select('*');

      // Filter by single parcel_id
      if (filters?.parcel_id) {
        query = query.eq('parcel_id', filters.parcel_id);
      }

      // Filter by multiple parcel_ids (using in clause)
      if (filters?.parcel_ids && filters.parcel_ids.length > 0) {
        query = query.in('parcel_id', filters.parcel_ids);
      }

      if (filters?.test_type_id) {
        query = query.eq('test_type_id', filters.test_type_id);
      }

      if (filters?.date_from) {
        query = query.gte('analysis_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('analysis_date', filters.date_to);
      }

      // Apply pagination
      if (filters?.page && filters?.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query = query.range(offset, offset + filters.limit - 1);
      }

      // Default ordering: analysis_date desc
      query = query.order('analysis_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Failed to fetch soil analyses: ${error.message}`);
        throw new BadRequestException(`Failed to fetch soil analyses: ${error.message}`);
      }

      // Verify parcel ownership if results exist
      if (data && data.length > 0) {
        const parcelIds = [...new Set(data.map((sa: any) => sa.parcel_id).filter(Boolean))];

        if (parcelIds.length > 0) {
          const { data: parcels } = await client
            .from('parcels')
            .select('id, farm_id')
            .in('id', parcelIds);

          if (parcels && parcels.length > 0) {
            const farmIds = [...new Set(parcels.map(p => p.farm_id).filter(Boolean))];

            if (farmIds.length > 0) {
              const { data: farms } = await client
                .from('farms')
                .select('id')
                .eq('organization_id', organizationId)
                .in('id', farmIds);

              // Filter out analyses from parcels not owned by this organization
              const ownedFarmIds = new Set((farms || []).map(f => f.id));
              const ownedParcelIds = new Set(
                (parcels || [])
                  .filter(p => ownedFarmIds.has(p.farm_id))
                  .map(p => p.id)
              );

              const filtered = data.filter((sa: any) => ownedParcelIds.has(sa.parcel_id));
              const page = filters?.page || 1;
              const limit = filters?.limit || 50;
              return paginatedResponse(filtered, filtered.length, page, limit);
            }
          }
        }
      }

      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      return paginatedResponse(data || [], (data || []).length, page, limit);
    } catch (error) {
      this.logger.error('Error fetching soil analyses:', error);
      throw error;
    }
  }

  /**
   * Get a single soil analysis by ID
   */
  async findOne(id: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('soil_analyses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch soil analysis: ${error.message}`);
      throw new BadRequestException(`Failed to fetch soil analysis: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Soil analysis not found');
    }

    // Verify ownership via parcel -> farm -> organization
    if (data.parcel_id) {
      await this.verifyParcelOwnership(data.parcel_id, organizationId);
    }

    return data;
  }

  /**
   * Create a new soil analysis
   */
  async create(dto: CreateSoilAnalysisDto, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    try {
      // Verify parcel ownership
      await this.verifyParcelOwnership(dto.parcel_id, organizationId);

      const { data, error } = await client
        .from('soil_analyses')
        .insert({
          analysis_date: dto.analysis_date,
          parcel_id: dto.parcel_id,
          test_type_id: dto.test_type_id,
          physical: dto.physical,
          chemical: dto.chemical,
          biological: dto.biological,
          notes: dto.notes,
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to create soil analysis: ${error.message}`);
        throw new BadRequestException(`Failed to create soil analysis: ${error.message}`);
      }

      // Notify management about completed soil analysis
      try {
        await this.notificationsService.createNotificationsForRoles(
          organizationId,
          MANAGEMENT_ROLES,
          null,
          NotificationType.SOIL_ANALYSIS_COMPLETED,
          `🌍 Soil analysis completed`,
          dto.notes || undefined,
          { analysisId: data.id, parcelId: dto.parcel_id, analysisType: dto.test_type_id },
        );
      } catch (notifError) {
        this.logger.warn(`Failed to send soil analysis notification: ${notifError}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error creating soil analysis:', error);
      throw error;
    }
  }

  /**
   * Update a soil analysis
   */
  async update(id: string, organizationId: string, dto: UpdateSoilAnalysisDto): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // Verify exists and owned
    await this.findOne(id, organizationId);

    // If updating parcel_id, verify new parcel ownership
    if (dto.parcel_id) {
      await this.verifyParcelOwnership(dto.parcel_id, organizationId);
    }

    const { data, error } = await client
      .from('soil_analyses')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update soil analysis: ${error.message}`);
      throw new BadRequestException(`Failed to update soil analysis: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a soil analysis
   */
  async delete(id: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // Verify exists and owned
    await this.findOne(id, organizationId);

    const { error } = await client
      .from('soil_analyses')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete soil analysis: ${error.message}`);
      throw new BadRequestException(`Failed to delete soil analysis: ${error.message}`);
    }

    return { message: 'Soil analysis deleted successfully' };
  }

  /**
   * Helper: Verify parcel ownership via farm -> organization
   */
  private async verifyParcelOwnership(parcelId: string, organizationId: string): Promise<void> {
    const client = this.databaseService.getAdminClient();

    const { data: parcel, error: parcelError } = await client
      .from('parcels')
      .select('farm_id')
      .eq('id', parcelId)
      .maybeSingle();

    if (parcelError || !parcel) {
      throw new NotFoundException('Parcel not found');
    }

    const { data: farm, error: farmError } = await client
      .from('farms')
      .select('organization_id')
      .eq('id', parcel.farm_id)
      .maybeSingle();

    if (farmError || !farm) {
      throw new NotFoundException('Farm not found');
    }

    if (farm.organization_id !== organizationId) {
      throw new BadRequestException('Parcel does not belong to your organization');
    }
  }
}
