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
import { PricingConfigController } from './pricing-config.controller';
import { PricingConfigService } from './pricing-config.service';
import { InternalAdminGuard } from './guards/internal-admin.guard';
import { DatabaseModule } from '../database/database.module';
import { AccountsModule } from '../accounts/accounts.module';
import { SubscriptionPricingService } from '../subscriptions/subscription-pricing.service';

@Module({
  imports: [DatabaseModule, AccountsModule, ScheduleModule.forRoot()],
  controllers: [AdminController, CronJobsController, SupportedCountriesController, PolarProductsController, PricingConfigController],
  providers: [AdminService, ReferentialService, CronRegistryService, SupportedCountriesService, InternalAdminGuard, PolarProductsService, PricingConfigService, SubscriptionPricingService],
  exports: [AdminService, ReferentialService, CronRegistryService, SupportedCountriesService, PricingConfigService, InternalAdminGuard],
})
export class AdminModule {}
