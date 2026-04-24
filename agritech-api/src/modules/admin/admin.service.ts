import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { sanitizeSearch } from '../../common/utils/sanitize-search';
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
      const s = sanitizeSearch(query.search);
      if (s) queryBuilder = queryBuilder.or(`name.ilike.%${s}%,code.ilike.%${s}%`);
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
        accountsCreated = await this.seedMoroccanChartOfAccounts(client, dto.organizationId);
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

    // Try materialized view first; bail to direct query when approvalStatus filter is used
    // or when the view is missing/stale relative to new columns.
    let mvRows: any[] | null = null;
    let mvCount: number | null = null;

    if (!query.approvalStatus) {
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
        const s = sanitizeSearch(query.search);
        if (s) queryBuilder = queryBuilder.ilike('name', `%${s}%`);
      }

      const sortBy = query.sortBy || 'created_at';
      const sortOrder = query.sortOrder === 'asc';
      queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder });
      queryBuilder = queryBuilder.range(offset, offset + limit - 1);

      const { data, error, count } = await queryBuilder;
      if (!error) {
        mvRows = data || [];
        mvCount = count || 0;
      }
    }

    let baseRows: any[];
    let baseCount: number;

    if (mvRows) {
      baseRows = mvRows.map((row: any) => ({
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
      baseCount = mvCount || 0;
    } else {
      let directQuery = client
        .from('organizations')
        .select(
          `
          id, name, country_code, created_at, is_active,
          subscriptions(plan_type, status),
          subscription_usage(mrr, arr, farms_count, parcels_count, users_count, storage_used_mb, last_activity_at)
        `,
          { count: 'exact' },
        );

      if (query.approvalStatus) {
        directQuery = directQuery.eq('approval_status', query.approvalStatus);
      }
      if (query.search) {
        const s = sanitizeSearch(query.search);
        if (s) directQuery = directQuery.ilike('name', `%${s}%`);
      }

      const sortBy = query.sortBy || 'created_at';
      const sortOrder = query.sortOrder === 'asc';
      directQuery = directQuery.order(sortBy, { ascending: sortOrder });
      directQuery = directQuery.range(offset, offset + limit - 1);

      const { data: orgs, count: orgCount } = await directQuery;

      baseRows = (orgs || []).map((org: any) => ({
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
      baseCount = orgCount || 0;
    }

    if (baseRows.length === 0) {
      return { data: baseRows as OrgUsageDto[], total: baseCount };
    }

    const orgIds = baseRows.map((r) => r.id);

    // Contact + approval info
    const { data: contactRows } = await client
      .from('organizations')
      .select('id, email, phone, city, country, approval_status, approved_at')
      .in('id', orgIds);
    const contactMap = new Map(
      (contactRows || []).map((row: any) => [row.id, row]),
    );

    // Owner (organization_admin) info — one row per org (first admin found)
    const { data: adminRows } = await client
      .from('organization_users')
      .select(
        `
        organization_id,
        user_id,
        role:roles!inner(name)
      `,
      )
      .in('organization_id', orgIds)
      .eq('is_active', true)
      .eq('role.name', 'organization_admin');

    const ownerByOrg = new Map<string, string>();
    for (const row of (adminRows || []) as any[]) {
      if (!ownerByOrg.has(row.organization_id)) {
        ownerByOrg.set(row.organization_id, row.user_id);
      }
    }

    const ownerUserIds = Array.from(new Set(ownerByOrg.values()));
    const ownerById = new Map<string, any>();
    if (ownerUserIds.length > 0) {
      const { data: profiles } = await client
        .from('user_profiles')
        .select('id, first_name, last_name, email, phone')
        .in('id', ownerUserIds);
      for (const p of (profiles || []) as any[]) {
        ownerById.set(p.id, p);
      }
    }

    const data: OrgUsageDto[] = baseRows.map((row) => {
      const contact = contactMap.get(row.id) as any;
      const ownerId = ownerByOrg.get(row.id);
      const owner = ownerId ? ownerById.get(ownerId) : null;
      const ownerName = owner
        ? [owner.first_name, owner.last_name].filter(Boolean).join(' ').trim() || null
        : null;
      return {
        ...row,
        email: contact?.email ?? null,
        phone: contact?.phone ?? null,
        city: contact?.city ?? null,
        country: contact?.country ?? null,
        approvalStatus: contact?.approval_status ?? 'pending',
        approvedAt: contact?.approved_at ?? null,
        ownerName: ownerName || null,
        ownerEmail: owner?.email ?? null,
        ownerPhone: owner?.phone ?? null,
      };
    });

    return { data, total: baseCount };
  }

  /**
   * Mark an organization as approved. Internal admin only.
   */
  async approveOrganization(orgId: string, approverUserId: string): Promise<OrgUsageDto> {
    const client = this.databaseService.getAdminClient();
    const { error } = await client
      .from('organizations')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: approverUserId,
      })
      .eq('id', orgId);

    if (error) {
      throw new InternalServerErrorException(
        `Failed to approve organization: ${error.message}`,
      );
    }

    return this.getOrgUsageById(orgId);
  }

  /**
   * Mark an organization as rejected. Internal admin only.
   */
  async rejectOrganization(orgId: string, approverUserId: string): Promise<OrgUsageDto> {
    const client = this.databaseService.getAdminClient();
    const { error } = await client
      .from('organizations')
      .update({
        approval_status: 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: approverUserId,
      })
      .eq('id', orgId);

    if (error) {
      throw new InternalServerErrorException(
        `Failed to reject organization: ${error.message}`,
      );
    }

    return this.getOrgUsageById(orgId);
  }

  /**
   * List enabled modules for an organization (source of truth: organization_modules)
   */
  async getOrgEnabledModules(orgId: string): Promise<string[]> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('organization_modules')
      .select('modules!inner(slug)')
      .eq('organization_id', orgId)
      .eq('is_active', true);

    if (error) {
      throw new InternalServerErrorException(
        `Failed to load enabled modules: ${error.message}`,
      );
    }

    return (data || [])
      .map((row: any) => row.modules?.slug as string | undefined)
      .filter((slug): slug is string => !!slug);
  }

  /**
   * Replace the set of enabled modules for an organization.
   * Missing rows are inserted active; extra rows are deactivated.
   */
  async setOrgEnabledModules(orgId: string, slugs: string[]): Promise<{ enabled: string[] }> {
    const client = this.databaseService.getAdminClient();
    const normalized = Array.from(new Set(slugs.map((s) => s.trim()).filter(Boolean)));

    const { data: catalog, error: catalogError } = await client
      .from('modules')
      .select('id, slug, is_required');
    if (catalogError) {
      throw new InternalServerErrorException(
        `Failed to load module catalog: ${catalogError.message}`,
      );
    }

    const bySlug = new Map<string, string>();
    const requiredSlugs: string[] = [];
    for (const row of (catalog || []) as any[]) {
      if (row.slug) bySlug.set(row.slug, row.id);
      if (row.is_required && row.slug) requiredSlugs.push(row.slug);
    }

    // Required modules must always be in the enabled set. Reject attempts
    // to save an enabled array that omits any required slug.
    const requestedSet = new Set(normalized);
    const missingRequired = requiredSlugs.filter((s) => !requestedSet.has(s));
    if (missingRequired.length > 0) {
      throw new BadRequestException(
        `Cannot deactivate required modules: ${missingRequired.join(', ')}`,
      );
    }

    const rows = normalized
      .map((slug) => {
        const moduleId = bySlug.get(slug);
        if (!moduleId) return null;
        return {
          organization_id: orgId,
          module_id: moduleId,
          is_active: true,
        };
      })
      .filter((r): r is { organization_id: string; module_id: string; is_active: boolean } => !!r);

    const activeModuleIds = rows.map((r) => r.module_id);

    // Upsert active rows
    if (rows.length > 0) {
      const { error: upsertError } = await client
        .from('organization_modules')
        .upsert(rows, { onConflict: 'organization_id,module_id' });
      if (upsertError) {
        throw new InternalServerErrorException(
          `Failed to enable modules: ${upsertError.message}`,
        );
      }
    }

    // Deactivate everything else for this org
    let deactivateQuery = client
      .from('organization_modules')
      .update({ is_active: false })
      .eq('organization_id', orgId);
    if (activeModuleIds.length > 0) {
      deactivateQuery = deactivateQuery.not(
        'module_id',
        'in',
        `(${activeModuleIds.map((id) => `"${id}"`).join(',')})`,
      );
    }
    const { error: deactivateError } = await deactivateQuery;
    if (deactivateError) {
      throw new InternalServerErrorException(
        `Failed to deactivate modules: ${deactivateError.message}`,
      );
    }

    return { enabled: await this.getOrgEnabledModules(orgId) };
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
        email, phone, city, country, approval_status, approved_at,
        subscriptions(plan_type, status, current_period_start, current_period_end),
        subscription_usage(mrr, arr, farms_count, parcels_count, users_count, storage_used_mb, last_activity_at)
      `)
      .eq('id', orgId)
      .single();

    if (error || !org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    // Fetch owner (first organization_admin) contact
    const { data: adminRow } = await client
      .from('organization_users')
      .select('user_id, role:roles!inner(name)')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .eq('role.name', 'organization_admin')
      .limit(1)
      .maybeSingle();

    let owner: any = null;
    if (adminRow?.user_id) {
      const { data: profile } = await client
        .from('user_profiles')
        .select('first_name, last_name, email, phone')
        .eq('id', adminRow.user_id)
        .maybeSingle();
      owner = profile || null;
    }
    const ownerName = owner
      ? [owner.first_name, owner.last_name].filter(Boolean).join(' ').trim() || null
      : null;

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
      id: (org as any).id,
      name: (org as any).name,
      countryCode: (org as any).country_code,
      createdAt: (org as any).created_at,
      isActive: (org as any).is_active,
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
      email: (org as any).email ?? null,
      phone: (org as any).phone ?? null,
      city: (org as any).city ?? null,
      country: (org as any).country ?? null,
      approvalStatus: (org as any).approval_status ?? 'pending',
      approvedAt: (org as any).approved_at ?? null,
      ownerName,
      ownerEmail: owner?.email ?? null,
      ownerPhone: owner?.phone ?? null,
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

  private async seedMoroccanChartOfAccounts(client: ReturnType<DatabaseService['getAdminClient']>, organizationId: string): Promise<number> {
    const moroccanAccounts = [
      { code: '1', name: 'Financement permanent', account_type: 'equity', is_group: true },
      { code: '11', name: 'Capitaux propres', account_type: 'equity', parent_code: '1', is_group: true },
      { code: '111', name: 'Capital social', account_type: 'equity', parent_code: '11', is_group: false },
      { code: '112', name: 'Primes d\'émission et de fusion', account_type: 'equity', parent_code: '11', is_group: false },
      { code: '14', name: 'Dettes de financement', account_type: 'liability', parent_code: '1', is_group: true },
      { code: '141', name: 'Emprunts obligataires', account_type: 'liability', parent_code: '14', is_group: false },
      { code: '148', name: 'Autres dettes de financement', account_type: 'liability', parent_code: '14', is_group: false },
      { code: '2', name: 'Actif immobilisé', account_type: 'asset', is_group: true },
      { code: '21', name: 'Immobilisations en non-valeurs', account_type: 'asset', parent_code: '2', is_group: true },
      { code: '22', name: 'Immobilisations incorporelles', account_type: 'asset', parent_code: '2', is_group: true },
      { code: '23', name: 'Immobilisations corporelles', account_type: 'asset', parent_code: '2', is_group: true },
      { code: '231', name: 'Terrains', account_type: 'asset', parent_code: '23', is_group: false },
      { code: '232', name: 'Constructions', account_type: 'asset', parent_code: '23', is_group: false },
      { code: '233', name: 'Installations techniques', account_type: 'asset', parent_code: '23', is_group: false },
      { code: '234', name: 'Matériel de transport', account_type: 'asset', parent_code: '23', is_group: false },
      { code: '235', name: 'Mobilier et matériel de bureau', account_type: 'asset', parent_code: '23', is_group: false },
      { code: '3', name: 'Actif circulant', account_type: 'asset', is_group: true },
      { code: '31', name: 'Stocks', account_type: 'asset', parent_code: '3', is_group: true },
      { code: '311', name: 'Marchandises', account_type: 'asset', parent_code: '31', is_group: false },
      { code: '312', name: 'Matières et fournitures', account_type: 'asset', parent_code: '31', is_group: false },
      { code: '313', name: 'Produits en cours', account_type: 'asset', parent_code: '31', is_group: false },
      { code: '315', name: 'Produits finis', account_type: 'asset', parent_code: '31', is_group: false },
      { code: '34', name: 'Créances de l\'actif circulant', account_type: 'asset', parent_code: '3', is_group: true },
      { code: '341', name: 'Clients et comptes rattachés', account_type: 'asset', parent_code: '34', is_group: false },
      { code: '4', name: 'Passif circulant', account_type: 'liability', is_group: true },
      { code: '44', name: 'Dettes du passif circulant', account_type: 'liability', parent_code: '4', is_group: true },
      { code: '441', name: 'Fournisseurs et comptes rattachés', account_type: 'liability', parent_code: '44', is_group: false },
      { code: '443', name: 'Personnel - créditeur', account_type: 'liability', parent_code: '44', is_group: false },
      { code: '444', name: 'Organismes sociaux', account_type: 'liability', parent_code: '44', is_group: false },
      { code: '445', name: 'État - créditeur', account_type: 'liability', parent_code: '44', is_group: false },
      { code: '5', name: 'Trésorerie', account_type: 'asset', is_group: true },
      { code: '51', name: 'Trésorerie - Actif', account_type: 'asset', parent_code: '5', is_group: true },
      { code: '511', name: 'Chèques et valeurs à encaisser', account_type: 'asset', parent_code: '51', is_group: false },
      { code: '514', name: 'Banques', account_type: 'asset', parent_code: '51', is_group: false },
      { code: '516', name: 'Caisses', account_type: 'asset', parent_code: '51', is_group: false },
      { code: '55', name: 'Trésorerie - Passif', account_type: 'liability', parent_code: '5', is_group: true },
      { code: '553', name: 'Crédits de trésorerie', account_type: 'liability', parent_code: '55', is_group: false },
      { code: '6', name: 'Charges', account_type: 'expense', is_group: true },
      { code: '61', name: 'Charges d\'exploitation', account_type: 'expense', parent_code: '6', is_group: true },
      { code: '611', name: 'Achats revendus de marchandises', account_type: 'expense', parent_code: '61', is_group: false },
      { code: '612', name: 'Achats consommés de matières', account_type: 'expense', parent_code: '61', is_group: false },
      { code: '613', name: 'Autres charges externes', account_type: 'expense', parent_code: '61', is_group: false },
      { code: '614', name: 'Impôts et taxes', account_type: 'expense', parent_code: '61', is_group: false },
      { code: '617', name: 'Charges de personnel', account_type: 'expense', parent_code: '61', is_group: false },
      { code: '618', name: 'Autres charges d\'exploitation', account_type: 'expense', parent_code: '61', is_group: false },
      { code: '619', name: 'Dotations d\'exploitation', account_type: 'expense', parent_code: '61', is_group: false },
      { code: '63', name: 'Charges financières', account_type: 'expense', parent_code: '6', is_group: true },
      { code: '631', name: 'Charges d\'intérêts', account_type: 'expense', parent_code: '63', is_group: false },
      { code: '65', name: 'Charges non courantes', account_type: 'expense', parent_code: '6', is_group: true },
      { code: '67', name: 'Impôts sur les résultats', account_type: 'expense', parent_code: '6', is_group: true },
      { code: '670', name: 'Impôts sur les bénéfices', account_type: 'expense', parent_code: '67', is_group: false },
      { code: '7', name: 'Produits', account_type: 'revenue', is_group: true },
      { code: '71', name: 'Produits d\'exploitation', account_type: 'revenue', parent_code: '7', is_group: true },
      { code: '711', name: 'Ventes de marchandises', account_type: 'revenue', parent_code: '71', is_group: false },
      { code: '712', name: 'Ventes de biens et services produits', account_type: 'revenue', parent_code: '71', is_group: false },
      { code: '713', name: 'Variation de stocks de produits', account_type: 'revenue', parent_code: '71', is_group: false },
      { code: '714', name: 'Immobilisations produites', account_type: 'revenue', parent_code: '71', is_group: false },
      { code: '716', name: 'Subventions d\'exploitation', account_type: 'revenue', parent_code: '71', is_group: false },
      { code: '718', name: 'Autres produits d\'exploitation', account_type: 'revenue', parent_code: '71', is_group: false },
      { code: '73', name: 'Produits financiers', account_type: 'revenue', parent_code: '7', is_group: true },
      { code: '732', name: 'Produits des titres de participation', account_type: 'revenue', parent_code: '73', is_group: false },
      { code: '738', name: 'Intérêts et autres produits financiers', account_type: 'revenue', parent_code: '73', is_group: false },
      { code: '75', name: 'Produits non courants', account_type: 'revenue', parent_code: '7', is_group: true },
    ];

    const codeToId = new Map<string, string>();
    let created = 0;

    for (const acc of moroccanAccounts) {
      const parentId = acc.parent_code ? codeToId.get(acc.parent_code) : null;
      const { data, error } = await client
        .from('accounts')
        .insert({
          organization_id: organizationId,
          code: acc.code,
          name: acc.name,
          account_type: acc.account_type,
          is_group: acc.is_group,
          parent_id: parentId,
          is_active: true,
        })
        .select('id')
        .single();

      if (!error && data) {
        codeToId.set(acc.code, data.id);
        created++;
      }
    }

    return created;
  }

  // ============================================
  // Admin Subscription Management
  // ============================================

  async getOrgSubscription(orgId: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async extendSubscription(
    orgId: string,
    dto: {
      days?: number;
      newEndDate?: string;
      reason?: string;
    },
    adminUserId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const { data: sub, error: fetchErr } = await client
      .from('subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) throw new BadRequestException(fetchErr.message);
    if (!sub) throw new NotFoundException('No subscription found for this organization');

    let newEnd: string;
    if (dto.newEndDate) {
      newEnd = dto.newEndDate;
    } else if (dto.days) {
      const current = sub.current_period_end
        ? new Date(sub.current_period_end)
        : new Date();
      current.setDate(current.getDate() + dto.days);
      newEnd = current.toISOString();
    } else {
      throw new BadRequestException('Provide either days or newEndDate');
    }

    const { error: updateErr } = await client
      .from('subscriptions')
      .update({
        current_period_end: newEnd,
        contract_end_at: newEnd,
        status: 'active',
      })
      .eq('id', sub.id);

    if (updateErr) throw new BadRequestException(updateErr.message);

    // Log the event
    await client.from('subscription_events').insert({
      organization_id: orgId,
      subscription_id: sub.id,
      event_type: 'admin_extension',
      actor_type: 'admin',
      actor_id: adminUserId,
      payload: { days: dto.days, newEndDate: newEnd, reason: dto.reason },
    });

    return { success: true, subscriptionId: sub.id, newPeriodEnd: newEnd };
  }

  async updateSubscription(
    orgId: string,
    dto: {
      formula?: string;
      billing_cycle?: string;
      contracted_hectares?: number;
      selected_modules?: any[];
      discount_pct?: number;
      status?: string;
      max_farms?: number;
      max_users?: number;
      max_parcels?: number;
    },
    adminUserId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const { data: sub, error: fetchErr } = await client
      .from('subscriptions')
      .select('id')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) throw new BadRequestException(fetchErr.message);
    if (!sub) throw new NotFoundException('No subscription found for this organization');

    const updates: Record<string, any> = {};
    if (dto.formula !== undefined) updates.formula = dto.formula;
    if (dto.billing_cycle !== undefined) updates.billing_cycle = dto.billing_cycle;
    if (dto.contracted_hectares !== undefined) updates.contracted_hectares = dto.contracted_hectares;
    if (dto.selected_modules !== undefined) updates.selected_modules = dto.selected_modules;
    if (dto.discount_pct !== undefined) updates.discount_pct = dto.discount_pct;
    if (dto.status !== undefined) updates.status = dto.status;
    if (dto.max_farms !== undefined) updates.max_farms = dto.max_farms;
    if (dto.max_users !== undefined) updates.max_users = dto.max_users;
    if (dto.max_parcels !== undefined) updates.max_parcels = dto.max_parcels;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const { error: updateErr } = await client
      .from('subscriptions')
      .update(updates)
      .eq('id', sub.id);

    if (updateErr) throw new BadRequestException(updateErr.message);

    await client.from('subscription_events').insert({
      organization_id: orgId,
      subscription_id: sub.id,
      event_type: 'admin_update',
      actor_type: 'admin',
      actor_id: adminUserId,
      payload: updates,
    });

    return { success: true, subscriptionId: sub.id, updates };
  }

  async createSubscription(
    orgId: string,
    dto: {
      formula: string;
      billing_cycle: string;
      contracted_hectares: number;
      status?: string;
      days?: number;
      selected_modules?: any[];
      discount_pct?: number;
    },
    adminUserId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + (dto.days ?? 365));

    const { data, error } = await client
      .from('subscriptions')
      .insert({
        organization_id: orgId,
        formula: dto.formula,
        billing_cycle: dto.billing_cycle,
        contracted_hectares: dto.contracted_hectares,
        status: dto.status ?? 'active',
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        contract_start_at: now.toISOString(),
        contract_end_at: end.toISOString(),
        selected_modules: dto.selected_modules ?? [],
        discount_pct: dto.discount_pct ?? 10,
        currency: 'MAD',
        vat_rate: 0.20,
      })
      .select('id')
      .single();

    if (error) throw new BadRequestException(error.message);

    await client.from('subscription_events').insert({
      organization_id: orgId,
      subscription_id: data.id,
      event_type: 'admin_create',
      actor_type: 'admin',
      actor_id: adminUserId,
      payload: dto,
    });

    return { success: true, subscriptionId: data.id };
  }

  // ============================================
  // Banner Admin Methods (cross-org)
  // ============================================

  async getAllBanners() {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('banners')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return data || [];
  }

  async createBanner(dto: any, userId: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('banners')
      .insert({ ...dto, created_by: userId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBanner(id: string, dto: any) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('banners')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundException(`Banner ${id} not found`);
    return data;
  }

  async deleteBanner(id: string) {
    const client = this.databaseService.getAdminClient();
    const { error } = await client
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  // ============================================
  // Module Management
  // ============================================

  async getModules() {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('modules')
      .select('*, module_translations(*)')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getModule(id: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('modules')
      .select('*, module_translations(*)')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Module not found');
    return data;
  }

  async createModule(input: Record<string, unknown>) {
    const client = this.databaseService.getAdminClient();

    // Validate nav_items against route manifest (if available)
    if ('navigation_items' in input) {
      const { routes: manifest } = this.readManifest();
      const unknown = this.validateNavItemsAgainstManifest(input.navigation_items, manifest);
      if (unknown.length > 0) {
        throw new BadRequestException(
          `Unknown routes in navigation_items: ${unknown.join(', ')}. Run 'npm run gen:manifest' after adding new routes.`,
        );
      }
    }

    // Check slug uniqueness
    if (input.slug) {
      const { data: existing } = await client
        .from('modules')
        .select('id')
        .eq('slug', input.slug as string)
        .maybeSingle();

      if (existing) {
        throw new BadRequestException(`Module with slug "${input.slug}" already exists`);
      }
    }

    const { data, error } = await client
      .from('modules')
      .insert({
        name: input.name || input.slug,
        slug: input.slug,
        icon: input.icon || null,
        color: input.color || null,
        category: input.category || 'other',
        description: input.description || null,
        display_order: input.display_order || 0,
        price_monthly: input.price_monthly || 0,
        is_required: input.is_required || false,
        is_recommended: input.is_recommended || false,
        is_addon_eligible: input.is_addon_eligible || false,
        is_available: input.is_available !== false,
        required_plan: input.required_plan || null,
        dashboard_widgets: input.dashboard_widgets || [],
        navigation_items: input.navigation_items || [],
        features: input.features || [],
      })
      .select('*, module_translations(*)')
      .single();

    if (error) throw error;
    return data;
  }

  async updateModule(id: string, input: Record<string, unknown>) {
    const client = this.databaseService.getAdminClient();

    // Validate nav_items against route manifest (if available)
    if ('navigation_items' in input) {
      const { routes: manifest } = this.readManifest();
      const unknown = this.validateNavItemsAgainstManifest(input.navigation_items, manifest);
      if (unknown.length > 0) {
        throw new BadRequestException(
          `Unknown routes in navigation_items: ${unknown.join(', ')}. Run 'npm run gen:manifest' after adding new routes.`,
        );
      }
    }

    // Check module exists
    const { data: existing } = await client
      .from('modules')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Module not found');

    // Build update payload — only include provided fields
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowedFields = [
      'name', 'slug', 'icon', 'color', 'category', 'description',
      'display_order', 'price_monthly', 'is_required', 'is_recommended',
      'is_addon_eligible', 'is_available', 'required_plan',
      'dashboard_widgets', 'navigation_items', 'features',
    ];
    for (const field of allowedFields) {
      if (field in input) {
        update[field] = input[field];
      }
    }

    const { data, error } = await client
      .from('modules')
      .update(update)
      .eq('id', id)
      .select('*, module_translations(*)')
      .single();

    if (error) throw error;
    return data;
  }

  async deleteModule(id: string) {
    const client = this.databaseService.getAdminClient();

    // Verify the module exists + check if it's required (protected).
    const { data: existing, error: fetchError } = await client
      .from('modules')
      .select('id, slug, is_required')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) {
      throw new InternalServerErrorException(`Failed to load module: ${fetchError.message}`);
    }
    if (!existing) {
      throw new NotFoundException('Module not found');
    }
    if (existing.is_required) {
      throw new BadRequestException(
        `Module '${existing.slug}' is required and cannot be deleted. Mark it unavailable instead.`,
      );
    }

    // Hard delete. organization_modules and module_translations both have
    // ON DELETE CASCADE, so per-org activations + i18n rows are cleaned up
    // automatically.
    const { error } = await client
      .from('modules')
      .delete()
      .eq('id', id);
    if (error) {
      throw new InternalServerErrorException(`Failed to delete module: ${error.message}`);
    }
    return { id, slug: existing.slug, deleted: true };
  }

  async upsertModuleTranslation(
    moduleId: string,
    locale: string,
    input: { name?: string; description?: string; features?: string[] },
  ) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('module_translations')
      .upsert(
        {
          module_id: moduleId,
          locale,
          name: input.name,
          description: input.description,
          features: input.features,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'module_id,locale' },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ============================================
  // Route Manifest
  // ============================================

  private cachedManifest: { mtimeMs: number; routes: string[] } | null = null;

  private readManifest(): { routes: string[]; generated_at: string | null } {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path');
    // Preferred location: bundled inside agritech-api (copied to dist/data/
    // by nest-cli.json assets config). Falls back to monorepo-local paths
    // in dev and to project/ sources if someone runs the compiled code
    // straight from the repo.
    const candidates = [
      // dist/data/route-manifest.json (production in container)
      path.resolve(__dirname, '../../data/route-manifest.json'),
      // src/data/route-manifest.json (running ts-node in dev)
      path.resolve(__dirname, '../../../src/data/route-manifest.json'),
      path.resolve(process.cwd(), 'src/data/route-manifest.json'),
      // monorepo fallbacks
      path.resolve(process.cwd(), '../project/src/generated/route-manifest.json'),
      path.resolve(process.cwd(), 'project/src/generated/route-manifest.json'),
      path.resolve(process.cwd(), '../../project/src/generated/route-manifest.json'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        if (this.cachedManifest && this.cachedManifest.mtimeMs === stat.mtimeMs) {
          return { routes: this.cachedManifest.routes, generated_at: null };
        }
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw) as { routes?: string[]; generated_at?: string };
        const routes = Array.isArray(parsed.routes) ? parsed.routes : [];
        this.cachedManifest = { mtimeMs: stat.mtimeMs, routes };
        return { routes, generated_at: parsed.generated_at ?? null };
      }
    }
    // No manifest found — fail soft with empty array. Frontend / validation
    // treats this as "no manifest available" and skips validation rather
    // than blocking module saves.
    this.cachedManifest = null;
    return { routes: [], generated_at: null };
  }

  async getRouteManifest(): Promise<{ routes: string[]; generated_at: string | null; count: number }> {
    const { routes, generated_at } = this.readManifest();
    return { routes, generated_at, count: routes.length };
  }

  /**
   * Validate that each nav_item is either in the manifest or a literal
   * prefix of something in the manifest. Returns the list of offending
   * entries. Empty array = all valid.
   */
  private validateNavItemsAgainstManifest(
    navItems: unknown,
    manifest: string[],
  ): string[] {
    if (!Array.isArray(navItems) || manifest.length === 0) return [];
    const manifestSet = new Set(manifest);

    const unknown: string[] = [];
    for (const item of navItems) {
      const to = typeof item === 'string'
        ? item
        : item && typeof item === 'object' && typeof (item as { to?: unknown }).to === 'string'
          ? (item as { to: string }).to
          : null;
      if (!to) continue;
      // Accept an exact match, or accept the entry as a prefix of a real
      // route (so `/parcels/$parcelId/ai` matches a module that wants to
      // claim the whole subtree).
      if (manifestSet.has(to)) continue;
      if (manifest.some((m) => m === to || m.startsWith(`${to}/`))) continue;
      unknown.push(to);
    }
    return unknown;
  }

  /**
   * Re-seed the canonical 12-SKU catalog and deactivate everything else.
   * Same contract as the 20260424000000 migration — safe to re-run.
   * Returns counts so the UI can toast "seeded N, deactivated M".
   */
  async loadDefaultModules(): Promise<{
    seeded: number;
    deactivated: number;
    translationsSeeded: number;
  }> {
    const client = this.databaseService.getAdminClient();

    const CANONICAL: Array<{
      slug: string;
      name: string;
      icon: string;
      color: string;
      category: string;
      description: string;
      display_order: number;
      price_monthly: number;
      is_required: boolean;
      is_recommended: boolean;
      is_available: boolean;
      navigation_items: string[];
    }> = [
      { slug: 'core', name: 'core', icon: 'Home', color: '#10b981', category: 'core', description: 'Core features available to every organization', display_order: 1, price_monthly: 0, is_required: true, is_recommended: true, is_available: true, navigation_items: ['/dashboard','/settings','/farm-hierarchy','/parcels','/notifications'] },
      { slug: 'chat_advisor', name: 'chat_advisor', icon: 'Bot', color: '#10b981', category: 'analytics', description: 'Conversational AgromindIA assistant', display_order: 2, price_monthly: 0, is_required: false, is_recommended: true, is_available: true, navigation_items: ['/chat'] },
      { slug: 'agromind_advisor', name: 'agromind_advisor', icon: 'Sparkles', color: '#7c3aed', category: 'analytics', description: 'AI advisor per parcel: calibration, diagnostics, recommendations, annual plan', display_order: 3, price_monthly: 0, is_required: false, is_recommended: false, is_available: true, navigation_items: ['/parcels/$parcelId/ai'] },
      { slug: 'satellite', name: 'satellite', icon: 'Satellite', color: '#06b6d4', category: 'analytics', description: 'Satellite imagery, vegetation indices, weather', display_order: 4, price_monthly: 0, is_required: false, is_recommended: false, is_available: true, navigation_items: ['/satellite-analysis','/parcels/$parcelId/satellite','/parcels/$parcelId/weather'] },
      { slug: 'personnel', name: 'personnel', icon: 'Users', color: '#3b82f6', category: 'hr', description: 'Workers and tasks', display_order: 5, price_monthly: 0, is_required: false, is_recommended: false, is_available: true, navigation_items: ['/workers','/tasks'] },
      { slug: 'stock', name: 'stock', icon: 'Package', color: '#10b981', category: 'inventory', description: 'Inventory and infrastructure', display_order: 6, price_monthly: 0, is_required: false, is_recommended: false, is_available: true, navigation_items: ['/stock','/infrastructure'] },
      { slug: 'production', name: 'production', icon: 'Wheat', color: '#f59e0b', category: 'production', description: 'Campaigns, crop cycles, harvests, quality', display_order: 7, price_monthly: 0, is_required: false, is_recommended: false, is_available: true, navigation_items: ['/campaigns','/crop-cycles','/harvests','/reception-batches','/quality-control'] },
      { slug: 'fruit_trees', name: 'fruit_trees', icon: 'TreeDeciduous', color: '#10b981', category: 'agriculture', description: 'Trees, orchards, pruning', display_order: 8, price_monthly: 0, is_required: false, is_recommended: false, is_available: true, navigation_items: ['/trees','/orchards','/pruning'] },
      { slug: 'compliance', name: 'compliance', icon: 'ShieldCheck', color: '#a855f7', category: 'operations', description: 'Compliance and certifications', display_order: 9, price_monthly: 0, is_required: false, is_recommended: false, is_available: true, navigation_items: ['/compliance'] },
      { slug: 'sales_purchasing', name: 'sales_purchasing', icon: 'ShoppingCart', color: '#f43f5e', category: 'sales', description: 'Quotes, sales orders, purchase orders', display_order: 10, price_monthly: 0, is_required: false, is_recommended: false, is_available: true, navigation_items: ['/accounting/quotes','/accounting/sales-orders','/accounting/purchase-orders','/accounting/customers','/stock/suppliers'] },
      { slug: 'accounting', name: 'accounting', icon: 'BookOpen', color: '#6366f1', category: 'accounting', description: 'Invoices, payments, journal, reports', display_order: 11, price_monthly: 0, is_required: false, is_recommended: false, is_available: true, navigation_items: ['/accounting'] },
      { slug: 'marketplace', name: 'marketplace', icon: 'ShoppingBag', color: '#f97316', category: 'sales', description: 'B2B quote marketplace', display_order: 12, price_monthly: 0, is_required: false, is_recommended: false, is_available: true, navigation_items: ['/marketplace'] },
    ];

    // Upsert catalog rows
    const rows = CANONICAL.map((m) => ({
      ...m,
      dashboard_widgets: [],
    }));
    const { error: upsertError } = await client
      .from('modules')
      .upsert(rows, { onConflict: 'slug' });
    if (upsertError) {
      throw new InternalServerErrorException(
        `Failed to upsert default modules: ${upsertError.message}`,
      );
    }

    // Deactivate everything else
    const { data: deactivatedRows, error: deactError } = await client
      .from('modules')
      .update({ is_available: false, updated_at: new Date().toISOString() })
      .not('slug', 'in', `(${CANONICAL.map((m) => `"${m.slug}"`).join(',')})`)
      .select('id');
    if (deactError) {
      throw new InternalServerErrorException(
        `Failed to deactivate non-canonical modules: ${deactError.message}`,
      );
    }

    // Seed translations (fr/en/ar)
    const T: Record<string, Record<'fr' | 'en' | 'ar', { name: string; description: string }>> = {
      core: { fr: { name: 'Cœur', description: 'Fonctionnalités de base pour toute organisation' }, en: { name: 'Core', description: 'Core features available to every organization' }, ar: { name: 'الأساس', description: 'الميزات الأساسية المتاحة لكل مؤسسة' } },
      chat_advisor: { fr: { name: 'Conseiller Chat', description: 'Assistant conversationnel AgromindIA' }, en: { name: 'Chat Advisor', description: 'Conversational AgromindIA assistant' }, ar: { name: 'المستشار الحواري', description: 'مساعد AgromindIA التفاعلي' } },
      agromind_advisor: { fr: { name: 'Conseiller AgroMind', description: 'Conseiller IA par parcelle: calibrage, diagnostics, recommandations, plan annuel' }, en: { name: 'AgroMind Advisor', description: 'AI advisor per parcel: calibration, diagnostics, recommendations, annual plan' }, ar: { name: 'مستشار أغرومايند', description: 'مستشار ذكاء اصطناعي لكل قطعة' } },
      satellite: { fr: { name: 'Satellite', description: 'Imagerie satellite, indices de végétation, météo' }, en: { name: 'Satellite', description: 'Satellite imagery, vegetation indices, weather' }, ar: { name: 'الأقمار الصناعية', description: 'صور الأقمار الصناعية' } },
      personnel: { fr: { name: 'Personnel', description: 'Ouvriers et tâches' }, en: { name: 'Personnel', description: 'Workers and tasks' }, ar: { name: 'الموظفون', description: 'العمال والمهام' } },
      stock: { fr: { name: 'Stock', description: 'Inventaire et infrastructure' }, en: { name: 'Stock', description: 'Inventory and infrastructure' }, ar: { name: 'المخزون', description: 'المخزون والبنية التحتية' } },
      production: { fr: { name: 'Production', description: 'Campagnes, cycles culturaux, récoltes, qualité' }, en: { name: 'Production', description: 'Campaigns, crop cycles, harvests, quality' }, ar: { name: 'الإنتاج', description: 'الحملات ودورات المحاصيل والحصاد' } },
      fruit_trees: { fr: { name: 'Arbres Fruitiers', description: 'Arbres, vergers, taille' }, en: { name: 'Fruit Trees', description: 'Trees, orchards, pruning' }, ar: { name: 'الأشجار المثمرة', description: 'الأشجار والبساتين' } },
      compliance: { fr: { name: 'Conformité', description: 'Conformité et certifications' }, en: { name: 'Compliance', description: 'Compliance and certifications' }, ar: { name: 'الامتثال', description: 'الامتثال والشهادات' } },
      sales_purchasing: { fr: { name: 'Ventes & Achats', description: 'Devis, commandes clients, commandes fournisseurs' }, en: { name: 'Sales & Purchasing', description: 'Quotes, sales orders, purchase orders' }, ar: { name: 'المبيعات والمشتريات', description: 'العروض وطلبات البيع' } },
      accounting: { fr: { name: 'Comptabilité', description: 'Factures, paiements, journal, rapports' }, en: { name: 'Accounting', description: 'Invoices, payments, journal, reports' }, ar: { name: 'المحاسبة', description: 'الفواتير والمدفوعات والدفتر' } },
      marketplace: { fr: { name: 'Place de Marché', description: 'Marketplace B2B de demandes de devis' }, en: { name: 'Marketplace', description: 'B2B quote marketplace' }, ar: { name: 'السوق', description: 'سوق عروض B2B' } },
    };

    const { data: seededModules } = await client
      .from('modules')
      .select('id, slug')
      .in('slug', CANONICAL.map((m) => m.slug));
    const slugToId = new Map<string, string>(
      ((seededModules || []) as Array<{ id: string; slug: string }>).map((r) => [r.slug, r.id]),
    );

    const translationRows: Array<{ module_id: string; locale: string; name: string; description: string }> = [];
    for (const [slug, locales] of Object.entries(T)) {
      const moduleId = slugToId.get(slug);
      if (!moduleId) continue;
      for (const [locale, t] of Object.entries(locales)) {
        translationRows.push({ module_id: moduleId, locale, name: t.name, description: t.description });
      }
    }
    const { error: tError } = await client
      .from('module_translations')
      .upsert(translationRows, { onConflict: 'module_id,locale' });
    if (tError) {
      throw new InternalServerErrorException(
        `Failed to seed translations: ${tError.message}`,
      );
    }

    return {
      seeded: CANONICAL.length,
      deactivated: (deactivatedRows || []).length,
      translationsSeeded: translationRows.length,
    };
  }

  async getOrphanRoutes(): Promise<{ orphans: string[]; count: number }> {
    const client = this.databaseService.getAdminClient();
    const { routes } = this.readManifest();
    if (routes.length === 0) return { orphans: [], count: 0 };

    const { data: modules } = await client
      .from('modules')
      .select('slug, navigation_items, is_available')
      .eq('is_available', true);

    const claimed = new Set<string>();
    for (const m of (modules || []) as any[]) {
      const items = Array.isArray(m.navigation_items) ? m.navigation_items : [];
      for (const item of items) {
        const to = typeof item === 'string' ? item : item?.to;
        if (typeof to !== 'string') continue;
        // Mark the nav entry as "covering" any manifest route that starts
        // with it. This is the longest-prefix model from module-gating.ts
        // — if /parcels covers /parcels/abc, /parcels/abc is not orphan.
        for (const route of routes) {
          if (route === to || route.startsWith(`${to}/`)) claimed.add(route);
        }
      }
    }
    // Exclude meta routes that should never need a module
    // (authentication, onboarding, public marketing, etc.).
    const nonGated = (r: string) =>
      r.startsWith('/login') ||
      r.startsWith('/register') ||
      r.startsWith('/forgot-password') ||
      r.startsWith('/set-password') ||
      r.startsWith('/auth/') ||
      r.startsWith('/onboarding') ||
      r.startsWith('/checkout-success') ||
      r.startsWith('/privacy-policy') ||
      r.startsWith('/terms-of-service') ||
      r.startsWith('/pitch-deck') ||
      r.startsWith('/rdv') ||
      r.startsWith('/import-data') ||
      r.startsWith('/setup') ||
      r === '/';

    const orphans = routes.filter((r) => !claimed.has(r) && !nonGated(r));
    return { orphans, count: orphans.length };
  }
}
