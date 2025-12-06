import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SequencesModule } from '../sequences/sequences.module';
import { AccountingController } from './journal-entries.controller';
import { JournalEntriesCrudController } from './journal-entries-crud.controller';
import { AccountingAutomationService } from './accounting-automation.service';
import { JournalEntriesService } from './journal-entries.service';

@Module({
  imports: [DatabaseModule, SequencesModule],
  controllers: [AccountingController, JournalEntriesCrudController],
  providers: [AccountingAutomationService, JournalEntriesService],
  exports: [AccountingAutomationService, JournalEntriesService],
})
export class JournalEntriesModule {}
