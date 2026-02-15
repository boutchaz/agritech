import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCampaignDto, CampaignStatus } from './dto';
import { CampaignFiltersDto } from './dto/campaign-filters.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(organizationId: string, filters: CampaignFiltersDto = {}) {
    const client = this.databaseService.getAdminClient();
    let query = client
      .from('campaigns')
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
      query = query.contains('farm_ids', [filters.farm_id]);
    }
    if (filters.parcel_id) {
      query = query.contains('parcel_ids', [filters.parcel_id]);
    }
    if (filters.start_date_from) {
      query = query.gte('start_date', filters.start_date_from);
    }
    if (filters.start_date_to) {
      query = query.lte('start_date', filters.start_date_to);
    }
    if (filters.end_date_from) {
      query = query.gte('end_date', filters.end_date_from);
    }
    if (filters.end_date_to) {
      query = query.lte('end_date', filters.end_date_to);
    }
    if (filters.min_priority) {
      query = query.gte('priority', filters.min_priority);
    }
    if (filters.max_priority) {
      query = query.lte('priority', filters.max_priority);
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Apply pagination and sorting
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
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch campaign: ${error.message}`);
      throw error;
    }

    return data;
  }

  async create(organizationId: string, userId: string, createDto: CreateCampaignDto) {
    const client = this.databaseService.getAdminClient();

    // Check if campaign with same name exists
    const { data: existing } = await client
      .from('campaigns')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', createDto.name)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('Campaign with this name already exists');
    }

    const { data, error } = await client
      .from('campaigns')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        status: createDto.status || CampaignStatus.PLANNED,
        ...createDto,
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
    const client = this.databaseService.getAdminClient();

    // Check if campaign exists
    const { data: existing } = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Campaign not found');
    }

    // If updating name, check for duplicates
    if (updateDto.name && updateDto.name !== existing.name) {
      const { data: duplicate } = await client
        .from('campaigns')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', updateDto.name)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        throw new ConflictException('Campaign with this name already exists');
      }
    }

    const { data, error } = await client
      .from('campaigns')
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
      this.logger.error(`Failed to update campaign: ${error.message}`);
      throw error;
    }

    return data;
  }

  async remove(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // Check if campaign exists
    const { data: existing } = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Campaign not found');
    }

    // Prevent deletion of active campaigns
    if (existing.status === CampaignStatus.ACTIVE) {
      throw new ConflictException('Cannot delete active campaign. Pause or complete it first.');
    }

    const { error } = await client
      .from('campaigns')
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
    const client = this.databaseService.getAdminClient();

    // Check if campaign exists
    const { data: existing } = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Campaign not found');
    }

    const { data, error } = await client
      .from('campaigns')
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
      this.logger.error(`Failed to update campaign status: ${error.message}`);
      throw error;
    }

    return data;
  }

  async getStatistics(organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // Get total count by type
    const { data: byType, error: typeError } = await client
      .from('campaigns')
      .select('type')
      .eq('organization_id', organizationId);

    if (typeError) {
      this.logger.error(`Failed to fetch campaigns by type: ${typeError.message}`);
      throw typeError;
    }

    const typeCounts = byType.reduce((acc, campaign) => {
      acc[campaign.type] = (acc[campaign.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get total count by status
    const { data: byStatus, error: statusError } = await client
      .from('campaigns')
      .select('status')
      .eq('organization_id', organizationId);

    if (statusError) {
      this.logger.error(`Failed to fetch campaigns by status: ${statusError.message}`);
      throw statusError;
    }

    const statusCounts = byStatus.reduce((acc, campaign) => {
      acc[campaign.status] = (acc[campaign.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get total budget
    const { data: budgets, error: budgetError } = await client
      .from('campaigns')
      .select('budget')
      .eq('organization_id', organizationId);

    if (budgetError) {
      this.logger.error(`Failed to fetch campaign budgets: ${budgetError.message}`);
      throw budgetError;
    }

    const totalBudget = budgets.reduce((sum, campaign) => sum + (campaign.budget || 0), 0);

    return {
      total: byType.length,
      totalBudget,
      byType: typeCounts,
      byStatus: statusCounts,
    };
  }
}
