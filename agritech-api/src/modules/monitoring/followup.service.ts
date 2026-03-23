import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { AIReportsService } from '../ai-reports/ai-reports.service';
import { AgromindReportType } from '../ai-reports/interfaces';

const FOLLOWUP_REPORT_LOOKBACK_DAYS = 730;

interface ExecutedRecommendationRow {
  id: string;
  organization_id: string;
  parcel_id: string;
  status: string;
  action: string | null;
  alert_code: string | null;
  executed_at: string | null;
  evaluation_window_days: number | null;
  evaluation_indicator: string | null;
  expected_response: string | null;
  efficacy: string | null;
}

interface SatelliteIndexRow {
  date: string;
  index_name: string;
  mean_value: number | string | null;
}

interface FollowupSummary {
  processed: number;
  evaluated: number;
  pending: number;
  failed: number;
}

@Injectable()
export class FollowupService {
  private readonly logger = new Logger(FollowupService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => AIReportsService))
    private readonly aiReportsService: AIReportsService,
  ) {}

  @Cron('30 6 * * *', { name: 'monitoring-followup-evaluation', timeZone: 'UTC' })
  async evaluateExecutedRecommendations(): Promise<FollowupSummary> {
    const recommendations = await this.fetchExecutedRecommendations();
    const summary: FollowupSummary = {
      processed: recommendations.length,
      evaluated: 0,
      pending: 0,
      failed: 0,
    };

    for (const recommendation of recommendations) {
      try {
        const result = await this.evaluateOneRecommendation(recommendation);
        if (result === 'evaluated') {
          summary.evaluated += 1;
        } else {
          summary.pending += 1;
        }
      } catch (error) {
        summary.failed += 1;
        this.logger.error(
          `Followup evaluation failed for recommendation ${recommendation.id}: ${this.getErrorMessage(error)}`,
        );
      }
    }

    return summary;
  }

  private async evaluateOneRecommendation(
    recommendation: ExecutedRecommendationRow,
  ): Promise<'evaluated' | 'pending'> {
    const executedAt = recommendation.executed_at ? new Date(recommendation.executed_at) : null;
    if (!executedAt) {
      return 'pending';
    }

    const indicator =
      recommendation.evaluation_indicator ?? this.inferIndicator(recommendation.alert_code, recommendation.action);
    const expectedResponse =
      recommendation.expected_response ?? this.inferExpectedResponse(indicator);
    const evaluationWindowDays =
      recommendation.evaluation_window_days ?? this.inferWindowDays(indicator, recommendation.action);

    const evaluationEnd = new Date(executedAt);
    evaluationEnd.setUTCDate(evaluationEnd.getUTCDate() + evaluationWindowDays);
    if (new Date() < evaluationEnd) {
      await this.persistRecommendationEvaluationMetadata(
        recommendation,
        indicator,
        expectedResponse,
        evaluationWindowDays,
      );
      return 'pending';
    }

    const baseline = await this.fetchIndexValue(
      recommendation.parcel_id,
      recommendation.organization_id,
      indicator,
      null,
      this.toIsoDate(executedAt),
    );

    const followup = await this.fetchIndexValue(
      recommendation.parcel_id,
      recommendation.organization_id,
      indicator,
      this.toIsoDate(executedAt),
      this.toIsoDate(evaluationEnd),
    );

    if (baseline === null || followup === null) {
      await this.persistRecommendationEvaluationMetadata(
        recommendation,
        indicator,
        expectedResponse,
        evaluationWindowDays,
      );
      return 'pending';
    }

    const deltaPct = baseline === 0 ? 0 : ((followup - baseline) / Math.abs(baseline)) * 100;
    const efficacy = this.classifyEfficacy(indicator, deltaPct, baseline, followup);

    const supabase = this.databaseService.getAdminClient();
    const { error } = await supabase
      .from('ai_recommendations')
      .update({
        evaluation_window_days: evaluationWindowDays,
        evaluation_indicator: indicator,
        expected_response: expectedResponse,
        actual_response_pct: this.round(deltaPct),
        efficacy,
      })
      .eq('id', recommendation.id)
      .eq('organization_id', recommendation.organization_id);

    if (error) {
      throw new Error(`Failed to update recommendation evaluation: ${error.message}`);
    }

    setImmediate(() => {
      void this.tryGenerateFollowUpNarrativeReport(
        recommendation.organization_id,
        recommendation.parcel_id,
      );
    });

    return 'evaluated';
  }

  private getLookbackDate(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().split('T')[0];
  }

  private async tryGenerateFollowUpNarrativeReport(
    organizationId: string,
    parcelId: string,
  ): Promise<void> {
    try {
      const { provider, model } = await this.aiReportsService.resolveProvider(organizationId);
      await this.aiReportsService.generateReport(organizationId, 'system', {
        parcel_id: parcelId,
        provider,
        model,
        reportType: AgromindReportType.FOLLOWUP,
        data_start_date: this.getLookbackDate(FOLLOWUP_REPORT_LOOKBACK_DAYS),
        data_end_date: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      this.logger.warn(
        `Follow-up narrative report skipped or failed for parcel ${parcelId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async fetchExecutedRecommendations(): Promise<ExecutedRecommendationRow[]> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('ai_recommendations')
      .select(
        'id, organization_id, parcel_id, status, action, alert_code, executed_at, evaluation_window_days, evaluation_indicator, expected_response, efficacy',
      )
      .eq('status', 'executed')
      .not('executed_at', 'is', null)
      .is('efficacy', null);

    if (error) {
      throw new Error(`Failed to fetch executed recommendations: ${error.message}`);
    }

    return (data ?? []) as ExecutedRecommendationRow[];
  }

  private async fetchIndexValue(
    parcelId: string,
    organizationId: string,
    indexName: string,
    startDateInclusive: string | null,
    endDateInclusive: string,
  ): Promise<number | null> {
    const supabase = this.databaseService.getAdminClient();
    let query = supabase
      .from('satellite_indices_data')
      .select('date, index_name, mean_value')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .eq('index_name', indexName.toUpperCase())
      .lte('date', endDateInclusive)
      .order('date', { ascending: false })
      .limit(10);

    if (startDateInclusive) {
      query = query.gte('date', startDateInclusive);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch satellite index values: ${error.message}`);
    }

    const values = (data ?? []) as SatelliteIndexRow[];
    for (const row of values) {
      const value = this.toNumber(row.mean_value);
      if (value !== null) {
        return value;
      }
    }

    return null;
  }

  private inferIndicator(alertCode: string | null, action: string | null): string {
    const normalizedAlertCode = (alertCode ?? '').toUpperCase();
    const normalizedAction = (action ?? '').toLowerCase();

    if (normalizedAlertCode.includes('OLI-16')) {
      return 'NDRE';
    }

    if (normalizedAlertCode.includes('OLI-01') || normalizedAlertCode.includes('OLI-02')) {
      return 'NDMI';
    }

    if (normalizedAction.includes('irrig')) {
      return 'NDMI';
    }

    if (normalizedAction.includes('fertig') || normalizedAction.includes('azote')) {
      return 'NDRE';
    }

    return 'NIRv';
  }

  private inferExpectedResponse(indicator: string): string {
    const normalizedIndicator = indicator.toUpperCase();
    if (normalizedIndicator === 'NDRE') {
      return 'Increase by 5-15%';
    }

    if (normalizedIndicator === 'NDMI') {
      return 'Recover toward baseline moisture range';
    }

    return 'Positive signal response expected';
  }

  private inferWindowDays(indicator: string, action: string | null): number {
    const normalizedIndicator = indicator.toUpperCase();
    const normalizedAction = (action ?? '').toLowerCase();

    if (normalizedIndicator === 'NDMI' || normalizedAction.includes('irrig')) {
      return 7;
    }

    if (normalizedIndicator === 'NDRE' || normalizedAction.includes('fertig')) {
      return 14;
    }

    return 10;
  }

  private classifyEfficacy(
    indicator: string,
    deltaPct: number,
    baseline: number,
    followup: number,
  ): 'effective' | 'partial' | 'ineffective' {
    const normalizedIndicator = indicator.toUpperCase();

    if (normalizedIndicator === 'NDMI') {
      const baselineDistance = Math.abs(baseline - 0.5);
      const followupDistance = Math.abs(followup - 0.5);

      if (followupDistance < baselineDistance) {
        return 'effective';
      }

      if (followupDistance <= baselineDistance + 0.03) {
        return 'partial';
      }

      return 'ineffective';
    }

    if (normalizedIndicator === 'NDRE') {
      if (deltaPct >= 5 && deltaPct <= 15) {
        return 'effective';
      }

      if (deltaPct > 0) {
        return 'partial';
      }

      return 'ineffective';
    }

    if (deltaPct >= 3) {
      return 'effective';
    }

    if (deltaPct > 0) {
      return 'partial';
    }

    return 'ineffective';
  }

  private async persistRecommendationEvaluationMetadata(
    recommendation: ExecutedRecommendationRow,
    indicator: string,
    expectedResponse: string,
    evaluationWindowDays: number,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const { error } = await supabase
      .from('ai_recommendations')
      .update({
        evaluation_window_days: evaluationWindowDays,
        evaluation_indicator: indicator,
        expected_response: expectedResponse,
      })
      .eq('id', recommendation.id)
      .eq('organization_id', recommendation.organization_id);

    if (error) {
      throw new Error(`Failed to persist evaluation metadata: ${error.message}`);
    }
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private round(value: number, digits = 2): number {
    return Number(value.toFixed(digits));
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
