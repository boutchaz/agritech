import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString, IsNumber, IsDateString, IsEnum } from 'class-validator';

export class UpdateForecastDto {
  @ApiPropertyOptional({ description: 'Planting date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  planting_date?: string;

  @ApiPropertyOptional({ description: 'Forecast harvest start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  forecast_harvest_date_start?: string;

  @ApiPropertyOptional({ description: 'Forecast harvest end date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  forecast_harvest_date_end?: string;

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

  @ApiPropertyOptional({ description: 'Predicted yield quantity' })
  @IsOptional()
  @IsNumber()
  predicted_yield_quantity?: number;

  @ApiPropertyOptional({ description: 'Predicted yield per hectare' })
  @IsOptional()
  @IsNumber()
  predicted_yield_per_hectare?: number;

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

  @ApiPropertyOptional({ 
    description: 'Status',
    enum: ['draft', 'active', 'completed', 'cancelled']
  })
  @IsOptional()
  @IsEnum(['draft', 'active', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: 'Actual harvest ID (when completed)' })
  @IsOptional()
  @IsUUID()
  actual_harvest_id?: string;

  @ApiPropertyOptional({ description: 'Actual yield quantity (when completed)' })
  @IsOptional()
  @IsNumber()
  actual_yield_quantity?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
