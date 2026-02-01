import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EventsService } from '../events/events.service';

// Milestone types for tracking user adoption
export enum MilestoneType {
  USER_SIGNUP = 'user_signup',
  PROFILE_COMPLETED = 'profile_completed',
  FIRST_FARM_CREATED = 'first_farm_created',
  FIRST_PARCEL_CREATED = 'first_parcel_created',
  FIRST_TASK_CREATED = 'first_task_created',
  FIRST_HARVEST_RECORDED = 'first_harvest_recorded',
  FIRST_REPORT_GENERATED = 'first_report_generated',
  DASHBOARD_VIEWED = 'dashboard_viewed',
  FARMS_MODULE_ACCESSED = 'farms_module_accessed',
  TASKS_MODULE_ACCESSED = 'tasks_module_accessed',
  REPORTS_MODULE_ACCESSED = 'reports_module_accessed',
  SETTINGS_CONFIGURED = 'settings_configured',
}

export interface AdoptionMilestone {
  id: string;
  user_id: string;
  organization_id: string | null;
  milestone_type: string;
  milestone_data: Record<string, any>;
  completed_at: string;
  created_at: string;
}

export interface FunnelStage {
  funnel_name: string;
  stage_order: number;
  stage_name: string;
  milestone_type: string;
  users_reached: number;
  total_users: number;
  conversion_rate_percent: number;
  previous_stage_users: number | null;
  stage_conversion_rate: number;
}

export interface TimeToMilestone {
  funnel_name: string;
  stage_order: number;
  stage_name: string;
  milestone_type: string;
  users_completed: number;
  avg_hours_to_complete: number | null;
  median_hours_to_complete: number | null;
  min_hours_to_complete: number | null;
  max_hours_to_complete: number | null;
}

export interface DropoffAnalysis {
  funnel_name: string;
  stage_order: number;
  stage_name: string;
  milestone_type: string;
  users_at_stage: number;
  previous_stage_users: number | null;
  dropoff_count: number;
  dropoff_rate: number;
}

export interface CohortData {
  cohort_month: string;
  funnel_name: string;
  stage_order: number;
  stage_name: string;
  milestone_type: string;
  cohort_size: number;
  users_reached: number;
  conversion_rate: number;
}

export interface FunnelDefinition {
  id: string;
  funnel_name: string;
  stage_order: number;
  milestone_type: string;
  stage_name: string;
  stage_description: string | null;
  is_active: boolean;
}

@Injectable()
export class AdoptionService {
  private readonly logger = new Logger(AdoptionService.name);

  constructor(
    private databaseService: DatabaseService,
    private eventsService: EventsService,
  ) {}

  /**
   * Record an adoption milestone for a user
   */
  async recordMilestone(
    userId: string,
    milestoneType: MilestoneType | string,
    organizationId?: string,
    milestoneData: Record<string, any> = {},
  ): Promise<boolean> {
    const client = this.databaseService.getAdminClient();

    try {
      // Use upsert to avoid duplicate milestone recording
      const { data, error } = await client
        .from('user_adoption_milestones')
        .upsert(
          {
            user_id: userId,
            organization_id: organizationId || null,
            milestone_type: milestoneType,
            milestone_data: milestoneData,
            completed_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,milestone_type',
            ignoreDuplicates: true,
          },
        )
        .select()
        .single();

      if (error) {
        // If it's a unique constraint violation, the milestone already exists
        if (error.code === '23505') {
          this.logger.debug(
            `Milestone ${milestoneType} already exists for user ${userId}`,
          );
          return false;
        }
        this.logger.error(`Failed to record milestone: ${error.message}`);
        return false;
      }

      // Also emit an event for the milestone
      await this.eventsService.emit({
        user_id: userId,
        organization_id: organizationId,
        event_type: `milestone.${milestoneType}`,
        event_data: {
          milestone_type: milestoneType,
          ...milestoneData,
        },
        source: 'adoption_tracking',
      });

      this.logger.log(`Recorded milestone ${milestoneType} for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error recording milestone: ${error.message}`);
      return false;
    }
  }

