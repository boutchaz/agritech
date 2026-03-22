import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DeleteParcelDto } from "./dto/delete-parcel.dto";
import { CreateParcelDto } from "./dto/create-parcel.dto";
import { UpdateParcelDto } from "./dto/update-parcel.dto";
import { GetParcelResponseDto } from "./dto/list-parcels.dto";
import { paginatedResponse, type PaginatedResponse } from "../../common/dto/paginated-query.dto";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { CalibrationStateMachine } from "../calibration/calibration-state-machine";
import { SatelliteCacheService } from "../satellite-indices/satellite-cache.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/dto/notification.dto";

@Injectable()
export class ParcelsService {
  private readonly supabaseAdmin: SupabaseClient;
  private readonly logger = new Logger(ParcelsService.name);

  constructor(
    private configService: ConfigService,
    private subscriptionsService: SubscriptionsService,
    private stateMachine: CalibrationStateMachine,
    private satelliteCacheService: SatelliteCacheService,
    private notificationsService: NotificationsService,
  ) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async deleteParcel(userId: string, dto: DeleteParcelDto) {
    const { parcel_id } = dto;

    this.logger.log(`Deleting parcel ${parcel_id} for user ${userId}`);

    // First verify the parcel exists and get farm info
    const { data: existingParcel, error: checkError } = await this.supabaseAdmin
      .from("parcels")
      .select("id, name, farm_id")
      .eq("id", parcel_id)
      .single();

    if (checkError || !existingParcel) {
      this.logger.error("Parcel not found", checkError);
      throw new NotFoundException(
        `Unable to verify parcel: ${checkError?.message || "Parcel not found"}`,
      );
    }

    if (!existingParcel.farm_id) {
      throw new BadRequestException("Parcel is not associated with any farm");
    }

    // Get farm info to find organization_id
    const { data: farm, error: farmError } = await this.supabaseAdmin
      .from("farms")
      .select("organization_id")
      .eq("id", existingParcel.farm_id)
      .single();

    if (farmError || !farm) {
      this.logger.error("Error fetching farm", farmError);
      throw new NotFoundException(
        `Unable to retrieve farm information: ${farmError?.message || "Farm not found"}`,
      );
    }

    const organizationId = farm.organization_id;

    if (!organizationId) {
      throw new BadRequestException(
        "Unable to determine organization of the parcel",
      );
    }

    // Check user's role in the organization
    const { data: orgUser, error: roleError } = await this.supabaseAdmin
      .from("organization_users")
      .select("role_id, roles!inner(name)")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (roleError) {
      this.logger.error("Error checking user role", roleError);
      throw new InternalServerErrorException(
        `Unable to verify your role: ${roleError.message}`,
      );
    }

    if (!orgUser) {
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }

    // Check subscription status using SubscriptionsService
    const hasValidSubscription =
      await this.subscriptionsService.hasValidSubscription(organizationId);

    if (!hasValidSubscription) {
      this.logger.warn(
        `Subscription check failed for organization ${organizationId}`,
      );
      throw new ForbiddenException(
        "An active subscription is required to delete parcels",
      );
    }

    this.logger.log(`Deleting parcel: ${parcel_id}`);

    const shouldCleanupRelatedData = dto.cleanup_related_data !== false;
    const cleanupSummary = shouldCleanupRelatedData
      ? await this.cleanupParcelRelatedData(parcel_id, organizationId)
      : [];

    // Delete the parcel
    const { data: deletedParcels, error: deleteError } =
      await this.supabaseAdmin
        .from("parcels")
        .delete()
        .eq("id", parcel_id)
        .select("id, name");

    if (deleteError) {
      this.logger.error("Delete error", deleteError);
      throw new InternalServerErrorException(
        `Error during deletion: ${deleteError.message}`,
      );
    }

    if (!deletedParcels || deletedParcels.length === 0) {
      this.logger.warn(
        "No parcel deleted - parcel may not exist or was already deleted",
      );

      // Verify if parcel still exists
      const { data: verifyParcel, error: verifyError } =
        await this.supabaseAdmin
          .from("parcels")
          .select("id")
          .eq("id", parcel_id)
          .maybeSingle();

      if (verifyError) {
        this.logger.error("Error verifying parcel", verifyError);
        throw new InternalServerErrorException(
          `Verification error: ${verifyError.message}`,
        );
      }

      if (verifyParcel) {
        throw new InternalServerErrorException(
          "Deletion failed. Parcel may be referenced elsewhere or protected by a constraint.",
        );
      } else {
        this.logger.log("Parcel was already deleted or does not exist");
        return {
          success: true,
          message: "Parcel deleted or already absent",
          cleanup_summary: cleanupSummary,
        };
      }
    }

    const deletedParcel = deletedParcels[0];
    this.logger.log(`Parcel deleted successfully: ${deletedParcel.id}`);

    return {
      success: true,
      deleted_parcel: deletedParcel,
      cleanup_summary: cleanupSummary,
    };
  }

