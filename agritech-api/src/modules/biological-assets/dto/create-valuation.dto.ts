import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, IsOptional, IsEnum, IsNotEmpty, IsDateString } from 'class-validator';

export enum FairValueMethod {
  MARKET_APPROACH = 'market_approach',
  INCOME_APPROACH = 'income_approach',
  COST_APPROACH = 'cost_approach',
}

export enum FairValueLevel {
  LEVEL_1 = 'level_1',
  LEVEL_2 = 'level_2',
  LEVEL_3 = 'level_3',
}

export class CreateValuationDto {
  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  valuation_date: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  fiscal_year_id?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  fiscal_period_id?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  previous_fair_value?: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  current_fair_value: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  fair_value_change?: number;

  @ApiProperty({ enum: FairValueMethod })
  @IsEnum(FairValueMethod)
  @IsNotEmpty()
  valuation_method: FairValueMethod;

  @ApiProperty({ enum: FairValueLevel })
  @IsEnum(FairValueLevel)
  @IsNotEmpty()
  fair_value_level: FairValueLevel;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  market_price_reference?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  discount_rate?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  quantity_change?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  natural_increase?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  harvest_quantity?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  harvest_value?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  valuation_report_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  appraiser_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
