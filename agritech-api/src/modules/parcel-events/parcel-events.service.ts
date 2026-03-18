import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CalibrationService } from "../calibration/calibration.service";
import { DatabaseService } from "../database/database.service";
import { CreateParcelEventDto } from "./dto/create-parcel-event.dto";

type ParcelEventRecord = {
  id: string;
  parcel_id: string;
  organization_id: string;
  type: string;
  date_evenement: string;
  description: string | null;
  donnees: Record<string, unknown>;
  recalibrage_requis: boolean;
  recalibrage_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class ParcelEventsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly calibrationService: CalibrationService,
  ) {}

  async createEvent(
    userId: string,
    parcelId: string,
    organizationId: string,
    dto: CreateParcelEventDto,
  ): Promise<ParcelEventRecord> {
    const supabase = this.databaseService.getAdminClient();
    const { data: createdEvent, error: createError } = await supabase
      .from("evenements_parcelle")
      .insert({
        parcel_id: parcelId,
        organization_id: organizationId,
        type: dto.type,
        date_evenement: dto.date_evenement,
        description: dto.description,
        donnees: dto.donnees,
        recalibrage_requis: dto.recalibrage_requis,
        created_by: userId,
      })
      .select("*")
      .single();

    if (createError || !createdEvent) {
      throw new BadRequestException(
        `Failed to create parcel event: ${createError?.message ?? "unknown error"}`,
      );
    }

    if (!dto.recalibrage_requis) {
      return createdEvent as ParcelEventRecord;
    }

    return this.triggerPartialRecalibration(
      createdEvent.id,
      parcelId,
      organizationId,
    );
  }

  async listEvents(
    parcelId: string,
    organizationId: string,
  ): Promise<ParcelEventRecord[]> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("evenements_parcelle")
      .select("*")
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .order("date_evenement", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new BadRequestException(
        `Failed to list parcel events: ${error.message}`,
      );
    }

    return (data ?? []) as ParcelEventRecord[];
  }

  async getEvent(
    eventId: string,
    organizationId: string,
  ): Promise<ParcelEventRecord> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("evenements_parcelle")
      .select("*")
      .eq("id", eventId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Failed to fetch parcel event: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException("Parcel event not found");
    }

    return data as ParcelEventRecord;
  }

  private async triggerPartialRecalibration(
    eventId: string,
    parcelId: string,
    organizationId: string,
  ): Promise<ParcelEventRecord> {
    const supabase = this.databaseService.getAdminClient();
    const calibration = await this.calibrationService.startCalibration(
      parcelId,
      organizationId,
      {},
      { skipReadinessCheck: true },
    );

    const { error: updateCalibrationError } = await supabase
      .from("calibrations")
      .update({ mode_calibrage: "partial" })
      .eq("id", calibration.id)
      .eq("organization_id", organizationId);

    if (updateCalibrationError) {
      throw new BadRequestException(
        `Failed to set calibration mode to partial: ${updateCalibrationError.message}`,
      );
    }

    const { data: updatedEvent, error: updateEventError } = await supabase
      .from("evenements_parcelle")
      .update({ recalibrage_id: calibration.id })
      .eq("id", eventId)
      .eq("organization_id", organizationId)
      .select("*")
      .single();

    if (updateEventError || !updatedEvent) {
      throw new BadRequestException(
        `Failed to link parcel event to calibration: ${updateEventError?.message ?? "unknown error"}`,
      );
    }

    return updatedEvent as ParcelEventRecord;
  }
}
