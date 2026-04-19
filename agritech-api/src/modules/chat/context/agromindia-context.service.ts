import { Injectable, Logger } from '@nestjs/common';
import { AiDiagnosticsService, AiDiagnosticsResponse } from '../../ai-diagnostics/ai-diagnostics.service';
import { AiRecommendationsService, AiRecommendationRecord } from '../../ai-recommendations/ai-recommendations.service';
import { AnnualPlanService, AnnualPlanWithInterventions, PlanInterventionRecord } from '../../annual-plan/annual-plan.service';
import { AiReferencesService } from '../../ai-references/ai-references.service';
import { CalibrationService } from '../../calibration/calibration.service';
import { DatabaseService } from '../../database/database.service';

export interface AgromindiaParcelContext {
  parcel_id: string;
  parcel_name: string;
  crop_type: string;

  diagnostics: {
    scenario_code: string;
    scenario: string;
    confidence: number;
    indicators: {
      ndvi_band: string;
      ndvi_trend: string;
      ndre_status: string;
      ndmi_trend: string;
      water_balance: number | null;
      weather_anomaly: boolean;
    };
  } | null;

  recommendations: Array<{
    id: string;
    status: string;
    priority: string;
    constat: string | null;
    diagnostic: string | null;
    action: string | null;
    valid_from: string | null;
    valid_until: string | null;
  }>;

  annual_plan: {
    status: string;
    upcoming_interventions: Array<{
      month: number;
      week: number | null;
      intervention_type: string;
      description: string;
      product: string | null;
      dose: string | null;
      status: string;
    }>;
    overdue_interventions: Array<{
      month: number;
      week: number | null;
      intervention_type: string;
      description: string;
      product: string | null;
      dose: string | null;
      status: string;
    }>;
    plan_summary: {
      total: number;
      executed: number;
      planned: number;
      skipped: number;
    };
  } | null;

  referential: {
    npk_formulas: any[];
    known_alerts: any[];
    bbch_stages: any;
  } | null;

  calibration: {
    status: string;
    confidence_score: number;
    zone_classification: string | null;
    baseline_ndvi: number | null;
    baseline_ndre: number | null;
    baseline_ndmi: number | null;
  } | null;
}

@Injectable()
export class AgromindiaContextService {
  private readonly logger = new Logger(AgromindiaContextService.name);

  constructor(
    private readonly diagnosticsService: AiDiagnosticsService,
    private readonly recommendationsService: AiRecommendationsService,
    private readonly annualPlanService: AnnualPlanService,
    private readonly referencesService: AiReferencesService,
    private readonly calibrationService: CalibrationService,
    private readonly databaseService: DatabaseService,
  ) {}

  async getParcelIntelligence(
    parcelId: string,
    organizationId: string,
    cropType?: string,
  ): Promise<AgromindiaParcelContext> {
    const [diagnostics, recommendations, plan, calibration, referential] = await Promise.all([
      this.fetchDiagnostics(parcelId, organizationId),
      this.fetchRecommendations(parcelId, organizationId),
      this.fetchAnnualPlan(parcelId, organizationId),
      this.fetchCalibration(parcelId, organizationId),
      cropType ? this.fetchReferential(cropType) : Promise.resolve(null),
    ]);

    return {
      parcel_id: parcelId,
      parcel_name: '', // Will be set by caller
      crop_type: cropType || '',
      diagnostics,
      recommendations,
      annual_plan: plan,
      calibration,
      referential,
    };
  }

  async getOrgIntelligence(organizationId: string): Promise<AgromindiaParcelContext[]> {
    const client = this.databaseService.getAdminClient();

    // Fetch top 3 most recent parcels
    const { data: parcels, error } = await client
      .from('parcels')
      .select('id, name, crop_type')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error || !parcels || parcels.length === 0) {
      this.logger.warn(`No parcels found for org ${organizationId}`);
      return [];
    }

    // Fetch intelligence for each parcel in parallel
    const results = await Promise.all(
      parcels.map(async (parcel: any) => {
        const intel = await this.getParcelIntelligence(
          parcel.id,
          organizationId,
          parcel.crop_type,
        );
        intel.parcel_name = parcel.name;
        intel.crop_type = parcel.crop_type || '';
        return intel;
      }),
    );

