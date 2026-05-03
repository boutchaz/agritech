import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { BiologicalAssetType, BiologicalAssetStatus } from './create-biological-asset.dto';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export class BiologicalAssetFiltersDto extends PaginatedQueryDto {
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

}
