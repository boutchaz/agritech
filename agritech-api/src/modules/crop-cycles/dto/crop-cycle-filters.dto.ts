import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsEnum, IsDate, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { CropCycleStatus } from './create-crop-cycle.dto';

export class CropCycleFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
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

  @ApiPropertyOptional({ description: 'Filter by variety' })
  @IsOptional()
  @IsString()
  variety?: string;

  @ApiPropertyOptional({ description: 'Filter by crop type' })
  @IsOptional()
  @IsString()
  crop_type?: string;

  @ApiPropertyOptional({ description: 'Filter by planting date from' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  planting_date_from?: Date;

  @ApiPropertyOptional({ description: 'Filter by planting date to' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  planting_date_to?: Date;

  @ApiPropertyOptional({ description: 'Filter by expected harvest date from' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expected_harvest_date_from?: Date;

  @ApiPropertyOptional({ description: 'Filter by expected harvest date to' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expected_harvest_date_to?: Date;

  @ApiPropertyOptional({ description: 'Search by name or variety' })
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