    return results;
  }

  private async fetchDiagnostics(
    parcelId: string,
    organizationId: string,
  ): Promise<AgromindiaParcelContext['diagnostics']> {
    try {
      const result = await this.diagnosticsService.getDiagnostics(parcelId, organizationId);
      return {
        scenario_code: result.scenario_code,
        scenario: result.scenario,
        confidence: result.confidence,
        indicators: {
          ndvi_band: result.indicators.ndvi_band,
          ndvi_trend: result.indicators.ndvi_trend,
          ndre_status: result.indicators.ndre_status,
          ndmi_trend: result.indicators.ndmi_trend,
          water_balance: result.indicators.water_balance,
          weather_anomaly: result.indicators.weather_anomaly,
        },
      };
    } catch (error) {
      this.logger.debug(`No diagnostics for parcel ${parcelId}: ${error.message}`);
      return null;
    }
  }

  private async fetchRecommendations(
    parcelId: string,
    organizationId: string,
  ): Promise<AgromindiaParcelContext['recommendations']> {
    try {
      const recs = await this.recommendationsService.getRecommendations(parcelId, organizationId);
      // Chat: only user-validated Agromind recommendations — not pending AI drafts.
      return recs
        .filter((r: AiRecommendationRecord) => r.status === 'validated')
        .map((r: AiRecommendationRecord) => ({
          id: r.id,
          status: r.status,
          priority: r.priority || 'medium',
          constat: r.constat,
          diagnostic: r.diagnostic,
          action: r.action,
          valid_from: r.valid_from,
          valid_until: r.valid_until,
        }));
    } catch (error) {
      this.logger.debug(`No recommendations for parcel ${parcelId}: ${error.message}`);
      return [];
    }
  }

  private async fetchAnnualPlan(
    parcelId: string,
    organizationId: string,
  ): Promise<AgromindiaParcelContext['annual_plan']> {
    try {
      const plan = await this.annualPlanService.getValidatedPlanOrNull(
        parcelId,
        organizationId,
      );
      if (!plan) return null;

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentWeek = Math.ceil(now.getDate() / 7);

      const interventions = plan.interventions || [];

      const upcoming = interventions.filter((i: PlanInterventionRecord) =>
        i.status === 'planned' && (i.month > currentMonth || (i.month === currentMonth && (i.week === null || i.week >= currentWeek))),
      );

      const overdue = interventions.filter((i: PlanInterventionRecord) =>
        i.status === 'planned' && (i.month < currentMonth || (i.month === currentMonth && i.week !== null && i.week < currentWeek)),
      );

      const mapIntervention = (i: PlanInterventionRecord) => ({
        month: i.month,
        week: i.week,
        intervention_type: i.intervention_type,
        description: i.description,
        product: i.product,
        dose: i.dose,
        status: i.status,
      });

      return {
        status: plan.status,
        upcoming_interventions: upcoming.slice(0, 5).map(mapIntervention),
        overdue_interventions: overdue.map(mapIntervention),
        plan_summary: {
          total: interventions.length,
          executed: interventions.filter((i: PlanInterventionRecord) => i.status === 'executed').length,
          planned: interventions.filter((i: PlanInterventionRecord) => i.status === 'planned').length,
          skipped: interventions.filter((i: PlanInterventionRecord) => i.status === 'skipped').length,
        },
      };
    } catch (error) {
      this.logger.debug(`No annual plan for parcel ${parcelId}: ${error.message}`);
      return null;
    }
  }

  private async fetchCalibration(
    parcelId: string,
    organizationId: string,
  ): Promise<AgromindiaParcelContext['calibration']> {
    try {
      const cal = await this.calibrationService.getLatestCalibration(parcelId, organizationId);
      if (!cal) return null;

      return {
        status: cal.status,
        confidence_score: (cal as any).confidence_score || 0,
        zone_classification: (cal as any).zone_classification || null,
        baseline_ndvi: (cal as any).p50_ndvi ?? null,
        baseline_ndre: (cal as any).p50_ndre ?? null,
        baseline_ndmi: (cal as any).p50_ndmi ?? null,
      };
    } catch (error) {
      this.logger.debug(`No calibration for parcel ${parcelId}: ${error.message}`);
      return null;
    }
  }

  private async fetchReferential(
    cropType: string,
  ): Promise<AgromindiaParcelContext['referential']> {
    try {
      const [npkFormulas, alerts, bbchStages] = await Promise.all([
        this.referencesService.findNpkFormulas(cropType).catch(() => []),
        this.referencesService.findAlerts(cropType).catch(() => []),
        this.referencesService.findBbchStages(cropType).catch(() => null),
      ]);

      return {
        npk_formulas: Array.isArray(npkFormulas) ? npkFormulas : [],
        known_alerts: Array.isArray(alerts) ? alerts : [],
        bbch_stages: bbchStages,
      };
    } catch (error) {
      this.logger.debug(`No referential for crop ${cropType}: ${error.message}`);
      return null;
    }
  }
}
