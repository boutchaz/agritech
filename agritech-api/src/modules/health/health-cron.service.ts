import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthService, ServiceCheckResult } from './health.service';
import { AlertService } from './alert.service';

interface ServiceState {
  status: 'up' | 'down' | 'degraded' | 'unknown';
  downSince: Date | null;
}

@Injectable()
export class HealthCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthCronService.name);
  private readonly serviceStates = new Map<string, ServiceState>();
  private probeInterval: ReturnType<typeof setInterval> | null = null;

  private readonly serviceUrls: Record<string, string>;
  private readonly intervalMs: number;

  constructor(
    private readonly healthService: HealthService,
    private readonly alertService: AlertService,
    private readonly configService: ConfigService,
  ) {
    const intervalSeconds = parseInt(
      this.configService.get<string>('HEALTH_CHECK_INTERVAL_SECONDS', '60'),
      10,
    );
    this.intervalMs = intervalSeconds * 1000;

    this.serviceUrls = {
      supabase: this.configService.get<string>('SUPABASE_URL') || 'supabase',
      satellite: this.configService.get<string>('SATELLITE_SERVICE_URL') || 'http://localhost:8000',
      cms: this.configService.get<string>('STRAPI_API_URL') || 'http://localhost:1337/api',
    };
  }

  onModuleInit() {
    this.logger.log(
      `[HealthCron] Starting health probe every ${this.intervalMs / 1000}s`,
    );
    this.probeInterval = setInterval(() => this.runProbe(), this.intervalMs);
    setTimeout(() => this.runProbe(), 5000);
  }

  onModuleDestroy() {
    if (this.probeInterval) {
      clearInterval(this.probeInterval);
      this.probeInterval = null;
    }
  }

  async runProbe(): Promise<void> {
    this.logger.debug('[HealthCron] Running health probe...');

    const result = await this.healthService.checkAll();

    const checks: Array<{ name: string; result: ServiceCheckResult }> = [
      { name: 'supabase', result: result.services.supabase },
      { name: 'satellite', result: result.services.satellite },
      { name: 'cms', result: result.services.cms },
      { name: 'memory', result: result.services.memory },
      { name: 'dbPool', result: result.services.dbPool },
      { name: 'disk', result: result.services.disk },
      { name: 'cpu', result: result.services.cpu },
      { name: 'errorRate', result: result.services.errorRate },
    ];

    for (const { name, result: check } of checks) {
      await this.processServiceResult(name, check);
    }

    const statusLine = checks
      .map(({ name, result: c }) => `${c.status === 'up' ? '✅' : c.status === 'degraded' ? '🟡' : '🔴'} ${name}:${c.responseTimeMs}ms`)
      .join('  ');
    this.logger.log(`[HealthCron] ${statusLine}`);
  }

  private async processServiceResult(
    name: string,
    check: ServiceCheckResult,
  ): Promise<void> {
    const prev = this.serviceStates.get(name) ?? { status: 'unknown', downSince: null };

    if (check.status === 'up') {
      if (prev.status !== 'up' && prev.status !== 'unknown') {
        const { wasDown, downSince } = this.alertService.recordRecovery(name);
        if (wasDown) {
          await this.alertService.notify({
            service: name,
            status: 'recovered',
            severity: 'info',
            responseTimeMs: check.responseTimeMs,
            url: this.serviceUrls[name],
            downSince: downSince ?? undefined,
            message: `${name} has recovered and is responding normally`,
          });
        }
      }
      this.serviceStates.set(name, { status: 'up', downSince: null });
    } else if (check.status === 'down') {
      const state = this.alertService.recordFailure(name);
      const downSince = state.downSince ?? new Date();
      this.serviceStates.set(name, { status: 'down', downSince });

      await this.alertService.notify({
        service: name,
        status: 'down',
        severity: 'critical',
        error: check.error,
        responseTimeMs: check.responseTimeMs,
        url: this.serviceUrls[name],
        downSince,
        message: `${name} is unreachable: ${check.error ?? 'unknown error'}`,
      });
    } else if (check.status === 'degraded') {
      this.serviceStates.set(name, { status: 'degraded', downSince: prev.downSince });

      await this.alertService.notify({
        service: name,
        status: 'degraded',
        severity: 'warning',
        responseTimeMs: check.responseTimeMs,
        url: this.serviceUrls[name],
        message: `${name} is responding slowly (${check.responseTimeMs}ms)`,
      });
    }
  }

  getServiceStates(): Record<string, ServiceState> {
    return Object.fromEntries(this.serviceStates.entries());
  }
}
