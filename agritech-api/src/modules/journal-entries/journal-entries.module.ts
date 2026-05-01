import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SequencesModule } from '../sequences/sequences.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FiscalYearsModule } from '../fiscal-years/fiscal-years.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { AccountingController } from './journal-entries.controller';
import { JournalEntriesCrudController } from './journal-entries-crud.controller';
import { FinancialReportsController } from './financial-reports.controller';
import { AccountingAutomationService } from './accounting-automation.service';
import { JournalEntriesService } from './journal-entries.service';
import { FinancialReportsService } from './financial-reports.service';
import { FxRevaluationService } from './fx-revaluation.service';

@Module({
  imports: [DatabaseModule, SequencesModule, NotificationsModule, FiscalYearsModule, ExchangeRatesModule],
  controllers: [AccountingController, JournalEntriesCrudController, FinancialReportsController],
  providers: [AccountingAutomationService, JournalEntriesService, FinancialReportsService, FxRevaluationService],
  exports: [AccountingAutomationService, JournalEntriesService, FinancialReportsService, FxRevaluationService],
})
export class JournalEntriesModule {}
