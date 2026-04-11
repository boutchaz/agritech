import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ReferentialService } from './referential.service';
import { CronJobsController } from './cron-jobs.controller';
import { CronRegistryService } from './cron-registry.service';
import { InternalAdminGuard } from './guards/internal-admin.guard';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [AdminController, CronJobsController],
  providers: [AdminService, ReferentialService, CronRegistryService, InternalAdminGuard],
  exports: [AdminService, ReferentialService, CronRegistryService],
})
export class AdminModule {}
