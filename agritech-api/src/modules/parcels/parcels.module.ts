import { Module } from '@nestjs/common';
import { ParcelsController } from './parcels.controller';
import { ParcelsService } from './parcels.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CalibrationModule } from '../calibration/calibration.module';

@Module({
  imports: [SubscriptionsModule, CalibrationModule],
  controllers: [ParcelsController],
  providers: [ParcelsService],
  exports: [ParcelsService],
})
export class ParcelsModule {}
