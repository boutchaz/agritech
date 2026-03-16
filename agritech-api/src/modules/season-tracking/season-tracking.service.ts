import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CalibrationService } from "../calibration/calibration.service";
import { DatabaseService } from "../database/database.service";
import { CloseSeasonDto } from "./dto/close-season.dto";
import { CreateSeasonDto } from "./dto/create-season.dto";

export interface SeasonRecord {
  id: string;
  parcel_id: string;
  organization_id: string;
  saison: string;
  rendement_reel_t_ha: number | null;
  rendement_reel_kg_arbre: number | null;
  qualite_recolte: string | null;
  regularite_percue: string | null;
  bilan_campagne: string | null;
  applications: Record<string, unknown>[] | null;
  evenements: Record<string, unknown>[] | null;
  cloture_at: string | null;
  recalibrage_f3_id: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class SeasonTrackingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly calibrationService: CalibrationService,
  ) {}

  async createSeason(
    userId: string,
    parcelId: string,
    organizationId: string,
    dto: CreateSeasonDto,
  ): Promise<SeasonRecord> {
    if (!userId?.trim()) {
      throw new BadRequestException("User ID is required");
    }

    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("suivis_saison")
      .insert({
        parcel_id: parcelId,
        organization_id: organizationId,
        saison: dto.saison,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new BadRequestException(
        `Failed to create season: ${error?.message ?? "unknown error"}`,
      );
    }

    return data as SeasonRecord;
  }

  async listSeasons(
    parcelId: string,
    organizationId: string,
  ): Promise<SeasonRecord[]> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("suivis_saison")
      .select("*")
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .order("saison", { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to list seasons: ${error.message}`);
    }

    return (data ?? []) as SeasonRecord[];
  }

  async getSeason(
    seasonId: string,
    organizationId: string,
  ): Promise<SeasonRecord> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("suivis_saison")
      .select("*")
      .eq("id", seasonId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch season: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException("Season not found");
    }

    return data as SeasonRecord;
  }

  async closeSeason(
    userId: string,
    seasonId: string,
    parcelId: string,
    organizationId: string,
    dto: CloseSeasonDto,
  ): Promise<SeasonRecord> {
    if (!userId?.trim()) {
      throw new BadRequestException("User ID is required");
    }

    const supabase = this.databaseService.getAdminClient();
    const nowIso = new Date().toISOString();

    const { data: closedSeason, error: closeError } = await supabase
      .from("suivis_saison")
      .update({
        rendement_reel_t_ha: dto.rendement_reel_t_ha,
        rendement_reel_kg_arbre: dto.rendement_reel_kg_arbre,
        qualite_recolte: dto.qualite_recolte,
        regularite_percue: dto.regularite_percue,
        bilan_campagne: dto.bilan_campagne,
        applications: dto.applications,
        evenements: dto.evenements,
        cloture_at: nowIso,
      })
      .eq("id", seasonId)
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .select("*")
      .maybeSingle();

    if (closeError) {
      throw new BadRequestException(
        `Failed to close season: ${closeError.message}`,
      );
    }

    if (!closedSeason) {
      throw new NotFoundException("Season not found");
    }

    const calibration = await this.calibrationService.startCalibration(
      parcelId,
      organizationId,
      { harvest_regularity: dto.regularite_percue },
      { skipReadinessCheck: true },
    );

    const { error: modeError } = await supabase
      .from("calibrations")
      .update({ mode_calibrage: "F3" })
      .eq("id", calibration.id)
      .eq("organization_id", organizationId);

    if (modeError) {
      throw new BadRequestException(
        `Failed to set calibration mode F3: ${modeError.message}`,
      );
    }

    const { data: updatedSeason, error: linkError } = await supabase
      .from("suivis_saison")
      .update({ recalibrage_f3_id: calibration.id })
      .eq("id", seasonId)
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .select("*")
      .single();

    if (linkError || !updatedSeason) {
      throw new BadRequestException(
        `Failed to link F3 recalibration: ${linkError?.message ?? "unknown error"}`,
      );
    }

    return updatedSeason as SeasonRecord;
  }
}
