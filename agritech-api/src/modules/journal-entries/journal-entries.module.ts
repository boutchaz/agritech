import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AccountingController } from './journal-entries.controller';
import { AccountingAutomationService } from './accounting-automation.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AccountingController],
  providers: [AccountingAutomationService],
  exports: [AccountingAutomationService],
})
export class JournalEntriesModule {}
