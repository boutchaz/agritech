import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { DatabaseService } from "../database/database.service";
import { SatelliteCacheService } from "./satellite-cache.service";

@Injectable()
export class MonitoringCronService {
  private readonly logger = new Logger(MonitoringCronService.name);
  private running = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly satelliteCache: SatelliteCacheService,
  ) {}

  @Cron("0 4 */5 * *", { name: "satellite-monitoring-5day", timeZone: "UTC" })
  async runMonitoringCycle() {
    if (this.running) {
      this.logger.warn("Monitoring cycle already running, skipping");
      return;
    }

    this.running = true;
    this.logger.log("[Cron] Starting 5-day satellite monitoring cycle");

    try {
      const supabase = this.db.getAdminClient();
      const { data: parcels, error } = await supabase
        .from("parcels")
        .select("id, organization_id, farm_id, crop_type, ai_phase, planting_year")
        .in("ai_phase", [
          "active",
          "pret_calibrage",
          "awaiting_validation",
          "awaiting_nutrition_option",
        ])
        .not("boundary", "is", null);

      if (error || !parcels) {
        this.logger.error(`Failed to fetch active parcels: ${error?.message}`);
        return;
      }

      this.logger.log(`Found ${parcels.length} active parcels to sync`);

      const endDate = new Date().toISOString().split("T")[0];

      for (const parcel of parcels) {
        try {
          const startDateStr = await this.satelliteCache.getParcelSyncStartDate(
            parcel.id,
            parcel.organization_id,
            parcel.planting_year ?? null,
          );

          this.logger.log(
            `[Monitoring] Delta sync for parcel ${parcel.id}: ${startDateStr} → ${endDate}`,
          );

          const syncResult = await this.satelliteCache.syncParcelSatelliteData(
            parcel.id,
            parcel.organization_id,
            parcel.farm_id ?? undefined,
            {
              startDate: startDateStr,
              endDate,
              indices: ["NDVI", "NDRE", "NDMI", "EVI", "NIRv"],
            },
          );

          this.logger.log(
            `Synced parcel ${parcel.id}: ${syncResult.totalPoints} new points`,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to sync parcel ${parcel.id}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }

      this.logger.log("[Cron] 5-day monitoring cycle completed");
    } finally {
      this.running = false;
    }
  }
}
