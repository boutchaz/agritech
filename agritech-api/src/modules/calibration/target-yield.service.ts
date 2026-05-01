import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { getLocalCropReference } from './crop-reference-loader';

export interface TargetYieldEnvelope {
  hard_min: number;
  hard_max: number;
  binding_upper_bound: 'calibration' | 'varietal_phase';
}

export interface TargetYieldWarnings {
  wide_range: boolean;
  young_no_history: boolean;
  low_confidence: boolean;
}

export interface TargetYieldSuggestion {
  current_target_yield_t_ha: number | null;
  current_source: 'suggested' | 'user_override' | null;
  current_confirmed_at: string | null;
  suggested_t_ha: number;
  suggestion_method: 'history_best3_x_0_95' | 'potential_central_x_coef' | 'fallback';
  envelope: TargetYieldEnvelope;
  history_best3_avg: number | null;
  warnings: TargetYieldWarnings;
  should_auto_show: boolean;
  inputs: {
    yield_potential_min: number;
    yield_potential_max: number;
    phase_age: string | null;
    variety: string | null;
    planting_density: number | null;
    varietal_cap_t_ha: number | null;
    confidence_score: number | null;
  };
}

export interface ConfirmTargetYieldInput {
  target_yield_t_ha: number;
  source: 'suggested' | 'user_override';
}

export interface ConfirmTargetYieldResult {
  target_yield_t_ha: number;
  source: 'suggested' | 'user_override';
  envelope: TargetYieldEnvelope;
  drift_marked: boolean;
  previous_target_yield_t_ha: number | null;
}

interface CalibrationRow {
  id: string;
  parcel_id: string;
  organization_id: string;
  yield_potential_min: number | string | null;
  yield_potential_max: number | string | null;
  phase_age: string | null;
  confidence_score: number | null;
  health_score: number | null;
  target_yield_t_ha: number | string | null;
  target_yield_source: 'suggested' | 'user_override' | null;
  target_yield_confirmed_at: string | null;
}

interface ParcelRow {
  id: string;
  crop_type: string | null;
  variety: string | null;
  area: number | string | null;
  area_unit: string | null;
  planting_density: number | null;
  density_per_hectare: number | null;
}

interface HarvestRow {
  harvest_date: string | null;
  quantity: number | string | null;
  unit: string | null;
}

const HEALTH_COEF_FLOOR = 0.85;
const HEALTH_COEF_CEIL = 1.05;

const PHASE_IDS = [
  'juvenile',
  'entree_production',
  'pleine_production',
  'maturite_avancee',
  'senescence',
];

