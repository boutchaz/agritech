import { Module, forwardRef } from '@nestjs/common';
import { AIReportsModule } from '../ai-reports/ai-reports.module';
import { DatabaseModule } from '../database/database.module';
import { CalibrationController } from './calibration.controller';
import { CalibrationService } from './calibration.service';
import { CalibrationStateMachine } from './calibration-state-machine';
import { NutritionOptionService } from './nutrition-option.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => AIReportsModule)],
  controllers: [CalibrationController],
  providers: [CalibrationService, CalibrationStateMachine, NutritionOptionService],
  exports: [CalibrationService, CalibrationStateMachine, NutritionOptionService],
})
export class CalibrationModule {}
