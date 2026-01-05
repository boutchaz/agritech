import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsEnum, IsNumber, IsDate, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignType, CampaignStatus } from './create-campaign.dto';

export class CampaignFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by campaign type' })
  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ description: 'Filter by farm ID' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Filter by parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Filter by start date from' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  start_date_from?: Date;

  @ApiPropertyOptional({ description: 'Filter by start date to' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  start_date_to?: Date;

  @ApiPropertyOptional({ description: 'Filter by end date from' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end_date_from?: Date;

  @ApiPropertyOptional({ description: 'Filter by end date to' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end_date_to?: Date;

  @ApiPropertyOptional({ description: 'Filter by minimum priority' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  min_priority?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum priority' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  max_priority?: number;

  @ApiPropertyOptional({ description: 'Search by name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number (default: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size (default: 12)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction (asc or desc)' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
