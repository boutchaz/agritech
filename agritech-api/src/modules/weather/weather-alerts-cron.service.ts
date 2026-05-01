import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { WeatherService, ForecastDay } from './weather.service';
import { NotificationsService, MANAGEMENT_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';

interface ParcelLocation {
  id: string;
  name: string;
  farm_name: string;
  organization_id: string;
  lat: number;
  lon: number;
}

interface WeatherCondition {
  parcelId: string;
  parcelName: string;
  farmName: string;
  organizationId: string;
  condition: 'frost' | 'heat_wave' | 'heavy_rain' | 'high_wind' | 'spray_window';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  date: string;
}

const FROST_THRESHOLD = 2;
const HEAT_WAVE_THRESHOLD = 38;
const HEAT_WAVE_CONSECUTIVE_DAYS = 3;
const HEAVY_RAIN_THRESHOLD = 20;
const HIGH_WIND_THRESHOLD = 50;

@Injectable()
export class WeatherAlertsCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeatherAlertsCronService.name);
  private interval: ReturnType<typeof setInterval> | null = null;

  private readonly intervalMs: number;
  private readonly enabled: boolean;

  constructor(
    private readonly db: DatabaseService,
    private readonly weatherService: WeatherService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    const intervalHours = parseInt(
      this.configService.get<string>('WEATHER_ALERT_INTERVAL_HOURS', '6'),
      10,
    );
    this.intervalMs = intervalHours * 60 * 60 * 1000;
    this.enabled = this.configService.get<string>('WEATHER_ALERTS_ENABLED', 'true') === 'true';
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('[WeatherAlerts] Disabled via WEATHER_ALERTS_ENABLED env');
      return;
    }

    this.logger.log(
      `[WeatherAlerts] Starting weather alert checks every ${this.intervalMs / 3600000}h`,
    );
    this.interval = setInterval(() => this.runAlertCheck(), this.intervalMs);
    setTimeout(() => this.runAlertCheck(), 30000);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async runAlertCheck(): Promise<void> {
    this.logger.debug('[WeatherAlerts] Running weather alert check...');

    try {
      const parcels = await this.getActiveParcels();
      this.logger.debug(`[WeatherAlerts] Checking ${parcels.length} parcels`);

      const conditions: WeatherCondition[] = [];

      for (const parcel of parcels) {
        try {
          const alerts = await this.checkParcelWeather(parcel);
          conditions.push(...alerts);
        } catch (err) {
          this.logger.warn(`[WeatherAlerts] Failed to check parcel ${parcel.name}: ${err}`);
        }
      }

      await this.dispatchNotifications(conditions);

      this.logger.log(
        `[WeatherAlerts] Check complete: ${conditions.length} alerts across ${parcels.length} parcels`,
      );
    } catch (err) {
      this.logger.error('[WeatherAlerts] Alert check failed', err);
    }
  }

  private async getActiveParcels(): Promise<ParcelLocation[]> {
    const client = this.db.getAdminClient();
    const { data, error } = await client
      .from('parcels')
      .select(`
        id, name,
        farms!inner(name, organization_id)
      `)
      .eq('is_active', true)
      .not('boundary', 'is', null);

    if (error || !data) {
      this.logger.error('Failed to fetch parcels', error);
      return [];
    }

    return data
      .map((p: any) => {
        const boundary = p.boundary as number[][] | null;
        if (!boundary || boundary.length < 3) return null;

        const latSum = boundary.reduce((s: number, pt: number[]) => s + pt[1], 0);
        const lonSum = boundary.reduce((s: number, pt: number[]) => s + pt[0], 0);
        const lat = latSum / boundary.length;
        const lon = lonSum / boundary.length;

        return {
          id: p.id,
          name: p.name,
          farm_name: p.farms?.name ?? '',
          organization_id: p.farms?.organization_id ?? '',
          lat,
          lon,
        };
      })
      .filter((p): p is ParcelLocation => p !== null);
  }

  private async checkParcelWeather(parcel: ParcelLocation): Promise<WeatherCondition[]> {
    const conditions: WeatherCondition[] = [];

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);
    const startStr = today.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const analytics = await this.weatherService.getParcelWeather(
      parcel.id,
      parcel.organization_id,
      startStr,
      endStr,
    );

    if (!analytics.forecast || analytics.forecast.length === 0) return conditions;

    for (const day of analytics.forecast) {
      if (day.temp.min <= FROST_THRESHOLD) {
        conditions.push({
          parcelId: parcel.id,
          parcelName: parcel.name,
          farmName: parcel.farm_name,
          organizationId: parcel.organization_id,
          condition: 'frost',
          severity: 'critical',
          message: `Risk of frost on ${day.date}: minimum temperature ${day.temp.min}°C at ${parcel.name} (${parcel.farm_name}). Protect sensitive crops.`,
          date: day.date,
        });
      }

      if (day.precipitation >= HEAVY_RAIN_THRESHOLD) {
        conditions.push({
          parcelId: parcel.id,
          parcelName: parcel.name,
          farmName: parcel.farm_name,
          organizationId: parcel.organization_id,
          condition: 'heavy_rain',
          severity: 'warning',
          message: `Heavy rain expected on ${day.date}: ${day.precipitation}mm at ${parcel.name} (${parcel.farm_name}). Consider postponing field operations.`,
          date: day.date,
        });
      }

      if (day.windSpeed >= HIGH_WIND_THRESHOLD) {
        conditions.push({
          parcelId: parcel.id,
          parcelName: parcel.name,
          farmName: parcel.farm_name,
          organizationId: parcel.organization_id,
          condition: 'high_wind',
          severity: 'warning',
          message: `High wind on ${day.date}: ${day.windSpeed} km/h at ${parcel.name} (${parcel.farm_name}). Avoid spraying and tall equipment operations.`,
          date: day.date,
        });
      }
    }

    let consecutiveHotDays = 0;
    for (const day of analytics.forecast) {
      if (day.temp.max >= HEAT_WAVE_THRESHOLD) {
        consecutiveHotDays++;
        if (consecutiveHotDays >= HEAT_WAVE_CONSECUTIVE_DAYS) {
          conditions.push({
            parcelId: parcel.id,
            parcelName: parcel.name,
            farmName: parcel.farm_name,
            organizationId: parcel.organization_id,
            condition: 'heat_wave',
            severity: 'critical',
            message: `Heat wave warning: ${consecutiveHotDays} consecutive days above ${HEAT_WAVE_THRESHOLD}°C at ${parcel.name} (${parcel.farm_name}). Increase irrigation, protect workers.`,
            date: day.date,
          });
          break;
        }
      } else {
        consecutiveHotDays = 0;
      }
    }

    return conditions;
  }

  private async dispatchNotifications(conditions: WeatherCondition[]): Promise<void> {
    const byOrg = new Map<string, WeatherCondition[]>();
    for (const c of conditions) {
      if (!byOrg.has(c.organizationId)) byOrg.set(c.organizationId, []);
      byOrg.get(c.organizationId)!.push(c);
    }

    for (const [orgId, alerts] of byOrg) {
      try {
        if (alerts.length === 0) continue;

        const criticalCount = alerts.filter(c => c.severity === 'critical').length;
        const warningCount = alerts.filter(c => c.severity === 'warning').length;

        const title = criticalCount > 0
          ? `Alertes météo: ${criticalCount} critiques, ${warningCount} avertissements`
          : `Alertes météo: ${warningCount} avertissements`;

        const message = alerts
          .slice(0, 10)
          .map(a => a.message)
          .join('\n');

        const parcelIds = [...new Set(alerts.map(a => a.parcelId))];

        await this.notificationsService.createNotificationsForRoles(
          orgId,
          MANAGEMENT_ROLES,
          null,
          NotificationType.WEATHER_ALERT,
          title,
          message,
          {
            alertCount: alerts.length,
            criticalCount,
            warningCount,
            parcelIds,
            checkedAt: new Date().toISOString(),
          },
        );
      } catch (err) {
        this.logger.warn(`[WeatherAlerts] Failed to notify org ${orgId}: ${err}`);
      }
    }
  }
}
