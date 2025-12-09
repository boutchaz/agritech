import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';

export enum RevenueType {
  HARVEST = 'harvest',
  SUBSIDY = 'subsidy',
  OTHER = 'other',
}

export class CreateRevenueDto {
  @ApiProperty({ description: 'Parcel ID' })
  @IsUUID()
  @IsNotEmpty()
  parcel_id: string;

  @ApiProperty({ enum: RevenueType, description: 'Type of revenue' })
  @IsEnum(RevenueType)
  @IsNotEmpty()
  revenue_type: RevenueType;

  @ApiProperty({ description: 'Revenue amount' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Date of revenue (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Crop type', required: false })
  @IsString()
  @IsOptional()
  crop_type?: string;

  @ApiProperty({ description: 'Quantity', required: false })
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @ApiProperty({ description: 'Unit of measurement', required: false })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ description: 'Price per unit', required: false })
  @IsNumber()
  @IsOptional()
  price_per_unit?: number;

  @ApiProperty({ description: 'Revenue description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Currency code', required: false })
  @IsString()
  @IsOptional()
  currency?: string;
}
