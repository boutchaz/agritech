import { Module } from '@nestjs/common';
import { PaymentRecordsController } from './payment-records.controller';
import { PaymentRecordsService } from './payment-records.service';
import { DatabaseModule } from '../database/database.module';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';

@Module({
  imports: [DatabaseModule, JournalEntriesModule],
  controllers: [PaymentRecordsController],
  providers: [PaymentRecordsService],
  exports: [PaymentRecordsService],
})
export class PaymentRecordsModule {}
