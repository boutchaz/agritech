import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SatelliteProxyService } from './satellite-proxy.service';

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface ParcelSyncProgress {
  status: 'idle' | 'syncing' | 'completed' | 'failed';
  startedAt: string | null;
  completedAt: string | null;
  totalIndices: number;
  completedIndices: number;
  currentIndex: string | null;
  results: Record<string, { points: number; error?: string }>;
}

const HEATMAP_L1_TTL_MS = 5 * 60 * 1000;            // 5 min in-memory
const HEATMAP_DB_TTL_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days in DB
const AVAIL_DATES_L1_TTL_MS = 10 * 60 * 1000;       // 10 min in-memory

const CORE_INDICES = ['NIRv', 'EVI', 'NDRE', 'NDMI'];

@Injectable()
export class SatelliteCacheService {
  private readonly logger = new Logger(SatelliteCacheService.name);
  private readonly heatmapCache = new Map<string, CacheEntry>();
  private readonly availDatesCache = new Map<string, CacheEntry>();
  private readonly parcelSyncProgress = new Map<string, ParcelSyncProgress>();

  constructor(
    private readonly db: DatabaseService,
    private readonly proxy: SatelliteProxyService,
  ) {}

  // ── Per-Parcel Async Sync ─────────────────────────────

  getParcelSyncProgress(parcelId: string): ParcelSyncProgress {
    return this.parcelSyncProgress.get(parcelId) || {
      status: 'idle',
      startedAt: null,
      completedAt: null,
      totalIndices: 0,
      completedIndices: 0,
      currentIndex: null,
      results: {},
    };
  }

  /**
   * Starts async background sync for a single parcel.
   * Returns immediately — caller polls getParcelSyncProgress() for status.
   */
  startParcelSync(body: Record<string, unknown>, organizationId?: string): ParcelSyncProgress {
    const parcelId = body.parcel_id as string;
    const farmId = body.farm_id as string | undefined;
    const dateRange = body.date_range as { start_date?: string; end_date?: string } | undefined;
    const cloudCoverage = (body.cloud_coverage as number) || 20;
    const indices = (body.indices as string[]) || CORE_INDICES;

    if (!parcelId || !dateRange?.start_date || !dateRange?.end_date) {
      return {
        status: 'failed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        totalIndices: 0,
        completedIndices: 0,
        currentIndex: null,
        results: {},
      };
    }

    const existing = this.parcelSyncProgress.get(parcelId);
    if (existing?.status === 'syncing') {
      this.logger.warn(`[ParcelSync] Already syncing parcel ${parcelId}, returning current progress`);
      return existing;
    }

    const progress: ParcelSyncProgress = {
      status: 'syncing',
      startedAt: new Date().toISOString(),
      completedAt: null,
      totalIndices: indices.length,
      completedIndices: 0,
      currentIndex: null,
      results: {},
    };
    this.parcelSyncProgress.set(parcelId, progress);

    this.runParcelSyncInBackground(
      parcelId,
      farmId,
      dateRange.start_date,
      dateRange.end_date,
      cloudCoverage,
      indices,
      body,
      organizationId,
    );

    return progress;
  }

