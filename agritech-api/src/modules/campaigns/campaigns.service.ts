import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { sanitizeSearch } from '../../common/utils/sanitize-search';
import { NotificationsService, MANAGEMENT_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { CreateCampaignDto, CampaignStatus } from './dto';
import { CampaignFiltersDto } from './dto/campaign-filters.dto';

const TABLE = 'agricultural_campaigns';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(organizationId: string, filters: CampaignFiltersDto = {}) {
    const client = this.databaseService.getAdminClient();
    let query = client
      .from(TABLE)
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (filters.campaign_type) {
      query = query.eq('campaign_type', filters.campaign_type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      const s = sanitizeSearch(filters.search);
      if (s) query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%,code.ilike.%${s}%`);
    }

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 12;
    const sortBy = filters.sortBy || 'start_date';
    const sortDir = filters.sortDir === 'asc' ? true : false;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order(sortBy, { ascending: sortDir }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(`Failed to fetch campaigns: ${error.message}`);
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
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116' || !data) {
        throw new NotFoundException('Campaign not found');
      }
      this.logger.error(`Failed to fetch campaign: ${error.message}`);
      throw error;
    }

    return data;
  }

  async create(organizationId: string, userId: string, createDto: CreateCampaignDto) {
    const client = this.databaseService.getAdminClient();

    // Check if campaign with same code exists
    const { data: existing } = await client
      .from(TABLE)
      .select('id')
      .eq('organization_id', organizationId)
      .eq('code', createDto.code)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('Campaign with this code already exists');
    }

    // If this campaign is marked as current, unset all others
    if (createDto.is_current) {
      await client
        .from(TABLE)
        .update({ is_current: false })
        .eq('organization_id', organizationId)
        .eq('is_current', true);
    }

    const { data, error } = await client
      .from(TABLE)
      .insert({
        organization_id: organizationId,
        created_by: userId,
        name: createDto.name,
        code: createDto.code,
        description: createDto.description,
        start_date: createDto.start_date,
        end_date: createDto.end_date,
        campaign_type: createDto.campaign_type || 'general',
        status: createDto.status || CampaignStatus.PLANNED,
        is_current: createDto.is_current || false,
        primary_fiscal_year_id: createDto.primary_fiscal_year_id || null,
        secondary_fiscal_year_id: createDto.secondary_fiscal_year_id || null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create campaign: ${error.message}`);
      throw error;
    }

    return data;
  }

  async update(id: string, organizationId: string, userId: string, updateDto: Partial<CreateCampaignDto>) {
    // Check if campaign exists
    const existing = await this.findOne(id, organizationId);

    const client = this.databaseService.getAdminClient();

    // If updating code, check for duplicates
    if (updateDto.code && updateDto.code !== existing.code) {
      const { data: duplicate } = await client
        .from(TABLE)
        .select('id')
        .eq('organization_id', organizationId)
        .eq('code', updateDto.code)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        throw new ConflictException('Campaign with this code already exists');
      }
    }

    // If setting as current, unset all others
    if (updateDto.is_current) {
      await client
        .from(TABLE)
        .update({ is_current: false })
        .eq('organization_id', organizationId)
        .eq('is_current', true)
        .neq('id', id);
    }

    const { data, error } = await client
      .from(TABLE)
      .update({
        ...updateDto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update campaign: ${error.message}`);
      throw error;
    }

    return data;
  }

  async remove(id: string, organizationId: string) {
    const existing = await this.findOne(id, organizationId);

    if (existing.status === CampaignStatus.ACTIVE) {
      throw new ConflictException('Cannot delete active campaign. Complete or cancel it first.');
    }

    const client = this.databaseService.getAdminClient();
    const { error } = await client
      .from(TABLE)
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete campaign: ${error.message}`);
      throw error;
    }

    return { id };
  }

  async updateStatus(id: string, organizationId: string, userId: string, status: CampaignStatus) {
    const existing = await this.findOne(id, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from(TABLE)
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update campaign status: ${error.message}`);
      throw error;
    }

    // Notify management about campaign status change
    try {
      await this.notificationsService.createNotificationsForRoles(
        organizationId,
        MANAGEMENT_ROLES,
        userId,
        NotificationType.CAMPAIGN_STATUS_CHANGED,
        `📅 ${existing.name}: ${existing.status} → ${status}`,
        `Campaign status updated to ${status}`,
        { campaignId: id, campaignName: existing.name, oldStatus: existing.status, newStatus: status },
      );
    } catch (notifError) {
      this.logger.warn(`Failed to send campaign notification: ${notifError}`);
    }

    return data;
  }

  async getStatistics(organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from(TABLE)
      .select('campaign_type, status')
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to fetch campaign statistics: ${error.message}`);
      throw error;
    }

    const typeCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    for (const row of data || []) {
      typeCounts[row.campaign_type] = (typeCounts[row.campaign_type] || 0) + 1;
      statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
    }

    return {
      total: (data || []).length,
      byType: typeCounts,
      byStatus: statusCounts,
    };
  }
}
