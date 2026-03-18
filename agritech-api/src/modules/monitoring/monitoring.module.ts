import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FollowupService } from './followup.service';
import { InterventionWindowsService } from './intervention-windows.service';
import { MonitoringPipelineService } from './monitoring-pipeline.service';
import { MonitoringReferentialService } from './monitoring-referential.service';
import { PhenologyService } from './phenology.service';
import { WeatherGateService } from './weather-gate.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    MonitoringReferentialService,
    PhenologyService,
    InterventionWindowsService,
    WeatherGateService,
    MonitoringPipelineService,
    FollowupService,
  ],
  exports: [
    MonitoringReferentialService,
    PhenologyService,
    InterventionWindowsService,
    WeatherGateService,
    MonitoringPipelineService,
    FollowupService,
  ],
})
export class MonitoringModule {}
