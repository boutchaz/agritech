import { Module } from '@nestjs/common';
import { PestAlertsController } from './pest-alerts.controller';
import { PestAlertsService } from './pest-alerts.service';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [PestAlertsController],
  providers: [PestAlertsService],
  exports: [PestAlertsService],
})
export class PestAlertsModule {}
