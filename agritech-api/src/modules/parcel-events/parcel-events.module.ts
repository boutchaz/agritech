import { Module, forwardRef } from "@nestjs/common";
import { CalibrationModule } from "../calibration/calibration.module";
import { DatabaseModule } from "../database/database.module";
import { ParcelEventsController } from "./parcel-events.controller";
import { ParcelEventsService } from "./parcel-events.service";

@Module({
  // Breaks: CalibrationModule → AIReportsModule → ChatModule → ChatToolsModule → ParcelEventsModule → CalibrationModule
  imports: [DatabaseModule, forwardRef(() => CalibrationModule)],
  controllers: [ParcelEventsController],
  providers: [ParcelEventsService],
  exports: [ParcelEventsService],
})
export class ParcelEventsModule {}
