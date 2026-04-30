import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, IsInt, IsISO8601, Min } from 'class-validator';

export enum PestReportStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  TREATED = 'treated',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export class UpdatePestReportDto {
  @ApiPropertyOptional({ description: 'Client-generated UUID for idempotent replay' })
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @ApiPropertyOptional({ description: 'Row version for optimistic concurrency' })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({ description: 'Client wall-clock at action time' })
  @IsOptional()
  @IsISO8601()
  client_created_at?: string;

  @ApiProperty({ enum: PestReportStatus, description: 'Report status' })
  @IsEnum(PestReportStatus)
  status: PestReportStatus;

  @ApiPropertyOptional({ description: 'Treatment applied' })
  @IsOptional()
  @IsString()
  treatment_applied?: string;
}