@Injectable()
export class TargetYieldService {
  private readonly logger = new Logger(TargetYieldService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async getSuggestion(
    parcelId: string,
    calibrationId: string,
    organizationId: string,
  ): Promise<TargetYieldSuggestion> {
    const { calibration, parcel, harvestRecords } = await this.loadContext(
      parcelId,
      calibrationId,
      organizationId,
    );

    const yMin = this.toNumber(calibration.yield_potential_min) ?? 0;
    const yMax = this.toNumber(calibration.yield_potential_max) ?? 0;
    const yCentral = (yMin + yMax) / 2;
    const healthScore = calibration.health_score;
    const confidenceScore = calibration.confidence_score;

    const areaHa = this.toAreaHa(parcel.area, parcel.area_unit);
    const history = this.yearlyYieldTHa(harvestRecords, areaHa);
    const best3 = [...history].sort((a, b) => b - a).slice(0, 3);
    const hasHistory = best3.length >= 3;

    let suggested = 0;
    let method: TargetYieldSuggestion['suggestion_method'] = 'fallback';
    if (hasHistory) {
      const avgBest3 = best3.reduce((sum, v) => sum + v, 0) / best3.length;
      suggested = avgBest3 * 0.95;
      method = 'history_best3_x_0_95';
    } else if (yMin > 0 || yMax > 0) {
      const coef = this.healthCoefficient(healthScore);
      suggested = yCentral * coef;
      method = 'potential_central_x_coef';
    }

    const density = parcel.planting_density ?? parcel.density_per_hectare;
    const varietalCap = this.varietalCapTHa(
      parcel.crop_type,
      parcel.variety,
      calibration.phase_age,
      density,
    );

    const envelope = this.computeEnvelope(yMin, yMax, varietalCap);

    const wideRange = yMin > 0 && yMax > yMin * 2.5;
    const youngNoHistory =
      !hasHistory &&
      !!calibration.phase_age &&
      ['juvenile', 'entree_production'].includes(calibration.phase_age);
    const lowConfidence = (confidenceScore ?? 0) < 50;

    return {
      current_target_yield_t_ha: this.toNumber(calibration.target_yield_t_ha),
      current_source: calibration.target_yield_source,
      current_confirmed_at: calibration.target_yield_confirmed_at,
      suggested_t_ha: this.round(suggested, 2),
      suggestion_method: method,
      envelope,
      history_best3_avg: hasHistory
        ? this.round(best3.reduce((s, v) => s + v, 0) / best3.length, 2)
        : null,
      warnings: {
        wide_range: wideRange,
        young_no_history: youngNoHistory,
        low_confidence: lowConfidence,
      },
      should_auto_show: wideRange || youngNoHistory || lowConfidence,
      inputs: {
        yield_potential_min: yMin,
        yield_potential_max: yMax,
        phase_age: calibration.phase_age,
        variety: parcel.variety,
        planting_density: density,
        varietal_cap_t_ha: varietalCap,
        confidence_score: confidenceScore,
      },
    };
  }

  async confirm(
    parcelId: string,
    calibrationId: string,
    organizationId: string,
    userId: string,
    input: ConfirmTargetYieldInput,
  ): Promise<ConfirmTargetYieldResult> {
    const suggestion = await this.getSuggestion(parcelId, calibrationId, organizationId);
    const value = Number(input.target_yield_t_ha);

    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('target_yield_t_ha must be a positive number');
    }

    const { hard_min, hard_max, binding_upper_bound } = suggestion.envelope;

    if (value < hard_min) {
      throw new BadRequestException(
        `Target yield ${value} t/ha is below the minimum ${hard_min} t/ha (potential_min × 0.7).`,
      );
    }
    if (value > hard_max) {
      const reason =
        binding_upper_bound === 'varietal_phase'
          ? 'varietal × phase × density ceiling from referentiel'
          : 'calibration potential_max × 1.1';
      throw new BadRequestException(
        `Target yield ${value} t/ha exceeds the maximum ${hard_max} t/ha (${reason}).`,
      );
    }

    const previous = suggestion.current_target_yield_t_ha;

    const supabase = this.databaseService.getAdminClient();
    const { error } = await supabase
      .from('calibrations')
      .update({
        target_yield_t_ha: value,
        target_yield_source: input.source,
        target_yield_confirmed_at: new Date().toISOString(),
        target_yield_confirmed_by: userId,
      })
      .eq('id', calibrationId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(
        `Failed to persist target yield: ${error.message}`,
      );
    }

    let driftMarked = false;
    if (previous != null && Math.abs(previous - value) > 1e-6) {
      driftMarked = await this.markPlanDrift(parcelId, organizationId, previous, value);
    }

    return {
      target_yield_t_ha: value,
      source: input.source,
      envelope: suggestion.envelope,
      drift_marked: driftMarked,
      previous_target_yield_t_ha: previous,
    };
  }