  private async cleanupParcelRelatedData(
    parcelId: string,
    organizationId: string,
  ): Promise<Array<{ table: string; deleted: number }>> {
    const tablesInDeletionOrder: Array<{
      name: string;
      hasOrganizationId: boolean;
    }> = [
      { name: "monitoring_analyses", hasOrganizationId: true },
      { name: "weather_daily", hasOrganizationId: true },
      { name: "weather_forecast", hasOrganizationId: true },
      { name: "yield_forecasts", hasOrganizationId: true },
      { name: "tasks", hasOrganizationId: true },
      { name: "plan_interventions", hasOrganizationId: true },
      { name: "annual_plans", hasOrganizationId: true },
      { name: "ai_recommendations", hasOrganizationId: true },
      { name: "suivis_saison", hasOrganizationId: true },
      { name: "evenements_parcelle", hasOrganizationId: true },
      { name: "performance_alerts", hasOrganizationId: true },
      { name: "product_applications", hasOrganizationId: true },
      { name: "satellite_indices_data", hasOrganizationId: true },
      { name: "harvest_records", hasOrganizationId: true },
      { name: "parcel_events", hasOrganizationId: true },
      { name: "calibrations", hasOrganizationId: true },
    ];

    const summary: Array<{ table: string; deleted: number }> = [];

    for (const table of tablesInDeletionOrder) {
      const deletedCount = await this.deleteRowsForParcel(
        table.name,
        parcelId,
        table.hasOrganizationId ? organizationId : null,
      );

      if (deletedCount !== null) {
        summary.push({ table: table.name, deleted: deletedCount });
      }
    }

    return summary;
  }

  private async deleteRowsForParcel(
    tableName: string,
    parcelId: string,
    organizationId: string | null,
  ): Promise<number | null> {
    let query = this.supabaseAdmin
      .from(tableName)
      .delete({ count: "exact" })
      .eq("parcel_id", parcelId);

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { count, error } = await query;
    if (error) {
      if (error.code === "42P01" || error.code === "42703") {
        this.logger.debug(
          `Skipping cleanup for ${tableName}: ${error.message}`,
        );
        return null;
      }

      this.logger.warn(
        `Cleanup failed for ${tableName} on parcel ${parcelId}: ${error.message}`,
      );
      return null;
    }

    return count ?? 0;
  }

