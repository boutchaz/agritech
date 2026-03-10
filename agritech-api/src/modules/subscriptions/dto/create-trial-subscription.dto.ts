import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';

export enum TrialPlanInput {
  STARTER = 'starter',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  CORE = 'core',
  ESSENTIAL = 'essential',
  PROFESSIONAL = 'professional',
}

export class CreateTrialSubscriptionDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  organization_id: string;

  @ApiProperty({
    description: 'Formula used for the trial subscription (legacy aliases supported)',
    enum: TrialPlanInput,
    example: TrialPlanInput.STANDARD,
  })
  @IsEnum(TrialPlanInput)
  plan_type: TrialPlanInput;
}

export class SubscriptionResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Created subscription data' })
  subscription: {
    id: string;
    organization_id: string;
    plan_id: string;
    formula: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  };
}
