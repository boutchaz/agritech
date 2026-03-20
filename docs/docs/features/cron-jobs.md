---
sidebar_position: 15
title: "Scheduled Jobs & Cron"
---

# Scheduled Jobs & Cron

## Overview

The API uses the `@nestjs/schedule` package to register cron jobs via the `@Cron` decorator. All scheduled jobs run in the same NestJS process and are configured with the **UTC** timezone. Jobs span several modules: AI pipeline, task reminders, compliance, satellite data synchronization, subscription lifecycle, and monitoring follow-up evaluation.

## Complete Cron Job Table

| Schedule | Name | Module | Service | Method | Purpose |
|----------|------|--------|---------|--------|---------|
| `0 2 * * *` (daily 02:00) | `subscription-lifecycle` | Subscriptions | `SubscriptionsService` | `processLifecycleAutomation()` | Runs daily lifecycle automation: pending migrations, renewal notices, overdue transitions, suspensions, and termination window checks |
| `0 3 * * *` (daily 03:00) | `satellite-cache-warmup` | Satellite Indices | `SatelliteSyncService` | `scheduledSync()` | Warms the satellite data cache by running a full sync of all parcels with boundaries, fetching last 6 months of core indices (NIRv, EVI, NDRE, NDMI) |
| `0 4 */5 * *` (every 5 days 04:00) | `satellite-monitoring-5day` | Satellite Indices | `MonitoringCronService` | `runMonitoringCycle()` | Syncs the last 10 days of satellite data (NDVI, NDRE, NDMI, EVI, NIRv) for all parcels in active AI phases. Has a mutex guard to prevent overlapping runs |
| `0 6 * * *` (daily 06:00) | `ai-jobs-daily-weather-fetch` | AI Jobs | `AiJobsService` | `runDailyWeatherFetch()` | Fetches the last 7 days of historical weather data for all AI-enabled parcels and upserts into `weather_daily_data` |
| `30 6 * * *` (daily 06:30) | `monitoring-followup-evaluation` | Monitoring | `FollowupService` | `evaluateExecutedRecommendations()` | Evaluates executed AI recommendations by comparing satellite index values before and after execution to classify efficacy as effective, partial, or ineffective |
| `0 7 * * 1` (Mondays 07:00) | `ai-jobs-weekly-forecast-update` | AI Jobs | `AiJobsService` | `runWeeklyForecastUpdate()` | Fetches 7-day weather forecasts for all AI-enabled parcels and upserts into `weather_forecasts` |
| `0 8 * * *` (daily 08:00) | `ai-jobs-daily-pipeline-trigger` | AI Jobs | `AiJobsService` | `runDailyAiPipelineTrigger()` | Runs AI diagnostics on each AI-enabled parcel that has recent satellite data (within 14 days). Creates stress alerts and recommendations for scenario codes C, D, E, F. Skips alert/recommendation creation for observation-only parcels |
| `0 8 * * *` (daily 08:00) | `check-due-tasks` | Reminders | `RemindersService` | `checkDueTasks()` | Finds tasks due within the next 24 hours that are still pending/assigned/in-progress. Sends `task_reminder` in-app notifications and optional emails. Records sent reminders to avoid duplicates |
| `0 */6 * * *` (every 6 hours) | `check-overdue-tasks` | Reminders | `RemindersService` | `checkOverdueTasks()` | Checks for overdue tasks and sends reminders at 1-day and 3-day overdue milestones. Respects user notification preferences |
| `0 9 * * *` (daily 09:00) | `check-audit-reminders` | Compliance | `ComplianceRemindersService` | `checkAuditReminders()` | Processes unsent audit reminders whose `scheduled_for` date has passed. Sends in-app notifications and optional emails to organization admins and farm managers |
| `0 9 1 * *` (1st of month 09:00) | `ai-jobs-monthly-plan-reminder` | AI Jobs | `AiJobsService` | `runMonthlyPlanReminder()` | Logs reminders for plan interventions scheduled for the current month that are still in `planned` status |
| `0 10 * * *` (daily 10:00) | `check-certification-expiry` | Compliance | `ComplianceRemindersService` | `checkCertificationExpiry()` | Checks for active certifications expiring within 30 days. Sends notifications at 30, 14, 7, and 1-day milestones to organization admins |
| `0 10 * * *` (daily 10:00) | `ai-jobs-daily-recommendation-weather-verification` | AI Jobs | `AiJobsService` | `runDailyRecommendationWeatherVerification()` | Finds pending AI recommendations whose `valid_until` date has passed and marks them as `expired` |

