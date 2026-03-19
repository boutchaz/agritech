import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SequencesModule } from '../sequences/sequences.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StockEntriesController } from './stock-entries.controller';
import { StockEntriesService } from './stock-entries.service';
import { StockAccountingService } from './stock-accounting.service';

@Module({
  imports: [DatabaseModule, SequencesModule, NotificationsModule],
  controllers: [StockEntriesController],
  providers: [StockEntriesService, StockAccountingService],
  exports: [StockEntriesService, StockAccountingService],
})
export class StockEntriesModule {}
