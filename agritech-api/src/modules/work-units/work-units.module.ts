import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WorkUnitsController } from './work-units.controller';
import { WorkUnitsService } from './work-units.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WorkUnitsController],
  providers: [WorkUnitsService],
  exports: [WorkUnitsService],
})
export class WorkUnitsModule {}
