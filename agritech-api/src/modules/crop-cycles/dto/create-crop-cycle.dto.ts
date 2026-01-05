import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsUUID, IsOptional, IsEnum, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum CropCycleStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateCropCycleDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @ApiProperty({ description: 'Campaign ID (optional)' })
  @IsUUID()
  @IsOptional()
  campaign_id?: string;

  @ApiProperty({ description: 'Farm ID' })
  @IsUUID()
  @IsNotEmpty()
  farm_id: string;

  @ApiProperty({ description: 'Parcel ID' })
  @IsUUID()
  @IsOptional()
  parcel_id?: string;

  @ApiProperty({ description: 'Crop cycle name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Crop variety' })
  @IsString()
  @IsNotEmpty()
  variety: string;

  @ApiProperty({ description: 'Crop type' })
  @IsString()
  @IsNotEmpty()
  crop_type: string;

  @ApiProperty({ description: 'Planting date' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  planting_date: Date;

  @ApiProperty({ description: 'Expected harvest date' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  expected_harvest_date: Date;

  @ApiProperty({ description: 'Actual harvest date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  actual_harvest_date?: Date;

  @ApiProperty({ description: 'Area in hectares' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  area_hectares: number;

  @ApiProperty({ description: 'Expected yield (kg/hectare)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  expected_yield_kg_per_hectare?: number;

  @ApiProperty({ description: 'Actual yield (kg/hectare)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  actual_yield_kg_per_hectare?: number;

  @ApiProperty({ description: 'Status' })
  @IsEnum(CropCycleStatus)
  @IsOptional()
  status?: CropCycleStatus;

  @ApiProperty({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
