import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  Min,
  IsDateString,
} from 'class-validator';

export enum CropCycleStatus {
  PLANNED = 'planned',
  LAND_PREP = 'land_prep',
  GROWING = 'growing',
  HARVESTING = 'harvesting',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateCropCycleDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @ApiProperty({ description: 'Farm ID' })
  @IsUUID()
  @IsNotEmpty()
  farm_id: string;

  @ApiPropertyOptional({ description: 'Parcel ID' })
  @IsUUID()
  @IsOptional()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Crop ID' })
  @IsUUID()
  @IsOptional()
  crop_id?: string;

  @ApiPropertyOptional({ description: 'Variety ID' })
  @IsUUID()
  @IsOptional()
  variety_id?: string;

  @ApiProperty({ description: 'Crop type (e.g. wheat, olive, tomato)' })
  @IsString()
  @IsNotEmpty()
  crop_type: string;

  @ApiPropertyOptional({ description: 'Variety name' })
  @IsString()
  @IsOptional()
  variety_name?: string;

  @ApiProperty({ description: 'Unique cycle code' })
  @IsString()
  @IsNotEmpty()
  cycle_code: string;

  @ApiPropertyOptional({ description: 'Cycle display name' })
  @IsString()
  @IsOptional()
  cycle_name?: string;

  @ApiPropertyOptional({ description: 'Campaign ID' })
  @IsUUID()
  @IsOptional()
  campaign_id?: string;

  @ApiPropertyOptional({ description: 'Fiscal year ID' })
  @IsUUID()
  @IsOptional()
  fiscal_year_id?: string;

  @ApiPropertyOptional({ description: 'Season (e.g. automne-hiver, printemps-ete)' })
  @IsString()
  @IsOptional()
  season?: string;

  // Date fields
  @ApiPropertyOptional({ description: 'Land preparation date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  land_prep_date?: string;

  @ApiPropertyOptional({ description: 'Planting date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  planting_date?: string;

  @ApiPropertyOptional({ description: 'Expected harvest start date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  expected_harvest_start?: string;

  @ApiPropertyOptional({ description: 'Expected harvest end date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  expected_harvest_end?: string;

  @ApiPropertyOptional({ description: 'Actual harvest start date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  actual_harvest_start?: string;

  @ApiPropertyOptional({ description: 'Actual harvest end date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  actual_harvest_end?: string;

  @ApiPropertyOptional({ description: 'Date cycle was closed (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  cycle_closed_date?: string;

  // Status
  @ApiPropertyOptional({ description: 'Cycle status', enum: CropCycleStatus })
  @IsEnum(CropCycleStatus)
  @IsOptional()
  status?: CropCycleStatus;

  // Area fields
  @ApiPropertyOptional({ description: 'Planted area in hectares' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  planted_area_ha?: number;

  @ApiPropertyOptional({ description: 'Harvested area in hectares' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  harvested_area_ha?: number;

  // Yield fields
  @ApiPropertyOptional({ description: 'Expected yield per hectare' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  expected_yield_per_ha?: number;

  @ApiPropertyOptional({ description: 'Expected total yield' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  expected_total_yield?: number;

  @ApiPropertyOptional({ description: 'Actual yield per hectare' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  actual_yield_per_ha?: number;

  @ApiPropertyOptional({ description: 'Actual total yield' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  actual_total_yield?: number;

  @ApiPropertyOptional({ description: 'Yield unit (e.g. kg, tonnes, quintaux)' })
  @IsString()
  @IsOptional()
  yield_unit?: string;

  // Quality fields
  @ApiPropertyOptional({ description: 'Average quality grade' })
  @IsString()
  @IsOptional()
  average_quality_grade?: string;

  @ApiPropertyOptional({ description: 'Quality notes' })
  @IsString()
  @IsOptional()
  quality_notes?: string;

  // Financial fields
  @ApiPropertyOptional({ description: 'Total costs' })
  @IsNumber()
  @IsOptional()
  total_costs?: number;

  @ApiPropertyOptional({ description: 'Total revenue' })
  @IsNumber()
  @IsOptional()
  total_revenue?: number;

  @ApiPropertyOptional({ description: 'Net profit' })
  @IsNumber()
  @IsOptional()
  net_profit?: number;

  @ApiPropertyOptional({ description: 'Cost per hectare' })
  @IsNumber()
  @IsOptional()
  cost_per_ha?: number;

  @ApiPropertyOptional({ description: 'Revenue per hectare' })
  @IsNumber()
  @IsOptional()
  revenue_per_ha?: number;

  @ApiPropertyOptional({ description: 'Profit margin (percentage)' })
  @IsNumber()
  @IsOptional()
  profit_margin?: number;

  // Valuation fields
  @ApiPropertyOptional({ description: 'WIP valuation' })
  @IsNumber()
  @IsOptional()
  wip_valuation?: number;

  @ApiPropertyOptional({ description: 'Inventory valuation' })
  @IsNumber()
  @IsOptional()
  inventory_valuation?: number;

  @ApiPropertyOptional({ description: 'Valuation method' })
  @IsString()
  @IsOptional()
  valuation_method?: string;

  @ApiPropertyOptional({ description: 'Last valuation date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  last_valuation_date?: string;

  // Notes
  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  // New fields for multi-agriculture support
  @ApiPropertyOptional({ description: 'Cycle type (e.g. annual, perennial)' })
  @IsString()
  @IsOptional()
  cycle_type?: string;

  @ApiPropertyOptional({ description: 'Cycle category (e.g. short, medium, long, perennial)' })
  @IsString()
  @IsOptional()
  cycle_category?: string;

  @ApiPropertyOptional({ description: 'Whether the crop is perennial' })
  @IsBoolean()
  @IsOptional()
  is_perennial?: boolean;

  @ApiPropertyOptional({ description: 'Cycle start year' })
  @IsNumber()
  @IsOptional()
  cycle_start_year?: number;

  @ApiPropertyOptional({ description: 'Cycle end year' })
  @IsNumber()
  @IsOptional()
  cycle_end_year?: number;

  @ApiPropertyOptional({ description: 'Template ID (references crop_templates)' })
  @IsUUID()
  @IsOptional()
  template_id?: string;
}
