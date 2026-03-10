import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RenewalNoticeDto {
  @ApiProperty({
    description: 'Organization ID impacted by the renewal notice',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({
    description: 'Optional note included in audit trail',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class TerminateSubscriptionDto {
  @ApiProperty({
    description: 'Organization ID to terminate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({
    description: 'Reason captured in lifecycle events',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
