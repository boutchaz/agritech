import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class CreateForecastDto {
  @ApiProperty({ description: 'Farm ID' })
  @IsNotEmpty()
  @IsUUID()
  farm_id: string;

  @ApiProperty({ description: 'Parcel ID' })
  @IsNotEmpty()
  @IsUUID()
  parcel_id: string;

  @ApiProperty({ description: 'Crop type' })
  @IsNotEmpty()
  @IsString()
  crop_type: string;

  @ApiPropertyOptional({ description: 'Crop variety' })
  @IsOptional()
  @IsString()
  variety?: string;

  @ApiPropertyOptional({ description: 'Planting date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  planting_date?: string;

  @ApiProperty({ description: 'Forecast harvest start date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  forecast_harvest_date_start: string;

  @ApiProperty({ description: 'Forecast harvest end date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  forecast_harvest_date_end: string;

  @ApiPropertyOptional({ description: 'Forecast season' })
  @IsOptional()
  @IsString()
  forecast_season?: string;

  @ApiPropertyOptional({ 
    description: 'Confidence level',
    enum: ['low', 'medium', 'high']
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  confidence_level?: string;

  @ApiProperty({ description: 'Predicted yield quantity' })
  @IsNotEmpty()
  @IsNumber()
  predicted_yield_quantity: number;

  @ApiPropertyOptional({ description: 'Predicted yield per hectare' })
  @IsOptional()
  @IsNumber()
  predicted_yield_per_hectare?: number;

  @ApiProperty({ description: 'Unit of measure' })
  @IsNotEmpty()
  @IsString()
  unit_of_measure: string;

  @ApiPropertyOptional({ description: 'Predicted quality grade' })
  @IsOptional()
  @IsString()
  predicted_quality_grade?: string;

  @ApiPropertyOptional({ description: 'Minimum yield quantity' })
  @IsOptional()
  @IsNumber()
  min_yield_quantity?: number;

  @ApiPropertyOptional({ description: 'Maximum yield quantity' })
  @IsOptional()
  @IsNumber()
  max_yield_quantity?: number;

  @ApiPropertyOptional({ description: 'Estimated revenue' })
  @IsOptional()
  @IsNumber()
  estimated_revenue?: number;

  @ApiPropertyOptional({ description: 'Estimated cost' })
  @IsOptional()
  @IsNumber()
  estimated_cost?: number;

  @ApiPropertyOptional({ description: 'Estimated price per unit' })
  @IsOptional()
  @IsNumber()
  estimated_price_per_unit?: number;

  @ApiPropertyOptional({ description: 'Currency code (default: MAD)' })
  @IsOptional()
  @IsString()
  currency_code?: string;

  @ApiPropertyOptional({ description: 'Forecast method' })
  @IsOptional()
  @IsString()
  forecast_method?: string;

  @ApiPropertyOptional({ description: 'Based on historical years' })
  @IsOptional()
  @IsNumber()
  based_on_historical_years?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
