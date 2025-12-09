import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReportType {
  // Base reports
  ANALYSES_COMPLETE = 'analyses-complete',
  ANALYSES_SOIL_ONLY = 'analyses-soil-only',
  STOCK_INVENTORY = 'stock-inventory',
  STOCK_MOVEMENTS = 'stock-movements',
  INFRASTRUCTURE_COMPLETE = 'infrastructure-complete',
  EMPLOYEES = 'employees',
  DAY_LABORERS = 'day-laborers',

  // Module-specific reports
  FRUIT_TREES_FERTILIZATION = 'fruit-trees-fertilization',
  FRUIT_TREES_PRUNING = 'fruit-trees-pruning',
  MUSHROOMS_PRODUCTION = 'mushrooms-production',
  GREENHOUSE_CLIMATE = 'greenhouse-climate',
  HYDROPONICS_NUTRIENTS = 'hydroponics-nutrients',
  MARKET_GARDENING_PRODUCTION = 'market-gardening-production',
  AQUACULTURE_WATER_QUALITY = 'aquaculture-water-quality',
  BEEKEEPING_PRODUCTION = 'beekeeping-production',
  CATTLE_PRODUCTION = 'cattle-production',
  CAMEL_PRODUCTION = 'camel-production',
  GOAT_PRODUCTION = 'goat-production',
  LAYING_HENS_PRODUCTION = 'laying-hens-production',
}

export class ReportFiltersDto {
  @ApiProperty({ enum: ReportType, description: 'Type of report to generate' })
  @IsEnum(ReportType)
  report_type: ReportType;

  @ApiProperty({ required: false, description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({ required: false, description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ required: false, description: 'Parcel ID filter' })
  @IsOptional()
  @IsString()
  parcel_id?: string;

  @ApiProperty({ required: false, description: 'Farm ID filter' })
  @IsOptional()
  @IsString()
  farm_id?: string;
}
