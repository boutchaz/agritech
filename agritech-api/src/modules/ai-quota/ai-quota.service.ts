import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AI_LEVEL_LIMITS, FORMULA_TO_LEVEL, UNLIMITED, AiFeature } from './ai-quota.constants';

export interface QuotaCheckResult {
  allowed: boolean;
  provider: string;
  isByok: boolean;
  error?: string;
  limit?: number;
  used?: number;
  resetDate?: string;
}

export interface QuotaStatus {
  monthly_limit: number;
  current_count: number;
  period_start: string;
  period_end: string;
  is_byok: boolean;
  is_unlimited: boolean;
}

export interface UsageLogEntry {
  id: string;
  created_at: string;
  feature: string;
  provider: string;
  model: string | null;
  tokens_used: number | null;
  is_byok: boolean | null;
}

export interface DailyTokenAggregate {
  date: string;
  total_tokens: number;
  request_count: number;
  by_model: Record<string, number>;
}

export interface UsageLogResponse {
  daily_aggregates: DailyTokenAggregate[];
  recent_entries: UsageLogEntry[];
  total_tokens: number;
  total_requests: number;
  period_start: string;
  period_end: string;
}

@Injectable()
export class AiQuotaService {
  private readonly logger = new Logger(AiQuotaService.name);

  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Get or create the quota row for an organization.
   * Lazy creation on first AI call, lazy reset when period expires.
   */
  async getOrCreateQuota(organizationId: string): Promise<{
    id: string;
    monthly_limit: number;
    current_count: number;
    period_start: string;
    period_end: string;
  }> {
    const supabase = this.databaseService.getAdminClient();

    // Check existing quota
    const { data: existing } = await supabase
      .from('ai_quotas')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const now = new Date();

    // If exists and period is still valid, return it
    if (existing && new Date(existing.period_end) > now) {
      return existing;
    }

    // Determine limit from subscription
    const limit = await this.getOrgLimit(organizationId);

    // Calculate period (1st of current month to 1st of next month)
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    if (existing) {
      // Period expired — reset
      const { data: updated, error } = await supabase
        .from('ai_quotas')
        .update({
          monthly_limit: limit,
          current_count: 0,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to reset quota: ${error.message}`);
        return existing; // Return stale rather than fail
      }
      return updated;
    }

    // Create new
    const { data: created, error: createError } = await supabase
      .from('ai_quotas')
      .insert({
        organization_id: organizationId,
        monthly_limit: limit,
        current_count: 0,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      })
      .select()
      .single();

    if (createError) {
      this.logger.error(`Failed to create quota: ${createError.message}`);
      // Return a default so we don't block AI
      return {
        id: 'default',
        monthly_limit: limit,
        current_count: 0,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      };
    }

    return created;
  }

  /**
   * Check if the org can make an AI request and consume one slot.
   */
  async checkAndConsume(
    organizationId: string,
    userId: string,
    feature: AiFeature,
  ): Promise<QuotaCheckResult> {
    // Check if org has BYOK
    const isByok = await this.checkByok(organizationId);
    if (isByok) {
      return { allowed: true, provider: 'byok', isByok: true };
    }

    const quota = await this.getOrCreateQuota(organizationId);

    // Enterprise = unlimited
    if (quota.monthly_limit === UNLIMITED) {
      return { allowed: true, provider: 'zai', isByok: false };
    }

    // Check limit
    if (quota.current_count >= quota.monthly_limit) {
      return {
        allowed: false,
        provider: 'zai',
        isByok: false,
        error: 'AI_QUOTA_EXCEEDED',
        limit: quota.monthly_limit,
        used: quota.current_count,
        resetDate: quota.period_end,
      };
    }

    // Increment count
    const supabase = this.databaseService.getAdminClient();
    await supabase
      .from('ai_quotas')
      .update({
        current_count: quota.current_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quota.id);

    return { allowed: true, provider: 'zai', isByok: false };
  }

  /**
   * Log an AI usage event (fire-and-forget).
   */
  async logUsage(
    organizationId: string,
    userId: string,
    feature: AiFeature,
    provider: string,
    model: string | null,
    tokensUsed: number | null,
    isByok: boolean,
  ): Promise<void> {
    try {
      const supabase = this.databaseService.getAdminClient();
      await supabase.from('ai_usage_log').insert({
        organization_id: organizationId,
        user_id: userId,
        feature,
        provider,
        model,
        tokens_used: tokensUsed,
        is_byok: isByok,
      });
    } catch (error) {
      this.logger.warn(`Failed to log AI usage: ${error.message}`);
      // Fire-and-forget — don't block AI response
    }
  }

  /**
   * Get current quota status for an org.
   */
  async getQuotaStatus(organizationId: string): Promise<QuotaStatus> {
    const quota = await this.getOrCreateQuota(organizationId);
    const isByok = await this.checkByok(organizationId);

    return {
      monthly_limit: quota.monthly_limit,
      current_count: quota.current_count,
      period_start: quota.period_start,
      period_end: quota.period_end,
      is_byok: isByok,
      is_unlimited: quota.monthly_limit === UNLIMITED || isByok,
    };
  }

  /**
   * Get detailed usage log with daily token aggregates for the current period.
   */
  async getUsageLog(organizationId: string): Promise<UsageLogResponse> {
    const quota = await this.getOrCreateQuota(organizationId);
    const supabase = this.databaseService.getAdminClient();

    // Fetch all usage entries for current period [period_start, period_end)
    // period_end is the first instant of the next month (exclusive).
    const { data: entries, error } = await supabase
      .from('ai_usage_log')
      .select('id, created_at, feature, provider, model, tokens_used, is_byok')
      .eq('organization_id', organizationId)
      .gte('created_at', quota.period_start)
      .lt('created_at', quota.period_end)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch usage log: ${error.message}`);
      return {
        daily_aggregates: [],
        recent_entries: [],
        total_tokens: 0,
        total_requests: 0,
        period_start: quota.period_start,
        period_end: quota.period_end,
      };
    }

    const allEntries = entries || [];

    // Aggregate by day
    const dayMap = new Map<string, { total_tokens: number; request_count: number; by_model: Record<string, number> }>();

    let totalTokens = 0;

    for (const entry of allEntries) {
      const date = entry.created_at.substring(0, 10); // YYYY-MM-DD
      const tokens = entry.tokens_used || 0;
      totalTokens += tokens;

      if (!dayMap.has(date)) {
        dayMap.set(date, { total_tokens: 0, request_count: 0, by_model: {} });
      }
      const day = dayMap.get(date)!;
      day.total_tokens += tokens;
      day.request_count += 1;

      const modelKey = entry.model || 'unknown';
      day.by_model[modelKey] = (day.by_model[modelKey] || 0) + tokens;
    }

    // Sort daily aggregates chronologically
    const dailyAggregates: DailyTokenAggregate[] = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        total_tokens: data.total_tokens,
        request_count: data.request_count,
        by_model: data.by_model,
      }));

    return {
      daily_aggregates: dailyAggregates,
      recent_entries: allEntries.slice(0, 30), // Last 30 entries
      total_tokens: totalTokens,
      total_requests: allEntries.length,
      period_start: quota.period_start,
      period_end: quota.period_end,
    };
  }

  /**
   * Get the monthly limit for an org based on subscription.
   */
  private async getOrgLimit(organizationId: string): Promise<number> {
    const supabase = this.databaseService.getAdminClient();

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('formula, agromind_ia_level')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle();

    if (!sub) return AI_LEVEL_LIMITS.basic; // Default to basic

    // Try agromind_ia_level first, then map from formula
    const level = sub.agromind_ia_level
      || FORMULA_TO_LEVEL[sub.formula]
      || 'basic';

    return AI_LEVEL_LIMITS[level] ?? AI_LEVEL_LIMITS.basic;
  }

  /**
   * Check if the org has any BYOK provider enabled.
   */
  private async checkByok(organizationId: string): Promise<boolean> {
    const supabase = this.databaseService.getAdminClient();

    const { data } = await supabase
      .from('organization_ai_settings')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_enabled', true)
      .limit(1);

    return (data?.length ?? 0) > 0;
  }
}
