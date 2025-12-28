import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateYieldHistoryDto {
  @ApiProperty({ description: 'Farm ID' })
  @IsNotEmpty()
  @IsUUID()
  farm_id: string;

  @ApiProperty({ description: 'Parcel ID' })
  @IsNotEmpty()
  @IsUUID()
  parcel_id: string;

  @ApiPropertyOptional({ description: 'Harvest ID' })
  @IsOptional()
  @IsUUID()
  harvest_id?: string;

  @ApiProperty({ description: 'Crop type' })
  @IsNotEmpty()
  @IsString()
  crop_type: string;

  @ApiPropertyOptional({ description: 'Crop variety' })
  @IsOptional()
  @IsString()
  variety?: string;

  @ApiProperty({ description: 'Harvest date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  harvest_date: string;

  @ApiPropertyOptional({ description: 'Harvest season' })
  @IsOptional()
  @IsString()
  harvest_season?: string;

  @ApiProperty({ description: 'Actual yield quantity' })
  @IsNotEmpty()
  @IsNumber()
  actual_yield_quantity: number;

  @ApiPropertyOptional({ description: 'Actual yield per hectare' })
  @IsOptional()
  @IsNumber()
  actual_yield_per_hectare?: number;

  @ApiProperty({ description: 'Unit of measure' })
  @IsNotEmpty()
  @IsString()
  unit_of_measure: string;

  @ApiPropertyOptional({ description: 'Quality grade' })
  @IsOptional()
  @IsString()
  quality_grade?: string;

  @ApiPropertyOptional({ description: 'Target yield quantity' })
  @IsOptional()
  @IsNumber()
  target_yield_quantity?: number;

  @ApiPropertyOptional({ description: 'Target yield per hectare' })
  @IsOptional()
  @IsNumber()
  target_yield_per_hectare?: number;

  @ApiPropertyOptional({ description: 'Revenue amount' })
  @IsOptional()
  @IsNumber()
  revenue_amount?: number;

  @ApiPropertyOptional({ description: 'Cost amount' })
  @IsOptional()
  @IsNumber()
  cost_amount?: number;

  @ApiPropertyOptional({ description: 'Price per unit' })
  @IsOptional()
  @IsNumber()
  price_per_unit?: number;

  @ApiPropertyOptional({ description: 'Currency code (default: MAD)' })
  @IsOptional()
  @IsString()
  currency_code?: string;

  @ApiPropertyOptional({ description: 'Growing days' })
  @IsOptional()
  @IsNumber()
  growing_days?: number;

  @ApiPropertyOptional({ description: 'Irrigation total (m³)' })
  @IsOptional()
  @IsNumber()
  irrigation_total_m3?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
