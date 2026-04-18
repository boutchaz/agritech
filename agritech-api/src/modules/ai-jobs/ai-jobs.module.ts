import { Module } from '@nestjs/common';
import { AiQuotaModule } from '../ai-quota/ai-quota.module';
import { AiAlertsModule } from '../ai-alerts/ai-alerts.module';
import { AiDiagnosticsModule } from '../ai-diagnostics/ai-diagnostics.module';
import { AiRecommendationsModule } from '../ai-recommendations/ai-recommendations.module';
import { DatabaseModule } from '../database/database.module';
import { AiJobsService } from './ai-jobs.service';

@Module({
  imports: [
    AiQuotaModule,DatabaseModule, AiDiagnosticsModule, AiAlertsModule, AiRecommendationsModule],
  providers: [AiJobsService],
  exports: [AiJobsService],
})
export class AiJobsModule {}
