import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';

export class ReceptionBatchFiltersDto {
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

  @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({
    description: 'Filter by quality grade',
    enum: ['A', 'B', 'C', 'Extra', 'First', 'Second', 'Third']
  })
  @IsOptional()
  @IsEnum(['A', 'B', 'C', 'Extra', 'First', 'Second', 'Third'])
  quality_grade?: string;
}
