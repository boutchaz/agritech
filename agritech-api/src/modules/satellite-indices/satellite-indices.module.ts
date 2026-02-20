import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SatelliteIndicesController } from './satellite-indices.controller';
import { SatelliteIndicesService } from './satellite-indices.service';
import { SatelliteProxyController } from './satellite-proxy.controller';
import { SatelliteProxyService } from './satellite-proxy.service';
import { SatelliteCacheService } from './satellite-cache.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SatelliteIndicesController, SatelliteProxyController],
  providers: [SatelliteIndicesService, SatelliteProxyService, SatelliteCacheService],
  exports: [SatelliteIndicesService, SatelliteProxyService, SatelliteCacheService],
})
export class SatelliteIndicesModule {}
