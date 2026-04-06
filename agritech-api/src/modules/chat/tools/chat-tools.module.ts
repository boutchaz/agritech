import { Module } from '@nestjs/common';
import { AnnualPlanModule } from '../../annual-plan/annual-plan.module';
import { TasksModule } from '../../tasks/tasks.module';
import { HarvestsModule } from '../../harvests/harvests.module';
import { ProductApplicationsModule } from '../../product-applications/product-applications.module';
import { ParcelEventsModule } from '../../parcel-events/parcel-events.module';
import { StockEntriesModule } from '../../stock-entries/stock-entries.module';
import { TaskAssignmentsModule } from '../../task-assignments/task-assignments.module';
import { ChatToolsService } from './chat-tools.service';
import { PendingActionService } from './pending-action.service';

@Module({
  imports: [
    TasksModule,
    AnnualPlanModule,
    HarvestsModule,
    ProductApplicationsModule,
    ParcelEventsModule,
    StockEntriesModule,
    TaskAssignmentsModule,
  ],
  providers: [ChatToolsService, PendingActionService],
  exports: [ChatToolsService],
})
export class ChatToolsModule {}
