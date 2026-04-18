import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionsController, WebhooksController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPricingService } from './subscription-pricing.service';
import { PolarCheckoutService } from './polar-checkout.service';
import { DatabaseModule } from '../database/database.module';
import { PricingConfigService } from '../admin/pricing-config.service';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [SubscriptionsController, WebhooksController],
  providers: [SubscriptionsService, SubscriptionPricingService, PolarCheckoutService, PricingConfigService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
