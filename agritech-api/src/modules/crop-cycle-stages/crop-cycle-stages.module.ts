import { Module } from '@nestjs/common';
import { CropCycleStagesService } from './crop-cycle-stages.service';
import { CropCycleStagesController } from './crop-cycle-stages.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CropCycleStagesController],
  providers: [CropCycleStagesService],
  exports: [CropCycleStagesService],
})
export class CropCycleStagesModule {}
