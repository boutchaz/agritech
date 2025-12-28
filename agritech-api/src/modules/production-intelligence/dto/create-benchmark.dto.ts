import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, IsNumber, IsOptional, IsDateString, IsBoolean, IsEnum } from 'class-validator';

export class CreateBenchmarkDto {
  @ApiPropertyOptional({ description: 'Farm ID (optional, for farm-specific benchmarks)' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Parcel ID (optional, for parcel-specific benchmarks)' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiProperty({ description: 'Crop type' })
  @IsNotEmpty()
  @IsString()
  crop_type: string;

  @ApiPropertyOptional({ description: 'Crop variety' })
  @IsOptional()
  @IsString()
  variety?: string;

  @ApiProperty({ 
    description: 'Benchmark type',
    enum: ['organization', 'regional', 'national', 'custom']
  })
  @IsNotEmpty()
  @IsEnum(['organization', 'regional', 'national', 'custom'])
  benchmark_type: string;

  @ApiProperty({ description: 'Target yield per hectare' })
  @IsNotEmpty()
  @IsNumber()
  target_yield_per_hectare: number;

  @ApiProperty({ description: 'Unit of measure' })
  @IsNotEmpty()
  @IsString()
  unit_of_measure: string;

  @ApiPropertyOptional({ description: 'Excellent threshold percent' })
  @IsOptional()
  @IsNumber()
  excellent_threshold_percent?: number;

  @ApiPropertyOptional({ description: 'Good threshold percent' })
  @IsOptional()
  @IsNumber()
  good_threshold_percent?: number;

  @ApiPropertyOptional({ description: 'Acceptable threshold percent' })
  @IsOptional()
  @IsNumber()
  acceptable_threshold_percent?: number;

  @ApiPropertyOptional({ description: 'Target revenue per hectare' })
  @IsOptional()
  @IsNumber()
  target_revenue_per_hectare?: number;

  @ApiPropertyOptional({ description: 'Target profit margin percent' })
  @IsOptional()
  @IsNumber()
  target_profit_margin_percent?: number;

  @ApiPropertyOptional({ description: 'Valid from date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  valid_from?: string;

  @ApiPropertyOptional({ description: 'Valid until date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  valid_until?: string;

  @ApiPropertyOptional({ description: 'Source of benchmark' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Is active (default: true)' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
