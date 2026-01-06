import { Module } from '@nestjs/common';
import { ProfitabilityController } from './profitability.controller';
import { ProfitabilityService } from './profitability.service';
import { DatabaseModule } from '../database/database.module';
import { CaslModule } from '../casl/casl.module';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';

@Module({
  imports: [DatabaseModule, CaslModule, JournalEntriesModule],
  controllers: [ProfitabilityController],
  providers: [ProfitabilityService],
  exports: [ProfitabilityService],
})
export class ProfitabilityModule {}
