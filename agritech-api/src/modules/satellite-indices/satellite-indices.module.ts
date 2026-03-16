import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DatabaseModule } from "../database/database.module";
import { SatelliteIndicesController } from "./satellite-indices.controller";
import { SatelliteIndicesService } from "./satellite-indices.service";
import { SatelliteProxyController } from "./satellite-proxy.controller";
import { SatelliteProxyService } from "./satellite-proxy.service";
import { SatelliteCacheService } from "./satellite-cache.service";
import { SatelliteSyncService } from "./satellite-sync.service";
import { MonitoringCronService } from "./monitoring-cron.service";

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [SatelliteIndicesController, SatelliteProxyController],
  providers: [
    SatelliteIndicesService,
    SatelliteProxyService,
    SatelliteCacheService,
    SatelliteSyncService,
    MonitoringCronService,
  ],
  exports: [
    SatelliteIndicesService,
    SatelliteProxyService,
    SatelliteCacheService,
    SatelliteSyncService,
    MonitoringCronService,
  ],
})
export class SatelliteIndicesModule {}
