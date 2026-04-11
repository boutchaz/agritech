import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class CalibrationDraftService {
  private readonly logger = new Logger(CalibrationDraftService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async getDraft(
    parcelId: string,
    organizationId: string,
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('calibration_wizard_drafts')
      .select('id, parcel_id, current_step, form_data, updated_at')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to get wizard draft: ${error.message}`);
      throw new BadRequestException(`Failed to get wizard draft: ${error.message}`);
    }

    return data;
  }

  async saveDraft(
    parcelId: string,
    organizationId: string,
    userId: string,
    dto: { current_step: number; form_data: Record<string, unknown> },
  ) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('calibration_wizard_drafts')
      .upsert(
        {
          parcel_id: parcelId,
          organization_id: organizationId,
          user_id: userId,
          current_step: dto.current_step,
          form_data: dto.form_data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'parcel_id,organization_id,user_id' },
      )
      .select('id, parcel_id, current_step, form_data, updated_at')
      .single();

    if (error) {
      this.logger.error(`Failed to save wizard draft: ${error.message}`);
      throw new BadRequestException(`Failed to save wizard draft: ${error.message}`);
    }

    return data;
  }

  async deleteDraft(
    parcelId: string,
    organizationId: string,
    userId: string,
  ) {
    await this.ensureParcelInOrganization(parcelId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { error } = await client
      .from('calibration_wizard_drafts')
      .delete()
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to delete wizard draft: ${error.message}`);
      throw new BadRequestException(`Failed to delete wizard draft: ${error.message}`);
    }

    return { success: true };
  }

  /**
   * Parcel must exist and belong to the org (same rules as calibration flows),
   * without requiring crop_type — wizard drafts may exist before the parcel is complete.
   */
  private async ensureParcelInOrganization(
    parcelId: string,
    organizationId: string,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const { data: parcel, error } = await supabase
      .from("parcels")
      .select("id, organization_id, farms(organization_id)")
      .eq("id", parcelId)
      .single();

    if (error || !parcel) {
      throw new NotFoundException("Parcel not found");
    }

    const matchesOrg = (candidate: string | null): boolean =>
      typeof candidate === "string" &&
      candidate.trim().toLowerCase() === organizationId.trim().toLowerCase();

    let farmOrgId: string | null = null;
    const farms = parcel.farms;
    if (Array.isArray(farms)) {
      const first = farms[0];
      if (first && typeof first === "object" && typeof (first as any).organization_id === "string") {
        farmOrgId = (first as any).organization_id;
      }
    } else if (farms && typeof farms === "object" && typeof (farms as any).organization_id === "string") {
      farmOrgId = (farms as any).organization_id;
    }

    if (!matchesOrg(parcel.organization_id) && !matchesOrg(farmOrgId)) {
      this.logger.warn(
        `[ensureParcelInOrganization] Org mismatch — parcel.org: ${parcel.organization_id}, received: ${organizationId}`,
      );
      throw new NotFoundException("Parcel not found");
    }
  }
}