  private async runParcelSyncInBackground(
    parcelId: string,
    farmId: string | undefined,
    startDate: string,
    endDate: string,
    cloudCoverage: number,
    indices: string[],
    originalBody: Record<string, unknown>,
    organizationId?: string,
  ): Promise<void> {
    const progress = this.parcelSyncProgress.get(parcelId)!;

    try {
      for (const index of indices) {
        progress.currentIndex = index;
        this.logger.log(`[ParcelSync] ${parcelId} — syncing ${index} (${progress.completedIndices + 1}/${indices.length})`);

        try {
          const requestBody = {
            ...originalBody,
            index,
            force_refresh: true,
            date_range: { start_date: startDate, end_date: endDate },
            cloud_coverage: cloudCoverage,
          };

          const result = await this.proxy.post(
            '/indices/timeseries',
            requestBody,
            organizationId,
            undefined,
            300_000,
          ) as Record<string, unknown>;

          const points = (result.data as TimeSeriesPoint[]) || [];

          await this.persistTimeSeriesSync(
            parcelId,
            index,
            points,
            organizationId,
            farmId,
          );

          progress.results[index] = { points: points.length };
          this.logger.log(`[ParcelSync] ${parcelId} — ${index} done: ${points.length} points`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          progress.results[index] = { points: 0, error: errMsg };
          this.logger.warn(`[ParcelSync] ${parcelId} — ${index} failed: ${errMsg}`);
        }

        progress.completedIndices++;
      }

      progress.status = 'completed';
      progress.completedAt = new Date().toISOString();
      progress.currentIndex = null;
      this.logger.log(`[ParcelSync] ${parcelId} — sync complete`);
    } catch (err) {
      progress.status = 'failed';
      progress.completedAt = new Date().toISOString();
      progress.currentIndex = null;
      this.logger.error(`[ParcelSync] ${parcelId} — fatal error: ${err}`);
    }

    setTimeout(() => {
      const current = this.parcelSyncProgress.get(parcelId);
      if (current && current.status !== 'syncing') {
        this.parcelSyncProgress.delete(parcelId);
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Synchronous persist — used by background sync to ensure data is saved
   * before reporting completion.
   */
  private async persistTimeSeriesSync(
    parcelId: string,
    indexName: string,
    points: TimeSeriesPoint[],
    organizationId?: string,
    farmId?: string,
  ): Promise<{ saved: number; failed: number }> {
    if (!organizationId || points.length === 0 || indexName === 'NIRvP') {
      return { saved: 0, failed: 0 };
    }

    const client = this.db.getAdminClient();
    let saved = 0;
    let failed = 0;

    for (const point of points) {
      if (point.value == null) continue;
      const { error } = await client
        .from('satellite_indices_data')
        .upsert(
          {
            parcel_id: parcelId,
            organization_id: organizationId,
            farm_id: farmId || null,
            index_name: indexName,
            date: point.date,
            mean_value: point.value,
            image_source: 'sentinel-2',
          },
          { onConflict: 'parcel_id,index_name,date' },
        );

      if (error) {
        failed++;
      } else {
        saved++;
      }
    }

    this.logger.log(
      `[ParcelSync PERSIST] ${indexName}/${parcelId}: ${saved} saved, ${failed} failed out of ${points.length}`,
    );
    return { saved, failed };
  }

  // ── Time Series: DB-backed cache ──────────────────────

  async getTimeSeries(
    body: Record<string, unknown>,
    organizationId?: string,
  ): Promise<unknown> {
    const parcelId = body.parcel_id as string | undefined;
    const indexName = (body.index as string) || '';
    const dateRange = body.date_range as { start_date?: string; end_date?: string } | undefined;
    const forceRefresh = body.force_refresh as boolean | undefined;

    if (!parcelId || !dateRange?.start_date || !dateRange?.end_date) {
      return this.proxy.post('/indices/timeseries', body, organizationId);
    }

    if (!forceRefresh) {
      const cached = await this.queryTimeSeriesCache(
        parcelId,
        indexName,
        dateRange.start_date,
        dateRange.end_date,
        organizationId,
      );

      if (cached && cached.length >= 3) {
        this.logger.log(
          `[Cache HIT] timeseries ${indexName} for parcel ${parcelId}: ${cached.length} points`,
        );

        const values = cached.map((p) => p.value).filter((v) => v != null);
        const sorted = [...values].sort((a, b) => a - b);

        return {
          index: indexName,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
          data: cached,
          statistics: values.length > 0 ? {
            mean: values.reduce((s, v) => s + v, 0) / values.length,
            std: Math.sqrt(
              values.reduce((s, v) => s + (v - values.reduce((a, b) => a + b, 0) / values.length) ** 2, 0) / values.length,
            ),
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)],
          } : null,
          _source: 'cache',
        };
      }
    }

    this.logger.log(
      `[Cache ${forceRefresh ? 'BYPASS' : 'MISS'}] timeseries ${indexName} for parcel ${parcelId} → forwarding to satellite service`,
    );

    const start = Date.now();
    const fresh = await this.proxy.post('/indices/timeseries', body, organizationId) as Record<string, unknown>;
    this.logger.log(`[Proxy] timeseries response in ${Date.now() - start}ms`);

    this.persistTimeSeriesInBackground(
      parcelId,
      indexName,
      (fresh.data as TimeSeriesPoint[]) || [],
      organizationId,
      body.farm_id as string | undefined,
    );

    return fresh;
  }

  private async queryTimeSeriesCache(
    parcelId: string,
    indexName: string,
    startDate: string,
    endDate: string,
    organizationId?: string,
  ): Promise<TimeSeriesPoint[] | null> {
    try {
      const client = this.db.getAdminClient();

      let query = client
        .from('satellite_indices_data')
        .select('date, mean_value')
        .eq('parcel_id', parcelId)
        .eq('index_name', indexName)
        .gte('date', startDate)
        .lte('date', endDate)
        .not('mean_value', 'is', null)
        .order('date', { ascending: true });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return null;
      }

      return data.map((row: { date: string; mean_value: number }) => ({
        date: row.date,
        value: row.mean_value,
      }));
    } catch (err) {
      this.logger.warn(`Cache query failed for ${indexName}/${parcelId}: ${err}`);
      return null;
    }
  }

  private persistTimeSeriesInBackground(
    parcelId: string,
    indexName: string,
    points: TimeSeriesPoint[],
    organizationId?: string,
    farmId?: string,
  ) {
    if (!organizationId || points.length === 0 || indexName === 'NIRvP') return;

    Promise.resolve().then(async () => {
      const client = this.db.getAdminClient();
      let saved = 0;
      let failed = 0;

      for (const point of points) {
        if (point.value == null) continue;
        const { error } = await client
          .from('satellite_indices_data')
          .upsert(
            {
              parcel_id: parcelId,
              organization_id: organizationId,
              farm_id: farmId || null,
              index_name: indexName,
              date: point.date,
              mean_value: point.value,
              image_source: 'sentinel-2',
            },
            { onConflict: 'parcel_id,index_name,date' },
          );

        if (error) {
          failed++;
        } else {
          saved++;
        }
      }

      if (saved > 0 || failed > 0) {
        this.logger.log(
          `[Cache WRITE] timeseries ${indexName}/${parcelId}: ${saved} saved, ${failed} failed out of ${points.length}`,
        );
      }
    }).catch((err) => {
      this.logger.error(`[Cache WRITE CRASH] timeseries persist: ${err}`);
    });
  }

  // ── Heatmap: DB-backed cache (L1 in-memory, L2 Supabase) ──

  async getHeatmap(
    body: Record<string, unknown>,
    organizationId?: string,
  ): Promise<unknown> {
    const parcelId = body.parcel_id as string | undefined;
    const indexName = (body.index as string) || '';
    const date = (body.date as string) || '';
    const gridSize = (body.grid_size as number) || 1000;

    // L1: in-memory (short TTL for hot requests within same session)
    const memKey = this.heatmapMemKey(body);
    const memCached = this.heatmapCache.get(memKey);
    if (memCached && memCached.expiresAt > Date.now()) {
      this.logger.debug(`[Cache L1 HIT] heatmap mem key=${memKey.slice(0, 40)}…`);
      return memCached.data;
    }

    // L2: DB (persistent across restarts, 7-day TTL)
    if (parcelId && indexName && date) {
      const dbCached = await this.queryHeatmapCache(
        parcelId,
        indexName,
        date,
        gridSize,
        organizationId,
      );

      if (dbCached) {
        this.logger.debug(
          `[Cache L2 HIT] heatmap ${indexName}/${date} for parcel ${parcelId}`,
        );

        // Promote to L1
        this.heatmapCache.set(memKey, {
          data: dbCached,
          expiresAt: Date.now() + HEATMAP_L1_TTL_MS,
        });

        return dbCached;
      }
    }

    // Cache MISS → forward to satellite service
    this.logger.debug(
      `[Cache MISS] heatmap ${indexName}/${date} → forwarding to satellite service`,
    );
    const fresh = await this.proxy.post('/indices/heatmap', body, organizationId);

    // Store in L1
    this.heatmapCache.set(memKey, {
      data: fresh,
      expiresAt: Date.now() + HEATMAP_L1_TTL_MS,
    });
    this.evictExpiredHeatmapEntries();

    // Persist to L2 in background
    if (parcelId && organizationId && indexName && date) {
      this.persistHeatmapInBackground(
        parcelId,
        indexName,
        date,
        gridSize,
        fresh,
        organizationId,
      );
    }

    return fresh;
  }

  private async queryHeatmapCache(
    parcelId: string,
    indexName: string,
    date: string,
    gridSize: number,
    organizationId?: string,
  ): Promise<unknown | null> {
    try {
      const client = this.db.getAdminClient();

      let query = client
        .from('satellite_heatmap_cache')
        .select('response_data')
        .eq('parcel_id', parcelId)
        .eq('index_name', indexName)
        .eq('date', date)
        .eq('grid_size', gridSize)
        .gt('expires_at', new Date().toISOString());

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query.limit(1).single();

      if (error || !data) {
        return null;
      }

      return data.response_data;
    } catch (err) {
      this.logger.warn(`Heatmap cache query failed for ${indexName}/${parcelId}/${date}: ${err}`);
      return null;
    }
  }

  private persistHeatmapInBackground(
    parcelId: string,
    indexName: string,
    date: string,
    gridSize: number,
    responseData: unknown,
    organizationId: string,
  ) {
    Promise.resolve().then(async () => {
      const client = this.db.getAdminClient();
      const expiresAt = new Date(Date.now() + HEATMAP_DB_TTL_MS).toISOString();

      const { error } = await client
        .from('satellite_heatmap_cache')
        .upsert(
          {
            parcel_id: parcelId,
            organization_id: organizationId,
            index_name: indexName,
            date,
            grid_size: gridSize,
            response_data: responseData,
            expires_at: expiresAt,
          },
          { onConflict: 'parcel_id,index_name,date,grid_size' },
        );

      if (error) {
        this.logger.error(
          `[Cache WRITE FAILED] heatmap ${indexName}/${date} for parcel ${parcelId}: ` +
          `${error.message} (code=${error.code}, details=${error.details})`,
        );
      } else {
        this.logger.log(
          `[Cache WRITE OK] heatmap ${indexName}/${date} (grid=${gridSize}) for parcel ${parcelId}`,
        );
      }
    }).catch((err) => {
      this.logger.error(`[Cache WRITE CRASH] heatmap persist: ${err}`);
    });
  }

  // ── Available Dates: DB-backed cache (permanent for past, 24h for current) ──

  async getAvailableDates(
    body: Record<string, unknown>,
    organizationId?: string,
  ): Promise<unknown> {
    const parcelId = body.parcel_id as string | undefined;
    const startDate = (body.start_date as string) || '';
    const endDate = (body.end_date as string) || '';

    if (!parcelId) {
      return this.proxy.post('/indices/available-dates', body, organizationId);
    }

    if (!startDate || !endDate) {
      return this.proxy.post('/indices/available-dates', body, organizationId);
    }

    const memKey = `ad:${parcelId}:${startDate}:${endDate}`;

    const memCached = this.availDatesCache.get(memKey);
    if (memCached && memCached.expiresAt > Date.now()) {
      this.logger.log(`[Cache L1 HIT] available-dates ${memKey}`);
      return memCached.data;
    }

    const derived = await this.deriveAvailableDatesFromTimeSeries(
      parcelId,
      startDate,
      endDate,
      organizationId,
    );

    if (derived) {
      this.logger.log(
        `[available-dates] Derived ${derived.available_dates.length} dates from timeseries cache for parcel ${parcelId}`,
      );
      this.availDatesCache.set(memKey, {
        data: derived,
        expiresAt: Date.now() + AVAIL_DATES_L1_TTL_MS,
      });
      return derived;
    }

    this.logger.log(
      `[available-dates] No timeseries data — falling back to satellite service for ${parcelId} ${startDate}→${endDate}`,
    );
    const start = Date.now();
    const fresh = await this.proxy.post('/indices/available-dates', body, organizationId);
    this.logger.log(`[Proxy] available-dates response in ${Date.now() - start}ms`);

    this.availDatesCache.set(memKey, {
      data: fresh,
      expiresAt: Date.now() + AVAIL_DATES_L1_TTL_MS,
    });

    return fresh;
  }

  private async deriveAvailableDatesFromTimeSeries(
    parcelId: string,
    startDate: string,
    endDate: string,
    organizationId?: string,
  ): Promise<{
    available_dates: Array<{ date: string; available: boolean }>;
    total_images: number;
    date_range: { start: string; end: string };
    _source: string;
  } | null> {
    try {
      const client = this.db.getAdminClient();

      let query = client
        .from('satellite_indices_data')
        .select('date')
        .eq('parcel_id', parcelId)
        .gte('date', startDate)
        .lte('date', endDate)
        .not('mean_value', 'is', null);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return null;
      }

      const uniqueDates = [...new Set(data.map((row: { date: string }) => row.date))].sort();

      return {
        available_dates: uniqueDates.map((date) => ({ date, available: true })),
        total_images: uniqueDates.length,
        date_range: { start: startDate, end: endDate },
        _source: 'timeseries_cache',
      };
    } catch (err) {
      this.logger.warn(`Failed to derive available dates from timeseries: ${err}`);
      return null;
    }
  }

  // ── Shared helpers ────────────────────────────────────────

  private heatmapMemKey(body: Record<string, unknown>): string {
    const index = body.index || '';
    const date = body.date || '';
    const gridSize = body.grid_size || '';
    const parcelId = body.parcel_id || '';

    // If parcel_id is available, use it directly (deterministic, no hash needed)
    if (parcelId) {
      return `hm:${parcelId}:${index}:${date}:${gridSize}`;
    }

    // Fallback: hash the geometry for requests without parcel_id
    const geo = body.aoi as Record<string, unknown> | undefined;
    const coords = geo?.geometry
      ? JSON.stringify((geo.geometry as Record<string, unknown>).coordinates)
      : '';

    return `hm:${index}:${date}:${gridSize}:${this.simpleHash(coords)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(36);
  }

  private evictExpiredHeatmapEntries() {
    const now = Date.now();
    for (const [key, entry] of this.heatmapCache) {
      if (entry.expiresAt <= now) {
        this.heatmapCache.delete(key);
      }
    }
  }
}
