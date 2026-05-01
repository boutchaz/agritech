import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SequencesModule } from '../sequences/sequences.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccountsModule } from '../accounts/accounts.module';
import { StockEntriesController } from './stock-entries.controller';
import { StockEntriesService } from './stock-entries.service';
import { StockAccountingService } from './stock-accounting.service';
import { StockReservationsService } from './stock-reservations.service';
import { StockEntryApprovalsService } from './stock-entry-approvals.service';

@Module({
  imports: [DatabaseModule, SequencesModule, NotificationsModule, AccountsModule],
  controllers: [StockEntriesController],
  providers: [
    StockEntriesService,
    StockAccountingService,
    StockReservationsService,
    StockEntryApprovalsService,
  ],
  exports: [
    StockEntriesService,
    StockAccountingService,
    StockReservationsService,
    StockEntryApprovalsService,
  ],
})
export class StockEntriesModule {}
