import { Module } from '@nestjs/common';
import { CaslModule } from '../casl/casl.module';
import { LeaveTypesController } from './leave-types.controller';
import { LeaveTypesService } from './leave-types.service';
import { LeaveAllocationsController } from './leave-allocations.controller';
import { LeaveAllocationsService } from './leave-allocations.service';
import { LeaveApplicationsController } from './leave-applications.controller';
import { LeaveApplicationsService } from './leave-applications.service';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';

@Module({
  imports: [CaslModule],
  controllers: [
    LeaveTypesController,
    LeaveAllocationsController,
    LeaveApplicationsController,
    HolidaysController,
  ],
  providers: [
    LeaveTypesService,
    LeaveAllocationsService,
    LeaveApplicationsService,
    HolidaysService,
  ],
  exports: [
    LeaveTypesService,
    LeaveAllocationsService,
    LeaveApplicationsService,
    HolidaysService,
  ],
})
export class LeaveManagementModule {}
