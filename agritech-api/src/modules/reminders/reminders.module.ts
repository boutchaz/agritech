import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { InternalAdminGuard } from '../admin/guards/internal-admin.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [RemindersController],
  providers: [RemindersService, InternalAdminGuard],
  exports: [RemindersService],
})
export class RemindersModule {}
