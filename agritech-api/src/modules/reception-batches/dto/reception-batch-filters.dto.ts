import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsDateString, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceptionBatchFiltersDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Field to sort by', default: 'reception_date' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
  @ApiPropertyOptional({ description: 'Filter by warehouse ID' })
  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @ApiPropertyOptional({ description: 'Filter by parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Filter by crop ID' })
  @IsOptional()
  @IsUUID()
  crop_id?: string;

  @ApiPropertyOptional({ description: 'Filter by harvest ID' })
  @IsOptional()
  @IsUUID()
  harvest_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['received', 'quality_checked', 'decision_made', 'processed', 'cancelled']
  })
  @IsOptional()
  @IsEnum(['received', 'quality_checked', 'decision_made', 'processed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by decision',
    enum: ['pending', 'direct_sale', 'storage', 'transformation', 'rejected']
  })
  @IsOptional()
  @IsEnum(['pending', 'direct_sale', 'storage', 'transformation', 'rejected'])
  decision?: string;

  @ApiPropertyOptional({ description: 'Filter from date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter from date (YYYY-MM-DD) - alias for date_from' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD) - alias for date_to' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Text search across batch_code, producer_name, notes' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by quality grade',
    enum: ['A', 'B', 'C', 'Extra', 'First', 'Second', 'Third']
  })
  @IsOptional()
  @IsEnum(['A', 'B', 'C', 'Extra', 'First', 'Second', 'Third'])
  quality_grade?: string;
}
