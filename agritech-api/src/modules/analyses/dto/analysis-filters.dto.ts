import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AnalysisType } from './create-analysis.dto';
import { Type } from 'class-transformer';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export class AnalysisFiltersDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Single parcel ID filter' })
  @IsOptional()
  @IsString()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Comma-separated parcel IDs', example: 'uuid1,uuid2,uuid3' })
  @IsOptional()
  @IsString()
  parcel_ids?: string;

  @ApiPropertyOptional({ description: 'Farm ID filter (will fetch all parcels for this farm)' })
  @IsOptional()
  @IsString()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Type of analysis', enum: AnalysisType })
  @IsOptional()
  @IsEnum(AnalysisType)
  analysis_type?: AnalysisType;

  @ApiPropertyOptional({ description: 'Filter by date from', example: '2024-01-01' })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter by date to', example: '2024-12-31' })
  @IsOptional()
  @IsString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Limit per page (alias for pageSize)' })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
