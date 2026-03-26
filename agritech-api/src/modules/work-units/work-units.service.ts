import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService, OPERATIONAL_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { paginate, type PaginatedResponse } from '../../common/dto/paginated-query.dto';
import { WorkUnitFiltersDto, CreateWorkUnitDto, UpdateWorkUnitDto } from './dto';

@Injectable()
export class WorkUnitsService {
  private readonly logger = new Logger(WorkUnitsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get all work units with optional filters
   */
  async findAll(organizationId: string, filters?: WorkUnitFiltersDto): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();

    return paginate(client, 'work_units', {
      filters: (q) => {
        q = q.eq('organization_id', organizationId);
        if (filters?.is_active !== undefined) q = q.eq('is_active', filters.is_active);
        if (filters?.unit_category) q = q.eq('unit_category', filters.unit_category);
        if (filters?.search) q = q.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
        return q;
      },
      page: filters?.page || 1,
      pageSize: (filters as any)?.limit || (filters as any)?.pageSize || 50,
      orderBy: 'unit_category',
      ascending: true,
    });
  }

  /**
   * Get a single work unit by ID
   */
  async findOne(id: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('work_units')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch work unit: ${error.message}`);
      throw new BadRequestException(`Failed to fetch work unit: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Work unit not found');
    }

    return data;
  }

  /**
   * Create a new work unit
   */
  async create(dto: CreateWorkUnitDto, organizationId: string, createdBy: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    try {
      // Check for duplicate code in organization
      const { data: existing } = await client
        .from('work_units')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('code', dto.code.toUpperCase())
        .maybeSingle();

      if (existing) {
        throw new BadRequestException(`Work unit with code '${dto.code}' already exists`);
      }

      const { data, error } = await client
        .from('work_units')
        .insert({
          organization_id: organizationId,
          code: dto.code.toUpperCase(),
          name: dto.name,
          name_ar: dto.name_ar,
          name_fr: dto.name_fr,
          unit_category: dto.unit_category,
          base_unit: dto.base_unit,
          conversion_factor: dto.conversion_factor,
          is_active: dto.is_active !== undefined ? dto.is_active : true,
          allow_decimal: dto.allow_decimal !== undefined ? dto.allow_decimal : false,
          usage_count: 0,
          created_by: createdBy,
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to create work unit: ${error.message}`);
        throw new BadRequestException(`Failed to create work unit: ${error.message}`);
      }

      // Notify operational roles about new work unit
      try {
        await this.notificationsService.createNotificationsForRoles(
          organizationId,
          OPERATIONAL_ROLES,
          createdBy,
          NotificationType.WORK_UNIT_COMPLETED,
          `📊 New work unit: ${dto.name} (${dto.code})`,
          dto.name_fr || undefined,
          { workUnitId: data.id, code: dto.code, name: dto.name },
        );
      } catch (notifError) {
        this.logger.warn(`Failed to send work unit notification: ${notifError}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error creating work unit:', error);
      throw error;
    }
  }

  /**
   * Update a work unit
   */
  async update(id: string, organizationId: string, dto: UpdateWorkUnitDto): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // Verify unit exists
    await this.findOne(id, organizationId);

    const { data, error } = await client
      .from('work_units')
      .update(dto)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update work unit: ${error.message}`);
      throw new BadRequestException(`Failed to update work unit: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a work unit
   */
  async delete(id: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // Verify unit exists
    const unit = await this.findOne(id, organizationId);

    // Check if unit is being used
    if (unit.usage_count > 0) {
      throw new BadRequestException(
        'Cannot delete work unit that is being used. Set is_active to false instead.'
      );
    }

    const { error } = await client
      .from('work_units')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete work unit: ${error.message}`);
      throw new BadRequestException(`Failed to delete work unit: ${error.message}`);
    }

    return { message: 'Work unit deleted successfully' };
  }
}
