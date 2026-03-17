import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { HealthService } from './health.service';
import { AlertService } from './alert.service';
import { HealthCronService } from './health-cron.service';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule, DatabaseModule, EmailModule],
  controllers: [HealthController],
  providers: [HealthService, AlertService, HealthCronService],
  exports: [HealthService, AlertService],
})
export class HealthModule {}
