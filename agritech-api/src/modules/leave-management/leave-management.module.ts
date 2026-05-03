import { Module } from '@nestjs/common';
import { CaslModule } from '../casl/casl.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeaveTypesController } from './leave-types.controller';
import { LeaveTypesService } from './leave-types.service';
import { LeaveAllocationsController } from './leave-allocations.controller';
import { LeaveAllocationsService } from './leave-allocations.service';
import { LeaveApplicationsController } from './leave-applications.controller';
import { LeaveApplicationsService } from './leave-applications.service';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';
import { LeaveBlockDatesController } from './leave-block-dates.controller';
import { LeaveBlockDatesService } from './leave-block-dates.service';
import { LeaveEncashmentsController } from './leave-encashments.controller';
import { LeaveEncashmentsService } from './leave-encashments.service';

@Module({
  imports: [CaslModule, NotificationsModule],
  controllers: [
    LeaveTypesController,
    LeaveAllocationsController,
    LeaveApplicationsController,
    HolidaysController,
    LeaveBlockDatesController,
    LeaveEncashmentsController,
  ],
  providers: [
    LeaveTypesService,
    LeaveAllocationsService,
    LeaveApplicationsService,
    HolidaysService,
    LeaveBlockDatesService,
    LeaveEncashmentsService,
  ],
  exports: [
    LeaveTypesService,
    LeaveAllocationsService,
    LeaveApplicationsService,
    HolidaysService,
    LeaveBlockDatesService,
    LeaveEncashmentsService,
  ],
})
export class LeaveManagementModule {}
