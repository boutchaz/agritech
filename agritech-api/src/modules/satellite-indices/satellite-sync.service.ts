import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { SatelliteCacheService } from './satellite-cache.service';

const CORE_INDICES = ['NIRv', 'EVI', 'NDRE', 'NDMI'];
const MONTHS_TO_SYNC = 6;
const CONCURRENCY = 1;

interface ParcelRow {
  id: string;
  name: string;
  boundary: number[][] | null;
  farm_id: string | null;
  organization_id: string;
}

export interface SyncProgress {
  status: 'idle' | 'running' | 'completed' | 'failed';
  startedAt: string | null;
  completedAt: string | null;
  totalParcels: number;
  processedParcels: number;
  currentParcel: string | null;
  errors: string[];
}

@Injectable()
export class SatelliteSyncService {
  private readonly logger = new Logger(SatelliteSyncService.name);
  private progress: SyncProgress = {
    status: 'idle',
    startedAt: null,
    completedAt: null,
    totalParcels: 0,
    processedParcels: 0,
    currentParcel: null,
    errors: [],
  };

  constructor(
    private readonly db: DatabaseService,
    private readonly cache: SatelliteCacheService,
  ) {}

  getProgress(): SyncProgress {
    return { ...this.progress };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'satellite-cache-warmup', timeZone: 'UTC' })
  async scheduledSync() {
    this.logger.log('[Cron] Starting scheduled satellite cache warmup');
    await this.runFullSync();
  }

  async runFullSync(): Promise<SyncProgress> {
    if (this.progress.status === 'running') {
      this.logger.warn('Sync already in progress, skipping');
      return this.progress;
    }

    this.progress = {
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      totalParcels: 0,
      processedParcels: 0,
      currentParcel: null,
      errors: [],
    };

    try {
      const parcels = await this.getAllParcelsWithBoundaries();
      this.progress.totalParcels = parcels.length;
      this.logger.log(`[Sync] Found ${parcels.length} parcels with boundaries`);

      for (let i = 0; i < parcels.length; i += CONCURRENCY) {
        const batch = parcels.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((p) => this.syncParcel(p)));
      }

      this.progress.status = 'completed';
      this.progress.completedAt = new Date().toISOString();
      this.logger.log(
        `[Sync] Complete: ${this.progress.processedParcels}/${this.progress.totalParcels} parcels, ${this.progress.errors.length} errors`,
      );
    } catch (err) {
      this.progress.status = 'failed';
      this.progress.completedAt = new Date().toISOString();
      this.progress.errors.push(`Fatal: ${err}`);
      this.logger.error(`[Sync] Fatal error: ${err}`);
    }

    return this.progress;
  }

  private async getAllParcelsWithBoundaries(): Promise<ParcelRow[]> {
    const client = this.db.getAdminClient();
    const { data, error } = await client
      .from('parcels')
      .select('id, name, boundary, farm_id, organization_id')
      .eq('is_active', true)
      .not('boundary', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch parcels: ${error.message}`);
    }

    return (data || []).filter(
      (p: ParcelRow) => p.boundary && Array.isArray(p.boundary) && p.boundary.length >= 3,
    );
  }

  private async syncParcel(parcel: ParcelRow) {
    this.progress.currentParcel = parcel.name || parcel.id;
    this.logger.log(`[Sync] Processing parcel: ${parcel.name} (${parcel.id})`);

    try {
      const geometry = this.boundaryToGeoJSON(parcel.boundary!);
      const aoi = { geometry, name: parcel.name || 'Parcel' };

      await this.syncTimeSeries(parcel, aoi);
      await this.syncLatestHeatmaps(parcel, aoi);

      this.progress.processedParcels++;
    } catch (err) {
      const msg = `Parcel ${parcel.name} (${parcel.id}): ${err}`;
      this.progress.errors.push(msg);
      this.progress.processedParcels++;
      this.logger.error(`[Sync] ${msg}`);
    }
  }

  private async syncTimeSeries(parcel: ParcelRow, aoi: { geometry: unknown; name: string }) {
    const endDate = this.formatDate(new Date());
    const startDate = this.formatDate(
      new Date(new Date().setMonth(new Date().getMonth() - MONTHS_TO_SYNC)),
    );

    for (const index of CORE_INDICES) {
      try {
        await this.cache.getTimeSeries(
          {
            aoi,
            date_range: { start_date: startDate, end_date: endDate },
            index,
            interval: 'week',
            cloud_coverage: 20,
            parcel_id: parcel.id,
            farm_id: parcel.farm_id,
          },
          parcel.organization_id,
        );
        this.logger.debug(`[Sync] Timeseries cached: ${parcel.name} ${index}`);
      } catch (err) {
        this.logger.warn(`[Sync] Timeseries failed for ${parcel.name} ${index}: ${err}`);
      }
    }
  }

  private async syncLatestHeatmaps(parcel: ParcelRow, aoi: { geometry: unknown; name: string }) {
    const now = new Date();
    const monthStart = this.formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = this.formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    let latestDate: string | null = null;

    try {
      const datesResult = (await this.cache.getAvailableDates(
        {
          aoi,
          start_date: monthStart,
          end_date: monthEnd,
          cloud_coverage: 30,
          parcel_id: parcel.id,
        },
        parcel.organization_id,
      )) as { available_dates?: Array<{ date: string; available: boolean }> };

      const available = (datesResult?.available_dates || [])
        .filter((d) => d.available)
        .map((d) => d.date)
        .sort();

      latestDate = available.length > 0 ? available[available.length - 1] : null;
    } catch {
      this.logger.warn(`[Sync] Could not determine latest date for ${parcel.name} heatmaps`);
    }

    if (!latestDate) return;

    for (const index of CORE_INDICES) {
      try {
        await this.cache.getHeatmap(
          {
            aoi,
            date: latestDate,
            index,
            grid_size: 1000,
            parcel_id: parcel.id,
          },
          parcel.organization_id,
        );
        this.logger.debug(`[Sync] Heatmap cached: ${parcel.name} ${index} ${latestDate}`);
      } catch (err) {
        this.logger.warn(`[Sync] Heatmap failed for ${parcel.name} ${index} ${latestDate}: ${err}`);
      }
    }
  }

  private boundaryToGeoJSON(boundary: number[][]): { type: string; coordinates: number[][][] } {
    const coords = boundary.map((c) => [...c]);

    if (coords.length > 0) {
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords.push([first[0], first[1]]);
      }
    }

    return { type: 'Polygon', coordinates: [coords] };
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
