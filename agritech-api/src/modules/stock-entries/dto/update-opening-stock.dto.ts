import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateOpeningStockDto {
  @ApiPropertyOptional({ description: 'Item ID' })
  @IsOptional()
  @IsUUID()
  item_id?: string;

  @ApiPropertyOptional({ description: 'Warehouse ID' })
  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @ApiPropertyOptional({ description: 'Opening quantity' })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Valuation rate / unit cost' })
  @IsOptional()
  @IsNumber()
  valuation_rate?: number;

  @ApiPropertyOptional({ description: 'Total value. Computed server-side when omitted.' })
  @IsOptional()
  @IsNumber()
  total_value?: number;

  @ApiPropertyOptional({ description: 'Deprecated alias for valuation_rate' })
  @IsOptional()
  @IsNumber()
  cost_per_unit?: number;

  @ApiPropertyOptional({ description: 'Deprecated alias. Ignored; item default unit is used.' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Opening date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  opening_date?: string;

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
