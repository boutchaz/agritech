import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  YieldHistoryFiltersDto,
  CreateYieldHistoryDto,
  ForecastFiltersDto,
  CreateForecastDto,
  UpdateForecastDto,
  BenchmarkFiltersDto,
  CreateBenchmarkDto,
  AlertFiltersDto,
  ParcelPerformanceFiltersDto,
} from './dto';

@Injectable()
export class ProductionIntelligenceService {
  constructor(private readonly databaseService: DatabaseService) {}

  private async verifyOrganizationAccess(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Organization not found or access denied');
    }
  }

  async getYieldHistory(
    userId: string,
    organizationId: string,
    filters?: YieldHistoryFiltersDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    let query = client
      .from('yield_history')
      .select('*')
      .eq('organization_id', organizationId)
      .order('harvest_date', { ascending: false });

    if (filters?.farm_id) query = query.eq('farm_id', filters.farm_id);
    if (filters?.parcel_id) query = query.eq('parcel_id', filters.parcel_id);
    if (filters?.crop_type) query = query.eq('crop_type', filters.crop_type);
    if (filters?.from_date) query = query.gte('harvest_date', filters.from_date);
    if (filters?.to_date) query = query.lte('harvest_date', filters.to_date);

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(`Failed to fetch yield history: ${error.message}`);
    }

    return data || [];
  }

  async createYieldHistory(
    userId: string,
    organizationId: string,
    createDto: CreateYieldHistoryDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const profitAmount = 
      (createDto.revenue_amount ?? 0) - (createDto.cost_amount ?? 0);
    
    const profitMarginPercent = createDto.revenue_amount
      ? (profitAmount / createDto.revenue_amount) * 100
      : null;
    
    const yieldVariancePercent = createDto.target_yield_quantity
      ? ((createDto.actual_yield_quantity - createDto.target_yield_quantity) / 
          createDto.target_yield_quantity) * 100
      : null;

    const performanceRating = this.calculatePerformanceRating(yieldVariancePercent);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('yield_history')
      .insert({
        ...createDto,
        organization_id: organizationId,
        profit_amount: profitAmount,
        profit_margin_percent: profitMarginPercent,
        yield_variance_percent: yieldVariancePercent,
        performance_rating: performanceRating,
        currency_code: createDto.currency_code || 'MAD',
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create yield history: ${error.message}`);
    }

    return data;
  }

  private calculatePerformanceRating(yieldVariancePercent: number | null): string {
    if (yieldVariancePercent === null) return 'average';
    if (yieldVariancePercent >= 10) return 'excellent';
    if (yieldVariancePercent >= 0) return 'good';
    if (yieldVariancePercent >= -10) return 'below_average';
    return 'poor';
  }

  async getForecasts(
    userId: string,
    organizationId: string,
    filters?: ForecastFiltersDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    let query = client
      .from('harvest_forecasts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('forecast_harvest_date_start', { ascending: true });

    if (filters?.farm_id) query = query.eq('farm_id', filters.farm_id);
    if (filters?.parcel_id) query = query.eq('parcel_id', filters.parcel_id);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.from_date) query = query.gte('forecast_harvest_date_start', filters.from_date);
    if (filters?.to_date) query = query.lte('forecast_harvest_date_end', filters.to_date);

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(`Failed to fetch forecasts: ${error.message}`);
    }

    return data || [];
  }

  async createForecast(
    userId: string,
    organizationId: string,
    createDto: CreateForecastDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const estimatedProfit = 
      (createDto.estimated_revenue ?? 0) - (createDto.estimated_cost ?? 0);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('harvest_forecasts')
      .insert({
        ...createDto,
        organization_id: organizationId,
        estimated_profit: estimatedProfit,
        currency_code: createDto.currency_code || 'MAD',
        status: 'draft',
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create forecast: ${error.message}`);
    }

    return data;
  }

  async updateForecast(
    userId: string,
    organizationId: string,
    forecastId: string,
    updateDto: UpdateForecastDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: forecast } = await client
      .from('harvest_forecasts')
      .select('id, predicted_yield_quantity')
      .eq('id', forecastId)
      .eq('organization_id', organizationId)
      .single();

    if (!forecast) {
      throw new NotFoundException('Forecast not found');
    }

    let forecastAccuracyPercent: number | null = null;
    if (updateDto.actual_yield_quantity !== undefined && updateDto.status === 'completed') {
      const predictedYield = updateDto.predicted_yield_quantity ?? forecast.predicted_yield_quantity;
      forecastAccuracyPercent = predictedYield
        ? 100 - Math.abs(((updateDto.actual_yield_quantity - predictedYield) / predictedYield) * 100)
        : null;
    }

    const { data, error } = await client
      .from('harvest_forecasts')
      .update({
        ...updateDto,
        forecast_accuracy_percent: forecastAccuracyPercent,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', forecastId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update forecast: ${error.message}`);
    }

    return data;
  }

  async getBenchmarks(
    userId: string,
    organizationId: string,
    filters?: BenchmarkFiltersDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    let query = client
      .from('yield_benchmarks')
      .select('*')
      .eq('organization_id', organizationId)
      .order('crop_type', { ascending: true });

    if (filters?.farm_id) query = query.eq('farm_id', filters.farm_id);
    if (filters?.parcel_id) query = query.eq('parcel_id', filters.parcel_id);
    if (filters?.crop_type) query = query.eq('crop_type', filters.crop_type);
    if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(`Failed to fetch benchmarks: ${error.message}`);
    }

    return data || [];
  }

  async createBenchmark(
    userId: string,
    organizationId: string,
    createDto: CreateBenchmarkDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('yield_benchmarks')
      .insert({
        ...createDto,
        organization_id: organizationId,
        is_active: createDto.is_active ?? true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create benchmark: ${error.message}`);
    }

    return data;
  }

  async getAlerts(
    userId: string,
    organizationId: string,
    filters?: AlertFiltersDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    let query = client
      .from('performance_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (filters?.farm_id) query = query.eq('farm_id', filters.farm_id);
    if (filters?.parcel_id) query = query.eq('parcel_id', filters.parcel_id);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.alert_type) query = query.eq('alert_type', filters.alert_type);

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(`Failed to fetch alerts: ${error.message}`);
    }

    return data || [];
  }

  async acknowledgeAlert(
    userId: string,
    organizationId: string,
    alertId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: alert } = await client
      .from('performance_alerts')
      .select('id, status')
      .eq('id', alertId)
      .eq('organization_id', organizationId)
      .single();

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.status === 'resolved') {
      throw new BadRequestException('Cannot acknowledge resolved alert');
    }

    const { data, error } = await client
      .from('performance_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to acknowledge alert: ${error.message}`);
    }

    return data;
  }

  async resolveAlert(
    userId: string,
    organizationId: string,
    alertId: string,
    resolutionNotes: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: alert } = await client
      .from('performance_alerts')
      .select('id')
      .eq('id', alertId)
      .eq('organization_id', organizationId)
      .single();

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const { data, error } = await client
      .from('performance_alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to resolve alert: ${error.message}`);
    }

    return data;
  }

  /**
   * Gets parcel performance summary using direct queries
   * Aggregates harvest records and costs by parcel
   */
  async getParcelPerformance(
    userId: string,
    organizationId: string,
    filters?: ParcelPerformanceFiltersDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    return this.calculateParcelPerformanceManually(client, organizationId, filters);
  }

  private async calculateParcelPerformanceManually(
    client: ReturnType<typeof this.databaseService.getAdminClient>,
    organizationId: string,
    filters?: ParcelPerformanceFiltersDto,
  ) {
    let query = client
      .from('yield_history')
      .select(`
        parcel_id,
        farm_id,
        crop_type,
        actual_yield_per_hectare,
        target_yield_per_hectare,
        yield_variance_percent,
        performance_rating,
        revenue_amount,
        cost_amount,
        profit_amount,
        profit_margin_percent,
        harvest_date
      `)
      .eq('organization_id', organizationId);

    if (filters?.farm_id) query = query.eq('farm_id', filters.farm_id);
    if (filters?.parcel_id) query = query.eq('parcel_id', filters.parcel_id);
    if (filters?.from_date) query = query.gte('harvest_date', filters.from_date);
    if (filters?.to_date) query = query.lte('harvest_date', filters.to_date);

    const { data: yieldData, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch performance data: ${error.message}`);
    }

    if (!yieldData || yieldData.length === 0) {
      return [];
    }

    const parcelAggregates = this.aggregateByParcel(yieldData);
    const parcelNames = await this.fetchParcelNames(client, Array.from(parcelAggregates.keys()));

    return this.buildPerformanceSummary(parcelAggregates, parcelNames);
  }

  private aggregateByParcel(yieldData: Array<{
    parcel_id: string;
    farm_id: string;
    crop_type: string;
    actual_yield_per_hectare: number | null;
    target_yield_per_hectare: number | null;
    yield_variance_percent: number | null;
    performance_rating: string | null;
    revenue_amount: number | null;
    cost_amount: number | null;
    profit_amount: number | null;
    profit_margin_percent: number | null;
    harvest_date: string;
  }>) {
    const parcelMap = new Map<string, {
      parcel_id: string;
      farm_id: string;
      crop_types: Set<string>;
      harvests: number;
      total_yield: number;
      total_target: number;
      total_variance: number;
      total_revenue: number;
      total_cost: number;
      total_profit: number;
      total_margin: number;
      last_harvest_date: string;
      ratings: string[];
    }>();

    for (const record of yieldData) {
      const key = record.parcel_id;
      if (!parcelMap.has(key)) {
        parcelMap.set(key, {
          parcel_id: record.parcel_id,
          farm_id: record.farm_id,
          crop_types: new Set(),
          harvests: 0,
          total_yield: 0,
          total_target: 0,
          total_variance: 0,
          total_revenue: 0,
          total_cost: 0,
          total_profit: 0,
          total_margin: 0,
          last_harvest_date: record.harvest_date,
          ratings: [],
        });
      }

      const summary = parcelMap.get(key)!;
      summary.crop_types.add(record.crop_type);
      summary.harvests += 1;
      summary.total_yield += record.actual_yield_per_hectare || 0;
      summary.total_target += record.target_yield_per_hectare || 0;
      summary.total_variance += record.yield_variance_percent || 0;
      summary.total_revenue += record.revenue_amount || 0;
      summary.total_cost += record.cost_amount || 0;
      summary.total_profit += record.profit_amount || 0;
      summary.total_margin += record.profit_margin_percent || 0;
      if (record.harvest_date > summary.last_harvest_date) {
        summary.last_harvest_date = record.harvest_date;
      }
      if (record.performance_rating) {
        summary.ratings.push(record.performance_rating);
      }
    }

    return parcelMap;
  }

  private async fetchParcelNames(
    client: ReturnType<typeof this.databaseService.getAdminClient>,
    parcelIds: string[],
  ): Promise<Map<string, { name: string; farm_name: string }>> {
    const { data: parcels } = await client
      .from('parcels')
      .select('id, name, farm:farms!farm_id(name)')
      .in('id', parcelIds);

    const parcelList = parcels as unknown as Array<{ id: string; name: string; farm: { name: string } | null }> | null;

    return new Map(
      (parcelList || []).map((p) => [
        p.id, 
        { name: p.name, farm_name: p.farm?.name || 'Unknown' }
      ])
    );
  }

  private buildPerformanceSummary(
    parcelAggregates: Map<string, {
      parcel_id: string;
      crop_types: Set<string>;
      harvests: number;
      total_yield: number;
      total_target: number;
      total_variance: number;
      total_revenue: number;
      total_cost: number;
      total_profit: number;
      total_margin: number;
      last_harvest_date: string;
      ratings: string[];
    }>,
    parcelNames: Map<string, { name: string; farm_name: string }>,
  ) {
    return Array.from(parcelAggregates.values()).map(summary => {
      const parcelInfo = parcelNames.get(summary.parcel_id) || { name: 'Unknown', farm_name: 'Unknown' };
      const avgRating = summary.ratings.length > 0
        ? this.calculateAverageRating(summary.ratings)
        : 'average';

      return {
        parcel_id: summary.parcel_id,
        parcel_name: parcelInfo.name,
        farm_name: parcelInfo.farm_name,
        crop_type: Array.from(summary.crop_types).join(', '),
        total_harvests: summary.harvests,
        avg_yield_per_hectare: summary.harvests > 0 ? summary.total_yield / summary.harvests : 0,
        avg_target_yield: summary.harvests > 0 ? summary.total_target / summary.harvests : 0,
        avg_variance_percent: summary.harvests > 0 ? summary.total_variance / summary.harvests : 0,
        performance_rating: avgRating,
        total_revenue: summary.total_revenue,
        total_cost: summary.total_cost,
        total_profit: summary.total_profit,
        avg_profit_margin: summary.harvests > 0 ? summary.total_margin / summary.harvests : 0,
        last_harvest_date: summary.last_harvest_date,
      };
    });
  }

  private calculateAverageRating(ratings: string[]): string {
    const ratingValues: Record<string, number> = {
      excellent: 4,
      good: 3,
      average: 2,
      below_average: 1,
      poor: 0,
    };

    const avg = ratings.reduce((sum, r) => sum + (ratingValues[r] ?? 2), 0) / ratings.length;

    if (avg >= 3.5) return 'excellent';
    if (avg >= 2.5) return 'good';
    if (avg >= 1.5) return 'average';
    if (avg >= 0.5) return 'below_average';
    return 'poor';
  }
}
