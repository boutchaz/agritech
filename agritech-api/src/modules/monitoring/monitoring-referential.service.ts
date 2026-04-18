import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { getLocalCropReference } from '../calibration/crop-reference-loader';

export interface MonitoringReferential {
  seuils_satellite?: Record<string, unknown>;
  stades_bbch?: Array<Record<string, unknown>>;
  alertes?: Array<Record<string, unknown>>;
  modele_predictif?: Record<string, unknown>;
  [key: string]: unknown;
}

@Injectable()
export class MonitoringReferentialService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getCropReferential(cropType: string): Promise<MonitoringReferential> {
    const normalizedCropType = cropType.trim().toLowerCase();
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('crop_ai_references')
      .select('reference_data')
      .eq('crop_type', normalizedCropType)
      .maybeSingle();

    if (!error && data?.reference_data && this.isJsonObject(data.reference_data)) {
      return data.reference_data as MonitoringReferential;
    }

    const localReference = getLocalCropReference(normalizedCropType);
    if (localReference && this.isJsonObject(localReference)) {
      return localReference as MonitoringReferential;
    }

    return {};
  }

  getTbase(cropType: string): number {
    const normalizedCropType = cropType.trim().toLowerCase();

    const cropTbaseMap: Record<string, number> = {
      olivier: 10,
      agrumes: 12,
      avocatier: 10,
      palmier_dattier: 12,
    };

    return cropTbaseMap[normalizedCropType] ?? 10;
  }

  private isJsonObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