  async getPerformanceSummary(
    userId: string,
    organizationId: string,
    filters: {
      farmId?: string;
      parcelId?: string;
      fromDate?: Date;
      toDate?: Date;
    } = {},
  ) {
    this.logger.log(
      `Getting parcel performance summary for org ${organizationId}`,
    );

    // Verify user access
    const { data: orgUser, error: orgError } = await this.supabaseAdmin
      .from("organization_users")
      .select("role_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }

    // Build query for harvest records joined with parcels and farms
    let query = this.supabaseAdmin
      .from("harvest_records")
      .select(
        `
        parcel_id,
        quantity,
        unit,
        harvest_date,
        estimated_revenue,
        parcels!inner (
          id,
          name,
          area,
          area_unit,
          crop_type,
          farms!inner (
            id,
            name,
            organization_id
          )
        )
      `,
      )
      .eq("parcels.farms.organization_id", organizationId);

    if (filters.farmId) {
      query = query.eq("parcels.farm_id", filters.farmId);
    }
    if (filters.parcelId) {
      query = query.eq("parcel_id", filters.parcelId);
    }
    if (filters.fromDate) {
      query = query.gte("harvest_date", filters.fromDate.toISOString());
    }
    if (filters.toDate) {
      query = query.lte("harvest_date", filters.toDate.toISOString());
    }

    const { data: harvests, error } = await query;

    if (error) {
      this.logger.error("Error fetching harvest records", error);
      throw new InternalServerErrorException(
        "Failed to fetch performance data",
      );
    }

    // Aggregate data
    const summaryMap = new Map<string, any>();

    harvests?.forEach((record: any) => {
      const parcelId = record.parcel_id;
      const parcel = record.parcels;
      const farm = parcel.farms;

      if (!summaryMap.has(parcelId)) {
        summaryMap.set(parcelId, {
          parcel_id: parcelId,
          parcel_name: parcel.name,
          farm_name: farm.name,
          crop_type: parcel.crop_type,
          total_harvests: 0,
          total_yield: 0,
          total_revenue: 0,
          last_harvest_date: null,
          area_hectares:
            parcel.area_unit === "hectares"
              ? parcel.area
              : parcel.area * 0.404686,
        });
      }

      const summary = summaryMap.get(parcelId);
      summary.total_harvests++;
      summary.total_yield += record.quantity || 0;
      summary.total_revenue += record.estimated_revenue || 0;

      const harvestDate = new Date(record.harvest_date);
      if (
        !summary.last_harvest_date ||
        harvestDate > new Date(summary.last_harvest_date)
      ) {
        summary.last_harvest_date = record.harvest_date;
      }
    });

    // Calculate averages and format result
    const result = Array.from(summaryMap.values()).map((s) => {
      const avgYieldPerHectare =
        s.area_hectares > 0 ? s.total_yield / s.area_hectares : 0;
      const avgYieldPerHarvest =
        s.total_harvests > 0 ? s.total_yield / s.total_harvests : 0;

      // Performance rating based on yield productivity per hectare
      // Uses relative thresholds since target yield is not available on harvest_records
      const performanceRating =
        s.total_harvests === 0
          ? "No Data"
          : avgYieldPerHectare > 0
            ? "Active"
            : "No Yield";

      return {
        parcel_id: s.parcel_id,
        parcel_name: s.parcel_name,
        farm_name: s.farm_name,
        crop_type: s.crop_type,
        total_harvests: s.total_harvests,
        avg_yield_per_hectare: parseFloat(avgYieldPerHectare.toFixed(2)),
        avg_yield_per_harvest: parseFloat(avgYieldPerHarvest.toFixed(2)),
        avg_target_yield: 0,
        avg_variance_percent: 0,
        performance_rating: performanceRating,
        total_revenue: parseFloat(s.total_revenue.toFixed(2)),
        total_cost: 0,
        total_profit: 0,
        avg_profit_margin: 0,
        last_harvest_date: s.last_harvest_date,
      };
    });

    return result;
  }

  async listParcels(
    userId: string,
    organizationId: string,
    farmId?: string,
  ): Promise<PaginatedResponse<any>> {
    this.logger.log(
      `Listing parcels for organization ${organizationId}${farmId ? `, farm ${farmId}` : ""}`,
    );

    // Verify user access
    const { data: orgUser, error: orgError } = await this.supabaseAdmin
      .from("organization_users")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (orgError || !orgUser) {
      this.logger.error("User not authorized for organization", orgError);
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }

    // Build query
    let query = this.supabaseAdmin
      .from("parcels")
      .select(
        `
        id,
        farm_id,
        name,
        description,
        area,
        area_unit,
        boundary,
        calculated_area,
        perimeter,
        crop_category,
        crop_type,
        tree_type,
        tree_count,
        planting_density,
        variety,
        planting_system,
        spacing,
        density_per_hectare,
        plant_count,
        planting_date,
        planting_year,
        rootstock,
        soil_type,
        irrigation_type,
        ai_phase,
        is_active,
        created_at,
        updated_at,
        farms!inner (
          id,
          organization_id
        )
      `,
      )
      .eq("farms.organization_id", organizationId);

    if (farmId) {
      query = query.eq("farm_id", farmId);
    }

    query = query.order("name", { ascending: true });

    const { data: parcels, error: parcelsError } = await query;

    if (parcelsError) {
      this.logger.error("Error fetching parcels", parcelsError);
      throw new InternalServerErrorException("Failed to fetch parcels");
    }

    const items = parcels || [];
    return paginatedResponse(items, items.length, 1, items.length || 100);
  }

  async getParcel(
    userId: string,
    organizationId: string,
    parcelId: string,
  ): Promise<GetParcelResponseDto> {
    this.logger.log(
      `Getting parcel ${parcelId} for organization ${organizationId}`,
    );

    const { data: orgUser, error: orgError } = await this.supabaseAdmin
      .from("organization_users")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (orgError || !orgUser) {
      this.logger.error("User not authorized for organization", orgError);
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }

    const { data: parcel, error: parcelError } = await this.supabaseAdmin
      .from("parcels")
      .select(
        `
        id,
        farm_id,
        name,
        description,
        area,
        area_unit,
        boundary,
        calculated_area,
        perimeter,
        crop_category,
        crop_type,
        tree_type,
        tree_count,
        planting_density,
        variety,
        planting_system,
        spacing,
        density_per_hectare,
        plant_count,
        planting_date,
        planting_year,
        rootstock,
        soil_type,
        irrigation_type,
        ai_phase,
        is_active,
        created_at,
        updated_at,
        farms!inner (
          id,
          organization_id
        )
      `,
      )
      .eq("id", parcelId)
      .eq("farms.organization_id", organizationId)
      .maybeSingle();

    if (parcelError) {
      this.logger.error("Error fetching parcel", parcelError);
      throw new InternalServerErrorException("Failed to fetch parcel");
    }

    if (!parcel) {
      throw new NotFoundException(
        "Parcel not found or you do not have access to it",
      );
    }

    return {
      success: true,
      parcel,
    };
  }

  async createParcel(
    userId: string,
    organizationId: string,
    dto: CreateParcelDto,
  ) {
    this.logger.log(
      `Creating parcel for user ${userId} in org ${organizationId}`,
    );

    // Verify user access
    const { data: orgUser, error: orgError } = await this.supabaseAdmin
      .from("organization_users")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }

    const hasValidSubscription =
      await this.subscriptionsService.hasValidSubscription(organizationId);
    if (!hasValidSubscription) {
      throw new ForbiddenException(
        "Active subscription required to create parcels",
      );
    }

    // Enforce subscription parcel limit
    const { data: sub } = await this.supabaseAdmin
      .from("subscriptions")
      .select("max_parcels")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (sub?.max_parcels != null) {
      const { count: parcelCount } = await this.supabaseAdmin
        .from("parcels")
        .select("id, farms!inner(organization_id)", {
          count: "exact",
          head: true,
        })
        .eq("farms.organization_id", organizationId);

      if ((parcelCount ?? 0) >= sub.max_parcels) {
        throw new ForbiddenException(
          `Subscription limit reached: maximum ${sub.max_parcels} parcels for your plan`,
        );
      }
    }

    // Verify farm belongs to organization
    const { data: farm, error: farmError } = await this.supabaseAdmin
      .from("farms")
      .select("id, organization_id")
      .eq("id", dto.farm_id)
      .eq("organization_id", organizationId)
      .single();

    if (farmError || !farm) {
      this.logger.error("Farm not found or access denied", farmError);
      throw new NotFoundException(
        "Farm not found or you do not have access to it",
      );
    }

    let resolvedPlantingYear = dto.planting_year ?? null;
    const resolvedPlantingDate = dto.planting_date ?? null;

    if (!resolvedPlantingYear && resolvedPlantingDate) {
      resolvedPlantingYear = new Date(resolvedPlantingDate).getFullYear();
    }

    if (!resolvedPlantingYear && !resolvedPlantingDate) {
      throw new BadRequestException(
        "Planting year or planting date is required (needed to determine plantation age)",
      );
    }

    const parcelData: Record<string, unknown> = {
      farm_id: dto.farm_id,
      name: dto.name,
      description: dto.description || null,
      area: dto.area,
      area_unit: dto.area_unit || "hectares",
      crop_category: dto.crop_category || null,
      crop_type: dto.crop_type || null,
      variety: dto.variety || null,
      planting_system: dto.planting_system || null,
      spacing: dto.spacing || null,
      density_per_hectare: dto.density_per_hectare || null,
      plant_count: dto.plant_count || null,
      planting_date: resolvedPlantingDate,
      planting_year: resolvedPlantingYear,
      planting_type: dto.planting_type || null,
      rootstock: dto.rootstock || null,
      soil_type: dto.soil_type || null,
      irrigation_type: dto.irrigation_type || null,
      water_source: dto.water_source || null,
      irrigation_frequency: dto.irrigation_frequency || null,
      water_quantity_per_session: dto.water_quantity_per_session || null,
      water_quantity_unit: dto.water_quantity_unit || null,
      boundary: dto.boundary || null,
      calculated_area: dto.calculated_area || null,
      perimeter: dto.perimeter || null,
      ai_phase: "disabled",
      langue: dto.langue || "fr",
      is_active: true,
    };

    // Insert parcel
    const { data: newParcel, error: createError } = await this.supabaseAdmin
      .from("parcels")
      .insert(parcelData)
      .select()
      .single();

    if (createError) {
      this.logger.error("Error creating parcel", createError);
      const isDuplicateParcelName =
        createError.code === "23505" ||
        createError.message?.includes("idx_parcels_name_org_farm") ||
        createError.message?.includes("duplicate key value violates unique constraint");

      if (isDuplicateParcelName) {
        throw new ConflictException(
          `A parcel named "${dto.name}" already exists in this farm`,
        );
      }

      throw new InternalServerErrorException(
        `Failed to create parcel: ${createError.message}`,
      );
    }

    this.logger.log(`Parcel created successfully: ${newParcel.id}`);

    if (
      newParcel.boundary &&
      Array.isArray(newParcel.boundary) &&
      newParcel.boundary.length >= 3
    ) {
      this.triggerProactiveSatelliteDownload(
        newParcel.id,
        organizationId,
        resolvedPlantingYear,
      );
    }

    return newParcel;
  }

