import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';

export type ServiceStatus = 'up' | 'down' | 'degraded';

export interface ServiceCheckResult {
  status: ServiceStatus;
  responseTimeMs: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface DeepHealthResult {
  status: ServiceStatus;
  timestamp: string;
  uptime: number;
  services: Record<string, ServiceCheckResult>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly timeoutMs = 5000;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  async checkAll(): Promise<DeepHealthResult> {
    const [supabase, satellite, cms, memory] = await Promise.all([
      this.checkSupabase(),
      this.checkSatellite(),
      this.checkCms(),
      this.checkMemory(),
    ]);

    const services: Record<string, ServiceCheckResult> = {
      supabase,
      satellite,
      cms,
      memory,
    };

    const anyDown = Object.values(services).some((s) => s.status === 'down');
    const anyDegraded = Object.values(services).some((s) => s.status === 'degraded');
    const overallStatus: ServiceStatus = anyDown ? 'down' : anyDegraded ? 'degraded' : 'up';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
    };
  }

  async checkSupabase(): Promise<ServiceCheckResult> {
    const start = Date.now();
    try {
      const pool = this.databaseService.getPgPool();
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
      const responseTimeMs = Date.now() - start;
      return {
        status: responseTimeMs > 3000 ? 'degraded' : 'up',
        responseTimeMs,
        details: { pool: this.getPoolStats() },
      };
    } catch (error) {
      return {
        status: 'down',
        responseTimeMs: Date.now() - start,
        error: error.message,
      };
    }
  }

  async checkSatellite(): Promise<ServiceCheckResult> {
    const url = this.configService.get<string>('SATELLITE_SERVICE_URL') || 'http://localhost:8000';
    const healthUrl = `${url.replace(/\/+$/, '')}/health`;
    return this.checkHttpEndpoint('satellite', healthUrl);
  }

  async checkCms(): Promise<ServiceCheckResult> {
    const strapiUrl = this.configService.get<string>('STRAPI_API_URL') || 'http://localhost:1337/api';
    const baseUrl = strapiUrl.replace(/\/api\/?$/, '');
    const healthUrl = `${baseUrl}/_health`;
    return this.checkHttpEndpoint('cms', healthUrl);
  }

  checkMemory(): ServiceCheckResult {
    const mem = process.memoryUsage();
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMb = Math.round(mem.rss / 1024 / 1024);
    const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);

    const status: ServiceStatus =
      heapPercent > 90 ? 'down' : heapPercent > 75 ? 'degraded' : 'up';

    return {
      status,
      responseTimeMs: 0,
      details: {
        heapUsedMb,
        heapTotalMb,
        rssMb,
        heapPercent,
      },
    };
  }

  private async checkHttpEndpoint(
    name: string,
    url: string,
  ): Promise<ServiceCheckResult> {
    const start = Date.now();
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const responseTimeMs = Date.now() - start;

      if (!res.ok && res.status !== 404) {
        return {
          status: 'down',
          responseTimeMs,
          error: `HTTP ${res.status} ${res.statusText}`,
        };
      }

      return {
        status: responseTimeMs > 3000 ? 'degraded' : 'up',
        responseTimeMs,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - start;
      const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError';
      return {
        status: 'down',
        responseTimeMs,
        error: isTimeout ? `Timeout after ${this.timeoutMs}ms` : error.message,
      };
    }
  }

  private getPoolStats(): Record<string, number> {
    try {
      const pool = this.databaseService.getPgPool() as any;
      return {
        total: pool.totalCount ?? 0,
        idle: pool.idleCount ?? 0,
        waiting: pool.waitingCount ?? 0,
      };
    } catch {
      return {};
    }
  }
}
