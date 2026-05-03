import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateOpeningStockDto {
  @ApiProperty({ description: 'Item ID' })
  @IsNotEmpty()
  @IsUUID()
  item_id: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsNotEmpty()
  @IsUUID()
  warehouse_id: string;

  @ApiProperty({ description: 'Opening quantity' })
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Valuation rate / unit cost' })
  @IsNotEmpty()
  @IsNumber()
  valuation_rate: number;

  @ApiPropertyOptional({ description: 'Total value. Computed server-side when omitted.' })
  @IsOptional()
  @IsNumber()
  total_value: number;

  @ApiPropertyOptional({ description: 'Deprecated alias for valuation_rate' })
  @IsOptional()
  @IsNumber()
  cost_per_unit?: number;

  @ApiPropertyOptional({ description: 'Deprecated alias. Ignored; item default unit is used.' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ description: 'Opening date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  opening_date: string;

  @ApiPropertyOptional({ description: 'Batch number' })
  @IsOptional()
  @IsString()
  batch_number?: string;

  @ApiPropertyOptional({ description: 'Serial numbers' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serial_numbers?: string[];

  @ApiPropertyOptional({ description: 'Deprecated alias for a single serial number' })
  @IsOptional()
  @IsString()
  serial_number?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
