import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { DatabaseModule } from '../database/database.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AccountsModule } from '../accounts/accounts.module';
import { FiscalYearsModule } from '../fiscal-years/fiscal-years.module';
import { DemoDataModule } from '../demo-data/demo-data.module';

@Module({
  imports: [DatabaseModule, SubscriptionsModule, AccountsModule, FiscalYearsModule, DemoDataModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
