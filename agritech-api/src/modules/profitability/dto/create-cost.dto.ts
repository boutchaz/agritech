import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';

export enum CostType {
  MATERIALS = 'materials',
  LABOR = 'labor',
  UTILITIES = 'utilities',
  EQUIPMENT = 'equipment',
  OTHER = 'other',
}

export class CreateCostDto {
  @ApiProperty({ description: 'Parcel ID' })
  @IsUUID()
  @IsNotEmpty()
  parcel_id: string;

  @ApiProperty({ enum: CostType, description: 'Type of cost' })
  @IsEnum(CostType)
  @IsNotEmpty()
  cost_type: CostType;

  @ApiProperty({ description: 'Cost amount' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Date of cost (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Cost description', required: false })
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

  @ApiProperty({ description: 'Category ID', required: false })
  @IsUUID()
  @IsOptional()
  category_id?: string;
}
