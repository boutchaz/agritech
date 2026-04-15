import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, IsOptional, IsEnum, IsNotEmpty, Min, IsDateString } from 'class-validator';

// Enums match database CHECK constraints
export enum BiologicalAssetType {
  BEARER_PLANT = 'bearer_plant',
  CONSUMABLE_PLANT = 'consumable_plant',
  LIVESTOCK_BEARER = 'livestock_bearer',
  LIVESTOCK_CONSUMABLE = 'livestock_consumable',
}

export enum BiologicalAssetStatus {
  IMMATURE = 'immature',
  PRODUCTIVE = 'productive',
  DECLINING = 'declining',
  DISPOSED = 'disposed',
}

export enum DepreciationMethod {
  STRAIGHT_LINE = 'straight_line',
  DECLINING_BALANCE = 'declining_balance',
  UNITS_OF_PRODUCTION = 'units_of_production',
}

export class CreateBiologicalAssetDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  farm_id: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parcel_id?: string;

  @ApiProperty({ enum: BiologicalAssetType })
  @IsEnum(BiologicalAssetType)
  @IsNotEmpty()
  asset_type: BiologicalAssetType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  asset_category?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  asset_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  asset_code: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  area_ha?: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  acquisition_date: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  maturity_date?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  expected_useful_life_years?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  current_age_years?: number;

  @ApiPropertyOptional({ enum: BiologicalAssetStatus })
  @IsEnum(BiologicalAssetStatus)
  @IsOptional()
  status?: BiologicalAssetStatus;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  initial_cost: number;

  @ApiPropertyOptional({ enum: DepreciationMethod })
  @IsEnum(DepreciationMethod)
  @IsOptional()
  depreciation_method?: DepreciationMethod;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  residual_value?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  expected_annual_yield?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  expected_yield_unit?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  variety_info?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
