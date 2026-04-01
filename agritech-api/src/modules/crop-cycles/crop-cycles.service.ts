import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { sanitizeSearch } from '../../common/utils/sanitize-search';
import { NotificationsService, MANAGEMENT_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { CreateCropCycleDto, CropCycleStatus } from './dto';
import { CropCycleFiltersDto } from './dto/crop-cycle-filters.dto';

@Injectable()
export class CropCyclesService {
  private readonly logger = new Logger(CropCyclesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(organizationId: string, filters: CropCycleFiltersDto = {}) {
    const client = this.databaseService.getAdminClient();
    let query = client
      .from('crop_cycles')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.campaign_id) {
      query = query.eq('campaign_id', filters.campaign_id);
    }
    if (filters.farm_id) {
      query = query.eq('farm_id', filters.farm_id);
    }
    if (filters.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }
    if (filters.variety_name) {
      query = query.ilike('variety_name', `%${filters.variety_name}%`);
    }
    if (filters.crop_type) {
      query = query.ilike('crop_type', `%${filters.crop_type}%`);
    }
    if (filters.planting_date_from) {
      query = query.gte('planting_date', filters.planting_date_from);
    }
    if (filters.planting_date_to) {
      query = query.lte('planting_date', filters.planting_date_to);
    }
    if (filters.expected_harvest_start_from) {
      query = query.gte('expected_harvest_start', filters.expected_harvest_start_from);
    }
    if (filters.expected_harvest_start_to) {
      query = query.lte('expected_harvest_start', filters.expected_harvest_start_to);
    }
    if (filters.cycle_type) {
      query = query.eq('cycle_type', filters.cycle_type);
    }
    if (filters.season) {
      query = query.eq('season', filters.season);
    }
    if (filters.is_perennial !== undefined) {
      query = query.eq('is_perennial', filters.is_perennial);
    }
    if (filters.search) {
      const s = sanitizeSearch(filters.search);
      if (s) query = query.or(`cycle_name.ilike.%${s}%,variety_name.ilike.%${s}%`);
    }

    // Apply pagination and sorting
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 12;
    const sortBy = filters.sortBy || 'planting_date';
    const sortDir = filters.sortDir === 'asc' ? true : false;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order(sortBy, { ascending: sortDir }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(`Failed to fetch crop cycles: ${error.message}`);
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
      .from('crop_cycles')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch crop cycle: ${error.message}`);
      throw error;
    }

    return data;
  }

  async create(organizationId: string, userId: string, createDto: CreateCropCycleDto) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('crop_cycles')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        status: createDto.status || CropCycleStatus.PLANNED,
        ...createDto,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create crop cycle: ${error.message}`);
      throw error;
    }

    return data;
  }

  async update(id: string, organizationId: string, userId: string, updateDto: Partial<CreateCropCycleDto>) {
    const client = this.databaseService.getAdminClient();

    const existing = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Crop cycle not found');
    }

    const { data, error } = await client
      .from('crop_cycles')
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
      this.logger.error(`Failed to update crop cycle: ${error.message}`);
      throw error;
    }

    return data;
  }

  async remove(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const existing = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Crop cycle not found');
    }

    if (['land_prep', 'growing', 'harvesting'].includes(existing.status)) {
      throw new ConflictException('Cannot delete an in-progress crop cycle. Complete or cancel it first.');
    }

    const { error } = await client
      .from('crop_cycles')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete crop cycle: ${error.message}`);
      throw error;
    }

    return { id };
  }

  private static readonly VALID_CYCLE_TRANSITIONS: Record<string, string[]> = {
    [CropCycleStatus.PLANNED]: [CropCycleStatus.LAND_PREP, CropCycleStatus.CANCELLED],
    [CropCycleStatus.LAND_PREP]: [CropCycleStatus.GROWING, CropCycleStatus.CANCELLED],
    [CropCycleStatus.GROWING]: [CropCycleStatus.HARVESTING, CropCycleStatus.CANCELLED],
    [CropCycleStatus.HARVESTING]: [CropCycleStatus.COMPLETED],
    [CropCycleStatus.COMPLETED]: [],
    [CropCycleStatus.CANCELLED]: [],
  };

  private validateCycleStatusTransition(currentStatus: string, newStatus: string): void {
    const allowed = CropCyclesService.VALID_CYCLE_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new ConflictException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }
  }

  async updateStatus(id: string, organizationId: string, userId: string, status: CropCycleStatus) {
    const client = this.databaseService.getAdminClient();

    const existing = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Crop cycle not found');
    }

    this.validateCycleStatusTransition(existing.status, status);

    const { data, error } = await client
      .from('crop_cycles')
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
      this.logger.error(`Failed to update crop cycle status: ${error.message}`);
      throw error;
    }

    // Notify management about crop cycle status change
    try {
      const cycleName = existing.name || existing.crop_name || 'Crop cycle';
      await this.notificationsService.createNotificationsForRoles(
        organizationId,
        MANAGEMENT_ROLES,
        userId,
        NotificationType.CROP_CYCLE_STATUS_CHANGED,
        `🌱 ${cycleName}: ${existing.status} → ${status}`,
        `Crop cycle status updated to ${status}`,
        { cropCycleId: id, cropName: cycleName, oldStatus: existing.status, newStatus: status },
      );
    } catch (notifError) {
      this.logger.warn(`Failed to send crop cycle notification: ${notifError}`);
    }

    return data;
  }

  /**
   * Recalculate profitability rollup for a crop cycle.
   * Sums costs and revenues from related tables and updates total_costs,
   * total_revenue, net_profit, and profit_margin.
   */
  async recalculateProfitability(cycleId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const existing = await this.findOne(cycleId, organizationId);
    if (!existing) {
      throw new NotFoundException('Crop cycle not found');
    }

    // Sum costs from financial_transactions linked to this cycle
    const { data: costRows } = await client
      .from('financial_transactions')
      .select('amount')
      .eq('organization_id', organizationId)
      .eq('crop_cycle_id', cycleId)
      .eq('transaction_type', 'expense');

    const totalCosts = (costRows ?? []).reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0,
    );

    // Sum revenues from financial_transactions linked to this cycle
    const { data: revenueRows } = await client
      .from('financial_transactions')
      .select('amount')
      .eq('organization_id', organizationId)
      .eq('crop_cycle_id', cycleId)
      .eq('transaction_type', 'income');

    const totalRevenue = (revenueRows ?? []).reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0,
    );

    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0
      ? Math.round((netProfit / totalRevenue) * 10000) / 100
      : 0;

    const { data, error } = await client
      .from('crop_cycles')
      .update({
        total_costs: Math.round(totalCosts * 100) / 100,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        net_profit: Math.round(netProfit * 100) / 100,
        profit_margin: profitMargin,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cycleId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to recalculate profitability: ${error.message}`);
      throw error;
    }

    return data;
  }

  async getStatistics(organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // Get total count by status
    const { data: byStatus, error: statusError } = await client
      .from('crop_cycles')
      .select('status')
      .eq('organization_id', organizationId);

    if (statusError) {
      this.logger.error(`Failed to fetch crop cycles by status: ${statusError.message}`);
      throw statusError;
    }

    const statusCounts = byStatus.reduce((acc, cycle) => {
      acc[cycle.status] = (acc[cycle.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const { data: areas, error: areaError } = await client
      .from('crop_cycles')
      .select('planted_area_ha')
      .eq('organization_id', organizationId);

    if (areaError) {
      this.logger.error(`Failed to fetch crop cycle areas: ${areaError.message}`);
      throw areaError;
    }

    const totalArea = areas.reduce((sum, cycle) => sum + (cycle.planted_area_ha || 0), 0);

    const { data: yields, error: yieldError } = await client
      .from('crop_cycles')
      .select('expected_total_yield, actual_total_yield')
      .eq('organization_id', organizationId);

    if (yieldError) {
      this.logger.error(`Failed to fetch crop cycle yields: ${yieldError.message}`);
      throw yieldError;
    }

    const expectedTotalYield = yields.reduce((sum, cycle) => sum + (cycle.expected_total_yield || 0), 0);
    const actualTotalYield = yields.reduce((sum, cycle) => sum + (cycle.actual_total_yield || 0), 0);

    return {
      total: byStatus.length,
      totalArea,
      totalExpectedYield: expectedTotalYield,
      totalActualYield: actualTotalYield,
      byStatus: statusCounts,
    };
  }
}