  /**
   * Get user's completed milestones
   */
  async getUserMilestones(userId: string): Promise<AdoptionMilestone[]> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('user_adoption_milestones')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch user milestones: ${error.message}`);
      throw new Error('Failed to fetch user milestones');
    }

    return data || [];
  }

  /**
   * Get all funnel definitions
   */
  async getFunnelDefinitions(funnelName?: string): Promise<FunnelDefinition[]> {
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('adoption_funnel_definitions')
      .select('*')
      .eq('is_active', true)
      .order('funnel_name')
      .order('stage_order');

    if (funnelName) {
      query = query.eq('funnel_name', funnelName);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch funnel definitions: ${error.message}`);
      throw new Error('Failed to fetch funnel definitions');
    }

    return data || [];
  }

  /**
   * Get funnel conversion rates
   */
  async getFunnelConversionRates(funnelName?: string): Promise<FunnelStage[]> {
    const client = this.databaseService.getAdminClient();

    let query = client.from('admin_funnel_conversion_rates').select('*');

    if (funnelName) {
      query = query.eq('funnel_name', funnelName);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(
        `Failed to fetch funnel conversion rates: ${error.message}`,
      );
      throw new Error('Failed to fetch funnel conversion rates');
    }

    return data || [];
  }

  /**
   * Get time to milestone statistics
   */
  async getTimeToMilestone(funnelName?: string): Promise<TimeToMilestone[]> {
    const client = this.databaseService.getAdminClient();

    let query = client.from('admin_time_to_milestone').select('*');

    if (funnelName) {
      query = query.eq('funnel_name', funnelName);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(
        `Failed to fetch time to milestone stats: ${error.message}`,
      );
      throw new Error('Failed to fetch time to milestone statistics');
    }

    return data || [];
  }

  /**
   * Get funnel drop-off analysis
   */
  async getDropoffAnalysis(funnelName?: string): Promise<DropoffAnalysis[]> {
    const client = this.databaseService.getAdminClient();

    let query = client.from('admin_funnel_dropoffs').select('*');

    if (funnelName) {
      query = query.eq('funnel_name', funnelName);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch dropoff analysis: ${error.message}`);
      throw new Error('Failed to fetch dropoff analysis');
    }

    return data || [];
  }

  /**
   * Get cohort analysis data
   */
  async getCohortAnalysis(
    funnelName?: string,
    months: number = 6,
  ): Promise<CohortData[]> {
    const client = this.databaseService.getAdminClient();

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    let query = client
      .from('admin_adoption_cohorts')
      .select('*')
      .gte('cohort_month', startDate.toISOString())
      .order('cohort_month', { ascending: false })
      .order('stage_order');

    if (funnelName) {
      query = query.eq('funnel_name', funnelName);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch cohort analysis: ${error.message}`);
      throw new Error('Failed to fetch cohort analysis');
    }

    return data || [];
  }

  /**
   * Get comprehensive adoption dashboard data
   */
  async getAdoptionDashboard(funnelName: string = 'user_onboarding') {
    const [
      funnelDefinitions,
      conversionRates,
      timeToMilestone,
      dropoffAnalysis,
      cohortData,
    ] = await Promise.all([
      this.getFunnelDefinitions(funnelName),
      this.getFunnelConversionRates(funnelName),
      this.getTimeToMilestone(funnelName),
      this.getDropoffAnalysis(funnelName),
      this.getCohortAnalysis(funnelName),
    ]);

    // Calculate summary metrics
    const totalUsers = conversionRates[0]?.total_users || 0;
    const fullyConverted =
      conversionRates[conversionRates.length - 1]?.users_reached || 0;
    const overallConversionRate = totalUsers > 0 ? (fullyConverted / totalUsers) * 100 : 0;

    // Find biggest drop-off point
    const biggestDropoff = dropoffAnalysis.reduce(
      (max, current) =>
        (current.dropoff_rate || 0) > (max?.dropoff_rate || 0) ? current : max,
      null as DropoffAnalysis | null,
    );

    // Calculate average time to full adoption
    const lastMilestoneTime = timeToMilestone.find(
      (t) => t.stage_order === Math.max(...timeToMilestone.map((m) => m.stage_order)),
    );

    return {
      summary: {
        total_users: totalUsers,
        fully_converted_users: fullyConverted,
        overall_conversion_rate: Math.round(overallConversionRate * 100) / 100,
        avg_hours_to_full_adoption: lastMilestoneTime?.avg_hours_to_complete || null,
        biggest_dropoff_stage: biggestDropoff?.stage_name || null,
        biggest_dropoff_rate: biggestDropoff?.dropoff_rate || null,
      },
      funnel_stages: funnelDefinitions,
      conversion_rates: conversionRates,
      time_to_milestone: timeToMilestone,
      dropoff_analysis: dropoffAnalysis,
      cohort_analysis: cohortData,
    };
  }

  /**
   * Get list of available funnels
   */
  async getAvailableFunnels(): Promise<string[]> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('adoption_funnel_definitions')
      .select('funnel_name')
      .eq('is_active', true);

    if (error) {
      this.logger.error(`Failed to fetch available funnels: ${error.message}`);
      throw new Error('Failed to fetch available funnels');
    }

    // Get unique funnel names
    const funnelNames = [...new Set((data || []).map((d) => d.funnel_name))];
    return funnelNames;
  }

  /**
   * Calculate and store daily adoption metrics
   * Moved from SQL: calculate_daily_adoption_metrics()
   * Now implemented directly in NestJS
   */
  async calculateDailyMetrics(date?: Date): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    try {
      // Calculate metrics directly in NestJS
      const { data: usersData } = await client
        .from('users')
        .select('id, created_at')
        .lte('created_at', targetDate.toISOString());

      const { data: profilesData } = await client
        .from('user_profiles')
        .select('user_id, last_active_at, onboarding_completed_at')
        .in(
          'user_id',
          usersData?.map((u: any) => u.id) || []
        );

      // Count metrics
      const newUsers = usersData?.filter((u: any) =>
        u.created_at?.startsWith(dateStr)
      ).length || 0;

      const activeUsers = profilesData?.filter((p: any) =>
        p.last_active_at?.startsWith(dateStr)
      ).length || 0;

      const totalUsers = usersData?.length || 0;
      const onboardingCompleted = profilesData?.filter((p: any) =>
        p.onboarding_completed_at !== null
      ).length || 0;

      const onboardingCompletionRate = totalUsers > 0
        ? Math.round((onboardingCompleted / totalUsers) * 100)
        : 0;

      // Store the metrics
      const { error: insertError } = await client
        .from('adoption_metrics_daily')
        .upsert(
          {
            date: dateStr,
            new_users: newUsers,
            active_users: activeUsers,
            total_users: totalUsers,
            onboarding_completion_rate: onboardingCompletionRate,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'date',
          },
        );

      if (insertError) {
        throw new Error(`Failed to store metrics: ${insertError.message}`);
      }

      this.logger.log(`Calculated daily adoption metrics for ${dateStr}: ${newUsers} new, ${activeUsers} active, ${totalUsers} total`);
    } catch (error) {
      this.logger.error(`Error calculating daily metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get daily metrics trend
   */
  async getDailyMetricsTrend(
    funnelName: string = 'user_onboarding',
    days: number = 30,
  ): Promise<any[]> {
    const client = this.databaseService.getAdminClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await client
      .from('adoption_metrics_daily')
      .select('*')
      .eq('funnel_name', funnelName)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('milestone_type');

    if (error) {
      this.logger.error(
        `Failed to fetch daily metrics trend: ${error.message}`,
      );
      throw new Error('Failed to fetch daily metrics trend');
    }

    return data || [];
  }

  /**
   * Generate adoption report
   * Moved from SQL: generate_adoption_report()
   */
  async generateAdoptionReport(
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    const client = this.databaseService.getAdminClient();
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const results = [];

    // Generate date series
    const currentDate = new Date(start);
    let cumulativeUsers = 0;

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Count new users for this date
      const { data: newUsersData } = await client
        .from('users')
        .select('id')
        .eq('created_at', dateStr);

      // Count active users for this date
      const { data: activeUsersData } = await client
        .from('user_profiles')
        .select('user_id')
        .eq('last_active_at', dateStr);

      const newUsers = newUsersData?.length || 0;
      const activeUsers = activeUsersData?.length || 0;
      cumulativeUsers += newUsers;

      results.push({
        date: dateStr,
        new_users: newUsers,
        active_users: activeUsers,
        cumulative_users: cumulativeUsers,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;
  }

  /**
   * Get productivity metrics for an organization
   * Moved from SQL: get_productivity_metrics()
   */
  async getProductivityMetrics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    const client = this.databaseService.getAdminClient();
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const metrics = [];

    // Get harvest data
    const { data: harvests } = await client
      .from('harvest_records')
      .select('quantity_kg, harvest_date')
      .eq('organization_id', organizationId)
      .gte('harvest_date', start.toISOString())
      .lte('harvest_date', end.toISOString());

    const totalHarvest = harvests?.reduce((sum: number, h: any) =>
      sum + (h.quantity_kg || 0), 0
    ) || 0;

    metrics.push({
      metric_name: 'Total Harvest',
      metric_value: totalHarvest,
      metric_unit: 'kg',
    });

    // Get task completion data
    const { data: tasks } = await client
      .from('tasks')
      .select('id, status, completed_at')
      .eq('organization_id', organizationId)
      .gte('updated_at', start.toISOString())
      .lte('updated_at', end.toISOString());

    const completedTasks = tasks?.filter((t: any) => t.status === 'completed').length || 0;
    const totalTasks = tasks?.length || 0;

    metrics.push({
      metric_name: 'Task Completion Rate',
      metric_value: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      metric_unit: '%',
    });

    // Get worker productivity
    const { data: workRecords } = await client
      .from('work_records')
      .select('hours_worked, total_payment')
      .eq('organization_id', organizationId)
      .gte('work_date', start.toISOString().split('T')[0])
      .lte('work_date', end.toISOString().split('T')[0]);

    const totalHours = workRecords?.reduce((sum: number, wr: any) =>
      sum + (wr.hours_worked || 0), 0
    ) || 0;

    metrics.push({
      metric_name: 'Total Hours Worked',
      metric_value: totalHours,
      metric_unit: 'hours',
    });

    return metrics;
  }
}
