import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { OrganizationGroupsController } from './organization-groups.controller';
import { OrganizationGroupsService } from './organization-groups.service';
import { ConsolidatedReportsService } from './consolidated-reports.service';
import { ConsolidatedReportsController } from './consolidated-reports.controller';

@Module({
  imports: [DatabaseModule, ExchangeRatesModule, JournalEntriesModule],
  controllers: [OrganizationGroupsController, ConsolidatedReportsController],
  providers: [OrganizationGroupsService, ConsolidatedReportsService],
  exports: [OrganizationGroupsService, ConsolidatedReportsService],
})
export class OrganizationGroupsModule {}
