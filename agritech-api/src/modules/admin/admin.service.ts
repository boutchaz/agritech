import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  ReferenceDataTable,
  ImportReferenceDataDto,
  ImportResultDto,
  PublishReferenceDataDto,
  PublishResultDto,
  SeedAccountsDto,
  SeedAccountsResultDto,
  ChartOfAccountsType,
  SaasMetricsDto,
  OrgUsageDto,
  OrgUsageQueryDto,
  ReferenceDataQueryDto,
  ReferenceDataDiffDto,
  ReferenceDataDiffResultDto,
} from './dto';

@Injectable()
export class AdminService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Get reference data with optional filters
   */
  async getReferenceData(
    table: ReferenceDataTable,
    query: ReferenceDataQueryDto,
    userId: string,
  ): Promise<{ data: any[]; total: number }> {
    const client = this.databaseService.getAdminClient();
    const limit = parseInt(query.limit || '50', 10);
    const offset = parseInt(query.offset || '0', 10);

    let queryBuilder = client.from(table).select('*', { count: 'exact' });

    // Apply filters
    if (query.source) {
      queryBuilder = queryBuilder.eq('source', query.source);
    }
    if (query.version) {
      queryBuilder = queryBuilder.eq('template_version', query.version);
    }
    if (query.publishedOnly) {
      queryBuilder = queryBuilder.not('published_at', 'is', null);
    }
    if (query.search) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query.search}%,code.ilike.%${query.search}%`);
    }

    // Apply sorting
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder === 'asc';
    queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder });

    // Apply pagination
    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new BadRequestException(`Failed to fetch ${table}: ${error.message}`);
    }

    return { data: data || [], total: count || 0 };
  }

  /**
   * Import reference data with optional dry-run
   */
  async importReferenceData(
    dto: ImportReferenceDataDto,
    userId: string,
  ): Promise<ImportResultDto> {
    const client = this.databaseService.getAdminClient();
    const result: ImportResultDto = {
      success: false,
      dryRun: dto.dryRun ?? false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
    };

    // Create job log
    const { data: job } = await client
      .from('admin_job_logs')
      .insert({
        job_type: 'import',
        status: 'running',
        input_data: { table: dto.table, rowCount: dto.rows.length, dryRun: dto.dryRun },
        created_by: userId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    try {
      for (let i = 0; i < dto.rows.length; i++) {
        const row = dto.rows[i];
        result.recordsProcessed++;

        try {
          const rowData: Record<string, any> = {
            ...row.data,
            template_version: dto.version || '1.0.0',
            source: 'import',
            updated_by: userId,
          };

          if (!dto.dryRun) {
            // Check if record exists (by id or by unique key)
            if (row.data.id) {
              const { data: existing } = await client
                .from(dto.table)
                .select('id')
                .eq('id', row.data.id)
                .single();

              if (existing && dto.updateExisting) {
                await client.from(dto.table).update(rowData).eq('id', row.data.id);
                result.recordsUpdated++;
              } else if (existing) {
                result.recordsSkipped++;
              } else {
                rowData.created_by = userId;
                await client.from(dto.table).insert(rowData);
                result.recordsCreated++;
              }
            } else {
              rowData.created_by = userId;
              const { error } = await client.from(dto.table).insert(rowData);
              if (error) throw error;
              result.recordsCreated++;
            }
          } else {
            // Dry run - just validate
            result.recordsCreated++;
          }
        } catch (rowError: any) {
          result.errors.push({ row: i, error: rowError.message || 'Unknown error' });
        }
      }

      result.success = result.errors.length === 0;
      result.jobId = job?.id;

      // Update job log
      if (job) {
        await client.from('admin_job_logs').update({
          status: result.success ? 'completed' : 'completed_with_errors',
          result_data: result,
          records_processed: result.recordsProcessed,
          records_created: result.recordsCreated,
          records_updated: result.recordsUpdated,
          records_skipped: result.recordsSkipped,
          errors: result.errors,
          completed_at: new Date().toISOString(),
        }).eq('id', job.id);
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push({ row: -1, error: error.message || 'Import failed' });

      if (job) {
        await client.from('admin_job_logs').update({
          status: 'failed',
          errors: result.errors,
          completed_at: new Date().toISOString(),
        }).eq('id', job.id);
      }
    }

    return result;
  }

  /**
   * Publish or unpublish reference data
   */
  async publishReferenceData(
    dto: PublishReferenceDataDto,
    userId: string,
  ): Promise<PublishResultDto> {
    const client = this.databaseService.getAdminClient();
    const result: PublishResultDto = {
      success: false,
      publishedCount: 0,
      unpublishedCount: 0,
      errors: [],
    };

    for (const id of dto.ids) {
      try {
        const updateData = dto.unpublish
          ? { published_at: null, updated_by: userId }
          : { published_at: new Date().toISOString(), updated_by: userId };

        const { error } = await client
          .from(dto.table)
          .update(updateData)
          .eq('id', id);

        if (error) throw error;

        if (dto.unpublish) {
          result.unpublishedCount++;
        } else {
          result.publishedCount++;
        }
      } catch (error: any) {
        result.errors.push({ id, error: error.message || 'Unknown error' });
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Seed chart of accounts for an organization
   */
  async seedAccounts(
    dto: SeedAccountsDto,
    userId: string,
  ): Promise<SeedAccountsResultDto> {
    const client = this.databaseService.getAdminClient();

    // Create job log
    const { data: job } = await client
      .from('admin_job_logs')
      .insert({
        job_type: 'seed_accounts',
        status: 'running',
        input_data: dto,
        created_by: userId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    try {
      let accountsCreated = 0;

      if (dto.chartType === ChartOfAccountsType.MOROCCAN) {
        // Call the existing seed function
        const { data, error } = await client.rpc('seed_moroccan_chart_of_accounts', {
          p_organization_id: dto.organizationId,
        });

        if (error) throw error;
        accountsCreated = data || 0;
      } else {
        // For other chart types, use account templates
        const { data: templates, error: templatesError } = await client
          .from('account_templates')
          .select('*')
          .eq('chart_type', dto.chartType)
          .not('published_at', 'is', null);

        if (templatesError) throw templatesError;

        for (const template of templates || []) {
          const { error } = await client.from('accounts').insert({
            organization_id: dto.organizationId,
            code: template.code,
            name: template.name,
            description: template.description,
            account_type: template.account_type,
            account_subtype: template.account_subtype,
            is_active: true,
          });

          if (!error) accountsCreated++;
        }
      }

      // Update job log
      if (job) {
        await client.from('admin_job_logs').update({
          status: 'completed',
          result_data: { accountsCreated },
          records_created: accountsCreated,
          completed_at: new Date().toISOString(),
        }).eq('id', job.id);
      }

      return {
        success: true,
        organizationId: dto.organizationId,
        chartType: dto.chartType,
        accountsCreated,
        message: `Successfully seeded ${accountsCreated} accounts`,
        jobId: job?.id,
      };
    } catch (error: any) {
      if (job) {
        await client.from('admin_job_logs').update({
          status: 'failed',
          errors: [{ error: error.message }],
          completed_at: new Date().toISOString(),
        }).eq('id', job.id);
      }

      throw new BadRequestException(`Failed to seed accounts: ${error.message}`);
    }
  }

  /**
   * Get SaaS metrics dashboard data
   */
  async getSaasMetrics(): Promise<SaasMetricsDto> {
    const client = this.databaseService.getAdminClient();

    // Get organization counts
    const { count: totalOrgs } = await client
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: newOrgs7d } = await client
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    const { count: newOrgs30d } = await client
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get user counts
    const { count: totalUsers } = await client
      .from('organization_users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get MRR/ARR from subscription_usage
    const { data: revenueData } = await client
      .from('subscription_usage')
      .select('mrr, arr');

    const totalMrr = revenueData?.reduce((sum, row) => sum + (row.mrr || 0), 0) || 0;
    const totalArr = revenueData?.reduce((sum, row) => sum + (row.arr || 0), 0) || 0;

    // Get plan breakdown
    const { data: planData } = await client
      .from('subscriptions')
      .select('plan_type, subscription_usage(mrr)');

    const planBreakdown: { [key: string]: { count: number; mrr: number } } = {};
    for (const sub of planData || []) {
      const planType = sub.plan_type || 'unknown';
      if (!planBreakdown[planType]) {
        planBreakdown[planType] = { count: 0, mrr: 0 };
      }
      planBreakdown[planType].count++;
      planBreakdown[planType].mrr += (sub.subscription_usage as any)?.mrr || 0;
    }

    // Get active orgs (based on recent events)
    const { count: activeOrgs7d } = await client
      .from('events')
      .select('organization_id', { count: 'exact', head: true })
      .gte('occurred_at', sevenDaysAgo.toISOString());

    const { count: activeOrgs30d } = await client
      .from('events')
      .select('organization_id', { count: 'exact', head: true })
      .gte('occurred_at', thirtyDaysAgo.toISOString());

    const activeOrgCount = totalOrgs || 1;
    const arpu = totalMrr / activeOrgCount;

    return {
      totalOrganizations: totalOrgs || 0,
      activeOrganizations7d: activeOrgs7d || 0,
      activeOrganizations30d: activeOrgs30d || 0,
      newOrganizations7d: newOrgs7d || 0,
      newOrganizations30d: newOrgs30d || 0,
      totalUsers: totalUsers || 0,
      dau: 0, // TODO: Calculate from events
      wau: 0,
      mau: 0,
      totalMrr,
      totalArr,
      arpu,
      churnRate: 0, // TODO: Calculate from subscription changes
      activationRate: 0, // TODO: Calculate from first invoice creation
      planBreakdown: Object.entries(planBreakdown).map(([planType, data]) => ({
        planType,
        ...data,
      })),
    };
  }

  /**
   * Get organization usage details
   */
  async getOrgUsage(query: OrgUsageQueryDto): Promise<{ data: OrgUsageDto[]; total: number }> {
    const client = this.databaseService.getAdminClient();
    const limit = parseInt(query.limit || '50', 10);
    const offset = parseInt(query.offset || '0', 10);

    // Try to use materialized view first, fall back to direct query
    let queryBuilder = client
      .from('admin_org_summary')
      .select('*', { count: 'exact' });

    if (query.planType) {
      queryBuilder = queryBuilder.eq('plan_type', query.planType);
    }
    if (query.status) {
      queryBuilder = queryBuilder.eq('subscription_status', query.status);
    }
    if (query.search) {
      queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
    }

    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder === 'asc';
    queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder });
    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      // Materialized view might not exist yet, fall back to direct query
      console.warn('Falling back to direct query:', error.message);

      const { data: orgs, count: orgCount } = await client
        .from('organizations')
        .select(`
          id, name, country_code, created_at, is_active,
          subscriptions(plan_type, status),
          subscription_usage(mrr, arr, farms_count, parcels_count, users_count, storage_used_mb, last_activity_at)
        `, { count: 'exact' })
        .range(offset, offset + limit - 1);

      const mappedData = (orgs || []).map((org: any) => ({
        id: org.id,
        name: org.name,
        countryCode: org.country_code,
        createdAt: org.created_at,
        isActive: org.is_active,
        planType: org.subscriptions?.[0]?.plan_type,
        subscriptionStatus: org.subscriptions?.[0]?.status,
        mrr: org.subscription_usage?.[0]?.mrr || 0,
        arr: org.subscription_usage?.[0]?.arr || 0,
        farmsCount: org.subscription_usage?.[0]?.farms_count || 0,
        parcelsCount: org.subscription_usage?.[0]?.parcels_count || 0,
        usersCount: org.subscription_usage?.[0]?.users_count || 0,
        storageUsedMb: org.subscription_usage?.[0]?.storage_used_mb || 0,
        lastActivityAt: org.subscription_usage?.[0]?.last_activity_at,
        events7d: 0,
        events30d: 0,
      }));

      return { data: mappedData, total: orgCount || 0 };
    }

    const mappedData = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      countryCode: row.country_code,
      createdAt: row.created_at,
      isActive: row.is_active,
      planType: row.plan_type,
      subscriptionStatus: row.subscription_status,
      mrr: row.mrr || 0,
      arr: row.arr || 0,
      farmsCount: row.farms_count || 0,
      parcelsCount: row.parcels_count || 0,
      usersCount: row.users_count || 0,
      storageUsedMb: row.storage_used_mb || 0,
      lastActivityAt: row.last_activity_at,
      events7d: row.events_7d || 0,
      events30d: row.events_30d || 0,
    }));

    return { data: mappedData, total: count || 0 };
  }

  /**
   * Get single organization usage details
   */
  async getOrgUsageById(orgId: string): Promise<OrgUsageDto> {
    const client = this.databaseService.getAdminClient();

    const { data: org, error } = await client
      .from('organizations')
      .select(`
        id, name, country_code, created_at, is_active,
        subscriptions(plan_type, status, current_period_start, current_period_end),
        subscription_usage(mrr, arr, farms_count, parcels_count, users_count, storage_used_mb, last_activity_at)
      `)
      .eq('id', orgId)
      .single();

    if (error || !org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    // Get event counts
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: events7d } = await client
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('occurred_at', sevenDaysAgo.toISOString());

    const { count: events30d } = await client
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('occurred_at', thirtyDaysAgo.toISOString());

    return {
      id: org.id,
      name: org.name,
      countryCode: org.country_code,
      createdAt: org.created_at,
      isActive: org.is_active,
      planType: (org.subscriptions as any)?.[0]?.plan_type,
      subscriptionStatus: (org.subscriptions as any)?.[0]?.status,
      mrr: (org.subscription_usage as any)?.[0]?.mrr || 0,
      arr: (org.subscription_usage as any)?.[0]?.arr || 0,
      farmsCount: (org.subscription_usage as any)?.[0]?.farms_count || 0,
      parcelsCount: (org.subscription_usage as any)?.[0]?.parcels_count || 0,
      usersCount: (org.subscription_usage as any)?.[0]?.users_count || 0,
      storageUsedMb: (org.subscription_usage as any)?.[0]?.storage_used_mb || 0,
      lastActivityAt: (org.subscription_usage as any)?.[0]?.last_activity_at,
      events7d: events7d || 0,
      events30d: events30d || 0,
    };
  }

  /**
   * Get reference data version diff
   */
  async getReferenceDataDiff(
    table: ReferenceDataTable,
    dto: ReferenceDataDiffDto,
  ): Promise<ReferenceDataDiffResultDto> {
    const client = this.databaseService.getAdminClient();

    const { data: fromData } = await client
      .from(table)
      .select('*')
      .eq('template_version', dto.fromVersion);

    const { data: toData } = await client
      .from(table)
      .select('*')
      .eq('template_version', dto.toVersion || 'current');

    const fromMap = new Map((fromData || []).map((r: any) => [r.id, r]));
    const toMap = new Map((toData || []).map((r: any) => [r.id, r]));

    const changes: ReferenceDataDiffResultDto['changes'] = [];

    // Find added and modified
    for (const [id, toRecord] of toMap) {
      const fromRecord = fromMap.get(id);
      if (!fromRecord) {
        changes.push({ type: 'added', id });
      } else {
        // Check for modifications
        for (const key of Object.keys(toRecord)) {
          if (JSON.stringify(fromRecord[key]) !== JSON.stringify(toRecord[key])) {
            changes.push({
              type: 'modified',
              id,
              field: key,
              oldValue: fromRecord[key],
              newValue: toRecord[key],
            });
          }
        }
      }
    }

    // Find removed
    for (const [id] of fromMap) {
      if (!toMap.has(id)) {
        changes.push({ type: 'removed', id });
      }
    }

    return {
      table,
      fromVersion: dto.fromVersion,
      toVersion: dto.toVersion || 'current',
      added: changes.filter((c) => c.type === 'added').length,
      modified: changes.filter((c) => c.type === 'modified').length,
      removed: changes.filter((c) => c.type === 'removed').length,
      changes,
    };
  }

  /**
   * Get admin job logs
   */
  async getJobLogs(limit: number = 50, offset: number = 0) {
    const client = this.databaseService.getAdminClient();

    const { data, error, count } = await client
      .from('admin_job_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException(`Failed to fetch job logs: ${error.message}`);
    }

    return { data: data || [], total: count || 0 };
  }
}
