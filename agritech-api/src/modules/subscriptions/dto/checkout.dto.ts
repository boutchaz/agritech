import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PlanType {
  ESSENTIAL = 'essential',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export class CheckoutDto {
  @ApiProperty({
    description: 'Plan type to purchase',
    enum: PlanType,
    example: PlanType.PROFESSIONAL,
  })
  @IsEnum(PlanType)
  planType: PlanType;

  @ApiPropertyOptional({
    description: 'Organization ID (from header)',
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
}

export class CustomerPortalResponseDto {
  @ApiProperty({
    description: 'Customer portal URL to redirect user to',
    example: 'https://sandbox.polar.sh',
  })
  portalUrl: string;
}
