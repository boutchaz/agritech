import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { ReceptionBatchesModule } from '../reception-batches/reception-batches.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [JournalEntriesModule, ReceptionBatchesModule, NotificationsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
