import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle, SubscriptionFormula } from '../subscription-domain';

export enum CheckoutPlanInput {
  STARTER = 'starter',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  CORE = 'core',
  ESSENTIAL = 'essential',
  PROFESSIONAL = 'professional',
}

export enum BillingCycleInput {
  MONTH = 'month',
  MONTHLY = 'monthly',
  YEAR = 'year',
  YEARLY = 'yearly',
  ANNUAL = 'annual',
  SEMIANNUAL = 'semiannual',
  SEMESTRIAL = 'semestrial',
}

export class CheckoutDto {
  @ApiPropertyOptional({
    description: 'Canonical subscription formula or legacy plan alias',
    enum: CheckoutPlanInput,
    example: CheckoutPlanInput.STANDARD,
  })
  @IsEnum(CheckoutPlanInput)
  @IsOptional()
  formula?: CheckoutPlanInput;

  @ApiPropertyOptional({
    description: 'Legacy field name kept for backward compatibility',
    enum: CheckoutPlanInput,
    example: CheckoutPlanInput.STANDARD,
  })
  @IsEnum(CheckoutPlanInput)
  @IsOptional()
  planType?: CheckoutPlanInput;

  @ApiPropertyOptional({
    description: 'Billing cycle for invoice generation',
    enum: BillingCycleInput,
    example: BillingCycleInput.MONTHLY,
  })
  @IsEnum(BillingCycleInput)
  @IsOptional()
  billingInterval?: BillingCycleInput;

  @ApiPropertyOptional({
    description: 'Contracted hectares used for quote and billing',
    example: 120,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  contractedHectares?: number;

  @ApiPropertyOptional({
    description: 'Optional organization ID (normally provided via header)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}

export class CheckoutResponseDto {
  @ApiProperty({
    description: 'Checkout URL to redirect user to',
    example: 'https://sandbox-api.polar.sh/v1/checkout-links/...',
  })
  checkoutUrl: string;

  @ApiProperty({ enum: SubscriptionFormula })
  formula: SubscriptionFormula;

  @ApiProperty({ enum: BillingCycle })
  billingCycle: BillingCycle;

  @ApiProperty({
    description: 'Quote snapshot stored for reconciliation with payment events',
  })
  quoteSnapshot: Record<string, unknown>;
}

export class CustomerPortalResponseDto {
  @ApiProperty({
    description: 'Customer portal URL to redirect user to',
    example: 'https://sandbox.polar.sh',
  })
  portalUrl: string;

  @ApiPropertyOptional({ description: 'Optional human-readable message' })
  @IsString()
  @IsOptional()
  message?: string;
}
