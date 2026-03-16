import { Module } from "@nestjs/common";
import { CalibrationModule } from "../calibration/calibration.module";
import { DatabaseModule } from "../database/database.module";
import { SeasonTrackingController } from "./season-tracking.controller";
import { SeasonTrackingService } from "./season-tracking.service";

@Module({
  imports: [DatabaseModule, CalibrationModule],
  controllers: [SeasonTrackingController],
  providers: [SeasonTrackingService],
  exports: [SeasonTrackingService],
})
export class SeasonTrackingModule {}
