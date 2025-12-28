import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString, IsNumber, IsDateString } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Unit of measure' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Cost per unit' })
  @IsOptional()
  @IsNumber()
  cost_per_unit?: number;

  @ApiPropertyOptional({ description: 'Total value' })
  @IsOptional()
  @IsNumber()
  total_value?: number;

  @ApiPropertyOptional({ description: 'Opening date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  opening_date?: string;

  @ApiPropertyOptional({ description: 'Batch number' })
  @IsOptional()
  @IsString()
  batch_number?: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  serial_number?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
