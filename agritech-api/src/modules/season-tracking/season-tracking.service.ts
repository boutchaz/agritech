import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnnualRecalibrationService } from "../calibration/annual-recalibration.service";
import { DatabaseService } from "../database/database.service";
import { NotificationType } from "../notifications/dto/notification.dto";
import { NotificationsService } from "../notifications/notifications.service";
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
  recalibrage_annual_id: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class SeasonTrackingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly annualRecalibrationService: AnnualRecalibrationService,
    private readonly notificationsService: NotificationsService,
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

    await this.handleAnnualTriggerAfterHarvestCompletion(
      userId,
      parcelId,
      organizationId,
      7,
    );

    return closedSeason as SeasonRecord;
  }

  async handleAnnualTriggerAfterHarvestCompletion(
    userId: string,
    parcelId: string,
    organizationId: string,
    snoozeDays: number,
  ): Promise<{
    eligible: boolean;
    snoozed_until?: string;
  }> {
    const eligibility = await this.annualRecalibrationService.checkEligibility(
      parcelId,
      organizationId,
    );

    if (!eligibility.eligible) {
      const snoozedUntil = await this.snoozeAnnualReminder(
        parcelId,
        organizationId,
        snoozeDays,
      );
      return {
        eligible: false,
        snoozed_until: snoozedUntil,
      };
    }

    await this.notificationsService.createNotification({
      userId,
      organizationId,
      type: NotificationType.SEASON_REMINDER,
      title: "Recalibrage annuel disponible",
      message:
        "Votre recolte est-elle completement terminee? Si oui, vous pouvez lancer le recalibrage annuel.",
      data: {
        parcel_id: parcelId,
        annual_trigger_reason: eligibility.trigger_reason,
        harvest_date: eligibility.harvest_date,
        days_since_harvest: eligibility.days_since_harvest,
        snooze_available: true,
      },
    });

    return { eligible: true };
  }

  async snoozeAnnualReminder(
    parcelId: string,
    organizationId: string,
    days: number,
  ): Promise<string> {
    const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 7;
    const snoozedUntilDate = new Date();
    snoozedUntilDate.setDate(snoozedUntilDate.getDate() + safeDays);
    const snoozedUntil = snoozedUntilDate.toISOString();

    const supabase = this.databaseService.getAdminClient();
    const { data: parcel, error: parcelError } = await supabase
      .from("parcels")
      .select("annual_trigger_config")
      .eq("id", parcelId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (parcelError) {
      throw new BadRequestException(
        `Failed to load parcel annual trigger config: ${parcelError.message}`,
      );
    }

    const currentConfig =
      parcel &&
      typeof parcel.annual_trigger_config === "object" &&
      parcel.annual_trigger_config !== null &&
      !Array.isArray(parcel.annual_trigger_config)
        ? (parcel.annual_trigger_config as Record<string, unknown>)
        : {};

    const { error: updateError } = await supabase
      .from("parcels")
      .update({
        annual_trigger_config: {
          ...currentConfig,
          snoozed_until: snoozedUntil,
        },
      })
      .eq("id", parcelId)
      .eq("organization_id", organizationId);

    if (updateError) {
      throw new BadRequestException(
        `Failed to snooze annual reminder: ${updateError.message}`,
      );
    }

    return snoozedUntil;
  }
}
