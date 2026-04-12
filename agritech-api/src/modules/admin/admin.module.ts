import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ReferentialService } from './referential.service';
import { CronJobsController } from './cron-jobs.controller';
import { CronRegistryService } from './cron-registry.service';
import { SupportedCountriesService } from './supported-countries.service';
import { SupportedCountriesController } from './supported-countries.controller';
import { PolarProductsController } from './polar-products.controller';
import { PolarProductsService } from './polar-products.service';
import { InternalAdminGuard } from './guards/internal-admin.guard';
import { DatabaseModule } from '../database/database.module';
import { SubscriptionPricingService } from '../subscriptions/subscription-pricing.service';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [AdminController, CronJobsController, SupportedCountriesController, PolarProductsController],
  providers: [AdminService, ReferentialService, CronRegistryService, SupportedCountriesService, InternalAdminGuard, PolarProductsService, SubscriptionPricingService],
  exports: [AdminService, ReferentialService, CronRegistryService, SupportedCountriesService],
})
export class AdminModule {}
