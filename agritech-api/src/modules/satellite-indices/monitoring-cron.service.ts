import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { DatabaseService } from "../database/database.service";
import { CORE_INDICES, SatelliteCacheService } from "./satellite-cache.service";
import {
  MANAGEMENT_ROLES,
  NotificationsService,
} from "../notifications/notifications.service";

interface OrgCalibrationCronSummary {
  synced: number;
  failed: number;
  totalPoints: number;
  failedParcelIds: string[];
}

@Injectable()
export class MonitoringCronService {
  private readonly logger = new Logger(MonitoringCronService.name);
  private running = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly satelliteCache: SatelliteCacheService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
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
          "ready_calibration",
          "calibrated",
          "awaiting_nutrition_option",
        ])
        .not("boundary", "is", null);

      if (error || !parcels) {
        this.logger.error(`Failed to fetch active parcels: ${error?.message}`);
        return;
      }

      this.logger.log(`Found ${parcels.length} active parcels to sync`);

      const endDate = new Date().toISOString().split("T")[0];
      const summaryByOrg = new Map<string, OrgCalibrationCronSummary>();

      for (const parcel of parcels) {
        const orgId = parcel.organization_id as string;
        if (!summaryByOrg.has(orgId)) {
          summaryByOrg.set(orgId, {
            synced: 0,
            failed: 0,
            totalPoints: 0,
            failedParcelIds: [],
          });
        }
        const orgSummary = summaryByOrg.get(orgId)!;

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
              indices: CORE_INDICES,
            },
          );

          orgSummary.synced += 1;
          orgSummary.totalPoints += syncResult.totalPoints ?? 0;

          this.logger.log(
            `Synced parcel ${parcel.id}: ${syncResult.totalPoints} new points`,
          );
        } catch (err) {
          orgSummary.failed += 1;
          orgSummary.failedParcelIds.push(parcel.id as string);
          this.logger.warn(
            `Failed to sync parcel ${parcel.id}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }

      this.logger.log("[Cron] 5-day monitoring cycle completed");

      await this.sendCalibrationCronSummaryEmails(summaryByOrg);
    } finally {
      this.running = false;
    }
  }

  /**
   * Email organization_admin + farm_manager after the calibration-related satellite cron.
   * Disabled when CALIBRATION_SATELLITE_CRON_EMAIL=false or 0.
   */
  private async sendCalibrationCronSummaryEmails(
    summaryByOrg: Map<string, OrgCalibrationCronSummary>,
  ): Promise<void> {
    const flag =
      this.configService.get<string>("CALIBRATION_SATELLITE_CRON_EMAIL") ?? "true";
    if (flag === "false" || flag === "0") {
      this.logger.log(
        "[Cron] CALIBRATION_SATELLITE_CRON_EMAIL disabled — skipping summary emails",
      );
      return;
    }

    const dashboardBase =
      this.configService.get<string>("FRONTEND_URL") ||
      this.configService.get<string>("APP_URL") ||
      "";

    for (const [organizationId, s] of summaryByOrg) {
      if (s.synced === 0 && s.failed === 0) {
        continue;
      }

      const subject =
        "[AgroGina] Synchronisation satellite (suivi calibrage) — rapport cron";

      const failedLine =
        s.failed > 0
          ? `<li><strong>Échecs :</strong> ${s.failed} parcelle(s)${s.failedParcelIds.length ? ` (IDs : ${s.failedParcelIds.slice(0, 8).join(", ")}${s.failedParcelIds.length > 8 ? "…" : ""})` : ""}</li>`
          : "";

      const linkLine = dashboardBase
        ? `<p><a href="${dashboardBase.replace(/\/$/, "")}/parcels">Ouvrir les parcelles dans le tableau de bord</a></p>`
        : "";

      const html = `
<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111827;">
  <p>Bonjour,</p>
  <p>La tâche planifiée <strong>satellite / suivi calibrage</strong> (tous les 5 jours) s'est terminée pour votre organisation.</p>
  <ul>
    <li><strong>Parcelles synchronisées :</strong> ${s.synced}</li>
    ${failedLine}
    <li><strong>Points d'indices récupérés (cumul sur ce run) :</strong> ${s.totalPoints}</li>
  </ul>
  ${linkLine}
  <p style="color:#6b7280;font-size:0.875rem;">Message automatique — ne pas répondre.</p>
</body></html>`.trim();

      const text = [
        "La synchronisation satellite (suivi calibrage) est terminée.",
        `Parcelles synchronisées : ${s.synced}`,
        s.failed > 0 ? `Échecs : ${s.failed}` : null,
        `Points (cumul) : ${s.totalPoints}`,
        dashboardBase
          ? `Tableau de bord : ${dashboardBase.replace(/\/$/, "")}/parcels`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        await this.notificationsService.sendOperationalEmailToManagementRoles(
          organizationId,
          { subject, html, text },
          MANAGEMENT_ROLES,
        );
      } catch (e) {
        this.logger.warn(
          `Failed to send calibration cron summary email for org ${organizationId}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
  }
}
