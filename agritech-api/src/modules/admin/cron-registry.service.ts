import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

export interface CronJobInfo {
  name: string;
  schedule: string;
  description: string;
  module: string;
  running: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

/**
 * Registry that exposes all scheduled cron jobs for admin dashboard visibility.
 * Wraps NestJS SchedulerRegistry to provide job metadata + manual trigger support.
 */
@Injectable()
export class CronRegistryService {
  private readonly logger = new Logger(CronRegistryService.name);
  private readonly lastRuns = new Map<string, Date>();

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  /**
   * Static metadata for all known cron jobs.
   * Kept here so the admin dashboard can display descriptions without
   * coupling to each module's internals.
   */
  private static readonly JOB_METADATA: Record<string, { description: string; module: string; schedule: string }> = {
    'check-due-tasks': {
      description: 'Check tasks due within 24h and send reminders',
      module: 'Reminders',
      schedule: '0 8 * * *',
    },
    'check-overdue-tasks': {
      description: 'Check overdue tasks and send milestone reminders (1d, 3d, 7d, 14d)',
      module: 'Reminders',
      schedule: '0 */6 * * *',
    },
    'subscription-lifecycle': {
      description: 'Process subscription renewals, suspensions, and terminations',
      module: 'Subscriptions',
      schedule: '0 2 * * *',
    },
    'satellite-cache-warmup': {
      description: 'Delta-sync satellite indices for all active parcels with boundaries',
      module: 'Satellite',
      schedule: '0 3 * * *',
    },
    'satellite-monitoring-5day': {
      description: 'Delta-sync satellite data every 5 days + send summary emails to admins',
      module: 'Satellite',
      schedule: '0 4 */5 * *',
    },
    'ai-jobs-daily-weather-fetch': {
      description: 'Fetch last 7 days of historical weather for all AI-enabled parcels',
      module: 'AI Jobs',
      schedule: '0 6 * * *',
    },
    'ai-jobs-daily-pipeline-trigger': {
      description: 'Run AI diagnostics on parcels with recent satellite data, create stress alerts',
      module: 'AI Jobs',
      schedule: '0 8 * * *',
    },
    'ai-jobs-monthly-plan-reminder': {
      description: 'Log reminders for plan interventions scheduled this month',
      module: 'AI Jobs',
      schedule: '0 9 1 * *',
    },
    'ai-jobs-weekly-forecast-update': {
      description: 'Fetch 7-day weather forecasts for all AI-enabled parcels (Mondays)',
      module: 'AI Jobs',
      schedule: '0 7 * * 1',
    },
    'ai-jobs-daily-recommendation-weather-verification': {
      description: 'Expire AI recommendations past their valid_until date',
      module: 'AI Jobs',
      schedule: '0 10 * * *',
    },
    'check-audit-reminders': {
      description: 'Process unsent audit reminders and notify org admins',
      module: 'Compliance',
      schedule: '0 9 * * *',
    },
    'check-certification-expiry': {
      description: 'Check certifications expiring within 30 days, send milestone notifications',
      module: 'Compliance',
      schedule: '0 10 * * *',
    },
    'monitoring-followup-evaluation': {
      description: 'Evaluate executed AI recommendations by comparing pre/post satellite indices',
      module: 'Monitoring',
      schedule: '30 6 * * *',
    },
  };

  listAll(): CronJobInfo[] {
    const cronJobs = this.schedulerRegistry.getCronJobs();
    const result: CronJobInfo[] = [];

    for (const [name, job] of cronJobs) {
      const meta = CronRegistryService.JOB_METADATA[name];
      const cronJob = job as CronJob;
      const lastRun = this.lastRuns.get(name);

      let nextRun: string | null = null;
      try {
        const next = cronJob.nextDate();
        nextRun = next ? next.toISO() : null;
      } catch {
        // job may be stopped
      }

      result.push({
        name,
        schedule: meta?.schedule ?? '(unknown)',
        description: meta?.description ?? name,
        module: meta?.module ?? 'Unknown',
        running: (cronJob as any).running ?? false,
        lastRun: lastRun?.toISOString() ?? null,
        nextRun,
      });
    }

    // Sort by module, then schedule time
    result.sort((a, b) => a.module.localeCompare(b.module) || a.schedule.localeCompare(b.schedule));
    return result;
  }

  recordRun(jobName: string): void {
    this.lastRuns.set(jobName, new Date());
  }

  triggerJob(jobName: string): boolean {
    try {
      const job = this.schedulerRegistry.getCronJob(jobName);
      if (!job) return false;
      job.fireOnTick();
      this.recordRun(jobName);
      this.logger.log(`Manually triggered cron job: ${jobName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to trigger cron job "${jobName}": ${error.message}`);
      return false;
    }
  }

  stopJob(jobName: string): boolean {
    try {
      const job = this.schedulerRegistry.getCronJob(jobName);
      if (!job) return false;
      job.stop();
      this.logger.log(`Stopped cron job: ${jobName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to stop cron job "${jobName}": ${error.message}`);
      return false;
    }
  }

  startJob(jobName: string): boolean {
    try {
      const job = this.schedulerRegistry.getCronJob(jobName);
      if (!job) return false;
      job.start();
      this.logger.log(`Started cron job: ${jobName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to start cron job "${jobName}": ${error.message}`);
      return false;
    }
  }
}
