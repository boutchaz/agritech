import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceReportsService } from './compliance-reports.service';
import { ComplianceController } from './compliance.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceReportsService],
  exports: [ComplianceService, ComplianceReportsService],
})
export class ComplianceModule {}
