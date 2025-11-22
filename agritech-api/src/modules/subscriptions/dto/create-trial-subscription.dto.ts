import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';

export enum PlanType {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export class CreateTrialSubscriptionDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  organization_id: string;

  @ApiProperty({
    description: 'Plan type for the trial subscription',
    enum: PlanType,
    example: PlanType.PROFESSIONAL,
  })
  @IsEnum(PlanType)
  plan_type: PlanType;
}

export class SubscriptionResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Created subscription data' })
  subscription: {
    id: string;
    organization_id: string;
    plan_id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  };
}
