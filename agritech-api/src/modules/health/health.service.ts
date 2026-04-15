import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';
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

  /** Rolling window for error rate tracking */
  private readonly errorTimestamps: number[] = [];
  private readonly errorWindowMs = 5 * 60 * 1000; // 5 min window
  private readonly errorRateThreshold = 50; // > 50 errors in 5min = degraded
  private readonly errorRateCritical = 200; // > 200 = down

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  /** Call from global exception filter to track error rate */
  recordError(): void {
    this.errorTimestamps.push(Date.now());
    // Prune old entries
    const cutoff = Date.now() - this.errorWindowMs;
    while (this.errorTimestamps.length > 0 && this.errorTimestamps[0] < cutoff) {
      this.errorTimestamps.shift();
    }
  }

  async checkAll(): Promise<DeepHealthResult> {
    const [supabase, satellite, cms, memory, dbPool, disk, cpu, errorRate] = await Promise.all([
      this.checkSupabase(),
      this.checkSatellite(),
      this.checkCms(),
      this.checkMemory(),
      this.checkDbPool(),
      this.checkDisk(),
      this.checkCpu(),
      Promise.resolve(this.checkErrorRate()),
    ]);

    const services: Record<string, ServiceCheckResult> = {
      supabase,
      satellite,
      cms,
      memory,
      dbPool,
      disk,
      cpu,
      errorRate,
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
    const url =
      this.configService.get<string>('SATELLITE_SERVICE_URL') || 'http://localhost:8001';
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
      heapPercent > 90 ? 'down' : heapPercent > 85 ? 'degraded' : 'up';

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

  checkDbPool(): ServiceCheckResult {
    const stats = this.getPoolStats();
    const waiting = stats.waiting ?? 0;
    const total = stats.total ?? 0;
    const idle = stats.idle ?? 0;

    let status: ServiceStatus = 'up';
    if (waiting > 10) {
      status = 'down';
    } else if (waiting > 5) {
      status = 'degraded';
    }

    return {
      status,
      responseTimeMs: 0,
      details: { total, idle, waiting },
      ...(status !== 'up' && { error: `Pool pressure: ${waiting} waiting, ${idle} idle of ${total} total` }),
    };
  }

  async checkDisk(): Promise<ServiceCheckResult> {
    try {
      const { execSync } = require('child_process');
      const output = execSync("df -P / | tail -1 | awk '{print $5}'", { encoding: 'utf-8' }).trim();
      const usedPercent = parseInt(output.replace('%', ''), 10);

      let status: ServiceStatus = 'up';
      if (usedPercent > 95) status = 'down';
      else if (usedPercent > 85) status = 'degraded';

      return {
        status,
        responseTimeMs: 0,
        details: { usedPercent },
        ...(status !== 'up' && { error: `Disk ${usedPercent}% full` }),
      };
    } catch (error) {
      return { status: 'up', responseTimeMs: 0, details: { note: 'disk check unavailable' } };
    }
  }

  checkCpu(): ServiceCheckResult {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const load1m = loadAvg[0];
    const numCpus = cpus.length;
    const loadPercent = Math.round((load1m / numCpus) * 100);

    let status: ServiceStatus = 'up';
    if (loadPercent > 95) status = 'down';
    else if (loadPercent > 80) status = 'degraded';

    return {
      status,
      responseTimeMs: 0,
      details: { load1m: Math.round(load1m * 100) / 100, numCpus, loadPercent },
      ...(status !== 'up' && { error: `CPU load ${loadPercent}% (${load1m.toFixed(1)}/${numCpus} cores)` }),
    };
  }

  checkErrorRate(): ServiceCheckResult {
    const cutoff = Date.now() - this.errorWindowMs;
    while (this.errorTimestamps.length > 0 && this.errorTimestamps[0] < cutoff) {
      this.errorTimestamps.shift();
    }
    const count = this.errorTimestamps.length;

    let status: ServiceStatus = 'up';
    if (count > this.errorRateCritical) status = 'down';
    else if (count > this.errorRateThreshold) status = 'degraded';

    return {
      status,
      responseTimeMs: 0,
      details: { errorsInWindow: count, windowMinutes: this.errorWindowMs / 60000 },
      ...(status !== 'up' && { error: `${count} errors in last ${this.errorWindowMs / 60000}min` }),
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
