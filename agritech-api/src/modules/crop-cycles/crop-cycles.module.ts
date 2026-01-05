import { Module } from '@nestjs/common';
import { CropCyclesService } from './crop-cycles.service';
import { CropCyclesController } from './crop-cycles.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CropCyclesController],
  providers: [CropCyclesService],
  exports: [CropCyclesService],
})
export class CropCyclesModule {}
