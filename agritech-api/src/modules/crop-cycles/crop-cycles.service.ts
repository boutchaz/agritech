import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { sanitizeSearch } from '../../common/utils/sanitize-search';
import { NotificationsService, MANAGEMENT_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { CreateCropCycleDto, CropCycleStatus } from './dto';
import { CropCycleFiltersDto } from './dto/crop-cycle-filters.dto';
import { CropCyclePnLFiltersDto } from './dto/crop-cycle-pnl-filters.dto';

@Injectable()
export class CropCyclesService {
  private readonly logger = new Logger(CropCyclesService.name);

  /** Allowed ORDER BY columns for crop_cycle_pnl (avoid dynamic SQL injection). */
  private static readonly PNL_SORT_COLUMNS = new Set([
    'net_profit',
    'total_revenue',
    'total_costs',
    'cycle_code',
    'cycle_name',
    'crop_type',
    'planting_date',
    'actual_harvest_end',
    'status',
  ]);

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
      { const sv = sanitizeSearch(filters.variety_name); if (sv) query = query.ilike('variety_name', `%${sv}%`); }
    }
    if (filters.crop_type) {
      { const sc = sanitizeSearch(filters.crop_type); if (sc) query = query.ilike('crop_type', `%${sc}%`); }
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

    if (data.biological_asset_id && updateDto.actual_total_yield !== undefined) {
      await this.syncYieldToBiologicalAsset(data.biological_asset_id);
    }

    return data;
  }

  /**
   * When a crop cycle's yield changes, sum all YTD yields for the linked
   * biological asset and write the total back. Non-blocking: failures are
   * logged but never propagate to the caller.
   */
  private async syncYieldToBiologicalAsset(biologicalAssetId: string): Promise<void> {
    try {
      const client = this.databaseService.getAdminClient();
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      const { data: cycles, error: cyclesError } = await client
        .from('crop_cycles')
        .select('actual_total_yield')
        .eq('biological_asset_id', biologicalAssetId)
        .gte('actual_harvest_start', yearStart)
        .lte('actual_harvest_start', yearEnd)
        .not('actual_total_yield', 'is', null);

      if (cyclesError) {
        this.logger.warn(`Failed to fetch crop cycles for biological asset sync: ${cyclesError.message}`);
        return;
      }

      const totalYtdYield = (cycles || []).reduce((sum, c) => sum + (Number(c.actual_total_yield) || 0), 0);

      await client
        .from('biological_assets')
        .update({ actual_ytd_yield: totalYtdYield, updated_at: new Date().toISOString() })
        .eq('id', biologicalAssetId);
    } catch (syncError) {
      this.logger.warn(`Failed to sync yield to biological asset: ${syncError}`);
    }
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

    // Sum costs from journal entries linked to this cycle's costs/revenues
    // Path: journal_entries.reference_id → costs.id WHERE costs.crop_cycle_id = cycleId
    const { data: costRefs } = await client
      .from('costs')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('crop_cycle_id', cycleId);

    const costRefIds = (costRefs ?? []).map((c) => c.id);

    let totalCosts = 0;
    if (costRefIds.length > 0) {
      const { data: costJournals } = await client
        .from('journal_entries')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('status', 'posted')
        .eq('reference_type', 'cost')
        .in('reference_id', costRefIds);

      const costJournalIds = (costJournals ?? []).map((j) => j.id);
      if (costJournalIds.length > 0) {
        const { data: expenseItems } = await client
          .from('journal_items')
          .select('debit, credit, accounts!inner(account_type)')
          .in('journal_entry_id', costJournalIds)
          .eq('accounts.account_type', 'expense');

        totalCosts = (expenseItems ?? []).reduce(
          (sum, item: any) => sum + (Number(item.debit || 0) - Number(item.credit || 0)),
          0,
        );
      }
    }

    // Sum revenues from journal entries linked to this cycle's revenues
    const { data: revenueRefs } = await client
      .from('revenues')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('crop_cycle_id', cycleId);

    const revenueRefIds = (revenueRefs ?? []).map((r) => r.id);

    let totalRevenue = 0;
    if (revenueRefIds.length > 0) {
      const { data: revenueJournals } = await client
        .from('journal_entries')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('status', 'posted')
        .eq('reference_type', 'revenue')
        .in('reference_id', revenueRefIds);

      const revenueJournalIds = (revenueJournals ?? []).map((j) => j.id);
      if (revenueJournalIds.length > 0) {
        const { data: revenueItems } = await client
          .from('journal_items')
          .select('debit, credit, accounts!inner(account_type)')
          .in('journal_entry_id', revenueJournalIds)
          .eq('accounts.account_type', 'revenue');

        totalRevenue = (revenueItems ?? []).reduce(
          (sum, item: any) => sum + (Number(item.credit || 0) - Number(item.debit || 0)),
          0,
        );
      }
    }

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

  /**
   * P&L rows from reporting view `crop_cycle_pnl` (joins campaigns, farms, parcels, fiscal years).
   */
  async getPnL(organizationId: string, filters: CropCyclePnLFiltersDto = {}) {
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('crop_cycle_pnl')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters.campaign_id) {
      query = query.eq('campaign_id', filters.campaign_id);
    }
    if (filters.fiscal_year_id) {
      query = query.eq('fiscal_year_id', filters.fiscal_year_id);
    }
    if (filters.farm_id) {
      query = query.eq('farm_id', filters.farm_id);
    }

    const sortBy =
      filters.sortBy && CropCyclesService.PNL_SORT_COLUMNS.has(filters.sortBy)
        ? filters.sortBy
        : 'net_profit';
    const ascending = filters.sortDir === 'asc';

    query = query.order(sortBy, { ascending });

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch crop cycle PnL: ${error.message}`);
      throw error;
    }

    return data || [];
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
