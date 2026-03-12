import { Module } from '@nestjs/common';
import { AiAlertsModule } from '../ai-alerts/ai-alerts.module';
import { AiDiagnosticsModule } from '../ai-diagnostics/ai-diagnostics.module';
import { DatabaseModule } from '../database/database.module';
import { AiJobsService } from './ai-jobs.service';

@Module({
  imports: [DatabaseModule, AiDiagnosticsModule, AiAlertsModule],
  providers: [AiJobsService],
  exports: [AiJobsService],
})
export class AiJobsModule {}
