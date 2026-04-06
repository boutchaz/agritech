import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNotEmpty, IsBoolean, IsUUID, MaxLength } from 'class-validator';

export enum CampaignType {
  GENERAL = 'general',
  RAINFED = 'rainfed',
  IRRIGATED = 'irrigated',
  GREENHOUSE = 'greenhouse',
}

export enum CampaignStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name', example: 'Campagne Agricole 2025/2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Campaign code (unique per org)', example: 'CA2025-26' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2025-09-01' })
  @IsString()
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2026-08-31' })
  @IsString()
  @IsNotEmpty()
  end_date: string;

  @ApiPropertyOptional({ description: 'Campaign type', enum: CampaignType, default: CampaignType.GENERAL })
  @IsEnum(CampaignType)
  @IsOptional()
  campaign_type?: CampaignType;

  @ApiPropertyOptional({ description: 'Whether this is the current active campaign', default: false })
  @IsBoolean()
  @IsOptional()
  is_current?: boolean;

  @ApiPropertyOptional({ description: 'Primary fiscal year ID' })
  @IsUUID()
  @IsOptional()
  primary_fiscal_year_id?: string;

  @ApiPropertyOptional({ description: 'Secondary fiscal year ID (for campaigns spanning two fiscal years)' })
  @IsUUID()
  @IsOptional()
  secondary_fiscal_year_id?: string;

  @ApiPropertyOptional({ description: 'Campaign status', enum: CampaignStatus })
  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;
}
