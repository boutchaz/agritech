import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FiscalYearsController } from './fiscal-years.controller';
import { FiscalYearsService } from './fiscal-years.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FiscalYearsController],
  providers: [FiscalYearsService],
  exports: [FiscalYearsService],
})
export class FiscalYearsModule {}
