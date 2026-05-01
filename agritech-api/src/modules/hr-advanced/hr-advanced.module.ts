import { Module } from '@nestjs/common';
import { HrAdvancedController } from './hr-advanced.controller';
import { HrAdvancedService } from './hr-advanced.service';
import { HrCalendarController } from './hr-calendar.controller';
import { HrCalendarService } from './hr-calendar.service';
import { HrTasksBridgeService } from './hr-tasks-bridge.service';

@Module({
  controllers: [HrAdvancedController, HrCalendarController],
  providers: [HrAdvancedService, HrCalendarService, HrTasksBridgeService],
  exports: [HrAdvancedService, HrCalendarService, HrTasksBridgeService],
})
export class HrAdvancedModule {}