  private triggerProactiveSatelliteDownload(
    parcelId: string,
    organizationId: string,
    plantingYear: number | null,
  ) {
    const age = plantingYear ? new Date().getFullYear() - plantingYear : null;
    const isJuvenile = age !== null && age <= 5;
    const monthsToSync = isJuvenile ? 6 : 24;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsToSync);

    this.stateMachine
      .transitionPhase(parcelId, "disabled", "downloading", organizationId)
      .then(() =>
        this.satelliteCacheService.syncParcelSatelliteData(
          parcelId,
          organizationId,
          undefined,
          {
            startDate: startDate.toISOString().split("T")[0],
            endDate: new Date().toISOString().split("T")[0],
            indices: ["NDVI", "NDRE", "NDMI", "EVI", "NIRv"],
          },
        ),
      )
      .then((syncResult) => {
        this.logger.log(
          `Satellite download completed for parcel ${parcelId}: ${syncResult.totalPoints} points`,
        );
        return this.stateMachine.transitionPhase(
          parcelId,
          "downloading",
          "pret_calibrage",
          organizationId,
        );
      })
      .then(() => {
        this.logger.log(
          `Parcel ${parcelId} is now pret_calibrage — satellite cache ready; calibration must be launched explicitly (readiness enforced)`,
        );
        return this.notifyOrganizationUsers(
          organizationId,
          NotificationType.SATELLITE_DOWNLOAD_COMPLETE,
          "Données satellite prêtes",
          "Les données satellite de votre parcelle sont en cache. Complétez l’assistant de calibrage et lancez le calibrage lorsque les conditions de préparation sont remplies.",
          { parcel_id: parcelId },
        );
      })
      .catch(async (err) => {
        const message = err instanceof Error ? err.message : "unknown error";
        this.logger.warn(
          `Satellite download or pret_calibrage transition failed for parcel ${parcelId}: ${message}`,
        );
        for (const phase of ["pret_calibrage", "downloading"] as const) {
          try {
            await this.stateMachine.transitionPhase(
              parcelId,
              phase,
              "disabled",
              organizationId,
            );
            break;
          } catch {
            /* phase mismatch — try next */
          }
        }
      });
  }

  private async notifyOrganizationUsers(
    organizationId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const { data: orgUsers } = await this.supabaseAdmin
      .from("organization_users")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (!orgUsers?.length) return;

    for (const orgUser of orgUsers) {
      await this.notificationsService
        .createNotification({
          userId: orgUser.user_id as string,
          organizationId,
          type,
          title,
          message,
          data,
        })
        .catch(() => {});
    }
  }

  async updateParcel(
    userId: string,
    organizationId: string,
    parcelId: string,
    dto: UpdateParcelDto,
  ) {
    this.logger.log(`Updating parcel ${parcelId} for user ${userId}`);

    // Verify user access
    const { data: orgUser, error: orgError } = await this.supabaseAdmin
      .from("organization_users")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }

    // Verify parcel exists and belongs to organization
    const { data: existingParcel, error: checkError } = await this.supabaseAdmin
      .from("parcels")
      .select(
        `
        id,
        farm_id,
        farms!inner (
          id,
          organization_id
        )
      `,
      )
      .eq("id", parcelId)
      .eq("farms.organization_id", organizationId)
      .single();

    if (checkError || !existingParcel) {
      this.logger.error("Parcel not found or access denied", checkError);
      throw new NotFoundException(
        "Parcel not found or you do not have access to it",
      );
    }

    // Prepare update data (only include fields that are provided)
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.area !== undefined) updateData.area = dto.area;
    if (dto.area_unit !== undefined) updateData.area_unit = dto.area_unit;
    if (dto.crop_category !== undefined)
      updateData.crop_category = dto.crop_category;
    if (dto.crop_type !== undefined) updateData.crop_type = dto.crop_type;
    if (dto.variety !== undefined) updateData.variety = dto.variety;
    if (dto.planting_system !== undefined)
      updateData.planting_system = dto.planting_system;
    if (dto.spacing !== undefined) updateData.spacing = dto.spacing;
    if (dto.density_per_hectare !== undefined)
      updateData.density_per_hectare = dto.density_per_hectare;
    if (dto.plant_count !== undefined) updateData.plant_count = dto.plant_count;
    if (dto.planting_date !== undefined)
      updateData.planting_date = dto.planting_date;
    if (dto.planting_year !== undefined)
      updateData.planting_year = dto.planting_year;
    if (dto.planting_type !== undefined)
      updateData.planting_type = dto.planting_type;
    if (dto.rootstock !== undefined) updateData.rootstock = dto.rootstock;
    if (dto.soil_type !== undefined) updateData.soil_type = dto.soil_type;
    if (dto.irrigation_type !== undefined)
      updateData.irrigation_type = dto.irrigation_type;
    if (dto.water_source !== undefined)
      updateData.water_source = dto.water_source;
    if (dto.irrigation_frequency !== undefined)
      updateData.irrigation_frequency = dto.irrigation_frequency;
    if (dto.water_quantity_per_session !== undefined)
      updateData.water_quantity_per_session = dto.water_quantity_per_session;
    if (dto.water_quantity_unit !== undefined)
      updateData.water_quantity_unit = dto.water_quantity_unit;
    if (dto.boundary !== undefined) updateData.boundary = dto.boundary;
    if (dto.calculated_area !== undefined)
      updateData.calculated_area = dto.calculated_area;
    if (dto.perimeter !== undefined) updateData.perimeter = dto.perimeter;
    if (dto.langue !== undefined) updateData.langue = dto.langue;

    // Update parcel
    const { data: updatedParcel, error: updateError } = await this.supabaseAdmin
      .from("parcels")
      .update(updateData)
      .eq("id", parcelId)
      .select()
      .single();

    if (updateError) {
      this.logger.error("Error updating parcel", updateError);
      throw new InternalServerErrorException(
        `Failed to update parcel: ${updateError.message}`,
      );
    }

    this.logger.log(`Parcel updated successfully: ${updatedParcel.id}`);
    return updatedParcel;
  }

  async getParcelApplications(
    userId: string,
    organizationId: string,
    parcelId: string,
  ) {
    this.logger.log(
      `Getting applications for parcel ${parcelId} in org ${organizationId}`,
    );

    // Verify user access
    const { data: orgUser, error: orgError } = await this.supabaseAdmin
      .from("organization_users")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (orgError || !orgUser) {
      this.logger.error("User not authorized for organization", orgError);
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }

    // Verify parcel exists and belongs to organization
    const { data: parcel, error: parcelError } = await this.supabaseAdmin
      .from("parcels")
      .select(
        `
        id,
        farms!inner (
          id,
          organization_id
        )
      `,
      )
      .eq("id", parcelId)
      .eq("farms.organization_id", organizationId)
      .maybeSingle();

    if (parcelError || !parcel) {
      this.logger.error("Parcel not found or access denied", parcelError);
      throw new NotFoundException(
        "Parcel not found or you do not have access to it",
      );
    }

    // Get applications for this parcel
    const { data: applications, error: appsError } = await this.supabaseAdmin
      .from("product_applications")
      .select(
        `
        id,
        product_id,
        application_date,
        quantity_used,
        area_treated,
        notes,
        cost,
        currency,
        created_at,
        items!inner (
          item_name,
          default_unit
        )
      `,
      )
      .eq("parcel_id", parcelId)
      .order("application_date", { ascending: false });

    if (appsError) {
      this.logger.error("Error fetching parcel applications", appsError);
      throw new InternalServerErrorException(
        "Failed to fetch parcel applications",
      );
    }

    // Transform the response to match the expected DTO structure
    // items (item_name, default_unit) -> inventory (name, unit)
    const transformedApplications = (applications || []).map((app: any) => ({
      ...app,
      inventory: {
        name: app.items.item_name,
        unit: app.items.default_unit,
      },
      // Remove the items property as it's transformed to inventory
      items: undefined,
    }));

    return {
      success: true,
      parcel_id: parcelId,
      applications: transformedApplications,
      total: transformedApplications.length,
    };
  }
}
