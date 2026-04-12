import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionsController, WebhooksController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPricingService } from './subscription-pricing.service';
import { PolarCheckoutService } from './polar-checkout.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SubscriptionsController, WebhooksController],
  providers: [SubscriptionsService, SubscriptionPricingService, PolarCheckoutService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
