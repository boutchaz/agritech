import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { sanitizeSearch } from '../../common/utils/sanitize-search';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { CreateQualityInspectionDto, InspectionStatus } from './dto';
import { QualityInspectionFiltersDto } from './dto/quality-inspection-filters.dto';

@Injectable()
export class QualityControlService {
  private readonly logger = new Logger(QualityControlService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(organizationId: string, filters: QualityInspectionFiltersDto = {}) {
    const client = this.databaseService.getAdminClient();
    let query = client
      .from('quality_inspections')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    // Apply filters
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.farm_id) {
      query = query.eq('farm_id', filters.farm_id);
    }
    if (filters.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }
    if (filters.crop_cycle_id) {
      query = query.eq('crop_cycle_id', filters.crop_cycle_id);
    }
    if (filters.inspector_id) {
      query = query.eq('inspector_id', filters.inspector_id);
    }
    if (filters.inspection_date_from) {
      query = query.gte('inspection_date', filters.inspection_date_from);
    }
    if (filters.inspection_date_to) {
      query = query.lte('inspection_date', filters.inspection_date_to);
    }
    if (filters.min_overall_score) {
      query = query.gte('overall_score', filters.min_overall_score);
    }
    if (filters.max_overall_score) {
      query = query.lte('overall_score', filters.max_overall_score);
    }
    if (filters.search) {
      const s = sanitizeSearch(filters.search);
      if (s) query = query.or(`notes.ilike.%${s}%,results.ilike.%${s}%`);
    }

    // Apply pagination and sorting
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 12;
    const sortBy = filters.sortBy || 'inspection_date';
    const sortDir = filters.sortDir === 'asc' ? true : false;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order(sortBy, { ascending: sortDir }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(`Failed to fetch quality inspeections: ${error.message}`);
      throw error;
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  async findOne(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('quality_inspections')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch quality inspeection: ${error.message}`);
      throw error;
    }

    return data;
  }

  async create(organizationId: string, userId: string, createDto: CreateQualityInspectionDto) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('quality_inspections')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        status: createDto.status || InspectionStatus.PENDING,
        ...createDto,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create quality inspeection: ${error.message}`);
      throw error;
    }

    return data;
  }

  async update(id: string, organizationId: string, userId: string, updateDto: Partial<CreateQualityInspectionDto>) {
    const client = this.databaseService.getAdminClient();

    // Check if quality inspeection exists
    const { data: existing } = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Quality inspeection not found');
    }

    const { data, error } = await client
      .from('quality_inspections')
      .update({
        ...updateDto,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update quality inspeection: ${error.message}`);
      throw error;
    }

    return data;
  }

  async remove(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // Check if quality inspeection exists
    const { data: existing } = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Quality inspeection not found');
    }

    // Prevent deletion of in-progress inspeections
    if (existing.status === InspectionStatus.IN_PROGRESS) {
      throw new ConflictException('Cannot delete in-progress inspeection. Complete or cancel it first.');
    }

    const { error } = await client
      .from('quality_inspeections')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete quality inspeection: ${error.message}`);
      throw error;
    }

    return { id };
  }

  async updateStatus(id: string, organizationId: string, userId: string, status: InspectionStatus) {
    const client = this.databaseService.getAdminClient();

    // Check if quality inspeection exists
    const { data: existing } = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Quality inspeection not found');
    }

    const { data, error } = await client
      .from('quality_inspeections')
      .update({
        status,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update quality inspeection status: ${error.message}`);
      throw error;
    }

    if (status === InspectionStatus.PASSED || status === InspectionStatus.FAILED) {
      try {
        const { data: orgUsers } = await client
          .from('organization_users')
          .select('user_id')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        const userIds = (orgUsers || [])
          .map((u: { user_id: string }) => u.user_id)
          .filter((uid: string) => uid !== userId);

        if (userIds.length > 0) {
          await this.notificationsService.createNotificationsForUsers(
            userIds,
            organizationId,
            NotificationType.QUALITY_INSPECTION_COMPLETED,
            `Quality inspection completed${data?.overall_score ? ` — Score: ${data.overall_score}` : ''}`,
            `A quality inspection has been completed${data?.type ? ` (${data.type})` : ''}`,
            { inspectionId: id, score: data?.overall_score, type: data?.type },
          );
        }
      } catch (notifError) {
        this.logger.warn(`Failed to send quality inspection notification: ${notifError}`);
      }
    }

    return data;
  }

  async getStatistics(organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // Get total count by type
    const { data: byType, error: typeError } = await client
      .from('quality_inspeections')
      .select('type')
      .eq('organization_id', organizationId);

    if (typeError) {
      this.logger.error(`Failed to fetch quality inspeections by type: ${typeError.message}`);
      throw typeError;
    }

    const typeCounts = byType.reduce((acc, inspeection) => {
      acc[inspeection.type] = (acc[inspeection.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get total count by status
    const { data: byStatus, error: statusError } = await client
      .from('quality_inspeections')
      .select('status')
      .eq('organization_id', organizationId);

    if (statusError) {
      this.logger.error(`Failed to fetch quality inspeections by status: ${statusError.message}`);
      throw statusError;
    }

    const statusCounts = byStatus.reduce((acc, inspeection) => {
      acc[inspeection.status] = (acc[inspeection.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get average score
    const { data: scores, error: scoreError } = await client
      .from('quality_inspeections')
      .select('overall_score')
      .eq('organization_id', organizationId);

    if (scoreError) {
      this.logger.error(`Failed to fetch quality inspeection scores: ${scoreError.message}`);
      throw scoreError;
    }

    const validScores = scores.filter(s => s.overall_score !== null);
    const averageScore = validScores.length > 0
      ? validScores.reduce((sum, s) => sum + (s.overall_score || 0), 0) / validScores.length
      : 0;

    return {
      total: byType.length,
      averageScore: Math.round(averageScore * 100) / 100,
      byType: typeCounts,
      byStatus: statusCounts,
    };
  }
}
