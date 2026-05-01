import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SequencesModule } from '../sequences/sequences.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StockEntriesModule } from '../stock-entries/stock-entries.module';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { PaymentsModule } from '../payments/payments.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [DatabaseModule, SequencesModule, NotificationsModule, StockEntriesModule, JournalEntriesModule, PaymentsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