  /**
   * Write plan_data.target_yield_drift on the most recent validated/active plan
   * so the frontend can show a yellow banner + regenerate CTA. Draft plans are
   * skipped — they get the new target on next generation anyway.
   */
  private async markPlanDrift(
    parcelId: string,
    organizationId: string,
    previous: number,
    current: number,
  ): Promise<boolean> {
    const supabase = this.databaseService.getAdminClient();

    const { data: plan, error } = await supabase
      .from('annual_plans')
      .select('id, plan_data, status')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .in('status', ['validated', 'active'])
      .order('season', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !plan) {
      return false;
    }

    const planData = (plan.plan_data ?? {}) as Record<string, unknown>;
    planData.target_yield_drift = {
      previous,
      current,
      changed_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('annual_plans')
      .update({ plan_data: planData })
      .eq('id', plan.id)
      .eq('organization_id', organizationId);

    if (updateError) {
      this.logger.warn(
        `Failed to write target_yield_drift on plan ${plan.id}: ${updateError.message}`,
      );
      return false;
    }

    return true;
  }

  private computeEnvelope(
    yMin: number,
    yMax: number,
    varietalCap: number | null,
  ): TargetYieldEnvelope {
    const hardMin = this.round(Math.max(0.1, yMin * 0.7), 2);
    const calibrationCap = yMax > 0 ? yMax * 1.1 : Number.POSITIVE_INFINITY;
    let hardMax = calibrationCap;
    let binding: TargetYieldEnvelope['binding_upper_bound'] = 'calibration';
    if (varietalCap != null && varietalCap < hardMax) {
      hardMax = varietalCap;
      binding = 'varietal_phase';
    }
    if (!Number.isFinite(hardMax)) {
      hardMax = Math.max(hardMin * 5, 20);
    }
    return {
      hard_min: hardMin,
      hard_max: this.round(hardMax, 2),
      binding_upper_bound: binding,
    };
  }

  private varietalCapTHa(
    cropType: string | null,
    variety: string | null,
    phaseAge: string | null,
    density: number | null,
  ): number | null {
    if (!cropType || !variety || !phaseAge || !density || density <= 0) {
      return null;
    }
    if (!PHASE_IDS.includes(phaseAge)) {
      return null;
    }
    const ref = getLocalCropReference(cropType);
    if (!ref || !Array.isArray((ref as Record<string, unknown>).varietes)) {
      return null;
    }

    const varietes = (ref as { varietes: Array<Record<string, unknown>> }).varietes;
    const match = varietes.find((v) => this.varietyMatches(v, variety));
    if (!match) {
      return null;
    }

    const rendementKgArbre = match.rendement_kg_arbre as
      | Record<string, unknown>
      | undefined;
    if (!rendementKgArbre) return null;

    const entry = rendementKgArbre[phaseAge];
    if (!Array.isArray(entry) || entry.length < 2) {
      return null;
    }
    const maxKg = this.toNumber(entry[1]);
    if (maxKg == null || maxKg <= 0) return null;

    return this.round((maxKg * density) / 1000, 2);
  }

  private varietyMatches(
    record: Record<string, unknown>,
    variety: string,
  ): boolean {
    const needle = this.normalize(variety);
    const candidates = [
      record.code,
      record.nom,
      record.name,
      ...(Array.isArray(record.synonymes) ? record.synonymes : []),
      ...(Array.isArray(record.synonyms) ? record.synonyms : []),
    ].filter((v): v is string => typeof v === 'string');

    return candidates.some((c) => this.normalize(c) === needle);
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  private healthCoefficient(healthScore: number | null): number {
    if (healthScore == null) return 0.9;
    const normalized = healthScore / 100;
    const interpolated = HEALTH_COEF_FLOOR + (HEALTH_COEF_CEIL - HEALTH_COEF_FLOOR) * normalized;
    return Math.max(HEALTH_COEF_FLOOR, Math.min(HEALTH_COEF_CEIL, interpolated));
  }

  private yearlyYieldTHa(rows: HarvestRow[], areaHa: number): number[] {
    if (areaHa <= 0) return [];
    const byYear = new Map<number, number>();
    for (const row of rows) {
      if (!row.harvest_date) continue;
      const year = new Date(row.harvest_date).getUTCFullYear();
      if (!Number.isFinite(year)) continue;
      const qty = this.toNumber(row.quantity);
      if (qty == null) continue;
      const unit = (row.unit ?? '').toLowerCase();
      const tons = unit === 'kg' ? qty / 1000 : qty; // default 'tons' or unknown → treat as tons
      byYear.set(year, (byYear.get(year) ?? 0) + tons);
    }
    return Array.from(byYear.values()).map((tons) => tons / areaHa);
  }

  private async loadContext(
    parcelId: string,
    calibrationId: string,
    organizationId: string,
  ) {
    const supabase = this.databaseService.getAdminClient();

    const [calibrationRes, parcelRes, harvestRes] = await Promise.all([
      supabase
        .from('calibrations')
        .select(
          'id, parcel_id, organization_id, yield_potential_min, yield_potential_max, phase_age, confidence_score, health_score, target_yield_t_ha, target_yield_source, target_yield_confirmed_at',
        )
        .eq('id', calibrationId)
        .eq('organization_id', organizationId)
        .maybeSingle(),
      supabase
        .from('parcels')
        .select(
          'id, crop_type, variety, area, area_unit, planting_density, density_per_hectare',
        )
        .eq('id', parcelId)
        .eq('organization_id', organizationId)
        .maybeSingle(),
      supabase
        .from('harvest_records')
        .select('harvest_date, quantity, unit')
        .eq('parcel_id', parcelId)
        .order('harvest_date', { ascending: true }),
    ]);

    if (calibrationRes.error) {
      throw new BadRequestException(
        `Failed to fetch calibration: ${calibrationRes.error.message}`,
      );
    }
    if (!calibrationRes.data) {
      throw new NotFoundException('Calibration not found');
    }
    const calibration = calibrationRes.data as CalibrationRow;
    if (calibration.parcel_id !== parcelId) {
      throw new BadRequestException('Calibration does not belong to parcel');
    }

    if (parcelRes.error || !parcelRes.data) {
      throw new NotFoundException('Parcel not found');
    }

    return {
      calibration,
      parcel: parcelRes.data as ParcelRow,
      harvestRecords: (harvestRes.data ?? []) as HarvestRow[],
    };
  }

  private toNumber(value: unknown): number | null {
    if (value == null) return null;
    const num = typeof value === 'string' ? parseFloat(value) : (value as number);
    return Number.isFinite(num) ? num : null;
  }

  private toAreaHa(area: unknown, unit: string | null): number {
    const value = this.toNumber(area) ?? 0;
    if (!unit) return value;
    const normalized = unit.toLowerCase();
    if (normalized.startsWith('ha') || normalized === 'hectares') return value;
    if (normalized === 'm2' || normalized === 'sqm') return value / 10000;
    if (normalized === 'acres') return value * 0.404686;
    return value;
  }

  private round(value: number, digits: number): number {
    const factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
  }
}
