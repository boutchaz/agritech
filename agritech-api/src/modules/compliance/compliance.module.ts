import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ComplianceService } from './compliance.service';
import { ComplianceReportsService } from './compliance-reports.service';
import { ComplianceRemindersService } from './compliance-reminders.service';
import { CorrectiveActionsService } from './corrective-actions.service';
import { ComplianceController } from './compliance.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    EmailModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceReportsService, ComplianceRemindersService, CorrectiveActionsService],
  exports: [ComplianceService, ComplianceReportsService, CorrectiveActionsService],
})
export class ComplianceModule {}
