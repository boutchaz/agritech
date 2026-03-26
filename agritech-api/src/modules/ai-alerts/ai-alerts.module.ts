import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiAlertsController } from './ai-alerts.controller';
import { AiAlertsService } from './ai-alerts.service';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [AiAlertsController],
  providers: [AiAlertsService],
  exports: [AiAlertsService],
})
export class AiAlertsModule {}
