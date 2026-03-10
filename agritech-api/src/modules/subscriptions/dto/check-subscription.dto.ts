import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CheckSubscriptionDto {
  @ApiProperty({
    description: 'Organization ID to check subscription for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({
    description: 'Specific feature to check access for',
    example: 'satellite_analysis',
  })
  @IsOptional()
  @IsString()
  feature?: string;
}

export class UsageStatsDto {
  @ApiProperty({ description: 'Current value' })
  current: number;

  @ApiProperty({ description: 'Maximum allowed value. Null means unlimited.' })
  max: number | null;

  @ApiProperty({ description: 'Whether operation is still allowed under the current entitlement' })
  allowed: boolean;
}

export class SubscriptionCheckResponseDto {
  @ApiProperty({ description: 'Whether subscription is valid' })
  isValid: boolean;

  @ApiProperty({ description: 'Subscription details' })
  subscription: any;

  @ApiPropertyOptional({ description: 'Whether user has access to specific feature' })
  hasFeature?: boolean;

  @ApiPropertyOptional({ description: 'Reason for invalid subscription' })
  reason?: string;

  @ApiPropertyOptional({ description: 'Usage statistics' })
  usage?: {
    hectares: UsageStatsDto;
    users: UsageStatsDto;
    farms: UsageStatsDto;
    parcels: UsageStatsDto;
  };
}
