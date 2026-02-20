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

const HEATMAP_L1_TTL_MS = 5 * 60 * 1000;       // 5 min in-memory
const HEATMAP_DB_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in DB
const TIMESERIES_STALE_DAYS = 1;

@Injectable()
export class SatelliteCacheService {
  private readonly logger = new Logger(SatelliteCacheService.name);
  private readonly heatmapCache = new Map<string, CacheEntry>();

  constructor(
    private readonly db: DatabaseService,
    private readonly proxy: SatelliteProxyService,
  ) {}

  // ── Time Series: DB-backed cache ──────────────────────

  async getTimeSeries(
    body: Record<string, unknown>,
    organizationId?: string,
  ): Promise<unknown> {
    const parcelId = body.parcel_id as string | undefined;
    const indexName = (body.index as string) || '';
    const dateRange = body.date_range as { start_date?: string; end_date?: string } | undefined;

    if (!parcelId || !dateRange?.start_date || !dateRange?.end_date) {
      return this.proxy.post('/indices/timeseries', body, organizationId);
    }

    const cached = await this.queryTimeSeriesCache(
      parcelId,
      indexName,
      dateRange.start_date,
      dateRange.end_date,
      organizationId,
    );

    if (cached && cached.length >= 3) {
      this.logger.debug(
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

    this.logger.debug(
      `[Cache MISS] timeseries ${indexName} for parcel ${parcelId} → forwarding to satellite service`,
    );

    const fresh = await this.proxy.post('/indices/timeseries', body, organizationId) as Record<string, unknown>;

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

    setImmediate(async () => {
      const client = this.db.getAdminClient();
      let saved = 0;

      for (const point of points) {
        if (point.value == null) continue;
        try {
          await client
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
          saved++;
        } catch {
          // duplicate or conflict — skip
        }
      }

      if (saved > 0) {
        this.logger.log(
          `[Cache WRITE] Persisted ${saved}/${points.length} timeseries points for ${indexName}/${parcelId}`,
        );
      }
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
    setImmediate(async () => {
      try {
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
          this.logger.warn(`Heatmap cache write failed: ${error.message}`);
        } else {
          this.logger.log(
            `[Cache WRITE] Persisted heatmap ${indexName}/${date} (grid=${gridSize}) for parcel ${parcelId}`,
          );
        }
      } catch (err) {
        this.logger.warn(`Heatmap cache persist error: ${err}`);
      }
    });
  }

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
