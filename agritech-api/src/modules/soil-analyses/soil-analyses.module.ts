import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SoilAnalysesController } from './soil-analyses.controller';
import { SoilAnalysesService } from './soil-analyses.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SoilAnalysesController],
  providers: [SoilAnalysesService],
  exports: [SoilAnalysesService],
})
export class SoilAnalysesModule {}
