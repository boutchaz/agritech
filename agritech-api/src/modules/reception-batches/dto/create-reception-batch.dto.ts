import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DefectDto {
  @ApiProperty({ description: 'Defect type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Severity level' })
  @IsEnum(['minor', 'moderate', 'severe'])
  severity: 'minor' | 'moderate' | 'severe';

  @ApiPropertyOptional({ description: 'Defect description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Percentage affected' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;
}

export class CreateReceptionBatchDto {
  @ApiProperty({ description: 'Warehouse ID where batch is received' })
  @IsUUID()
  warehouse_id: string;

  @ApiPropertyOptional({ description: 'Linked harvest record ID' })
  @IsOptional()
  @IsUUID()
  harvest_id?: string;

  @ApiPropertyOptional({ description: 'Parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Crop ID' })
  @IsOptional()
  @IsUUID()
  crop_id?: string;

  @ApiPropertyOptional({ description: 'Culture/crop type' })
  @IsOptional()
  @IsString()
  culture_type?: string;

  @ApiProperty({ description: 'Reception date' })
  @IsDateString()
  reception_date: string;

  @ApiPropertyOptional({ description: 'Reception time (HH:MM:SS)' })
  @IsOptional()
  @IsString()
  reception_time?: string;

  @ApiProperty({ description: 'Weight of the batch' })
  @IsNumber()
  @Min(0)
  weight: number;

  @ApiPropertyOptional({ description: 'Weight unit', default: 'kg' })
  @IsOptional()
  @IsString()
  weight_unit?: string;

  @ApiPropertyOptional({ description: 'Quantity in units' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Quantity unit' })
  @IsOptional()
  @IsString()
  quantity_unit?: string;

  @ApiPropertyOptional({ description: 'Worker who received the batch' })
  @IsOptional()
  @IsUUID()
  received_by?: string;

  @ApiPropertyOptional({ description: 'Producer/supplier name' })
  @IsOptional()
  @IsString()
  producer_name?: string;

  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsOptional()
  @IsUUID()
  supplier_id?: string;

  @ApiPropertyOptional({ description: 'Lot code' })
  @IsOptional()
  @IsString()
  lot_code?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
