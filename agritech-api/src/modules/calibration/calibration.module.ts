import { Module, forwardRef } from "@nestjs/common";
import { AiQuotaModule } from '../ai-quota/ai-quota.module';
import { AIReportsModule } from "../ai-reports/ai-reports.module";
import { AnnualPlanModule } from "../annual-plan/annual-plan.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SatelliteIndicesModule } from "../satellite-indices/satellite-indices.module";
import { CalibrationController } from "./calibration.controller";
import { CalibrationExportController } from "./calibration-export.controller";
import { CalibrationExportService } from "./calibration-export.service";
import { CalibrationService } from "./calibration.service";
import { CalibrationDraftService } from "./calibration-draft.service";
import { CalibrationDataService } from "./calibration-data.service";
import { CalibrationStateMachine } from "./calibration-state-machine";
import { NutritionOptionService } from "./nutrition-option.service";
import { AnnualRecalibrationService } from "./annual-recalibration.service";
import { CalibrationReviewAdapter } from "./calibration-review.adapter";
import { TargetYieldService } from "./target-yield.service";

@Module({
  imports: [
    AiQuotaModule,
    DatabaseModule,
    forwardRef(() => AIReportsModule),
    AnnualPlanModule,
    SatelliteIndicesModule,
    NotificationsModule,
  ],
  controllers: [CalibrationController, CalibrationExportController],
  providers: [
    CalibrationService,
    CalibrationDraftService,
    CalibrationDataService,
    CalibrationExportService,
    CalibrationStateMachine,
    NutritionOptionService,
    AnnualRecalibrationService,
    CalibrationReviewAdapter,
    TargetYieldService,
  ],
  exports: [
    CalibrationService,
    CalibrationStateMachine,
    NutritionOptionService,
    AnnualRecalibrationService,
    TargetYieldService,
  ],
})
export class CalibrationModule {}
