import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { InspectionType, InspectionStatus } from './create-quality-inspection.dto';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export class QualityInspectionFiltersDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Filter by inspection type' })
  @IsOptional()
  @IsEnum(InspectionType)
  type?: InspectionType;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(InspectionStatus)
  status?: InspectionStatus;

  @ApiPropertyOptional({ description: 'Filter by farm ID' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Filter by parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Filter by crop cycle ID' })
  @IsOptional()
  @IsUUID()
  crop_cycle_id?: string;

  @ApiPropertyOptional({ description: 'Filter by inspector ID' })
  @IsOptional()
  @IsUUID()
  inspector_id?: string;

  @ApiPropertyOptional({ description: 'Filter by inspection date from' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  inspection_date_from?: Date;

  @ApiPropertyOptional({ description: 'Filter by inspection date to' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  inspection_date_to?: Date;

  @ApiPropertyOptional({ description: 'Filter by minimum overall score' })
  @IsOptional()
  @Type(() => Number)
  min_overall_score?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum overall score' })
  @IsOptional()
  @Type(() => Number)
  max_overall_score?: number;

}
