import { Module } from '@nestjs/common';
import { HarvestEventsService } from './harvest-events.service';
import { HarvestEventsController } from './harvest-events.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [HarvestEventsController],
  providers: [HarvestEventsService],
  exports: [HarvestEventsService],
})
export class HarvestEventsModule {}
