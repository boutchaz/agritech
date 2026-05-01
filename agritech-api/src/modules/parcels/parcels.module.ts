import { Module } from "@nestjs/common";
import { ParcelsController } from "./parcels.controller";
import { ParcelsService } from "./parcels.service";
import { DatabaseModule } from "../database/database.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CalibrationModule } from "../calibration/calibration.module";
import { SatelliteIndicesModule } from "../satellite-indices/satellite-indices.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    DatabaseModule,
    SubscriptionsModule,
    CalibrationModule,
    SatelliteIndicesModule,
    NotificationsModule,
  ],
  controllers: [ParcelsController],
  providers: [ParcelsService],
  exports: [ParcelsService],
})
export class ParcelsModule {}
