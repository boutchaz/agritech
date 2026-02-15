import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

/**
 * Polar.sh webhook event types
 * Based on: https://docs.polar.sh/api/webhooks
 */
export enum PolarWebhookEventType {
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_ACTIVE = 'subscription.active',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  SUBSCRIPTION_REVOKED = 'subscription.revoked',
  SUBSCRIPTION_TRIING_ENDING = 'subscription.trial_ending',
}

/**
 * Subscription data from Polar.sh webhook
 */
export class PolarSubscriptionData {
  @ApiProperty({ description: 'Subscription ID in Polar.sh' })
  id: string;

  @ApiProperty({ description: 'Organization ID in our system' })
  organization_id: string;

  @ApiProperty({ description: 'Subscription status' })
  status: string;

  @ApiProperty({ description: 'Product/Plan ID' })
  product_id: string;

  @ApiProperty({ description: 'Product price ID' })
  price_id: string;

  @ApiProperty({ description: 'Current period start date' })
  current_period_start: string;

  @ApiProperty({ description: 'Current period end date' })
  current_period_end: string;

  @ApiProperty({ description: 'Cancel at period end flag' })
  cancel_at_period_end: boolean;

  @ApiProperty({ description: 'Subscription created at timestamp' })
  created_at: string;

  @ApiProperty({ description: 'Subscription updated at timestamp', required: false })
  updated_at?: string;

  @ApiProperty({ description: 'User ID from Polar.sh', required: false })
  user_id?: string;

  @ApiProperty({ description: 'Customer ID from Polar.sh', required: false })
  customer_id?: string;

  @ApiProperty({ description: 'Amount in cents', required: false })
  amount?: number;

  @ApiProperty({ description: 'Currency code', required: false })
  currency?: string;

  @ApiProperty({ description: 'Whether subscription is recurring', required: false })
  recurring?: boolean;

  @ApiProperty({ description: 'Trial end date', required: false })
  trial_end?: string;

  @ApiProperty({ description: 'Plan type sent in checkout metadata', required: false })
  plan_type?: string;

  @ApiProperty({ description: 'Raw metadata payload from Polar', required: false })
  metadata?: Record<string, any>;
}

/**
 * Polar.sh webhook payload structure
 */
export class PolarWebhookPayload {
  @ApiProperty({ description: 'Webhook event type', enum: PolarWebhookEventType })
  type: PolarWebhookEventType;

  @ApiProperty({ description: 'Event data payload' })
  data: {
    id: string;
    type: string;
    attributes: PolarSubscriptionData & {
      metadata?: Record<string, any>;
    };
    relationships?: Record<string, any>;
  };

  @ApiProperty({ description: 'Webhook ID for idempotency' })
  id: string;

  @ApiProperty({ description: 'Webhook creation timestamp' })
  created_at: string;
}

/**
 * DTO for Polar webhook endpoint
 */
export class PolarWebhookDto {
  @ApiProperty({ description: 'Webhook event type', enum: PolarWebhookEventType })
  @IsEnum(PolarWebhookEventType)
  type: PolarWebhookEventType;

  @ApiProperty({ description: 'Event data payload' })
  @IsObject()
  data: any;

  @ApiProperty({ description: 'Webhook ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Webhook creation timestamp' })
  @IsString()
  created_at: string;
}
