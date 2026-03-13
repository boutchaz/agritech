import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CalibrationController } from './calibration.controller';
import { CalibrationService } from './calibration.service';
import { CalibrationStateMachine } from './calibration-state-machine';
import { NutritionOptionService } from './nutrition-option.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CalibrationController],
  providers: [CalibrationService, CalibrationStateMachine, NutritionOptionService],
  exports: [CalibrationService, CalibrationStateMachine, NutritionOptionService],
})
export class CalibrationModule {}
