import { Module } from '@nestjs/common';
import { LabServicesController } from './lab-services.controller';
import { LabServicesService } from './lab-services.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [LabServicesController],
  providers: [LabServicesService],
  exports: [LabServicesService],
})
export class LabServicesModule {}
