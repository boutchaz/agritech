import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { getMoteurConfig } from './crop-reference-loader';

type NutritionOption = 'A' | 'B' | 'C';

interface ParcelRow {
  id: string;
  crop_type: string | null;
  organization_id: string | null;
  farms?: unknown;
}

interface AnalysisRow {
  analysis_type: string;
  analysis_date: string;
  data: unknown;
}

interface OptionEligibility {
  option: NutritionOption;
  eligible: boolean;
  reason: string;
}

export interface NutritionOptionSuggestion {
  suggested_option: NutritionOption;
  rationale: Record<string, unknown>;
  alternatives: OptionEligibility[];
}

@Injectable()
export class NutritionOptionService {
  constructor(private readonly databaseService: DatabaseService) {}

  async suggestNutritionOption(
    parcelId: string,
    organizationId: string,
  ): Promise<NutritionOptionSuggestion> {
    const parcel = await this.fetchParcel(parcelId, organizationId);
    const analyses = await this.fetchAnalyses(parcelId);

    const latestSoil = this.pickLatestByType(analyses, 'soil');
    const latestWater = this.pickLatestByType(analyses, 'water');

    const waterEc = this.extractEc(latestWater?.data);
    const soilEc = this.extractEc(latestSoil?.data);
    const cropType = parcel.crop_type ?? 'olivier';

    const waterThreshold = this.getWaterSalinityThreshold(cropType);
    const soilThreshold = this.getSoilSalinityThreshold(cropType);

    const waterSaline = waterEc !== null && waterEc > waterThreshold;
    const soilSaline = soilEc !== null && soilEc > soilThreshold;

    const now = new Date();
    const soilAgeDays = latestSoil ? this.daysBetween(latestSoil.analysis_date, now) : null;
    const hasRecentSoil = soilAgeDays !== null && soilAgeDays <= 730;
    const hasStaleOrMissingSoil = soilAgeDays === null || soilAgeDays > 1095;
    const hasWater = latestWater !== null;

    let suggestedOption: NutritionOption = 'B';
    let trigger = 'fallback_to_B';
    if (waterSaline || soilSaline) {
      suggestedOption = 'C';
      trigger = 'salinity_detected';
    } else if (hasRecentSoil && hasWater) {
      suggestedOption = 'A';
      trigger = 'recent_soil_and_water_available';
    } else if (hasStaleOrMissingSoil) {
      suggestedOption = 'B';
      trigger = 'soil_missing_or_outdated';
    }

    const alternatives: OptionEligibility[] = [
      {
        option: 'A',
        eligible: hasRecentSoil && hasWater && !waterSaline && !soilSaline,
        reason: hasRecentSoil && hasWater
          ? 'requires non-saline context'
          : 'requires recent soil + water analyses',
      },
      {
        option: 'B',
        eligible: !waterSaline && !soilSaline,
        reason: 'default option when full Option A prerequisites are not met',
      },
      {
        option: 'C',
        eligible: waterSaline || soilSaline,
        reason: 'recommended when salinity exceeds thresholds',
      },
    ];

    return {
      suggested_option: suggestedOption,
      rationale: {
        crop_type: cropType,
        trigger,
        water_ec: waterEc,
        soil_ec: soilEc,
        water_threshold: waterThreshold,
        soil_threshold: soilThreshold,
        has_recent_soil: hasRecentSoil,
        has_water_analysis: hasWater,
      },
      alternatives,
    };
  }

  private async fetchParcel(parcelId: string, organizationId: string): Promise<ParcelRow> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('parcels')
      .select('id, crop_type, organization_id, farms(organization_id)')
      .eq('id', parcelId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Parcel not found');
    }

    const parcel = data as ParcelRow;
    const farmOrg = this.extractFarmOrganizationId(parcel.farms);
    const allowed =
      this.matchesOrg(parcel.organization_id, organizationId) ||
      this.matchesOrg(farmOrg, organizationId);

    if (!allowed) {
      throw new NotFoundException('Parcel not found');
    }

    return parcel;
  }

  private async fetchAnalyses(parcelId: string): Promise<AnalysisRow[]> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('analyses')
      .select('analysis_type, analysis_date, data')
      .eq('parcel_id', parcelId)
      .in('analysis_type', ['soil', 'water'])
      .order('analysis_date', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch analyses: ${error.message}`);
    }

    return (data ?? []) as AnalysisRow[];
  }

  private pickLatestByType(rows: AnalysisRow[], analysisType: string): AnalysisRow | null {
    return rows.find((row) => row.analysis_type === analysisType) ?? null;
  }

  private extractEc(data: unknown): number | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null;
    }

    const source = data as Record<string, unknown>;
    const directKeys = ['ec_ds_per_m', 'salinity_level', 'ec'];
    for (const key of directKeys) {
      const value = this.toNumber(source[key]);
      if (value !== null) {
        return value;
      }
    }

    const nested = source.results;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      for (const key of directKeys) {
        const value = this.toNumber((nested as Record<string, unknown>)[key]);
        if (value !== null) {
          return value;
        }
      }
    }

    return null;
  }

  private getWaterSalinityThreshold(cropType: string): number {
    // Try MOTEUR_CONFIG thresholds first
    const config = getMoteurConfig();
    const cultureCfg = (config?.cultures as Record<string, any>)?.[cropType];
    const fromConfig = cultureCfg?.specificites?.salinite_seuil_option_C_CE_eau;
    if (typeof fromConfig === 'number') return fromConfig;

    // Fallback hardcoded
    if (cropType === 'olivier') return 2.5;
    if (cropType === 'palmier_dattier') return 6.0;
    return 1.5;
  }

  private getSoilSalinityThreshold(cropType: string): number {
    // Try MOTEUR_CONFIG thresholds first
    const config = getMoteurConfig();
    const cultureCfg = (config?.cultures as Record<string, any>)?.[cropType];
    const fromConfig = cultureCfg?.specificites?.salinite_seuil_option_C_CE_sol;
    if (typeof fromConfig === 'number') return fromConfig;

    // Fallback hardcoded
    if (cropType === 'olivier') return 3.0;
    if (cropType === 'palmier_dattier') return 8.0;
    return 2.0;
  }

  private daysBetween(isoDate: string, now: Date): number {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
      return Number.MAX_SAFE_INTEGER;
    }
    return Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));
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

  private extractFarmOrganizationId(farms: unknown): string | null {
    if (Array.isArray(farms)) {
      const firstFarm = farms[0];
      if (
        firstFarm &&
        typeof firstFarm === 'object' &&
        !Array.isArray(firstFarm) &&
        typeof (firstFarm as Record<string, unknown>).organization_id === 'string'
      ) {
        return (firstFarm as Record<string, unknown>).organization_id as string;
      }
      return null;
    }

    if (
      farms &&
      typeof farms === 'object' &&
      !Array.isArray(farms) &&
      typeof (farms as Record<string, unknown>).organization_id === 'string'
    ) {
      return (farms as Record<string, unknown>).organization_id as string;
    }

    return null;
  }

  private matchesOrg(candidate: string | null, target: string): boolean {
    return (
      typeof candidate === 'string' &&
      candidate.trim().toLowerCase() === target.trim().toLowerCase()
    );
  }
}
