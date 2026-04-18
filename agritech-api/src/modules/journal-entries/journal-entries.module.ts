import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SequencesModule } from '../sequences/sequences.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FiscalYearsModule } from '../fiscal-years/fiscal-years.module';
import { AccountingController } from './journal-entries.controller';
import { JournalEntriesCrudController } from './journal-entries-crud.controller';
import { FinancialReportsController } from './financial-reports.controller';
import { AccountingAutomationService } from './accounting-automation.service';
import { JournalEntriesService } from './journal-entries.service';
import { FinancialReportsService } from './financial-reports.service';

@Module({
  imports: [DatabaseModule, SequencesModule, NotificationsModule, FiscalYearsModule],
  controllers: [AccountingController, JournalEntriesCrudController, FinancialReportsController],
  providers: [AccountingAutomationService, JournalEntriesService, FinancialReportsService],
  exports: [AccountingAutomationService, JournalEntriesService, FinancialReportsService],
})
export class JournalEntriesModule {}
