import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FinancialReportsController } from './financial-reports.controller';
import { AgedReportsService } from './financial-reports.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FinancialReportsController],
  providers: [AgedReportsService],
  exports: [AgedReportsService],
})
export class FinancialReportsModule {}
