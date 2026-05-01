import { Module } from '@nestjs/common';
import { ExpenseClaimsController } from './expense-claims.controller';
import { ExpenseClaimsService } from './expense-claims.service';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';

@Module({
  imports: [JournalEntriesModule],
  controllers: [ExpenseClaimsController],
  providers: [ExpenseClaimsService],
  exports: [ExpenseClaimsService],
})
export class ExpenseClaimsModule {}
