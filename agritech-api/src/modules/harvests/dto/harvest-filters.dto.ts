import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsDateString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';
 
export class HarvestFiltersDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status (comma-separated)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by farm ID' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Filter by parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Filter by crop ID' })
  @IsOptional()
  @IsUUID()
  crop_id?: string;

  // dateFrom and dateTo are inherited from PaginatedQueryDto

  @ApiPropertyOptional({ description: 'Filter by quality grade (comma-separated)' })
  @IsOptional()
  @IsString()
  quality_grade?: string;

  @ApiPropertyOptional({ description: 'Filter by intended use' })
  @IsOptional()
  @IsString()
  intended_for?: string;

}
