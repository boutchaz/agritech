import { Module, forwardRef } from "@nestjs/common";
import { AIReportsModule } from "../ai-reports/ai-reports.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SatelliteIndicesModule } from "../satellite-indices/satellite-indices.module";
import { CalibrationController } from "./calibration.controller";
import { CalibrationService } from "./calibration.service";
import { CalibrationStateMachine } from "./calibration-state-machine";
import { NutritionOptionService } from "./nutrition-option.service";
import { F3RecalibrationService } from "./f3-recalibration.service";

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AIReportsModule),
    SatelliteIndicesModule,
    NotificationsModule,
  ],
  controllers: [CalibrationController],
  providers: [
    CalibrationService,
    CalibrationStateMachine,
    NutritionOptionService,
    F3RecalibrationService,
  ],
  exports: [
    CalibrationService,
    CalibrationStateMachine,
    NutritionOptionService,
    F3RecalibrationService,
  ],
})
export class CalibrationModule {}