## Job Execution Order

The jobs are staggered throughout the early morning hours (UTC) to avoid resource contention:

```
02:00  subscription-lifecycle
03:00  satellite-cache-warmup
04:00  satellite-monitoring-5day (every 5 days)
06:00  ai-jobs-daily-weather-fetch
06:30  monitoring-followup-evaluation
07:00  ai-jobs-weekly-forecast-update (Mondays only)
08:00  ai-jobs-daily-pipeline-trigger
08:00  check-due-tasks
09:00  check-audit-reminders
09:00  ai-jobs-monthly-plan-reminder (1st of month)
10:00  check-certification-expiry
10:00  ai-jobs-daily-recommendation-weather-verification

Every 6h  check-overdue-tasks (00:00, 06:00, 12:00, 18:00)
```

## Job Dependencies

Several jobs form a data pipeline where the output of one feeds into the next:

1. **Satellite cache warmup** (03:00) and **satellite monitoring** (every 5 days at 04:00) populate `satellite_indices_data` with fresh vegetation index values.
2. **Daily weather fetch** (06:00) populates `weather_daily_data` with meteorological observations.
3. **Monitoring followup evaluation** (06:30) reads satellite index data to evaluate whether executed recommendations were effective.
4. **Weekly forecast update** (Mondays 07:00) populates `weather_forecasts` with 7-day predictions.
5. **Daily AI pipeline trigger** (08:00) reads both satellite and weather data to run diagnostics and generate alerts/recommendations for stressed parcels.
6. **Recommendation weather verification** (10:00) expires stale pending recommendations that are past their validity window.

## Concurrency Guards

Some jobs include safeguards against overlapping execution:

- **`MonitoringCronService`** uses a `running` boolean flag. If a monitoring cycle is already in progress when the cron fires again, the new invocation is skipped.
- **`SatelliteSyncService`** checks `this.progress.status === 'running'` before starting a full sync. If a sync is already running, it returns the current progress without starting a new one.

## User Preferences

The **Reminders** and **Compliance** cron jobs respect user notification preferences stored in the `user_notification_preferences` table:

- `task_reminders_enabled` -- master toggle for task reminders.
- `email_notifications` -- whether to send email in addition to in-app notifications.
- `audit_reminders_enabled` -- master toggle for audit reminders.
- `audit_reminder_30d_before`, `audit_reminder_14d_before`, `audit_reminder_7d_before`, `audit_reminder_1d_before` -- granular control over which audit reminder milestones to receive.
- `certification_expiry_reminders` -- toggle for certification expiry alerts.

## Key Source Files

| File | Jobs Defined |
|------|-------------|
| `modules/subscriptions/subscriptions.service.ts` | `subscription-lifecycle` |
| `modules/satellite-indices/satellite-sync.service.ts` | `satellite-cache-warmup` |
| `modules/satellite-indices/monitoring-cron.service.ts` | `satellite-monitoring-5day` |
| `modules/ai-jobs/ai-jobs.service.ts` | `ai-jobs-daily-weather-fetch`, `ai-jobs-daily-pipeline-trigger`, `ai-jobs-monthly-plan-reminder`, `ai-jobs-weekly-forecast-update`, `ai-jobs-daily-recommendation-weather-verification` |
| `modules/monitoring/followup.service.ts` | `monitoring-followup-evaluation` |
| `modules/reminders/reminders.service.ts` | `check-due-tasks`, `check-overdue-tasks` |
| `modules/compliance/compliance-reminders.service.ts` | `check-audit-reminders`, `check-certification-expiry` |
