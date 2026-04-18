import { Module } from '@nestjs/common';
import { LabServicesController } from './lab-services.controller';
import { LabServicesService } from './lab-services.service';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [LabServicesController],
  providers: [LabServicesService],
  exports: [LabServicesService],
})
export class LabServicesModule {}
