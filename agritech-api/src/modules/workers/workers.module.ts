import { Module } from '@nestjs/common';
import { WorkersController } from './workers.controller';
import { WorkersMeController } from './workers-me.controller';
import { WorkersService } from './workers.service';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';

@Module({
  imports: [EmailModule, NotificationsModule, JournalEntriesModule],
  controllers: [WorkersController, WorkersMeController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
