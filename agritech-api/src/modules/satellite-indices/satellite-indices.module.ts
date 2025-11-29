import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SatelliteIndicesController } from './satellite-indices.controller';
import { SatelliteIndicesService } from './satellite-indices.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SatelliteIndicesController],
  providers: [SatelliteIndicesService],
  exports: [SatelliteIndicesService],
})
export class SatelliteIndicesModule {}
