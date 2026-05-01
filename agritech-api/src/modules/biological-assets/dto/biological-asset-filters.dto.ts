import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsEnum, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { BiologicalAssetType, BiologicalAssetStatus } from './create-biological-asset.dto';

export class BiologicalAssetFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by asset type' })
  @IsOptional()
  @IsEnum(BiologicalAssetType)
  asset_type?: BiologicalAssetType;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(BiologicalAssetStatus)
  status?: BiologicalAssetStatus;

  @ApiPropertyOptional({ description: 'Filter by variety' })
  @IsOptional()
  @IsString()
  variety?: string;

  @ApiPropertyOptional({ description: 'Filter by rootstock' })
  @IsOptional()
  @IsString()
  rootstock?: string;

  @ApiPropertyOptional({ description: 'Filter by farm ID' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Filter by parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Filter by acquisition date from' })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter by acquisition date to' })
  @IsOptional()
  @IsString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Search by name or notes' })
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
