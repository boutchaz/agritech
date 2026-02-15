import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsEnum, IsBoolean, IsIn, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CropCycleStatus } from './create-crop-cycle.dto';

export class CropCycleFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: CropCycleStatus })
  @IsOptional()
  @IsEnum(CropCycleStatus)
  status?: CropCycleStatus;

  @ApiPropertyOptional({ description: 'Filter by campaign ID' })
  @IsOptional()
  @IsUUID()
  campaign_id?: string;

  @ApiPropertyOptional({ description: 'Filter by farm ID' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Filter by parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Filter by variety name' })
  @IsOptional()
  @IsString()
  variety_name?: string;

  @ApiPropertyOptional({ description: 'Filter by crop type' })
  @IsOptional()
  @IsString()
  crop_type?: string;

  @ApiPropertyOptional({ description: 'Filter by cycle type (annual, perennial)' })
  @IsOptional()
  @IsString()
  cycle_type?: string;

  @ApiPropertyOptional({ description: 'Filter by season' })
  @IsOptional()
  @IsString()
  season?: string;

  @ApiPropertyOptional({ description: 'Filter perennial crops only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_perennial?: boolean;

  @ApiPropertyOptional({ description: 'Filter by planting date from (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  planting_date_from?: string;

  @ApiPropertyOptional({ description: 'Filter by planting date to (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  planting_date_to?: string;

  @ApiPropertyOptional({ description: 'Filter by expected harvest start from (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expected_harvest_start_from?: string;

  @ApiPropertyOptional({ description: 'Filter by expected harvest start to (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expected_harvest_start_to?: string;

  @ApiPropertyOptional({ description: 'Search by cycle name or variety name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number (default: 1)' })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size (default: 12)' })
  @IsOptional()
  @Type(() => Number)
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
