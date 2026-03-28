import { Module } from '@nestjs/common';
import { AiQuotaModule } from '../ai-quota/ai-quota.module';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiAlertsController } from './ai-alerts.controller';
import { AiAlertsService } from './ai-alerts.service';

@Module({
  imports: [
    AiQuotaModule,DatabaseModule, NotificationsModule],
  controllers: [AiAlertsController],
  providers: [AiAlertsService],
  exports: [AiAlertsService],
})
export class AiAlertsModule {}
