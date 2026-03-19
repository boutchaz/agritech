import { Module } from '@nestjs/common';
import { PaymentRecordsController } from './payment-records.controller';
import { PaymentRecordsService } from './payment-records.service';
import { DatabaseModule } from '../database/database.module';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, JournalEntriesModule, NotificationsModule],
  controllers: [PaymentRecordsController],
  providers: [PaymentRecordsService],
  exports: [PaymentRecordsService],
})
export class PaymentRecordsModule {}
